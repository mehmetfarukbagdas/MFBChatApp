using System;
using System.Threading;
using System.Threading.Tasks;

namespace ChatApp.API.Services;

public interface IWebPushNotificationService
{
    Task SendToUserAsync(
        Guid userId,
        string title,
        string body,
        Guid? chatId = null,
        CancellationToken cancellationToken = default);
}
