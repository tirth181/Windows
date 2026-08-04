using System.Text.Json;
using LogiForge.Domain.Common;
using LogiForge.Domain.Entities;
using LogiForge.Domain.Enums;
using LogiForge.Domain.Exceptions;
using LogiForge.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LogiForge.Application.Companies;

public record CompanyDto(
    Guid Id,
    string Name,
    string Code,
    string Status,
    string? LegalName,
    string? PrimaryContactEmail,
    string? Timezone);

public record UpsertCompanyRequest(
    string Name,
    string Code,
    string Status = "Active",
    string? LegalName = null,
    string? PrimaryContactEmail = null,
    string? Timezone = null);

public record GetCompaniesQuery : IRequest<IReadOnlyList<CompanyDto>>;
public record GetCompanyByIdQuery(Guid Id) : IRequest<CompanyDto>;
public record CreateCompanyCommand(UpsertCompanyRequest Request) : IRequest<CompanyDto>;
public record UpdateCompanyCommand(Guid Id, UpsertCompanyRequest Request) : IRequest<CompanyDto>;
public record DeleteCompanyCommand(Guid Id) : IRequest<Unit>;

internal static class CompanyMapping
{
    private record Settings(string? LegalName, string? PrimaryContactEmail, string? Timezone);

    public static CompanyDto ToDto(Company c)
    {
        Settings? s = null;
        if (!string.IsNullOrWhiteSpace(c.SettingsJson))
        {
            try { s = JsonSerializer.Deserialize<Settings>(c.SettingsJson); }
            catch { /* ignore */ }
        }
        return new CompanyDto(
            c.Id, c.Name, c.Code, c.Status.ToString(),
            s?.LegalName, s?.PrimaryContactEmail, s?.Timezone ?? "UTC");
    }

    public static string ToSettingsJson(UpsertCompanyRequest r) =>
        JsonSerializer.Serialize(new Settings(r.LegalName, r.PrimaryContactEmail, r.Timezone ?? "UTC"));

    public static CompanyStatus ParseStatus(string? status) =>
        Enum.TryParse<CompanyStatus>(status, true, out var s) ? s : CompanyStatus.Active;
}

public class GetCompaniesQueryHandler : IRequestHandler<GetCompaniesQuery, IReadOnlyList<CompanyDto>>
{
    private readonly IRepository<Company> _companies;
    private readonly ITenantContext _tenant;

    public GetCompaniesQueryHandler(IRepository<Company> companies, ITenantContext tenant)
    {
        _companies = companies; _tenant = tenant;
    }

    public async Task<IReadOnlyList<CompanyDto>> Handle(GetCompaniesQuery request, CancellationToken cancellationToken)
    {
        if (!_tenant.HasPermission(PermissionCodes.CompanyView) && !_tenant.HasPermission(PermissionCodes.AdminFull)
            && !_tenant.HasPermission(PermissionCodes.PlatformAdmin))
            throw new ForbiddenException();

        var q = _companies.Query().AsQueryable();
        // Non-platform admins only see their own company unless they have admin.full for multi-company ops
        if (!_tenant.IsPlatformAdmin && !_tenant.HasPermission(PermissionCodes.PlatformAdmin)
            && !_tenant.HasPermission(PermissionCodes.AdminFull) && _tenant.CompanyId is not null)
        {
            q = q.Where(c => c.Id == _tenant.CompanyId);
        }

        var rows = await q.OrderBy(c => c.Name).ToListAsync(cancellationToken);
        return rows.Select(CompanyMapping.ToDto).ToList();
    }
}

public class GetCompanyByIdQueryHandler : IRequestHandler<GetCompanyByIdQuery, CompanyDto>
{
    private readonly IRepository<Company> _companies;
    private readonly ITenantContext _tenant;

    public GetCompanyByIdQueryHandler(IRepository<Company> companies, ITenantContext tenant)
    {
        _companies = companies; _tenant = tenant;
    }

    public async Task<CompanyDto> Handle(GetCompanyByIdQuery request, CancellationToken cancellationToken)
    {
        if (!_tenant.HasPermission(PermissionCodes.CompanyView) && !_tenant.HasPermission(PermissionCodes.AdminFull)
            && !_tenant.HasPermission(PermissionCodes.PlatformAdmin))
            throw new ForbiddenException();

        var entity = await _companies.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Company), request.Id);
        return CompanyMapping.ToDto(entity);
    }
}

public class CreateCompanyCommandHandler : IRequestHandler<CreateCompanyCommand, CompanyDto>
{
    private readonly IRepository<Company> _companies;
    private readonly ITenantContext _tenant;
    private readonly IUnitOfWork _uow;
    private readonly IAuditService _audit;

