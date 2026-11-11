---
title: Nén mã
description: Dùng tính năng nén mã dựa trên Tree-sitter trong Repomix để giảm token usage trong khi vẫn giữ imports, exports, classes, functions, interfaces và cấu trúc.
---

# Nén mã

Repomix cung cấp tính năng nén mã để giảm kích thước đầu ra bằng cách chỉ bao gồm chữ ký hàm và loại bỏ phần thân hàm. Điều này đặc biệt hữu ích khi làm việc với các codebase lớn và giới hạn token của mô hình ngôn ngữ lớn (LLM).

## Tổng quan

Tính năng nén mã:

- Giữ lại chữ ký hàm, lớp và phương thức
- Loại bỏ phần thân hàm và phương thức
- Duy trì cấu trúc tổng thể của codebase
- Giảm đáng kể số lượng token

Điều này cho phép AI hiểu cấu trúc và API của codebase mà không cần xem xét từng dòng mã triển khai.

## Sử dụng tính năng nén mã

### Thông qua dòng lệnh

Để bật nén mã khi chạy Repomix:

```bash
repomix --compress-code
```

### Thông qua tệp cấu hình

Bạn cũng có thể bật nén mã trong tệp cấu hình `repomix.config.json`:

```json
{
  "advanced": {
    "compressCode": true
  }
}
```

## Ví dụ nén mã

### Mã gốc

```typescript
/**
 * Lớp User đại diện cho người dùng trong hệ thống
 */
class User {
  private name: string;
  private email: string;
  private age: number;

  /**
   * Tạo một người dùng mới
   */
  constructor(name: string, email: string, age: number) {
    this.name = name;
    this.email = email;
    this.age = age;
    console.log(`Người dùng mới được tạo: ${name}`);
  }

  /**
   * Trả về tên người dùng
   */
  getName(): string {
    return this.name;
  }

  /**
   * Trả về email người dùng
   */
  getEmail(): string {
    return this.email;
  }

  /**
   * Trả về tuổi người dùng
   */
  getAge(): number {
    return this.age;
  }

  /**
   * Kiểm tra xem người dùng có phải là người trưởng thành không
   */
  isAdult(): boolean {
    return this.age >= 18;
  }

  /**
   * Cập nhật thông tin người dùng
   */
  updateInfo(name?: string, email?: string, age?: number): void {
    if (name) this.name = name;
    if (email) this.email = email;
    if (age) this.age = age;
    console.log('Thông tin người dùng đã được cập nhật');
  }
}
```

### Mã đã nén

```typescript
/**
 * Lớp User đại diện cho người dùng trong hệ thống
 */
class User {
  private name: string;
  private email: string;
  private age: number;

  /**
   * Tạo một người dùng mới
   */
  constructor(name: string, email: string, age: number) { /* ... */ }

  /**
   * Trả về tên người dùng
   */
  getName(): string { /* ... */ }

  /**
   * Trả về email người dùng
   */
  getEmail(): string { /* ... */ }

  /**
   * Trả về tuổi người dùng
   */
  getAge(): number { /* ... */ }

  /**
   * Kiểm tra xem người dùng có phải là người trưởng thành không
   */
  isAdult(): boolean { /* ... */ }

  /**
   * Cập nhật thông tin người dùng
   */
  updateInfo(name?: string, email?: string, age?: number): void { /* ... */ }
}
```

## Lợi ích của nén mã

### Giảm số lượng token

Nén mã có thể giảm đáng kể số lượng token cần thiết để đại diện cho codebase, cho phép bạn đưa vào nhiều tệp hơn trong cùng một giới hạn token.

### Tập trung vào cấu trúc

Bằng cách chỉ hiển thị chữ ký hàm, AI có thể tập trung vào cấu trúc tổng thể và API của codebase thay vì chi tiết triển khai.

### Phân tích cấp cao

Nén mã rất hữu ích cho các nhiệm vụ phân tích cấp cao như:
- Hiểu cấu trúc dự án
- Xác định mẫu thiết kế
- Phân tích phụ thuộc
- Tạo tài liệu

## Khi nào nên sử dụng nén mã

Nén mã đặc biệt hữu ích trong các trường hợp sau:

- **Codebase lớn**: Khi codebase của bạn quá lớn để phù hợp với giới hạn token của LLM
- **Phân tích cấu trúc**: Khi bạn muốn AI tập trung vào cấu trúc tổng thể thay vì chi tiết triển khai
- **Tạo tài liệu**: Khi bạn muốn tạo tài liệu dựa trên API công khai
- **Hiểu tổng quan**: Khi bạn cần hiểu tổng quan về một codebase lớn

## Khi nào không nên sử dụng nén mã

Nén mã có thể không phù hợp trong các trường hợp sau:

- **Phân tích mã chi tiết**: Khi bạn cần AI phân tích chi tiết triển khai
- **Tìm lỗi**: Khi bạn đang tìm kiếm lỗi trong mã
- **Tối ưu hóa hiệu suất**: Khi bạn muốn AI đề xuất cải tiến hiệu suất
- **Tái cấu trúc mã**: Khi bạn cần AI hiểu đầy đủ logic hiện tại để đề xuất tái cấu trúc

## Kết hợp với các tính năng khác

Nén mã có thể được kết hợp với các tính năng khác của Repomix:

```bash
repomix --compress-code --remove-comments --style markdown
```

Lệnh này sẽ tạo một đầu ra Markdown với mã đã nén và không có bình luận, giảm đáng kể kích thước đầu ra.

## Các chế độ nén

`--compress-mode` chọn mức chi tiết mà tính năng nén giữ lại, đồng thời bật `--compress`:

| Chế độ | Đầu ra |
|------|--------|
| `signatures` | Khai báo, chữ ký và chú thích, như ví dụ ở trên |
| `calls` | Mỗi khai báo một dòng, thụt lề theo cấp lồng nhau, kèm theo các lời gọi mà thân của nó thực hiện. Thân hàm, chú thích và giá trị khởi tạo bị loại bỏ |

```bash
repomix --compress-mode calls
```

Chế độ `calls` giữ lại đồ thị lời gọi, nên đầu ra cho thấy luồng điều khiển giữa các hàm chỉ với một phần nhỏ số token. Đoạn mã C# này:

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

trở thành:

```text
public class OrderService : IOrderService
  private readonly IRepository _repo
  public async Task<Order> PlaceAsync(Cart cart) → Order.FromCart, _validator.Validate, new InvalidOperationException, _repo.SaveAsync, .ConfigureAwait
```

- `→` liệt kê các lời gọi của một thân hàm theo thứ tự đánh giá, mỗi đích chỉ một lần.
- Dấu chấm ở đầu (`.ConfigureAwait`) đánh dấu lời gọi trên kết quả của lời gọi trước đó.
- Dòng bắt đầu bằng `→` liệt kê các lời gọi từ các câu lệnh cấp cao nhất.

Chế độ `calls` hỗ trợ C#, Go, Java, JavaScript, Python, Rust và TypeScript. Các tệp thuộc ngôn ngữ khác được nén bằng chế độ `signatures`.

Để thiết lập trong tệp cấu hình:

```json
{
  "output": {
    "compress": true,
    "compressMode": "calls"
  }
}
```

## Tài nguyên liên quan

- [Xóa bình luận](/vi/guide/comment-removal) - Xóa bình luận để giảm thêm số lượng token
- [Cấu hình](/vi/guide/configuration) - Đặt `output.compress` trong tệp cấu hình của bạn
- [Tùy chọn dòng lệnh](/vi/guide/command-line-options) - Tham chiếu CLI đầy đủ
