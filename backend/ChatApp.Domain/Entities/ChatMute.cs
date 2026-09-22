namespace ChatApp.Domain.Entities;

public class ChatMute
{
    public Guid ChatId { get; set; }
    public Chat Chat { get; set; } = null!;
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public DateTime MutedAt { get; set; } = DateTime.UtcNow;
}
