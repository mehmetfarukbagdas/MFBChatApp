namespace ChatApp.Domain.Entities;

public class Chat
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = null!;
    public bool IsGroup { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? AvatarUrl { get; set; }

    public ICollection<ChatMember> Members { get; set; } = new List<ChatMember>();
    public ICollection<Message> Messages { get; set; } = new List<Message>();
}
