using LogiForge.Domain.Common;

namespace LogiForge.Domain.Entities;

public class ActivityLog : TenantEntity, ITenantScoped
{
    public Guid? UserId { get; set; }
    public string Summary { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
}
