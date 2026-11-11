---
title: "Kod Sıkıştırma"
description: "Imports, exports, sınıflar, fonksiyonlar, arayüzler ve yapıyı korurken token kullanımını azaltmak için Repomix’te Tree-sitter tabanlı kod sıkıştırmayı kullanın."
---

# Kod Sıkıştırma

Kod sıkıştırma, uygulama ayrıntılarını kaldırırken temel kod yapılarını akıllıca çıkaran güçlü bir özelliktir. Bu özellik, kod tabanınız hakkındaki önemli yapısal bilgileri korurken token sayısını azaltmak için özellikle kullanışlıdır.

> [!NOTE]
> Bu, kullanıcı geri bildirimleri ve gerçek dünya kullanımına göre aktif olarak geliştireceğimiz deneysel bir özelliktir.

## Temel Kullanım

`--compress` bayrağını kullanarak kod sıkıştırmayı etkinleştirin:

```bash
repomix --compress
```

Uzak depolarla da kullanabilirsiniz:

```bash
repomix --remote user/repo --compress
```

## Nasıl Çalışır

Sıkıştırma algoritması, uygulama ayrıntılarını kaldırırken temel yapısal öğeleri çıkarmak ve korumak için tree-sitter ayrıştırmasını kullanarak kodu işler.

Sıkıştırma şunları korur:
- Fonksiyon ve metod imzaları
- Arayüz ve tür tanımları
- Sınıf yapıları ve özellikleri
- Önemli yapısal öğeler

Şunları kaldırır:
- Fonksiyon ve metod uygulamaları
- Döngü ve koşullu mantık ayrıntıları
- İç değişken bildirimleri
- Uygulamaya özgü kodlar

### Örnek

Orijinal TypeScript kodu:

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

Sıkıştırma sonrası:

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

## Yapılandırma

Sıkıştırmayı yapılandırma dosyasında etkinleştirebilirsiniz:

```json
{
  "output": {
    "compress": true
  }
}
```

## Kullanım Senaryoları

Kod sıkıştırma özellikle şu durumlarda işe yarar:
- Kod yapısı ve mimarisini analiz ederken
- LLM işleme için token sayısını azaltırken
- Üst düzey dokümantasyon oluştururken
- Kod kalıplarını ve imzaları anlamaya çalışırken
- API ve arayüz tasarımlarını paylaşırken

## İlgili Seçenekler

Sıkıştırmayı diğer seçeneklerle birleştirebilirsiniz:
- `--remove-comments`: Kod yorumlarını kaldırır (bkz. [Yorum Kaldırma](/tr/guide/comment-removal))
- `--remove-empty-lines`: Boş satırları kaldırır
- `--output-show-line-numbers`: Çıktıya satır numaraları ekler

## Sıkıştırma Modları

`--compress-mode`, sıkıştırmanın ne kadar ayrıntı koruyacağını seçer ve `--compress` seçeneğini de etkinleştirir:

| Mod | Çıktı |
|------|--------|
| `signatures` | Bildirimler, imzalar ve yorumlar (yukarıdaki örnekte olduğu gibi) |
| `calls` | Bildirim başına bir satır, iç içe geçmeye göre girintili, ardından gövdesinin yaptığı çağrılar. Gövdeler, yorumlar ve başlangıç değerleri kaldırılır |

```bash
repomix --compress-mode calls
```

`calls` modu çağrı grafiğini korur; böylece çıktı, kontrolün fonksiyonlar arasında nasıl aktığını çok daha az token ile gösterir. Bu C# kodu:

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

şuna dönüşür:

```text
public class OrderService : IOrderService
  private readonly IRepository _repo
  public async Task<Order> PlaceAsync(Cart cart) → Order.FromCart, _validator.Validate, new InvalidOperationException, _repo.SaveAsync, .ConfigureAwait
```

- `→`, bir gövdenin yaptığı çağrıları değerlendirme sırasıyla, her hedefi bir kez listeler.
- Baştaki nokta (`.ConfigureAwait`), önceki çağrının sonucu üzerinde yapılan çağrıyı belirtir.
- `→` ile başlayan satır, üst düzey ifadelerin yaptığı çağrıları listeler.

`calls` modu C#, Go, Java, JavaScript, Python, Rust ve TypeScript dillerini destekler. Diğer dillerdeki dosyalar `signatures` moduyla sıkıştırılır.

Yapılandırma dosyanızda ayarlamak için:

```json
{
  "output": {
    "compress": true,
    "compressMode": "calls"
  }
}
```

## İlgili Kaynaklar

- [Yorum Kaldırma](/tr/guide/comment-removal) - Token sayısını daha da azaltmak için yorumları kaldırın
- [Yapılandırma](/tr/guide/configuration) - Yapılandırma dosyanızda `output.compress` ayarlayın
- [Komut Satırı Seçenekleri](/tr/guide/command-line-options) - Tam CLI referansı
