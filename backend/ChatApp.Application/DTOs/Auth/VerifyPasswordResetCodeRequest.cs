using System.ComponentModel.DataAnnotations;

namespace ChatApp.Application.DTOs.Auth;

public class VerifyPasswordResetCodeRequest
{
    [Required]
    [EmailAddress]
    [StringLength(254)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [RegularExpression(@"^\d{6}$")]
    public string VerificationCode { get; set; } = string.Empty;
}
