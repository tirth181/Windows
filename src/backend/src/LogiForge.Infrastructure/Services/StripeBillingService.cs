using LogiForge.Application.Billing;
using LogiForge.Application.Common;
using LogiForge.Domain.Entities;
using LogiForge.Domain.Enums;
using LogiForge.Domain.Exceptions;
using LogiForge.Domain.Interfaces;
using LogiForge.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Stripe;
using Stripe.Checkout;

namespace LogiForge.Infrastructure.Services;

public class StripeBillingService : IStripeBillingService
{
    private readonly LogiForgeDbContext _db;
    private readonly StripeOptions _options;
    private readonly ILogger<StripeBillingService> _logger;

    public StripeBillingService(
        LogiForgeDbContext db,
        IOptions<StripeOptions> options,
        ILogger<StripeBillingService> logger)
    {
        _db = db;
        _options = options.Value;
        _logger = logger;
        if (!string.IsNullOrWhiteSpace(_options.SecretKey))
            StripeConfiguration.ApiKey = _options.SecretKey;
    }

    public bool IsConfigured => _options.IsConfigured;

    public async Task<string> CreateCheckoutSessionAsync(
        Guid companyId, string planCode, string successUrl, string cancelUrl, CancellationToken ct = default)
    {
        if (!IsConfigured)
            throw new DomainException("stripe_not_configured", "Stripe is not configured.");

        var priceId = BillingPlans.PriceIdFor(planCode, _options);
        if (string.IsNullOrWhiteSpace(priceId))
            throw new DomainException("invalid_plan", "Unknown or unavailable plan.");

        var company = await _db.Companies.IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Id == companyId && !c.IsDeleted, ct)
            ?? throw new NotFoundException(nameof(Company), companyId);

        var customerId = company.StripeCustomerId;
        if (string.IsNullOrWhiteSpace(customerId))
        {
            var customerService = new CustomerService();
            var customer = await customerService.CreateAsync(new CustomerCreateOptions
            {
                Email = company.BillingEmail,
                Name = company.Name,
                Metadata = new Dictionary<string, string>
                {
                    ["company_id"] = company.Id.ToString(),
                    ["company_code"] = company.Code
                }
            }, cancellationToken: ct);
            customerId = customer.Id;
            company.StripeCustomerId = customerId;
            await _db.SaveChangesAsync(ct);
        }

        var sessionService = new SessionService();
        var session = await sessionService.CreateAsync(new SessionCreateOptions
        {
            Mode = "subscription",
            Customer = customerId,
            SuccessUrl = successUrl,
            CancelUrl = cancelUrl,
            ClientReferenceId = company.Id.ToString(),
            LineItems =
            [
                new SessionLineItemOptions { Price = priceId, Quantity = 1 }
            ],
            Metadata = new Dictionary<string, string>
            {
                ["company_id"] = company.Id.ToString(),
                ["plan_code"] = planCode.ToLowerInvariant()
            },
            SubscriptionData = new SessionSubscriptionDataOptions
            {
                Metadata = new Dictionary<string, string>
                {
                    ["company_id"] = company.Id.ToString(),
                    ["plan_code"] = planCode.ToLowerInvariant()
                }
            }
        }, cancellationToken: ct);

