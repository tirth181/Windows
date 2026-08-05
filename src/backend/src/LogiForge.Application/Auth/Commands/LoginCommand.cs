using LogiForge.Application.Auth.Dtos;
using LogiForge.Domain.Entities;
using LogiForge.Domain.Enums;
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

public static class AuthProfileFactory
{
    public static UserProfileDto FromUser(AppUser user, IReadOnlyList<string> permissions, IReadOnlyList<WarehouseOptionDto> warehouses)
        => new(
            user.Id,
            user.Email,
            user.DisplayName,
            user.CompanyId,
            user.Company?.Name,
            user.IsPlatformAdmin,
            permissions,
            warehouses,
            user.EmailVerified,
            user.Company?.Status.ToString(),
            user.Company?.PlanCode,
            user.Company?.TrialEndsAt);
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

        async Task Fail(string reason, bool bumpLockout = false)
        {
            if (bumpLockout && user is not null)
            {
                user.FailedLoginAttempts += 1;
                if (user.FailedLoginAttempts >= 5)
                    user.LockoutEnd = DateTime.UtcNow.AddMinutes(15);
                _users.Update(user);
            }

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
            await Fail("Invalid credentials", bumpLockout: user is not null);
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
            throw new DomainException("locked", "Account is temporarily locked. Try again later.");
        }

        if (!user.IsPlatformAdmin && !user.EmailVerified)
        {
            await Fail("Email not verified");
            throw new DomainException("email_unverified", "Verify your email before signing in. Check your inbox for the link.");
        }

        // Suspended / expired-trial tenants may still sign in so they can open Billing.
        if (!user.IsPlatformAdmin && user.Company is not null
            && SyncTrialExpiry(user.Company))
        {
            await _uow.SaveChangesAsync(cancellationToken);
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
        user.LockoutEnd = null;
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
        return new LoginResponse(access, refresh, expires, AuthProfileFactory.FromUser(user, permissions, warehouses));
    }

    /// <summary>Sync trial expiry without blocking (for /me and billing). Returns true when mutated.</summary>
    public static bool SyncTrialExpiry(Company company)
    {
        if (company.Status == CompanyStatus.Trial
            && company.TrialEndsAt is not null
            && company.TrialEndsAt < DateTime.UtcNow)
        {
            company.Status = CompanyStatus.Suspended;
            return true;
        }
        return false;
    }
}
