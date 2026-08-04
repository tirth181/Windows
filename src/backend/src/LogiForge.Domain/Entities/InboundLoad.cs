using LogiForge.Domain.Common;
using LogiForge.Domain.Enums;

namespace LogiForge.Domain.Entities;

public class InboundLoad : TenantEntity, ITenantScoped
{
    public Guid WarehouseId { get; set; }
    public string LoadNumber { get; set; } = string.Empty;
    public Guid CustomerId { get; set; }
    public string? SupplierName { get; set; }
    public DateTime ArrivalDate { get; set; }
    public string? Carrier { get; set; }
    public string? TrailerNumber { get; set; }
    public string? Notes { get; set; }
    public InboundStatus Status { get; set; } = InboundStatus.Draft;
    public DateTime? ReceivedAt { get; set; }
    public Guid? ReceivedBy { get; set; }

    public Warehouse? Warehouse { get; set; }
    public Customer? Customer { get; set; }
    public ICollection<InboundLine> Lines { get; set; } = new List<InboundLine>();
}
