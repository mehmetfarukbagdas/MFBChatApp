using ChatApp.Application.DTOs.Chat;
using ChatApp.Application.Interfaces;
using ChatApp.Domain.Entities;
using ChatApp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ChatApp.Application.Services;

public class ChatService : IChatService
{
    private const string OwnerRole = "Owner";
    private const string AdminRole = "Admin";
    private const string MemberRole = "Member";

    private readonly AppDbContext _context;

    public ChatService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<ChatResponse> CreateChatAsync(
        Guid userId,
        string name,
        bool isGroup)
    {
        var chat = new Chat
        {
            Name = name,
            IsGroup = isGroup
        };

        chat.Members.Add(new ChatMember
        {
            UserId = userId,
            Role = isGroup ? OwnerRole : MemberRole
        });

        _context.Chats.Add(chat);
        await _context.SaveChangesAsync();

        return new ChatResponse
        {
            Id = chat.Id,
            Name = chat.Name,
            IsGroup = chat.IsGroup,
            CreatedAt = chat.CreatedAt,
            AvatarUrl = chat.AvatarUrl
        };
    }

    public async Task<List<ChatResponse>> GetUserChatsAsync(Guid userId)
    {
        var memberships = await _context.ChatMembers
            .Where(x => x.UserId == userId && x.DeletedAt == null)
            .Include(x => x.Chat)
                .ThenInclude(x => x.Members)
                    .ThenInclude(x => x.User)
            .OrderByDescending(x => x.IsPinned)
            .ThenByDescending(x => x.ArchivedAt == null)
            .ThenByDescending(x => x.Chat.CreatedAt)
            .ToListAsync();

        return memberships.Select(membership =>
        {
            var chat = membership.Chat;
            var other = !chat.IsGroup
                ? chat.Members.Select(m => m.User).FirstOrDefault(u => u.Id != userId)
                : null;

            return new ChatResponse
            {
                Id = chat.Id,
                Name = chat.Name,
                IsGroup = chat.IsGroup,
                CreatedAt = chat.CreatedAt,
                AvatarUrl = chat.AvatarUrl,
                OtherUserId = other?.Id,
                OtherUsername = other?.Username,
                OtherAvatarUrl = other != null &&
                    (other.ProfilePhotoVisibility == "Everyone" ||
                     other.ProfilePhotoVisibility == "Contacts")
                    ? other.AvatarUrl
                    : null,
                OtherLastSeenAt = other?.ShowLastSeen == true ? other.LastSeenAt : null,
                IsArchived = membership.ArchivedAt.HasValue,
                IsPinned = membership.IsPinned,
                IsMarkedUnread = membership.IsMarkedUnread
            };
        }).ToList();
    }

    public async Task<ChatResponse?> UpdateChatStateAsync(
        Guid chatId, Guid userId, UpdateChatStateRequest request)
    {
        var membership = await _context.ChatMembers
            .Include(x => x.Chat)
                .ThenInclude(x => x.Members)
                    .ThenInclude(x => x.User)
            .FirstOrDefaultAsync(x => x.ChatId == chatId && x.UserId == userId && x.DeletedAt == null);

        if (membership is null) return null;

        if (request.Archived.HasValue)
            membership.ArchivedAt = request.Archived.Value ? DateTime.UtcNow : null;
        if (request.Pinned.HasValue)
            membership.IsPinned = request.Pinned.Value;
        if (request.MarkedUnread.HasValue)
            membership.IsMarkedUnread = request.MarkedUnread.Value;
        if (request.ClearMessages)
            membership.ClearedAt = DateTime.UtcNow;
        if (request.DeleteChat)
            membership.DeletedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var chat = membership.Chat;
        var other = !chat.IsGroup ? chat.Members.Select(m => m.User).FirstOrDefault(u => u.Id != userId) : null;
        return new ChatResponse
        {
            Id = chat.Id, Name = chat.Name, IsGroup = chat.IsGroup, CreatedAt = chat.CreatedAt, AvatarUrl = chat.AvatarUrl,
            OtherUserId = other?.Id, OtherUsername = other?.Username,
            OtherAvatarUrl = other?.AvatarUrl, OtherLastSeenAt = other?.ShowLastSeen == true ? other.LastSeenAt : null,
            IsArchived = membership.ArchivedAt.HasValue, IsPinned = membership.IsPinned, IsMarkedUnread = membership.IsMarkedUnread
        };
    }

