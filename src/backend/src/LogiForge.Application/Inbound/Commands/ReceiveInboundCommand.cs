using LogiForge.Application.Inbound.Dtos;
using LogiForge.Domain.Common;
using LogiForge.Domain.Entities;
using LogiForge.Domain.Enums;
using LogiForge.Domain.Exceptions;
using LogiForge.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LogiForge.Application.Inbound.Commands;

public record ReceiveInboundCommand(Guid InboundLoadId) : IRequest<InboundLoadDto>;

public class ReceiveInboundCommandHandler : IRequestHandler<ReceiveInboundCommand, InboundLoadDto>
{
    private readonly IRepository<InboundLoad> _loads;
    private readonly IRepository<InventoryItem> _inventory;
    private readonly IRepository<InventoryTransaction> _txns;
    private readonly IRepository<ActivityLog> _activity;
    private readonly ITenantContext _tenant;
    private readonly IUnitOfWork _uow;
    private readonly IAuditService _audit;
    private readonly IEmailService _email;
    private readonly ICacheService _cache;

    public ReceiveInboundCommandHandler(
        IRepository<InboundLoad> loads,
        IRepository<InventoryItem> inventory,
        IRepository<InventoryTransaction> txns,
        IRepository<ActivityLog> activity,
        ITenantContext tenant,
        IUnitOfWork uow,
        IAuditService audit,
        IEmailService email,
        ICacheService cache)
    {
        _loads = loads;
        _inventory = inventory;
        _txns = txns;
        _activity = activity;
        _tenant = tenant;
        _uow = uow;
        _audit = audit;
        _email = email;
        _cache = cache;
    }

    public async Task<InboundLoadDto> Handle(ReceiveInboundCommand request, CancellationToken cancellationToken)
    {
        if (!_tenant.HasPermission(PermissionCodes.InboundApprove) && !_tenant.HasPermission(PermissionCodes.AdminFull))
            throw new ForbiddenException();

        var load = await _loads.Query()
            .Include(l => l.Lines)
            .Include(l => l.Customer)
            .Include(l => l.Warehouse)
            .FirstOrDefaultAsync(l => l.Id == request.InboundLoadId, cancellationToken)
            ?? throw new NotFoundException(nameof(InboundLoad), request.InboundLoadId);

        if (load.Status != InboundStatus.Draft)
            throw new DomainException("invalid_state", "Only draft inbound loads can be received.");
        if (!load.Lines.Any())
            throw new DomainException("validation_failed", "Inbound load has no material lines.");
        if (load.Lines.Any(l => string.IsNullOrWhiteSpace(l.BatchNumber) || l.Weight <= 0))
            throw new DomainException("validation_failed", "All lines require batch number and positive weight.");

        var before = load.Status;
        load.Status = InboundStatus.Received;
        load.ReceivedAt = DateTime.UtcNow;
        load.ReceivedBy = _tenant.UserId;
        load.UpdatedAt = DateTime.UtcNow;
        load.UpdatedBy = _tenant.UserId;

        foreach (var line in load.Lines)
        {
            var item = new InventoryItem
            {
                CompanyId = load.CompanyId,
                WarehouseId = load.WarehouseId,
                CustomerId = load.CustomerId,
                MaterialCode = line.MaterialCode,
                MaterialDescription = line.MaterialDescription,
                BatchNumber = line.BatchNumber,
                PalletId = line.PalletId,
                LocationId = line.PutawayLocationId,
                OriginalWeight = line.Weight,
                RemainingWeight = line.Weight,
                Quantity = line.Quantity,
                BoxCount = line.BoxCount,
                Status = line.Status == InventoryStatus.Hold ? InventoryStatus.Hold : InventoryStatus.Available,
                InboundLineId = line.Id,
                LastUpdatedAt = DateTime.UtcNow,
                CreatedBy = _tenant.UserId
            };
            await _inventory.AddAsync(item, cancellationToken);
            await _txns.AddAsync(new InventoryTransaction
            {
                CompanyId = load.CompanyId,
                InventoryItemId = item.Id,
                TransactionType = InventoryTransactionType.Receive,
                QuantityDelta = item.Quantity,
                WeightDelta = item.RemainingWeight,
                ReferenceType = nameof(InboundLoad),
                ReferenceId = load.Id,
                Notes = $"Received via {load.LoadNumber}",
                CreatedBy = _tenant.UserId
            }, cancellationToken);
        }

        await _activity.AddAsync(new ActivityLog
        {
            CompanyId = load.CompanyId,
            UserId = _tenant.UserId,
            Category = "Inbound",
            Summary = $"Received load {load.LoadNumber} ({load.Lines.Count} lines)"
        }, cancellationToken);

        _loads.Update(load);
        await _uow.SaveChangesAsync(cancellationToken);
        await _audit.WriteAsync("inbound.receive", nameof(InboundLoad), load.Id, before, load.Status, cancellationToken);

        if (_tenant.CompanyId is not null)
        {
            await _email.QueueAsync(
                _tenant.CompanyId.Value,
                "InboundReceived",
                "ops@company.local",
                $"Inbound Received: {load.LoadNumber}",
                $"Load {load.LoadNumber} was received with {load.Lines.Count} material lines.",
                ct: cancellationToken);
            await _cache.RemoveByPrefixAsync($"tenant:{_tenant.CompanyId}:dashboard", cancellationToken);
        }

        return CreateInboundCommandHandler.Map(load);
    }
}
