using System.Text.Json;
using LogiForge.Domain.Interfaces;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;

namespace LogiForge.Infrastructure.Caching;

public class RedisCacheService : ICacheService
{
    private readonly IDistributedCache _cache;
    private readonly ILogger<RedisCacheService> _logger;
    private static readonly Dictionary<string, object> MemoryFallback = new();

    public RedisCacheService(IDistributedCache cache, ILogger<RedisCacheService> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    public async Task<T?> GetAsync<T>(string key, CancellationToken ct = default)
    {
        try
        {
            var bytes = await _cache.GetAsync(key, ct);
            if (bytes is null)
            {
                lock (MemoryFallback)
                {
                    if (MemoryFallback.TryGetValue(key, out var mem) && mem is T typed) return typed;
                }
                return default;
            }
            return JsonSerializer.Deserialize<T>(bytes);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cache get failed for {Key}", key);
            lock (MemoryFallback)
            {
                if (MemoryFallback.TryGetValue(key, out var mem) && mem is T typed) return typed;
            }
            return default;
        }
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? expiry = null, CancellationToken ct = default)
    {
        try
        {
            var bytes = JsonSerializer.SerializeToUtf8Bytes(value);
            await _cache.SetAsync(key, bytes, new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = expiry ?? TimeSpan.FromMinutes(5)
            }, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Cache set failed for {Key}", key);
        }
        lock (MemoryFallback) { MemoryFallback[key] = value!; }
    }

    public async Task RemoveAsync(string key, CancellationToken ct = default)
    {
        try { await _cache.RemoveAsync(key, ct); } catch { /* ignore */ }
        lock (MemoryFallback) { MemoryFallback.Remove(key); }
    }

    public Task RemoveByPrefixAsync(string prefix, CancellationToken ct = default)
    {
        lock (MemoryFallback)
        {
            foreach (var key in MemoryFallback.Keys.Where(k => k.StartsWith(prefix)).ToList())
                MemoryFallback.Remove(key);
        }
        return Task.CompletedTask;
    }
}