        return session.Url;
    }

    public async Task<string> CreateCustomerPortalSessionAsync(
        Guid companyId, string returnUrl, CancellationToken ct = default)
    {
        if (!IsConfigured)
            throw new DomainException("stripe_not_configured", "Stripe is not configured.");

        var company = await _db.Companies.IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Id == companyId && !c.IsDeleted, ct)
            ?? throw new NotFoundException(nameof(Company), companyId);

        if (string.IsNullOrWhiteSpace(company.StripeCustomerId))
            throw new DomainException("no_customer", "No billing customer yet. Start a checkout first.");

        var portal = new Stripe.BillingPortal.SessionService();
        var session = await portal.CreateAsync(new Stripe.BillingPortal.SessionCreateOptions
        {
            Customer = company.StripeCustomerId,
            ReturnUrl = returnUrl
        }, cancellationToken: ct);
        return session.Url;
    }

    public async Task HandleWebhookAsync(string json, string? signatureHeader, CancellationToken ct = default)
    {
        Event stripeEvent;
        try
        {
            if (!string.IsNullOrWhiteSpace(_options.WebhookSecret))
            {
                stripeEvent = EventUtility.ConstructEvent(json, signatureHeader, _options.WebhookSecret);
            }
            else
            {
                // Dev-only fallback when webhook secret is unset
                stripeEvent = EventUtility.ParseEvent(json);
                _logger.LogWarning("Stripe webhook accepted without signature verification (WebhookSecret unset)");
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Invalid Stripe webhook");
            throw new DomainException("invalid_webhook", "Invalid Stripe webhook signature.");
        }

        switch (stripeEvent.Type)
        {
            case "checkout.session.completed":
                if (stripeEvent.Data.Object is Session session)
                    await ApplyCheckoutCompletedAsync(session, ct);
                break;
            case "customer.subscription.updated":
            case "customer.subscription.created":
                if (stripeEvent.Data.Object is Subscription sub)
                    await ApplySubscriptionAsync(sub, ct);
                break;
            case "customer.subscription.deleted":
                if (stripeEvent.Data.Object is Subscription deleted)
                    await SuspendFromSubscriptionAsync(deleted, ct);
                break;
            case "invoice.payment_failed":
                if (stripeEvent.Data.Object is Invoice invoice && !string.IsNullOrWhiteSpace(invoice.CustomerId))
                    await SuspendByCustomerAsync(invoice.CustomerId, ct);
                break;
            default:
                _logger.LogInformation("Unhandled Stripe event {Type}", stripeEvent.Type);
                break;
        }
    }

    private async Task ApplyCheckoutCompletedAsync(Session session, CancellationToken ct)
    {
        var companyId = ResolveCompanyId(session.ClientReferenceId, session.Metadata);
        Company? company = null;
        if (companyId is not null)
            company = await _db.Companies.IgnoreQueryFilters().FirstOrDefaultAsync(c => c.Id == companyId, ct);
        if (company is null && !string.IsNullOrWhiteSpace(session.CustomerId))
            company = await _db.Companies.IgnoreQueryFilters()
                .FirstOrDefaultAsync(c => c.StripeCustomerId == session.CustomerId, ct);
        if (company is null) return;

        company.StripeCustomerId = session.CustomerId ?? company.StripeCustomerId;
        company.StripeSubscriptionId = session.SubscriptionId ?? company.StripeSubscriptionId;
        if (session.Metadata != null && session.Metadata.TryGetValue("plan_code", out var plan))
            company.PlanCode = plan;
        company.Status = CompanyStatus.Active;
        company.StripePriceId = BillingPlans.PriceIdFor(company.PlanCode, _options);
        await _db.SaveChangesAsync(ct);
        _logger.LogInformation("Checkout completed for company {CompanyId} plan {Plan}", company.Id, company.PlanCode);
    }

    private async Task ApplySubscriptionAsync(Subscription sub, CancellationToken ct)
    {
        var company = await FindCompanyForSubscriptionAsync(sub, ct);
        if (company is null) return;

        company.StripeCustomerId = sub.CustomerId ?? company.StripeCustomerId;
        company.StripeSubscriptionId = sub.Id;
        // Stripe.net / API versions differ on where period end lives — best-effort.
        DateTime? periodEnd = null;
        try
        {
            var item = sub.Items?.Data?.FirstOrDefault();
            if (item is not null)
            {
                var prop = item.GetType().GetProperty("CurrentPeriodEnd");
                if (prop?.GetValue(item) is DateTime dt) periodEnd = dt;
            }
            if (periodEnd is null)
            {
                var prop = sub.GetType().GetProperty("CurrentPeriodEnd");
                if (prop?.GetValue(sub) is DateTime dt) periodEnd = dt;
            }
        }
        catch { /* ignore */ }
        company.CurrentPeriodEnd = periodEnd ?? company.CurrentPeriodEnd;
        if (sub.Metadata != null && sub.Metadata.TryGetValue("plan_code", out var plan))
            company.PlanCode = plan;
        var priceId = sub.Items?.Data?.FirstOrDefault()?.Price?.Id;
        if (!string.IsNullOrWhiteSpace(priceId))
            company.StripePriceId = priceId;

        company.Status = sub.Status is "active" or "trialing" ? CompanyStatus.Active : CompanyStatus.Suspended;
        if (company.Status == CompanyStatus.Active && company.PlanCode == "trial")
            company.PlanCode = InferPlanFromPrice(company.StripePriceId) ?? "starter";

        await _db.SaveChangesAsync(ct);
    }

    private async Task SuspendFromSubscriptionAsync(Subscription sub, CancellationToken ct)
    {
        var company = await FindCompanyForSubscriptionAsync(sub, ct);
        if (company is null) return;
        company.Status = CompanyStatus.Suspended;
        company.StripeSubscriptionId = null;
        await _db.SaveChangesAsync(ct);
    }

    private async Task SuspendByCustomerAsync(string customerId, CancellationToken ct)
    {
        var company = await _db.Companies.IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.StripeCustomerId == customerId, ct);
        if (company is null) return;
        company.Status = CompanyStatus.Suspended;
        await _db.SaveChangesAsync(ct);
    }

    private async Task<Company?> FindCompanyForSubscriptionAsync(Subscription sub, CancellationToken ct)
    {
        var companyId = ResolveCompanyId(null, sub.Metadata);
        if (companyId is not null)
        {
            var byId = await _db.Companies.IgnoreQueryFilters().FirstOrDefaultAsync(c => c.Id == companyId, ct);
            if (byId is not null) return byId;
        }
        if (!string.IsNullOrWhiteSpace(sub.CustomerId))
            return await _db.Companies.IgnoreQueryFilters()
                .FirstOrDefaultAsync(c => c.StripeCustomerId == sub.CustomerId, ct);
        return null;
    }

    private static Guid? ResolveCompanyId(string? clientRef, Dictionary<string, string>? metadata)
    {
        if (Guid.TryParse(clientRef, out var fromRef)) return fromRef;
        if (metadata != null && metadata.TryGetValue("company_id", out var raw) && Guid.TryParse(raw, out var fromMeta))
            return fromMeta;
        return null;
    }

    private string? InferPlanFromPrice(string? priceId)
    {
        if (string.IsNullOrWhiteSpace(priceId)) return null;
        if (priceId == _options.PriceStarter) return "starter";
        if (priceId == _options.PriceGrowth) return "growth";
        if (priceId == _options.PriceScale) return "scale";
        return null;
    }
}
