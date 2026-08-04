using LogiForge.Domain.Common;
using LogiForge.Domain.Enums;

namespace LogiForge.Domain.Entities;

public class OutboundOrder : TenantEntity, ITenantScoped
{
    public Guid WarehouseId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string? CustomerPo { get; set; }
    public Guid CustomerId { get; set; }
    public string? ShippingTerms { get; set; }
    public string? Carrier { get; set; }
    public string? TrackingNumber { get; set; }
    public DateTime ShipmentDate { get; set; }
    public string? TrailerNumber { get; set; }
    public OutboundStatus Status { get; set; } = OutboundStatus.Draft;
    public DateTime? ShippedAt { get; set; }
    public Guid? ShippedBy { get; set; }
    public decimal TotalWeight { get; set; }
    public int TotalPallets { get; set; }
    public int TotalMaterials { get; set; }
    public int TotalBoxes { get; set; }

    public Warehouse? Warehouse { get; set; }
    public Customer? Customer { get; set; }
    public ICollection<OutboundLine> Lines { get; set; } = new List<OutboundLine>();
}
