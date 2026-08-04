using LogiForge.Application.Outbound.Commands;
using LogiForge.Application.Outbound.Dtos;
using LogiForge.Application.Outbound.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LogiForge.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/outbound")]
public class OutboundController : ControllerBase
{
    private readonly IMediator _mediator;
    public OutboundController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] GetOutboundListQuery query, CancellationToken ct)
        => Ok(await _mediator.Send(query, ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
        => Ok(await _mediator.Send(new GetOutboundByIdQuery(id), ct));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateOutboundRequest request, CancellationToken ct)
        => Ok(await _mediator.Send(new CreateOutboundCommand(request), ct));

    [HttpPost("{id:guid}/ship")]
    public async Task<IActionResult> Ship(Guid id, CancellationToken ct)
        => Ok(await _mediator.Send(new ShipOutboundCommand(id), ct));
}
