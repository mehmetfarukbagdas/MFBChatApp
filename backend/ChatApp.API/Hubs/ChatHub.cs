using System.Collections.Concurrent;
using System.Security.Claims;
using ChatApp.Domain.Entities;
using ChatApp.API.Services;
using ChatApp.Infrastructure.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;

namespace ChatApp.API.Hubs;

[Authorize]
public class ChatHub : Hub
{
    private readonly AppDbContext _context;
    private readonly IWebHostEnvironment _environment;
    private readonly IWebPushNotificationService _webPushNotificationService;

    private static readonly ConcurrentDictionary<Guid, ConcurrentDictionary<string, Guid>>
        ChatConnections = new();

    private static readonly ConcurrentDictionary<string, ConcurrentDictionary<Guid, byte>>
        ConnectionChats = new();

    public ChatHub(
        AppDbContext context,
        IWebHostEnvironment environment,
        IWebPushNotificationService webPushNotificationService)
    {
        _context = context;
        _environment = environment;
        _webPushNotificationService = webPushNotificationService;
    }

    public async Task JoinChat(Guid chatId)
    {
        var userId = GetUserId();

        var isMember = await _context.ChatMembers
            .AnyAsync(x => x.ChatId == chatId && x.UserId == userId);

        if (!isMember)
            throw new HubException("Bu sohbete erişiminiz yok.");

        await Groups.AddToGroupAsync(Context.ConnectionId, $"chat-{chatId}");

        var currentUser = await _context.Users.FirstAsync(x => x.Id == userId);
        currentUser.LastSeenAt = null;
        await _context.SaveChangesAsync();

        var connections = ChatConnections.GetOrAdd(
            chatId,
            _ => new ConcurrentDictionary<string, Guid>());
        connections[Context.ConnectionId] = userId;

        var chats = ConnectionChats.GetOrAdd(
            Context.ConnectionId,
            _ => new ConcurrentDictionary<Guid, byte>());
        chats[chatId] = 0;

        var onlineUserIds = connections.Values.Distinct().ToList();
        var onlineUsers = await _context.Users
            .Where(x => onlineUserIds.Contains(x.Id) && x.ShowOnlineStatus)
            .Select(x => new { x.Id, x.Username })
            .ToListAsync();

        await Clients.Caller.SendAsync("OnlineUsers", new
        {
            chatId,
            users = onlineUsers.Select(x => new
            {
                userId = x.Id,
                username = x.Username
            }).ToList()
        });

        if (currentUser.ShowOnlineStatus)
        {
            await Clients.GroupExcept($"chat-{chatId}", Context.ConnectionId)
                .SendAsync("UserOnline", new
                {
                    chatId,
                    userId,
                    username = currentUser.Username,
                    lastSeenAt = (DateTime?)null
                });
        }
    }

    public async Task StartTyping(Guid chatId)
    {
        var userId = GetUserId();
        await EnsureMember(chatId, userId);

        var username = await GetUsername(userId);

        await Clients.GroupExcept($"chat-{chatId}", Context.ConnectionId)
            .SendAsync("UserTyping", new { chatId, userId, username });
    }

    public async Task StopTyping(Guid chatId)
    {
        var userId = GetUserId();
        await EnsureMember(chatId, userId);

        var username = await GetUsername(userId);

        await Clients.GroupExcept($"chat-{chatId}", Context.ConnectionId)
            .SendAsync("UserStoppedTyping", new { chatId, userId, username });
    }

    public async Task SendMessage(
        Guid chatId,
        string content,
        string? attachmentUrl = null,
        string? attachmentFileName = null,
        string? attachmentContentType = null,
        long? attachmentSize = null,
        Guid? replyToMessageId = null)
    {
        var userId = GetUserId();
        await EnsureMember(chatId, userId);

        if (content is null)
            content = string.Empty;

        if (content.Length > 4000)
            throw new HubException("Mesaj 4000 karakterden uzun olamaz.");

        if (attachmentUrl is not null)
        {
            if (string.IsNullOrWhiteSpace(attachmentFileName) ||
                string.IsNullOrWhiteSpace(attachmentContentType) ||
                attachmentSize is null)
            {
                throw new HubException("Ek dosya bilgileri eksik.");
            }

            if (attachmentSize < 0 || attachmentSize > 10 * 1024 * 1024)
                throw new HubException("Ek dosya boyutu geçersiz.");

            if (!attachmentUrl.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase))
                throw new HubException("Geçersiz ek dosya yolu.");
        }

