using LogiForge.Domain.Common;
using LogiForge.Domain.Entities;
using LogiForge.Domain.Exceptions;
using LogiForge.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LogiForge.Application.Inbound.Commands;

public record DeleteInboundCommand(Guid Id) : IRequest<Unit>;

public class DeleteInboundCommandHandler : IRequestHandler<DeleteInboundCommand, Unit>
{
    private readonly IRepository<InboundLoad> _loads;
    private readonly ITenantContext _tenant;
    private readonly IUnitOfWork _uow;
    private readonly IAuditService _audit;

    public DeleteInboundCommandHandler(
        IRepository<InboundLoad> loads,
        ITenantContext tenant,
        IUnitOfWork uow,
        IAuditService audit)
    {
        _loads = loads;
        _tenant = tenant;
        _uow = uow;
        _audit = audit;
    }

    public async Task<Unit> Handle(DeleteInboundCommand request, CancellationToken cancellationToken)
    {
        var isAdmin = _tenant.HasPermission(PermissionCodes.AdminFull)
            || _tenant.HasPermission(PermissionCodes.PlatformAdmin);
        var canDelete = isAdmin || _tenant.HasPermission(PermissionCodes.InboundDelete);
        if (!canDelete)
            throw new ForbiddenException();

        var load = await _loads.Query()
            .Include(l => l.Lines)
            .FirstOrDefaultAsync(l => l.Id == request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(InboundLoad), request.Id);

        // Non-admins may only delete drafts; admins may delete received/cancelled too.
        if (!isAdmin && load.Status != Domain.Enums.InboundStatus.Draft)
            throw new DomainException(
                "invalid_state",
                "Only draft inbound loads can be deleted unless you are an admin.");

        foreach (var line in load.Lines.Where(l => !l.IsDeleted))
        {
            line.IsDeleted = true;
            line.DeletedAt = DateTime.UtcNow;
            line.UpdatedBy = _tenant.UserId;
            line.UpdatedAt = DateTime.UtcNow;
        }

        _loads.Remove(load);
        load.UpdatedBy = _tenant.UserId;
        load.UpdatedAt = DateTime.UtcNow;

        await _uow.SaveChangesAsync(cancellationToken);
        await _audit.WriteAsync(
            "inbound.delete",
            nameof(InboundLoad),
            load.Id,
            new { load.LoadNumber, load.Status },
            null,
            cancellationToken);

        return Unit.Value;
    }
}
