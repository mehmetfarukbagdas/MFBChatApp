using System.ComponentModel.DataAnnotations;

namespace ChatApp.Application.DTOs.Auth;

public class RegisterRequest
{
    [Required]
    [StringLength(30, MinimumLength = 3)]
    [RegularExpression(@"^[A-Za-z0-9_.-]+$")]
    public string Username { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [StringLength(254)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [StringLength(128, MinimumLength = 8)]
    public string Password { get; set; } = string.Empty;
}