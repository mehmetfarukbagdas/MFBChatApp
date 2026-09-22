using ChatApp.Application.DTOs.Auth;
using ChatApp.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ChatApp.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private const string RefreshCookieName = "mfb_refresh_token";
    private readonly IAuthService _authService;
    private readonly IWebHostEnvironment _environment;

    public AuthController(IAuthService authService, IWebHostEnvironment environment)
    {
        _authService = authService;
        _environment = environment;
    }

    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("register")]
    public async Task<ActionResult<AuthResponse>> Register(
        RegisterRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _authService.RegisterAsync(
                request.Username,
                request.Email,
                request.Password);

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { message = ex.Message });
        }
    }

    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("verify-email")]
    public async Task<ActionResult<AuthResponse>> VerifyEmail(
        VerifyEmailRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _authService.VerifyEmailAsync(
            request.Email,
            request.VerificationCode,
            cancellationToken);

        if (result is null)
        {
            return BadRequest(new { message = "Doğrulama kodu hatalı veya süresi dolmuş." });
        }

        var refresh = await _authService.CreateRefreshTokenAsync(
            result.UserId,
            GetIpAddress(),
            Request.Headers.UserAgent.ToString(),
            cancellationToken);

        SetRefreshCookie(refresh.RawRefreshToken);
        return Ok(result);
    }

    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(
        ForgotPasswordRequest request,
        CancellationToken cancellationToken)
    {
        await _authService.RequestPasswordResetAsync(
            request.Email,
            cancellationToken);

        return Ok(new
        {
            message = "Eğer bu e-posta adresi kayıtlıysa, şifre sıfırlama kodu gönderildi."
        });
    }

    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("verify-reset-code")]
    public async Task<IActionResult> VerifyResetCode(
        VerifyPasswordResetCodeRequest request,
        CancellationToken cancellationToken)
    {
        var valid = await _authService.VerifyPasswordResetCodeAsync(
            request.Email,
            request.VerificationCode,
            cancellationToken);

        if (!valid)
        {
            return BadRequest(new
            {
                message = "Şifre sıfırlama kodu hatalı veya süresi dolmuş."
            });
        }

        return Ok(new
        {
            message = "Şifre sıfırlama kodu doğrulandı."
        });
    }

    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(
        ResetPasswordRequest request,
        CancellationToken cancellationToken)
    {
        if (request.NewPassword.Length < 8 || request.NewPassword.Length > 128)
        {
            return BadRequest(new
            {
                message = "Yeni şifre 8 ile 128 karakter arasında olmalıdır."
            });
        }

        var reset = await _authService.ResetPasswordAsync(
            request.Email,
            request.VerificationCode,
            request.NewPassword,
            cancellationToken);

        if (!reset)
        {
            return BadRequest(new
            {
                message = "Şifre sıfırlama kodu hatalı, süresi dolmuş veya yeni şifre mevcut şifrenizle aynı."
            });
        }

        return Ok(new
        {
            message = "Şifreniz başarıyla sıfırlandı. Lütfen yeni şifrenizle giriş yapın."
        });
    }

    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(
        LoginRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _authService.LoginAsync(
                request.Email,
                request.Password);

            if (result is null)
            {
                return Unauthorized(new { message = "Email veya şifre hatalı." });
            }

            var refresh = await _authService.CreateRefreshTokenAsync(
                result.UserId,
                GetIpAddress(),
                Request.Headers.UserAgent.ToString(),
                cancellationToken);

            SetRefreshCookie(refresh.RawRefreshToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("E-posta doğrulama kodu gönderildi", StringComparison.Ordinal))
        {
            return Unauthorized(new
            {
                message = ex.Message,
                requiresEmailVerification = true
            });
        }
    }

    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh(CancellationToken cancellationToken)
    {
        if (!IsTrustedRefreshRequest())
            return Forbid();

        var raw = Request.Cookies[RefreshCookieName];
        if (string.IsNullOrWhiteSpace(raw))
            return Unauthorized(new { message = "Refresh token bulunamadı." });

        var result = await _authService.RotateRefreshTokenAsync(
            raw,
            GetIpAddress(),
            Request.Headers.UserAgent.ToString(),
            cancellationToken);

        if (result is null)
        {
            DeleteRefreshCookie();
            return Unauthorized(new { message = "Oturum süresi dolmuş veya geçersiz." });
        }

        SetRefreshCookie(result.Value.RawRefreshToken);
        return Ok(result.Value.Response);
    }

    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(CancellationToken cancellationToken)
    {
        if (!IsTrustedRefreshRequest())
            return Forbid();

        await _authService.RevokeRefreshTokenAsync(
            Request.Cookies[RefreshCookieName],
            cancellationToken);

        DeleteRefreshCookie();
        return NoContent();
    }

    private void SetRefreshCookie(string rawToken)
    {
        var isProduction = !_environment.IsDevelopment();

        Response.Cookies.Append(RefreshCookieName, rawToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = isProduction,
            SameSite = isProduction ? SameSiteMode.None : SameSiteMode.Lax,
            Path = "/api/Auth",
            MaxAge = TimeSpan.FromDays(30),
            IsEssential = true
        });
    }

    private void DeleteRefreshCookie()
    {
        var isProduction = !_environment.IsDevelopment();

        Response.Cookies.Delete(RefreshCookieName, new CookieOptions
        {
            HttpOnly = true,
            Secure = isProduction,
            SameSite = isProduction ? SameSiteMode.None : SameSiteMode.Lax,
            Path = "/api/Auth",
            IsEssential = true
        });
    }

    private bool IsTrustedRefreshRequest()
        => Request.Headers.TryGetValue("X-Refresh-Request", out var value) &&
           string.Equals(value.ToString(), "1", StringComparison.Ordinal);

    private string? GetIpAddress()
        => HttpContext.Connection.RemoteIpAddress?.ToString();
}
