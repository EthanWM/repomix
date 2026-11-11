---
title: "Code-Komprimierung"
description: "Nutzen Sie Tree-sitter-basierte Code-Komprimierung in Repomix, um Token-Verbrauch zu senken und Imports, Exports, Klassen, Funktionen, Interfaces und Struktur zu erhalten."
---

# Code-Komprimierung

Die Code-Komprimierung ist eine leistungsstarke Funktion, die wichtige Code-Strukturen intelligent extrahiert und dabei Implementierungsdetails entfernt. Dies ist besonders nützlich, um die Token-Anzahl zu reduzieren und gleichzeitig wichtige strukturelle Informationen über Ihre Codebasis beizubehalten.

> [!NOTE]
> Dies ist eine experimentelle Funktion, die wir basierend auf Benutzerfeedback und praktischer Nutzung aktiv verbessern werden.

## Grundlegende Verwendung

Aktivieren Sie die Code-Komprimierung mit der Option `--compress`:

```bash
repomix --compress
```

Sie können sie auch mit Remote-Repositories verwenden:

```bash
repomix --remote user/repo --compress
```

## Funktionsweise

Der Komprimierungsalgorithmus verarbeitet Code mithilfe von Tree-Sitter-Parsing, um wesentliche strukturelle Elemente zu extrahieren und zu bewahren, während Implementierungsdetails entfernt werden.

Die Komprimierung bewahrt:
- Funktions- und Methodensignaturen
- Schnittstellen- und Typdefinitionen
- Klassenstrukturen und Eigenschaften
- Wichtige strukturelle Elemente

Während sie entfernt:
- Funktions- und Methodenimplementierungen
- Details zu Schleifen- und Bedingungslogik
- Interne Variablendeklarationen
- Implementierungsspezifischen Code

### Beispiel

Ursprünglicher TypeScript-Code:

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

Nach der Komprimierung:

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

## Konfiguration

Sie können die Komprimierung in Ihrer Konfigurationsdatei aktivieren:

```json
{
  "output": {
    "compress": true
  }
}
```

## Anwendungsfälle

Die Code-Komprimierung ist besonders nützlich wenn:
- Code-Struktur und Architektur analysiert werden
- Token-Anzahl für LLM-Verarbeitung reduziert werden soll
- Hochrangige Dokumentation erstellt wird
- Code-Muster und Signaturen verstanden werden sollen
- API- und Schnittstellendesigns geteilt werden

## Verwandte Optionen

Sie können die Komprimierung mit anderen Optionen kombinieren:
- `--remove-comments`: Code-Kommentare entfernen (siehe [Kommentarentfernung](/de/guide/comment-removal))
- `--remove-empty-lines`: Leere Zeilen entfernen
- `--output-show-line-numbers`: Zeilennummern zur Ausgabe hinzufügen

## Komprimierungsmodi

`--compress-mode` legt fest, wie viel Detail die Komprimierung beibehält, und impliziert `--compress`:

| Modus | Ausgabe |
|------|--------|
| `signatures` | Deklarationen, Signaturen und Kommentare, wie im obigen Beispiel |
| `calls` | Eine Zeile pro Deklaration, nach Verschachtelung eingerückt, gefolgt von den Aufrufen, die ihr Rumpf ausführt. Rümpfe, Kommentare und Initialisierungswerte werden entfernt |

```bash
repomix --compress-mode calls
```

Der `calls`-Modus erhält den Aufrufgraphen, sodass die Ausgabe mit einem Bruchteil der Tokens zeigt, wie der Kontrollfluss zwischen Funktionen verläuft. Dieser C#-Code:

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

wird zu:

```text
public class OrderService : IOrderService
  private readonly IRepository _repo
  public async Task<Order> PlaceAsync(Cart cart) → Order.FromCart, _validator.Validate, new InvalidOperationException, _repo.SaveAsync, .ConfigureAwait
```

- `→` listet die Aufrufe eines Rumpfs in Auswertungsreihenfolge auf, jedes Aufrufziel nur einmal.
- Ein führender Punkt (`.ConfigureAwait`) kennzeichnet einen Aufruf auf dem Ergebnis des vorherigen Aufrufs.
- Eine Zeile, die mit `→` beginnt, listet die Aufrufe von Anweisungen auf oberster Ebene auf.

Der `calls`-Modus unterstützt C#, Go, Java, JavaScript, Python, Rust und TypeScript. Dateien in anderen Sprachen werden im `signatures`-Modus komprimiert.

So legen Sie ihn in der Konfigurationsdatei fest:

```json
{
  "output": {
    "compress": true,
    "compressMode": "calls"
  }
}
```

## Verwandte Ressourcen

- [Kommentarentfernung](/de/guide/comment-removal) - Kommentare für weitere Token-Reduzierung entfernen
- [Konfiguration](/de/guide/configuration) - `output.compress` in der Konfigurationsdatei setzen
- [Befehlszeilenoptionen](/de/guide/command-line-options) - Vollständige CLI-Referenz
