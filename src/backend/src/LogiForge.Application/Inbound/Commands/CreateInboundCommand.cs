using FluentValidation;
using LogiForge.Application.Inbound.Dtos;
using LogiForge.Domain.Common;
using LogiForge.Domain.Entities;
using LogiForge.Domain.Enums;
using LogiForge.Domain.Exceptions;
using LogiForge.Domain.Interfaces;
using MediatR;

namespace LogiForge.Application.Inbound.Commands;

public record CreateInboundCommand(CreateInboundRequest Request) : IRequest<InboundLoadDto>;

public class CreateInboundCommandValidator : AbstractValidator<CreateInboundCommand>
{
    public CreateInboundCommandValidator()
    {
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

public class CreateInboundCommandHandler : IRequestHandler<CreateInboundCommand, InboundLoadDto>
{
    private readonly IRepository<InboundLoad> _loads;
    private readonly IRepository<Customer> _customers;
    private readonly IRepository<Warehouse> _warehouses;
    private readonly IDocumentNumberGenerator _numbers;
    private readonly ITenantContext _tenant;
    private readonly IUnitOfWork _uow;
    private readonly IAuditService _audit;

    public CreateInboundCommandHandler(
        IRepository<InboundLoad> loads,
        IRepository<Customer> customers,
        IRepository<Warehouse> warehouses,
        IDocumentNumberGenerator numbers,
        ITenantContext tenant,
        IUnitOfWork uow,
        IAuditService audit)
    {
        _loads = loads;
        _customers = customers;
        _warehouses = warehouses;
        _numbers = numbers;
        _tenant = tenant;
        _uow = uow;
        _audit = audit;
    }

    public async Task<InboundLoadDto> Handle(CreateInboundCommand request, CancellationToken cancellationToken)
    {
        if (!_tenant.HasPermission(PermissionCodes.InboundCreate) && !_tenant.HasPermission(PermissionCodes.AdminFull))
            throw new ForbiddenException();
        if (_tenant.CompanyId is null) throw new ForbiddenException("Tenant context required.");

        var companyId = _tenant.CompanyId.Value;
        _ = await _customers.GetByIdAsync(request.Request.CustomerId, cancellationToken)
            ?? throw new NotFoundException(nameof(Customer), request.Request.CustomerId);
        _ = await _warehouses.GetByIdAsync(request.Request.WarehouseId, cancellationToken)
            ?? throw new NotFoundException(nameof(Warehouse), request.Request.WarehouseId);

        if (!_tenant.CanAccessWarehouse(request.Request.WarehouseId))
            throw new ForbiddenException("No access to this 3PL company.");

        var load = new InboundLoad
        {
            CompanyId = companyId,
            WarehouseId = request.Request.WarehouseId,
            CustomerId = request.Request.CustomerId,
            LoadNumber = await _numbers.NextInboundLoadNumberAsync(companyId, cancellationToken),
            SupplierName = request.Request.SupplierName,
            ArrivalDate = request.Request.ArrivalDate.ToUniversalTime(),
            Carrier = request.Request.Carrier,
            TrailerNumber = request.Request.TrailerNumber,
            Notes = request.Request.Notes,
            Status = InboundStatus.Draft,
            CreatedBy = _tenant.UserId
        };

        var lineNo = 1;
        foreach (var line in request.Request.Lines)
        {
            load.Lines.Add(new InboundLine
            {
                CompanyId = companyId,
                LineNumber = lineNo++,
                MaterialCode = line.MaterialCode.Trim(),
                MaterialDescription = line.MaterialDescription.Trim(),
                BatchNumber = line.BatchNumber.Trim(),
                Weight = line.Weight,
                Quantity = line.Quantity,
                BoxCount = line.BoxCount,
                PalletId = line.PalletId,
                PutawayLocationId = line.PutawayLocationId,
                Comments = line.Comments,
                Status = InventoryStatus.Available
            });
        }

        await _loads.AddAsync(load, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);
        await _audit.WriteAsync("inbound.create", nameof(InboundLoad), load.Id, null, load, cancellationToken);

        return Map(load);
    }

    internal static InboundLoadDto Map(InboundLoad load) => new(
        load.Id, load.LoadNumber, load.CustomerId, load.Customer?.Name, load.SupplierName,
        load.ArrivalDate, load.Carrier, load.TrailerNumber, load.WarehouseId, load.Warehouse?.Name,
        load.Notes, load.Status, load.ReceivedAt,
        load.Lines.Where(l => !l.IsDeleted).OrderBy(l => l.LineNumber).Select(l => new InboundLineDto(
            l.Id, l.LineNumber, l.MaterialCode, l.MaterialDescription, l.BatchNumber,
            l.Weight, l.Quantity, l.BoxCount, l.PalletId, l.PutawayLocationId, l.Status, l.Comments)).ToList());
}
