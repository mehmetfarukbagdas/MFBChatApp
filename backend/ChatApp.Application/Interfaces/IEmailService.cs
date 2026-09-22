namespace ChatApp.Application.Interfaces;

public interface IEmailService
{
    Task SendVerificationCodeAsync(
        string email,
        string username,
        string verificationCode);

    Task SendPasswordResetCodeAsync(
        string email,
        string username,
        string resetCode);
}