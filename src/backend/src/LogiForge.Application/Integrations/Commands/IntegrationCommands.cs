using LogiForge.Domain.Common;
using LogiForge.Domain.Entities;
using LogiForge.Domain.Enums;
using LogiForge.Domain.Exceptions;
using LogiForge.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LogiForge.Application.Integrations.Commands;

public record IntegrationDto(Guid Id, string Name, IntegrationType Type, string Status, DateTime? LastSyncAt, IReadOnlyList<FieldMappingDto> Mappings);
public record FieldMappingDto(Guid Id, string ExternalField, string InternalField, string? Transform);
public record UpsertIntegrationRequest(string Name, IntegrationType Type, string ConfigJson);
public record CreateIntegrationCommand(UpsertIntegrationRequest Request) : IRequest<IntegrationDto>;
public record UpdateMappingsCommand(Guid IntegrationId, IReadOnlyList<FieldMappingInput> Mappings) : IRequest<IntegrationDto>;
public record FieldMappingInput(string ExternalField, string InternalField, string? Transform);
public record GetIntegrationsQuery : IRequest<IReadOnlyList<IntegrationDto>>;

public class CreateIntegrationCommandHandler : IRequestHandler<CreateIntegrationCommand, IntegrationDto>
{
    private readonly IRepository<Integration> _integrations;
    private readonly ITenantContext _tenant;
    private readonly IUnitOfWork _uow;

    public CreateIntegrationCommandHandler(IRepository<Integration> integrations, ITenantContext tenant, IUnitOfWork uow)
    {
        _integrations = integrations; _tenant = tenant; _uow = uow;
    }

    public async Task<IntegrationDto> Handle(CreateIntegrationCommand request, CancellationToken cancellationToken)
    {
        if (!_tenant.HasPermission(PermissionCodes.IntegrationsManage) && !_tenant.HasPermission(PermissionCodes.AdminFull))
            throw new ForbiddenException();
        if (_tenant.CompanyId is null) throw new ForbiddenException();

        var entity = new Integration
        {
            CompanyId = _tenant.CompanyId.Value,
            Name = request.Request.Name.Trim(),
            Type = request.Request.Type,
            ConfigJson = request.Request.ConfigJson,
            Status = "Configured",
            CreatedBy = _tenant.UserId
        };
        await _integrations.AddAsync(entity, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);
        return new IntegrationDto(entity.Id, entity.Name, entity.Type, entity.Status, entity.LastSyncAt, []);
    }
}

public class UpdateMappingsCommandHandler : IRequestHandler<UpdateMappingsCommand, IntegrationDto>
{
    private readonly IRepository<Integration> _integrations;
    private readonly ITenantContext _tenant;
    private readonly IUnitOfWork _uow;

    public UpdateMappingsCommandHandler(IRepository<Integration> integrations, ITenantContext tenant, IUnitOfWork uow)
    {
        _integrations = integrations; _tenant = tenant; _uow = uow;
    }

    public async Task<IntegrationDto> Handle(UpdateMappingsCommand request, CancellationToken cancellationToken)
    {
        if (!_tenant.HasPermission(PermissionCodes.IntegrationsManage) && !_tenant.HasPermission(PermissionCodes.AdminFull))
            throw new ForbiddenException();

        var entity = await _integrations.Query().Include(i => i.FieldMappings)
            .FirstOrDefaultAsync(i => i.Id == request.IntegrationId, cancellationToken)
            ?? throw new NotFoundException(nameof(Integration), request.IntegrationId);

        entity.FieldMappings.Clear();
        foreach (var m in request.Mappings)
        {
            entity.FieldMappings.Add(new FieldMapping
            {
                CompanyId = entity.CompanyId,
                IntegrationId = entity.Id,
                ExternalField = m.ExternalField,
                InternalField = m.InternalField,
                Transform = m.Transform
            });
        }
        await _uow.SaveChangesAsync(cancellationToken);
        return new IntegrationDto(entity.Id, entity.Name, entity.Type, entity.Status, entity.LastSyncAt,
            entity.FieldMappings.Select(m => new FieldMappingDto(m.Id, m.ExternalField, m.InternalField, m.Transform)).ToList());
    }
}

public class GetIntegrationsQueryHandler : IRequestHandler<GetIntegrationsQuery, IReadOnlyList<IntegrationDto>>
{
    private readonly IRepository<Integration> _integrations;
    private readonly ITenantContext _tenant;

    public GetIntegrationsQueryHandler(IRepository<Integration> integrations, ITenantContext tenant)
    {
        _integrations = integrations; _tenant = tenant;
    }

    public async Task<IReadOnlyList<IntegrationDto>> Handle(GetIntegrationsQuery request, CancellationToken cancellationToken)
    {
        if (!_tenant.HasPermission(PermissionCodes.IntegrationsManage) && !_tenant.HasPermission(PermissionCodes.AdminFull))
            throw new ForbiddenException();

        var items = await _integrations.Query().Include(i => i.FieldMappings).OrderBy(i => i.Name).ToListAsync(cancellationToken);
        return items.Select(i => new IntegrationDto(i.Id, i.Name, i.Type, i.Status, i.LastSyncAt,
            i.FieldMappings.Select(m => new FieldMappingDto(m.Id, m.ExternalField, m.InternalField, m.Transform)).ToList())).ToList();
    }
}
