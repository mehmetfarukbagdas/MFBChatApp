using System.Text.Json;
using ChatApp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using WebPush;

namespace ChatApp.API.Services;

public sealed class WebPushNotificationService : IWebPushNotificationService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly ILogger<WebPushNotificationService> _logger;

    public WebPushNotificationService(
        AppDbContext context,
        IConfiguration configuration,
        ILogger<WebPushNotificationService> logger)
    {
        _context = context;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendToUserAsync(
        Guid userId,
        string title,
        string body,
        Guid? chatId = null,
        CancellationToken cancellationToken = default)
    {
        var subject = _configuration["WebPush:Subject"];
        var publicKey = _configuration["WebPush:PublicKey"];
        var privateKey = _configuration["WebPush:PrivateKey"];

        if (string.IsNullOrWhiteSpace(subject) ||
            string.IsNullOrWhiteSpace(publicKey) ||
            string.IsNullOrWhiteSpace(privateKey))
        {
            _logger.LogWarning("Web Push is not configured. Skipping push notification for user {UserId}.", userId);
            return;
        }

        var subscriptions = await _context.PushSubscriptions
            .Where(x => x.UserId == userId)
            .ToListAsync(cancellationToken);

        if (subscriptions.Count == 0)
            return;

        var client = new WebPushClient();
        var vapidDetails = new VapidDetails(subject, publicKey, privateKey);
        var payload = JsonSerializer.Serialize(new
        {
            title,
            body,
            url = chatId.HasValue ? $"/?chatId={chatId.Value}" : "/",
            chatId
        });

        foreach (var storedSubscription in subscriptions)
        {
            try
            {
                var pushSubscription = new PushSubscription(
                    storedSubscription.Endpoint,
                    storedSubscription.P256dh,
                    storedSubscription.Auth);

                await client.SendNotificationAsync(
                    pushSubscription,
                    payload,
                    vapidDetails,
                    cancellationToken);

                storedSubscription.LastUsedAt = DateTime.UtcNow;
            }
            catch (WebPushException ex) when (ex.StatusCode is System.Net.HttpStatusCode.Gone or System.Net.HttpStatusCode.NotFound)
            {
                _context.PushSubscriptions.Remove(storedSubscription);
                _logger.LogInformation("Removed expired Web Push subscription {SubscriptionId}.", storedSubscription.Id);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to send Web Push notification to subscription {SubscriptionId}.", storedSubscription.Id);
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
    }
}
