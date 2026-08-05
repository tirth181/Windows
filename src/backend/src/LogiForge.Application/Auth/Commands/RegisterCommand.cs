using System.Security.Cryptography;
using System.Text.RegularExpressions;
using LogiForge.Application.Auth.Dtos;
using LogiForge.Application.Common;
using LogiForge.Domain.Common;
using LogiForge.Domain.Entities;
using LogiForge.Domain.Enums;
using LogiForge.Domain.Exceptions;
using LogiForge.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace LogiForge.Application.Auth.Commands;

public record RegisterCommand(RegisterRequest Request) : IRequest<RegisterResponse>;

public class RegisterCommandHandler : IRequestHandler<RegisterCommand, RegisterResponse>
{
    private static readonly Regex CodeRegex = new("^[A-Z0-9]{2,20}$", RegexOptions.Compiled);

    private readonly IRepository<Company> _companies;
    private readonly IRepository<Warehouse> _warehouses;
    private readonly IRepository<AppUser> _users;
    private readonly IRepository<Role> _roles;
    private readonly IRepository<Permission> _permissions;
    private readonly IUnitOfWork _uow;
    private readonly IPasswordHasher _hasher;
    private readonly IAuthTokenService _tokens;
    private readonly IEmailService _email;
    private readonly AppOptions _app;

    public RegisterCommandHandler(
        IRepository<Company> companies,
        IRepository<Warehouse> warehouses,
        IRepository<AppUser> users,
        IRepository<Role> roles,
        IRepository<Permission> permissions,
        IUnitOfWork uow,
        IPasswordHasher hasher,
        IAuthTokenService tokens,
        IEmailService email,
        IOptions<AppOptions> app)
    {
        _companies = companies;
        _warehouses = warehouses;
        _users = users;
        _roles = roles;
        _permissions = permissions;
        _uow = uow;
        _hasher = hasher;
        _tokens = tokens;
        _email = email;
        _app = app.Value;
    }

