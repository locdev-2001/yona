# Lô đánh bóng Zalo #1 — mục 13/14/15/16 của `ux-zalo-main-session-notes.md` (07/09/2026)

Agent `zalo-polish-1`. KHÔNG commit. Bridge :3710 chỉ gọi `GET /health` (read-only), không restart.
DB test riêng `yona_rw_test_polish` (đã `dropdb` sau khi xong).

## Kết quả

| # | Việc | Trạng thái | Sửa ở đâu |
|---|---|---|---|
| 15 | Tab "Cấu hình" của inbox Zalo hiện nội dung kênh API | XONG — **ẩn tab** | `settings/inboxes/Show.tsx` |
| 16 | Thẻ tài khoản Zalo thiếu avatar (inbox 59) | XONG + đã backfill thật | `ZaloProfileSync` (mới), `ZaloHealthSweepJob`, `ZaloConnectionsController`, `QrLoginService` |
| 14 | "Thu hồi với mọi người" không hỏi lại | XONG | `components-next/message/MessageActions.tsx` + lang |
| 13 | Chỉ báo "đang nhập…" tắt sau 5 giây | XONG — 10 giây, vào config | `config/zalo.php`, `TypingRelayService` |

## 15 — vì sao chọn ẨN tab thay vì đưa QR vào tab Cấu hình

`Settings.vue` gốc (`tabs()`, dòng ~208) chỉ thêm tab `configuration` cho Twilio · Line · API ·
Email không provider · WhatsApp Cloud · Web widget. Bản port thêm `INBOX_TYPES.ZALO` vào danh sách
đó, nên `ConfigurationPage` rơi về nhánh API và in ra token định danh + HMAC của kênh khác — sai
kênh, không phải chỉ thừa.

Chọn **ẩn tab** (trả danh sách về đúng bản gốc) vì:
- phần "cấu hình" thật của Zalo là **thẻ tài khoản + panel QR**, và nó đã nằm ở đầu tab **Cài đặt**
  từ Lô 6. Mất phiên là việc khẩn — giấu sau một cú bấm nữa là làm xấu đi, còn hiện ở cả hai nơi là
  nhân đôi cùng một khối UI;
- không có thứ gì khác của Zalo cần một trang cấu hình riêng.

Không có `if (channel_type === 'Channel::Zalo')` nào được thêm. Ngược lại, chỗ đang rẽ theo kênh đã
được đổi sang **năng lực**: `isZaloChannel` → `inboxSupports(inbox, 'session_qr')`. Kênh sau khai
`session_qr` là tự có thẻ tài khoản, không sửa `Show.tsx`. `capabilities` được thêm vào type
`Inbox` của settings (InboxResource đã trả sẵn khoá này từ Lô 4).

URL cũ `/settings/inboxes/59/configuration` **không vỡ**: `tabKeysFor` không còn khoá đó nên
`Show.tsx` rơi về tab `inbox-settings` (đã kiểm bằng trình duyệt, xem bằng chứng).

Ghi nhận lệch có chủ ý: `docs/channel-capabilities.md` §2.5 đã bổ sung một câu cho `session_qr`
(đó là cửa hiện thẻ tài khoản ở FE).

## 16 — backfill avatar/tên: một chỗ ghi, hai đường gọi

Trạng thái thật của inbox 59 trước khi sửa: `display_name = 'Nguyễn Phước Lộc'` nhưng **inbox không
có avatar**. Nghĩa là chốt "chỉ backfill khi thiếu tên" sẽ bỏ sót đúng ca này — điều kiện phải là
**hồ sơ còn thiếu**, không phải "chưa có tên".

`app/Services/Zalo/ZaloProfileSync.php` (mới) là **chỗ duy nhất** ghi tên/SĐT/ảnh tài khoản Zalo:
- `isIncomplete($channel)` = `blank(display_name) || inbox->avatar === null` — dùng chung cho nhịp
  tim và trang cấu hình, nên "thế nào là thiếu" chỉ định nghĩa một lần;
- `apply($channel, $profile, authoritative:)` — promote (`authoritative: true`, vừa quét xong là
  nguồn chuẩn) ghi đè; nhịp tim (`false`) chỉ lấp chỗ rỗng;
- `QrLoginService::syncInboxAvatar()` (private, trùng luật) đã bị gỡ, promote gọi thẳng `apply()`.

