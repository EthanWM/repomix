---
title: "Сжатие кода"
description: "Используйте сжатие кода Repomix на основе Tree-sitter, чтобы уменьшить расход токенов, сохраняя imports, exports, классы, функции, интерфейсы и структуру."
---

# Сжатие кода

Сжатие кода — это мощная функция, которая интеллектуально извлекает существенные структуры кода, удаляя детали реализации. Это особенно полезно для уменьшения количества токенов при сохранении важной структурной информации о вашей кодовой базе.

> [!NOTE]
> Это экспериментальная функция, которую мы будем активно улучшать на основе отзывов пользователей и реального использования

## Базовое использование

Включите сжатие кода с помощью флага `--compress`:

```bash
repomix --compress
```

Вы также можете использовать его с удалёнными репозиториями:

```bash
repomix --remote user/repo --compress
```

## Как это работает

Алгоритм сжатия обрабатывает код с помощью парсинга tree-sitter для извлечения и сохранения существенных структурных элементов при удалении деталей реализации.

Сжатие сохраняет:
- Сигнатуры функций и методов
- Определения интерфейсов и типов
- Структуры классов и свойства
- Важные структурные элементы

При этом удаляет:
- Реализации функций и методов
- Детали циклов и условной логики
- Внутренние объявления переменных
- Код, специфичный для реализации

### Пример

Оригинальный код TypeScript:

```typescript
import { ShoppingItem } from './shopping-item';

/**
 * Рассчитать общую стоимость товаров
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

// Интерфейс товара
interface Item {
  name: string;
  price: number;
  quantity: number;
}
```

После сжатия:

```typescript
import { ShoppingItem } from './shopping-item';
⋮----
/**
 * Рассчитать общую стоимость товаров
 */
const calculateTotal = (
  items: ShoppingItem[]
) => {
⋮----
// Интерфейс товара
interface Item {
  name: string;
  price: number;
  quantity: number;
}
```

## Конфигурация

Вы можете включить сжатие в файле конфигурации:

```json
{
  "output": {
    "compress": true
  }
}
```

## Сценарии использования

Сжатие кода особенно полезно, когда:
- Анализируете структуру и архитектуру кода
- Уменьшаете количество токенов для обработки LLM
- Создаёте высокоуровневую документацию
- Изучаете паттерны кода и сигнатуры
- Делитесь дизайном API и интерфейсов

## Связанные опции

Вы можете комбинировать сжатие с другими опциями:
- `--remove-comments`: Удаление комментариев кода (см. [Удаление комментариев](/ru/guide/comment-removal))
- `--remove-empty-lines`: Удаление пустых строк
- `--output-show-line-numbers`: Добавление номеров строк в вывод

## Режимы сжатия

`--compress-mode` выбирает, сколько деталей сохраняет сжатие, и включает `--compress`:

| Режим | Вывод |
|------|--------|
| `signatures` | Объявления, сигнатуры и комментарии, как в примере выше |
| `calls` | Одна строка на объявление с отступом по вложенности, за которой следуют вызовы из его тела. Тела, комментарии и значения инициализаторов удаляются |

```bash
repomix --compress-mode calls
```

Режим `calls` сохраняет граф вызовов, поэтому вывод показывает передачу управления между функциями при малой доле токенов. Этот код на C#:

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

превращается в:

```text
public class OrderService : IOrderService
  private readonly IRepository _repo
  public async Task<Order> PlaceAsync(Cart cart) → Order.FromCart, _validator.Validate, new InvalidOperationException, _repo.SaveAsync, .ConfigureAwait
```

- `→` перечисляет вызовы тела в порядке вычисления, каждую цель один раз.
- Точка в начале (`.ConfigureAwait`) обозначает вызов на результате предыдущего вызова.
- Строка, начинающаяся с `→`, перечисляет вызовы из операторов верхнего уровня.

Режим `calls` поддерживает C#, Go, Java, JavaScript, Python, Rust и TypeScript. Файлы на других языках сжимаются в режиме `signatures`.

Чтобы задать его в файле конфигурации:

```json
{
  "output": {
    "compress": true,
    "compressMode": "calls"
  }
}
```

## Связанные ресурсы

- [Удаление комментариев](/ru/guide/comment-removal) - Удаление комментариев для дополнительного уменьшения токенов
- [Конфигурация](/ru/guide/configuration) - Настройка `output.compress` в файле конфигурации
- [Параметры командной строки](/ru/guide/command-line-options) - Полная справка по CLI
