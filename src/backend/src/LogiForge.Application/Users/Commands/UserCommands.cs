using LogiForge.Domain.Common;
using LogiForge.Domain.Entities;
using LogiForge.Domain.Enums;
using LogiForge.Domain.Exceptions;
using LogiForge.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using LogiForge.Application.Auth.Commands;

namespace LogiForge.Application.Users.Commands;

public record UserDto(Guid Id, string Email, string DisplayName, bool IsActive, IReadOnlyList<string> Roles);
public record CreateUserRequest(string Email, string DisplayName, string Password, IReadOnlyList<Guid> RoleIds, Guid? WarehouseId);
public record CreateUserCommand(CreateUserRequest Request) : IRequest<UserDto>;
public record GetUsersQuery : IRequest<IReadOnlyList<UserDto>>;
public record GetRolesQuery : IRequest<IReadOnlyList<RoleDto>>;
public record RoleDto(Guid Id, string Name, string? Description, IReadOnlyList<string> Permissions);
public record GetPermissionsQuery : IRequest<IReadOnlyList<PermissionDto>>;
public record PermissionDto(string Code, string Module, string Action, string Description);

public class CreateUserCommandHandler : IRequestHandler<CreateUserCommand, UserDto>
{
    private readonly IRepository<AppUser> _users;
    private readonly IRepository<Role> _roles;
    private readonly ITenantContext _tenant;
    private readonly IUnitOfWork _uow;
    private readonly IPasswordHasher _hasher;
    private readonly IAuditService _audit;

    public CreateUserCommandHandler(
        IRepository<AppUser> users, IRepository<Role> roles, ITenantContext tenant,
        IUnitOfWork uow, IPasswordHasher hasher, IAuditService audit)
    {
        _users = users; _roles = roles; _tenant = tenant; _uow = uow; _hasher = hasher; _audit = audit;
    }

    public async Task<UserDto> Handle(CreateUserCommand request, CancellationToken cancellationToken)
    {
        if (!_tenant.HasPermission(PermissionCodes.UsersCreate) && !_tenant.HasPermission(PermissionCodes.AdminFull))
            throw new ForbiddenException();
        if (_tenant.CompanyId is null) throw new ForbiddenException();

        var email = request.Request.Email.Trim().ToLowerInvariant();
        if (await _users.Query().AnyAsync(u => u.Email == email, cancellationToken))
            throw new DomainException("duplicate_email", "A user with this email already exists.");

        if (request.Request.Password.Length < 12)
            throw new DomainException("password_policy", "Password must be at least 12 characters.");

        var user = new AppUser
        {
            CompanyId = _tenant.CompanyId,
            Email = email,
            DisplayName = request.Request.DisplayName.Trim(),
            PasswordHash = _hasher.Hash(request.Request.Password),
            AuthProvider = AuthProvider.Local,
            IsActive = true,
            CreatedBy = _tenant.UserId
        };

        foreach (var roleId in request.Request.RoleIds.Distinct())
        {
            var role = await _roles.GetByIdAsync(roleId, cancellationToken)
                ?? throw new NotFoundException(nameof(Role), roleId);
            user.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = role.Id, WarehouseId = request.Request.WarehouseId });
        }

        await _users.AddAsync(user, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);
        await _audit.WriteAsync("users.create", nameof(AppUser), user.Id, null, new { user.Email, user.DisplayName }, cancellationToken);

        var roleNames = await _roles.Query().Where(r => request.Request.RoleIds.Contains(r.Id)).Select(r => r.Name).ToListAsync(cancellationToken);
        return new UserDto(user.Id, user.Email, user.DisplayName, user.IsActive, roleNames);
    }
}

public class GetUsersQueryHandler : IRequestHandler<GetUsersQuery, IReadOnlyList<UserDto>>
{
    private readonly IRepository<AppUser> _users;
    private readonly ITenantContext _tenant;

    public GetUsersQueryHandler(IRepository<AppUser> users, ITenantContext tenant)
    {
        _users = users; _tenant = tenant;
    }

    public async Task<IReadOnlyList<UserDto>> Handle(GetUsersQuery request, CancellationToken cancellationToken)
    {
        if (!_tenant.HasPermission(PermissionCodes.UsersView) && !_tenant.HasPermission(PermissionCodes.AdminFull))
            throw new ForbiddenException();

        var users = await _users.Query()
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role)
            .Where(u => u.CompanyId == _tenant.CompanyId)
            .OrderBy(u => u.DisplayName)
            .ToListAsync(cancellationToken);

        return users.Select(u => new UserDto(
            u.Id, u.Email, u.DisplayName, u.IsActive,
            u.UserRoles.Select(ur => ur.Role!.Name).Distinct().ToList())).ToList();
    }
}

public class GetRolesQueryHandler : IRequestHandler<GetRolesQuery, IReadOnlyList<RoleDto>>
{
    private readonly IRepository<Role> _roles;
    private readonly ITenantContext _tenant;

    public GetRolesQueryHandler(IRepository<Role> roles, ITenantContext tenant)
    {
        _roles = roles; _tenant = tenant;
    }

    public async Task<IReadOnlyList<RoleDto>> Handle(GetRolesQuery request, CancellationToken cancellationToken)
    {
        if (!_tenant.HasPermission(PermissionCodes.RolesView) && !_tenant.HasPermission(PermissionCodes.AdminFull))
            throw new ForbiddenException();

        var roles = await _roles.Query()
            .Include(r => r.RolePermissions).ThenInclude(rp => rp.Permission)
            .Where(r => r.CompanyId == null || r.CompanyId == _tenant.CompanyId)
            .OrderBy(r => r.Name)
            .ToListAsync(cancellationToken);

        return roles.Select(r => new RoleDto(
            r.Id, r.Name, r.Description,
            r.RolePermissions.Select(rp => rp.Permission!.Code).ToList())).ToList();
    }
}

public class GetPermissionsQueryHandler : IRequestHandler<GetPermissionsQuery, IReadOnlyList<PermissionDto>>
{
    public Task<IReadOnlyList<PermissionDto>> Handle(GetPermissionsQuery request, CancellationToken cancellationToken)
        => Task.FromResult<IReadOnlyList<PermissionDto>>(
            PermissionCodes.Catalog.Select(p => new PermissionDto(p.Code, p.Module, p.Action, p.Description)).ToList());
}