        if (string.IsNullOrWhiteSpace(content) && attachmentUrl is null)
            throw new HubException("Mesaj veya dosya gerekli.");

        if (replyToMessageId.HasValue)
        {
            var replyExists = await _context.Messages.AnyAsync(x => x.Id == replyToMessageId.Value && x.ChatId == chatId);
            if (!replyExists) throw new HubException("Yanıtlanan mesaj bulunamadı.");
        }

        var message = new Message
        {
            ChatId = chatId,
            SenderId = userId,
            Content = content?.Trim() ?? string.Empty,
            SentAt = DateTime.UtcNow,
            AttachmentUrl = attachmentUrl,
            AttachmentFileName = attachmentFileName,
            AttachmentContentType = attachmentContentType,
            AttachmentSize = attachmentSize,
            ReplyToMessageId = replyToMessageId
        };

        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        var username = await GetUsername(userId);
        var reply = replyToMessageId.HasValue
            ? await _context.Messages.Include(x => x.Sender).FirstOrDefaultAsync(x => x.Id == replyToMessageId.Value)
            : null;

        await Clients.Group($"chat-{chatId}")
            .SendAsync("ReceiveMessage", new
            {
                id = message.Id,
                chatId = message.ChatId,
                senderId = message.SenderId,
                senderUsername = username,
                content = message.Content,
                sentAt = message.SentAt,
                isRead = false,
                attachmentUrl = message.AttachmentUrl,
                attachmentFileName = message.AttachmentFileName,
                attachmentContentType = message.AttachmentContentType,
                attachmentSize = message.AttachmentSize,
                replyToMessageId = message.ReplyToMessageId,
                replyToSenderUsername = reply?.Sender.Username,
                replyToContent = reply?.Content,
                reactions = Array.Empty<object>(),
                isPinned = message.IsPinned,
                pinnedAt = message.PinnedAt,
                pinnedByUserId = message.PinnedByUserId
            });

        await Clients.GroupExcept($"chat-{chatId}", Context.ConnectionId)
            .SendAsync("UnreadCountChanged", new
            {
                chatId,
                increment = 1
            });

        var recipientIds = await _context.ChatMembers
            .Where(x => x.ChatId == chatId && x.UserId != userId)
            .Select(x => x.UserId)
            .Distinct()
            .ToListAsync();

        var notificationBody = string.IsNullOrWhiteSpace(message.Content)
            ? (message.AttachmentContentType?.StartsWith("audio/", StringComparison.OrdinalIgnoreCase) == true
                ? "🎙️ Sesli mesaj"
                : "📎 Ek gönderildi")
            : message.Content.Length > 140
                ? message.Content[..140] + "…"
                : message.Content;

