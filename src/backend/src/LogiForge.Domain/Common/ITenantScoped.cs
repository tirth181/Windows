namespace LogiForge.Domain.Common;

public interface ITenantScoped
{
    Guid CompanyId { get; set; }
}
