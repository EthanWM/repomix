"""Order processing."""
from __future__ import annotations

import logging
from dataclasses import dataclass, field

try:
    import ujson as json
except ImportError:
    import json

logger = logging.getLogger(__name__)
DEFAULT_TIMEOUT: float = 30.0


@dataclass
class Order:
    """An order."""

    id: str
    lines: list[Line] = field(default_factory=list)

    @property
    def total(self) -> float:
        return sum(line.price * line.qty for line in self.lines)


class OrderService(BaseService):
    registry = Registry()

    def __init__(self, repo: Repository, *, timeout: float = DEFAULT_TIMEOUT) -> None:
        super().__init__(timeout)
        self.repo = repo

    async def place(
        self,
        cart: Cart,
    ) -> Order:
        order = Order.from_cart(cart)
        if not self._validate(order):
            logger.warning("invalid %s", order.id)
            raise ValidationError(order.id)
        for line in cart.lines:
            inventory.reserve(line.sku, line.qty)
        await self.repo.save(order)
        notify = lambda o: events.publish("placed", o)
        notify(order)
        return order

    def _validate(self, order: Order) -> bool:
        def positive(x):
            return x > 0
        return positive(order.total) and all(rule(order) for rule in RULES)


def main(argv=None):
    args = parse_args(argv)
    service = OrderService(make_repo(args.db))
    asyncio.run(service.place(load_cart(args.cart)))


if __name__ == "__main__":
    main()
