# Code Standards & Conventions

Quy ước bắt buộc cho codebase Yona.

> **Đọc §0 trước mọi thứ khác.** Đó là quy ước kiến trúc xuyên suốt, chốt 25/07/2026. Mọi rule bên dưới phục vụ nó; rule nào mâu thuẫn thì §0 thắng.

---

# §0 — Quy ước kiến trúc xuyên suốt

## 0.1 Chia theo CHỨC NĂNG, không chia theo "đồ bên ngoài"

Module là một **chức năng** của sản phẩm: nhắn tin, thanh toán, email, nhập dữ liệu. Mỗi chức năng có phần lõi tự sống được, **không biết** nhà cung cấp bên ngoài nào tồn tại. Nhà cung cấp **cắm vào** lõi qua hợp đồng.

**CẤM tạo module gom theo tiêu chí "cái này gọi ra ngoài".** Zalo không phải "một loại tích hợp" — Zalo là *một adapter của chức năng nhắn tin*. VNPay là *một adapter của chức năng thanh toán*. Hai thứ đó không liên quan gì nhau, không được ở chung một module.

```
❌ Modules/Integration/Chat/ZaloPersonal     "chat là một loại tích hợp"  — lộn ngược
✅ Modules/Chat/Adapter/ZaloPersonal         "Zalo là một phích cắm vào chat" — đúng chiều
```

## 0.2 Hình dạng lặp lại: lõi ở giữa, hai cổng vào/ra

Gần như mọi chức năng đều có **vào** và **ra**. Lõi không cần biết vào từ đâu, ra đi đâu.

| Chức năng | Vào | Ra |
|---|---|---|
| Nhắn tin | tin từ Zalo/Messenger/TikTok | gửi tin ra kênh |
| Thanh toán | IPN/callback báo đã trả | tạo yêu cầu thanh toán |
| Email | thư trả lời, bounce | gửi mail |
| Dữ liệu khách | file Excel, KiotViet/Sapo | đẩy ngược ra ngoài |

Adapter đứng ở hai cổng, làm đúng một việc: **dịch giữa ngôn ngữ bên ngoài và ngôn ngữ của lõi**.

## 0.3 Ba tầng, ba trách nhiệm

```
app/
├── Http/                    BIÊN VÀO — nhận request, validate, điều hướng, trả response
│   └── Controllers/<ChucNang>/      nhóm theo chức năng, nhưng ở tầng dùng chung
├── Models/                  DỮ LIỆU — một thư mục phẳng duy nhất
└── Modules/<ChucNang>/      NGHIỆP VỤ — chỉ logic, không gì khác
```

**Thư mục bên trong module đặt tên theo CÔNG ĐOẠN NGHIỆP VỤ**, không theo hướng kỹ thuật. `Inbound/`/`Outbound/` chỉ nói "đi vào"/"đi ra" — đọc xong vẫn không biết nó làm gì. Tên đúng phải kể được luồng:

| Tầng | Nghĩa | Có ở mọi chức năng? |
|---|---|---|
| `Port/` | **CỔNG CẮM** — hợp đồng + sổ đăng ký: điều kiện để một nhà cung cấp cắm vào | ✔ |
| `Adapter/<NhaCungCap>/` | **PHÍCH CẮM** — bắt tay nhà cung cấp, dịch hai chiều, policy riêng của họ | ✔ |
| `Intake/` | **TIẾP NHẬN** — nhận sự kiện đã chuẩn hóa, khử trùng, kéo dữ liệu về | ✔ |
| `Store/` | **LƯU TRỮ** | ✔ |
| `Delivery/` | **ĐƯA ĐI** — mọi hành động chủ động đẩy ra nhà cung cấp | ✔ |
| `<tầng riêng>` | tùy nghiệp vụ từng chức năng | — |

`Port/` và `Adapter/` là một cặp: cổng là cái lỗ, phích là cái cắm vào. Cấm tách hợp đồng và sổ đăng ký thành hai tầng — chúng cùng trả lời một câu hỏi: "cắm vào bằng cách nào".

Ví dụ áp cho chức năng nhắn tin:

```
app/Modules/Chat/
├── Port/                 hợp đồng ChannelDriver + capability + ChannelRegistry
├── Adapter/ZaloPersonal/ Intake · Delivery · Policy · Health  (cùng bộ từ, xem §0.7)
├── Intake/               tin đến, khử trùng, kéo lịch sử về
├── Store/                hội thoại · người trong hội thoại · tin · alias nguồn
├── Delivery/             gửi tin · thả cảm xúc · báo đã xem · thu hồi
├── Status/               trạng thái tin: đã nhận · đã xem · cảm xúc · đã thu hồi
├── Timeline/             dòng hội thoại: gồm gì, thứ tự, con trỏ
└── Broadcast/            phát thay đổi tới UI realtime
```

Cùng khung đó cho thanh toán: `Port/` · `Adapter/{VNPay,MoMo}/` · `Intake/` (IPN) · `Store/` (giao dịch) · `Delivery/` (tạo yêu cầu thanh toán) · `Ledger/` (tầng riêng).

