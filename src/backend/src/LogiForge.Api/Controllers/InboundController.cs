using LogiForge.Application.Inbound.Commands;
using LogiForge.Application.Inbound.Dtos;
using LogiForge.Application.Inbound.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LogiForge.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/inbound")]
public class InboundController : ControllerBase
{
    private readonly IMediator _mediator;
    public InboundController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] GetInboundListQuery query, CancellationToken ct)
        => Ok(await _mediator.Send(query, ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
        => Ok(await _mediator.Send(new GetInboundByIdQuery(id), ct));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateInboundRequest request, CancellationToken ct)
        => Ok(await _mediator.Send(new CreateInboundCommand(request), ct));


    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] CreateInboundRequest request, CancellationToken ct)
        => Ok(await _mediator.Send(new UpdateInboundCommand(id, request), ct));
    [HttpPost("{id:guid}/receive")]
    public async Task<IActionResult> Receive(Guid id, CancellationToken ct)
        => Ok(await _mediator.Send(new ReceiveInboundCommand(id), ct));
}

