using LogiForge.Domain.Common;
using LogiForge.Domain.Entities;
using LogiForge.Domain.Exceptions;
using LogiForge.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LogiForge.Application.Ai.Commands;

public record AiChatRequest(Guid? ConversationId, string Message);
public record AiChatResponse(Guid ConversationId, string Reply, IReadOnlyList<string> SuggestedActions);
public record AiChatCommand(AiChatRequest Request) : IRequest<AiChatResponse>;

public class AiChatCommandHandler : IRequestHandler<AiChatCommand, AiChatResponse>
{
    private readonly IRepository<AiConversation> _conversations;
    private readonly IAiAssistantService _ai;
    private readonly ITenantContext _tenant;
    private readonly IUnitOfWork _uow;

    public AiChatCommandHandler(
        IRepository<AiConversation> conversations,
        IAiAssistantService ai,
        ITenantContext tenant,
        IUnitOfWork uow)
    {
        _conversations = conversations;
        _ai = ai;
        _tenant = tenant;
        _uow = uow;
    }

    public async Task<AiChatResponse> Handle(AiChatCommand request, CancellationToken cancellationToken)
    {
        if (!_tenant.HasPermission(PermissionCodes.AiUse) && !_tenant.HasPermission(PermissionCodes.AdminFull))
            throw new ForbiddenException();
        if (_tenant.CompanyId is null || _tenant.UserId is null) throw new ForbiddenException();
        if (string.IsNullOrWhiteSpace(request.Request.Message))
            throw new DomainException("validation_failed", "Message is required.");

        AiConversation conversation;
        if (request.Request.ConversationId is null)
        {
            conversation = new AiConversation
            {
                CompanyId = _tenant.CompanyId.Value,
                UserId = _tenant.UserId.Value,
                Title = request.Request.Message.Length > 60
                    ? request.Request.Message[..60] + "…"
                    : request.Request.Message
            };
            await _conversations.AddAsync(conversation, cancellationToken);
        }
        else
        {
            conversation = await _conversations.Query().Include(c => c.Messages)
                .FirstOrDefaultAsync(c => c.Id == request.Request.ConversationId && c.UserId == _tenant.UserId, cancellationToken)
                ?? throw new NotFoundException(nameof(AiConversation), request.Request.ConversationId);
        }

        conversation.Messages.Add(new AiMessage
        {
            CompanyId = _tenant.CompanyId.Value,
            ConversationId = conversation.Id,
            Role = "user",
            Content = request.Request.Message.Trim()
        });

        var result = await _ai.ChatAsync(conversation.Id, request.Request.Message.Trim(), cancellationToken);

        conversation.Messages.Add(new AiMessage
        {
            CompanyId = _tenant.CompanyId.Value,
            ConversationId = conversation.Id,
            Role = "assistant",
            Content = result.Reply
        });

        await _uow.SaveChangesAsync(cancellationToken);
        return new AiChatResponse(conversation.Id, result.Reply, result.SuggestedActions);
    }
}
