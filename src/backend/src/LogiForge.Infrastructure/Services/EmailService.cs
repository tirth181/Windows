using System.Net;
using System.Net.Mail;
using LogiForge.Application.Common;
using LogiForge.Domain.Entities;
using LogiForge.Domain.Enums;
using LogiForge.Domain.Interfaces;
using LogiForge.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace LogiForge.Infrastructure.Services;

public class EmailService : IEmailService
{
    private readonly LogiForgeDbContext _db;
    private readonly ILogger<EmailService> _logger;
    private readonly SmtpOptions _smtp;

    public EmailService(LogiForgeDbContext db, ILogger<EmailService> logger, IOptions<SmtpOptions> smtp)
    {
        _db = db;
        _logger = logger;
        _smtp = smtp.Value;
    }

    public async Task QueueAsync(Guid companyId, string templateCode, string to, string subject, string body, string? attachmentPath = null, CancellationToken ct = default)
    {
        _db.EmailOutbox.Add(new EmailOutbox
        {
            CompanyId = companyId,
            TemplateCode = templateCode,
            ToAddresses = to,
            Subject = subject,
            Body = body,
            AttachmentPath = attachmentPath,
            Status = EmailOutboxStatus.Pending
        });
        await _db.SaveChangesAsync(ct);
    }

    public async Task SendNowAsync(Guid companyId, string templateCode, string to, string subject, string body, CancellationToken ct = default)
    {
        await QueueAsync(companyId, templateCode, to, subject, body, null, ct);
        await SendPendingAsync(ct);
    }

    public async Task SendPendingAsync(CancellationToken ct = default)
    {
        var pending = await _db.EmailOutbox.IgnoreQueryFilters()
            .Where(e => e.Status == EmailOutboxStatus.Pending)
            .Take(50).ToListAsync(ct);

        var smtpReady = !string.IsNullOrWhiteSpace(_smtp.Host);

        foreach (var email in pending)
        {
            try
            {
                if (smtpReady)
                {
                    using var client = new SmtpClient(_smtp.Host, _smtp.Port)
                    {
                        EnableSsl = _smtp.EnableSsl,
                        DeliveryMethod = SmtpDeliveryMethod.Network
                    };
                    if (!string.IsNullOrWhiteSpace(_smtp.Username))
                        client.Credentials = new NetworkCredential(_smtp.Username, _smtp.Password);

                    using var message = new MailMessage
                    {
                        From = new MailAddress(_smtp.FromEmail, _smtp.FromName),
                        Subject = email.Subject,
                        Body = email.Body,
                        IsBodyHtml = email.Body.Contains('<')
                    };
                    foreach (var addr in email.ToAddresses.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                        message.To.Add(addr);

                    await client.SendMailAsync(message, ct);
                    _logger.LogInformation("SMTP sent [{Template}] To={To}", email.TemplateCode, email.ToAddresses);
                }
                else
                {
                    _logger.LogInformation("EMAIL [{Template}] To={To} Subject={Subject}\n{Body}",
                        email.TemplateCode, email.ToAddresses, email.Subject, email.Body);
                }

                email.Status = EmailOutboxStatus.Sent;
                email.SentAt = DateTime.UtcNow;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send email {Id} to {To}", email.Id, email.ToAddresses);
                email.Status = EmailOutboxStatus.Failed;
            }
        }
        await _db.SaveChangesAsync(ct);
    }
}