**Hai việc dễ xếp nhầm — kiểm bằng "kết quả đi về đâu", không phải "ai gọi trước":**
- *Kéo lịch sử về* (resync): mình chủ động gọi ra, nhưng dữ liệu **đi vào** → `Intake/`.
- *Báo đã xem*: nghe như trạng thái, nhưng mình **đẩy ra** nhà cung cấp → `Delivery/`. Trạng thái "khách đã xem tin của mình" mới thuộc `Status/`.

**DTO nằm trong tầng sở hữu nó**, không gom vào một thư mục `Data/` chung — `Intake/InboundEvent`, `Delivery/OutboundEvent`, `Timeline/TimelineItem`. Nhìn tên là biết ai đẻ ra nó.

**Vì sao Http KHÔNG nằm trong module:** HTTP chỉ là *một cách* gọi vào chức năng. Cùng nghiệp vụ đó còn được gọi từ queue job, từ command, từ API ngoài. Đặt controller trong module là trói chức năng vào một cách gọi.

**Vì sao Model KHÔNG nằm trong module:** một model được nhiều chức năng dùng chung. `Conversation` là của Chat khi nhắn tin, nhưng CRM cũng đọc nó để chuyển thành Lead. Nhét vào một module là gán sở hữu sai và đẻ ra phụ thuộc chéo giữa các module.

**Tên tầng dùng chung cho mọi chức năng** (`Port/`, `Adapter/`, `Intake/`, `Store/`, `Delivery/`) — học một lần, đọc module nào cũng quen. Tầng riêng của từng nghiệp vụ thì đặt theo ngôn ngữ nghiệp vụ đó.

## 0.4 Ba mặt tiền, một lõi

| File route | Dành cho | Xác thực | Độ ổn định |
|---|---|---|---|
| `routes/web.php` | điều hướng + render UI | session | đổi thoải mái |
| `routes/web_api.php` | API do chính FE của web gọi | session | đổi thoải mái (FE đi cùng phiên bản) |
| `routes/api.php` | API cho **bên ngoài** dùng | token | **hợp đồng công khai** — đổi là phá người dùng |

**Mọi tính năng phải mở ra API được mà không viết lại lần thứ hai.** Đó là phép thử của kiến trúc này: nếu muốn mở một tính năng ra `api.php` mà phải chép logic từ controller web sang, thì logic đó đang nằm sai chỗ.

Hệ quả bắt buộc:
- **Nghiệp vụ không được sống trong controller.** Controller = validate + gọi module + định dạng đầu ra.
- **Module không được biết HTTP.** Không nhận `Request`, không trả `JsonResponse`, không gọi `auth()`/`route()`/`session()`. Nhận DTO, trả DTO hoặc model.
- **Định dạng đầu ra thuộc Http.** Cùng một kết quả nghiệp vụ: web render Inertia, web_api trả JSON cho FE, api trả JSON có phiên bản ổn định.
- Webhook từ nhà cung cấp bên ngoài (bridge, cổng thanh toán) nằm ở `api.php` — chúng là hệ thống ngoài gọi vào.

## 0.5 UI cũng gom theo chức năng

```
resources/js/
├── components/
│   ├── ui/              design system dùng chung (button, dialog, input…)
│   ├── shared/          component dùng chéo nhiều chức năng
│   └── <chuc-nang>/     component CỦA chức năng đó (inbox/, clients/, tasks/…)
└── pages/<chuc-nang>/   trang của chức năng đó
```

Component chỉ phục vụ một chức năng thì nằm trong thư mục chức năng đó. Chỉ khi thật sự được ≥2 chức năng dùng mới đưa lên `shared/`. Không để component nghiệp vụ nằm trơ ở gốc `components/`.

## 0.6 Sự kiện vào/ra phải có abstraction chung

Một chức năng không chỉ có "một loại vào" và "một loại ra". Chat nhận tin mới, cảm xúc, đã xem, đã nhận, thu hồi, đang gõ, người gửi vào/rời nhóm, sự kiện lạ. Nếu mỗi loại tự có hình dạng riêng thì lõi phải biết hết, và thêm loại mới là sửa lõi.

**Chuẩn hóa bằng hai gốc trừu tượng:**

**Mỗi gốc trừu tượng đi kèm MỘT enum định danh, đối xứng hai chiều.** Lớp con mang **payload**; enum mang **danh tính**:

| | Lớp con | Enum |
|---|---|---|
| Chứa gì | trường có kiểu, mỗi loại một khác | đúng một chuỗi ổn định |
| Dùng để | xử lý trong code, PHPStan kiểm | lưu DB, đưa lên JSON, khai báo năng lực, duyệt hết bằng `cases()` |
| Đổi tên class | tự do | **là breaking change** — nó nằm trong dữ liệu và trên dây |

Tên class **không phải** định dạng lưu trữ. Đổi `MessageArrived` thành tên khác mà không có enum thì mọi hàng đã lưu và mọi client đã tích hợp đều hỏng.

