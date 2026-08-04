using LogiForge.Application.Auth.Dtos;
using LogiForge.Domain.Entities;
using LogiForge.Domain.Exceptions;
using LogiForge.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LogiForge.Application.Auth.Queries;

public record GetCurrentUserQuery : IRequest<UserProfileDto>;

public class GetCurrentUserQueryHandler : IRequestHandler<GetCurrentUserQuery, UserProfileDto>
{
    private readonly ICurrentUserService _current;
    private readonly IRepository<AppUser> _users;

    public GetCurrentUserQueryHandler(ICurrentUserService current, IRepository<AppUser> users)
    {
        _current = current;
        _users = users;
    }

    public async Task<UserProfileDto> Handle(GetCurrentUserQuery request, CancellationToken cancellationToken)
    {
        if (_current.UserId is null) throw new ForbiddenException();

        var user = await _users.Query()
            .Include(u => u.Company)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Warehouse)
            .FirstOrDefaultAsync(u => u.Id == _current.UserId, cancellationToken)
            ?? throw new NotFoundException(nameof(AppUser), _current.UserId);

        var warehouses = user.UserRoles
            .Where(ur => ur.Warehouse is not null)
            .Select(ur => new WarehouseOptionDto(ur.Warehouse!.Id, ur.Warehouse.Code, ur.Warehouse.Name))
            .DistinctBy(w => w.Id)
            .ToList();

        return new UserProfileDto(
            user.Id, user.Email, user.DisplayName, user.CompanyId, user.Company?.Name,
            user.IsPlatformAdmin, _current.Permissions.ToList(), warehouses);
    }
}
