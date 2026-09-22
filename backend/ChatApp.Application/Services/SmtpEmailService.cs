using System.Net;
using System.Net.Mail;
using ChatApp.Application.Interfaces;
using Microsoft.Extensions.Configuration;

namespace ChatApp.Application.Services;

public class SmtpEmailService : IEmailService
{
    private readonly IConfiguration _configuration;

    public SmtpEmailService(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task SendVerificationCodeAsync(
        string email,
        string username,
        string verificationCode)
    {
        var host = _configuration["Email:SmtpHost"]
            ?? throw new InvalidOperationException("Email SMTP Host bulunamadı.");

        var port = _configuration.GetValue<int>("Email:SmtpPort");

        var usernameConfig = _configuration["Email:Username"]
            ?? throw new InvalidOperationException("Email kullanıcı adı bulunamadı.");

        var password = _configuration["Email:Password"]
            ?? throw new InvalidOperationException("Email şifresi bulunamadı.");

        var fromEmail = _configuration["Email:FromEmail"]
            ?? usernameConfig;

        var fromName = _configuration["Email:FromName"]
            ?? "MFB Chat";

        Console.WriteLine($"SMTP Username: [{usernameConfig}]");
        Console.WriteLine($"From Email: [{fromEmail}]");
        Console.WriteLine($"From Name: [{fromName}]");
        Console.WriteLine($"To Email: [{email}]");

        if (!MailAddress.TryCreate(email, out _))
            throw new InvalidOperationException(
                "Geçerli bir e-posta adresi girilmelidir.");

        using var client = new SmtpClient(host, port)
        {
            EnableSsl = true,
            Credentials = new NetworkCredential(
                usernameConfig,
                password)
        };

        using var message = new MailMessage
        {
            From = new MailAddress(fromEmail, fromName),
            Subject = "MFB Chat doğrulama kodunuz",
            Body = $"""
            <!DOCTYPE html>
            <html lang="tr">
            <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>MFB Chat - Doğrulama Kodu</title>
            </head>
            <body style="margin:0;padding:0;background:#e8f8df;font-family:Arial,Helvetica,sans-serif;color:#183024;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:linear-gradient(135deg,#effbe8 0%,#dff6d8 48%,#c9f0cb 100%);padding:40px 16px;">
            <tr><td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#f8fcf6;border:1px solid #dcebdc;border-radius:24px;overflow:hidden;box-shadow:0 18px 50px rgba(39,91,55,.12);">
            <tr><td style="background:#dff6d8;padding:28px 34px;border-bottom:1px solid #cfe8d0;">
            <div style="font-size:26px;font-weight:700;color:#183024;">MFB Chat</div>
            <div style="margin-top:6px;font-size:14px;color:#5d7568;">Güvenli. Hızlı. Her zaman seninle.</div>
            </td></tr>
            <tr><td style="padding:38px 34px;">
            <div style="font-size:15px;color:#3fbf82;font-weight:600;margin-bottom:10px;">Hesap doğrulama</div>
            <h1 style="margin:0 0 18px;font-size:30px;line-height:1.2;color:#183024;">Hesabınızı Doğrulama Kodunuz</h1>
            <p style="margin:0 0 12px;font-size:16px;line-height:1.7;color:#52685c;">Merhaba {username},</p>
            <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#52685c;">MFB Chat hesabınızı doğrulamak için aşağıdaki kodu kullanabilirsiniz:</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="padding:4px 0 26px;">
            <div style="display:inline-block;min-width:230px;padding:18px 28px;background:#edf9ee;border:1px solid #cfe8d0;border-radius:16px;color:#183024;font-size:34px;font-weight:700;letter-spacing:8px;text-align:center;">{verificationCode}</div>
            </td></tr></table>
            <div style="background:#eef8ed;border:1px solid #d8ebd7;border-radius:14px;padding:18px 20px;margin-bottom:24px;">
            <div style="font-size:15px;line-height:1.6;color:#52685c;"><strong style="color:#183024;">Bu kod 10 dakika boyunca geçerlidir.</strong><br>Bu işlemi siz başlatmadıysanız bu e-postayı dikkate almayabilirsiniz.</div>
            </div>
            <p style="margin:0;font-size:15px;line-height:1.6;color:#5d7568;">Teşekkürler,<br><strong style="color:#183024;">MFB Chat Ekibi</strong></p>
            </td></tr>
            <tr><td style="padding:20px 34px;border-top:1px solid #dcebdc;text-align:center;">
            <div style="font-size:12px;line-height:1.6;color:#718477;">Bu e-posta MFB Chat hesabınızla ilgili önemli bir bilgilendirme içermektedir.<br>© 2026 MFB Chat. Tüm hakları saklıdır.</div>
            </td></tr>
            </table>
            </td></tr>
            </table>
            </body>
            </html>
            """,
            IsBodyHtml = true
        };

        message.ReplyToList.Add(
            new MailAddress(fromEmail, fromName));

        message.To.Add(new MailAddress(email));

        await client.SendMailAsync(message);
    }
    public async Task SendPasswordResetCodeAsync(
        string email,
        string username,
        string resetCode)
    {
        var host = _configuration["Email:SmtpHost"]
            ?? throw new InvalidOperationException("Email SMTP Host bulunamadı.");

        var port = _configuration.GetValue<int>("Email:SmtpPort");

        var usernameConfig = _configuration["Email:Username"]
            ?? throw new InvalidOperationException("Email kullanıcı adı bulunamadı.");

        var password = _configuration["Email:Password"]
            ?? throw new InvalidOperationException("Email şifresi bulunamadı.");

        var fromEmail = _configuration["Email:FromEmail"]
            ?? usernameConfig;

        var fromName = _configuration["Email:FromName"]
            ?? "MFB Chat";

        if (!MailAddress.TryCreate(email, out _))
            throw new InvalidOperationException(
                "Geçerli bir e-posta adresi girilmelidir.");

        using var client = new SmtpClient(host, port)
        {
            EnableSsl = true,
            Credentials = new NetworkCredential(
                usernameConfig,
                password)
        };

        using var message = new MailMessage
        {
            From = new MailAddress(fromEmail, fromName),
            Subject = "MFB Chat şifre sıfırlama kodunuz",
            Body = $"""
            <!DOCTYPE html>
            <html lang="tr">
            <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>MFB Chat - Şifre Sıfırlama Kodu</title>
            </head>
            <body style="margin:0;padding:0;background:#e8f8df;font-family:Arial,Helvetica,sans-serif;color:#183024;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:linear-gradient(135deg,#effbe8 0%,#dff6d8 48%,#c9f0cb 100%);padding:40px 16px;">
            <tr><td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#f8fcf6;border:1px solid #dcebdc;border-radius:24px;overflow:hidden;box-shadow:0 18px 50px rgba(39,91,55,.12);">
            <tr><td style="background:#dff6d8;padding:28px 34px;border-bottom:1px solid #cfe8d0;">
            <div style="font-size:26px;font-weight:700;color:#183024;">MFB Chat</div>
            <div style="margin-top:6px;font-size:14px;color:#5d7568;">Güvenli. Hızlı. Her zaman seninle.</div>
            </td></tr>
            <tr><td style="padding:38px 34px;">
            <div style="font-size:15px;color:#3fbf82;font-weight:600;margin-bottom:10px;">Şifre sıfırlama</div>
            <h1 style="margin:0 0 18px;font-size:30px;line-height:1.2;color:#183024;">Şifre Sıfırlama Kodunuz</h1>
            <p style="margin:0 0 12px;font-size:16px;line-height:1.7;color:#52685c;">Merhaba {username},</p>
            <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#52685c;">MFB Chat hesabınız için şifre sıfırlama talebi alındı. Şifrenizi sıfırlamak için aşağıdaki 6 haneli kodu kullanabilirsiniz:</p>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="padding:4px 0 26px;">
            <div style="display:inline-block;min-width:230px;padding:18px 28px;background:#edf9ee;border:1px solid #cfe8d0;border-radius:16px;color:#183024;font-size:34px;font-weight:700;letter-spacing:8px;text-align:center;">{resetCode}</div>
            </td></tr></table>
            <div style="background:#eef8ed;border:1px solid #d8ebd7;border-radius:14px;padding:18px 20px;margin-bottom:24px;">
            <div style="font-size:15px;line-height:1.6;color:#52685c;"><strong style="color:#183024;">Bu kod 10 dakika boyunca geçerlidir.</strong><br>Bu işlemi siz başlatmadıysanız bu e-postayı dikkate almayabilirsiniz.</div>
            </div>
            <p style="margin:0;font-size:15px;line-height:1.6;color:#5d7568;">Teşekkürler,<br><strong style="color:#183024;">MFB Chat Ekibi</strong></p>
            </td></tr>
            <tr><td style="padding:20px 34px;border-top:1px solid #dcebdc;text-align:center;">
            <div style="font-size:12px;line-height:1.6;color:#718477;">Bu e-posta MFB Chat hesabınızla ilgili önemli bir bilgilendirme içermektedir.<br>© 2026 MFB Chat. Tüm hakları saklıdır.</div>
            </td></tr>
            </table>
            </td></tr>
            </table>
            </body>
            </html>
            """,
            IsBodyHtml = true
        };

        message.ReplyToList.Add(
            new MailAddress(fromEmail, fromName));

        message.To.Add(new MailAddress(email));

        await client.SendMailAsync(message);
    }

}