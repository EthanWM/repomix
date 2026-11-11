package server

import (
	"context"
	"fmt"
)

// Server serves orders.
type Server struct {
	addr string `json:"addr"`
	repo Repository
	*log.Logger
}

type Repository interface {
	Save(ctx context.Context, o *Order) error
	io.Closer
}

type (
	ID      string
	Handler func(ctx context.Context) error
)

const (
	DefaultPort = 8080
	maxConns    = computeMax()
)

var ErrInvalid = errors.New("invalid order")

func New(addr string, repo Repository) *Server {
	return &Server{addr: addr, repo: repo, Logger: log.New(os.Stderr, "", 0)}
}

func (s *Server) Place(ctx context.Context, cart *Cart) (*Order, error) {
	order := OrderFromCart(cart)
	if err := validate(order); err != nil {
		s.Printf("invalid %s", order.ID)
		return nil, fmt.Errorf("place: %w", err)
	}
	go func() { metrics.Inc("placed") }()
	defer s.repo.Close()
	return order, s.repo.Save(ctx, order)
}

func main() {
	srv := New(fmt.Sprintf(":%d", DefaultPort), newRepo())
	log.Fatal(http.ListenAndServe(srv.addr, srv.Handler()))
}