```php
// Intake/InboundEventType.php
enum InboundEventType: string
{
    case MessageArrived   = 'message_arrived';
    case ReactionPlaced   = 'reaction_placed';
    case MessageSeen      = 'message_seen';
    case MessageDelivered = 'message_delivered';
    case MessageRecalled  = 'message_recalled';
    case ActionSubmitted  = 'action_submitted';
    case SenderJoined     = 'sender_joined';
    case SenderLeft       = 'sender_left';
    case Unrecognized     = 'unrecognized';
}

// Intake/InboundEvent.php — gốc cho MỌI thứ đi vào
abstract class InboundEvent
{
    abstract public function type(): InboundEventType;

    public function __construct(
        public readonly string $channel,
        public readonly ?string $accountId,
        public readonly string $senderUid,
        public readonly ?CarbonInterface $occurredAt,
        public readonly array $channelRef = [],     // tham chiếu thô của kênh, LÕI KHÔNG ĐỌC VÀO TRONG
    ) {}
}

// Intake/Event/*.php — mỗi loại một lớp con, mang thêm đúng cái nó cần
final class MessageArrived extends InboundEvent { /* type, body, media, quote… */ }
final class ReactionPlaced extends InboundEvent { /* targetSourceId, icon */ }
final class MessageSeen extends InboundEvent { /* targetSourceId */ }
final class MessageRecalled extends InboundEvent { /* targetSourceId */ }
final class ActionSubmitted extends InboundEvent { /* actionId, values */ }
final class SenderJoined extends InboundEvent { /* vào nhóm */ }
final class SenderLeft extends InboundEvent { /* rời nhóm */ }
final class UnrecognizedEvent extends InboundEvent { /* cách ly, không đoán bừa */ }
```

**Nội dung tin CŨNG là sự kiện đi ra**, không phải khái niệm thứ ba. Chữ, ảnh, thẻ, nút, ô nhập đều là `OutboundEvent` — một tin là **danh sách sự kiện ra**, không phải một chuỗi. Cấm đẻ thêm từ "block"/"khối": đã có `OutboundEvent` thì mọi thứ đi ra gọi đúng từ đó (§0.7 luật 1).

```php
// Delivery/Event/OutboundEventType.php — ĐỐI XỨNG, không có ngoại lệ
enum OutboundEventType: string
{
    case Text    = 'text';
    case Media   = 'media';
    case Sticker = 'sticker';
    case Card    = 'card';
    case Actions = 'actions';   // nút bấm / chip gợi ý
    case Input   = 'input';     // hỏi tên/SĐT ngay trong luồng chat
    case Opaque  = 'opaque';    // loại lạ — giữ nguyên, KHÔNG vứt
}

// Delivery/Event/OutboundEvent.php — gốc cho MỌI thứ đi ra
abstract class OutboundEvent
{
    abstract public function type(): OutboundEventType;
    abstract public function plainText(): string;   // bản hạ cấp cho kênh chỉ hiểu chữ
}

final class TextEvent    extends OutboundEvent { /* text */ }
final class CardEvent    extends OutboundEvent { /* title, subtitle, imageUrl, actions[] */ }
final class ActionsEvent extends OutboundEvent { /* actions[] */ }
final class InputEvent   extends OutboundEvent { /* fields[], submitLabel */ }
final class OpaqueEvent  extends OutboundEvent { /* raw — tương thích ngược */ }
```

`ActionSubmitted` (chiều vào) là bạn song sinh của `ActionsEvent`/`InputEvent` (chiều ra): khách bấm nút thì quay về đúng `actionId` mình đã đặt, **không** giả lập thành tin chữ. Đây cũng là điểm nối cho harness tự động trả lời.

> **Thả cảm xúc, báo đã xem, thu hồi KHÔNG nằm trong cây này.** Chúng là **thao tác lên một tin đã có**, không phải nội dung của một tin mới — chúng đi qua capability interface (`SupportsReactions`, `SupportsSeenReceipts`). Nhét chung sẽ phá luật ánh xạ 1-1 vì không phải kênh nào cũng có.

Hễ có một gốc trừu tượng cần lưu hoặc truyền ra ngoài, nó phải có enum định danh đi kèm.

Hai điều bắt buộc, có test enforce:

1. **Enum và lớp con ánh xạ 1-1.** Thêm lớp con mà quên thêm case (hoặc ngược lại) ⇒ đỏ. Không có case "mồ côi", không có lớp con vô danh.
2. **Khai báo năng lực dùng enum, không dùng `class-string`.** `supportedOutboundEvents(): list<OutboundEventType>` — đọc được, so sánh được, đưa xuống FE được. `list<class-string<OutboundEvent>>` thì FE không dùng nổi.

**Hạ cấp nằm ở ADAPTER, không ở lõi.** Lõi đưa nguyên danh sách sự kiện xuống driver; kênh không render được loại nào thì adapter tự quy về chữ. Nếu lõi phải lọc theo kênh, tức là lõi biết kênh nào làm được gì — vi phạm thẳng luật bất biến #1.

**Adapter là lớp dịch duy nhất:** payload nhà cung cấp → `InboundEvent` con phù hợp; `OutboundEvent` → payload nhà cung cấp. Lõi chỉ làm việc với hai gốc trừu tượng và các lớp con của chúng.

Hệ quả: thêm một loại sự kiện = thêm một lớp con + adapter nào hỗ trợ thì dịch nó. Nhà cung cấp không có loại đó thì đơn giản là không bao giờ phát ra — **không cần sửa lõi, không cần cờ bật/tắt**.

