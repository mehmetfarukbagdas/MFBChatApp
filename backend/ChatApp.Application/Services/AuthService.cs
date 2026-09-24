using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using ChatApp.Application.DTOs.Auth;
using ChatApp.Application.Interfaces;
using ChatApp.Domain.Entities;
using ChatApp.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace ChatApp.Application.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _configuration;
    private readonly IEmailService _emailService;

    public AuthService(
        AppDbContext context,
        IConfiguration configuration,
        IEmailService emailService)
    {
        _context = context;
        _configuration = configuration;
        _emailService = emailService;
    }

    public async Task<AuthResponse> RegisterAsync(string username, string email, string password)
    {
        username = username.Trim();
        email = email.Trim().ToLowerInvariant();

        var existingByEmail = await _context.Users
            .SingleOrDefaultAsync(u => u.Email.ToLower() == email);

        // Only a genuinely verified account should block re-registration.
        // An unverified "pending" account from a previous attempt (expired
        // code, user never finished verifying, etc.) should not permanently
        // lock the email out — refresh it and send a brand-new code instead.
        if (existingByEmail is not null && existingByEmail.EmailVerified)
            throw new InvalidOperationException("Bu email zaten kayıtlı.");

        var usernameTaken = await _context.Users.AnyAsync(u =>
            u.Username.ToLower() == username.ToLower() &&
            (existingByEmail == null || u.Id != existingByEmail.Id));

        if (usernameTaken)
            throw new InvalidOperationException("Bu kullanıcı adı zaten kullanılıyor.");

        var verificationCode = RandomNumberGenerator
            .GetInt32(100000, 1000000)
            .ToString();

        var verificationCodeHash =
            BCrypt.Net.BCrypt.HashPassword(verificationCode);

        User user;

        if (existingByEmail is not null)
        {
            user = existingByEmail;
            user.Username = username;
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(password);
            user.SecurityStamp = Guid.NewGuid().ToString("N");
            user.EmailVerificationCodeHash = verificationCodeHash;
            user.EmailVerificationCodeExpiresAt = DateTime.UtcNow.AddMinutes(10);
        }
        else
        {
            user = new User
            {
                Username = username,
                Email = email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
                SecurityStamp = Guid.NewGuid().ToString("N"),
                EmailVerificationCodeHash = verificationCodeHash,
                EmailVerificationCodeExpiresAt = DateTime.UtcNow.AddMinutes(10),
                EmailVerified = false
            };

            _context.Users.Add(user);
        }

        await _context.SaveChangesAsync();

        await _emailService.SendVerificationCodeAsync(
            user.Email,
            user.Username,
            verificationCode);

        return CreateAuthResponse(user);
    }

    public async Task<AuthResponse?> LoginAsync(string email, string password)
    {
        email = email.Trim().ToLowerInvariant();

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email);
        if (user is null) return null;

        var passwordValid = BCrypt.Net.BCrypt.Verify(password, user.PasswordHash);
        if (!passwordValid) return null;

        if (!user.EmailVerified)
        {
            var verificationCode = RandomNumberGenerator
                .GetInt32(100000, 1000000)
                .ToString();

            user.EmailVerificationCodeHash =
                BCrypt.Net.BCrypt.HashPassword(verificationCode);
            user.EmailVerificationCodeExpiresAt =
                DateTime.UtcNow.AddMinutes(10);

            await _context.SaveChangesAsync();

            await _emailService.SendVerificationCodeAsync(
                user.Email,
                user.Username,
                verificationCode);

            throw new InvalidOperationException(
                "E-posta doğrulama kodu gönderildi. Lütfen e-posta adresinizi doğrulayın.");
        }

        return CreateAuthResponse(user);
    }

    public async Task<AuthResponse?> VerifyEmailAsync(
        string email,
        string verificationCode,
        CancellationToken cancellationToken = default)
    {
        email = email.Trim().ToLowerInvariant();
        verificationCode = verificationCode.Trim();

        var user = await _context.Users
            .SingleOrDefaultAsync(
                x => x.Email.ToLower() == email,
                cancellationToken);

        if (user is null)
            return null;

        if (user.EmailVerified)
            return CreateAuthResponse(user);

        if (string.IsNullOrWhiteSpace(user.EmailVerificationCodeHash) ||
            user.EmailVerificationCodeExpiresAt is null)
            return null;

        if (user.EmailVerificationCodeExpiresAt <= DateTime.UtcNow)
            return null;

        var codeValid = BCrypt.Net.BCrypt.Verify(
            verificationCode,
            user.EmailVerificationCodeHash);

        if (!codeValid)
            return null;

        user.EmailVerified = true;
        user.EmailVerificationCodeHash = null;
        user.EmailVerificationCodeExpiresAt = null;

        await _context.SaveChangesAsync(cancellationToken);

        return CreateAuthResponse(user);
    }

    public async Task RequestPasswordResetAsync(
        string email,
        CancellationToken cancellationToken = default)
    {
        email = email.Trim().ToLowerInvariant();

        var user = await _context.Users
            .SingleOrDefaultAsync(
                x => x.Email.ToLower() == email,
                cancellationToken);

        if (user is null)
            return;

        var resetCode = RandomNumberGenerator
            .GetInt32(100000, 1000000)
            .ToString();

        user.PasswordResetCodeHash =
            BCrypt.Net.BCrypt.HashPassword(resetCode);
        user.PasswordResetCodeExpiresAt =
            DateTime.UtcNow.AddMinutes(10);

        await _context.SaveChangesAsync(cancellationToken);

        await _emailService.SendPasswordResetCodeAsync(
            user.Email,
            user.Username,
            resetCode);
    }

    public async Task<bool> VerifyPasswordResetCodeAsync(
        string email,
        string verificationCode,
        CancellationToken cancellationToken = default)
    {
        email = email.Trim().ToLowerInvariant();
        verificationCode = verificationCode.Trim();

        var user = await _context.Users
            .SingleOrDefaultAsync(
                x => x.Email.ToLower() == email,
                cancellationToken);

        if (user is null ||
            string.IsNullOrWhiteSpace(user.PasswordResetCodeHash) ||
            user.PasswordResetCodeExpiresAt is null ||
            user.PasswordResetCodeExpiresAt <= DateTime.UtcNow)
        {
            return false;
        }

        return BCrypt.Net.BCrypt.Verify(
            verificationCode,
            user.PasswordResetCodeHash);
    }

    public async Task<bool> ResetPasswordAsync(
        string email,
        string verificationCode,
        string newPassword,
        CancellationToken cancellationToken = default)
    {
        email = email.Trim().ToLowerInvariant();
        verificationCode = verificationCode.Trim();

        if (newPassword.Length < 8 || newPassword.Length > 128)
            return false;

        var user = await _context.Users
            .SingleOrDefaultAsync(
                x => x.Email.ToLower() == email,
                cancellationToken);

        if (user is null ||
            string.IsNullOrWhiteSpace(user.PasswordResetCodeHash) ||
            user.PasswordResetCodeExpiresAt is null ||
            user.PasswordResetCodeExpiresAt <= DateTime.UtcNow)
        {
            return false;
        }

        if (!BCrypt.Net.BCrypt.Verify(
                verificationCode,
                user.PasswordResetCodeHash))
        {
            return false;
        }

        if (BCrypt.Net.BCrypt.Verify(newPassword, user.PasswordHash))
            return false;

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
        user.PasswordResetCodeHash = null;
        user.PasswordResetCodeExpiresAt = null;
        user.SecurityStamp = Guid.NewGuid().ToString("N");

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }

    public async Task<(AuthResponse Response, string RawRefreshToken)> CreateRefreshTokenAsync(
        Guid userId,
        string? ipAddress,
        string? userAgent,
        CancellationToken cancellationToken = default)
    {
        var user = await _context.Users.SingleAsync(x => x.Id == userId, cancellationToken);
        var rawToken = GenerateRefreshToken();
        var entity = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = HashRefreshToken(rawToken),
            SecurityStamp = user.SecurityStamp,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(GetRefreshTokenLifetimeDays()),
            CreatedByIp = Truncate(ipAddress, 64),
            UserAgent = Truncate(userAgent, 512)
        };

        _context.RefreshTokens.Add(entity);

        var cleanupCutoff = DateTime.UtcNow.AddDays(-60);
        await _context.RefreshTokens
            .Where(x => x.UserId == user.Id &&
                        ((x.RevokedAt != null && x.RevokedAt < cleanupCutoff) ||
                         x.ExpiresAt < cleanupCutoff))
            .ExecuteDeleteAsync(cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        return (CreateAuthResponse(user), rawToken);
    }

    public async Task<(AuthResponse Response, string RawRefreshToken)?> RotateRefreshTokenAsync(
        string rawRefreshToken,
        string? ipAddress,
        string? userAgent,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(rawRefreshToken)) return null;

        var hash = HashRefreshToken(rawRefreshToken);
        var current = await _context.RefreshTokens
            .Include(x => x.User)
            .SingleOrDefaultAsync(x => x.TokenHash == hash, cancellationToken);

        if (current is null || current.ExpiresAt <= DateTime.UtcNow)
            return null;

        if (current.RevokedAt is not null)
        {
            if (!string.IsNullOrWhiteSpace(current.ReplacedByTokenHash))
            {
                await _context.RefreshTokens
                    .Where(x => x.UserId == current.UserId && x.RevokedAt == null)
                    .ExecuteUpdateAsync(setters => setters
                        .SetProperty(x => x.RevokedAt, DateTime.UtcNow), cancellationToken);
            }

            return null;
        }

        if (!string.Equals(current.SecurityStamp, current.User.SecurityStamp, StringComparison.Ordinal))
            return null;

        var newRawToken = GenerateRefreshToken();
        var newHash = HashRefreshToken(newRawToken);
        var revokedAt = DateTime.UtcNow;
        var consumed = await _context.RefreshTokens
            .Where(x => x.Id == current.Id && x.RevokedAt == null)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(x => x.RevokedAt, revokedAt)
                .SetProperty(x => x.ReplacedByTokenHash, newHash), cancellationToken);

        if (consumed != 1)
            return null;

        var replacement = new RefreshToken
        {
            UserId = current.UserId,
            TokenHash = newHash,
            SecurityStamp = current.User.SecurityStamp,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(GetRefreshTokenLifetimeDays()),
            CreatedByIp = Truncate(ipAddress, 64),
            UserAgent = Truncate(userAgent, 512)
        };

        _context.RefreshTokens.Add(replacement);
        await _context.SaveChangesAsync(cancellationToken);

        return (CreateAuthResponse(current.User), newRawToken);
    }

    public async Task RevokeRefreshTokenAsync(
        string? rawRefreshToken,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(rawRefreshToken)) return;

        var hash = HashRefreshToken(rawRefreshToken);
        var token = await _context.RefreshTokens
            .SingleOrDefaultAsync(x => x.TokenHash == hash, cancellationToken);

        if (token is null || token.RevokedAt is not null) return;

        token.RevokedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);
    }

    private AuthResponse CreateAuthResponse(User user)
    {
        return new AuthResponse
        {
            Token = GenerateJwtToken(user),
            UserId = user.Id,
            Username = user.Username,
            Email = user.Email
        };
    }

    private string GenerateJwtToken(User user)
    {
        var jwtKey = _configuration["Jwt:Key"]
            ?? throw new InvalidOperationException("JWT Key bulunamadı.");

        var issuer = _configuration["Jwt:Issuer"];
        var audience = _configuration["Jwt:Audience"];
        var lifetimeMinutes = _configuration.GetValue<int?>("Jwt:AccessTokenMinutes") ?? 15;

        var now = DateTime.UtcNow;
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Name, user.Username),
            new(ClaimTypes.Email, user.Email),
            new("security_stamp", user.SecurityStamp)
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            notBefore: now,
            expires: now.AddMinutes(Math.Clamp(lifetimeMinutes, 5, 60)),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private int GetRefreshTokenLifetimeDays()
    {
        var configured = _configuration.GetValue<int?>("Jwt:RefreshTokenDays") ?? 30;
        return Math.Clamp(configured, 1, 90);
    }

    private static string GenerateRefreshToken()
        => Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));

    private static string HashRefreshToken(string token)
        => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    private static string? Truncate(string? value, int maxLength)
        => string.IsNullOrEmpty(value) ? value : value.Length <= maxLength ? value : value[..maxLength];
}