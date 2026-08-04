using LogiForge.Domain.Common;
using LogiForge.Domain.Entities;
using LogiForge.Domain.Exceptions;
using LogiForge.Domain.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace LogiForge.Application.Customers.Commands;

public record CustomerDto(Guid Id, string Code, string Name, bool IsActive, string? ContactJson);
public record UpsertCustomerRequest(string Code, string Name, string? ContactJson, bool IsActive = true);
public record CreateCustomerCommand(UpsertCustomerRequest Request) : IRequest<CustomerDto>;
public record UpdateCustomerCommand(Guid Id, UpsertCustomerRequest Request) : IRequest<CustomerDto>;
public record GetCustomersQuery(string? Search = null) : IRequest<IReadOnlyList<CustomerDto>>;

public class CreateCustomerCommandHandler : IRequestHandler<CreateCustomerCommand, CustomerDto>
{
    private readonly IRepository<Customer> _customers;
    private readonly ITenantContext _tenant;
    private readonly IUnitOfWork _uow;

    public CreateCustomerCommandHandler(IRepository<Customer> customers, ITenantContext tenant, IUnitOfWork uow)
    {
        _customers = customers; _tenant = tenant; _uow = uow;
    }

    public async Task<CustomerDto> Handle(CreateCustomerCommand request, CancellationToken cancellationToken)
    {
        if (!_tenant.HasPermission(PermissionCodes.CustomersManage) && !_tenant.HasPermission(PermissionCodes.AdminFull))
            throw new ForbiddenException();
        if (_tenant.CompanyId is null) throw new ForbiddenException();

        var entity = new Customer
        {
            CompanyId = _tenant.CompanyId.Value,
            Code = request.Request.Code.Trim(),
            Name = request.Request.Name.Trim(),
            ContactJson = request.Request.ContactJson,
            IsActive = request.Request.IsActive,
            CreatedBy = _tenant.UserId
        };
        await _customers.AddAsync(entity, cancellationToken);
        await _uow.SaveChangesAsync(cancellationToken);
        return new CustomerDto(entity.Id, entity.Code, entity.Name, entity.IsActive, entity.ContactJson);
    }
}

public class GetCustomersQueryHandler : IRequestHandler<GetCustomersQuery, IReadOnlyList<CustomerDto>>
{
    private readonly IRepository<Customer> _customers;
    private readonly ITenantContext _tenant;

    public GetCustomersQueryHandler(IRepository<Customer> customers, ITenantContext tenant)
    {
        _customers = customers; _tenant = tenant;
    }

    public async Task<IReadOnlyList<CustomerDto>> Handle(GetCustomersQuery request, CancellationToken cancellationToken)
    {
        if (!_tenant.HasPermission(PermissionCodes.CustomersView) && !_tenant.HasPermission(PermissionCodes.AdminFull))
            throw new ForbiddenException();
        var q = _customers.Query().AsQueryable();
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var s = request.Search.Trim().ToLower();
            q = q.Where(c => c.Code.ToLower().Contains(s) || c.Name.ToLower().Contains(s));
        }
        return await q.OrderBy(c => c.Name)
            .Select(c => new CustomerDto(c.Id, c.Code, c.Name, c.IsActive, c.ContactJson))
            .ToListAsync(cancellationToken);
    }
}

public class UpdateCustomerCommandHandler : IRequestHandler<UpdateCustomerCommand, CustomerDto>
{
    private readonly IRepository<Customer> _customers;
    private readonly ITenantContext _tenant;
    private readonly IUnitOfWork _uow;
    private readonly IAuditService _audit;

    public UpdateCustomerCommandHandler(IRepository<Customer> customers, ITenantContext tenant, IUnitOfWork uow, IAuditService audit)
    {
        _customers = customers; _tenant = tenant; _uow = uow; _audit = audit;
    }

    public async Task<CustomerDto> Handle(UpdateCustomerCommand request, CancellationToken cancellationToken)
    {
        if (!_tenant.HasPermission(PermissionCodes.CustomersManage) && !_tenant.HasPermission(PermissionCodes.AdminFull))
            throw new ForbiddenException();

        var entity = await _customers.GetByIdAsync(request.Id, cancellationToken)
            ?? throw new NotFoundException(nameof(Customer), request.Id);

        entity.Code = request.Request.Code.Trim();
        entity.Name = request.Request.Name.Trim();
        entity.ContactJson = request.Request.ContactJson;
        entity.IsActive = request.Request.IsActive;
        entity.UpdatedBy = _tenant.UserId;
        _customers.Update(entity);
        await _uow.SaveChangesAsync(cancellationToken);
        await _audit.WriteAsync("customers.update", nameof(Customer), entity.Id, null, new { entity.Code, entity.Name }, cancellationToken);
        return new CustomerDto(entity.Id, entity.Code, entity.Name, entity.IsActive, entity.ContactJson);
    }
}
