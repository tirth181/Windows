using LogiForge.Application.Auth.Dtos;
using LogiForge.Application.Billing;
using LogiForge.Domain.Interfaces;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LogiForge.Api.Controllers;

[ApiController]
[Route("api/v1/billing")]
public class BillingController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IStripeBillingService _stripe;

    public BillingController(IMediator mediator, IStripeBillingService stripe)
    {
        _mediator = mediator;
        _stripe = stripe;
    }

    [HttpGet("status")]
    [Authorize]
    public async Task<ActionResult<BillingStatusDto>> Status(CancellationToken ct)
        => Ok(await _mediator.Send(new GetBillingStatusQuery(), ct));

    [HttpPost("checkout")]
    [Authorize]
    public async Task<ActionResult<CheckoutSessionResponse>> Checkout([FromBody] CreateCheckoutRequest request, CancellationToken ct)
        => Ok(await _mediator.Send(new CreateCheckoutCommand(request.PlanCode, request.SuccessUrl, request.CancelUrl), ct));

    [HttpPost("portal")]
    [Authorize]
    public async Task<ActionResult<PortalSessionResponse>> Portal([FromBody] CreatePortalRequest? request, CancellationToken ct)
        => Ok(await _mediator.Send(new CreatePortalCommand(request?.ReturnUrl), ct));

    [HttpPost("webhook")]
    [AllowAnonymous]
    public async Task<IActionResult> Webhook(CancellationToken ct)
    {
        using var reader = new StreamReader(Request.Body);
        var json = await reader.ReadToEndAsync(ct);
        var signature = Request.Headers["Stripe-Signature"].ToString();
        await _stripe.HandleWebhookAsync(json, signature, ct);
        return Ok(new { received = true });
    }
}
