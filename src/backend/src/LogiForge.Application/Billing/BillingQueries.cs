using LogiForge.Application.Auth.Dtos;
using LogiForge.Application.Common;
using LogiForge.Domain.Entities;
using LogiForge.Domain.Exceptions;
using LogiForge.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace LogiForge.Application.Billing;

public record GetBillingStatusQuery : IRequest<BillingStatusDto>;
public record CreateCheckoutCommand(string PlanCode, string? SuccessUrl, string? CancelUrl) : IRequest<CheckoutSessionResponse>;
public record CreatePortalCommand(string? ReturnUrl) : IRequest<PortalSessionResponse>;

public static class BillingPlans
{
    public static IReadOnlyList<SubscriptionPlanDto> Catalog(StripeOptions stripe) =>
    [
        new("starter", "Starter", "Up to 2 warehouses · core WMS · email support", 29900,
            stripe.IsConfigured && !string.IsNullOrWhiteSpace(stripe.PriceStarter)),
        new("growth", "Growth", "Multi-warehouse · reports · integrations · priority support", 79900,
            stripe.IsConfigured && !string.IsNullOrWhiteSpace(stripe.PriceGrowth)),
        new("scale", "Scale", "Custom volume, SSO, dedicated success — talk to us", 0,
            false)
    ];

    public static string? PriceIdFor(string planCode, StripeOptions stripe) => planCode.ToLowerInvariant() switch
    {
        "starter" => stripe.PriceStarter,
        "growth" => stripe.PriceGrowth,
        "scale" => stripe.PriceScale,
        _ => null
    };
}

public class GetBillingStatusQueryHandler : IRequestHandler<GetBillingStatusQuery, BillingStatusDto>
{
    private readonly ICurrentUserService _current;
    private readonly IRepository<Company> _companies;
    private readonly IUnitOfWork _uow;
    private readonly StripeOptions _stripe;

    public GetBillingStatusQueryHandler(
        ICurrentUserService current,
        IRepository<Company> companies,
        IUnitOfWork uow,
        IOptions<StripeOptions> stripe)
    {
        _current = current;
        _companies = companies;
        _uow = uow;
        _stripe = stripe.Value;
    }

    public async Task<BillingStatusDto> Handle(GetBillingStatusQuery request, CancellationToken cancellationToken)
    {
        if (_current.CompanyId is null) throw new ForbiddenException();
        var company = await _companies.Query().IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Id == _current.CompanyId, cancellationToken)
            ?? throw new NotFoundException(nameof(Company), _current.CompanyId);

        if (Auth.Commands.LoginCommandHandler.SyncTrialExpiry(company))
            await _uow.SaveChangesAsync(cancellationToken);

        return new BillingStatusDto(
            company.Status.ToString(),
            company.PlanCode,
            company.TrialEndsAt,
            company.CurrentPeriodEnd,
            company.BillingEmail,
            _stripe.IsConfigured,
            !string.IsNullOrWhiteSpace(company.StripeCustomerId),
            BillingPlans.Catalog(_stripe));
    }
}

public class CreateCheckoutCommandHandler : IRequestHandler<CreateCheckoutCommand, CheckoutSessionResponse>
{
    private readonly ICurrentUserService _current;
    private readonly IStripeBillingService _stripe;
    private readonly AppOptions _app;

    public CreateCheckoutCommandHandler(
        ICurrentUserService current,
        IStripeBillingService stripe,
        IOptions<AppOptions> app)
    {
        _current = current;
        _stripe = stripe;
        _app = app.Value;
    }

    public async Task<CheckoutSessionResponse> Handle(CreateCheckoutCommand request, CancellationToken cancellationToken)
    {
        if (_current.CompanyId is null) throw new ForbiddenException();
        if (!_stripe.IsConfigured)
            throw new DomainException("stripe_not_configured", "Billing is not configured on this environment yet.");

        var baseUrl = _app.PublicWebBaseUrl.TrimEnd('/');
        var success = string.IsNullOrWhiteSpace(request.SuccessUrl)
            ? $"{baseUrl}/billing?checkout=success"
            : request.SuccessUrl!;
        var cancel = string.IsNullOrWhiteSpace(request.CancelUrl)
            ? $"{baseUrl}/billing?checkout=cancel"
            : request.CancelUrl!;

        var url = await _stripe.CreateCheckoutSessionAsync(
            _current.CompanyId.Value, request.PlanCode, success, cancel, cancellationToken);
        return new CheckoutSessionResponse(url);
    }
}

public class CreatePortalCommandHandler : IRequestHandler<CreatePortalCommand, PortalSessionResponse>
{
    private readonly ICurrentUserService _current;
    private readonly IStripeBillingService _stripe;
    private readonly AppOptions _app;

    public CreatePortalCommandHandler(
        ICurrentUserService current,
        IStripeBillingService stripe,
        IOptions<AppOptions> app)
    {
        _current = current;
        _stripe = stripe;
        _app = app.Value;
    }

    public async Task<PortalSessionResponse> Handle(CreatePortalCommand request, CancellationToken cancellationToken)
    {
        if (_current.CompanyId is null) throw new ForbiddenException();
        if (!_stripe.IsConfigured)
            throw new DomainException("stripe_not_configured", "Billing is not configured on this environment yet.");

        var returnUrl = string.IsNullOrWhiteSpace(request.ReturnUrl)
            ? $"{_app.PublicWebBaseUrl.TrimEnd('/')}/billing"
            : request.ReturnUrl!;
        var url = await _stripe.CreateCustomerPortalSessionAsync(_current.CompanyId.Value, returnUrl, cancellationToken);
        return new PortalSessionResponse(url);
    }
}
