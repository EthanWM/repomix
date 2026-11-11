import { Repository } from './repository';
import type { Logger } from './logger';

// Status of an order
export enum Status { Pending = 'pending', Shipped = 'shipped' }

export type OrderId = string;

export interface OrderStore {
  get(id: OrderId): Promise<Order | undefined>;
  readonly size: number;
}

/** Places orders. */
export class OrderService implements OrderStore {
  private cache = new Map<OrderId, Order>();
  readonly size: number = 0;

  constructor(private readonly repo: Repository, private logger?: Logger) {
    super();
  }

  async get(id: OrderId): Promise<Order | undefined> {
    return this.cache.get(id) ?? (await this.repo.find(id));
  }

  place = async (
    cart: Cart,
    options: { dryRun?: boolean } = {},
  ): Promise<Order> => {
    const order = Order.fromCart(cart);
    if (!validate(order)) {
      this.logger?.warn(`invalid ${order.id}`);
      throw new ValidationError(order.id);
    }
    cart.lines.filter((line) => line.qty > 0).forEach((line) => inventory.reserve(line.sku));
    await this.repo.save(order);
    return order;
  };
}

export const createService = (repo: Repository) => new OrderService(repo, createLogger('orders'));

export function validate(order: Order): boolean {
  return order.total > 0 && rules.every((rule) => rule(order));
}

const DEFAULT_LIMIT = 10, MAX_LIMIT = computeMax();

export { Repository };
export default createService(defaultRepo());

declare global {
  interface Window { orders: OrderService }
}

namespace Internal {
  export function helper() { return format(now()); }
}
