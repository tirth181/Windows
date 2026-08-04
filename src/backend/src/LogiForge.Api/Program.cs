using System.Text;
using System.Threading.RateLimiting;
using LogiForge.Api.Middleware;
using LogiForge.Application;
using LogiForge.Infrastructure;
using LogiForge.Infrastructure.Persistence.Seed;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((ctx, cfg) => cfg.ReadFrom.Configuration(ctx.Configuration).WriteTo.Console());

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        o.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter());
        o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "LogiForge API", Version = "v1", Description = "Enterprise AI-powered 3PL WMS" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme.",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } },
            Array.Empty<string>()
        }
    });
});

var jwtKey = builder.Configuration["Jwt:Key"];
var isDev = builder.Environment.IsDevelopment();
if (string.IsNullOrWhiteSpace(jwtKey) || jwtKey.Contains("ChangeMe", StringComparison.OrdinalIgnoreCase))
{
    if (!isDev)
    {
        throw new InvalidOperationException(
            "Jwt:Key must be configured to a strong secret (32+ chars) outside Development. " +
            "Set the Jwt__Key environment variable or Key Vault secret.");
    }

    jwtKey = "LogiForge_Dev_Signing_Key_ChangeMe_32chars!";
}

if (jwtKey.Length < 32)
{
    throw new InvalidOperationException("Jwt:Key must be at least 32 characters.");
}

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "LogiForge",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "LogiForge",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
            ClockSkew = TimeSpan.FromMinutes(1)
        };
    });
// Entra ID: add .AddOpenIdConnect(...) when AzureAd options are configured.

builder.Services.AddAuthorization();

var corsOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? ["http://localhost:3000"];
builder.Services.AddCors(o => o.AddPolicy("frontend", p =>
    p.WithOrigins(corsOrigins)
        .AllowAnyHeader()
        .WithMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
        .AllowCredentials()));

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter("api", opt =>
    {
        opt.Window = TimeSpan.FromMinutes(1);
        opt.PermitLimit = 120;
        opt.QueueLimit = 0;
    });
    options.AddFixedWindowLimiter("auth", opt =>
    {
        opt.Window = TimeSpan.FromMinutes(1);
        opt.PermitLimit = 10;
        opt.QueueLimit = 0;
    });
});

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    // Trust reverse proxies (Cloudflare / nginx / App Gateway) in front of the API.
    options.KnownIPNetworks.Clear();
    options.KnownProxies.Clear();
});

builder.Services.AddHsts(options =>
{
    options.MaxAge = TimeSpan.FromDays(365);
    options.IncludeSubDomains = true;
    options.Preload = true;
});

builder.Services.AddHealthChecks()
    .AddNpgSql(builder.Configuration.GetConnectionString("DefaultConnection") ?? "Host=localhost;Port=5432;Database=logiforge;Username=logiforge;Password=logiforge", name: "postgres");

var app = builder.Build();

app.UseForwardedHeaders();
app.UseMiddleware<SecurityHeadersMiddleware>();
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseSerilogRequestLogging();

if (!isDev)
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

if (isDev || builder.Configuration.GetValue("Swagger:Enabled", false))
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("frontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers().RequireRateLimiting("api");
app.MapHealthChecks("/health/live");
app.MapHealthChecks("/health/ready");

await DbSeeder.SeedAsync(app.Services);

app.Run();

public partial class Program;
