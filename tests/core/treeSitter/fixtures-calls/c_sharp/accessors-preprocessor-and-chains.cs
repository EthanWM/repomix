global using System.Linq;
using static System.Math;
using Alias = System.Text.StringBuilder;
namespace Acme.Legacy
{
    #region Stuff
    public partial class Café<T> : Base<T>, IDisposable where T : class, new()
    {
        public int Value
        {
            get { return Compute(); }
            set { Store(value); }
        }
        public string Name { get; init; } = "x";
        public int Doubled { get => Value * 2; }
        static Café() { Init(); }
        ~Café() { Cleanup(); }
        void IDisposable.Dispose() => base.Dispose();
        public abstract void Abs();
        [HttpGet("x")]
        [Authorize]
        public IEnumerable<int> Query(
            int a,
            int b)
        {
            int Local(int x) => Helper(x);
            var q = items.Where(i => i.Ok()).Select(Map).ToList();
            var svc = provider.GetService<IFoo>();
            var o = new Foo { A = Make() };
            return nameof(a) switch { "a" => Local(1), _ => this.Other() };
        }
        public event EventHandler Changed
        {
            add { _h += value; Hook(); }
            remove { _h -= value; }
        }
#if DEBUG
        public void DebugOnly() { Log(); }
#endif
    }
    #endregion
    public record struct Point(int X, int Y);
    public interface IFoo { void A(); int B { get; } }
}
