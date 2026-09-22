using System.Buffers;
using System.Text;

namespace ChatApp.API.Services;

public static class FileSignatureValidator
{
    public static async Task<bool> IsAllowedImageAsync(IFormFile file, string extension, CancellationToken cancellationToken = default)
    {
        var normalized = extension.ToLowerInvariant();
        if (normalized is not (".jpg" or ".jpeg" or ".png" or ".gif" or ".webp")) return false;

        var buffer = ArrayPool<byte>.Shared.Rent(16);
        try
        {
            await using var stream = file.OpenReadStream();
            var read = await stream.ReadAsync(buffer.AsMemory(0, 16), cancellationToken);
            return normalized switch
            {
                ".jpg" or ".jpeg" => read >= 3 && buffer[0] == 0xFF && buffer[1] == 0xD8 && buffer[2] == 0xFF,
                ".png" => StartsWith(buffer, read, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A),
                ".gif" => StartsWithAscii(buffer, read, "GIF87a") || StartsWithAscii(buffer, read, "GIF89a"),
                ".webp" => read >= 12 && StartsWithAscii(buffer, read, "RIFF") && AsciiAt(buffer, read, 8, "WEBP"),
                _ => false
            };
        }
        finally { ArrayPool<byte>.Shared.Return(buffer); }
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
}
