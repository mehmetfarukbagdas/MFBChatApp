namespace ChatApp.Application.DTOs.Message;

public class GlobalMessageSearchResponse
{
    public Guid Id { get; set; }
    public Guid ChatId { get; set; }
    public string ChatName { get; set; } = string.Empty;
    public bool IsGroup { get; set; }
    public Guid SenderId { get; set; }
    public string SenderUsername { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime SentAt { get; set; }
}
