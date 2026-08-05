using System.Security.Claims;
using System.Text.Json;
using LogiForge.Application.Auth.Commands;
using LogiForge.Domain.Enums;
using LogiForge.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace LogiForge.Api.Middleware;

/// <summary>
/// Blocks operational API use for Suspended companies while allowing auth + billing recovery paths.
/// </summary>
public class SubscriptionGateMiddleware
{
    private readonly RequestDelegate _next;

    private static readonly string[] AlwaysAllowedPrefixes =
    [
        "/health",
        "/swagger",
        "/api/v1/auth",
        "/api/v1/billing"
    ];

    public SubscriptionGateMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, LogiForgeDbContext db)
    {
        var path = context.Request.Path.Value ?? "";
        if (AlwaysAllowedPrefixes.Any(p => path.StartsWith(p, StringComparison.OrdinalIgnoreCase)))
        {
            await _next(context);
            return;
        }

        if (context.User.Identity?.IsAuthenticated != true)
        {
            await _next(context);
            return;
        }

        var companyClaim = context.User.FindFirstValue("company_id")
            ?? context.User.FindFirstValue("companyId");
        var isPlatform = string.Equals(context.User.FindFirstValue("is_platform_admin"), "true", StringComparison.OrdinalIgnoreCase)
            || context.User.IsInRole("PlatformAdmin");

        if (isPlatform || !Guid.TryParse(companyClaim, out var companyId))
        {
            await _next(context);
            return;
        }

        var company = await db.Companies.IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == companyId);

        if (company is null)
        {
            await _next(context);
            return;
        }

        // Mutating status requires a tracked entity — reload if trial expired
        if (company.Status == CompanyStatus.Trial
            && company.TrialEndsAt is not null
            && company.TrialEndsAt < DateTime.UtcNow)
        {
            var tracked = await db.Companies.IgnoreQueryFilters().FirstAsync(c => c.Id == companyId);
            if (LoginCommandHandler.SyncTrialExpiry(tracked))
                await db.SaveChangesAsync();
            company = tracked;
        }

        if (company.Status == CompanyStatus.Suspended)
        {
            context.Response.StatusCode = StatusCodes.Status402PaymentRequired;
            context.Response.ContentType = "application/problem+json";
            await context.Response.WriteAsync(JsonSerializer.Serialize(new Dictionary<string, object?>
            {
                ["type"] = "https://httpstatuses.com/402",
                ["title"] = "subscription_required",
                ["status"] = 402,
                ["detail"] = "Your trial ended or subscription is inactive. Open Billing to restore access."
            }));
            return;
        }

        await _next(context);
    }
}
