using ChatApp.Application.DTOs.Chat;

namespace ChatApp.Application.Interfaces;

public interface IChatService
{
    Task<ChatResponse> CreateChatAsync(Guid userId, string name, bool isGroup);
    Task<List<ChatResponse>> GetUserChatsAsync(Guid userId);
    Task<bool> AddMemberAsync(Guid chatId, Guid userId, Guid memberId);
    Task<List<ChatMemberResponse>?> GetChatMembersAsync(Guid chatId, Guid userId);
    Task<bool> RemoveMemberAsync(Guid chatId, Guid userId, Guid memberId);
    Task<bool> SetAdminAsync(Guid chatId, Guid userId, Guid memberId, bool isAdmin);
    Task<ChatResponse?> UpdateChatNameAsync(Guid chatId, Guid userId, string name);
    Task<ChatResponse?> UpdateChatStateAsync(Guid chatId, Guid userId, UpdateChatStateRequest request);
}