`UnrecognizedEvent` là bắt buộc: nhà cung cấp không chính thức có thể phát ra thứ ta chưa biết. Cách ly nó, đừng đoán bừa và cũng đừng nuốt im lặng.

## 0.7 Đặt tên nhất quán — một khái niệm, một từ

Lỗi hay gặp nhất không phải chia sai tầng, mà là **cùng một thứ gọi mỗi chỗ một tên**. Đọc code thành ra phải dịch trong đầu.

**Luật 1 — Một khái niệm chỉ có một từ, xuyên suốt code, docs và lời nói:**

| Khái niệm | Dùng | Tiếng Việt | CẤM dùng lẫn |
|---|---|---|---|
| Nơi tin nhắn đi qua | `channel` | kênh | platform, nền tảng |
| Công ty/dịch vụ bên ngoài đứng sau kênh | `provider` | nhà cung cấp | vendor, bên thứ ba, đối tác |
| Bên thứ ba cắm vào | `adapter` | phích cắm | integration, plugin, connector, driver\* |
| Người ở đầu bên kia | `sender` | người gửi | peer, customer, contact\*\* |
| Sự kiện đi vào | `InboundEvent` | sự kiện vào | envelope, payload, inbound message |
| Sự kiện đi ra | `OutboundEvent` | sự kiện ra | command, action, request |
| Dòng hội thoại | `timeline` | dòng hội thoại | stream, feed |

\* `Driver` chỉ dùng làm **hậu tố class** của phích cắm (`ZaloChannelDriver`), không dùng làm tên tầng.
\*\* `contact` là khái niệm của CDP, không phải của chat. Chat chỉ biết `sender`.

> **Ngoại lệ đã chốt (founder 25/07/2026): cột `messages.platform_meta` giữ nguyên tên.** Đúng ra phải là `channel_ref` theo luật 1, nhưng đổi tên một cột không đổi hành vi gì trong khi bán kính sửa rất rộng. Ngoại lệ này **chỉ áp cho tên cột đó**; mọi tên biến, class, key mới vẫn phải dùng `channel`. Ghi ở đây để không ai "sửa cho đúng chuẩn" rồi kéo theo một đợt rename ngoài kế hoạch.

**Luật 2 — Tầng bên trong adapter dùng LẠI đúng bộ từ của tầng ngoài**, không đẻ từ mới:

```
Adapter/<NhaCungCap>/
├── <X>ChannelDriver.php    phích cắm chính
├── Intake/                 payload nhà cung cấp → InboundEvent   (dịch vào)
├── Delivery/               OutboundEvent → payload nhà cung cấp  (dịch ra)
├── Policy/                 luật riêng của nhà cung cấp (giờ gửi, cap ToS)
├── Health/                 circuit breaker, phát hiện phiên hỏng
└── Exception/
```

Adapter là bản thu nhỏ của cùng hình dạng — nên dùng cùng tên tầng. **Cấm** `Transport/`, `Parsing/`, `Client/` — đó là từ mới cho việc đã có tên.

**Luật 3 — Hậu tố class chọn trong bộ đóng**, mỗi vai trò đúng một hậu tố:

| Vai trò | Hậu tố | Ví dụ |
|---|---|---|
| Nghiệp vụ một việc | `Service` | `SeenSyncService` |
| Chuỗi bước có thứ tự bất biến | `Pipeline` | `DeliveryPipeline` |
| Phích cắm | `Driver` | `ZaloChannelDriver` |
| Sổ đăng ký | `Registry` | `ChannelRegistry` |
| Luật của nhà cung cấp | `Policy` | `SendWindowPolicy` |
| DTO sự kiện | *(không hậu tố)* | `MessageArrived`, `SendMessage` |

Cấm `Manager`, `Helper`, `Util`, `Handler` — chúng không nói vai trò gì.

**Luật 4 — Không lặp tên tầng vào tên class.** Namespace đã nói rồi: `Chat\Intake\IngestService` là thừa và lệch (`Ingest` ≠ `Intake`). Class trong tầng nào thì tên nói **việc cụ thể** của nó trong tầng đó.

## 0.8 Bốn luật kiểm được bằng test

1. **DTO qua cổng là ngôn ngữ của lõi, không phải của nhà cung cấp.** Adapter dịch, lõi không dịch. `OutboundMessage` là "một tin cần gửi", không phải "một payload Zalo".
2. **Phụ thuộc một chiều: adapter biết lõi, lõi không biết adapter.** Thêm nhà cung cấp = thêm một thư mục adapter, **không sửa một dòng nào** trong các tầng lõi (`Intake/` `Store/` `Delivery/` …).
3. **Lõi không rẽ nhánh theo tên nhà cung cấp.** Không `if ($channel === 'zalo')`, không `match($provider)`. Khác biệt sống trong adapter, hoặc là dữ liệu (capability flags), không phải mã rẽ nhánh.
4. **Lõi không đọc vào ruột dữ liệu của nhà cung cấp.** Lưu/chuyển tiếp nguyên khối thì được; đọc key bên trong là vi phạm.

---

## Model Organization

### 1. All Models → `app/Models/` (Flat Namespace)

**Rule:** Every Eloquent model lives in `app/Models\`, regardless of domain. No per-domain subfolders.

```php
// ✅ Correct
namespace App\Models;
class Lead extends Model { ... }

