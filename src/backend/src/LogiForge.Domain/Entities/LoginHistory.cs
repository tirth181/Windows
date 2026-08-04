using LogiForge.Domain.Common;

namespace LogiForge.Domain.Entities;

public class LoginHistory : EntityBase
{
    public Guid? UserId { get; set; }
    public Guid? CompanyId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public bool Success { get; set; }
    public string? FailureReason { get; set; }
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;
}
