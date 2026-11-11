using System;
using System.Collections.Generic;

namespace Acme.Orders.Services;

public record OrderPlaced(Guid Id, decimal Total);

public enum OrderStatus { Pending, Shipped, Cancelled }

public struct Money
{
    public decimal Amount;
    public Money(decimal amount) { Amount = amount; }
}

public delegate void OrderHandler(Order order);

[Service]
public sealed class OrderService(IRepository repo, ILogger<OrderService> logger) : IOrderService
{
    private readonly Dictionary<Guid, Order> _cache = new();
    public event OrderHandler? Placed;

    public OrderService() : this(null!, null!) { }

    public Order this[Guid id] => _cache[id];

    public static Money operator +(OrderService a, Money b) => b;

    public async Task<Order> PlaceAsync(Cart cart, CancellationToken ct = default)
    {
        var order = Order.FromCart(cart);
        if (!_validator.Validate(order))
        {
            logger.LogWarning("Invalid order {Id}", order.Id);
            throw new InvalidOperationException();
        }
        foreach (var line in cart.Lines)
        {
            _inventory.Reserve(line.Sku, line.Qty);
        }
        await repo.SaveAsync(order, ct).ConfigureAwait(false);
        Placed?.Invoke(order);
        return order;
    }

    public int Count => _cache.Count;

    private bool Check(Order o) => o.Total > 0 && Helpers.IsValid(o);
}
