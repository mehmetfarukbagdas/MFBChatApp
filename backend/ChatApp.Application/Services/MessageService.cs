using ChatApp.Application.DTOs.Message;
using ChatApp.Application.Interfaces;
using ChatApp.Domain.Entities;
using ChatApp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace ChatApp.Application.Services;

public class MessageService : IMessageService
{
    private readonly AppDbContext _context;

    public MessageService(AppDbContext context) => _context = context;

    public async Task<MessageResponse> SendMessageAsync(Guid userId, Guid chatId, string content)
    {
        if (string.IsNullOrWhiteSpace(content)) throw new InvalidOperationException("Mesaj boş olamaz.");
        var isMember = await _context.ChatMembers.AnyAsync(x => x.ChatId == chatId && x.UserId == userId);
        if (!isMember) throw new UnauthorizedAccessException("Bu sohbete erişiminiz yok.");
        var message = new Message { ChatId = chatId, SenderId = userId, Content = content.Trim(), SentAt = DateTime.UtcNow };
        _context.Messages.Add(message);
        await _context.SaveChangesAsync();
        return await BuildResponse(message.Id, userId);
    }

    public async Task<List<MessageResponse>> GetChatMessagesAsync(Guid userId, Guid chatId)
    {
        var membership = await _context.ChatMembers.FirstOrDefaultAsync(x => x.ChatId == chatId && x.UserId == userId && x.DeletedAt == null);
        if (membership is null) throw new UnauthorizedAccessException("Bu sohbete erişiminiz yok.");

        var hiddenMessageIds = _context.MessageHiddenForUsers
            .Where(x => x.UserId == userId)
            .Select(x => x.MessageId);

        var idsQuery = _context.Messages
            .Where(x => x.ChatId == chatId && !hiddenMessageIds.Contains(x.Id));
        if (membership.ClearedAt.HasValue) idsQuery = idsQuery.Where(x => x.SentAt > membership.ClearedAt.Value);
        var ids = await idsQuery.OrderBy(x => x.SentAt).Select(x => x.Id).ToListAsync();
        var result = new List<MessageResponse>();
        foreach (var id in ids) result.Add(await BuildResponse(id, userId));
        return result;
    }

    public async Task<List<GlobalMessageSearchResponse>> SearchMessagesAsync(Guid userId, string query)
    {
        var chatIds = _context.ChatMembers.Where(x => x.UserId == userId).Select(x => x.ChatId);
        var hiddenMessageIds = _context.MessageHiddenForUsers
            .Where(x => x.UserId == userId)
            .Select(x => x.MessageId);
        return await _context.Messages
            .Where(x => chatIds.Contains(x.ChatId) && !hiddenMessageIds.Contains(x.Id) && EF.Functions.ILike(x.Content, $"%{query}%"))
            .OrderByDescending(x => x.SentAt)
            .Take(100)
            .Select(x => new GlobalMessageSearchResponse
            {
                Id = x.Id, ChatId = x.ChatId, ChatName = x.Chat.Name, IsGroup = x.Chat.IsGroup,
                SenderId = x.SenderId, SenderUsername = x.Sender.Username, Content = x.Content, SentAt = x.SentAt
            }).ToListAsync();
    }

    private async Task<MessageResponse> BuildResponse(Guid messageId, Guid userId)
    {
        var message = await _context.Messages
            .Include(x => x.Sender)
            .Include(x => x.ReplyToMessage).ThenInclude(x => x!.Sender)
            .FirstAsync(x => x.Id == messageId);

        var reactions = await _context.MessageReactions
            .Where(x => x.MessageId == messageId)
            .GroupBy(x => x.Emoji)
            .Select(g => new MessageReactionResponse { Emoji = g.Key, Count = g.Count(), ReactedByMe = g.Any(x => x.UserId == userId) })
            .ToListAsync();

        var isRead = message.SenderId == userId && await _context.MessageReads.AnyAsync(x => x.MessageId == messageId && x.UserId != userId && x.ReceiptVisible);

        return new MessageResponse
        {
            Id = message.Id, ChatId = message.ChatId, SenderId = message.SenderId, SenderUsername = message.Sender.Username,
            Content = message.Content, SentAt = message.SentAt, EditedAt = message.EditedAt, IsRead = isRead, IsPinned = message.IsPinned, PinnedAt = message.PinnedAt, PinnedByUserId = message.PinnedByUserId,
            AttachmentUrl = message.AttachmentUrl, AttachmentFileName = message.AttachmentFileName,
            AttachmentContentType = message.AttachmentContentType, AttachmentSize = message.AttachmentSize,
            ReplyToMessageId = message.ReplyToMessageId, ReplyToSenderUsername = message.ReplyToMessage?.Sender.Username,
            ReplyToContent = message.ReplyToMessage?.Content, Reactions = reactions
        };
    }
}
