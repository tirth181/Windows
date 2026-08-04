using LogiForge.Domain.Enums;

namespace LogiForge.Application.Inbound.Dtos;

public record InboundLineDto(
    Guid? Id,
    int LineNumber,
    string MaterialCode,
    string MaterialDescription,
    string BatchNumber,
    decimal Weight,
    decimal Quantity,
    int BoxCount,
    string? PalletId,
    Guid? PutawayLocationId,
    InventoryStatus Status,
    string? Comments);

public record InboundLoadDto(
    Guid Id,
    string LoadNumber,
    Guid CustomerId,
    string? CustomerName,
    string? SupplierName,
    DateTime ArrivalDate,
    string? Carrier,
    string? TrailerNumber,
    Guid WarehouseId,
    string? WarehouseName,
    string? Notes,
    InboundStatus Status,
    DateTime? ReceivedAt,
    IReadOnlyList<InboundLineDto> Lines);

public record CreateInboundLineRequest(
    string MaterialCode,
    string MaterialDescription,
    string BatchNumber,
    decimal Weight,
    decimal Quantity,
    int BoxCount,
    string? PalletId,
    Guid? PutawayLocationId,
    string? Comments);

public record CreateInboundRequest(
    Guid CustomerId,
    Guid WarehouseId,
    string? SupplierName,
    DateTime ArrivalDate,
    string? Carrier,
    string? TrailerNumber,
    string? Notes,
    IReadOnlyList<CreateInboundLineRequest> Lines);
