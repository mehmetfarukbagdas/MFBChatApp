using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChatApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProfileAccountSecurity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SecurityStamp",
                table: "Users",
                type: "text",
                nullable: false,
                defaultValue: "");
            
            // Give existing users independent session revocation stamps.
            migrationBuilder.Sql("""
                UPDATE "Users"
                SET "SecurityStamp" = md5(random()::text || clock_timestamp()::text || "Id"::text)
                WHERE "SecurityStamp" = '';
            """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SecurityStamp",
                table: "Users");
        }
    }
}