        foreach (var recipientId in recipientIds)
        {
            await _webPushNotificationService.SendToUserAsync(
                recipientId,
                username,
                notificationBody,
                chatId);
        }
    }

    public async Task EditMessage(
        Guid chatId,
        Guid messageId,
        string content)
    {
        var userId = GetUserId();
        await EnsureMember(chatId, userId);

        if (string.IsNullOrWhiteSpace(content))
            throw new HubException("Mesaj boş olamaz.");

        content = content.Trim();

        if (content.Length > 4000)
            throw new HubException("Mesaj 4000 karakterden uzun olamaz.");

        var message = await _context.Messages
            .FirstOrDefaultAsync(x =>
                x.Id == messageId &&
                x.ChatId == chatId);

        if (message is null)
            throw new HubException("Mesaj bulunamadı.");

        if (message.SenderId != userId)
            throw new HubException("Sadece kendi mesajınızı düzenleyebilirsiniz.");

        message.Content = content;
        message.EditedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var username = await GetUsername(userId);

        await Clients.Group($"chat-{chatId}")
            .SendAsync("MessageUpdated", new
            {
                id = message.Id,
                chatId = message.ChatId,
                senderId = message.SenderId,
                senderUsername = username,
                content = message.Content,
                sentAt = message.SentAt,
                editedAt = message.EditedAt,
                attachmentUrl = message.AttachmentUrl,
                attachmentFileName = message.AttachmentFileName,
                attachmentContentType = message.AttachmentContentType,
                attachmentSize = message.AttachmentSize
            });
    }

    public async Task DeleteMessageForMe(
        Guid chatId,
        Guid messageId)
    {
        var userId = GetUserId();
        await EnsureMember(chatId, userId);

        var messageExists = await _context.Messages
            .AnyAsync(x => x.Id == messageId && x.ChatId == chatId);

        if (!messageExists)
            throw new HubException("Mesaj bulunamadı.");

        var alreadyHidden = await _context.MessageHiddenForUsers
            .AnyAsync(x => x.MessageId == messageId && x.UserId == userId);

        if (!alreadyHidden)
        {
            _context.MessageHiddenForUsers.Add(new MessageHiddenForUser
            {
                MessageId = messageId,
                UserId = userId,
                HiddenAt = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();
        }

        await Clients.Caller.SendAsync("MessageHidden", new
        {
            chatId,
            messageId
        });
    }

    public async Task DeleteMessage(
        Guid chatId,
        Guid messageId)
    {
        var userId = GetUserId();
        await EnsureMember(chatId, userId);

        var message = await _context.Messages
            .FirstOrDefaultAsync(x =>
                x.Id == messageId &&
                x.ChatId == chatId);

        if (message is null)
            throw new HubException("Mesaj bulunamadı.");

        if (message.SenderId != userId)
            throw new HubException("Sadece kendi mesajınızı silebilirsiniz.");

        var attachmentUrl = message.AttachmentUrl;

        _context.Messages.Remove(message);
        await _context.SaveChangesAsync();

        if (!string.IsNullOrWhiteSpace(attachmentUrl) &&
            attachmentUrl.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase))
        {
            var storedFileName = Path.GetFileName(attachmentUrl);
            var uploadsPath = Path.Combine(
                _environment.WebRootPath ??
                    Path.Combine(_environment.ContentRootPath, "wwwroot"),
                "uploads");

            var filePath = Path.Combine(uploadsPath, storedFileName);

            if (System.IO.File.Exists(filePath))
            {
                try
                {
                    System.IO.File.Delete(filePath);
                }
                catch
                {
                    
                }
            }
        }

        await Clients.Group($"chat-{chatId}")
            .SendAsync("MessageDeleted", new
            {
                chatId,
                messageId
            });
    }

    public async Task ToggleReaction(Guid chatId, Guid messageId, string emoji)
    {
        var userId = GetUserId();
        await EnsureMember(chatId, userId);
        emoji = (emoji ?? string.Empty).Trim();
        if (emoji.Length == 0 || emoji.Length > 16) throw new HubException("Geçerli bir emoji seçin.");

        var message = await _context.Messages.FirstOrDefaultAsync(x => x.Id == messageId && x.ChatId == chatId);
        if (message is null) throw new HubException("Mesaj bulunamadı.");

        var existing = await _context.MessageReactions.FirstOrDefaultAsync(x => x.MessageId == messageId && x.UserId == userId);
        if (existing is not null)
        {
            if (existing.Emoji == emoji) _context.MessageReactions.Remove(existing);
            else existing.Emoji = emoji;
        }
        else _context.MessageReactions.Add(new MessageReaction { MessageId = messageId, UserId = userId, Emoji = emoji });

        await _context.SaveChangesAsync();
        var reactions = await _context.MessageReactions.Where(x => x.MessageId == messageId).GroupBy(x => x.Emoji)
            .Select(g => new { emoji = g.Key, count = g.Count(), reactedByMe = g.Any(x => x.UserId == userId) }).ToListAsync();

        await Clients.Group($"chat-{chatId}").SendAsync("MessageReactionUpdated", new { chatId, messageId, reactions });
    }

    public async Task PinMessage(Guid chatId, Guid messageId)
    {
        var userId = GetUserId();
        await EnsureMember(chatId, userId);
        var message = await _context.Messages.FirstOrDefaultAsync(x => x.Id == messageId && x.ChatId == chatId);
        if (message is null) throw new HubException("Mesaj bulunamadı.");
        message.IsPinned = true; message.PinnedAt = DateTime.UtcNow; message.PinnedByUserId = userId;
        await _context.SaveChangesAsync();
        await Clients.Group($"chat-{chatId}").SendAsync("MessagePinUpdated", new { chatId, messageId, isPinned = true, pinnedAt = message.PinnedAt, pinnedByUserId = userId });
    }

    public async Task UnpinMessage(Guid chatId, Guid messageId)
    {
        var userId = GetUserId();
        await EnsureMember(chatId, userId);
        var message = await _context.Messages.FirstOrDefaultAsync(x => x.Id == messageId && x.ChatId == chatId);
        if (message is null) throw new HubException("Mesaj bulunamadı.");
        message.IsPinned = false; message.PinnedAt = null; message.PinnedByUserId = null;
        await _context.SaveChangesAsync();
        await Clients.Group($"chat-{chatId}").SendAsync("MessagePinUpdated", new { chatId, messageId, isPinned = false, pinnedAt = (DateTime?)null, pinnedByUserId = (Guid?)null });
    }

    public async Task ForwardMessage(Guid sourceChatId, Guid messageId, Guid targetChatId)
    {
        var userId = GetUserId();
        await EnsureMember(sourceChatId, userId);
        await EnsureMember(targetChatId, userId);
        var source = await _context.Messages.FirstOrDefaultAsync(x => x.Id == messageId && x.ChatId == sourceChatId);
        if (source is null) throw new HubException("Mesaj bulunamadı.");
        var forwardedAttachmentUrl = source.AttachmentUrl;
        if (!string.IsNullOrWhiteSpace(source.AttachmentUrl) && source.AttachmentUrl.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase))
        {
            var originalName = Path.GetFileName(source.AttachmentUrl);
            var uploadsPath = Path.Combine(_environment.WebRootPath ?? Path.Combine(_environment.ContentRootPath, "wwwroot"), "uploads");
            var originalPath = Path.Combine(uploadsPath, originalName);
            if (System.IO.File.Exists(originalPath))
            {
                var extension = Path.GetExtension(originalName);
                var newName = $"{Guid.NewGuid():N}{extension}";
                var newPath = Path.Combine(uploadsPath, newName);
                System.IO.File.Copy(originalPath, newPath, overwrite: false);
                forwardedAttachmentUrl = $"/uploads/{newName}";
            }
        }

        var forwarded = new Message { ChatId = targetChatId, SenderId = userId, Content = source.Content, SentAt = DateTime.UtcNow, AttachmentUrl = forwardedAttachmentUrl, AttachmentFileName = source.AttachmentFileName, AttachmentContentType = source.AttachmentContentType, AttachmentSize = source.AttachmentSize };
        _context.Messages.Add(forwarded);
        await _context.SaveChangesAsync();
        var username = await GetUsername(userId);
        await Clients.Group($"chat-{targetChatId}").SendAsync("ReceiveMessage", new { id = forwarded.Id, chatId = targetChatId, senderId = userId, senderUsername = username, content = forwarded.Content, sentAt = forwarded.SentAt, isRead = false, attachmentUrl = forwarded.AttachmentUrl, attachmentFileName = forwarded.AttachmentFileName, attachmentContentType = forwarded.AttachmentContentType, attachmentSize = forwarded.AttachmentSize, replyToMessageId = (Guid?)null, replyToSenderUsername = (string?)null, replyToContent = (string?)null, reactions = Array.Empty<object>(), isPinned = false });
        await Clients.GroupExcept($"chat-{targetChatId}", Context.ConnectionId).SendAsync("UnreadCountChanged", new { chatId = targetChatId, increment = 1 });
    }

    public async Task<Dictionary<Guid, int>> GetUnreadCounts()
    {
        var userId = GetUserId();

        var memberships = await _context.ChatMembers
            .Where(x => x.UserId == userId && x.DeletedAt == null)
            .Select(x => new { x.ChatId, x.ClearedAt, x.IsMarkedUnread })
            .ToListAsync();
        var chatIds = memberships.Select(x => x.ChatId).ToList();

        var counts = await _context.Messages
            .Where(x => chatIds.Contains(x.ChatId) && x.SenderId != userId)
            .Where(x => !_context.MessageReads.Any(r => r.MessageId == x.Id && r.UserId == userId))
            .GroupBy(x => x.ChatId)
            .Select(g => new { ChatId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ChatId, x => x.Count);

        foreach (var membership in memberships)
        {
            if (membership.IsMarkedUnread)
                counts[membership.ChatId] = Math.Max(1, counts.GetValueOrDefault(membership.ChatId));
            else if (!counts.ContainsKey(membership.ChatId))
                counts[membership.ChatId] = 0;
        }

        return counts;
    }

    public async Task<List<Guid>> GetReadMessageIds(Guid chatId)
    {
        var userId = GetUserId();
        await EnsureMember(chatId, userId);

        return await _context.MessageReads
            .Where(x =>
                x.Message.ChatId == chatId &&
                x.Message.SenderId == userId &&
                x.UserId != userId &&
                x.ReceiptVisible)
            .Select(x => x.MessageId)
            .Distinct()
            .ToListAsync();
    }

    public async Task MarkMessagesAsRead(Guid chatId, List<Guid> messageIds)
    {
        var userId = GetUserId();
        await EnsureMember(chatId, userId);

        if (messageIds is null || messageIds.Count == 0)
            return;

        var validIds = await _context.Messages
            .Where(x =>
                x.ChatId == chatId &&
                messageIds.Contains(x.Id) &&
                x.SenderId != userId)
            .Select(x => x.Id)
            .ToListAsync();

        if (validIds.Count == 0)
            return;

        var existing = await _context.MessageReads
            .Where(x => x.UserId == userId && validIds.Contains(x.MessageId))
            .Select(x => x.MessageId)
            .ToListAsync();

        var newIds = validIds.Except(existing).ToList();
        if (newIds.Count == 0)
            return;

        var reader = await _context.Users
            .Where(x => x.Id == userId)
            .Select(x => new { x.ReadReceipts })
            .FirstAsync();

        foreach (var messageId in newIds)
        {
            _context.MessageReads.Add(new MessageRead
            {
                MessageId = messageId,
                UserId = userId,
                ReadAt = DateTime.UtcNow,
                ReceiptVisible = reader.ReadReceipts
            });
        }

        await _context.SaveChangesAsync();

        if (reader.ReadReceipts)
        {
            await Clients.Group($"chat-{chatId}")
                .SendAsync("MessagesRead", new
                {
                    chatId,
                    userId,
                    messageIds = newIds,
                    readAt = DateTime.UtcNow
                });
        }

        await Clients.Caller.SendAsync("UnreadCountChanged", new
        {
            chatId,
            count = 0
        });
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        if (ConnectionChats.TryRemove(Context.ConnectionId, out var chats))
        {
            var userId = GetUserIdSafely();

            foreach (var chatId in chats.Keys)
            {
                if (!ChatConnections.TryGetValue(chatId, out var connections))
                    continue;

                connections.TryRemove(Context.ConnectionId, out _);

                var stillOnline = userId.HasValue && connections.Values.Contains(userId.Value);

                if (!stillOnline && userId.HasValue)
                {
                    var lastSeenAt = DateTime.UtcNow;
                    var user = await _context.Users.FirstOrDefaultAsync(x => x.Id == userId.Value);

                    if (user is not null)
                    {
                        user.LastSeenAt = lastSeenAt;
                        await _context.SaveChangesAsync();

                        if (user.ShowOnlineStatus)
                        {
                            await Clients.Group($"chat-{chatId}")
                                .SendAsync("UserOffline", new
                                {
                                    chatId,
                                    userId = user.Id,
                                    lastSeenAt = user.ShowLastSeen ? lastSeenAt : (DateTime?)null
                                });
                        }
                    }
                }

                if (connections.IsEmpty)
                    ChatConnections.TryRemove(chatId, out _);
            }
        }

        await base.OnDisconnectedAsync(exception);
    }

    private async Task EnsureMember(Guid chatId, Guid userId)
    {
        var isMember = await _context.ChatMembers
            .AnyAsync(x => x.ChatId == chatId && x.UserId == userId);

        if (!isMember)
            throw new HubException("Bu sohbete erişiminiz yok.");
    }

    private async Task<string> GetUsername(Guid userId)
    {
        return await _context.Users
            .Where(x => x.Id == userId)
            .Select(x => x.Username)
            .FirstAsync();
    }

    private Guid GetUserId()
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);

        if (!Guid.TryParse(userId, out var parsedUserId))
            throw new HubException("Kullanıcı doğrulanamadı.");

        return parsedUserId;
    }

    private Guid? GetUserIdSafely()
    {
        var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);

        return Guid.TryParse(userId, out var parsedUserId)
            ? parsedUserId
            : null;
    }
}
