---
title: कोड कम्प्रेशन
description: Imports, exports, classes, functions, interfaces और structure बचाते हुए token usage घटाने के लिए Repomix में Tree-sitter आधारित code compression उपयोग करें।
---

# कोड कम्प्रेशन

Repomix का कोड कम्प्रेशन फीचर आपके कोडबेस को संक्षिप्त करने में मदद करता है, जिससे AI मॉडल के लिए टोकन उपयोग कम हो जाता है और बड़े कोडबेस को संभालना आसान हो जाता है।

## कोड कम्प्रेशन क्या है?

कोड कम्प्रेशन एक प्रक्रिया है जिसमें कोड के महत्वपूर्ण हिस्सों को बनाए रखते हुए कार्यान्वयन विवरण हटा दिए जाते हैं। यह फंक्शन और क्लास सिग्नेचर, इंटरफेस परिभाषाओं और महत्वपूर्ण लॉजिक पर ध्यान केंद्रित करता है।

## कोड कम्प्रेशन का उपयोग कैसे करें

कोड कम्प्रेशन सक्षम करने के लिए, `--compress` फ्लैग का उपयोग करें:

```bash
repomix --compress
```

## कॉन्फिगरेशन फाइल में कोड कम्प्रेशन

आप अपने `repomix.config.json` में भी कोड कम्प्रेशन को कॉन्फिगर कर सकते हैं:

```json
{
  "output": {
    "compress": true
  }
}
```

## कोड कम्प्रेशन कैसे काम करता है

कोड कम्प्रेशन निम्नलिखित तरीके से काम करता है:

1. **फंक्शन सिग्नेचर बनाए रखना**: फंक्शन के नाम, पैरामीटर और रिटर्न टाइप बनाए रखे जाते हैं
2. **कार्यान्वयन विवरण हटाना**: फंक्शन बॉडी को संक्षिप्त किया जाता है
3. **क्लास संरचना बनाए रखना**: क्लास परिभाषाएं, प्रॉपर्टी और मेथड सिग्नेचर बनाए रखे जाते हैं
4. **इंटरफेस और टाइप परिभाषाएं बनाए रखना**: टाइप सिस्टम जानकारी बनाए रखी जाती है

## उदाहरण

### कम्प्रेशन से पहले

```typescript
/**
 * उपयोगकर्ता प्रमाणीकरण सेवा
 */
class AuthService {
  private userRepository: UserRepository;
  private tokenService: TokenService;
  
  constructor(userRepo: UserRepository, tokenSvc: TokenService) {
    this.userRepository = userRepo;
    this.tokenService = tokenSvc;
  }
  
  /**
   * उपयोगकर्ता को प्रमाणित करता है और एक्सेस टोकन वापस करता है
   */
  async authenticate(username: string, password: string): Promise<string> {
    const user = await this.userRepository.findByUsername(username);
    
    if (!user) {
      throw new Error('उपयोगकर्ता नहीं मिला');
    }
    
    const isValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValid) {
      throw new Error('अमान्य क्रेडेंशियल');
    }
    
    const token = this.tokenService.generateToken({
      userId: user.id,
      role: user.role,
      permissions: user.permissions
    });
    
    await this.userRepository.updateLastLogin(user.id);
    
    return token;
  }
  
  // अन्य मेथड्स...
}
```

### कम्प्रेशन के बाद

```typescript
/**
 * उपयोगकर्ता प्रमाणीकरण सेवा
 */
class AuthService {
  private userRepository: UserRepository;
  private tokenService: TokenService;
  
  constructor(userRepo: UserRepository, tokenSvc: TokenService) {
    // कार्यान्वयन संक्षिप्त किया गया
  }
  
  /**
   * उपयोगकर्ता को प्रमाणित करता है और एक्सेस टोकन वापस करता है
   */
  async authenticate(username: string, password: string): Promise<string> {
    // कार्यान्वयन संक्षिप्त किया गया
  }
  
  // अन्य मेथड्स...
}
```

## कोड कम्प्रेशन के लाभ

1. **टोकन बचत**: AI मॉडल के लिए टोकन उपयोग कम करें
2. **बड़े कोडबेस**: बड़े कोडबेस को AI मॉडल की कॉन्टेक्स्ट विंडो में फिट करें
3. **संरचनात्मक समझ**: कोड की संरचना पर ध्यान केंद्रित करें, कार्यान्वयन विवरण पर नहीं
4. **संवेदनशील जानकारी**: कार्यान्वयन विवरण में छिपी संवेदनशील जानकारी को हटाएं

## सावधानियां

कोड कम्प्रेशन का उपयोग करते समय कुछ बातों का ध्यान रखें:

1. **कार्यान्वयन विवरण**: कम्प्रेशन कार्यान्वयन विवरण हटा देता है, जो कभी-कभी महत्वपूर्ण हो सकते हैं
2. **बग खोजना**: कम्प्रेस्ड कोड में बग खोजना कठिन हो सकता है
3. **AI समझ**: कुछ मामलों में, AI को कार्यान्वयन विवरण की आवश्यकता हो सकती है

## कम्प्रेशन मोड

`--compress-mode` तय करता है कि कम्प्रेशन कितना विवरण रखे, और यह `--compress` को भी सक्षम करता है:

| मोड | आउटपुट |
|------|--------|
| `signatures` | डिक्लेरेशन, सिग्नेचर और कमेंट, ऊपर दिए गए उदाहरण की तरह |
| `calls` | प्रति डिक्लेरेशन एक पंक्ति, नेस्टिंग के अनुसार इंडेंट की हुई, जिसके बाद उसकी बॉडी द्वारा किए गए कॉल आते हैं। बॉडी, कमेंट और इनिशियलाइज़र मान हटा दिए जाते हैं |

```bash
repomix --compress-mode calls
```

`calls` मोड कॉल ग्राफ़ को बनाए रखता है, इसलिए आउटपुट बहुत कम टोकन में दिखाता है कि फ़ंक्शनों के बीच नियंत्रण कैसे प्रवाहित होता है। यह C# कोड:

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

बन जाता है:

```text
public class OrderService : IOrderService
  private readonly IRepository _repo
  public async Task<Order> PlaceAsync(Cart cart) → Order.FromCart, _validator.Validate, new InvalidOperationException, _repo.SaveAsync, .ConfigureAwait
```

- `→` किसी बॉडी के कॉल को मूल्यांकन क्रम में सूचीबद्ध करता है, हर लक्ष्य केवल एक बार।
- आगे लगा बिंदु (`.ConfigureAwait`) पिछले कॉल के परिणाम पर किए गए कॉल को दर्शाता है।
- `→` से शुरू होने वाली पंक्ति टॉप-लेवल स्टेटमेंट द्वारा किए गए कॉल सूचीबद्ध करती है।

`calls` मोड C#, Go, Java, JavaScript, Python, Rust और TypeScript का समर्थन करता है। अन्य भाषाओं की फ़ाइलें `signatures` मोड से कम्प्रेस की जाती हैं।

इसे अपनी कॉन्फ़िगरेशन फ़ाइल में सेट करने के लिए:

```json
{
  "output": {
    "compress": true,
    "compressMode": "calls"
  }
}
```

## संबंधित संसाधन

- [टिप्पणी हटाना](/hi/guide/comment-removal) - टोकन संख्या और कम करने के लिए टिप्पणियां हटाएं
- [कॉन्फिगरेशन](/hi/guide/configuration) - अपनी कॉन्फिग फाइल में `output.compress` सेट करें
- [कमांड लाइन विकल्प](/hi/guide/command-line-options) - पूर्ण CLI संदर्भ