Hai đường gọi cùng đọc **một** payload `GET /health` của bridge:
- `ZaloHealthSweepJob` (cron mỗi phút) — sau khi `markHealthy`, nếu hồ sơ còn thiếu thì lấp từ
  `integrated_display_name` / `integrated_avatar`;
- `GET …/zalo/health` — kênh đang `connected` mà hồ sơ còn thiếu thì `ZaloHealthSweepJob::dispatchSync()`
  ngay trong request rồi `refresh()`, nên **lần vào trang đầu tiên đã có dữ liệu**, không phải đợi cron.
  Đây là cùng một đường đọc, không phải đường thứ hai.

**Bẫy đã chặn:** nhịp tim chạy mỗi phút, nếu cứ thấy `inbox->avatar === null` là đẩy `AvatarFromUrlJob`
thì (a) spam job vô hạn khi URL ảnh hỏng, (b) chủ hộp thư xoá ảnh xong bị hệ thống tự đắp lại sau 60
giây. Đã ghi nhớ URL ảnh đã thử ở cache `zalo:profile-avatar:{connection_id}` (7 ngày): cùng URL thì
không thử lại; promote (`authoritative`) thì bỏ qua ghi nhớ. Có test khoá (chạy nhịp tim 2 lần, job
avatar chỉ được đẩy 1).

### Backfill thật trên `yona_rw` (inbox 59 / channel 6)

```
trước : display_name='Nguyễn Phước Lộc'  avatar=false
GET http://127.0.0.1:3710/health?connection_id=6  → 200
        connected=true phase=ready
        integrated_display_name='Nguyễn Phước Lộc'
        integrated_avatar='https://s120-26-ava-talk.zadn.vn/1/fff6…jpg?key=ivfH'
chạy  : ZaloHealthSweepJob::dispatchSync(6)   (chỉ GET, không POST nào ra bridge)
sau   : state=connected  avatar=true
        storage/app/public/avatars/inbox/59/Ape0krfzn5RqHkhTY6bBkp2lbCLYjilgUwaGx5pZ.jpg (15.668 byte)
```

## 14 — hộp xác nhận trước khi thu hồi

Thanh hành động hiện khi rê chuột, nút thu hồi nằm sát nút thả cảm xúc, mà thu hồi xoá tin **ở cả
phía khách** và không hoàn tác được. Nay bấm nút chỉ **mở hộp xác nhận**.

Dùng đúng component confirm sẵn có của port: `components-next/dialog/Dialog` với `type="alert"` —
cùng thứ `ZaloSessionBanner` dùng cho "Ngắt kết nối Zalo" (bản port không có Radix primitive; chỉ có
`@radix-ui/colors`). Hộp chỉ được **dựng khi cần** (`isConfirmingDelete`), không gắn sẵn một `<dialog>`
vào mỗi bong bóng tin.

Nội dung theo năng lực kênh, không theo tên kênh:
- kênh khai `outbound_recall` → "Thu hồi tin nhắn này với cả khách?" / "Tin nhắn sẽ biến mất ở cả phía
  khách và không khôi phục lại được." (khoá mới `CONVERSATION.MESSAGE_ACTIONS.RECALL_CONFIRMATION`);
- kênh không khai (chỉ xoá một chiều) → dùng lại nguyên văn bản gốc
  `CONVERSATION.CONTEXT_MENU.DELETE_CONFIRMATION` ("Bạn chắc chắn muốn xóa tin nhắn này?").

Không làm "hoàn tác trong 3 giây" như đề xuất: thu hồi đã gửi lệnh sang Zalo, hoàn tác phía Yona chỉ
là ảo giác — hỏi trước là đúng bản chất hơn.

## 13 — cửa sổ chờ tắt "đang nhập…"

`OFF_DELAY_SECONDS = 5` (hằng số cứng) → `config/zalo.php` → `typing_off_delay = 10`.
`TypingRelayService::offDelaySeconds()` đọc config, hằng số `DEFAULT_OFF_DELAY_SECONDS = 10` chỉ còn
là mặc định khi thiếu cấu hình.

Phần "gia hạn khi có sự kiện mới" **đã có sẵn** và không phải thêm gì: mỗi sự kiện typing ghi một dấu
thời gian mới vào cache và hẹn một `StopTypingJob` mới; job cũ thấy dấu đã đổi thì tự bỏ. Nghĩa là
cửa sổ được đẩy lùi chứ không cộng dồn. Đã ghi rõ điều đó vào docblock để lần sau không ai "thêm cơ
chế gia hạn" lần hai.

