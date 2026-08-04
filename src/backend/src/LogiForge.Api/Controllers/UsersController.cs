using LogiForge.Application.Users.Commands;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace LogiForge.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/v1")]
public class UsersController : ControllerBase
{
    private readonly IMediator _mediator;
    public UsersController(IMediator mediator) => _mediator = mediator;

    [HttpGet("users")]
    public async Task<IActionResult> Users(CancellationToken ct) => Ok(await _mediator.Send(new GetUsersQuery(), ct));

    [HttpPost("users")]
    public async Task<IActionResult> Create([FromBody] CreateUserRequest request, CancellationToken ct)
        => Ok(await _mediator.Send(new CreateUserCommand(request), ct));

    [HttpPut("users/{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateUserRequest request, CancellationToken ct)
        => Ok(await _mediator.Send(new UpdateUserCommand(id, request), ct));

    [HttpGet("roles")]
    public async Task<IActionResult> Roles(CancellationToken ct) => Ok(await _mediator.Send(new GetRolesQuery(), ct));

    [HttpGet("permissions")]
    public async Task<IActionResult> Permissions(CancellationToken ct) => Ok(await _mediator.Send(new GetPermissionsQuery(), ct));
}