// ❌ Wrong
namespace App\Modules\CrmSales\Models;
class Lead extends Model { ... }
```

**Reason:** Simplifies auto-discovery, matches Laravel convention, avoids namespace collision risks with cross-domain relationships.

---

## Adapter bên ngoài (Driver Pattern)

### 2. Hợp đồng adapter nằm trong `Port/` CỦA CHỨC NĂNG

**Rule:** Hợp đồng để bên thứ ba cắm vào nằm ở `Port/` của **chức năng** đó, không thuộc một module "tích hợp" chung (§0.1).

```php
// ✅ Đúng — hợp đồng thuộc chức năng nhắn tin
// app/Modules/Chat/Port/ChannelDriver.php
interface ChannelDriver { ... }
// app/Modules/Chat/Adapter/ZaloPersonal/ZaloChannelDriver.php
class ZaloChannelDriver implements ChannelDriver { ... }

// ✅ Đúng — hợp đồng thuộc chức năng thanh toán
// app/Modules/Payment/Port/PaymentDriver.php

// ❌ Sai — gom hai chức năng khác nhau vào một module chỉ vì "đều gọi ra ngoài"
// app/Modules/Integration/Contracts/{ChannelDriver,PaymentDriver}.php
```

### 3. Đăng ký adapter qua `Manager::extend()`, không kế thừa, không service location

**Rule:** Adapter tự đăng ký vào registry của chức năng, trong ServiceProvider **của chính adapter đó**.

```php
// ✅ Đúng (ZaloPersonalServiceProvider — thuộc adapter)
$registry->extend('zalo_personal', fn () => app(ZaloChannelDriver::class));

// Lõi gọi qua registry — không bao giờ nhắc tên class adapter
$registry->driver($conversation->channel)->sendMessage($conversation, $message);

// ❌ Sai
class IngestService extends ZaloChannelDriver { ... }   // không kế thừa
app()->make('zalo_personal_driver');                    // không service location
```

**Reason:** Adapter cắm vào được thì cũng rút ra được; lõi không dính vào cài đặt cụ thể.

---

## Services & Business Logic

### 4. `MeteringService` is CONCRETE (Not Interface + No-op Binding)

**Rule:** `MeteringService` is a concrete class in `app/Services/`, fully implemented. Send-path calls it directly via `app(MeteringService::class)`. NEVER use an interface-with-no-op pattern.

```php
// ✅ Correct (app/Services/MeteringService.php)
class MeteringService {
    public function meterReply(Conversation $conversation): void {
        // Race-safe compare-set + upsert in single transaction
        // Tracks usage for analytics; no quota gate applied
    }
}

// Usage in ZaloSendService (after bridge success)
$this->metering->meterReply($conversation);  // Direct, no abstraction

// ❌ Wrong
interface MeteringGate {
    public function meterReply(Conversation $conversation): void;
}
// (causes "no-op binding" ambiguity in older phases)
```

**Reason:** Metering correctness is critical for billing data integrity. Concrete class ensures explicit, testable implementation. As of 2026-07-25, metering tracks usage only; no quota enforcement logic remains in this service.

---

## Lead Restoration & Soft Delete

### 5. Restore Routes MUST Use `->withTrashed()`

**Rule:** Any route that restores a soft-deleted model MUST query with `->withTrashed()` to find the model in the first place.

```php
// ✅ Correct (LeadRestoreController)
public function restore(Lead $lead) {
    // Implicit: $lead is resolved via model binding,
    // but form must use withTrashed() in the query:
    $lead = Lead::withTrashed()->findOrFail($id);
    $lead->restore();
    return redirect('/leads/' . $lead->id);
}

// Or explicit (more readable):
$lead = Lead::withTrashed()->find($id);
if (! $lead || ! $lead->trashed()) {
    abort(404);
}
$lead->restore();

// ❌ Wrong
$lead = Lead::find($id);  // Ignores trashed; returns null
$lead->restore();  // Null error
```

**Reason:** Soft-deleted records are hidden by default. Finding them requires explicit `withTrashed()`.

---

## Cross-Namespace Compatibility Shims

### 6. Cross-Module Shims Use `class_alias()`, Never `extends`

**Rule:** If a model is refactored into a different namespace but old code still references the old FQCN, use `class_alias()` for backward compatibility. NEVER subclass the model with the old name.

```php
// app/Models/Lead.php — new canonical location
namespace App\Models;
class Lead extends Model {
    // Morph alias for polymorphic relationships
    protected $morphClass = 'lead';
}

// (In bootstrap/app.php or a compatibility shim file)
// ✅ Correct
if (! class_exists('App\Modules\CrmSales\Models\Lead', false)) {
    class_alias('App\Models\Lead', 'App\Modules\CrmSales\Models\Lead');
}

