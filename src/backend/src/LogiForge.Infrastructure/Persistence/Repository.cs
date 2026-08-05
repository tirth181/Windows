using System.Linq.Expressions;
using LogiForge.Domain.Common;
using LogiForge.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace LogiForge.Infrastructure.Persistence;

public class Repository<T> : IRepository<T> where T : EntityBase
{
    private readonly LogiForgeDbContext _db;
    private readonly DbSet<T> _set;

    public Repository(LogiForgeDbContext db)
    {
        _db = db;
        _set = db.Set<T>();
    }

    public async Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default)
        => await _set.FirstOrDefaultAsync(e => e.Id == id && !e.IsDeleted, ct);

    public async Task<IReadOnlyList<T>> ListAsync(Expression<Func<T, bool>>? predicate = null, CancellationToken ct = default)
    {
        var q = _set.Where(e => !e.IsDeleted);
        if (predicate is not null) q = q.Where(predicate);
        return await q.ToListAsync(ct);
    }

    public async Task<T> AddAsync(T entity, CancellationToken ct = default)
    {
        await _set.AddAsync(entity, ct);
        return entity;
    }

    public async Task AddRangeAsync(IEnumerable<T> entities, CancellationToken ct = default)
        => await _set.AddRangeAsync(entities, ct);

    public void Update(T entity) => _set.Update(entity);

    public void Remove(T entity)
    {
        entity.IsDeleted = true;
        entity.DeletedAt = DateTime.UtcNow;
        _set.Update(entity);
    }

    public IQueryable<T> Query() => _set.Where(e => !e.IsDeleted).AsQueryable();
}

public class UnitOfWork : IUnitOfWork
{
    private readonly LogiForgeDbContext _db;
    public UnitOfWork(LogiForgeDbContext db) => _db = db;
    public Task<int> SaveChangesAsync(CancellationToken ct = default) => _db.SaveChangesAsync(ct);
}
