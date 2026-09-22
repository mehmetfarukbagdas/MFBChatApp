using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChatApp.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddProfileVisibilityAndStatus : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "BioVisibility",
                table: "Users",
                type: "text",
                nullable: false,
                defaultValue: "Everyone");

            migrationBuilder.AddColumn<string>(
                name: "ProfilePhotoVisibility",
                table: "Users",
                type: "text",
                nullable: false,
                defaultValue: "Everyone");

            migrationBuilder.AddColumn<string>(
                name: "StatusEmoji",
                table: "Users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "StatusExpiresAt",
                table: "Users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StatusText",
                table: "Users",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BioVisibility",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ProfilePhotoVisibility",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "StatusEmoji",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "StatusExpiresAt",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "StatusText",
                table: "Users");
        }
    }
}
