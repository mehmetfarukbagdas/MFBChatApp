namespace ChatApp.Domain.Entities;

public class Message
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ChatId { get; set; }
    public Chat Chat { get; set; } = null!;
    public Guid SenderId { get; set; }
    public User Sender { get; set; } = null!;
    public string Content { get; set; } = null!;
    public DateTime SentAt { get; set; } = DateTime.UtcNow;
    public DateTime? EditedAt { get; set; }
    public bool IsPinned { get; set; }
    public DateTime? PinnedAt { get; set; }
    public Guid? PinnedByUserId { get; set; }

    public Guid? ReplyToMessageId { get; set; }
    public Message? ReplyToMessage { get; set; }

    public string? AttachmentUrl { get; set; }
    public string? AttachmentFileName { get; set; }
    public string? AttachmentContentType { get; set; }
    public long? AttachmentSize { get; set; }

    public ICollection<MessageReaction> Reactions { get; set; } = new List<MessageReaction>();
}
