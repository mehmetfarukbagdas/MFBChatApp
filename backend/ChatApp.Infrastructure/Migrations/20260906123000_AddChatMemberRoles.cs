using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChatApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddChatMemberRoles : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Role",
                table: "ChatMembers",
                type: "text",
                nullable: false,
                defaultValue: "Member");

            migrationBuilder.Sql(@"
                UPDATE ""ChatMembers"" cm
                SET ""Role"" = 'Owner'
                WHERE cm.""UserId"" = (
                    SELECT cm2.""UserId""
                    FROM ""ChatMembers"" cm2
                    WHERE cm2.""ChatId"" = cm.""ChatId""
                    ORDER BY cm2.""JoinedAt"", cm2.""UserId""
                    LIMIT 1
                );
            ");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Role",
                table: "ChatMembers");
        }
    }
}
