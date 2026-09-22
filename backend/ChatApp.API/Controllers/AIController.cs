using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ChatApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
[EnableRateLimiting("ai")]
public class AIController : ControllerBase
{
    private readonly IConfiguration _configuration;
    private readonly IHttpClientFactory _httpClientFactory;

    private const string PrimaryModel = "gemini-3.1-flash-lite";
    private const string FallbackModel = "gemini-3.5-flash-lite";
    private const int MaxHistoryMessages = 20;
    private const int MaxMessageChars = 4000;
    private const int MaxTotalChars = 30000;
    private const int MaxAttachmentBytes = 8 * 1024 * 1024;

    private static readonly HashSet<string> AllowedMimeTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg", "image/png", "image/webp", "image/gif",
        "application/pdf", "text/plain", "text/csv", "application/json",
        "audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav"
    };

    public AIController(IConfiguration configuration, IHttpClientFactory httpClientFactory)
    {
        _configuration = configuration;
        _httpClientFactory = httpClientFactory;
    }

    public sealed class AIChatRequest
    {
        public List<AIMessage> Messages { get; set; } = new();
        public string Language { get; set; } = "tr";
    }

    public sealed class AIMessage
    {
        public string Role { get; set; } = "user";
        public string Content { get; set; } = string.Empty;
        public AIInlineAttachment? Attachment { get; set; }
    }

    public sealed class AIInlineAttachment
    {
        public string FileName { get; set; } = string.Empty;
        public string MimeType { get; set; } = string.Empty;
        public string DataBase64 { get; set; } = string.Empty;
    }

    [HttpPost("chat")]
    public async Task<IActionResult> Chat(
        [FromBody] AIChatRequest request,
        CancellationToken cancellationToken)
    {
        if (request?.Messages == null || request.Messages.Count == 0)
            return BadRequest(new { message = "Mesaj bulunamadı." });

        var apiKey = _configuration["Gemini:ApiKey"];
        if (string.IsNullOrWhiteSpace(apiKey))
            return StatusCode(500, new { message = "Gemini API anahtarı yapılandırılmamış." });

        var messages = request.Messages
            .Where(x => x != null && (!string.IsNullOrWhiteSpace(x.Content) || x.Attachment != null))
            .TakeLast(MaxHistoryMessages)
            .Select(x => new AIMessage
            {
                Role = string.Equals(x.Role, "assistant", StringComparison.OrdinalIgnoreCase) ? "model" : "user",
                Content = (x.Content ?? string.Empty).Trim().Length > MaxMessageChars
                    ? x.Content.Trim()[..MaxMessageChars]
                    : (x.Content ?? string.Empty).Trim(),
                Attachment = x.Attachment
            })
            .ToList();

        if (messages.Count == 0)
            return BadRequest(new { message = "Geçerli bir mesaj bulunamadı." });

        var totalChars = 0;
        var boundedMessages = new List<AIMessage>();

        foreach (var message in messages.AsEnumerable().Reverse())
        {
            if (totalChars + message.Content.Length > MaxTotalChars)
                break;
            boundedMessages.Add(message);
            totalChars += message.Content.Length;
        }
        boundedMessages.Reverse();

        var isEnglish = string.Equals(
            request.Language,
            "en",
            StringComparison.OrdinalIgnoreCase);

        var systemInstruction = isEnglish
            ? "You are MFB AI, the built-in assistant of MFB Chat. " +
              "Act as a natural, useful general-purpose chat assistant. " +
              "Always respond in English because the user is using English mode. " +
              "Handle general questions, everyday topics, ideas, writing, " +
              "rewriting and summaries. If the user asks a technical, software " +
              "or coding question, answer it directly and competently; do not " +
              "steer the conversation toward software unless asked. " +
              "When an image, document or audio file is provided, analyze its " +
              "content directly and answer according to the user's request. " +
              "Do not present uncertain information as certain. " +
              "Keep answers concise unless more detail is useful."
            : "Sen MFB Chat'in MFB AI asistanısın. " +
              "Genel amaçlı, doğal ve kullanışlı bir sohbet asistanı gibi davran. " +
              "Her zaman Türkçe yanıt ver çünkü kullanıcı Türkçe modunu kullanıyor. " +
              "Genel soruları, günlük konuları, fikirleri, metinleri ve özetleri ele al. " +
              "Kullanıcı teknik, yazılım veya kodlama sorusu sorarsa doğrudan ve yetkin şekilde yanıt ver; " +
              "kullanıcı istemedikçe konuşmayı yazılım konusuna yönlendirme. " +
              "Görsel, belge veya ses gönderildiğinde içeriğini doğrudan analiz et ve soruya göre yanıtla. " +
              "Bilmediğin veya güncel doğrulama gerektiren bilgileri kesinmiş gibi sunma. " +
              "Gereksiz yere uzun cevap verme.";

        var models = new[] { PrimaryModel, FallbackModel };

        foreach (var model in models)
        {
            for (var attempt = 0; attempt < 2; attempt++)
            {
                try
                {
                    var result = await SendToGeminiAsync(model, systemInstruction, boundedMessages, apiKey, cancellationToken);
                    if (result.Success)
                        return Ok(new { content = result.Text, message = result.Text });

                    if (result.StatusCode is 429 or 502 or 503 or 504)
                    {
                        if (attempt == 0)
                        {
                            await Task.Delay(TimeSpan.FromMilliseconds(800), cancellationToken);
                            continue;
                        }
                        break;
                    }

                    return StatusCode(result.StatusCode, new { message = "AI servisi isteği işleyemedi." });
                }
                catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
                {
                    break;
                }
                catch (HttpRequestException)
                {
                    if (attempt == 0)
                    {
                        await Task.Delay(TimeSpan.FromMilliseconds(800), cancellationToken);
                        continue;
                    }
                    break;
                }
            }
        }

        return StatusCode(503, new
        {
            message = "AI servisi şu anda yoğun veya geçici olarak kullanılamıyor. Lütfen kısa süre sonra tekrar deneyin."
        });
    }

    private async Task<GeminiResult> SendToGeminiAsync(
        string model,
        string systemInstruction,
        List<AIMessage> messages,
        string apiKey,
        CancellationToken cancellationToken)
    {
        var client = _httpClientFactory.CreateClient("Gemini");
        var endpoint = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent";

        var contents = new List<object>();
        foreach (var message in messages)
        {
            var parts = new List<object>();
            if (!string.IsNullOrWhiteSpace(message.Content))
                parts.Add(new { text = message.Content });

            if (message.Attachment != null)
            {
                if (!TryCreateInlineData(message.Attachment, out var inlineData))
                    return new GeminiResult { Success = false, StatusCode = 400 };

                parts.Add(inlineData!);
            }

            if (parts.Count > 0)
                contents.Add(new { role = message.Role, parts });
        }

        var payload = new
        {
            system_instruction = new
            {
                parts = new[] { new { text = systemInstruction } }
            },
            contents,
            generationConfig = new
            {
                temperature = 0.7,
                maxOutputTokens = 2048
            }
        };

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, endpoint);
        httpRequest.Headers.Add("x-goog-api-key", apiKey);
        httpRequest.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        httpRequest.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

        using var response = await client.SendAsync(httpRequest, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
            return new GeminiResult { Success = false, StatusCode = (int)response.StatusCode };

        try
        {
            using var json = JsonDocument.Parse(responseBody);
            var text = json.RootElement.GetProperty("candidates")[0]
                .GetProperty("content").GetProperty("parts")[0].GetProperty("text").GetString();

            return string.IsNullOrWhiteSpace(text)
                ? new GeminiResult { Success = false, StatusCode = 502 }
                : new GeminiResult { Success = true, StatusCode = 200, Text = text.Trim() };
        }
        catch (JsonException)
        {
            return new GeminiResult { Success = false, StatusCode = 502 };
        }
        catch (KeyNotFoundException)
        {
            return new GeminiResult { Success = false, StatusCode = 502 };
        }
    }

    private static bool TryCreateInlineData(
        AIInlineAttachment attachment,
        out object? inlineData)
    {
        inlineData = null;

        if (string.IsNullOrWhiteSpace(attachment.MimeType) ||
            !AllowedMimeTypes.Contains(attachment.MimeType) ||
            string.IsNullOrWhiteSpace(attachment.DataBase64))
            return false;

        byte[] bytes;
        try
        {
            bytes = Convert.FromBase64String(attachment.DataBase64);
        }
        catch (FormatException)
        {
            return false;
        }

        if (bytes.Length == 0 || bytes.Length > MaxAttachmentBytes)
            return false;

        inlineData = new
        {
            inline_data = new
            {
                mime_type = attachment.MimeType,
                data = attachment.DataBase64
            }
        };
        return true;
    }

    private sealed class GeminiResult
    {
        public bool Success { get; init; }
        public int StatusCode { get; init; }
        public string? Text { get; init; }
    }
}
