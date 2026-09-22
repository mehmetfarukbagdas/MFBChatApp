using System.Security.Claims;
using ChatApp.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace ChatApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    public AdminController(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    [HttpGet("me")]
    public async Task<IActionResult> GetAdminStatus()
    {
        return Ok(new { isAdmin = await IsAdminAsync() });
    }

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        if (!await IsAdminAsync())
            return Forbid();

        var users = await _context.Users
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new
            {
                id = x.Id,
                username = x.Username,
                email = x.Email,
                displayName = x.DisplayName,
                avatarUrl = x.AvatarUrl,
                createdAt = x.CreatedAt,
                lastSeenAt = x.LastSeenAt,
                chatCount = x.ChatMembers.Count,
                messageCount = x.Messages.Count,
                pushSubscriptionCount = _context.PushSubscriptions.Count(p => p.UserId == x.Id)
            })
            .ToListAsync();

        return Ok(users);
    }

    [HttpDelete("users/{userId:guid}")]
    public async Task<IActionResult> DeleteUser(Guid userId)
    {
        if (!await IsAdminAsync())
            return Forbid();

        var currentUserId = GetUserId();
        if (currentUserId == userId)
            return BadRequest(new { message = "Kendi yönetici hesabınızı bu panelden silemezsiniz." });

        var user = await _context.Users.FirstOrDefaultAsync(x => x.Id == userId);
        if (user is null)
            return NotFound(new { message = "Kullanıcı bulunamadı." });

        await using var transaction = await _context.Database.BeginTransactionAsync();

        await _context.MessageReactions
            .Where(x => x.UserId == userId)
            .ExecuteDeleteAsync();

        await _context.MessageReads
            .Where(x => x.UserId == userId)
            .ExecuteDeleteAsync();

        await _context.MessageHiddenForUsers
            .Where(x => x.UserId == userId)
            .ExecuteDeleteAsync();

        await _context.ChatMutes
            .Where(x => x.UserId == userId)
            .ExecuteDeleteAsync();

        await _context.PushSubscriptions
            .Where(x => x.UserId == userId)
            .ExecuteDeleteAsync();

        await _context.Messages
            .Where(x => x.SenderId == userId)
            .ExecuteDeleteAsync();

        await _context.ChatMembers
            .Where(x => x.UserId == userId)
            .ExecuteDeleteAsync();

        await _context.Users
            .Where(x => x.Id == userId)
            .ExecuteDeleteAsync();

        await transaction.CommitAsync();

        return NoContent();
    }

    private async Task<bool> IsAdminAsync()
    {
        var userId = GetUserId();
        var email = await _context.Users
            .AsNoTracking()
            .Where(x => x.Id == userId)
            .Select(x => x.Email)
            .SingleOrDefaultAsync();

        if (string.IsNullOrWhiteSpace(email))
            return false;

        var configuredAdmins = _configuration["Admin:Emails"]?
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            ?? Array.Empty<string>();

        return configuredAdmins.Any(x =>
            string.Equals(x, email, StringComparison.OrdinalIgnoreCase));
    }

    private Guid GetUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(value, out var userId))
            throw new UnauthorizedAccessException("Geçersiz kullanıcı.");
        return userId;
    }
}
