namespace ChatApp.Domain.Entities;

public class MessageRead
{
    public Guid MessageId { get; set; }
    public Message Message { get; set; } = null!;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public DateTime ReadAt { get; set; } = DateTime.UtcNow;

    public bool ReceiptVisible { get; set; }
}
