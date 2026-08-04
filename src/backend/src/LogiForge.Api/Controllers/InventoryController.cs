using LogiForge.Application.Inventory.Dtos;
using LogiForge.Application.Inventory.Queries;
using LogiForge.Application.Reports.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LogiForge.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/inventory")]
public class InventoryController : ControllerBase
{
    private readonly IMediator _mediator;
    public InventoryController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> List([FromQuery] GetInventoryQuery query, CancellationToken ct)
        => Ok(await _mediator.Send(query, ct));

    [HttpPost("adjust")]
    public async Task<IActionResult> Adjust([FromBody] AdjustInventoryRequest request, CancellationToken ct)
        => Ok(await _mediator.Send(new AdjustInventoryCommand(request), ct));

    [HttpPost("transfer")]
    public async Task<IActionResult> Transfer([FromBody] TransferInventoryRequest request, CancellationToken ct)
        => Ok(await _mediator.Send(new TransferInventoryCommand(request), ct));

    [HttpGet("export")]
    public async Task<IActionResult> Export([FromQuery] Guid? warehouseId, CancellationToken ct)
    {
        var bytes = await _mediator.Send(new ExportReportQuery("inventory", "xlsx", warehouseId), ct);
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "inventory.xlsx");
    }
}
