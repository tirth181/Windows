using LogiForge.Application.Auth.Dtos;
using LogiForge.Domain.Entities;
using LogiForge.Domain.Exceptions;
using LogiForge.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LogiForge.Application.Auth.Commands;

public record LoginCommand(string Email, string Password, string? IpAddress, string? UserAgent) : IRequest<LoginResponse>;

public interface IAuthTokenService
{
    (string AccessToken, string RefreshToken, DateTime ExpiresAt) IssueTokens(AppUser user, IEnumerable<string> permissions);
    Task<LoginResponse?> RefreshAsync(string refreshToken, CancellationToken ct = default);
}

public interface IPasswordHasher
{
    string Hash(string password);
    bool Verify(string password, string hash);
}

public class LoginCommandHandler : IRequestHandler<LoginCommand, LoginResponse>
{
    private readonly IRepository<AppUser> _users;
    private readonly IRepository<LoginHistory> _loginHistory;
    private readonly IUnitOfWork _uow;
    private readonly IPasswordHasher _hasher;
    private readonly IAuthTokenService _tokens;

    public LoginCommandHandler(
        IRepository<AppUser> users,
        IRepository<LoginHistory> loginHistory,
        IUnitOfWork uow,
        IPasswordHasher hasher,
        IAuthTokenService tokens)
    {
        _users = users;
        _loginHistory = loginHistory;
        _uow = uow;
        _hasher = hasher;
        _tokens = tokens;
    }

    public async Task<LoginResponse> Handle(LoginCommand request, CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();
        var user = await _users.Query()
            .Include(u => u.Company)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Role!).ThenInclude(r => r.RolePermissions).ThenInclude(rp => rp.Permission)
            .Include(u => u.UserRoles).ThenInclude(ur => ur.Warehouse)
            .FirstOrDefaultAsync(u => u.Email == email && !u.IsDeleted, cancellationToken);

        async Task Fail(string reason)
        {
            await _loginHistory.AddAsync(new LoginHistory
            {
                UserId = user?.Id,
                CompanyId = user?.CompanyId,
                Email = email,
                IpAddress = request.IpAddress,
                UserAgent = request.UserAgent,
                Success = false,
                FailureReason = reason
            }, cancellationToken);
            await _uow.SaveChangesAsync(cancellationToken);
        }

        if (user is null || string.IsNullOrEmpty(user.PasswordHash) || !_hasher.Verify(request.Password, user.PasswordHash))
        {
            await Fail("Invalid credentials");
            throw new DomainException("invalid_credentials", "Invalid email or password.");
        }

        if (!user.IsActive)
        {
            await Fail("Inactive account");
            throw new DomainException("inactive", "Account is inactive.");
        }

        if (user.LockoutEnd is not null && user.LockoutEnd > DateTime.UtcNow)
        {
            await Fail("Locked out");
            throw new DomainException("locked", "Account is temporarily locked.");
        }

        var permissions = user.IsPlatformAdmin
            ? Domain.Common.PermissionCodes.Catalog.Select(p => p.Code).ToList()
            : user.UserRoles
                .SelectMany(ur => ur.Role?.RolePermissions ?? Enumerable.Empty<RolePermission>())
                .Select(rp => rp.Permission!.Code)
                .Distinct()
                .ToList();

        if (user.UserRoles.Any(ur => ur.Role?.RolePermissions.Any(rp => rp.Permission?.Code == Domain.Common.PermissionCodes.AdminFull) == true))
        {
            permissions = Domain.Common.PermissionCodes.Catalog
                .Where(p => p.Code != Domain.Common.PermissionCodes.PlatformAdmin)
                .Select(p => p.Code)
                .Distinct()
                .ToList();
        }

        var warehouses = user.UserRoles
            .Where(ur => ur.Warehouse is not null)
            .Select(ur => new WarehouseOptionDto(ur.Warehouse!.Id, ur.Warehouse.Code, ur.Warehouse.Name))
            .DistinctBy(w => w.Id)
            .ToList();

        user.FailedLoginAttempts = 0;
        user.LastLoginAt = DateTime.UtcNow;
        _users.Update(user);

        await _loginHistory.AddAsync(new LoginHistory
        {
            UserId = user.Id,
            CompanyId = user.CompanyId,
            Email = email,
            IpAddress = request.IpAddress,
            UserAgent = request.UserAgent,
            Success = true
        }, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        var (access, refresh, expires) = _tokens.IssueTokens(user, permissions);
        return new LoginResponse(access, refresh, expires, new UserProfileDto(
            user.Id, user.Email, user.DisplayName, user.CompanyId, user.Company?.Name,
            user.IsPlatformAdmin, permissions, warehouses));
    }
}
