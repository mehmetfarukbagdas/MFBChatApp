using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChatApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RepairLegacyProfileDefaults : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE "Users"
                SET "ProfilePhotoVisibility" = 'Everyone'
                WHERE "ProfilePhotoVisibility" IS NULL OR "ProfilePhotoVisibility" = '';

                UPDATE "Users"
                SET "BioVisibility" = 'Everyone'
                WHERE "BioVisibility" IS NULL OR "BioVisibility" = '';

                UPDATE "Users"
                SET "SecurityStamp" = md5(random()::text || clock_timestamp()::text || "Id"::text)
                WHERE "SecurityStamp" IS NULL OR "SecurityStamp" = '';

                -- ReceiptVisible was introduced after MessageReads already existed.
                -- Reads from before that migration predate the user's receipt preference,
                -- so preserve their original visible-read behavior.
                UPDATE "MessageReads"
                SET "ReceiptVisible" = TRUE
                WHERE "ReceiptVisible" = FALSE
                  AND "ReadAt" < TIMESTAMPTZ '2026-09-06 08:24:22+00';
            """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Data repair is intentionally irreversible.
        }
    }
}
