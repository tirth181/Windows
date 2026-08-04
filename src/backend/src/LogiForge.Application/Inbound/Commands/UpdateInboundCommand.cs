using FluentValidation;
using LogiForge.Application.Inbound.Dtos;
using LogiForge.Domain.Common;
using LogiForge.Domain.Entities;
using LogiForge.Domain.Enums;
using LogiForge.Domain.Exceptions;
using LogiForge.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LogiForge.Application.Inbound.Commands;

public record UpdateInboundCommand(Guid Id, CreateInboundRequest Request) : IRequest<InboundLoadDto>;

public class UpdateInboundCommandValidator : AbstractValidator<UpdateInboundCommand>
{
    public UpdateInboundCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Request.CustomerId).NotEmpty();
        RuleFor(x => x.Request.WarehouseId).NotEmpty();
        RuleFor(x => x.Request.Lines).NotEmpty();
        RuleForEach(x => x.Request.Lines).ChildRules(line =>
        {
            line.RuleFor(l => l.MaterialCode).NotEmpty().MaximumLength(100);
            line.RuleFor(l => l.BatchNumber).NotEmpty().MaximumLength(100);
            line.RuleFor(l => l.Weight).GreaterThan(0);
            line.RuleFor(l => l.Quantity).GreaterThan(0);
        });
    }
}

public class UpdateInboundCommandHandler : IRequestHandler<UpdateInboundCommand, InboundLoadDto>
{
    private readonly IRepository<InboundLoad> _loads;
    private readonly ITenantContext _tenant;
    private readonly IUnitOfWork _uow;
    private readonly IAuditService _audit;

    public UpdateInboundCommandHandler(
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

    public async Task<InboundLoadDto> Handle(UpdateInboundCommand request, CancellationToken cancellationToken)
    {
        if (!_tenant.HasPermission(PermissionCodes.InboundEdit) && !_tenant.HasPermission(PermissionCodes.AdminFull))
            throw new ForbiddenException();

        var load = await _loads.Query()
            .Include(l => l.Lines)
            .FirstOrDefaultAsync(l => l.Id == request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(InboundLoad), request.Id);

        if (load.Status != InboundStatus.Draft)
            throw new DomainException("invalid_state", "Only draft inbound loads can be modified.");

        // Detach navigations that can confuse FK updates
        load.Customer = null;
        load.Warehouse = null;

        load.CustomerId = request.Request.CustomerId;
        load.WarehouseId = request.Request.WarehouseId;
        load.SupplierName = request.Request.SupplierName;
        load.ArrivalDate = request.Request.ArrivalDate.ToUniversalTime();
        load.Carrier = request.Request.Carrier;
        load.TrailerNumber = request.Request.TrailerNumber;
        load.Notes = request.Request.Notes;
        load.UpdatedAt = DateTime.UtcNow;
        load.UpdatedBy = _tenant.UserId;

        // Replace lines in-place when counts align; otherwise soft-delete + add
        var activeLines = load.Lines.Where(l => !l.IsDeleted).OrderBy(l => l.LineNumber).ToList();
        var incoming = request.Request.Lines.ToList();

        for (var i = 0; i < Math.Min(activeLines.Count, incoming.Count); i++)
        {
            var target = activeLines[i];
            var src = incoming[i];
            target.LineNumber = i + 1;
            target.MaterialCode = src.MaterialCode.Trim();
            target.MaterialDescription = src.MaterialDescription.Trim();
            target.BatchNumber = src.BatchNumber.Trim();
            target.Weight = src.Weight;
            target.Quantity = src.Quantity;
            target.BoxCount = src.BoxCount;
            target.PalletId = src.PalletId;
            target.PutawayLocationId = src.PutawayLocationId;
            target.Comments = src.Comments;
            target.UpdatedBy = _tenant.UserId;
            target.UpdatedAt = DateTime.UtcNow;
        }

        if (incoming.Count < activeLines.Count)
        {
            foreach (var extra in activeLines.Skip(incoming.Count))
            {
                extra.IsDeleted = true;
                extra.DeletedAt = DateTime.UtcNow;
                extra.UpdatedBy = _tenant.UserId;
            }
        }
        else if (incoming.Count > activeLines.Count)
        {
            for (var i = activeLines.Count; i < incoming.Count; i++)
            {
                var src = incoming[i];
                load.Lines.Add(new InboundLine
                {
                    CompanyId = load.CompanyId,
                    InboundLoadId = load.Id,
                    LineNumber = i + 1,
                    MaterialCode = src.MaterialCode.Trim(),
                    MaterialDescription = src.MaterialDescription.Trim(),
                    BatchNumber = src.BatchNumber.Trim(),
                    Weight = src.Weight,
                    Quantity = src.Quantity,
                    BoxCount = src.BoxCount,
                    PalletId = src.PalletId,
                    PutawayLocationId = src.PutawayLocationId,
                    Comments = src.Comments,
                    Status = InventoryStatus.Available,
                    CreatedBy = _tenant.UserId
                });
            }
        }

        await _uow.SaveChangesAsync(cancellationToken);
        await _audit.WriteAsync("inbound.update", nameof(InboundLoad), load.Id, null, new { load.LoadNumber, Lines = incoming.Count }, cancellationToken);

        load = await _loads.Query()
            .Include(l => l.Lines)
            .Include(l => l.Customer)
            .Include(l => l.Warehouse)
            .FirstAsync(l => l.Id == request.Id, cancellationToken);

        return CreateInboundCommandHandler.Map(load);
    }
}
