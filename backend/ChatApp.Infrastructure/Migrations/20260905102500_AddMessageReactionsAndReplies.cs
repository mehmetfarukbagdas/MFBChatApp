using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChatApp.Infrastructure.Migrations
{
    public partial class AddMessageReactionsAndReplies : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE "Messages"
                ADD COLUMN IF NOT EXISTS "ReplyToMessageId" uuid;

                CREATE TABLE IF NOT EXISTS "MessageReactions"
                (
                    "MessageId" uuid NOT NULL,
                    "UserId" uuid NOT NULL,
                    "Emoji" text NOT NULL,
                    "CreatedAt" timestamp with time zone NOT NULL,
                    CONSTRAINT "PK_MessageReactions"
                        PRIMARY KEY ("MessageId", "UserId")
                );

                CREATE INDEX IF NOT EXISTS "IX_Messages_ReplyToMessageId"
                    ON "Messages" ("ReplyToMessageId");

                CREATE INDEX IF NOT EXISTS "IX_MessageReactions_MessageId_Emoji"
                    ON "MessageReactions" ("MessageId", "Emoji");

                CREATE INDEX IF NOT EXISTS "IX_MessageReactions_UserId"
                    ON "MessageReactions" ("UserId");
            """);

            migrationBuilder.Sql("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint
                        WHERE conname = 'FK_MessageReactions_Messages_MessageId'
                    ) THEN
                        ALTER TABLE "MessageReactions"
                        ADD CONSTRAINT "FK_MessageReactions_Messages_MessageId"
                        FOREIGN KEY ("MessageId") REFERENCES "Messages" ("Id")
                        ON DELETE CASCADE;
                    END IF;

                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint
                        WHERE conname = 'FK_MessageReactions_Users_UserId'
                    ) THEN
                        ALTER TABLE "MessageReactions"
                        ADD CONSTRAINT "FK_MessageReactions_Users_UserId"
                        FOREIGN KEY ("UserId") REFERENCES "Users" ("Id")
                        ON DELETE CASCADE;
                    END IF;

                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint
                        WHERE conname = 'FK_Messages_Messages_ReplyToMessageId'
                    ) THEN
                        ALTER TABLE "Messages"
                        ADD CONSTRAINT "FK_Messages_Messages_ReplyToMessageId"
                        FOREIGN KEY ("ReplyToMessageId") REFERENCES "Messages" ("Id")
                        ON DELETE SET NULL;
                    END IF;
                END $$;
            """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE "Messages"
                DROP CONSTRAINT IF EXISTS "FK_Messages_Messages_ReplyToMessageId";

                DROP TABLE IF EXISTS "MessageReactions";

                DROP INDEX IF EXISTS "IX_Messages_ReplyToMessageId";

                ALTER TABLE "Messages"
                DROP COLUMN IF EXISTS "ReplyToMessageId";
            """);
        }
    }
}
