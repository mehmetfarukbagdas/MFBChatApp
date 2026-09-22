namespace ChatApp.Domain.Entities;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Username { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string PasswordHash { get; set; } = null!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastSeenAt { get; set; }
    public string? AvatarUrl { get; set; }
    public string? DisplayName { get; set; }
    public string? Bio { get; set; }
    public bool ShowOnlineStatus { get; set; } = false;
    public bool ShowLastSeen { get; set; } = false;
    public bool ReadReceipts { get; set; } = false;
    public string ProfilePhotoVisibility { get; set; } = "Everyone";
    public string BioVisibility { get; set; } = "Everyone";
    public string? StatusText { get; set; }
    public string? StatusEmoji { get; set; }
    public DateTime? StatusExpiresAt { get; set; }
    
    public bool EmailVerified { get; set; } = false;
    public string? EmailVerificationCodeHash { get; set; }
    public DateTime? EmailVerificationCodeExpiresAt { get; set; }

    public string? PasswordResetCodeHash { get; set; }
    public DateTime? PasswordResetCodeExpiresAt { get; set; }

    public string SecurityStamp { get; set; } = Guid.NewGuid().ToString("N");

    public ICollection<ChatMember> ChatMembers { get; set; } = new List<ChatMember>();
    public ICollection<Message> Messages { get; set; } = new List<Message>();
    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
}
