using LogiForge.Domain.Enums;

namespace LogiForge.Application.Outbound.Dtos;

public record OutboundLineDto(
    Guid? Id,
    Guid? InventoryItemId,
    string MaterialCode,
    string BatchNumber,
    decimal Weight,
    decimal Quantity,
    Guid? LocationId,
    int PalletCount,
    int BoxCount);

public record OutboundOrderDto(
    Guid Id,
    string OrderNumber,
    string? CustomerPo,
    Guid CustomerId,
    string? CustomerName,
    string? ShippingTerms,
    string? Carrier,
    string? TrackingNumber,
    DateTime ShipmentDate,
    string? TrailerNumber,
    Guid WarehouseId,
    OutboundStatus Status,
    decimal TotalWeight,
    int TotalPallets,
    int TotalMaterials,
    int TotalBoxes,
    DateTime? ShippedAt,
    IReadOnlyList<OutboundLineDto> Lines);

public record CreateOutboundLineRequest(
    Guid InventoryItemId,
    decimal Weight,
    decimal Quantity,
    int PalletCount,
    int BoxCount);

public record CreateOutboundRequest(
    Guid CustomerId,
    Guid WarehouseId,
    string? CustomerPo,
    string? ShippingTerms,
    string? Carrier,
    string? TrackingNumber,
    DateTime ShipmentDate,
    string? TrailerNumber,
    IReadOnlyList<CreateOutboundLineRequest> Lines);
