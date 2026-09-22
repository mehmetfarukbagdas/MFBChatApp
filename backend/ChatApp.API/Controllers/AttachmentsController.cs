using System.Buffers;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using ChatApp.Infrastructure.Data;

namespace ChatApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AttachmentsController : ControllerBase
{
    private const long MaxFileSize = 10 * 1024 * 1024;

    private static readonly HashSet<string> AllowedExtensions =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ".jpg", ".jpeg", ".png", ".gif", ".webp",
            ".pdf",
            ".doc", ".docx",
            ".xls", ".xlsx",
            ".txt",
            ".zip",
            ".webm", ".m4a", ".mp3", ".wav", ".ogg"
        };

    private readonly AppDbContext _context;
    private readonly IWebHostEnvironment _environment;

    public AttachmentsController(AppDbContext context, IWebHostEnvironment environment)
    {
        _context = context;
        _environment = environment;
    }

    [HttpPost("upload")]
    [RequestSizeLimit(MaxFileSize)]
    public async Task<IActionResult> Upload(
        [FromForm] Guid chatId,
        [FromForm] IFormFile file,
        CancellationToken cancellationToken)
    {
        var userId = GetUserId();

        if (file is null || file.Length == 0)
            return BadRequest(new { message = "Dosya seçilmedi." });

        if (file.Length > MaxFileSize)
            return BadRequest(new { message = "Dosya boyutu 10 MB'dan büyük olamaz." });

        var isMember = await _context.ChatMembers
            .AsNoTracking()
            .AnyAsync(x => x.ChatId == chatId && x.UserId == userId, cancellationToken);

        if (!isMember)
            return Forbid();

        var extension = Path.GetExtension(file.FileName);
        if (!AllowedExtensions.Contains(extension))
            return BadRequest(new { message = "Bu dosya türüne izin verilmiyor." });

        if (!await HasAllowedSignatureAsync(file, extension, cancellationToken))
            return BadRequest(new { message = "Dosya içeriği uzantısıyla eşleşmiyor." });

        var uploadsPath = Path.Combine(
            _environment.WebRootPath ?? Path.Combine(_environment.ContentRootPath, "wwwroot"),
            "uploads");
        Directory.CreateDirectory(uploadsPath);

        var storedName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var filePath = Path.Combine(uploadsPath, storedName);

        await using (var stream = new FileStream(
            filePath,
            FileMode.CreateNew,
            FileAccess.Write,
            FileShare.None,
            64 * 1024,
            FileOptions.Asynchronous | FileOptions.SequentialScan))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        return Ok(new
        {
            url = $"/uploads/{storedName}",
            fileName = Path.GetFileName(file.FileName),
            contentType = SafeContentType(extension),
            size = file.Length
        });
    }

    private static async Task<bool> HasAllowedSignatureAsync(
        IFormFile file,
        string extension,
        CancellationToken cancellationToken)
    {
        if (extension.Equals(".txt", StringComparison.OrdinalIgnoreCase))
            return true;

        var buffer = ArrayPool<byte>.Shared.Rent(64);
        try
        {
            await using var stream = file.OpenReadStream();
            var read = await stream.ReadAsync(buffer.AsMemory(0, 64), cancellationToken);
            if (read < 4) return false;
            return extension.ToLowerInvariant() switch
            {
                ".jpg" or ".jpeg" => read >= 3 && buffer[0] == 0xFF && buffer[1] == 0xD8 && buffer[2] == 0xFF,
                ".png" => StartsWith(buffer, read, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A),
                ".gif" => StartsWithAscii(buffer, read, "GIF87a") || StartsWithAscii(buffer, read, "GIF89a"),
                ".webp" => read >= 12 && StartsWithAscii(buffer, read, "RIFF") && AsciiAt(buffer, read, 8, "WEBP"),
                ".pdf" => StartsWithAscii(buffer, read, "%PDF-"),
                ".zip" or ".docx" or ".xlsx" => StartsWith(buffer, read, 0x50, 0x4B, 0x03, 0x04) || StartsWith(buffer, read, 0x50, 0x4B, 0x05, 0x06),
                ".doc" or ".xls" => StartsWith(buffer, read, 0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1),
                ".webm" => StartsWith(buffer, read, 0x1A, 0x45, 0xDF, 0xA3),
                ".ogg" => StartsWithAscii(buffer, read, "OggS"),
                ".wav" => read >= 12 && StartsWithAscii(buffer, read, "RIFF") && AsciiAt(buffer, read, 8, "WAVE"),
                ".m4a" => read >= 12 && AsciiAt(buffer, read, 4, "ftyp"),
                ".mp3" => StartsWithAscii(buffer, read, "ID3") || (read >= 2 && buffer[0] == 0xFF && (buffer[1] & 0xE0) == 0xE0),
                _ => false
            };
        }
        finally
        {
            ArrayPool<byte>.Shared.Return(buffer);
        }
    }

    private static bool StartsWith(byte[] value, int length, params byte[] signature)
    {
        if (length < signature.Length) return false;
        for (var i = 0; i < signature.Length; i++)
            if (value[i] != signature[i]) return false;
        return true;
    }

    private static bool StartsWithAscii(byte[] value, int length, string signature)
        => length >= signature.Length && AsciiAt(value, length, 0, signature);

    private static bool AsciiAt(byte[] value, int length, int offset, string signature)
    {
        if (length < offset + signature.Length) return false;
        for (var i = 0; i < signature.Length; i++)
            if (value[offset + i] != (byte)signature[i]) return false;
        return true;
    }

    private static string SafeContentType(string extension) => extension.ToLowerInvariant() switch
    {
        ".jpg" or ".jpeg" => "image/jpeg",
        ".png" => "image/png",
        ".gif" => "image/gif",
        ".webp" => "image/webp",
        ".pdf" => "application/pdf",
        ".doc" => "application/msword",
        ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".xls" => "application/vnd.ms-excel",
        ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".zip" => "application/zip",
        ".webm" => "audio/webm",
        ".m4a" => "audio/mp4",
        ".mp3" => "audio/mpeg",
        ".wav" => "audio/wav",
        ".ogg" => "audio/ogg",
        _ => "text/plain"
    };

    private Guid GetUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(value, out var userId))
            throw new UnauthorizedAccessException();
        return userId;
    }
}
