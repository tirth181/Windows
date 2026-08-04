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

public record UpdateOutboundCommand(Guid Id, CreateOutboundRequest Request) : IRequest<OutboundOrderDto>;

public class UpdateOutboundCommandValidator : AbstractValidator<UpdateOutboundCommand>
{
    public UpdateOutboundCommandValidator()
    {
        RuleFor(x => x.Id).NotEmpty();
        RuleFor(x => x.Request.CustomerId).NotEmpty();
        RuleFor(x => x.Request.WarehouseId).NotEmpty();
        // Lines may be omitted for shipped attachment-only updates
    }
}

public class UpdateOutboundCommandHandler : IRequestHandler<UpdateOutboundCommand, OutboundOrderDto>
{
    private readonly IRepository<OutboundOrder> _orders;
    private readonly IRepository<InventoryItem> _inventory;
    private readonly ITenantContext _tenant;
    private readonly IUnitOfWork _uow;
    private readonly IAuditService _audit;

    public UpdateOutboundCommandHandler(
        IRepository<OutboundOrder> orders,
        IRepository<InventoryItem> inventory,
        ITenantContext tenant,
        IUnitOfWork uow,
        IAuditService audit)
    {
        _orders = orders;
        _inventory = inventory;
        _tenant = tenant;
        _uow = uow;
        _audit = audit;
    }

    public async Task<OutboundOrderDto> Handle(UpdateOutboundCommand request, CancellationToken cancellationToken)
    {
        if (!_tenant.HasPermission(PermissionCodes.OutboundEdit) && !_tenant.HasPermission(PermissionCodes.AdminFull))
            throw new ForbiddenException();

        var order = await _orders.Query()
            .Include(o => o.Lines)
            .FirstOrDefaultAsync(o => o.Id == request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(OutboundOrder), request.Id);

        if (order.Status is OutboundStatus.Cancelled)
            throw new DomainException("invalid_state", "Cancelled orders cannot be modified.");

        // Shipped orders stay locked except for document attachment references
        // (stored on CustomerPo / ShippingTerms for packing lists, BOLs, etc.)
        if (order.Status is OutboundStatus.Shipped)
        {
            order.CustomerPo = request.Request.CustomerPo;
            order.ShippingTerms = request.Request.ShippingTerms;
            order.UpdatedAt = DateTime.UtcNow;
            order.UpdatedBy = _tenant.UserId;
            _orders.Update(order);
            await _uow.SaveChangesAsync(cancellationToken);
            await _audit.WriteAsync(
                "outbound.attachment",
                nameof(OutboundOrder),
                order.Id,
                null,
                new { order.OrderNumber, order.CustomerPo },
                cancellationToken);

            order = await _orders.Query()
                .Include(o => o.Lines)
                .Include(o => o.Customer)
                .FirstAsync(o => o.Id == request.Id, cancellationToken);

            return CreateOutboundCommandHandler.Map(order);
        }

        order.Customer = null;
        order.Warehouse = null;
        order.CustomerId = request.Request.CustomerId;
        order.WarehouseId = request.Request.WarehouseId;
        order.CustomerPo = request.Request.CustomerPo;
        order.ShippingTerms = request.Request.ShippingTerms;
        order.Carrier = request.Request.Carrier;
        order.TrackingNumber = request.Request.TrackingNumber;
        order.ShipmentDate = request.Request.ShipmentDate.ToUniversalTime();
        order.TrailerNumber = request.Request.TrailerNumber;
        order.UpdatedAt = DateTime.UtcNow;
        order.UpdatedBy = _tenant.UserId;

        var activeLines = order.Lines.Where(l => !l.IsDeleted).OrderBy(l => l.MaterialCode).ToList();
        var incoming = request.Request.Lines.ToList();

        for (var i = 0; i < Math.Min(activeLines.Count, incoming.Count); i++)
        {
            var src = incoming[i];
            var item = await _inventory.GetByIdAsync(src.InventoryItemId, cancellationToken)
                ?? throw new NotFoundException(nameof(InventoryItem), src.InventoryItemId);
            if (src.Weight > item.RemainingWeight || src.Quantity > item.Quantity)
                throw new DomainException("insufficient_inventory", $"Insufficient inventory for batch {item.BatchNumber}.");

            var target = activeLines[i];
            target.InventoryItemId = item.Id;
            target.MaterialCode = item.MaterialCode;
            target.BatchNumber = item.BatchNumber;
            target.Weight = src.Weight;
            target.Quantity = src.Quantity;
            target.LocationId = item.LocationId;
            target.PalletCount = src.PalletCount;
            target.BoxCount = src.BoxCount;
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
                var item = await _inventory.GetByIdAsync(src.InventoryItemId, cancellationToken)
                    ?? throw new NotFoundException(nameof(InventoryItem), src.InventoryItemId);
                if (src.Weight > item.RemainingWeight || src.Quantity > item.Quantity)
                    throw new DomainException("insufficient_inventory", $"Insufficient inventory for batch {item.BatchNumber}.");

                order.Lines.Add(new OutboundLine
                {
                    CompanyId = order.CompanyId,
                    OutboundOrderId = order.Id,
                    InventoryItemId = item.Id,
                    MaterialCode = item.MaterialCode,
                    BatchNumber = item.BatchNumber,
                    Weight = src.Weight,
                    Quantity = src.Quantity,
                    LocationId = item.LocationId,
                    PalletCount = src.PalletCount,
                    BoxCount = src.BoxCount,
                    CreatedBy = _tenant.UserId
                });
            }
        }

        CreateOutboundCommandHandler.Recalc(order);
        await _uow.SaveChangesAsync(cancellationToken);
        await _audit.WriteAsync("outbound.update", nameof(OutboundOrder), order.Id, null, new { order.OrderNumber }, cancellationToken);

        order = await _orders.Query()
            .Include(o => o.Lines)
            .Include(o => o.Customer)
            .FirstAsync(o => o.Id == request.Id, cancellationToken);

        return CreateOutboundCommandHandler.Map(order);
    }
}
