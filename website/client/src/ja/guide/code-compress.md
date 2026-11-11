---
title: コード圧縮
description: "Tree-sitterベースのRepomixコード圧縮を使い、imports、exports、クラス、関数、インターフェース、構造を保ちながらトークン使用量を削減します。"
---

# コード圧縮
コード圧縮は、実装の詳細を省きながら、コードの本質的な構造を抽出する強力な機能です。トークン数を削減しながらコードベースの重要な構造情報を維持したい場合に特に有用です。

> [!NOTE]
> これは実験的な機能であり、ユーザーのフィードバックや実際の使用状況に基づいて積極的に改善を行っています。

## 基本的な使い方

`--compress`フラグを使用してコード圧縮を有効にします：

```bash
repomix --compress
```

リモートリポジトリでも使用できます：

```bash
repomix --remote user/repo --compress
```

## 仕組み

圧縮アルゴリズムは、tree-sitterパーシングを使用してコードを処理し、本質的な構造要素を抽出・保持しながら、実装の詳細を除外します。

圧縮で保持される要素：
- 関数やメソッドのシグネチャ
- インターフェースと型定義
- クラス構造とプロパティ
- 重要な構造的要素

以下の要素は除外されます：
- 関数やメソッドの実装内容
- ループや条件分岐のロジック詳細
- 内部変数の宣言
- 実装固有のコード

### 例

元のTypeScriptコード：

```typescript
import { ShoppingItem } from './shopping-item';

/**
 * Calculate the total price of shopping items
 */
const calculateTotal = (
  items: ShoppingItem[]
) => {
  let total = 0;
  for (const item of items) {
    total += item.price * item.quantity;
  }
  return total;
}

// Shopping item interface
interface Item {
  name: string;
  price: number;
  quantity: number;
}
```

圧縮後：

```typescript
import { ShoppingItem } from './shopping-item';
⋮----
/**
 * Calculate the total price of shopping items
 */
const calculateTotal = (
  items: ShoppingItem[]
) => {
⋮----
// Shopping item interface
interface Item {
  name: string;
  price: number;
  quantity: number;
}
```

## 設定

設定ファイルで圧縮を有効にすることもできます：

```json
{
  "output": {
    "compress": true
  }
}
```

## ユースケース

コード圧縮は以下のような場合に特に有用です：
- コードの構造やアーキテクチャの分析
- LLM処理のためのトークン数削減
- 高レベルなドキュメントの作成
- コードパターンやシグネチャの理解
- APIやインターフェース設計の共有

## 関連オプション

圧縮は以下のオプションと組み合わせることができます：
- `--remove-comments`: コードコメントを削除（[コメント削除](/ja/guide/comment-removal)を参照）
- `--remove-empty-lines`: 空行を削除
- `--output-show-line-numbers`: 出力に行番号を追加

## 圧縮モード

`--compress-mode`は圧縮で残す詳細度を選択します。指定すると`--compress`も有効になります：

| モード | 出力 |
|------|--------|
| `signatures` | 宣言、シグネチャ、コメント（上記の例と同じ） |
| `calls` | 宣言ごとに1行、ネストに応じてインデントし、その本体が行う呼び出しを続けて表示します。本体、コメント、初期化値は削除されます |

```bash
repomix --compress-mode calls
```

`calls`モードはコールグラフを保持するため、わずかなトークンで関数間の制御の流れがわかります。次のC#コードは：

```csharp
public class OrderService : IOrderService
{
    private readonly IRepository _repo;

    public async Task<Order> PlaceAsync(Cart cart)
    {
        var order = Order.FromCart(cart);
        if (!_validator.Validate(order))
        {
            throw new InvalidOperationException();
        }
        await _repo.SaveAsync(order).ConfigureAwait(false);
        return order;
    }
}
```

次のようになります：

```text
public class OrderService : IOrderService
  private readonly IRepository _repo
  public async Task<Order> PlaceAsync(Cart cart) → Order.FromCart, _validator.Validate, new InvalidOperationException, _repo.SaveAsync, .ConfigureAwait
```

- `→`は本体が行う呼び出しを評価順に列挙します（同じ呼び出し先は1回のみ）。
- 先頭のドット（`.ConfigureAwait`）は、直前の呼び出しの結果に対する呼び出しを表します。
- `→`で始まる行は、トップレベルの文が行う呼び出しを列挙します。

`calls`モードはC#、Go、Java、JavaScript、Python、Rust、TypeScriptに対応しています。その他の言語のファイルは`signatures`モードで圧縮されます。

設定ファイルで指定する場合：

```json
{
  "output": {
    "compress": true,
    "compressMode": "calls"
  }
}
```

## 関連リソース

- [コメント削除](/ja/guide/comment-removal) - コメント除去によるさらなるトークン数削減
- [設定](/ja/guide/configuration) - 設定ファイルで`output.compress`を設定
- [コマンドラインオプション](/ja/guide/command-line-options) - CLIリファレンス