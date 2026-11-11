use std::collections::HashMap;
use crate::repo::{Repository, Error};

/// An order.
#[derive(Debug, Clone)]
pub struct Order {
    pub id: String,
    lines: Vec<Line>,
}

pub struct Point(i32, i32);

pub enum Status {
    Pending,
    Shipped { at: u64 },
    Failed(String),
}

pub trait Store {
    type Key;
    fn get(&self, id: &str) -> Option<Order>;
    fn save(&mut self, order: Order) -> Result<(), Error> {
        self.validate(&order)?;
        Ok(())
    }
}

const MAX_LINES: usize = compute_max();
static GREETING: &str = "hi";

impl<R: Repository> Store for Service<R> {
    type Key = String;

    fn get(&self, id: &str) -> Option<Order> {
        self.cache.get(id).cloned().or_else(|| self.repo.find(id).ok())
    }
}

impl Service {
    pub fn new(repo: Box<dyn Repository>) -> Self {
        println!("creating service");
        Self { repo, cache: HashMap::new() }
    }
}

macro_rules! log_order {
    ($o:expr) => { println!("{:?}", $o) };
}

mod tests {
    #[test]
    fn places_order() {
        let svc = Service::new(Box::new(MemRepo::default()));
        assert!(svc.get("x").is_none());
    }
}
