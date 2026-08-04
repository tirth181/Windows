using FluentValidation;
using LogiForge.Application.Outbound.Dtos;
using LogiForge.Domain.Common;
using LogiForge.Domain.Entities;
using LogiForge.Domain.Enums;
using LogiForge.Domain.Exceptions;
using LogiForge.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LogiForge.Application.Outbound.Commands;

public record CreateOutboundCommand(CreateOutboundRequest Request) : IRequest<OutboundOrderDto>;

public class CreateOutboundCommandValidator : AbstractValidator<CreateOutboundCommand>
{
    public CreateOutboundCommandValidator()
    {
        RuleFor(x => x.Request.CustomerId).NotEmpty();
        RuleFor(x => x.Request.WarehouseId).NotEmpty();
        RuleFor(x => x.Request.Lines).NotEmpty();
    }
}

public class CreateOutboundCommandHandler : IRequestHandler<CreateOutboundCommand, OutboundOrderDto>
{
    private readonly IRepository<OutboundOrder> _orders;
    private readonly IRepository<InventoryItem> _inventory;
    private readonly IDocumentNumberGenerator _numbers;
    private readonly ITenantContext _tenant;
    private readonly IUnitOfWork _uow;
    private readonly IAuditService _audit;

    public CreateOutboundCommandHandler(
        IRepository<OutboundOrder> orders,
        IRepository<InventoryItem> inventory,
        IDocumentNumberGenerator numbers,
        ITenantContext tenant,
        IUnitOfWork uow,
        IAuditService audit)
    {
        _orders = orders;
        _inventory = inventory;
        _numbers = numbers;
        _tenant = tenant;
        _uow = uow;
        _audit = audit;
    }

    public async Task<OutboundOrderDto> Handle(CreateOutboundCommand request, CancellationToken cancellationToken)
    {
        if (!_tenant.HasPermission(PermissionCodes.OutboundCreate) && !_tenant.HasPermission(PermissionCodes.AdminFull))
            throw new ForbiddenException();
        if (_tenant.CompanyId is null) throw new ForbiddenException();

        var companyId = _tenant.CompanyId.Value;
        var order = new OutboundOrder
        {
            CompanyId = companyId,
            WarehouseId = request.Request.WarehouseId,
            CustomerId = request.Request.CustomerId,
            OrderNumber = await _numbers.NextOutboundOrderNumberAsync(companyId, cancellationToken),
            CustomerPo = request.Request.CustomerPo,
            ShippingTerms = request.Request.ShippingTerms,
            Carrier = request.Request.Carrier,
            TrackingNumber = request.Request.TrackingNumber,
            ShipmentDate = request.Request.ShipmentDate.ToUniversalTime(),
            TrailerNumber = request.Request.TrailerNumber,
            Status = OutboundStatus.Draft,
            CreatedBy = _tenant.UserId
        };

        foreach (var line in request.Request.Lines)
        {
            var item = await _inventory.GetByIdAsync(line.InventoryItemId, cancellationToken)
                ?? throw new NotFoundException(nameof(InventoryItem), line.InventoryItemId);
            if (item.Status is InventoryStatus.Hold or InventoryStatus.Damaged or InventoryStatus.Shipped)
                throw new DomainException("invalid_inventory", $"Inventory {item.BatchNumber} is not shippable.");
            if (line.Weight > item.RemainingWeight || line.Quantity > item.Quantity)
                throw new DomainException("insufficient_inventory", $"Insufficient inventory for batch {item.BatchNumber}.");

            order.Lines.Add(new OutboundLine
            {
                CompanyId = companyId,
                InventoryItemId = item.Id,
                MaterialCode = item.MaterialCode,
                BatchNumber = item.BatchNumber,
                Weight = line.Weight,
                Quantity = line.Quantity,
                LocationId = item.LocationId,
                PalletCount = line.PalletCount,
                BoxCount = line.BoxCount
            });
        }

        Recalc(order);
        await _orders.AddAsync(order, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);
        await _audit.WriteAsync("outbound.create", nameof(OutboundOrder), order.Id, null, order, cancellationToken);
        return Map(order);
    }

    internal static void Recalc(OutboundOrder order)
    {
        var active = order.Lines.Where(l => !l.IsDeleted).ToList();
        order.TotalWeight = active.Sum(l => l.Weight);
        order.TotalPallets = active.Sum(l => l.PalletCount);
        order.TotalMaterials = active.Select(l => l.MaterialCode).Distinct().Count();
        order.TotalBoxes = active.Sum(l => l.BoxCount);
    }

    internal static OutboundOrderDto Map(OutboundOrder o) => new(
        o.Id, o.OrderNumber, o.CustomerPo, o.CustomerId, o.Customer?.Name, o.ShippingTerms,
        o.Carrier, o.TrackingNumber, o.ShipmentDate, o.TrailerNumber, o.WarehouseId, o.Status,
        o.TotalWeight, o.TotalPallets, o.TotalMaterials, o.TotalBoxes, o.ShippedAt,
        o.Lines.Where(l => !l.IsDeleted).Select(l => new OutboundLineDto(l.Id, l.InventoryItemId, l.MaterialCode, l.BatchNumber,
            l.Weight, l.Quantity, l.LocationId, l.PalletCount, l.BoxCount)).ToList());
}

