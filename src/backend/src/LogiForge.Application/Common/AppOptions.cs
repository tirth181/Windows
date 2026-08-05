namespace LogiForge.Application.Common;

public class AppOptions
{
    public const string SectionName = "App";

    public string PublicWebBaseUrl { get; set; } = "http://localhost:3000";
    public int TrialDays { get; set; } = 14;
    public bool RequireEmailVerification { get; set; } = true;
    /// <summary>When false, API never invents demo sessions; frontend should also disable fallback.</summary>
    public bool AllowDemoLoginFallback { get; set; } = true;
}

public class SmtpOptions
{
    public const string SectionName = "Smtp";

    public string? Host { get; set; }
    public int Port { get; set; } = 587;
    public string? Username { get; set; }
    public string? Password { get; set; }
    public string FromEmail { get; set; } = "noreply@logiforge.app";
    public string FromName { get; set; } = "LogiForge";
    public bool EnableSsl { get; set; } = true;
}

public class StripeOptions
{
    public const string SectionName = "Stripe";

    public string? SecretKey { get; set; }
    public string? PublishableKey { get; set; }
    public string? WebhookSecret { get; set; }
    public string? PriceStarter { get; set; }
    public string? PriceGrowth { get; set; }
    public string? PriceScale { get; set; }

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(SecretKey)
        && (!string.IsNullOrWhiteSpace(PriceStarter) || !string.IsNullOrWhiteSpace(PriceGrowth));
}
