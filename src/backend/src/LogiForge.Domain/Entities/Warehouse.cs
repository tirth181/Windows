using LogiForge.Domain.Common;

namespace LogiForge.Domain.Entities;

public class Warehouse : TenantEntity, ITenantScoped
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? AddressJson { get; set; }
    public string Timezone { get; set; } = "UTC";
    public bool IsActive { get; set; } = true;

    public Company? Company { get; set; }
    public ICollection<StorageLocation> Locations { get; set; } = new List<StorageLocation>();
}
