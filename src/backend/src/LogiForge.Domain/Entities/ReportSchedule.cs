using LogiForge.Domain.Common;

namespace LogiForge.Domain.Entities;

public class ReportSchedule : TenantEntity, ITenantScoped
{
    public string ReportCode { get; set; } = string.Empty;
    public string CronExpression { get; set; } = "0 6 * * *";
    public string RecipientsJson { get; set; } = "[]";
    public string Format { get; set; } = "Excel";
    public bool IsActive { get; set; } = true;
    public DateTime? LastRunAt { get; set; }
}
