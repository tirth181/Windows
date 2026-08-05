using LogiForge.Domain.Common;
using LogiForge.Domain.Entities;
using LogiForge.Domain.Exceptions;
using LogiForge.Domain.Interfaces;
using MediatR;

namespace LogiForge.Application.Locations.Commands;

public record UpdateLocationRequest(string Code, string? Zone, string? Aisle, string? Rack, string? Bin, bool IsActive = true);
public record UpdateLocationCommand(Guid Id, UpdateLocationRequest Request) : IRequest<LocationDto>;

public class UpdateLocationCommandHandler : IRequestHandler<UpdateLocationCommand, LocationDto>
{
    private readonly IRepository<StorageLocation> _locations;
    private readonly ITenantContext _tenant;
    private readonly IUnitOfWork _uow;

    public UpdateLocationCommandHandler(IRepository<StorageLocation> locations, ITenantContext tenant, IUnitOfWork uow)
    {
        _locations = locations; _tenant = tenant; _uow = uow;
    }

    public async Task<LocationDto> Handle(UpdateLocationCommand request, CancellationToken cancellationToken)
    {
        if (!_tenant.HasPermission(PermissionCodes.LocationsManage) && !_tenant.HasPermission(PermissionCodes.AdminFull))
            throw new ForbiddenException();

        var entity = await _locations.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(StorageLocation), request.Id);

        entity.Code = request.Request.Code.Trim();
        entity.Zone = request.Request.Zone;
        entity.Aisle = request.Request.Aisle;
        entity.Rack = request.Request.Rack;
        entity.Bin = request.Request.Bin;
        entity.IsActive = request.Request.IsActive;
        entity.UpdatedBy = _tenant.UserId;
        _locations.Update(entity);
        await _uow.SaveChangesAsync(cancellationToken);
        return new LocationDto(entity.Id, entity.WarehouseId, entity.Code, entity.Zone, entity.Aisle, entity.Rack, entity.Bin, entity.IsActive);
    }
}
