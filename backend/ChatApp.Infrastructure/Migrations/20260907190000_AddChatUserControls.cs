using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChatApp.Infrastructure.Migrations;

public partial class AddChatUserControls : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"
            ALTER TABLE ""ChatMembers"" ADD COLUMN IF NOT EXISTS ""ArchivedAt"" timestamp with time zone NULL;
            ALTER TABLE ""ChatMembers"" ADD COLUMN IF NOT EXISTS ""ClearedAt"" timestamp with time zone NULL;
            ALTER TABLE ""ChatMembers"" ADD COLUMN IF NOT EXISTS ""IsPinned"" boolean NOT NULL DEFAULT FALSE;
            ALTER TABLE ""ChatMembers"" ADD COLUMN IF NOT EXISTS ""IsMarkedUnread"" boolean NOT NULL DEFAULT FALSE;
            ALTER TABLE ""ChatMembers"" ADD COLUMN IF NOT EXISTS ""DeletedAt"" timestamp with time zone NULL;
        ");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(name: "ArchivedAt", table: "ChatMembers");
        migrationBuilder.DropColumn(name: "ClearedAt", table: "ChatMembers");
        migrationBuilder.DropColumn(name: "IsPinned", table: "ChatMembers");
        migrationBuilder.DropColumn(name: "IsMarkedUnread", table: "ChatMembers");
        migrationBuilder.DropColumn(name: "DeletedAt", table: "ChatMembers");
    }
}
