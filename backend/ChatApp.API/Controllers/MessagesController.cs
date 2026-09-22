using System.Security.Claims;
using ChatApp.Application.DTOs.Message;
using ChatApp.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChatApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class MessagesController : ControllerBase
{
    private readonly IMessageService _messageService;

    public MessagesController(IMessageService messageService)
    {
        _messageService = messageService;
    }

    [HttpPost]
    public async Task<ActionResult<MessageResponse>> SendMessage(
        Guid chatId,
        string content)
    {
        var userId = GetUserId();

        try
        {
            var result = await _messageService.SendMessageAsync(
                userId,
                chatId,
                content);

            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new
            {
                message = ex.Message
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new
            {
                message = ex.Message
            });
        }
    }

    [HttpGet("search")]
    public async Task<ActionResult<List<GlobalMessageSearchResponse>>> SearchMessages([FromQuery] string? q)
    {
        var userId = GetUserId();
        var query = q?.Trim() ?? string.Empty;
        if (query.Length < 2) return Ok(Array.Empty<GlobalMessageSearchResponse>());
        return Ok(await _messageService.SearchMessagesAsync(userId, query));
    }

    [HttpGet("{chatId:guid}")]
    public async Task<ActionResult<List<MessageResponse>>> GetMessages(
        Guid chatId)
    {
        var userId = GetUserId();

        try
        {
            var result = await _messageService.GetChatMessagesAsync(
                userId,
                chatId);

            return Ok(result);
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new
            {
                message = ex.Message
            });
        }
    }

    private Guid GetUserId()
    {
        var userId = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (!Guid.TryParse(userId, out var parsedUserId))
            throw new UnauthorizedAccessException();

        return parsedUserId;
    }
}