namespace ChatApp.Application.DTOs.Chat;

public class ChatMemberResponse
{
    public Guid UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public DateTime JoinedAt { get; set; }
    public bool IsOwner { get; set; }
    public bool IsAdmin { get; set; }
    public string Role { get; set; } = "Member";
}
