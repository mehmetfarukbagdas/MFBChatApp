using ChatApp.API.Services;
using System.Security.Claims;
using ChatApp.API.Hubs;
using ChatApp.Application.DTOs.Chat;
using ChatApp.Application.Interfaces;
using ChatApp.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace ChatApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ChatsController : ControllerBase
{
    private const long MaxAvatarSize = 5 * 1024 * 1024;

    private static bool ContainsEmoji(string value)
    {
        for (var i = 0; i < value.Length; i++)
        {
            var codePoint = char.ConvertToUtf32(value, i);

            if (codePoint > 0xFFFF)
                i++;

            if ((codePoint >= 0x1F000 && codePoint <= 0x1FAFF) ||
                (codePoint >= 0x2600 && codePoint <= 0x27BF) ||
                codePoint == 0x00A9 || codePoint == 0x00AE ||
                codePoint == 0x203C || codePoint == 0x2049 ||
                codePoint == 0x2122 || codePoint == 0x2139 ||
                codePoint == 0x3030 || codePoint == 0x303D ||
                codePoint == 0x3297 || codePoint == 0x3299)
            {
                return true;
            }
        }

        return false;
    }

    private static readonly HashSet<string> AllowedAvatarExtensions =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ".jpg", ".jpeg", ".png", ".gif", ".webp"
        };

    private readonly IChatService _chatService;
    private readonly AppDbContext _context;
    private readonly IWebHostEnvironment _environment;
    private readonly IHubContext<ChatHub> _hubContext;

    public ChatsController(
        IChatService chatService,
        AppDbContext context,
        IWebHostEnvironment environment,
        IHubContext<ChatHub> hubContext)
    {
        _chatService = chatService;
        _context = context;
        _environment = environment;
        _hubContext = hubContext;
    }

    [HttpGet]
    public async Task<ActionResult<List<ChatResponse>>> GetChats()
    {
        var userId = GetUserId();
        return Ok(await _chatService.GetUserChatsAsync(userId));
    }

    [HttpPost]
    public async Task<ActionResult<ChatResponse>> CreateChat(
        [FromBody] CreateChatRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Sohbet adı boş olamaz." });

        var trimmedName = request.Name.Trim();
        if (request.IsGroup && ContainsEmoji(trimmedName))
            return BadRequest(new { message = "Grup adı emoji içeremez." });

        var userId = GetUserId();

        return Ok(await _chatService.CreateChatAsync(
            userId,
            trimmedName,
            request.IsGroup));
    }

    [HttpPatch("{chatId:guid}")]
    public async Task<ActionResult<ChatResponse>> UpdateChat(
        Guid chatId,
        [FromBody] UpdateChatNameRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            return BadRequest(new { message = "Grup adı boş olamaz." });

        var trimmedName = request.Name.Trim();
        if (ContainsEmoji(trimmedName))
            return BadRequest(new { message = "Grup adı emoji içeremez." });

        var userId = GetUserId();

        var chat = await _chatService.UpdateChatNameAsync(
            chatId,
            userId,
            trimmedName);

        if (chat is null)
        {
            return BadRequest(new
            {
                message = "Grup bulunamadı veya yalnızca grup sahibi grup adını değiştirebilir."
            });
        }

        return Ok(chat);
    }

    [HttpPost("{chatId:guid}/avatar")]
    [RequestSizeLimit(MaxAvatarSize)]
    public async Task<IActionResult> UploadGroupAvatar(
        Guid chatId,
        IFormFile file)
    {
        var userId = GetUserId();

        var chat = await _context.Chats
            .FirstOrDefaultAsync(x => x.Id == chatId);

        if (chat is null || !chat.IsGroup)
            return NotFound(new { message = "Grup bulunamadı." });

        var ownerId = await _context.ChatMembers
             .Where(x => x.ChatId == chatId && x.Role == "Owner")
            .Select(x => (Guid?)x.UserId)
            .FirstOrDefaultAsync();

        if (ownerId != userId)
            return Forbid();

        if (file is null || file.Length == 0)
            return BadRequest(new { message = "Grup görseli seçilmedi." });

        if (file.Length > MaxAvatarSize)
            return BadRequest(new { message = "Grup görseli 5 MB'dan büyük olamaz." });

        var extension = Path.GetExtension(file.FileName);

        if (!AllowedAvatarExtensions.Contains(extension))
            return BadRequest(new
            {
                message = "Sadece JPG, PNG, GIF veya WebP görselleri yükleyebilirsiniz."
            });

        var contentType = file.ContentType?.ToLowerInvariant();

        if (contentType is not
            ("image/jpeg" or "image/png" or "image/gif" or "image/webp"))
        {
            return BadRequest(new
            {
                message = "Geçersiz görsel türü."
            });
        }

        if (!await FileSignatureValidator.IsAllowedImageAsync(file, extension, HttpContext.RequestAborted))
            return BadRequest(new { message = "Görsel içeriği dosya türüyle eşleşmiyor." });

        var uploadsPath = Path.Combine(
            _environment.WebRootPath ??
                Path.Combine(_environment.ContentRootPath, "wwwroot"),
            "uploads",
            "group-avatars");

        Directory.CreateDirectory(uploadsPath);

        var storedName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var filePath = Path.Combine(uploadsPath, storedName);

        await using (var stream = System.IO.File.Create(filePath))
        {
            await file.CopyToAsync(stream);
        }

        var oldAvatarUrl = chat.AvatarUrl;

        chat.AvatarUrl = $"/uploads/group-avatars/{storedName}";

        await _context.SaveChangesAsync();

        DeleteStoredAvatar(oldAvatarUrl);

        await _hubContext.Clients
            .Group($"chat-{chatId}")
            .SendAsync("GroupAvatarUpdated", new
            {
                chatId,
                avatarUrl = chat.AvatarUrl
            });

        return Ok(new
        {
            avatarUrl = chat.AvatarUrl
        });
    }

    [HttpDelete("{chatId:guid}/avatar")]
    public async Task<IActionResult> RemoveGroupAvatar(Guid chatId)
    {
        var userId = GetUserId();

        var chat = await _context.Chats
            .FirstOrDefaultAsync(x => x.Id == chatId);

        if (chat is null || !chat.IsGroup)
            return NotFound(new { message = "Grup bulunamadı." });

        var ownerId = await _context.ChatMembers
             .Where(x => x.ChatId == chatId && x.Role == "Owner")
            .Select(x => (Guid?)x.UserId)
            .FirstOrDefaultAsync();

        if (ownerId != userId)
            return Forbid();

        var oldAvatarUrl = chat.AvatarUrl;
        if (string.IsNullOrWhiteSpace(oldAvatarUrl))
            return Ok(new { avatarUrl = (string?)null });

        chat.AvatarUrl = null;
        await _context.SaveChangesAsync();

        DeleteStoredAvatar(oldAvatarUrl);

        await _hubContext.Clients
            .Group($"chat-{chatId}")
            .SendAsync("GroupAvatarUpdated", new
            {
                chatId,
                avatarUrl = (string?)null
            });

        return Ok(new { avatarUrl = (string?)null });
    }

    [HttpPatch("{chatId:guid}/state")]
    public async Task<IActionResult> UpdateChatState(
        Guid chatId,
        [FromBody] UpdateChatStateRequest request)
    {
        var userId = GetUserId();
        var chat = await _chatService.UpdateChatStateAsync(chatId, userId, request);
        if (chat is null) return NotFound(new { message = "Sohbet bulunamadı." });

        await _hubContext.Clients.Group($"chat-{chatId}").SendAsync("ChatStateUpdated", new
        {
            chatId,
            userId,
            isArchived = chat.IsArchived,
            isPinned = chat.IsPinned,
            isMarkedUnread = chat.IsMarkedUnread,
            deleted = request.DeleteChat,
            clearedAt = request.ClearMessages ? DateTime.UtcNow : (DateTime?)null
        });

        return Ok(chat);
    }

    [HttpGet("{chatId:guid}/members")]
    public async Task<ActionResult<List<ChatMemberResponse>>> GetMembers(Guid chatId)
    {
        var userId = GetUserId();

        var members = await _chatService.GetChatMembersAsync(chatId, userId);

        if (members is null)
            return Forbid();

        return Ok(members);
    }

    [HttpPost("{chatId:guid}/members")]
    public async Task<IActionResult> AddMember(
        Guid chatId,
        [FromBody] AddMemberRequest request)
    {
        if (request.MemberId == Guid.Empty)
            return BadRequest(new { message = "Geçerli bir kullanıcı seçmelisiniz." });

        var userId = GetUserId();

        var result = await _chatService.AddMemberAsync(
            chatId,
            userId,
            request.MemberId);

        if (!result)
        {
            return BadRequest(new
            {
                message = "Kullanıcı eklenemedi. Grup bulunamıyor olabilir, yalnızca grup sahibi üye ekleyebilir, kullanıcı zaten eklenmiş olabilir veya kullanıcı bulunamıyor olabilir."
            });
        }

        await _hubContext.Clients
            .Group($"chat-{chatId}")
            .SendAsync("GroupMemberAdded", new
            {
                chatId,
                memberId = request.MemberId
            });

        return Ok(new { message = "Kullanıcı gruba eklendi." });
    }

    [HttpDelete("{chatId:guid}/members/{memberId:guid}")]
    public async Task<IActionResult> RemoveMember(Guid chatId, Guid memberId)
    {
        var userId = GetUserId();

        var result = await _chatService.RemoveMemberAsync(
            chatId,
            userId,
            memberId);

        if (!result)
        {
            return BadRequest(new
            {
                message = "Kullanıcı çıkarılamadı. Grup bulunamıyor olabilir, yalnızca grup sahibi üye çıkarabilir, kullanıcı grupta olmayabilir veya grup sahibi çıkarılamaz."
            });
        }

        await _hubContext.Clients
            .Group($"chat-{chatId}")
            .SendAsync("GroupMemberRemoved", new
            {
                chatId,
                memberId
            });

        return Ok(new { message = "Kullanıcı gruptan çıkarıldı." });
    }


    [HttpPost("{chatId:guid}/members/{memberId:guid}/admin")]
    public async Task<IActionResult> SetMemberAdmin(
        Guid chatId,
        Guid memberId,
        [FromBody] SetAdminRequest request)
    {
        if (memberId == Guid.Empty)
            return BadRequest(new { message = "Geçerli bir kullanıcı seçmelisiniz." });

        var userId = GetUserId();

        var result = await _chatService.SetAdminAsync(
            chatId,
            userId,
            memberId,
            request.IsAdmin);

        if (!result)
        {
            return BadRequest(new
            {
                message = request.IsAdmin
                    ? "Yönetici atanamadı. Yalnızca grup sahibi bu işlemi yapabilir."
                    : "Yöneticilik kaldırılamadı. Yalnızca grup sahibi bu işlemi yapabilir."
            });
        }

        await _hubContext.Clients
            .Group($"chat-{chatId}")
            .SendAsync("GroupMemberRoleUpdated", new
            {
                chatId,
                memberId,
                isAdmin = request.IsAdmin
            });

        return Ok(new
        {
            message = request.IsAdmin ? "Kullanıcı yönetici yapıldı." : "Yöneticilik kaldırıldı.",
            memberId,
            isAdmin = request.IsAdmin
        });
    }

    [HttpDelete("{chatId:guid}/members/me")]
    public async Task<IActionResult> LeaveGroup(Guid chatId)
    {
        var userId = GetUserId();

        var result = await _chatService.RemoveMemberAsync(
            chatId,
            userId,
            userId);

        if (!result)
        {
            return BadRequest(new
            {
                message = "Gruptan ayrılamadınız. Grup sahibiyseniz önce sahipliği devretmeniz gerekir."
            });
        }

        await _hubContext.Clients
            .Group($"chat-{chatId}")
            .SendAsync("GroupMemberRemoved", new
            {
                chatId,
                memberId = userId
            });

        return Ok(new { message = "Gruptan ayrıldınız." });
    }

    private void DeleteStoredAvatar(string? avatarUrl)
    {
        if (string.IsNullOrWhiteSpace(avatarUrl) ||
            !avatarUrl.StartsWith("/uploads/group-avatars/",
                StringComparison.OrdinalIgnoreCase))
            return;

        var storedFileName = Path.GetFileName(avatarUrl);

        if (string.IsNullOrWhiteSpace(storedFileName))
            return;

        var uploadsPath = Path.Combine(
            _environment.WebRootPath ??
                Path.Combine(_environment.ContentRootPath, "wwwroot"),
            "uploads",
            "group-avatars");

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

    private Guid GetUserId()
    {
        var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!Guid.TryParse(userIdValue, out var userId))
            throw new UnauthorizedAccessException("Kullanıcı doğrulanamadı.");

        return userId;
    }
}

public class CreateChatRequest
{
    public string Name { get; set; } = string.Empty;
    public bool IsGroup { get; set; }
}

public class AddMemberRequest
{
    public Guid MemberId { get; set; }
}

public class SetAdminRequest
{
    public bool IsAdmin { get; set; }
}