    public async Task<bool> AddMemberAsync(
        Guid chatId,
        Guid userId,
        Guid memberId)
    {
        var chat = await _context.Chats
            .FirstOrDefaultAsync(x => x.Id == chatId);

        if (chat is null || !chat.IsGroup)
            return false;

        if (!await IsOwnerOrAdminAsync(chatId, userId))
            return false;

        if (await _context.ChatMembers.AnyAsync(x =>
            x.ChatId == chatId && x.UserId == memberId))
            return false;

        if (!await _context.Users.AnyAsync(x => x.Id == memberId))
            return false;

        _context.ChatMembers.Add(new ChatMember
        {
            ChatId = chatId,
            UserId = memberId,
            Role = MemberRole
        });

        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<ChatMemberResponse>?> GetChatMembersAsync(
        Guid chatId,
        Guid userId)
    {
        if (!await _context.ChatMembers.AnyAsync(x =>
            x.ChatId == chatId && x.UserId == userId))
            return null;

        var members = await _context.ChatMembers
            .Where(x => x.ChatId == chatId)
            .OrderByDescending(x => x.Role == OwnerRole)
            .ThenByDescending(x => x.Role == AdminRole)
            .ThenBy(x => x.JoinedAt)
            .Select(x => new ChatMemberResponse
            {
                UserId = x.UserId,
                Username = x.User.Username,
                Email = x.User.Email,
                JoinedAt = x.JoinedAt,
                Role = x.Role,
                IsOwner = x.Role == OwnerRole,
                IsAdmin = x.Role == AdminRole
            })
            .ToListAsync();

        return members;
    }

    public async Task<bool> RemoveMemberAsync(
        Guid chatId,
        Guid userId,
        Guid memberId)
    {
        var chat = await _context.Chats
            .FirstOrDefaultAsync(x => x.Id == chatId);

        if (chat is null || !chat.IsGroup)
            return false;

        var actor = await _context.ChatMembers
            .FirstOrDefaultAsync(x => x.ChatId == chatId && x.UserId == userId);

        var target = await _context.ChatMembers
            .FirstOrDefaultAsync(x => x.ChatId == chatId && x.UserId == memberId);

        if (actor is null || target is null)
            return false;

        
        if (userId == memberId)
        {
            if (target.Role == OwnerRole)
                return false; 

            _context.ChatMembers.Remove(target);
            await _context.SaveChangesAsync();
            return true;
        }

        if (actor.Role == OwnerRole)
        {
            if (target.Role == OwnerRole)
                return false;

            _context.ChatMembers.Remove(target);
            await _context.SaveChangesAsync();
            return true;
        }

        if (actor.Role != AdminRole || target.Role != MemberRole)
            return false;

        _context.ChatMembers.Remove(target);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> SetAdminAsync(
        Guid chatId,
        Guid userId,
        Guid memberId,
        bool isAdmin)
    {
        var chat = await _context.Chats
            .FirstOrDefaultAsync(x => x.Id == chatId);

        if (chat is null || !chat.IsGroup)
            return false;

        var owner = await _context.ChatMembers
            .FirstOrDefaultAsync(x =>
                x.ChatId == chatId &&
                x.UserId == userId &&
                x.Role == OwnerRole);

        if (owner is null)
            return false;

        var target = await _context.ChatMembers
            .FirstOrDefaultAsync(x =>
                x.ChatId == chatId &&
                x.UserId == memberId);

        if (target is null || target.Role == OwnerRole)
            return false;

        target.Role = isAdmin ? AdminRole : MemberRole;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<ChatResponse?> UpdateChatNameAsync(
        Guid chatId,
        Guid userId,
        string name)
    {
        var chat = await _context.Chats
            .FirstOrDefaultAsync(x => x.Id == chatId);

        if (chat is null || !chat.IsGroup)
            return null;

        if (!await IsOwnerAsync(chatId, userId))
            return null;

        chat.Name = name.Trim();
        await _context.SaveChangesAsync();

        return new ChatResponse
        {
            Id = chat.Id,
            Name = chat.Name,
            IsGroup = chat.IsGroup,
            CreatedAt = chat.CreatedAt,
            AvatarUrl = chat.AvatarUrl
        };
    }

    private async Task<bool> IsOwnerAsync(Guid chatId, Guid userId)
    {
        return await _context.ChatMembers.AnyAsync(x =>
            x.ChatId == chatId &&
            x.UserId == userId &&
            x.Role == OwnerRole);
    }

    private async Task<bool> IsOwnerOrAdminAsync(Guid chatId, Guid userId)
    {
        return await _context.ChatMembers.AnyAsync(x =>
            x.ChatId == chatId &&
            x.UserId == userId &&
            (x.Role == OwnerRole || x.Role == AdminRole));
    }
}
