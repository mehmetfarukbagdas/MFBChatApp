using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChatApp.Infrastructure.Migrations;

public partial class ResetExistingChatPins : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(@"UPDATE ""ChatMembers"" SET ""IsPinned"" = FALSE WHERE ""IsPinned"" = TRUE;");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        // Intentionally no-op. The previous accidental pin state cannot be reconstructed safely.
    }
}