public record ShipOutboundCommand(Guid OrderId) : IRequest<OutboundOrderDto>;

public class ShipOutboundCommandHandler : IRequestHandler<ShipOutboundCommand, OutboundOrderDto>
{
    private readonly IRepository<OutboundOrder> _orders;
    private readonly IRepository<InventoryItem> _inventory;
    private readonly IRepository<InventoryTransaction> _txns;
    private readonly IRepository<ActivityLog> _activity;
    private readonly ITenantContext _tenant;
    private readonly IUnitOfWork _uow;
    private readonly IAuditService _audit;
    private readonly IEmailService _email;
    private readonly ICacheService _cache;

    public ShipOutboundCommandHandler(
        IRepository<OutboundOrder> orders,
        IRepository<InventoryItem> inventory,
        IRepository<InventoryTransaction> txns,
        IRepository<ActivityLog> activity,
        ITenantContext tenant,
        IUnitOfWork uow,
        IAuditService audit,
        IEmailService email,
        ICacheService cache)
    {
        _orders = orders;
        _inventory = inventory;
        _txns = txns;
        _activity = activity;
        _tenant = tenant;
        _uow = uow;
        _audit = audit;
        _email = email;
        _cache = cache;
    }

    public async Task<OutboundOrderDto> Handle(ShipOutboundCommand request, CancellationToken cancellationToken)
    {
        if (!_tenant.HasPermission(PermissionCodes.OutboundShip) && !_tenant.HasPermission(PermissionCodes.AdminFull))
            throw new ForbiddenException();

        var order = await _orders.Query()
            .Include(o => o.Lines)
            .Include(o => o.Customer)
            .FirstOrDefaultAsync(o => o.Id == request.OrderId, cancellationToken)
            ?? throw new NotFoundException(nameof(OutboundOrder), request.OrderId);

        if (order.Status is OutboundStatus.Shipped or OutboundStatus.Cancelled)
            throw new DomainException("invalid_state", "Order cannot be shipped in its current state.");

        foreach (var line in order.Lines)
        {
            if (line.InventoryItemId is null) throw new DomainException("validation_failed", "Line missing inventory reference.");
            var item = await _inventory.GetByIdAsync(line.InventoryItemId.Value, cancellationToken)
                ?? throw new NotFoundException(nameof(InventoryItem), line.InventoryItemId);
            if (item.RemainingWeight < line.Weight || item.Quantity < line.Quantity)
                throw new DomainException("insufficient_inventory", $"Insufficient inventory for batch {item.BatchNumber}.");

            item.RemainingWeight -= line.Weight;
            item.Quantity -= line.Quantity;
            item.BoxCount = Math.Max(0, item.BoxCount - line.BoxCount);
            if (item.RemainingWeight == 0 || item.Quantity == 0)
                item.Status = InventoryStatus.Shipped;
            else if (item.RemainingWeight < item.OriginalWeight)
                item.Status = InventoryStatus.Partial;
            item.LastUpdatedAt = DateTime.UtcNow;
            _inventory.Update(item);

            await _txns.AddAsync(new InventoryTransaction
            {
                CompanyId = order.CompanyId,
                InventoryItemId = item.Id,
                TransactionType = InventoryTransactionType.Ship,
                QuantityDelta = -line.Quantity,
                WeightDelta = -line.Weight,
                ReferenceType = nameof(OutboundOrder),
                ReferenceId = order.Id,
                Notes = $"Shipped on {order.OrderNumber}",
                CreatedBy = _tenant.UserId
            }, cancellationToken);
        }

        order.Status = OutboundStatus.Shipped;
        order.ShippedAt = DateTime.UtcNow;
        order.ShippedBy = _tenant.UserId;
        CreateOutboundCommandHandler.Recalc(order);
        _orders.Update(order);

        await _activity.AddAsync(new ActivityLog
        {
            CompanyId = order.CompanyId,
            UserId = _tenant.UserId,
            Category = "Outbound",
            Summary = $"Shipped order {order.OrderNumber}"
        }, cancellationToken);

        await _uow.SaveChangesAsync(cancellationToken);
        await _audit.WriteAsync("outbound.ship", nameof(OutboundOrder), order.Id, OutboundStatus.Draft, order.Status, cancellationToken);

        if (_tenant.CompanyId is not null)
        {
            await _email.QueueAsync(_tenant.CompanyId.Value, "OutboundCompleted", "ops@company.local",
                $"Outbound Completed: {order.OrderNumber}",
                $"Order {order.OrderNumber} shipped. Weight {order.TotalWeight}, pallets {order.TotalPallets}.",
                ct: cancellationToken);
            await _cache.RemoveByPrefixAsync($"tenant:{_tenant.CompanyId}:dashboard", cancellationToken);
        }

        return CreateOutboundCommandHandler.Map(order);
    }
}
