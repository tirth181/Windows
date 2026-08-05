namespace LogiForge.Application.Dashboard.Dtos;

public record DashboardSummaryDto(
    int TodaysInbound,
    int TodaysShipments,
    int CurrentInventoryCount,
    decimal WarehouseUtilizationPercent,
    int PartialInventoryCount,
    int InventoryOnHold,
    int DelayedOrders,
    IReadOnlyList<string> AiInsights,
    IReadOnlyList<ActivityItemDto> RecentActivity,
    IReadOnlyList<QuickActionDto> QuickActions);

public record ActivityItemDto(DateTime OccurredAt, string Category, string Summary);
public record QuickActionDto(string Label, string Href, string Permission);