## Test

| Loại | Nội dung |
|---|---|
| Pest | `ZaloQrLifecycleTest`: nhịp tim lấp tên+ảnh cho hộp thư nối từ trước · không đè tên đã có và chỉ thử đắp ảnh 1 lần · trang cấu hình lấp ngay trong lần trả về đầu · hồ sơ đủ thì không gọi bridge (`Http::assertNothingSent`) |
| Pest | `ZaloChannelTest`: `StopTypingJob` hẹn đúng 10 giây · đổi `zalo.typing_off_delay` thì delay đổi theo (chốt "không phải số cứng") |
| vitest | `MessageActions.test.tsx`: bấm thu hồi chỉ mở hộp xác nhận · huỷ thì không gọi handler, xác nhận mới gọi (1 lần) · kênh không thu hồi được thì hỏi bằng câu "xoá" của bản gốc |

Đã refactor `runZaloHealthSweep()` trong `ZaloQrLifecycleTest` vì `handle()` nhận thêm một dependency.

## Gate

| Gate | Kết quả |
|---|---|
| Pest `--filter=Zalo` trên `yona_rw_test_polish` | 141 passed / 542 assertions |
| vitest (`components-next/message`, `useInboxCapabilities`) | 83 passed / 10 file |
| `npx tsc --noEmit` | sạch |
| `vendor/bin/pint --test` (file đã đụng) | passed |
| `flock /tmp/yona-build.lock npm run build` | ✓ 3064 modules + ✓ 17 modules |
| `php artisan i18n:generate --check` | "Bundle i18n khớp lang/" |

## Bằng chứng trình duyệt (account 3, Playwright headless)

Script: `~/www/pixel-diff/qa-zalo-polish/check-zalo-inbox.mjs`
Ảnh: `~/www/pixel-diff/qa-zalo-polish/_app_accounts_3_settings_inboxes_59.png`

- Thanh tab của inbox 59: **Cài đặt · Cộng tác viên · Giờ làm việc · CSAT · Cấu hình Bot** — không
  còn "Cấu hình".
- Mở thẳng `/settings/inboxes/59/configuration`: rơi về tab Cài đặt, không trắng trang.
- Thẻ tài khoản hiện **avatar Zalo thật** + "Nguyễn Phước Lộc" + "Đang kết nối · Kết nối từ khoảng 1
  giờ trước" + "Cầu nối Zalo: Bình thường" + 2 nút Ngắt kết nối / Gắn tài khoản khác. Ảnh đại diện
  kênh cũng đã có (cùng tệp).
- Console: 1 lỗi `409` duy nhất, đến từ `POST /app/login` của luồng SSO một-lần (token đã dùng ở lần
  điều hướng trước), **không** phải từ trang hộp thư.

## Việc không làm / ngoài phạm vi

- **Không** thử thu hồi tin thật trên hội thoại 132 (dữ liệu phiên chính, brief cấm đụng). Hành vi hộp
  xác nhận được khoá bằng vitest; founder bấm thử lúc nghiệm thu là đủ.
- `docs/channel-capabilities.md` đang có sửa đổi của agent khác trong cùng cây làm việc; mình chỉ thêm
  đúng một dòng ở §2.5, không đụng phần của họ.
- `resources/js/test-setup.ts` (file dùng chung) **không** sửa: polyfill `HTMLDialogElement.showModal`
  đặt cục bộ trong `MessageActions.test.tsx`. Nếu sau này thêm test cho Dialog ở nơi khác thì nên
  chuyển polyfill này lên `test-setup.ts` — đề xuất, không tự làm.

```
Status: DONE
Summary: Ẩn tab "Cấu hình" sai kênh của inbox Zalo (gate thẻ tài khoản theo năng lực `session_qr`),
gom việc ghi hồ sơ tài khoản Zalo vào một service dùng chung cho promote + nhịp tim + trang cấu hình
rồi backfill thật avatar cho inbox 59, thêm hộp xác nhận cho "Thu hồi với mọi người", và đưa cửa sổ
tắt "đang nhập…" lên 10 giây theo `config/zalo.php`.
Concerns/Blockers: không có. Lưu ý duy nhất: `GET …/zalo/health` nay có thể gọi bridge (chỉ khi kênh
đang connected mà hồ sơ còn thiếu) — một lượt GET read-only, tự tắt sau khi lấp xong.
```
