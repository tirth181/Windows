using LogiForge.Domain.Enums;

namespace LogiForge.Application.Inventory.Dtos;

public record InventoryItemDto(
    Guid Id,
    string MaterialCode,
    string MaterialDescription,
    string BatchNumber,
    decimal Weight,
    decimal Quantity,
    decimal OriginalWeight,
    decimal RemainingWeight,
    Guid CustomerId,
    string? CustomerName,
    Guid WarehouseId,
    string? WarehouseName,
    Guid? LocationId,
    string? LocationCode,
    string? PalletId,
    int BoxCount,
    InventoryStatus Status,
    DateTime LastUpdatedAt);

public record AdjustInventoryRequest(Guid InventoryItemId, decimal QuantityDelta, decimal WeightDelta, string Reason);
public record TransferInventoryRequest(Guid InventoryItemId, Guid TargetLocationId, string? Notes);
