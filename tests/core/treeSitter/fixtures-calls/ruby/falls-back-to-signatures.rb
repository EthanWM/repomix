# Ruby has no call-graph spec, so the calls mode compresses it like signatures
class OrderService
  def place(cart)
    order = Order.from_cart(cart)
    repo.save(order)
  end
end
