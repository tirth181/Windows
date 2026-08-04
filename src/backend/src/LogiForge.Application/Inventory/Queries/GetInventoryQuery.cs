using LogiForge.Application.Common;
using LogiForge.Application.Inventory.Dtos;
using LogiForge.Domain.Common;
using LogiForge.Domain.Entities;
using LogiForge.Domain.Enums;
using LogiForge.Domain.Exceptions;
using LogiForge.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LogiForge.Application.Inventory.Queries;

public record GetInventoryQuery(
    int Page = 1,
    int PageSize = 50,
    string? Material = null,
    string? Batch = null,
    Guid? CustomerId = null,
    Guid? WarehouseId = null,
    Guid? LocationId = null,
    string? PalletId = null,
    InventoryStatus? Status = null) : IRequest<PagedResult<InventoryItemDto>>;

public class GetInventoryQueryHandler : IRequestHandler<GetInventoryQuery, PagedResult<InventoryItemDto>>
{
    private readonly IRepository<InventoryItem> _items;
    private readonly ITenantContext _tenant;

    public GetInventoryQueryHandler(IRepository<InventoryItem> items, ITenantContext tenant)
    {
        _items = items;
        _tenant = tenant;
    }

    public async Task<PagedResult<InventoryItemDto>> Handle(GetInventoryQuery request, CancellationToken cancellationToken)
    {
        if (!_tenant.HasPermission(PermissionCodes.InventoryView) && !_tenant.HasPermission(PermissionCodes.AdminFull))
            throw new ForbiddenException();

        var q = _items.Query()
            .Include(i => i.Customer)
            .Include(i => i.Warehouse)
            .Include(i => i.Location)
            .Where(i => i.Status != InventoryStatus.Shipped);

        if (!string.IsNullOrWhiteSpace(request.Material))
        {
            var m = request.Material.Trim().ToLower();
            q = q.Where(i => i.MaterialCode.ToLower().Contains(m) || i.MaterialDescription.ToLower().Contains(m));
        }
        if (!string.IsNullOrWhiteSpace(request.Batch))
            q = q.Where(i => i.BatchNumber.ToLower().Contains(request.Batch.Trim().ToLower()));
        if (request.CustomerId is not null) q = q.Where(i => i.CustomerId == request.CustomerId);
        if (request.WarehouseId is not null) q = q.Where(i => i.WarehouseId == request.WarehouseId);
        if (request.LocationId is not null) q = q.Where(i => i.LocationId == request.LocationId);
        if (!string.IsNullOrWhiteSpace(request.PalletId))
            q = q.Where(i => i.PalletId != null && i.PalletId.ToLower().Contains(request.PalletId.Trim().ToLower()));
        if (request.Status is not null) q = q.Where(i => i.Status == request.Status);

        var total = await q.CountAsync(cancellationToken);
        var rows = await q.OrderByDescending(i => i.LastUpdatedAt)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        return new PagedResult<InventoryItemDto>(rows.Select(Map).ToList(), request.Page, request.PageSize, total);
    }

    public static InventoryItemDto Map(InventoryItem i) => new(
        i.Id, i.MaterialCode, i.MaterialDescription, i.BatchNumber,
        i.RemainingWeight, i.Quantity, i.OriginalWeight, i.RemainingWeight,
        i.CustomerId, i.Customer?.Name, i.WarehouseId, i.Warehouse?.Name,
        i.LocationId, i.Location?.Code, i.PalletId, i.BoxCount, i.Status, i.LastUpdatedAt);
}

public record AdjustInventoryCommand(AdjustInventoryRequest Request) : IRequest<InventoryItemDto>;

public class AdjustInventoryCommandHandler : IRequestHandler<AdjustInventoryCommand, InventoryItemDto>
{
    private readonly IRepository<InventoryItem> _items;
    private readonly IRepository<InventoryTransaction> _txns;
    private readonly ITenantContext _tenant;
    private readonly IUnitOfWork _uow;
    private readonly IAuditService _audit;

    public AdjustInventoryCommandHandler(
        IRepository<InventoryItem> items,
        IRepository<InventoryTransaction> txns,
        ITenantContext tenant,
        IUnitOfWork uow,
        IAuditService audit)
    {
        _items = items;
        _txns = txns;
        _tenant = tenant;
        _uow = uow;
        _audit = audit;
    }

