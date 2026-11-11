package com.acme.orders;

import java.util.List;
import java.util.Map;

/** Places orders. */
@Service
public class OrderService extends BaseService implements Placer {
    private static final int MAX_RETRIES = 3;
    private final Map<String, Order> cache = new HashMap<>();
    @Column(name = "repo") private final Repository repo;

    public OrderService(Repository repo) {
        super(repo.getName());
        this.repo = repo;
    }

    @Override
    public Order place(Cart cart) throws ValidationException {
        Order order = Order.fromCart(cart);
        if (!validator.validate(order)) {
            log.warn("invalid {}", order.getId());
            throw new ValidationException(order.getId());
        }
        cart.getLines().stream().filter(l -> l.qty() > 0).forEach(l -> inventory.reserve(l.sku()));
        repo.save(order);
        return order;
    }

    abstract void audit(Order order);

    static {
        Registry.register(OrderService.class);
    }
}

enum Status {
    PENDING("p"), SHIPPED("s") { @Override boolean done() { return true; } };

    private final String code;

    Status(String code) { this.code = code; }

    boolean done() { return false; }
}

record Line(String sku, int qty) {
    Line {
        Objects.requireNonNull(sku);
    }
}

interface Placer {
    Order place(Cart cart) throws ValidationException;
}
