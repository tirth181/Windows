using LogiForge.Domain.Common;
using LogiForge.Domain.Enums;

namespace LogiForge.Domain.Entities;

public class EmailOutbox : TenantEntity, ITenantScoped
{
    public string ToAddresses { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string? AttachmentPath { get; set; }
    public EmailOutboxStatus Status { get; set; } = EmailOutboxStatus.Pending;
    public string? ErrorMessage { get; set; }
    public DateTime? SentAt { get; set; }
    public string TemplateCode { get; set; } = string.Empty;
}
