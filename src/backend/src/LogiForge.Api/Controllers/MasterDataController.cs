using LogiForge.Application.Customers.Commands;
using LogiForge.Application.Locations.Commands;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LogiForge.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1")]
public class MasterDataController : ControllerBase
{
    private readonly IMediator _mediator;
    public MasterDataController(IMediator mediator) => _mediator = mediator;

    [HttpGet("customers")]
    public async Task<IActionResult> Customers([FromQuery] string? search, CancellationToken ct)
        => Ok(await _mediator.Send(new GetCustomersQuery(search), ct));

    [HttpPost("customers")]
    public async Task<IActionResult> CreateCustomer([FromBody] UpsertCustomerRequest request, CancellationToken ct)
        => Ok(await _mediator.Send(new CreateCustomerCommand(request), ct));

    [HttpGet("locations")]
    public async Task<IActionResult> Locations([FromQuery] Guid? warehouseId, CancellationToken ct)
        => Ok(await _mediator.Send(new GetLocationsQuery(warehouseId), ct));

    [HttpPut("customers/{id:guid}")]
    public async Task<IActionResult> UpdateCustomer(Guid id, [FromBody] UpsertCustomerRequest request, CancellationToken ct)
        => Ok(await _mediator.Send(new UpdateCustomerCommand(id, request), ct));

    [HttpPost("locations")]
    public async Task<IActionResult> CreateLocation([FromBody] CreateLocationRequest request, CancellationToken ct)
        => Ok(await _mediator.Send(new CreateLocationCommand(request), ct));

    [HttpPut("locations/{id:guid}")]
    public async Task<IActionResult> UpdateLocation(Guid id, [FromBody] UpdateLocationRequest request, CancellationToken ct)
        => Ok(await _mediator.Send(new UpdateLocationCommand(id, request), ct));
}

