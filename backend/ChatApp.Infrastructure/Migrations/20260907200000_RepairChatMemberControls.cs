using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChatApp.Infrastructure.Migrations;

public partial class RepairChatMemberControls : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
       
        migrationBuilder.Sql(@"
            ALTER TABLE ""ChatMembers"" ADD COLUMN IF NOT EXISTS ""Role"" text NOT NULL DEFAULT 'Member';
            ALTER TABLE ""ChatMembers"" ADD COLUMN IF NOT EXISTS ""ArchivedAt"" timestamp with time zone NULL;
            ALTER TABLE ""ChatMembers"" ADD COLUMN IF NOT EXISTS ""ClearedAt"" timestamp with time zone NULL;
            ALTER TABLE ""ChatMembers"" ADD COLUMN IF NOT EXISTS ""IsPinned"" boolean NOT NULL DEFAULT FALSE;
            ALTER TABLE ""ChatMembers"" ADD COLUMN IF NOT EXISTS ""IsMarkedUnread"" boolean NOT NULL DEFAULT FALSE;
            ALTER TABLE ""ChatMembers"" ADD COLUMN IF NOT EXISTS ""DeletedAt"" timestamp with time zone NULL;

            UPDATE ""ChatMembers"" cm
            SET ""Role"" = 'Owner'
            WHERE cm.""Role"" = 'Member'
              AND cm.""UserId"" = (
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
       
    }
}
