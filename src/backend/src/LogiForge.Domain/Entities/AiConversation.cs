using LogiForge.Domain.Common;

namespace LogiForge.Domain.Entities;

public class AiConversation : TenantEntity, ITenantScoped
{
    public Guid UserId { get; set; }
    public string Title { get; set; } = "New conversation";
    public ICollection<AiMessage> Messages { get; set; } = new List<AiMessage>();
}

public class AiMessage : TenantEntity, ITenantScoped
{
    public Guid ConversationId { get; set; }
    public string Role { get; set; } = "user";
    public string Content { get; set; } = string.Empty;
    public string? ToolCallsJson { get; set; }

    public AiConversation? Conversation { get; set; }
}