// ❌ Wrong (DO NOT DO THIS)
namespace App\Modules\CrmSales\Models;
class Lead extends \App\Models\Lead { }  // Subclassing → ClassMorphViolationException
```

**Reason:** Eloquent's morph alias registry maps class names to strings for polymorphic relations. If a model has two class definitions (parent + child), the morph registry breaks.

---

## Attachment Authorization

### 7. Attachment Create Authz Must Check `can('update', $parent)`

**Rule:** When attaching a file to a parent resource (Lead, Contact, Project, etc.), the user must have update permission on the parent, not just create permission on Attachment.

```php
// ✅ Correct (AttachmentController)
public function store(Request $request) {
    $parent = Lead::find($request->parent_id);
    $this->authorize('update', $parent);  // Check parent, not Attachment
    
    $attachment = Attachment::create([
        'attachable_id' => $parent->id,
        'attachable_type' => Lead::class,
        'path' => $file->store(...),
    ]);
    return $attachment;
}

// ❌ Wrong
$this->authorize('create', Attachment::class);  // Too permissive; ignores parent
```

**Reason:** Attachment is a detail of the parent; no separate authorization for "attach to resource". If you can edit the parent, you can attach files.

---

## Async & Queue Jobs (RLS Context)

### 8. Queue Jobs Must Establish `app.current_workspace` Before Querying Tenant Tables

**Rule:** When a queued job queries workspace-scoped models, it MUST call `TenantScope::set()` or bind `app('workspace')` before executing queries. Otherwise, RLS will default-deny all rows.

```php
// ✅ Correct (AnalyzeConversationJob)
class AnalyzeConversationJob implements ShouldQueue {
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;
    
    public function __construct(public Conversation $conversation) {}
    
    public function handle() {
        // Establish workspace context for RLS
        TenantScope::set($this->conversation->workspace_id);
        
        // Now query workspace tables safely
        $contacts = Contact::where('workspace_id', ...)->get();
        // ... analysis logic
    }
}

// ❌ Wrong
class AnalyzeConversationJob implements ShouldQueue {
    public function handle() {
        $contacts = Contact::all();  // RLS denies everything; query returns empty
    }
}
```

**Reason:** Queue jobs run in a separate process/transaction with no HTTP middleware context. RLS policy uses `current_user_id` (a Postgres role setting). Jobs must explicitly set workspace scope.

---

## Idempotent Webhook Processing

### 9. Webhook Upsert Paths Must Catch `QueryException 23505` (Unique Violation)

**Rule:** When receiving webhooks that create or update data with a unique constraint, use a `try/catch` block to handle race conditions (concurrent webhooks for same resource). Re-fetch on conflict (optimistic locking pattern).

```php
// ✅ Correct (InboundMessageService::upsertConversation)
public function upsertConversation($connectionId, $peerUid, ...) {
    try {
        DB::beginTransaction();
        
        // Attempt insert
        $conversation = Conversation::create([
            'zalo_connection_id' => $connectionId,
            'peer_uid' => $peerUid,
            'workspace_id' => $workspace->id,
        ]);
        
        DB::commit();
        return $conversation;
    } catch (QueryException $e) {
        if ($e->getCode() === '23505') {  // Unique violation
            DB::rollBack();
            // Conflict; fetch existing record
            return Conversation::where('zalo_connection_id', $connectionId)
                ->where('peer_uid', $peerUid)
                ->firstOrFail();
        }
        throw;
    }
}

// ❌ Wrong
Conversation::create([...]);  // Crashes on race condition; webhook rejected
```

**Reason:** Multiple webhook deliveries for the same event can arrive simultaneously. Unique constraints protect data integrity; handling the violation gracefully ensures idempotency.

### 10. Savepoint for Nested Transactions (Webhook Inside Outer TX)

**Rule:** If webhook upsert logic (try/catch QueryException 23505) is called inside an outer transaction, wrap the upsert in a `savepoint()` to prevent the outer TX from aborting.

```php
// ✅ Correct (if upsert is called within another TX)
public function ingest($payload) {
    DB::beginTransaction();
    
    try {
        // ... outer logic
        
        // Nested upsert in savepoint
        DB::transaction(
            fn() => $this->upsertConversation($payload),
            attempts: 1,
        );
        
        DB::commit();
    } catch (Throwable $e) {
        DB::rollBack();
        throw;
    }
}
```

**Reason:** PostgreSQL savepoints allow inner failures without aborting the outer TX. Idempotent webhook handlers need this to retry safely.

---

## Conversation Routing (Multi-Channel Design)

### 11. Conversation Unique Constraint = Per-Channel (NOT Cross-Channel Merge)

**Rule:** The unique constraint on Conversation is `unique(channel, workspace_id, peer_uid)` (not just per peer). Same peer across Zalo + Messenger = 2 separate conversations until CDP dedup is implemented (Phase-08+).

```php
// Correct schema (database/migrations/..._create_conversations_table.php)
Schema::create('conversations', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->uuid('workspace_id')->index();
    $table->string('channel');  // 'zalo_personal', 'messenger', etc.
    $table->string('peer_uid');
    $table->string('peer_phone')->nullable();
    $table->string('peer_name')->nullable();
    // ... other fields
    
    // Composite unique (but per-channel for now; multi-channel redesign in Phase-08)
    $table->unique(['workspace_id', 'channel', 'peer_uid']);
    // NOT: $table->unique(['workspace_id', 'peer_uid']);  // Would wrongly merge channels
});

