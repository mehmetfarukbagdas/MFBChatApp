using System.Security.Claims;
using ChatApp.Domain.Entities;
using ChatApp.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace ChatApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PushController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;

    public PushController(AppDbContext context, IConfiguration configuration)
    {
        _context = context;
        _configuration = configuration;
    }

    [AllowAnonymous]
    [HttpGet("public-key")]
    public IActionResult GetPublicKey()
    {
        var publicKey = _configuration["WebPush:PublicKey"];
        if (string.IsNullOrWhiteSpace(publicKey))
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { message = "Web Push yapılandırılmamış." });

        return Ok(new { publicKey });
    }

    [Authorize]
    [HttpPost("subscriptions")]
    public async Task<IActionResult> Subscribe([FromBody] PushSubscriptionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Endpoint) ||
            string.IsNullOrWhiteSpace(request.P256dh) ||
            string.IsNullOrWhiteSpace(request.Auth))
        {
            return BadRequest(new { message = "Push subscription bilgileri eksik." });
        }

        if (request.Endpoint.Length > 2048 || request.P256dh.Length > 512 || request.Auth.Length > 512)
            return BadRequest(new { message = "Push subscription bilgileri geçersiz." });

        var userId = GetUserId();

        var existing = await _context.PushSubscriptions
            .FirstOrDefaultAsync(x => x.Endpoint == request.Endpoint);

        if (existing is null)
        {
            _context.PushSubscriptions.Add(new PushSubscription
            {
                UserId = userId,
                Endpoint = request.Endpoint,
                P256dh = request.P256dh,
                Auth = request.Auth,
                CreatedAt = DateTime.UtcNow,
                LastUsedAt = DateTime.UtcNow
            });
        }
        else
        {
            existing.UserId = userId;
            existing.P256dh = request.P256dh;
            existing.Auth = request.Auth;
            existing.LastUsedAt = DateTime.UtcNow;
        }

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (
            ex.InnerException is PostgresException pg &&
            pg.SqlState == PostgresErrorCodes.UniqueViolation)
        {
           
            var pending = _context.ChangeTracker
                .Entries<PushSubscription>()
                .FirstOrDefault(e =>
                    e.Entity.Endpoint == request.Endpoint &&
                    e.State == EntityState.Added);

            if (pending is not null)
                pending.State = EntityState.Detached;

            var concurrentExisting = await _context.PushSubscriptions
                .FirstOrDefaultAsync(x => x.Endpoint == request.Endpoint);

            if (concurrentExisting is null)
                throw;

            concurrentExisting.UserId = userId;
            concurrentExisting.P256dh = request.P256dh;
            concurrentExisting.Auth = request.Auth;
            concurrentExisting.LastUsedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }

        return NoContent();
    }

    [Authorize]
    [HttpDelete("subscriptions")]
    public async Task<IActionResult> Unsubscribe([FromBody] PushSubscriptionRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Endpoint))
            return BadRequest(new { message = "Endpoint gerekli." });

        var userId = GetUserId();
        var subscription = await _context.PushSubscriptions
            .FirstOrDefaultAsync(x => x.UserId == userId && x.Endpoint == request.Endpoint);

        if (subscription is not null)
        {
            _context.PushSubscriptions.Remove(subscription);
            await _context.SaveChangesAsync();
        }

        return NoContent();
    }

    private Guid GetUserId()
    {
        var value = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!Guid.TryParse(value, out var userId))
            throw new UnauthorizedAccessException("Geçersiz kullanıcı.");
        return userId;
    }

    public sealed record PushSubscriptionRequest(
        string Endpoint,
        string P256dh,
        string Auth);
}
