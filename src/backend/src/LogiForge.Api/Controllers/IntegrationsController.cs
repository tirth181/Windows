using LogiForge.Application.Integrations.Commands;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LogiForge.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/integrations")]
public class IntegrationsController : ControllerBase
{
    private readonly IMediator _mediator;
    public IntegrationsController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
        => Ok(await _mediator.Send(new GetIntegrationsQuery(), ct));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] UpsertIntegrationRequest request, CancellationToken ct)
        => Ok(await _mediator.Send(new CreateIntegrationCommand(request), ct));

    [HttpPut("{id:guid}/mappings")]
    public async Task<IActionResult> Mappings(Guid id, [FromBody] IReadOnlyList<FieldMappingInput> mappings, CancellationToken ct)
        => Ok(await _mediator.Send(new UpdateMappingsCommand(id, mappings), ct));
}