    public CreateCompanyCommandHandler(IRepository<Company> companies, ITenantContext tenant, IUnitOfWork uow, IAuditService audit)
    {
        _companies = companies; _tenant = tenant; _uow = uow; _audit = audit;
    }

    public async Task<CompanyDto> Handle(CreateCompanyCommand request, CancellationToken cancellationToken)
    {
        if (!_tenant.HasPermission(PermissionCodes.CompanyEdit) && !_tenant.HasPermission(PermissionCodes.AdminFull)
            && !_tenant.HasPermission(PermissionCodes.PlatformAdmin))
            throw new ForbiddenException();

        var code = request.Request.Code.Trim().ToUpperInvariant();
        if (await _companies.Query().AnyAsync(c => c.Code == code, cancellationToken))
            throw new DomainException("duplicate_code", "A 3PL company with this code already exists.");

        var entity = new Company
        {
            Name = request.Request.Name.Trim(),
            Code = code,
            Status = CompanyMapping.ParseStatus(request.Request.Status),
            SettingsJson = CompanyMapping.ToSettingsJson(request.Request),
            CreatedBy = _tenant.UserId
        };
        await _companies.AddAsync(entity, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);
        await _audit.WriteAsync("companies.create", nameof(Company), entity.Id, null, new { entity.Code, entity.Name }, cancellationToken);
        return CompanyMapping.ToDto(entity);
    }
}

public class UpdateCompanyCommandHandler : IRequestHandler<UpdateCompanyCommand, CompanyDto>
{
    private readonly IRepository<Company> _companies;
    private readonly ITenantContext _tenant;
    private readonly IUnitOfWork _uow;
    private readonly IAuditService _audit;

    public UpdateCompanyCommandHandler(IRepository<Company> companies, ITenantContext tenant, IUnitOfWork uow, IAuditService audit)
    {
        _companies = companies; _tenant = tenant; _uow = uow; _audit = audit;
    }

    public async Task<CompanyDto> Handle(UpdateCompanyCommand request, CancellationToken cancellationToken)
    {
        if (!_tenant.HasPermission(PermissionCodes.CompanyEdit) && !_tenant.HasPermission(PermissionCodes.AdminFull)
            && !_tenant.HasPermission(PermissionCodes.PlatformAdmin))
            throw new ForbiddenException();

        var entity = await _companies.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Company), request.Id);

        var code = request.Request.Code.Trim().ToUpperInvariant();
        if (await _companies.Query().AnyAsync(c => c.Code == code && c.Id != entity.Id, cancellationToken))
            throw new DomainException("duplicate_code", "A 3PL company with this code already exists.");

        entity.Name = request.Request.Name.Trim();
        entity.Code = code;
        entity.Status = CompanyMapping.ParseStatus(request.Request.Status);
        entity.SettingsJson = CompanyMapping.ToSettingsJson(request.Request);
        entity.UpdatedBy = _tenant.UserId;
        _companies.Update(entity);
        await _uow.SaveChangesAsync(cancellationToken);
        await _audit.WriteAsync("companies.update", nameof(Company), entity.Id, null, new { entity.Code, entity.Name, entity.Status }, cancellationToken);
        return CompanyMapping.ToDto(entity);
    }
}

public class DeleteCompanyCommandHandler : IRequestHandler<DeleteCompanyCommand, Unit>
{
    private readonly IRepository<Company> _companies;
    private readonly ITenantContext _tenant;
    private readonly IUnitOfWork _uow;
    private readonly IAuditService _audit;

    public DeleteCompanyCommandHandler(IRepository<Company> companies, ITenantContext tenant, IUnitOfWork uow, IAuditService audit)
    {
        _companies = companies; _tenant = tenant; _uow = uow; _audit = audit;
    }

    public async Task<Unit> Handle(DeleteCompanyCommand request, CancellationToken cancellationToken)
    {
        if (!_tenant.HasPermission(PermissionCodes.CompanyEdit) && !_tenant.HasPermission(PermissionCodes.AdminFull)
            && !_tenant.HasPermission(PermissionCodes.PlatformAdmin))
            throw new ForbiddenException();

        var entity = await _companies.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Company), request.Id);

        if (_tenant.CompanyId == entity.Id)
            throw new DomainException("cannot_delete_self", "You cannot remove the company you are currently signed into.");

        entity.Status = CompanyStatus.Suspended;
        _companies.Remove(entity);
        await _uow.SaveChangesAsync(cancellationToken);
        await _audit.WriteAsync("companies.delete", nameof(Company), entity.Id, new { entity.Code, entity.Name }, null, cancellationToken);
        return Unit.Value;
    }
}
