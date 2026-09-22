namespace ChatApp.Domain.Entities;

public class MessageHiddenForUser
{
    public Guid MessageId { get; set; }
    public Message Message { get; set; } = null!;
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public DateTime HiddenAt { get; set; } = DateTime.UtcNow;
}
