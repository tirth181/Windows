using LogiForge.Domain.Common;
using LogiForge.Domain.Entities;
using LogiForge.Domain.Enums;
using LogiForge.Domain.Exceptions;
using LogiForge.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LogiForge.Application.Reports.Queries;

public record ReportDefinitionDto(string Code, string Name, string Description);
public record GetReportCatalogQuery : IRequest<IReadOnlyList<ReportDefinitionDto>>;
public record RunReportQuery(string Code, Guid? WarehouseId = null, Guid? CustomerId = null) : IRequest<object>;
public record ExportReportQuery(string Code, string Format = "xlsx", Guid? WarehouseId = null) : IRequest<byte[]>;

public class GetReportCatalogQueryHandler : IRequestHandler<GetReportCatalogQuery, IReadOnlyList<ReportDefinitionDto>>
{
    private readonly ITenantContext _tenant;
    public GetReportCatalogQueryHandler(ITenantContext tenant) => _tenant = tenant;

    public Task<IReadOnlyList<ReportDefinitionDto>> Handle(GetReportCatalogQuery request, CancellationToken cancellationToken)
    {
        if (!_tenant.HasPermission(PermissionCodes.ReportsView) && !_tenant.HasPermission(PermissionCodes.AdminFull))
            throw new ForbiddenException();

        IReadOnlyList<ReportDefinitionDto> catalog =
        [
            new("ship_log", "Ship Log", "Outbound shipments by day — all orders confirmed shipped on a selected day"),
            new("inbound", "Inbound Report", "Received and draft inbound loads"),
            new("outbound", "Outbound Report", "Shipments and open orders"),
            new("inventory", "Inventory Report", "Current on-hand inventory"),
            new("partial_inventory", "Partial Inventory Report", "Lots with partial remaining weight"),
            new("batch_traceability", "Batch Traceability", "Inbound to outbound batch history"),
            new("customer_inventory", "Customer Inventory", "Inventory grouped by customer"),
            new("warehouse_utilization", "3PL Company Utilization", "Slot occupancy metrics"),
            new("carrier_performance", "Carrier Performance", "Inbound/outbound by carrier"),
            new("daily_kpi", "Daily KPI", "Key 3PL company KPIs for today")
        ];
        return Task.FromResult(catalog);
    }
}

public class ExportReportQueryHandler : IRequestHandler<ExportReportQuery, byte[]>
{
    private readonly IRepository<InventoryItem> _inventory;
    private readonly IRepository<InboundLoad> _inbound;
    private readonly IRepository<OutboundOrder> _outbound;
    private readonly IRepository<Company> _companies;
    private readonly IExcelExportService _excel;
    private readonly ITenantContext _tenant;

    public ExportReportQueryHandler(
        IRepository<InventoryItem> inventory,
        IRepository<InboundLoad> inbound,
        IRepository<OutboundOrder> outbound,
        IRepository<Company> companies,
        IExcelExportService excel,
        ITenantContext tenant)
    {
        _inventory = inventory;
        _inbound = inbound;
        _outbound = outbound;
        _companies = companies;
        _excel = excel;
        _tenant = tenant;
    }

    public async Task<byte[]> Handle(ExportReportQuery request, CancellationToken cancellationToken)
    {
        if (!_tenant.HasPermission(PermissionCodes.ReportsExport) && !_tenant.HasPermission(PermissionCodes.InventoryExport)
            && !_tenant.HasPermission(PermissionCodes.AdminFull))
            throw new ForbiddenException();

        var company = _tenant.CompanyId is null ? null : await _companies.GetByIdAsync(_tenant.CompanyId.Value, cancellationToken);
        var companyName = company?.Name ?? "LogiForge";

        switch (request.Code.ToLowerInvariant())
        {
            case "inventory":
            case "partial_inventory":
            case "customer_inventory":
            {
                var q = _inventory.Query().Include(i => i.Customer).Include(i => i.Warehouse).Include(i => i.Location)
                    .Where(i => i.Status != InventoryStatus.Shipped);
                if (request.Code == "partial_inventory") q = q.Where(i => i.Status == InventoryStatus.Partial);
                if (request.WarehouseId is not null) q = q.Where(i => i.WarehouseId == request.WarehouseId);
                var rows = await q.OrderBy(i => i.MaterialCode).Select(i => new
                {
                    i.MaterialCode, i.MaterialDescription, i.BatchNumber, i.RemainingWeight, i.Quantity,
                    Customer = i.Customer!.Name, ThreePlCompany = i.Warehouse!.Name, Slot = i.Location!.Code,
                    i.PalletId, Status = i.Status.ToString(), i.LastUpdatedAt
                }).ToListAsync(cancellationToken);
                return _excel.ExportInventory(rows, companyName);
            }
            case "inbound":
            {
                var rows = await _inbound.Query().Include(i => i.Customer).Include(i => i.Lines)
                    .OrderByDescending(i => i.ArrivalDate)
                    .Select(i => new
                    {
                        i.LoadNumber, Customer = i.Customer!.Name, i.Carrier, i.ArrivalDate,
                        Status = i.Status.ToString(), Lines = i.Lines.Count
                    }).ToListAsync(cancellationToken);
                return _excel.ExportInbound(rows, companyName);
            }
            case "outbound":
            {
                var rows = await _outbound.Query().Include(o => o.Customer)
                    .OrderByDescending(o => o.ShipmentDate)
                    .Select(o => new
                    {
                        o.OrderNumber, o.CustomerPo, Customer = o.Customer!.Name, o.Carrier,
                        o.ShipmentDate, Status = o.Status.ToString(), o.TotalWeight, o.TotalPallets
                    }).ToListAsync(cancellationToken);
                return _excel.ExportOutbound(rows, companyName);
            }
            case "ship_log":
            {
                var q = _outbound.Query().Include(o => o.Customer)
                    .Where(o => o.Status == OutboundStatus.Shipped);
                if (request.WarehouseId is not null)
                    q = q.Where(o => o.WarehouseId == request.WarehouseId);
                var rows = await q
                    .OrderByDescending(o => o.ShippedAt ?? o.ShipmentDate)
                    .Select(o => new
                    {
                        o.OrderNumber,
                        Customer = o.Customer!.Name,
                        o.Carrier,
                        o.TrackingNumber,
                        o.ShipmentDate,
                        o.ShippedAt,
                        Status = o.Status.ToString(),
                        o.TotalWeight,
                        o.TotalPallets
                    }).ToListAsync(cancellationToken);
                return _excel.ExportOutbound(rows, companyName);
            }
            default:
            {
                var headers = new[] { "Metric", "Value" };
                var data = new List<IEnumerable<object?>>
                {
                    new object?[] { "Report", request.Code },
                    new object?[] { "GeneratedAt", DateTime.UtcNow.ToString("O") }
                };
                return _excel.ExportGeneric(request.Code, headers, data, companyName);
            }
        }
    }
}
