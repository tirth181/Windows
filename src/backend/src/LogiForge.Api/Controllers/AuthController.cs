using LogiForge.Application.Auth.Commands;
using LogiForge.Application.Auth.Dtos;
using LogiForge.Application.Auth.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace LogiForge.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IAuthTokenService _tokens;

    public AuthController(IMediator mediator, IAuthTokenService tokens)
    {
        _mediator = mediator;
        _tokens = tokens;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        var ua = Request.Headers.UserAgent.ToString();
        var result = await _mediator.Send(new LoginCommand(request.Email, request.Password, ip, ua), ct);
        return Ok(result);
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    [EnableRateLimiting("auth")]
    public async Task<ActionResult<LoginResponse>> Refresh([FromBody] RefreshRequest request, CancellationToken ct)
    {
        var result = await _tokens.RefreshAsync(request.RefreshToken, ct);
        return result is null ? Unauthorized() : Ok(result);
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<UserProfileDto>> Me(CancellationToken ct)
        => Ok(await _mediator.Send(new GetCurrentUserQuery(), ct));

    [HttpGet("entra/challenge")]
    [AllowAnonymous]
    public IActionResult EntraChallenge()
        => Ok(new { message = "Configure AzureAd section and enable OpenIdConnect middleware for Entra ID SSO." });
}

public record RefreshRequest(string RefreshToken);
