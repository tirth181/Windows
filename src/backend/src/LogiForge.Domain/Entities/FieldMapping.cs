using LogiForge.Domain.Common;

namespace LogiForge.Domain.Entities;

public class FieldMapping : TenantEntity, ITenantScoped
{
    public Guid IntegrationId { get; set; }
    public string ExternalField { get; set; } = string.Empty;
    public string InternalField { get; set; } = string.Empty;
    public string? Transform { get; set; }

    public Integration? Integration { get; set; }
}
