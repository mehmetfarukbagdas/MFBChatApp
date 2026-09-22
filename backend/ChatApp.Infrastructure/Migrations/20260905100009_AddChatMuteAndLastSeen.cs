using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChatApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddChatMuteAndLastSeen : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "LastSeenAt",
                table: "Users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsPinned",
                table: "Messages",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "PinnedAt",
                table: "Messages",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "PinnedByUserId",
                table: "Messages",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ChatMutes",
                columns: table => new
                {
                    ChatId = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    MutedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ChatMutes", x => new { x.ChatId, x.UserId });
                    table.ForeignKey(
                        name: "FK_ChatMutes_Chats_ChatId",
                        column: x => x.ChatId,
                        principalTable: "Chats",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ChatMutes_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ChatMutes_UserId",
                table: "ChatMutes",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ChatMutes");

            migrationBuilder.DropColumn(
                name: "LastSeenAt",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "IsPinned",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "PinnedAt",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "PinnedByUserId",
                table: "Messages");
        }
    }
}