// Why: Same person (e.g., alice@company.com) has:
// - Zalo account: zalo_uid_123
// - Messenger UID: messenger_uid_456
// These are DIFFERENT peer_uids, so 2 conversations, even same workspace.
// Cross-channel dedup happens in CDP (Phase-08).
```

**Reason:** Phone-based dedup (CDP Layer 1) is planned for Phase-08. Until then, treat each channel independently to avoid forced merges that lose conversation history.

---

## Transaction Handling

### 12. Use `saveQuietly()` to Bypass Auto-Logging

**Rule:** When you want to update a model WITHOUT triggering auto-audit logging (e.g., internal state changes), use `saveQuietly()` instead of `save()`.

```php
// ✅ Correct
$conversation->last_metered_period = '2026-06';
$conversation->saveQuietly();  // Bypasses chatConversation::booted() auto-logging

// ❌ Wrong (will create unwanted audit entry)
$conversation->last_metered_period = '2026-06';
$conversation->save();  // Triggers AuditLog creation
```

**Reason:** Not every model update is significant. System fields (cache, meter timestamp) shouldn't pollute audit logs.

---

## Controller Authorization

### 13. Form Requests Enforce Authorization (Spatie `authorize()`)

**Rule:** Use `FormRequest::authorize()` (from spatie) to check permission before the controller method runs. Do NOT rely on inline `$this->authorize()` checks.

```php
// ✅ Correct (app/Http/Requests/UpdateLeadRequest.php)
class UpdateLeadRequest extends FormRequest {
    public function authorize(): bool {
        return $this->user()->can('update', $this->lead);
    }
    
    public function rules(): array {
        return ['title' => 'required|string'];
    }
}

// In controller
public function update(UpdateLeadRequest $request, Lead $lead) {
    // Request already authorized; no need to check again
    $lead->update($request->validated());
}

// ❌ Wrong (authorization forgotten)
class CreateTaskRequest extends FormRequest {
    public function rules(): array { ... }
    // Missing authorize() method → default true (insecure)
}
```

**Reason:** Spatie `FormRequest::authorize()` is the standard gate. Forgetting it is a common vulnerability.

---

## Naming Conventions

### 14. Use Explicit, Meaningful Names (Avoid `data`, `temp`, `cache`)

**Rule:** Variable, method, and class names must describe their purpose, not their type.

```php
// ✅ Correct
$conversationsByWorkspace = $this->fetchConversationsByWorkspace($workspaceId);
$remainingQuota = $entitlement->remaining_conversations;
public function extractContactFromPayload() { ... }

// ❌ Wrong
$data = $this->fetch($workspaceId);  // What data?
$cache = $quotaValue;  // Is it really cached?
$temp = $payload;  // Temporary what?
```

**Reason:** Code is read far more than written. Explicit names reduce cognitive load + prevent misuse.

---

## Testing & Verification

### 15. RLS Coverage Must Be Verified in Tests

**Rule:** Every workspace-scoped table must have a test asserting that RLS policies correctly deny cross-workspace queries.

```php
// ✅ Correct (tests/Feature/RlsPolicyCoverageTest.php)
public function test_leads_table_has_rls_policy() {
    $workspace1 = Workspace::factory()->create();
    $workspace2 = Workspace::factory()->create();
    
    $lead = Lead::factory()->for($workspace1)->create();
    
    TenantScope::set($workspace2->id);
    
    $result = Lead::where('id', $lead->id)->first();
    $this->assertNull($result);  // RLS denied; correct
}
```

**Reason:** RLS is a safety net. Tests verify it's not misconfigured.

---

## Layered Architecture

### 16. Chia lớp — lõi mù nhà cung cấp, lớp trên chỉ biết lớp ngay dưới

> Rule này là dạng chi tiết của §0.2 và §0.6, viết cho chức năng nhắn tin làm ví dụ. **Áp dụng y hệt cho mọi chức năng** — thay "kênh" bằng "cổng thanh toán", "nhà cung cấp email", v.v.

**Rule:** Kiến trúc chia lớp rõ ràng, đọc vào là hiểu. **Cấm cố định (hardcode) logic của một kênh/nhà cung cấp/cá nhân/case cụ thể vào lớp dùng chung hoặc lớp lõi.** Đặc thù cụ thể sống trong driver/adapter của nó; lõi chỉ nói chuyện qua contract trung tính.

**Hướng phụ thuộc:** mỗi lớp **chỉ được biết lớp ngay dưới** — không nhảy cóc, không phụ thuộc ngược. Danh tính "cứng dần" khi đi lên; chi tiết dễ bay (session, slot, token) bị chặn ở lớp dưới, không leo lên lõi.

```
L5 CRM/CDP  →  L4 Core (Conversation/Message)  →  L3 Chuẩn hoá (Driver.parse)  →  L2 Danh tính tài khoản  →  L1 Transport
   (chỉ thấy hộp thư + nội dung)      (chỉ thấy contract + account_id)         (chỉ thấy 1 kênh)         (chỉ thấy slot/session)
```

```php
// ❌ Sai — lõi biết Zalo, biết session slot
class ConversationService {
    public function reply(Conversation $c) {
        $slot = ZaloConnection::where('connection_id', $c->zalo_connection_id)->first(); // core coupling!
        Http::post($slot->bridge_url, ...);                                              // Zalo-specific in core!
    }
}

