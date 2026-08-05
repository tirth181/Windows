using LogiForge.Application.Companies;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LogiForge.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1/companies")]
public class CompaniesController : ControllerBase
{
    private readonly IMediator _mediator;
    public CompaniesController(IMediator mediator) => _mediator = mediator;

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
        => Ok(await _mediator.Send(new GetCompaniesQuery(), ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> Get(Guid id, CancellationToken ct)
        => Ok(await _mediator.Send(new GetCompanyByIdQuery(id), ct));

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] UpsertCompanyRequest request, CancellationToken ct)
        => Ok(await _mediator.Send(new CreateCompanyCommand(request), ct));

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpsertCompanyRequest request, CancellationToken ct)
        => Ok(await _mediator.Send(new UpdateCompanyCommand(id, request), ct));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _mediator.Send(new DeleteCompanyCommand(id), ct);
        return NoContent();
    }
}
