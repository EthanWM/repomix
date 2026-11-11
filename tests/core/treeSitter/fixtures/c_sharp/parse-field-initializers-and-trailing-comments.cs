public class Config
{
    private const int MaxRetries = 3; // keep in sync with docs
    private static readonly Dictionary<string, int> Limits = new()
    {
        ["a"] = Compute(1),
        ["b"] = 2,
    };
    private int _x, _y = 5;
    public int Count { get; private set; } /* settable internally */

    public void Run() { Go(); } // trailing body comment
}
