using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using ChatApp.Domain.Entities;
using ChatApp.Infrastructure.Data;

namespace ChatApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DirectChatsController : ControllerBase
{
    private readonly AppDbContext _context;

    public DirectChatsController(AppDbContext context)
    {
        _context = context;
    }

    [HttpPost("{otherUserId:guid}")]
    public async Task<IActionResult> CreateOrGet(Guid otherUserId)
    {
        var currentUserId = GetUserId();

        if (currentUserId == otherUserId)
            return BadRequest(new { message = "Kendinizle sohbet başlatamazsınız." });

        var otherUser = await _context.Users
            .FirstOrDefaultAsync(x => x.Id == otherUserId);

        if (otherUser is null)
            return NotFound(new { message = "Kullanıcı bulunamadı." });

        var existingChatId = await _context.ChatMembers
            .Where(x => x.UserId == currentUserId)
            .Select(x => x.ChatId)
            .Where(chatId =>
                _context.Chats.Any(c => c.Id == chatId && !c.IsGroup))
            .Where(chatId =>
                _context.ChatMembers.Count(m => m.ChatId == chatId) == 2 &&
                _context.ChatMembers.Any(m =>
                    m.ChatId == chatId && m.UserId == otherUserId))
            .Select(chatId => (Guid?)chatId)
            .FirstOrDefaultAsync();

        if (existingChatId.HasValue)
        {
            var existingChat = await _context.Chats
                .Where(x => x.Id == existingChatId.Value)
                .Select(x => new
                {
                    id = x.Id,
                    name = otherUser.Username,
                    isGroup = x.IsGroup,
                    createdAt = x.CreatedAt,
                    avatarUrl = (string?)null,
                    otherUserId = otherUserId,
                    otherUsername = otherUser.Username,
                    otherAvatarUrl = otherUser.AvatarUrl,
                    otherLastSeenAt = otherUser.ShowLastSeen ? otherUser.LastSeenAt : null
                })
                .FirstAsync();

            return Ok(existingChat);
        }

        var chat = new Chat
        {
            Name = otherUser.Username,
            IsGroup = false
        };

        chat.Members.Add(new ChatMember
        {
            UserId = currentUserId
        });

        chat.Members.Add(new ChatMember
        {
            UserId = otherUserId
        });

        _context.Chats.Add(chat);
        await _context.SaveChangesAsync();

        return Ok(new
        {
            id = chat.Id,
            name = otherUser.Username,
            isGroup = false,
            createdAt = chat.CreatedAt,
            avatarUrl = (string?)null,
            otherUserId,
            otherUsername = otherUser.Username,
            otherAvatarUrl = otherUser.AvatarUrl,
            otherLastSeenAt = otherUser.ShowLastSeen ? otherUser.LastSeenAt : null
        });
    }

    private Guid GetUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!Guid.TryParse(value, out var userId))
            throw new UnauthorizedAccessException();

        return userId;
    }
}
