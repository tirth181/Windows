using LogiForge.Domain.Common;
using LogiForge.Domain.Entities;
using LogiForge.Domain.Exceptions;
using LogiForge.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LogiForge.Application.Locations.Commands;

public record LocationDto(Guid Id, Guid WarehouseId, string Code, string? Zone, string? Aisle, string? Rack, string? Bin, bool IsActive);
public record CreateLocationRequest(Guid WarehouseId, string Code, string? Zone, string? Aisle, string? Rack, string? Bin);
public record CreateLocationCommand(CreateLocationRequest Request) : IRequest<LocationDto>;
public record GetLocationsQuery(Guid? WarehouseId = null) : IRequest<IReadOnlyList<LocationDto>>;

public class CreateLocationCommandHandler : IRequestHandler<CreateLocationCommand, LocationDto>
{
    private readonly IRepository<StorageLocation> _locations;
    private readonly ITenantContext _tenant;
    private readonly IUnitOfWork _uow;

    public CreateLocationCommandHandler(IRepository<StorageLocation> locations, ITenantContext tenant, IUnitOfWork uow)
    {
        _locations = locations; _tenant = tenant; _uow = uow;
    }

    public async Task<LocationDto> Handle(CreateLocationCommand request, CancellationToken cancellationToken)
    {
        if (!_tenant.HasPermission(PermissionCodes.LocationsManage) && !_tenant.HasPermission(PermissionCodes.AdminFull))
            throw new ForbiddenException();
        if (_tenant.CompanyId is null) throw new ForbiddenException();

        var entity = new StorageLocation
        {
            CompanyId = _tenant.CompanyId.Value,
            WarehouseId = request.Request.WarehouseId,
            Code = request.Request.Code.Trim(),
            Zone = request.Request.Zone,
            Aisle = request.Request.Aisle,
            Rack = request.Request.Rack,
            Bin = request.Request.Bin,
            CreatedBy = _tenant.UserId
        };
        await _locations.AddAsync(entity, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);
        return new LocationDto(entity.Id, entity.WarehouseId, entity.Code, entity.Zone, entity.Aisle, entity.Rack, entity.Bin, entity.IsActive);
    }
}

public class GetLocationsQueryHandler : IRequestHandler<GetLocationsQuery, IReadOnlyList<LocationDto>>
{
    private readonly IRepository<StorageLocation> _locations;
    private readonly ITenantContext _tenant;

    public GetLocationsQueryHandler(IRepository<StorageLocation> locations, ITenantContext tenant)
    {
        _locations = locations; _tenant = tenant;
    }

    public async Task<IReadOnlyList<LocationDto>> Handle(GetLocationsQuery request, CancellationToken cancellationToken)
    {
        if (!_tenant.HasPermission(PermissionCodes.LocationsView) && !_tenant.HasPermission(PermissionCodes.AdminFull))
            throw new ForbiddenException();
        var q = _locations.Query().AsQueryable();
        if (request.WarehouseId is not null) q = q.Where(l => l.WarehouseId == request.WarehouseId);
        return await q.OrderBy(l => l.Code)
            .Select(l => new LocationDto(l.Id, l.WarehouseId, l.Code, l.Zone, l.Aisle, l.Rack, l.Bin, l.IsActive))
            .ToListAsync(cancellationToken);
    }
}
