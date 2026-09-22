using ChatApp.Application.DTOs.Auth;

namespace ChatApp.Application.Interfaces;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(
        string username,
        string email,
        string password);

    Task<AuthResponse?> LoginAsync(
        string email,
        string password);

    Task RequestPasswordResetAsync(
        string email,
        CancellationToken cancellationToken = default);

    Task<bool> VerifyPasswordResetCodeAsync(
        string email,
        string verificationCode,
        CancellationToken cancellationToken = default);

    Task<bool> ResetPasswordAsync(
        string email,
        string verificationCode,
        string newPassword,
        CancellationToken cancellationToken = default);

    Task<AuthResponse?> VerifyEmailAsync(
        string email,
        string verificationCode,
        CancellationToken cancellationToken = default);

    Task<(AuthResponse Response, string RawRefreshToken)> CreateRefreshTokenAsync(
        Guid userId,
        string? ipAddress,
        string? userAgent,
        CancellationToken cancellationToken = default);

    Task<(AuthResponse Response, string RawRefreshToken)?> RotateRefreshTokenAsync(
        string rawRefreshToken,
        string? ipAddress,
        string? userAgent,
        CancellationToken cancellationToken = default);

    Task RevokeRefreshTokenAsync(
        string? rawRefreshToken,
        CancellationToken cancellationToken = default);
}
