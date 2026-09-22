using ChatApp.Application.DTOs.Message;

namespace ChatApp.Application.Interfaces;

public interface IMessageService
{
    Task<MessageResponse> SendMessageAsync(
        Guid userId,
        Guid chatId,
        string content);

    Task<List<MessageResponse>> GetChatMessagesAsync(
        Guid userId,
        Guid chatId);

    Task<List<GlobalMessageSearchResponse>> SearchMessagesAsync(Guid userId, string query);
}