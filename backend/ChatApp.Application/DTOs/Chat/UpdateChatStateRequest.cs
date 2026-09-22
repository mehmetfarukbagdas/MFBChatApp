namespace ChatApp.Application.DTOs.Chat;

public class UpdateChatStateRequest
{
    public bool? Archived { get; set; }
    public bool? Pinned { get; set; }
    public bool? MarkedUnread { get; set; }
    public bool ClearMessages { get; set; }
    public bool DeleteChat { get; set; }
}
