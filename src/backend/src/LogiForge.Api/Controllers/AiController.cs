using LogiForge.Application.Ai.Commands;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LogiForge.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/ai")]
public class AiController : ControllerBase
{
    private readonly IMediator _mediator;
    public AiController(IMediator mediator) => _mediator = mediator;

    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] AiChatRequest request, CancellationToken ct)
        => Ok(await _mediator.Send(new AiChatCommand(request), ct));
}
