using LogiForge.Domain.Common;
using LogiForge.Domain.Enums;

namespace LogiForge.Domain.Entities;

public class Integration : TenantEntity, ITenantScoped
{
    public string Name { get; set; } = string.Empty;
    public IntegrationType Type { get; set; }
    public string ConfigJson { get; set; } = "{}";
    public string Status { get; set; } = "Draft";
    public DateTime? LastSyncAt { get; set; }
    public string? LastError { get; set; }

    public ICollection<FieldMapping> FieldMappings { get; set; } = new List<FieldMapping>();
}
