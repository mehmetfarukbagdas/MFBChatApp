namespace ChatApp.Application.DTOs.Message;

public class MessageResponse
{
    public Guid Id { get; set; }
    public Guid ChatId { get; set; }
    public Guid SenderId { get; set; }
    public string SenderUsername { get; set; } = null!;
    public string Content { get; set; } = null!;
    public DateTime SentAt { get; set; }
    public DateTime? EditedAt { get; set; }
    public bool IsRead { get; set; }
    public bool IsPinned { get; set; }
    public DateTime? PinnedAt { get; set; }
    public Guid? PinnedByUserId { get; set; }

    public Guid? ReplyToMessageId { get; set; }
    public string? ReplyToSenderUsername { get; set; }
    public string? ReplyToContent { get; set; }
    public List<MessageReactionResponse> Reactions { get; set; } = new();

    public string? AttachmentUrl { get; set; }
    public string? AttachmentFileName { get; set; }
    public string? AttachmentContentType { get; set; }
    public long? AttachmentSize { get; set; }
}
