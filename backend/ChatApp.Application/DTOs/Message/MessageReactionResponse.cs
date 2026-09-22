namespace ChatApp.Application.DTOs.Message;

public class MessageReactionResponse
{
    public string Emoji { get; set; } = string.Empty;
    public int Count { get; set; }
    public bool ReactedByMe { get; set; }
}