    public async Task<InventoryItemDto> Handle(AdjustInventoryCommand request, CancellationToken cancellationToken)
    {
        if (!_tenant.HasPermission(PermissionCodes.InventoryAdjust) && !_tenant.HasPermission(PermissionCodes.AdminFull))
            throw new ForbiddenException();

        var item = await _items.Query().Include(i => i.Customer).Include(i => i.Warehouse).Include(i => i.Location)
            .FirstOrDefaultAsync(i => i.Id == request.Request.InventoryItemId, cancellationToken)
            ?? throw new NotFoundException(nameof(InventoryItem), request.Request.InventoryItemId);

        var before = new { item.Quantity, item.RemainingWeight, item.Status };
        item.Quantity += request.Request.QuantityDelta;
        item.RemainingWeight += request.Request.WeightDelta;
        if (item.Quantity < 0 || item.RemainingWeight < 0)
            throw new DomainException("invalid_adjustment", "Adjustment would make quantity/weight negative.");

        if (item.RemainingWeight < item.OriginalWeight && item.RemainingWeight > 0 && item.Status == InventoryStatus.Available)
            item.Status = InventoryStatus.Partial;
        if (item.RemainingWeight == 0) item.Status = InventoryStatus.Shipped;

        item.LastUpdatedAt = DateTime.UtcNow;
        item.UpdatedBy = _tenant.UserId;
        _items.Update(item);

        await _txns.AddAsync(new InventoryTransaction
        {
            CompanyId = item.CompanyId,
            InventoryItemId = item.Id,
            TransactionType = InventoryTransactionType.Adjust,
            QuantityDelta = request.Request.QuantityDelta,
            WeightDelta = request.Request.WeightDelta,
            Notes = request.Request.Reason,
            CreatedBy = _tenant.UserId
        }, cancellationToken);

        await _uow.SaveChangesAsync(cancellationToken);
        await _audit.WriteAsync("inventory.adjust", nameof(InventoryItem), item.Id, before, item, cancellationToken);
        return GetInventoryQueryHandler.Map(item);
    }
}

public record TransferInventoryCommand(TransferInventoryRequest Request) : IRequest<InventoryItemDto>;

public class TransferInventoryCommandHandler : IRequestHandler<TransferInventoryCommand, InventoryItemDto>
{
    private readonly IRepository<InventoryItem> _items;
    private readonly IRepository<StorageLocation> _locations;
    private readonly IRepository<InventoryTransaction> _txns;
    private readonly ITenantContext _tenant;
    private readonly IUnitOfWork _uow;
    private readonly IAuditService _audit;

    public TransferInventoryCommandHandler(
        IRepository<InventoryItem> items,
        IRepository<StorageLocation> locations,
        IRepository<InventoryTransaction> txns,
        ITenantContext tenant,
        IUnitOfWork uow,
        IAuditService audit)
    {
        _items = items;
        _locations = locations;
        _txns = txns;
        _tenant = tenant;
        _uow = uow;
        _audit = audit;
    }

    public async Task<InventoryItemDto> Handle(TransferInventoryCommand request, CancellationToken cancellationToken)
    {
        if (!_tenant.HasPermission(PermissionCodes.InventoryTransfer) && !_tenant.HasPermission(PermissionCodes.AdminFull))
            throw new ForbiddenException();

        var item = await _items.Query().Include(i => i.Customer).Include(i => i.Warehouse).Include(i => i.Location)
            .FirstOrDefaultAsync(i => i.Id == request.Request.InventoryItemId, cancellationToken)
            ?? throw new NotFoundException(nameof(InventoryItem), request.Request.InventoryItemId);

        var location = await _locations.GetByIdAsync(request.Request.TargetLocationId, cancellationToken)
            ?? throw new NotFoundException(nameof(StorageLocation), request.Request.TargetLocationId);

        if (location.WarehouseId != item.WarehouseId)
            throw new DomainException("invalid_transfer", "Target slot must be in the same 3PL company.");

        var before = item.LocationId;
        item.LocationId = location.Id;
        item.LastUpdatedAt = DateTime.UtcNow;
        _items.Update(item);

        await _txns.AddAsync(new InventoryTransaction
        {
            CompanyId = item.CompanyId,
            InventoryItemId = item.Id,
            TransactionType = InventoryTransactionType.Transfer,
            QuantityDelta = 0,
            WeightDelta = 0,
            Notes = request.Request.Notes ?? $"Transfer to {location.Code}",
            CreatedBy = _tenant.UserId
        }, cancellationToken);

        await _uow.SaveChangesAsync(cancellationToken);
        await _audit.WriteAsync("inventory.transfer", nameof(InventoryItem), item.Id, before, item.LocationId, cancellationToken);
        item.Location = location;
        return GetInventoryQueryHandler.Map(item);
    }
}
