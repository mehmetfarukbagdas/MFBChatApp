namespace ChatApp.Domain.Entities;

public class ChatMember
{
    public Guid ChatId { get; set; }
    public Chat Chat { get; set; } = null!;
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;
    public string Role { get; set; } = "Member";
    public DateTime? ArchivedAt { get; set; }
    public DateTime? ClearedAt { get; set; }
    public bool IsPinned { get; set; }
    public bool IsMarkedUnread { get; set; }
    public DateTime? DeletedAt { get; set; }
}
