using ChatApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace ChatApp.Infrastructure.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Chat> Chats => Set<Chat>();
    public DbSet<ChatMember> ChatMembers => Set<ChatMember>();
    public DbSet<Message> Messages => Set<Message>();
    public DbSet<MessageRead> MessageReads => Set<MessageRead>();
    public DbSet<MessageReaction> MessageReactions => Set<MessageReaction>();
    public DbSet<MessageHiddenForUser> MessageHiddenForUsers => Set<MessageHiddenForUser>();
    public DbSet<ChatMute> ChatMutes => Set<ChatMute>();
    public DbSet<PushSubscription> PushSubscriptions => Set<PushSubscription>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ChatMember>().HasKey(x => new { x.ChatId, x.UserId });
        modelBuilder.Entity<ChatMember>()
            .HasOne(x => x.Chat)
            .WithMany(x => x.Members)
            .HasForeignKey(x => x.ChatId);
        modelBuilder.Entity<ChatMember>()
            .HasOne(x => x.User)
            .WithMany(x => x.ChatMembers)
            .HasForeignKey(x => x.UserId);

        modelBuilder.Entity<Message>().HasIndex(x => new { x.ChatId, x.SentAt });
        modelBuilder.Entity<Message>()
            .HasOne(x => x.Chat)
            .WithMany(x => x.Messages)
            .HasForeignKey(x => x.ChatId);
        modelBuilder.Entity<Message>()
            .HasOne(x => x.Sender)
            .WithMany(x => x.Messages)
            .HasForeignKey(x => x.SenderId);

        modelBuilder.Entity<Message>()
            .HasOne(x => x.ReplyToMessage)
            .WithMany()
            .HasForeignKey(x => x.ReplyToMessageId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<MessageReaction>().HasKey(x => new { x.MessageId, x.UserId });
        modelBuilder.Entity<MessageReaction>()
            .HasOne(x => x.Message)
            .WithMany(x => x.Reactions)
            .HasForeignKey(x => x.MessageId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<MessageReaction>()
            .HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<MessageReaction>().HasIndex(x => new { x.MessageId, x.Emoji });

        modelBuilder.Entity<MessageRead>().HasKey(x => new { x.MessageId, x.UserId });
        modelBuilder.Entity<MessageRead>()
            .HasOne(x => x.Message)
            .WithMany()
            .HasForeignKey(x => x.MessageId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<MessageRead>()
            .HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<MessageRead>().HasIndex(x => x.UserId);

        modelBuilder.Entity<MessageHiddenForUser>().HasKey(x => new { x.MessageId, x.UserId });
        modelBuilder.Entity<MessageHiddenForUser>()
            .HasOne(x => x.Message)
            .WithMany()
            .HasForeignKey(x => x.MessageId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<MessageHiddenForUser>()
            .HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<MessageHiddenForUser>().HasIndex(x => x.UserId);

        modelBuilder.Entity<User>().HasIndex(x => x.Email).IsUnique();
        modelBuilder.Entity<User>().HasIndex(x => x.Username).IsUnique();

        modelBuilder.Entity<ChatMute>().HasKey(x => new { x.ChatId, x.UserId });
        modelBuilder.Entity<ChatMute>()
            .HasOne(x => x.Chat).WithMany().HasForeignKey(x => x.ChatId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<ChatMute>()
            .HasOne(x => x.User).WithMany().HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<ChatMute>().HasIndex(x => x.UserId);

        modelBuilder.Entity<PushSubscription>().HasKey(x => x.Id);
        modelBuilder.Entity<PushSubscription>().HasIndex(x => x.Endpoint).IsUnique();
        modelBuilder.Entity<PushSubscription>()
            .HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
        modelBuilder.Entity<PushSubscription>().HasIndex(x => x.UserId);

        modelBuilder.Entity<RefreshToken>().HasKey(x => x.Id);
        modelBuilder.Entity<RefreshToken>().HasIndex(x => x.TokenHash).IsUnique();
        modelBuilder.Entity<RefreshToken>().HasIndex(x => x.UserId);
        modelBuilder.Entity<RefreshToken>()
            .HasOne(x => x.User)
            .WithMany(x => x.RefreshTokens)
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
