namespace LogiForge.Domain.Interfaces;

public interface IAuditService
{
    Task WriteAsync(string action, string entityType, Guid? entityId, object? before, object? after, CancellationToken ct = default);
}

public interface IEmailService
{
    Task QueueAsync(Guid companyId, string templateCode, string to, string subject, string body, string? attachmentPath = null, CancellationToken ct = default);
    Task SendPendingAsync(CancellationToken ct = default);
    /// <summary>Queue and immediately attempt delivery (SMTP when configured; otherwise log).</summary>
    Task SendNowAsync(Guid companyId, string templateCode, string to, string subject, string body, CancellationToken ct = default);
}

public interface IStripeBillingService
{
    bool IsConfigured { get; }
    Task<string> CreateCheckoutSessionAsync(Guid companyId, string planCode, string successUrl, string cancelUrl, CancellationToken ct = default);
    Task<string> CreateCustomerPortalSessionAsync(Guid companyId, string returnUrl, CancellationToken ct = default);
    Task HandleWebhookAsync(string json, string? signatureHeader, CancellationToken ct = default);
}

public record SubscriptionPlanInfo(
    string Code,
    string Name,
    string Description,
    int PriceMonthlyCents,
    string? StripePriceId,
    bool Available);

public interface IExcelExportService
{
    byte[] ExportInventory(IEnumerable<object> rows, string companyName);
    byte[] ExportInbound(IEnumerable<object> rows, string companyName);
    byte[] ExportOutbound(IEnumerable<object> rows, string companyName);
    byte[] ExportGeneric(string sheetName, IEnumerable<string> headers, IEnumerable<IEnumerable<object?>> rows, string companyName);
}

public interface IAiAssistantService
{
    Task<AiChatResult> ChatAsync(Guid conversationId, string message, CancellationToken ct = default);
}

public record AiChatResult(string Reply, IReadOnlyList<string> SuggestedActions);

public interface IDocumentNumberGenerator
{
    Task<string> NextInboundLoadNumberAsync(Guid companyId, CancellationToken ct = default);
    Task<string> NextOutboundOrderNumberAsync(Guid companyId, CancellationToken ct = default);
}

public interface ICacheService
{
    Task<T?> GetAsync<T>(string key, CancellationToken ct = default);
    Task SetAsync<T>(string key, T value, TimeSpan? expiry = null, CancellationToken ct = default);
    Task RemoveAsync(string key, CancellationToken ct = default);
    Task RemoveByPrefixAsync(string prefix, CancellationToken ct = default);
}
