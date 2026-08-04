using LogiForge.Domain.Common;
using LogiForge.Domain.Entities;
using LogiForge.Domain.Exceptions;
using LogiForge.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LogiForge.Application.Users.Commands;

public record UpdateUserRequest(string DisplayName, bool IsActive, IReadOnlyList<Guid>? RoleIds = null);
public record UpdateUserCommand(Guid Id, UpdateUserRequest Request) : IRequest<UserDto>;

public class UpdateUserCommandHandler : IRequestHandler<UpdateUserCommand, UserDto>
{
    private readonly IRepository<AppUser> _users;
    private readonly IRepository<Role> _roles;
    private readonly ITenantContext _tenant;
    private readonly IUnitOfWork _uow;
    private readonly IAuditService _audit;

    public UpdateUserCommandHandler(
        IRepository<AppUser> users, IRepository<Role> roles, ITenantContext tenant,
        IUnitOfWork uow, IAuditService audit)
    {
        _users = users; _roles = roles; _tenant = tenant; _uow = uow; _audit = audit;
    }

    public async Task<UserDto> Handle(UpdateUserCommand request, CancellationToken cancellationToken)
    {
        if (!_tenant.HasPermission(PermissionCodes.UsersEdit) && !_tenant.HasPermission(PermissionCodes.AdminFull))
            throw new ForbiddenException();

        var user = await _users.Query()
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .FirstOrDefaultAsync(u => u.Id == request.Id && u.CompanyId == _tenant.CompanyId, cancellationToken)
            ?? throw new NotFoundException(nameof(AppUser), request.Id);

        user.DisplayName = request.Request.DisplayName.Trim();
        user.IsActive = request.Request.IsActive;
        user.UpdatedBy = _tenant.UserId;

        if (request.Request.RoleIds is not null &&
            (_tenant.HasPermission(PermissionCodes.UsersAssignRoles) || _tenant.HasPermission(PermissionCodes.AdminFull)))
        {
            user.UserRoles.Clear();
            foreach (var roleId in request.Request.RoleIds.Distinct())
            {
                _ = await _roles.GetByIdAsync(roleId, cancellationToken)
                    ?? throw new NotFoundException(nameof(Role), roleId);
                user.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = roleId });
            }
        }

        _users.Update(user);
        await _uow.SaveChangesAsync(cancellationToken);
        await _audit.WriteAsync("users.update", nameof(AppUser), user.Id, null, new { user.DisplayName, user.IsActive }, cancellationToken);

        var roleNames = user.UserRoles.Select(ur => ur.Role!.Name).Distinct().ToList();
        return new UserDto(user.Id, user.Email, user.DisplayName, user.IsActive, roleNames);
    }
}
