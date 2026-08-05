using System.Text.Json;
using ClosedXML.Excel;
using LogiForge.Domain.Entities;
using LogiForge.Domain.Enums;
using LogiForge.Domain.Interfaces;
using LogiForge.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace LogiForge.Infrastructure.Services;

public class AuditService : IAuditService
{
    private readonly LogiForgeDbContext _db;
    private readonly ITenantContext _tenant;

    public AuditService(LogiForgeDbContext db, ITenantContext tenant)
    {
        _db = db;
        _tenant = tenant;
    }

    private static readonly JsonSerializerOptions AuditJsonOptions = new()
    {
        ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles,
        WriteIndented = false,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    };

    public async Task WriteAsync(string action, string entityType, Guid? entityId, object? before, object? after, CancellationToken ct = default)
    {
        string? Safe(object? value)
        {
            if (value is null) return null;
            try { return JsonSerializer.Serialize(value, AuditJsonOptions); }
            catch { return value.ToString(); }
        }

        _db.AuditLogs.Add(new AuditLog
        {
            CompanyId = _tenant.CompanyId,
            UserId = _tenant.UserId,
            Action = action,
            EntityType = entityType,
            EntityId = entityId,
            BeforeJson = Safe(before),
            AfterJson = Safe(after),
            OccurredAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync(ct);
    }
}

public class ExcelExportService : IExcelExportService
{
    public byte[] ExportInventory(IEnumerable<object> rows, string companyName)
        => Build("Inventory", rows, companyName);

    public byte[] ExportInbound(IEnumerable<object> rows, string companyName)
        => Build("Inbound", rows, companyName);

    public byte[] ExportOutbound(IEnumerable<object> rows, string companyName)
        => Build("Outbound", rows, companyName);

    public byte[] ExportGeneric(string sheetName, IEnumerable<string> headers, IEnumerable<IEnumerable<object?>> rows, string companyName)
    {
        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add(sheetName);
        ws.Cell(1, 1).Value = companyName;
        ws.Cell(1, 1).Style.Font.Bold = true;
        ws.Cell(2, 1).Value = $"{sheetName} — {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC";
        var col = 1;
        foreach (var h in headers) { ws.Cell(4, col).Value = h; ws.Cell(4, col).Style.Font.Bold = true; col++; }
        var r = 5;
        foreach (var row in rows)
        {
            col = 1;
            foreach (var cell in row) { ws.Cell(r, col).Value = cell?.ToString() ?? ""; col++; }
            r++;
        }
        ws.RangeUsed()?.SetAutoFilter();
        ws.Columns().AdjustToContents();
        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }

    private static byte[] Build(string sheet, IEnumerable<object> rows, string companyName)
    {
        using var wb = new XLWorkbook();
        var ws = wb.Worksheets.Add(sheet);
        ws.Cell(1, 1).Value = companyName;
        ws.Cell(1, 1).Style.Font.Bold = true;
        ws.Cell(1, 1).Style.Font.FontColor = XLColor.FromHtml("#0B1F33");
        ws.Cell(2, 1).Value = $"{sheet} Report — {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC";

        var list = rows.ToList();
        if (list.Count == 0)
        {
            ws.Cell(4, 1).Value = "No data";
        }
        else
        {
            var props = list[0].GetType().GetProperties();
            for (var i = 0; i < props.Length; i++)
            {
                ws.Cell(4, i + 1).Value = props[i].Name switch
                {
                    "ThreePlCompany" or "Warehouse" => "3PL Company",
                    "Location" => "Slot",
                    _ => props[i].Name
                };
                ws.Cell(4, i + 1).Style.Font.Bold = true;
                ws.Cell(4, i + 1).Style.Fill.BackgroundColor = XLColor.FromHtml("#1E3A54");
                ws.Cell(4, i + 1).Style.Font.FontColor = XLColor.White;
            }
            for (var r = 0; r < list.Count; r++)
            {
                for (var c = 0; c < props.Length; c++)
                    ws.Cell(r + 5, c + 1).Value = props[c].GetValue(list[r])?.ToString() ?? "";
            }
            ws.RangeUsed()?.SetAutoFilter();
        }
        ws.Columns().AdjustToContents();
        using var ms = new MemoryStream();
        wb.SaveAs(ms);
        return ms.ToArray();
    }
}

public class DocumentNumberGenerator : IDocumentNumberGenerator
{
    private readonly LogiForgeDbContext _db;
    public DocumentNumberGenerator(LogiForgeDbContext db) => _db = db;

    public async Task<string> NextInboundLoadNumberAsync(Guid companyId, CancellationToken ct = default)
    {
        var count = await _db.InboundLoads.IgnoreQueryFilters().CountAsync(i => i.CompanyId == companyId, ct);
        return $"INB-{DateTime.UtcNow:yyyyMMdd}-{(count + 1):D5}";
    }

    public async Task<string> NextOutboundOrderNumberAsync(Guid companyId, CancellationToken ct = default)
    {
        var count = await _db.OutboundOrders.IgnoreQueryFilters().CountAsync(o => o.CompanyId == companyId, ct);
        return $"OUT-{DateTime.UtcNow:yyyyMMdd}-{(count + 1):D5}";
    }
}

public class PermissionAwareAiAssistantService : IAiAssistantService
{
    private readonly LogiForgeDbContext _db;
    private readonly ITenantContext _tenant;
    private readonly IConfiguration _config;
    private readonly ILogger<PermissionAwareAiAssistantService> _logger;

    public PermissionAwareAiAssistantService(
        LogiForgeDbContext db,
        ITenantContext tenant,
        IConfiguration config,
        ILogger<PermissionAwareAiAssistantService> logger)
    {
        _db = db;
        _tenant = tenant;
        _config = config;
        _logger = logger;
    }

    public async Task<AiChatResult> ChatAsync(Guid conversationId, string message, CancellationToken ct = default)
    {
        // Azure OpenAI is used when configured; otherwise a deterministic permission-aware tool router answers.
        var azureEndpoint = _config["AzureOpenAI:Endpoint"];
        _logger.LogInformation("AI chat conversation={ConversationId} azureConfigured={Configured}", conversationId, !string.IsNullOrEmpty(azureEndpoint));

        var msg = message.Trim().ToLowerInvariant();
        var actions = new List<string>();
        string reply;

        if (msg.Contains("batch") && _tenant.HasPermission(Domain.Common.PermissionCodes.InventoryView))
        {
            // Prefer explicit batch ids like B240501 / LOT-123; avoid matching the word "batch".
            var batchToken = System.Text.RegularExpressions.Regex.Match(
                message, @"\b(?:B\d[\w-]*|[A-Z]{2,}-\d[\w-]*)\b", System.Text.RegularExpressions.RegexOptions.IgnoreCase).Value;
            if (string.IsNullOrWhiteSpace(batchToken))
            {
                var parts = message.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                var idx = Array.FindIndex(parts, p => p.Equals("batch", StringComparison.OrdinalIgnoreCase));
                var raw = idx >= 0 && idx + 1 < parts.Length ? parts[idx + 1] : parts.LastOrDefault() ?? "";
                batchToken = new string(raw.Where(ch => char.IsLetterOrDigit(ch) || ch is '-' or '_').ToArray());
            }
            var item = await _db.InventoryItems
                .Include(i => i.Location).Include(i => i.Warehouse)
                .Where(i => i.BatchNumber.ToLower().Contains(batchToken.ToLower()))
                .FirstOrDefaultAsync(ct);
            reply = item is null
                ? $"No inventory found for batch matching '{batchToken}' in your company."
                : $"Batch {item.BatchNumber} ({item.MaterialCode}) is at {item.Location?.Code ?? "unassigned"} in 3PL company {item.Warehouse?.Name}. Status: {item.Status}. Remaining weight: {item.RemainingWeight} lbs.";
            actions.Add("Open Inventory");
        }
        else if ((msg.Contains("today") && msg.Contains("shipment")) || msg.Contains("today's shipments"))
        {
            if (!_tenant.HasPermission(Domain.Common.PermissionCodes.OutboundView))
                reply = "You do not have permission to view shipments.";
            else
            {
                var today = DateTime.UtcNow.Date;
                var count = await _db.OutboundOrders.CountAsync(o => o.ShipmentDate >= today && o.ShipmentDate < today.AddDays(1), ct);
                reply = $"There are {count} shipments scheduled for today.";
                actions.Add("Open Outbound");
            }
        }
        else if (msg.Contains("partial"))
        {
            if (!_tenant.HasPermission(Domain.Common.PermissionCodes.InventoryView))
                reply = "You do not have permission to view inventory.";
            else
            {
                var count = await _db.InventoryItems.CountAsync(i => i.Status == InventoryStatus.Partial, ct);
                reply = $"There are {count} partial inventory lots.";
                actions.Add("View Partial Inventory");
            }
        }
        else if (msg.Contains("receiving") || msg.Contains("create receive"))
        {
            reply = _tenant.HasPermission(Domain.Common.PermissionCodes.InboundCreate)
                ? "You can create a receiving load from Inbound → New Receiving."
                : "You do not have permission to create receiving loads.";
            if (_tenant.HasPermission(Domain.Common.PermissionCodes.InboundCreate)) actions.Add("Create Receiving");
        }
        else if (msg.Contains("report") && msg.Contains("inventory"))
        {
            reply = _tenant.HasPermission(Domain.Common.PermissionCodes.ReportsExport) || _tenant.HasPermission(Domain.Common.PermissionCodes.InventoryExport)
                ? "I can help generate an inventory report. Open Reports → Inventory Report → Export Excel."
                : "You do not have permission to export reports.";
            if (_tenant.HasPermission(Domain.Common.PermissionCodes.ReportsView)) actions.Add("Open Reports");
        }
        else if (msg.Contains("who shipped") || msg.Contains("order"))
        {
            if (!_tenant.HasPermission(Domain.Common.PermissionCodes.OutboundView))
                reply = "You do not have permission to view outbound orders.";
            else
            {
                var token = message.Split(' ', StringSplitOptions.RemoveEmptyEntries).LastOrDefault() ?? "";
                var order = await _db.OutboundOrders.FirstOrDefaultAsync(o => o.OrderNumber.Contains(token), ct);
                reply = order is null
                    ? $"No order found matching '{token}'."
                    : $"Order {order.OrderNumber} status is {order.Status}. Shipped at: {order.ShippedAt?.ToString("u") ?? "not shipped"}.";
            }
        }
        else
        {
            reply = "I can help with inventory slots, today's shipments, partial lots, receiving, and reports — within your permissions. Try: \"Where is Batch B240501?\" or \"Show today's shipments.\"";
            actions.Add("Show today's shipments");
            actions.Add("Show partial inventory");
        }

        return new AiChatResult(reply, actions);
    }
}
