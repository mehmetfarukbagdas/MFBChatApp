namespace ChatApp.Domain.Entities;

public class PushSubscription
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Endpoint { get; set; } = null!;
    public string P256dh { get; set; } = null!;
    public string Auth { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastUsedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}
