using LogiForge.Application.Reports.Queries;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LogiForge.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/reports")]
public class ReportsController : ControllerBase
{
    private readonly IMediator _mediator;
    public ReportsController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> Catalog(CancellationToken ct)
        => Ok(await _mediator.Send(new GetReportCatalogQuery(), ct));

    [HttpGet("{code}/export")]
    public async Task<IActionResult> Export(string code, [FromQuery] Guid? warehouseId, CancellationToken ct)
    {
        var bytes = await _mediator.Send(new ExportReportQuery(code, "xlsx", warehouseId), ct);
        return File(bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", $"{code}.xlsx");
    }
}
