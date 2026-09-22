namespace ChatApp.Application.DTOs.Chat;

public class ChatResponse
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsGroup { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? AvatarUrl { get; set; }
    public Guid? OtherUserId { get; set; }
    public string? OtherUsername { get; set; }
    public string? OtherAvatarUrl { get; set; }
    public DateTime? OtherLastSeenAt { get; set; }
    public bool IsArchived { get; set; }
    public bool IsPinned { get; set; }
    public bool IsMarkedUnread { get; set; }
}
