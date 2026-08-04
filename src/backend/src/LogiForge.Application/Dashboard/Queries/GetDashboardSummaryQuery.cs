using LogiForge.Application.Dashboard.Dtos;
using LogiForge.Domain.Common;
using LogiForge.Domain.Entities;
using LogiForge.Domain.Enums;
using LogiForge.Domain.Exceptions;
using LogiForge.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LogiForge.Application.Dashboard.Queries;

public record GetDashboardSummaryQuery(Guid? WarehouseId = null) : IRequest<DashboardSummaryDto>;

public class GetDashboardSummaryQueryHandler : IRequestHandler<GetDashboardSummaryQuery, DashboardSummaryDto>
{
    private readonly IRepository<InboundLoad> _inbound;
    private readonly IRepository<OutboundOrder> _outbound;
    private readonly IRepository<InventoryItem> _inventory;
    private readonly IRepository<ActivityLog> _activity;
    private readonly IRepository<StorageLocation> _locations;
    private readonly ITenantContext _tenant;
    private readonly ICacheService _cache;

    public GetDashboardSummaryQueryHandler(
        IRepository<InboundLoad> inbound,
        IRepository<OutboundOrder> outbound,
        IRepository<InventoryItem> inventory,
        IRepository<ActivityLog> activity,
        IRepository<StorageLocation> locations,
        ITenantContext tenant,
        ICacheService cache)
    {
        _inbound = inbound;
        _outbound = outbound;
        _inventory = inventory;
        _activity = activity;
        _locations = locations;
        _tenant = tenant;
        _cache = cache;
    }

    public async Task<DashboardSummaryDto> Handle(GetDashboardSummaryQuery request, CancellationToken cancellationToken)
    {
        if (!_tenant.HasPermission(PermissionCodes.DashboardView) && !_tenant.HasPermission(PermissionCodes.AdminFull))
            throw new ForbiddenException();

        var cacheKey = $"tenant:{_tenant.CompanyId}:dashboard:{request.WarehouseId}";
        var cached = await _cache.GetAsync<DashboardSummaryDto>(cacheKey, cancellationToken);
        if (cached is not null) return cached;

        var today = DateTime.UtcNow.Date;
        var inboundQ = _inbound.Query().Where(i => i.ArrivalDate >= today && i.ArrivalDate < today.AddDays(1));
        var outboundQ = _outbound.Query().Where(o => o.ShipmentDate >= today && o.ShipmentDate < today.AddDays(1));
        var invQ = _inventory.Query().Where(i => i.Status != InventoryStatus.Shipped);
        if (request.WarehouseId is not null)
        {
            inboundQ = inboundQ.Where(i => i.WarehouseId == request.WarehouseId);
            outboundQ = outboundQ.Where(o => o.WarehouseId == request.WarehouseId);
            invQ = invQ.Where(i => i.WarehouseId == request.WarehouseId);
        }

        var todaysInbound = await inboundQ.CountAsync(cancellationToken);
        var todaysShipments = await outboundQ.CountAsync(cancellationToken);
        var currentInv = await invQ.CountAsync(cancellationToken);
        var partial = await invQ.CountAsync(i => i.Status == InventoryStatus.Partial, cancellationToken);
        var onHold = await invQ.CountAsync(i => i.Status == InventoryStatus.Hold, cancellationToken);
        var delayed = await _outbound.Query().CountAsync(o =>
            o.Status != OutboundStatus.Shipped && o.Status != OutboundStatus.Cancelled && o.ShipmentDate < today, cancellationToken);

        var locationCount = await _locations.Query().CountAsync(l => request.WarehouseId == null || l.WarehouseId == request.WarehouseId, cancellationToken);
        var usedLocations = await invQ.Where(i => i.LocationId != null).Select(i => i.LocationId).Distinct().CountAsync(cancellationToken);
        var utilization = locationCount == 0 ? 0 : Math.Round(usedLocations * 100m / locationCount, 1);

        var activity = await _activity.Query().OrderByDescending(a => a.OccurredAt).Take(10)
            .Select(a => new ActivityItemDto(a.OccurredAt, a.Category, a.Summary))
            .ToListAsync(cancellationToken);

        var insights = new List<string>();
        if (partial > 0) insights.Add($"{partial} partial inventory lots need attention.");
        if (delayed > 0) insights.Add($"{delayed} outbound orders are past shipment date.");
        if (onHold > 0) insights.Add($"{onHold} lots are on hold.");
        if (insights.Count == 0) insights.Add("Operations look healthy for today.");

        var actions = new List<QuickActionDto>
        {
            new("New Receiving", "/inbound/new", PermissionCodes.InboundCreate),
            new("Create Shipment", "/outbound/new", PermissionCodes.OutboundCreate),
            new("View Partial Inventory", "/inventory?status=Partial", PermissionCodes.InventoryView),
            new("Ask AI", "/ai", PermissionCodes.AiUse)
        }.Where(a => _tenant.HasPermission(a.Permission) || _tenant.HasPermission(PermissionCodes.AdminFull)).ToList();

        var dto = new DashboardSummaryDto(
            todaysInbound, todaysShipments, currentInv, utilization, partial, onHold, delayed,
            insights, activity, actions);

        await _cache.SetAsync(cacheKey, dto, TimeSpan.FromMinutes(1), cancellationToken);
        return dto;
    }
}