    public async Task<RegisterResponse> Handle(RegisterCommand request, CancellationToken cancellationToken)
    {
        var r = request.Request;
        var email = r.Email.Trim().ToLowerInvariant();
        var code = r.CompanyCode.Trim().ToUpperInvariant();
        var companyName = r.CompanyName.Trim();
        var displayName = r.DisplayName.Trim();

        if (string.IsNullOrWhiteSpace(companyName) || companyName.Length < 2)
            throw new DomainException("invalid_company", "Company name is required.");
        if (!CodeRegex.IsMatch(code))
            throw new DomainException("invalid_code", "Company code must be 2–20 letters or numbers.");
        if (string.IsNullOrWhiteSpace(displayName))
            throw new DomainException("invalid_name", "Your name is required.");
        if (r.Password.Length < 12)
            throw new DomainException("password_policy", "Password must be at least 12 characters.");
        if (!email.Contains('@'))
            throw new DomainException("invalid_email", "Enter a valid work email.");

        if (await _users.Query().IgnoreQueryFilters().AnyAsync(u => u.Email == email && !u.IsDeleted, cancellationToken))
            throw new DomainException("duplicate_email", "An account with this email already exists.");
        if (await _companies.Query().IgnoreQueryFilters().AnyAsync(c => c.Code == code && !c.IsDeleted, cancellationToken))
            throw new DomainException("duplicate_code", "That company code is already taken.");

        var trialDays = Math.Clamp(_app.TrialDays, 1, 90);
        var company = new Company
        {
            Name = companyName,
            Code = code,
            Status = CompanyStatus.Trial,
            TrialEndsAt = DateTime.UtcNow.AddDays(trialDays),
            PlanCode = "trial",
            BillingEmail = email,
            BrandingJson = """{"primary":"#0B1F33","accent":"#D97706"}"""
        };
        await _companies.AddAsync(company, cancellationToken);

        var warehouse = new Warehouse
        {
            CompanyId = company.Id,
            Code = code,
            Name = companyName,
            Timezone = "UTC",
            IsActive = true
        };
        await _warehouses.AddAsync(warehouse, cancellationToken);

        var perms = await _permissions.Query().ToListAsync(cancellationToken);
        if (perms.Count == 0)
            throw new DomainException("not_ready", "Platform permissions are not seeded yet. Contact support.");

        var adminRole = new Role
        {
            CompanyId = company.Id,
            Name = "Company Administrator",
            IsSystem = true,
            Description = "Full company access"
        };
        var floorRole = new Role
        {
            CompanyId = company.Id,
            Name = "3PL Company Associate",
            IsSystem = true,
            Description = "Floor receiving and shipping"
        };
        await _roles.AddAsync(adminRole, cancellationToken);
        await _roles.AddAsync(floorRole, cancellationToken);

        foreach (var p in perms.Where(p => p.Code != PermissionCodes.PlatformAdmin))
            adminRole.RolePermissions.Add(new RolePermission { RoleId = adminRole.Id, PermissionId = p.Id });

        foreach (var codePerm in new[]
                 {
                     PermissionCodes.DashboardView, PermissionCodes.InboundView, PermissionCodes.InboundCreate,
                     PermissionCodes.InboundApprove, PermissionCodes.InventoryView, PermissionCodes.OutboundView,
                     PermissionCodes.OutboundCreate, PermissionCodes.OutboundShip, PermissionCodes.AiUse
                 })
        {
            var p = perms.FirstOrDefault(x => x.Code == codePerm);
            if (p is not null)
                floorRole.RolePermissions.Add(new RolePermission { RoleId = floorRole.Id, PermissionId = p.Id });
        }

        var requireVerify = _app.RequireEmailVerification;
        var verifyToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        var user = new AppUser
        {
            CompanyId = company.Id,
            Email = email,
            DisplayName = displayName,
            PasswordHash = _hasher.Hash(r.Password),
            AuthProvider = AuthProvider.Local,
            IsActive = true,
            EmailVerified = !requireVerify,
            EmailVerificationToken = requireVerify ? verifyToken : null,
            EmailVerificationExpiresAt = requireVerify ? DateTime.UtcNow.AddDays(2) : null
        };
        user.UserRoles.Add(new UserRole { UserId = user.Id, RoleId = adminRole.Id });
        await _users.AddAsync(user, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);

        if (requireVerify)
        {
            var link = $"{_app.PublicWebBaseUrl.TrimEnd('/')}/verify-email?token={Uri.EscapeDataString(verifyToken)}";
            await _email.SendNowAsync(
                company.Id,
                "auth.verify",
                email,
                "Verify your LogiForge email",
                $"""
                <p>Welcome to LogiForge, {System.Net.WebUtility.HtmlEncode(displayName)}.</p>
                <p>Confirm your email to activate <strong>{System.Net.WebUtility.HtmlEncode(companyName)}</strong> and start your {trialDays}-day trial.</p>
                <p><a href="{link}">Verify email</a></p>
                <p>This link expires in 48 hours.</p>
                """,
                cancellationToken);

            return new RegisterResponse(
                company.Id,
                user.Id,
                email,
                true,
                "Account created. Check your email to verify before signing in.",
                null);
        }

        var permissions = PermissionCodes.Catalog
            .Where(p => p.Code != PermissionCodes.PlatformAdmin)
            .Select(p => p.Code)
            .ToList();
        var (access, refresh, expires) = _tokens.IssueTokens(user, permissions);
        user.Company = company;
        var profile = AuthProfileFactory.FromUser(user, permissions, Array.Empty<WarehouseOptionDto>());
        return new RegisterResponse(
            company.Id,
            user.Id,
            email,
            false,
            $"Welcome! Your {trialDays}-day trial has started.",
            new LoginResponse(access, refresh, expires, profile));
    }
}
