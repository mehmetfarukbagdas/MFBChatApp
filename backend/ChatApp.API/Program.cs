using System.Text;
using System.Security.Claims;
using System.Threading.RateLimiting;
using ChatApp.API.Hubs;
using ChatApp.Application.Interfaces;
using ChatApp.Application.Services;
using ChatApp.Infrastructure.Data;
using ChatApp.API.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
var jwtKey = builder.Configuration["Jwt:Key"];

if (string.IsNullOrWhiteSpace(connectionString))
    throw new InvalidOperationException("Database connection string is not configured.");

if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey.Length < 32)
    throw new InvalidOperationException("Jwt:Key must be configured and contain at least 32 characters.");


builder.WebHost.UseWebRoot("wwwroot");
builder.Services.AddControllers();
builder.Services.AddHttpClient();
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddPolicy("auth", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            httpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true
            }));

    options.AddPolicy("ai", httpContext =>
        RateLimitPartition.GetFixedWindowLimiter(
            httpContext.User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? httpContext.Connection.RemoteIpAddress?.ToString()
                ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 12,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                AutoReplenishment = true
            }));
});

builder.Services.AddEndpointsApiExplorer();

builder.Services.AddSwaggerGen(options =>
{
    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "JWT token girin. Örnek: Bearer {token}"
    });

    options.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseNpgsql(connectionString));

builder.Services.AddSignalR();
builder.Services.AddScoped<IWebPushNotificationService, WebPushNotificationService>();

var configuredOrigins = builder.Configuration["Frontend:Origins"] ?? "http://localhost:3000";
var frontendOrigins = configuredOrigins
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(o =>
    o.AddPolicy("frontend", p =>
        p.WithOrigins(frontendOrigins)
         .AllowAnyHeader()
         .AllowAnyMethod()
         .AllowCredentials()));

builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<IEmailService, SmtpEmailService>();
builder.Services.AddScoped<IChatService, ChatService>();
builder.Services.AddScoped<IMessageService, MessageService>();


builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,

            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],

            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(jwtKey))
        };

        
        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken =
                    context.Request.Query["access_token"];

                var path = context.HttpContext.Request.Path;

                if (!string.IsNullOrEmpty(accessToken) &&
                    path.StartsWithSegments("/hubs/chat"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            },
            OnTokenValidated = async context =>
            {
                var userIdValue = context.Principal?.FindFirstValue(ClaimTypes.NameIdentifier);
                var tokenStamp = context.Principal?.FindFirst("security_stamp")?.Value;

                if (!Guid.TryParse(userIdValue, out var userId) ||
                    string.IsNullOrWhiteSpace(tokenStamp))
                {
                    context.Fail("Invalid session.");
                    return;
                }

                var db = context.HttpContext.RequestServices
                    .GetRequiredService<AppDbContext>();

                var currentStamp = await db.Users
                    .AsNoTracking()
                    .Where(x => x.Id == userId)
                    .Select(x => x.SecurityStamp)
                    .SingleOrDefaultAsync();

                if (currentStamp is null ||
                    !string.Equals(currentStamp, tokenStamp, StringComparison.Ordinal))
                {
                    context.Fail("Session revoked.");
                }
            }
        };
    });

builder.Services.AddAuthorization();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    await db.Database.ExecuteSqlRawAsync(@"
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

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
else
{
    app.UseHsts();
}

app.Use(async (context, next) =>
{
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    await next();
});

app.UseCors("frontend");

app.UseAuthentication();
app.UseRateLimiter();
app.UseAuthorization();

app.UseStaticFiles();

app.MapControllers();
app.MapHub<ChatHub>("/hubs/chat");

app.Run();

