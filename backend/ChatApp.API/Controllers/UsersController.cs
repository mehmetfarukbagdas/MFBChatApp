using ChatApp.API.Services;
using System.Security.Claims;
using ChatApp.API.Hubs;
using ChatApp.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace ChatApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class UsersController : ControllerBase
{
    private const long MaxAvatarSize = 5 * 1024 * 1024;

    private static readonly HashSet<string> AllowedAvatarExtensions =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ".jpg", ".jpeg", ".png", ".gif", ".webp"
        };

    private readonly AppDbContext _context;
    private readonly IWebHostEnvironment _environment;
    private readonly IHubContext<ChatHub> _hubContext;

    public UsersController(
        AppDbContext context,
        IWebHostEnvironment environment,
        IHubContext<ChatHub> hubContext)
    {
        _context = context;
        _environment = environment;
        _hubContext = hubContext;
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var userId = GetUserId();

        var user = await _context.Users
            .Where(x => x.Id == userId)
            .Select(x => new
            {
                id = x.Id,
                username = x.Username,
                email = x.Email,
                createdAt = x.CreatedAt,
                avatarUrl = x.AvatarUrl,
                displayName = x.DisplayName,
                bio = x.Bio,
                showOnlineStatus = x.ShowOnlineStatus,
                showLastSeen = x.ShowLastSeen,
                readReceipts = x.ReadReceipts,
                profilePhotoVisibility = x.ProfilePhotoVisibility,
                bioVisibility = x.BioVisibility,
                statusText = x.StatusExpiresAt != null && x.StatusExpiresAt <= DateTime.UtcNow ? null : x.StatusText,
                statusEmoji = x.StatusExpiresAt != null && x.StatusExpiresAt <= DateTime.UtcNow ? null : x.StatusEmoji,
                statusExpiresAt = x.StatusExpiresAt != null && x.StatusExpiresAt <= DateTime.UtcNow ? null : x.StatusExpiresAt
            })
            .FirstOrDefaultAsync();

        if (user is null)
            return NotFound(new { message = "Kullanıcı bulunamadı." });

        return Ok(user);
    }

    [HttpPatch("me")]
    public async Task<IActionResult> UpdateMe([FromBody] UpdateProfileRequest request)
    {
        var userId = GetUserId();
        var username = request.Username?.Trim() ?? string.Empty;
        var displayName = request.DisplayName?.Trim();
        var bio = request.Bio?.Trim();

        if (username.Length < 3 || username.Length > 30)
        {
            return BadRequest(new
            {
                message = "Kullanıcı adı 3 ile 30 karakter arasında olmalıdır."
            });
        }

        if (displayName?.Length > 50)
        {
            return BadRequest(new
            {
                message = "Görünen ad 50 karakterden uzun olamaz."
            });
        }

        if (bio?.Length > 160)
        {
            return BadRequest(new
            {
                message = "Biyografi 160 karakterden uzun olamaz."
            });
        }

        if (!IsValidVisibility(request.ProfilePhotoVisibility) ||
            !IsValidVisibility(request.BioVisibility))
        {
            return BadRequest(new { message = "Geçersiz profil görünürlük seçeneği." });
        }

        var statusText = request.StatusText?.Trim();
        var statusEmoji = request.StatusEmoji?.Trim();

        if (statusText?.Length > 80)
            return BadRequest(new { message = "Durum 80 karakterden uzun olamaz." });

        if (statusEmoji?.Length > 8)
            return BadRequest(new { message = "Durum emojisi çok uzun." });

        if (request.StatusExpiresAt.HasValue && request.StatusExpiresAt.Value <= DateTime.UtcNow)
            request.StatusExpiresAt = null;

        var exists = await _context.Users.AnyAsync(x =>
            x.Id != userId && x.Username.ToLower() == username.ToLower());

        if (exists)
            return Conflict(new { message = "Bu kullanıcı adı zaten kullanılıyor." });

        var user = await _context.Users.FirstOrDefaultAsync(x => x.Id == userId);

        if (user is null)
            return NotFound(new { message = "Kullanıcı bulunamadı." });

        user.Username = username;
        user.DisplayName = displayName;
        user.Bio = bio;
        user.ShowOnlineStatus = request.ShowOnlineStatus;
        user.ShowLastSeen = request.ShowLastSeen;
        user.ReadReceipts = request.ReadReceipts;
        user.ProfilePhotoVisibility = request.ProfilePhotoVisibility;
        user.BioVisibility = request.BioVisibility;
        user.StatusText = string.IsNullOrWhiteSpace(statusText) ? null : statusText;
        user.StatusEmoji = string.IsNullOrWhiteSpace(statusEmoji) ? null : statusEmoji;
        user.StatusExpiresAt = request.StatusExpiresAt;

        await _context.SaveChangesAsync();

        await _hubContext.Clients.All.SendAsync("UserProfileUpdated", new
        {
            userId = user.Id,
            username = user.Username,
            avatarUrl = user.AvatarUrl,
            displayName = user.DisplayName,
            bio = user.Bio,
            statusText = user.StatusExpiresAt != null && user.StatusExpiresAt <= DateTime.UtcNow ? null : user.StatusText,
            statusEmoji = user.StatusExpiresAt != null && user.StatusExpiresAt <= DateTime.UtcNow ? null : user.StatusEmoji,
            statusExpiresAt = user.StatusExpiresAt != null && user.StatusExpiresAt <= DateTime.UtcNow ? null : user.StatusExpiresAt
        });

        return Ok(new
        {
            id = user.Id,
            username = user.Username,
            email = user.Email,
            createdAt = user.CreatedAt,
            avatarUrl = user.AvatarUrl,
            displayName = user.DisplayName,
            bio = user.Bio,
            statusText = user.StatusExpiresAt != null && user.StatusExpiresAt <= DateTime.UtcNow ? null : user.StatusText,
            statusEmoji = user.StatusExpiresAt != null && user.StatusExpiresAt <= DateTime.UtcNow ? null : user.StatusEmoji,
            statusExpiresAt = user.StatusExpiresAt != null && user.StatusExpiresAt <= DateTime.UtcNow ? null : user.StatusExpiresAt
        });
    }

    [HttpPost("me/avatar")]
    [RequestSizeLimit(MaxAvatarSize)]
    public async Task<IActionResult> UploadMyAvatar(IFormFile file)
    {
        var userId = GetUserId();

        if (file is null || file.Length == 0)
            return BadRequest(new { message = "Profil görseli seçilmedi." });

        if (file.Length > MaxAvatarSize)
            return BadRequest(new { message = "Profil görseli 5 MB'dan büyük olamaz." });

        var extension = Path.GetExtension(file.FileName);

        if (!AllowedAvatarExtensions.Contains(extension))
        {
            return BadRequest(new
            {
                message = "Sadece JPG, PNG, GIF veya WebP görselleri yükleyebilirsiniz."
            });
        }

        var contentType = file.ContentType?.ToLowerInvariant();

        if (contentType is not
            ("image/jpeg" or "image/png" or "image/gif" or "image/webp"))
        {
            return BadRequest(new { message = "Geçersiz görsel türü." });
        }

        if (!await FileSignatureValidator.IsAllowedImageAsync(file, extension, HttpContext.RequestAborted))
            return BadRequest(new { message = "Görsel içeriği dosya türüyle eşleşmiyor." });

        var user = await _context.Users.FirstOrDefaultAsync(x => x.Id == userId);

        if (user is null)
            return NotFound(new { message = "Kullanıcı bulunamadı." });

        var uploadsPath = Path.Combine(
            _environment.WebRootPath ??
                Path.Combine(_environment.ContentRootPath, "wwwroot"),
            "uploads",
            "user-avatars");

        Directory.CreateDirectory(uploadsPath);

        var storedName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var filePath = Path.Combine(uploadsPath, storedName);

        await using (var stream = System.IO.File.Create(filePath))
        {
            await file.CopyToAsync(stream);
        }

        var oldAvatarUrl = user.AvatarUrl;
        user.AvatarUrl = $"/uploads/user-avatars/{storedName}";

        await _context.SaveChangesAsync();

        DeleteStoredAvatar(oldAvatarUrl);

        await _hubContext.Clients.All.SendAsync("UserProfileUpdated", new
        {
            userId = user.Id,
            username = user.Username,
            avatarUrl = user.AvatarUrl
        });

        return Ok(new
        {
            avatarUrl = user.AvatarUrl
        });
    }

    [HttpDelete("me/avatar")]
    public async Task<IActionResult> DeleteMyAvatar()
    {
        var userId = GetUserId();
        var user = await _context.Users.FirstOrDefaultAsync(x => x.Id == userId);
        if (user is null) return NotFound(new { message = "Kullanıcı bulunamadı." });

        var oldAvatarUrl = user.AvatarUrl;
        user.AvatarUrl = null;
        await _context.SaveChangesAsync();
        DeleteStoredAvatar(oldAvatarUrl);

        await _hubContext.Clients.All.SendAsync("UserProfileUpdated", new
        {
            userId = user.Id,
            username = user.Username,
            avatarUrl = (string?)null
        });

        return Ok(new { avatarUrl = (string?)null });
    }


    [HttpPost("me/change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = GetUserId();
        var currentPassword = request.CurrentPassword ?? string.Empty;
        var newPassword = request.NewPassword ?? string.Empty;

        if (newPassword.Length < 8 || newPassword.Length > 128)
            return BadRequest(new { message = "Yeni şifre 8 ile 128 karakter arasında olmalıdır." });

        if (currentPassword == newPassword)
            return BadRequest(new { message = "Yeni şifre mevcut şifreden farklı olmalıdır." });

        var user = await _context.Users.FirstOrDefaultAsync(x => x.Id == userId);
        if (user is null)
            return NotFound(new { message = "Kullanıcı bulunamadı." });

        if (!BCrypt.Net.BCrypt.Verify(currentPassword, user.PasswordHash))
            return BadRequest(new { message = "Mevcut şifre yanlış." });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        user.SecurityStamp = Guid.NewGuid().ToString("N");
        await _context.SaveChangesAsync();

        return Ok(new { message = "Şifreniz değiştirildi. Güvenlik nedeniyle tüm oturumlar sonlandırıldı." });
    }

    [HttpPost("me/logout-all-sessions")]
    public async Task<IActionResult> LogoutAllSessions()
    {
        var userId = GetUserId();
        var user = await _context.Users.FirstOrDefaultAsync(x => x.Id == userId);
        if (user is null)
            return NotFound(new { message = "Kullanıcı bulunamadı." });

        user.SecurityStamp = Guid.NewGuid().ToString("N");
        await _context.SaveChangesAsync();

        return Ok(new { message = "Tüm aktif oturumlar sonlandırıldı." });
    }

    [HttpDelete("me")]
    public async Task<IActionResult> DeleteMyAccount([FromBody] DeleteAccountRequest request)
    {
        var userId = GetUserId();
        var confirmation = request.Confirmation?.Trim() ?? string.Empty;
        var currentPassword = request.CurrentPassword ?? string.Empty;

        if (!string.Equals(confirmation, "DELETE", StringComparison.Ordinal))
            return BadRequest(new { message = "Onay alanına DELETE yazmalısınız." });

        var user = await _context.Users.FirstOrDefaultAsync(x => x.Id == userId);
        if (user is null)
            return NotFound(new { message = "Kullanıcı bulunamadı." });

        if (!BCrypt.Net.BCrypt.Verify(currentPassword, user.PasswordHash))
            return BadRequest(new { message = "Mevcut şifre yanlış." });

        var avatarUrl = user.AvatarUrl;
        var messageAttachmentUrls = await _context.Messages
            .Where(x => x.SenderId == userId && x.AttachmentUrl != null)
            .Select(x => x.AttachmentUrl!)
            .ToListAsync();

        await using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            await _context.MessageReactions
                .Where(x => x.UserId == userId)
                .ExecuteDeleteAsync();

            await _context.MessageReads
                .Where(x => x.UserId == userId)
                .ExecuteDeleteAsync();

            await _context.Messages
                .Where(x => x.SenderId == userId)
                .ExecuteDeleteAsync();

            await _context.ChatMutes
                .Where(x => x.UserId == userId)
                .ExecuteDeleteAsync();

            await _context.ChatMembers
                .Where(x => x.UserId == userId)
                .ExecuteDeleteAsync();

            await _context.Users
                .Where(x => x.Id == userId)
                .ExecuteDeleteAsync();

            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            return StatusCode(500, new { message = "Hesap silinemedi. Lütfen tekrar deneyin." });
        }

        DeleteStoredAvatar(avatarUrl);
        foreach (var attachmentUrl in messageAttachmentUrls)
            DeleteStoredAttachment(attachmentUrl);

        await _hubContext.Clients.All.SendAsync("UserDeleted", new { userId });

        return Ok(new { message = "Hesabınız ve hesabınıza ait veriler silindi." });
    }

    [HttpGet("username-availability")]
    public async Task<IActionResult> UsernameAvailability([FromQuery] string username)
    {
        var currentUserId = GetUserId();
        var normalized = username?.Trim() ?? string.Empty;

        if (normalized.Length < 3 || normalized.Length > 30)
            return Ok(new { available = false, valid = false });

        if (!System.Text.RegularExpressions.Regex.IsMatch(normalized, @"^[A-Za-z0-9_]+$"))
            return Ok(new { available = false, valid = false });

        var taken = await _context.Users.AnyAsync(x =>
            x.Id != currentUserId &&
            x.Username.ToLower() == normalized.ToLower());

        return Ok(new { available = !taken, valid = true });
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string q)
    {
        var currentUserId = GetUserId();
        var query = q?.Trim() ?? string.Empty;

        if (query.Length < 2)
            return Ok(Array.Empty<object>());

        var users = await _context.Users
            .Where(x =>
                x.Id != currentUserId &&
                (EF.Functions.ILike(x.Username, $"%{query}%") ||
                 EF.Functions.ILike(x.Email, $"%{query}%")))
            .OrderBy(x => x.Username)
            .Take(20)
            .Select(x => new
            {
                id = x.Id,
                username = x.Username
            })
            .ToListAsync();

        return Ok(users);
    }

    [HttpGet("{userId:guid}/public-profile")]
    public async Task<IActionResult> GetPublicProfile(Guid userId)
    {
        var viewerId = GetUserId();
        var user = await _context.Users.FirstOrDefaultAsync(x => x.Id == userId);
        if (user is null) return NotFound(new { message = "Kullanıcı bulunamadı." });

        var isSelf = viewerId == userId;
        var isContact = isSelf || await _context.ChatMembers.AnyAsync(m =>
            m.UserId == viewerId &&
            _context.ChatMembers.Any(other => other.ChatId == m.ChatId && other.UserId == userId));

        bool CanSee(string visibility) => visibility == "Everyone" || (visibility == "Contacts" && isContact) || isSelf;
        var canSeePhoto = CanSee(user.ProfilePhotoVisibility);
        var canSeeBio = CanSee(user.BioVisibility);
        var statusExpired = user.StatusExpiresAt.HasValue && user.StatusExpiresAt.Value <= DateTime.UtcNow;

        return Ok(new
        {
            id = user.Id,
            username = user.Username,
            displayName = user.DisplayName,
            avatarUrl = canSeePhoto ? user.AvatarUrl : null,
            bio = canSeeBio ? user.Bio : null,
            statusText = statusExpired ? null : user.StatusText,
            statusEmoji = statusExpired ? null : user.StatusEmoji,
            statusExpiresAt = statusExpired ? null : user.StatusExpiresAt,
            showOnlineStatus = user.ShowOnlineStatus,
            lastSeenAt = user.ShowLastSeen ? user.LastSeenAt : null
        });
    }


    private void DeleteStoredAttachment(string? attachmentUrl)
    {
        if (string.IsNullOrWhiteSpace(attachmentUrl) ||
            !attachmentUrl.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase) ||
            attachmentUrl.StartsWith("/uploads/user-avatars/", StringComparison.OrdinalIgnoreCase) ||
            attachmentUrl.StartsWith("/uploads/group-avatars/", StringComparison.OrdinalIgnoreCase))
            return;

        var storedFileName = Path.GetFileName(attachmentUrl);
        if (string.IsNullOrWhiteSpace(storedFileName)) return;

        var uploadsPath = Path.Combine(
            _environment.WebRootPath ?? Path.Combine(_environment.ContentRootPath, "wwwroot"),
            "uploads");
        var filePath = Path.Combine(uploadsPath, storedFileName);

        if (System.IO.File.Exists(filePath))
        {
            try { System.IO.File.Delete(filePath); }
            catch { }
        }
    }

    private void DeleteStoredAvatar(string? avatarUrl)
    {
        if (string.IsNullOrWhiteSpace(avatarUrl) ||
            !avatarUrl.StartsWith("/uploads/user-avatars/",
                StringComparison.OrdinalIgnoreCase))
            return;

        var storedFileName = Path.GetFileName(avatarUrl);
        if (string.IsNullOrWhiteSpace(storedFileName)) return;

        var uploadsPath = Path.Combine(
            _environment.WebRootPath ??
                Path.Combine(_environment.ContentRootPath, "wwwroot"),
            "uploads",
            "user-avatars");

        var filePath = Path.Combine(uploadsPath, storedFileName);

        if (System.IO.File.Exists(filePath))
        {
            try
            {
                System.IO.File.Delete(filePath);
            }
            catch
            {
                
            }
        }
    }

    private static bool IsValidVisibility(string? value) =>
        value is "Everyone" or "Contacts" or "Nobody";

    private Guid GetUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!Guid.TryParse(value, out var userId))
            throw new UnauthorizedAccessException();

        return userId;
    }
}

public class UpdateProfileRequest
{
    public string Username { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string? Bio { get; set; }
    public bool ShowOnlineStatus { get; set; } = true;
    public bool ShowLastSeen { get; set; } = true;
    public bool ReadReceipts { get; set; } = true;
    public string ProfilePhotoVisibility { get; set; } = "Everyone";
    public string BioVisibility { get; set; } = "Everyone";
    public string? StatusText { get; set; }
    public string? StatusEmoji { get; set; }
    public DateTime? StatusExpiresAt { get; set; }
}

public class ChangePasswordRequest
{
    public string? CurrentPassword { get; set; }
    public string? NewPassword { get; set; }
}

public class DeleteAccountRequest
{
    public string? CurrentPassword { get; set; }
    public string? Confirmation { get; set; }
}
