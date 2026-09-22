using System.ComponentModel.DataAnnotations;

namespace ChatApp.Application.DTOs.Auth;

public class ResetPasswordRequest
{
    [Required]
    [EmailAddress]
    [StringLength(254)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [RegularExpression(@"^\d{6}$")]
    public string VerificationCode { get; set; } = string.Empty;

    [Required]
    [StringLength(128, MinimumLength = 8)]
    public string NewPassword { get; set; } = string.Empty;
}
