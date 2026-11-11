---
title: "Compressione Codice"
description: "Usa la compressione del codice basata su Tree-sitter in Repomix per ridurre i token preservando import, export, classi, funzioni, interfacce e struttura."
---

# Compressione Codice

La compressione del codice è una funzionalità potente che estrae intelligentemente le strutture di codice essenziali mentre rimuove i dettagli di implementazione. È particolarmente utile per ridurre il conteggio dei token mantenendo le informazioni strutturali importanti della tua codebase.

> [!NOTE]
> Questa è una funzionalità sperimentale che miglioreremo attivamente in base ai feedback degli utenti e all'uso reale

## Utilizzo Base

Abilita la compressione del codice usando l'opzione `--compress`:

```bash
repomix --compress
```

Puoi anche usarla con repository remoti:

```bash
repomix --remote user/repo --compress
```

## Come Funziona

L'algoritmo di compressione elabora il codice usando l'analisi tree-sitter per estrarre e preservare gli elementi strutturali essenziali mentre rimuove i dettagli di implementazione.

La compressione preserva:
- Firme di funzioni e metodi
- Definizioni di interfacce e tipi
- Strutture di classi e le loro proprietà
- Elementi strutturali importanti

Mentre rimuove:
- Implementazioni di funzioni e metodi
- Dettagli di logica di cicli e condizioni
- Dichiarazioni di variabili interne
- Codice specifico dell'implementazione

### Esempio

Codice TypeScript originale:

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

Dopo la compressione:

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

## Configurazione

Puoi abilitare la compressione nel tuo file di configurazione:

```json
{
  "output": {
    "compress": true
  }
}
```

## Casi d'Uso

La compressione del codice è particolarmente utile per:
- Analizzare la struttura e l'architettura del codice
- Ridurre il conteggio dei token per l'elaborazione da parte degli LLM
- Creare documentazione di alto livello
- Comprendere pattern di codice e firme
- Condividere design di API e interfacce

## Opzioni Correlate

Puoi combinare la compressione con altre opzioni:
- `--remove-comments`: Rimuove i commenti dal codice (vedi [Rimozione Commenti](/it/guide/comment-removal))
- `--remove-empty-lines`: Rimuove le righe vuote
- `--output-show-line-numbers`: Aggiunge numeri di riga all'output

## Modalità di compressione

`--compress-mode` sceglie quanto dettaglio mantiene la compressione e implica `--compress`:

| Modalità | Output |
|------|--------|
| `signatures` | Dichiarazioni, firme e commenti, come nell'esempio sopra |
| `calls` | Una riga per dichiarazione, indentata secondo l'annidamento, seguita dalle chiamate effettuate dal suo corpo. Corpi, commenti e valori di inizializzazione vengono rimossi |

```bash
repomix --compress-mode calls
```

La modalità `calls` mantiene il grafo delle chiamate, così l'output mostra come il controllo passa tra le funzioni con una frazione dei token. Questo codice C#:

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

diventa:

```text
public class OrderService : IOrderService
  private readonly IRepository _repo
  public async Task<Order> PlaceAsync(Cart cart) → Order.FromCart, _validator.Validate, new InvalidOperationException, _repo.SaveAsync, .ConfigureAwait
```

- `→` elenca le chiamate di un corpo in ordine di valutazione, ogni destinazione una sola volta.
- Un punto iniziale (`.ConfigureAwait`) indica una chiamata sul risultato della chiamata precedente.
- Una riga che inizia con `→` elenca le chiamate effettuate dalle istruzioni di primo livello.

La modalità `calls` supporta C#, Go, Java, JavaScript, Python, Rust e TypeScript. I file in altri linguaggi vengono compressi con la modalità `signatures`.

Per impostarla nel file di configurazione:

```json
{
  "output": {
    "compress": true,
    "compressMode": "calls"
  }
}
```

## Risorse correlate

- [Rimozione Commenti](/it/guide/comment-removal) - Rimuovere i commenti per ridurre ulteriormente i token
- [Configurazione](/it/guide/configuration) - Impostare `output.compress` nel file di configurazione
- [Opzioni da Linea di Comando](/it/guide/command-line-options) - Riferimento completo della CLI