// ✅ Đúng — lõi gọi contract; driver tự resolve chi tiết kênh
class ConversationService {
    public function reply(Conversation $c, array $payload) {
        app('channels')->driver($c->channel)->sendMessage($c, $payload); // core mù kênh/mù session
    }
}
// Driver (module Zalo) tự map channel_account → slot đang connected. Thêm Messenger = thêm driver, KHÔNG sửa lõi.
```

**Ranh giới bắt buộc:**
- **Lõi (Models core, InboundMessageService, ConversationService, controllers inbox)** KHÔNG được import class/khái niệm của một kênh cụ thể (không `ZaloConnection`, không `connection_id`, không cookie/token).
- Cột đặc thù kênh KHÔNG nằm trong bảng core → dùng khoá trung tính (`channel_account_id`), chi tiết ở bảng module.
- Thêm một kênh mới **chỉ** = thêm một driver (L1–L3) + đăng ký `Manager::extend()`; **không** chạm L4/L5.
- Không `if ($channel === 'zalo') {...}` trong lõi. Rẽ nhánh theo kênh = mùi coupling → đẩy xuống driver.

**Reason:** Clean, maintainable, scalable. Lõi ổn định khi kênh thay đổi; một behavior đổi chỉ sửa một chỗ (DRY); người mới đọc theo lớp là hiểu. Viết như một senior: đặt logic đúng lớp, không tiện tay nhét vào lõi. Xem [Channel-Account Architecture](features/messaging/channel-account-architecture.md) làm ví dụ tham chiếu; củng cố Rule 2–3 (Driver Pattern) và Rule 11 (per-channel).

---

## Summary Table

| Pattern | Location | Reason |
|---------|----------|--------|
| **Module = chức năng, không phải "đồ bên ngoài"** | `app/Modules/<ChucNang>/` | §0.1 — Zalo là kênh của chat, không phải "một loại tích hợp" |
| **Http + Models ở gốc, chỉ nghiệp vụ nằm trong module** | `app/Http/`, `app/Models/`, `app/Modules/` | §0.3 — HTTP chỉ là một cách gọi; model dùng chéo chức năng |
| **Tầng trong module đặt theo CÔNG ĐOẠN nghiệp vụ** | `Port/ Adapter/ Intake/ Store/ Delivery/ …` | §0.3 — `Inbound/`/`Outbound/` chỉ nói hướng, không nói việc |
| **DTO nằm trong tầng sở hữu nó** | `Intake/InboundEvent`, `Delivery/OutboundEvent` | §0.3 — nhìn tên biết ai đẻ ra |
| **Sự kiện vào/ra có gốc trừu tượng chung** | `InboundEvent` / `OutboundEvent` + lớp con | §0.6 — thêm loại sự kiện không sửa lõi |
| **Ba mặt tiền route, một lõi** | `web.php` · `web_api.php` · `api.php` | §0.4 — mọi tính năng mở ra API được, không viết lại |
| **UI gom theo chức năng** | `components/<chuc-nang>/`, `pages/<chuc-nang>/` | §0.5 |
| **Thông tin nghiệp vụ = cột thật, không JSON** | schema | §0.3 — payload thô của nhà cung cấp mới được để jsonb |
| Models flat in `app/Models/` | All Eloquent models | Simplifies discovery, matches Laravel |
| Hợp đồng adapter trong `Port/` của chức năng | `Modules/<ChucNang>/Port/` | Cổng và phích là một cặp |
| Adapter tự đăng ký qua `Manager::extend()` | ServiceProvider của adapter | Pluggable, testable |
| `MeteringService` concrete, not interface | `app/Services/` | Bộ đếm là core; không mập mờ |
| Restore queries use `->withTrashed()` | Any restore route | Soft-deleted are hidden by default |
| Cross-namespace shims use `class_alias()` | Bootstrap or compatibility layer | Morph alias registry safety |
| Attachment authz checks parent | `AttachmentController` | Attachment is detail of parent |
| Queue jobs set workspace scope | Job `handle()` | RLS requires context to deny safely |
| Webhook upserts catch `QueryException 23505` | Webhook handlers | Idempotency under concurrency |
| Conversation unique per-channel | Schema | Avoid forced merges until Phase-08 CDP dedup |
| Use `saveQuietly()` for non-audit writes | Model updates | Prevent audit log pollution |
| Form requests enforce authorization | `FormRequest::authorize()` | Spatie pattern; prevents auth bypass |
| Meaningful variable names | All code | Readability, prevent misuse |
| RLS tested per table | Test suite | Verify isolation is configured |
| **Chia lớp; lõi mù nhà cung cấp; lớp trên chỉ biết lớp dưới** | **Toàn codebase** | **Thêm nhà cung cấp = thêm adapter, không sửa lõi** |

---

## References

- **§0 ở đầu file này là quy ước chi phối — mọi rule khác phục vụ nó.**
- [System Architecture](system-architecture.md) § Driver Pattern, RLS.
- [CRM Authorization Model](crm-authorization-model.md) § Access control.
- [Feature: Zalo Personal Connect](features/integration/zalo-personal-connect.md) § Driver example.
- [Phase 4 Bug Sweep Report](plans/260628-traditional-laravel-refactor/reports/bug-sweep-findings.md) § Finding origins.
