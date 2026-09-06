# Lô 6 — PHIÊN & VÒNG ĐỜI INBOX · ghi chú thi công (07/09/2026)

Agent `zalo-lo6-session`. Nguồn: `reports/zalo-deep-audit.md` mục 6.1–6.12, `reports/ux-zalo-main-session-notes.md`
mục 3/4/5, `docs/channel-capabilities.md` §2.5, `reports/zalo-lo1-notes.md`.
KHÔNG commit. KHÔNG restart bridge :3710. KHÔNG sửa `services/zalo-bridge/**`.

## Kết quả theo finding

| # | Mức | Trạng thái | Sửa ở đâu |
|---|---|---|---|
| 6.1 | 🟠 | XONG | `Zalo::booted()` → `deleting` → `releaseBridgeSession()` (cancel QR + logout); `QrLoginService::start` huỷ phiên quét dở trước khi mở token mới |
| 6.2 | 🟠 | XONG | `Inbox::reauthorizationRequired()` (contract lõi theo `Capability::SessionReauth`, KHÔNG if-zalo) + `InboxResource` + `SetCurrentAccount` + sidebar/card/banner |
| 6.3 | 🟠 | MỘT NỬA | Laravel đăng xuất slot ngay khi phát hiện lệch + trả 409 kèm tên tài khoản đang gắn. **Phần bridge (`expected_personal_uid`) là yêu cầu cho Lô 1 — xem cuối** |
| 6.4 | 🟠 | XONG | `QrLoginService::identityConflict()` → 409 `zalo_account_in_use` kèm `inbox_name` + logout slot vừa nối |
| 6.5 | 🟠 | XONG | `App\Jobs\Zalo\ZaloHealthSweepJob` (cron `*/1`, `withoutOverlapping`) + `ZaloBridgeClient::health()` + đếm hỏng liên tiếp trong `ZaloHealthMonitor` |
| 6.6 | 🟡 | XONG | Bước QR có URL riêng `settings/inboxes/new/{inboxId}/zalo` (`InboxesSettingsController::connectZalo` + `ZaloConnect.tsx`) |
| 6.7 | 🟡 | XONG | `POST …/zalo/disconnect` + `QrLoginService::disconnect()` + thẻ tài khoản/2 nút trên tab Cấu hình |
| 6.8 | 🟡 | XONG | `ZaloQrPanel` làm lại: 5 pha, đếm ngược, tự làm mới khi hết hạn, phân biệt "không nối được cầu nối" ↔ "cầu nối từ chối" |
| 6.9 | 🟡 | XONG (phần Laravel) | `zalo.bridge.promote_timeout = 30` (trước dùng chung 10s) |
| 6.10 | 🟡 | XONG | Promote lưu `display_name`/`phone` + `AvatarFromUrlJob` đặt avatar hộp thư (chỉ khi chưa có ảnh riêng); thẻ "Tài khoản Zalo đang kết nối" |
| 6.11 | ⚪ | KHÔNG LÀM | Thuộc `services/zalo-bridge/**` (Lô 1 sở hữu) |
| 6.12 | 🟡 | KHÔNG LÀM | Chờ founder chốt (lời mời kết bạn) |
| 7.8 | ⚪ | XONG | Bổ sung 15 test Pest + vitest panel QR |

## Chi tiết những chỗ dễ hiểu sai

### 6.1 — Xoá hộp thư PHẢI đăng xuất bridge, và móc phải nằm ở kênh chứ không ở lõi
`Inbox::deleting` vốn đã gọi `$inbox->channel?->delete()` TRƯỚC khi xoá hàng inbox. Nên chỗ đúng để đăng
xuất là `Zalo::booted() → static::deleting()`, **không** phải thêm `if (isZalo())` vào `Inbox`. Lõi không
biết Zalo là gì; thêm kênh mới cần đăng xuất chỉ việc khai móc của chính nó.

`releaseBridgeSession()` best-effort: bridge chết cũng không chặn người dùng xoá hộp thư (có test riêng).
Đổi lại, phiên bên bridge có thể còn sống tới lần khởi động lại — đây là đánh đổi có chủ ý, không phải bỏ sót.

### 6.2 — `reauthorization_required` đi qua contract lõi
`Inbox::reauthorizationRequired()` hỏi đúng hai câu: kênh có khai `Capability::SessionReauth` không, và
kênh có trả lời `reauthorizationRequired()` không. Với Zalo, `reauthorizationRequired()` = `! isConnected()`
(gồm cả `qr_waiting`, `session_lost`, `disconnected`) — hộp thư nào chưa quét QR xong cũng phải nói ra.

Khoá `reauthorization_required` xuất hiện ở BA đường, cùng một tên như Facebook/Instagram/Tiktok của gốc:
- `InboxResource` (trang cấu hình) — qua `zaloChannelAttributes`;
- `SetCurrentAccount` prop `inboxes` (sidebar Kênh + thẻ hội thoại);
- `GET …/zalo/health`.

**Lệch nhẹ so với gốc, cố ý:** partial gốc chỉ trả khoá này cho Email khi người xem là administrator.
Prop `inboxes` của sidebar nay trả cho mọi vai trò và với mọi kênh khai `session_reauth` (Email, WhatsApp,
FB, IG, TikTok, Zalo). Hệ quả: nhân viên thường cũng thấy icon cảnh báo trên sidebar. Đánh giá là đúng
hơn gốc (nhân viên cần biết hộp thư đang chết), nhưng ghi ra đây để phiên chính duyệt.

### 6.4 vs 6.3 — hai kiểu "sai tài khoản" phải nói khác nhau
- `zalo_account_mismatch`: quét nhầm khi đang kết nối LẠI chính hộp thư này → thông điệp nêu tên tài khoản
  đang gắn.
- `zalo_account_in_use`: tài khoản đó đã gắn hộp thư khác trong cùng account → thông điệp nêu **tên hộp thư kia**.

Cả hai đều gọi `/auth/logout` ngay: slot bridge đã kết nối rồi, không đăng xuất thì listener mới đá phiên
của hộp thư kia ra (đúng bản chất finding 6.4 — trước đây nổ 500 rồi hiện thành "bridge chưa chạy").

Người dùng **chủ động ngắt** (`state = disconnected`) thì bỏ chốt mismatch — đó chính là đường "đổi tài khoản".
`zalo_uid`/tên cũ vẫn giữ trong DB để màn cấu hình còn nói được hộp thư từng gắn tài khoản nào.

### 6.5 — nhịp tim, và vì sao ngưỡng là ba
Bridge sau Lô 1 tự đăng nhập lại theo backoff 5s→…→5m. Nếu Laravel hạ trạng thái ngay nhịp đầu, hộp thư sẽ
nhấp nháy đỏ mỗi lần mạng chớp. `ZaloHealthSweepJob::FAILURE_THRESHOLD = 3` nhịp phút liên tiếp mới hạ.
Hồi lại thì tự đưa về `connected` + `reset()` mạch ngắt.

`GET /health` của bridge là **read-only** và `ZaloBridgeClient::health()` **không** truyền `bot_id` — đúng
cảnh báo 1.6 của Lô 1 (truyền `bot_id` vào code bridge CŨ sẽ ghi đè meta và làm mất `workspace_id`).

### Ngắt mạch có half-open (mục 5 của brief)
`ZaloHealthMonitor` cũ mở mạch là khoá tới hết cửa sổ 1 giờ, không lối thoát và không hiện ra đâu cả. Nay:
- `isCircuitOpen()` sau `half_open_seconds` (mặc định 300) trả `false` đúng MỘT lượt rồi dời mốc — thử lại
  chứ không thử dồn dập;
- `status()` trả `ok | degraded | half_open | open` + `retry_at`, `GET …/zalo/health` đưa ra khoá `bridge`
  để giao diện nói được "đang thử lại lúc …".

### 6.6 — F5 ở bước QR không còn tạo hộp thư mồ côi
Trước: `Zalo.tsx` giữ `inboxId` trong state React, F5 quay về bước 1 và tạo hộp thư thứ hai (bằng chứng:
inbox 58 trùng tên inbox 59 trong DB dev). Nay bước QR là một URL riêng
`GET /app/accounts/{id}/settings/inboxes/new/{inboxId}/zalo`, đúng mô hình "mỗi bước một URL" của wizard gốc.

### BridgeEventService — trạng thái lạ không còn rơi vào im lặng
`handleSession` nay ánh xạ `session_ok|connected|ready` → connected, `session_lost|disconnected|closed` →
session_lost, `qr_waiting|logging_in` → qr_waiting, còn lại **ghi log cảnh báo** thay vì `default => null`.
Lô 1 xác nhận bridge hôm nay chỉ phát `session_ok`/`session_lost`; các nhánh còn lại là chốt chặn để đổi
hợp đồng bridge không gây mất tín hiệu êm. Phiên sống lại còn `reset()` mạch ngắt — không thì tin vẫn bị
chặn êm sau khi phiên đã ổn.

## Dọn inbox 58 mồ côi (mục 6 của brief)

Trước khi xoá: `inbox 58 · account 3 · channel_zalo id 5 · state qr_waiting · zalo_uid rỗng · 0 hội thoại`
(trùng tên với inbox 59 — hộp thư thật, channel 6, `connected`, 2 hội thoại).

Xoá **qua model** để chạy đúng móc mới, và bọc `Http::fake()` để **không có lời gọi thật nào ra bridge
:3710** (brief cấm gọi bridge ngoài GET read-only):

```
php artisan tinker --execute='Http::fake(...); App\Models\Inbox::find(58)->delete();'
# [CHAN] cầu nối KHÔNG bị gọi thật: http://127.0.0.1:3710/auth/logout
# sau: inbox58=NULL channel5=NULL
# inbox59 con: 'Nguyễn Phước Lộc' state=connected
```

Kết quả: inbox 58 + channel_zalo 5 đã xoá; inbox 59 / channel 6 (phiên thật của founder) **không bị đụng**,
vẫn `connected`.

## Giao diện (làm bởi agent con `lo6-fe`, mình duyệt + nghiệm thu bằng trình duyệt)

| Việc | File |
|---|---|
| Panel QR: 5 pha (`starting/waiting/scanned/confirming/error`), đếm ngược 100s, **tự xin mã mới tối đa 3 lần** rồi mới bắt bấm tay, poll lỗi ≥5 lần liên tiếp thì thoát spinner | `settings/inboxes/channels/ZaloQrPanel.tsx` |
| Một nguồn dịch `error_code` → chuỗi (`resolveErrorMessage`) dùng chung cho lỗi mở QR lẫn lỗi promote | như trên |
| Thẻ "Tài khoản Zalo đang kết nối" (avatar · tên · trạng thái · SĐT · thời điểm kết nối · trạng thái cầu nối) + nút **Ngắt kết nối Zalo** (có hộp xác nhận) + **Gắn tài khoản khác** | `channels/ZaloSessionBanner.tsx` |
| Bước QR có URL riêng | `channels/ZaloConnect.tsx` (mới) + `channels/Zalo.tsx` (bỏ state `inboxId`, `router.visit`) |
| Icon cảnh báo trên sidebar Kênh — port `ChannelLeaf.vue` | `components-next/sidebar/{menuItems.ts,SidebarGroupLeaf.tsx}` (`SidebarChannelLeafContent`) |
| Badge cảnh báo trên thẻ hội thoại | `components/widgets/conversation/ConversationCard.tsx` |
| Biểu ngữ mất phiên ở **khung chat** (dùng `inbox.reauthorization_required`, KHÔNG rẽ theo `channel_type`) | `conversation/conversationbox/MessagesView.tsx` |
| Kiểu dữ liệu | `settings/inboxes/types.ts`, `dashboard/types.ts`, `search/useInboxLookup.ts` |

FE **không** thêm chuỗi mới — toàn bộ dùng khoá đã khai ở `lang/{en,vi}/inbox_mgmt.php`.

## Kiểm chứng

| Gate | Kết quả |
|---|---|
| Pest Zalo + Contracts + Channel + Inbox (`DB_DATABASE=yona_rw_test_lo6`) | **511/511 xanh**, 1502 assertion |
| Pest TOÀN BỘ | **2214/2214 xanh** (xem cảnh báo về redis test bên dưới) |
| `vendor/bin/pint --test` (app/ routes/ tests/Feature/Channels/ config/zalo.php lang/) | xanh |
| `npx tsc --noEmit` | 0 lỗi |
| `npx vitest run …/ZaloQrPanel.test.tsx` | **7/7 xanh**; toàn repo 99 file / 792 test xanh |
| `flock /tmp/yona-build.lock npm run build` | xanh |
| `php artisan i18n:generate --check` | "Bundle i18n khớp lang/" |

Test khoá đúng bốn điểm DoD (trong `tests/Feature/Channels/ZaloQrLifecycleTest.php`, 27 test — thêm 16):
- `session_lost` → `reauthorization_required` true ở CẢ `InboxResource` lẫn `Inbox::reauthorizationRequired()`
  (webhook `bridge_session` thật, không gọi hàm tắt);
- ngắt kết nối → `state=disconnected` + `/auth/logout` được gọi; và bản bridge-chết vẫn xong, `bridge_reachable=false`;
- xoá hộp thư → `/auth/qr/cancel` + `/auth/logout` được gọi đúng `connection_id`; và bản bridge-chết vẫn xoá được;
- URL bước QR mở hai lần **không** tăng số hộp thư (chống lại đúng lỗi inbox 58);
- thêm: `zalo_account_in_use` chỉ đúng tên hộp thư kia · phân biệt `bridge_unreachable` ↔ `bridge_rejected` ·
  nhịp tim 3 nhịp mới hạ trạng thái, hồi lại tự về `connected` · half-open cho đúng MỘT lượt thử.

### Ảnh Playwright (trước/sau) — `~/www/pixel-diff/qa-lo6/`

Giả lập bằng cách tạo **hộp thư QA riêng** (inbox 84 / channel 7, account 3) rồi đổi `state` trong DB;
**KHÔNG đụng inbox 59 và KHÔNG làm mất phiên thật**. Đã xoá sạch sau khi chụp (chỉ còn inbox 59, `connected`).

| Ảnh | Cho thấy |
|---|---|
| `inbox-settings-connected.png` | Thẻ "Shop QA Lô 6 · Đang kết nối · +84900000000 · Kết nối từ khoảng 3 giờ trước · Cầu nối Zalo: Bình thường" + hai nút Ngắt kết nối / Gắn tài khoản khác |
| `inbox-settings-session-lost.png` | Biểu ngữ đỏ "Phiên Zalo của hộp thư này đã kết thúc…" + nút "Quét lại mã QR" |
| `sidebar-connected.png` | Nhóm Kênh: cả hai hộp thư **không** có icon cảnh báo |
| `sidebar-session-lost.png` | Cùng khung hình: "Nguyễn Phước Lộc" sạch, "QA Lô 6 kiểm mất ph…" có **icon cảnh báo đỏ** |

Console trên trang cấu hình hộp thư: **0 request lỗi** (đã dò bằng `qa-lo6/probe-409.mjs`; mã 409 duy nhất
trong log là của `/app/login` khi SSO gặp phiên cũ, không phải từ mã Lô 6).

## Ngoài phạm vi được giao nhưng có đụng (cần phiên chính duyệt)

1. **`app/Http/Middleware/SetCurrentAccount.php`** — thêm ĐÚNG một khoá `reauthorization_required` vào prop
   `inboxes`. Không có nó thì sidebar và thẻ hội thoại không có dữ liệu để hiện icon, tức mục 1 của brief
   không thể làm xong. Thêm thuần tuý, không đổi khoá nào đang có.
2. **`app/Models/Inbox.php`** — thêm `reauthorizationRequired()` (contract lõi), đúng phần "chỉ hook xoá +
   reauthorization" của brief. Móc xoá thì **không** cần đụng: đã đặt ở `Zalo::booted()`.
3. **`app/Http/Controllers/App/InboxesSettingsController.php` + `routes/web.php`** — một action + một route cho
   bước QR (mục 6.6). `routes/web.php` khối G1 đã được brief cho phép.
4. **`routes/console.php`** — đăng ký `ZaloHealthSweepJob` cron `*/1` + `withoutOverlapping()`. Không đăng ký
   thì job 6.5 là mã chết. **Đã kiểm `ps`: máy dev KHÔNG chạy `schedule:work`, nên job này chưa từng gọi
   bridge :3710 trong phiên làm việc.**
5. **`config/zalo.php`** — thêm hai khoá: `bridge.promote_timeout = 30` (6.9) và
   `circuit_breaker.half_open_seconds = 300`. Mặc định trong code trùng giá trị này nên bỏ khoá đi vẫn chạy.
6. **`tests/Feature/Channels/ZaloCapabilitiesTest.php`** — đảo khẳng định `SessionDisconnect` từ `false` sang
   `true` (nay đã có đường thực thi thật). `docs/channel-capabilities.md` dòng 138 vốn đã ghi Zalo `✓/✓/✓`
   cho `session_reauth/disconnect/health` nên **không phải sửa docs**.
7. **`resources/js/dashboard/conversation/conversationbox/MessagesView.tsx`** — biểu ngữ mất phiên ở khung chat.
   File này ngoài cây `settings/inboxes/**` nhưng mục 1 của brief yêu cầu banner ở khung chat. Chỉ thêm một
   nhánh đọc `inbox.reauthorization_required`, KHÔNG rẽ nhánh theo `channel_type`.
8. **`components/widgets/conversation/ConversationCard.tsx`** — badge; **không** đụng dòng `capitalize` (~162)
   mà Lô 5 sẽ sửa.

### Lệch có chủ ý so với Chatwoot gốc
Partial gốc chỉ trả `reauthorization_required` cho Email khi người xem là administrator. Prop `inboxes` của
sidebar nay trả cho **mọi vai trò** và **mọi kênh khai `session_reauth`** (Email, WhatsApp, FB, IG, TikTok,
Zalo). Nhân viên thường vì thế cũng thấy icon cảnh báo. Đánh giá là đúng hơn gốc (nhân viên cần biết hộp thư
đang chết), nhưng ghi ra để phiên chính duyệt. Ngoài ra `Inbox::reauthorizationRequired()` hỏi thẳng kênh,
không mang theo hai điều kiện phụ mà partial gốc gắn thêm cho Email (`blank(provider_config)`) và WhatsApp
(`provider_config.source === 'embedded_signup'`) — với Email là chặt hơn (ít cảnh báo hơn), với WhatsApp là
rộng hơn. Đưa hai điều kiện đó vào lõi sẽ là hardcode đặc thù kênh, trái quy ước kiến trúc, nên để nguyên.

## Yêu cầu gửi phiên chính / Lô 1 (bridge — KHÔNG tự sửa)

1. **6.3 còn nửa sau (🟠).** `/auth/qr/promote` cần nhận `expected_personal_uid` và so `slot.personalUid`
   **TRƯỚC** khi `clearSlot`/mở listener/post `session_ok`; lệch thì trả 409 + `clearSlot(qrKey)`. Hiện Laravel
   chỉ phát hiện lệch SAU khi bridge đã post `session_ok`, nên DB có một cửa sổ ngắn rơi về `connected` giả rồi
   mới bị `logout` sửa lại. `QrLoginService::promote` đã sẵn chỗ cắm (chỉ thêm một trường vào payload).
2. **Bridge tự dọn slot `qr:*` chưa promote sau N phút** (6.1). Laravel nay huỷ phiên cũ trước khi mở phiên mới,
   nhưng người dùng đóng tab giữa chừng thì slot vẫn treo tới khi bridge dọn.
3. **Nghiệm thu cần founder bấm tay** (mình KHÔNG làm vì brief cấm gọi bridge ngoài GET read-only):
   - bấm "Ngắt kết nối Zalo" trên inbox 59 → bridge phải nhận `/auth/logout connection_id=6`, state về
     `disconnected`, panel QR cho quét tài khoản khác;
   - quét QR thật ở wizard rồi F5 giữa chừng → không sinh hộp thư thứ hai;
   - để mã QR hết 100 giây → panel tự xin mã mới (tối đa 3 lần) chứ không đứng im.
4. **Sau khi bridge restart (Lô 1)**, `ZaloHealthSweepJob` mới có `/health` yêu cầu `X-Bridge-UI-Secret` —
   `ZaloBridgeClient::health()` đã gửi header và **cố ý không gửi `bot_id`** (tránh nhánh ghi meta của bridge cũ
   làm mất `workspace_id`, cảnh báo 1.6 của Lô 1). Nếu bật `schedule:work` trên dev thì job sẽ bắt đầu gọi
   `/health` mỗi phút — đó là GET read-only, nhưng nên bật sau khi restart bridge.

## Cảnh báo môi trường (không phải lỗi mã)

Lần chạy toàn bộ Pest đầu tiên hỏng 1 test (`AgentAssignmentServiceTest::picks online agents in round robin
order`, `Attempt to read property "id" on null`). **Không phải hồi quy của Lô 6**: nguyên nhân là key redis
cũ còn sót ở DB test — `redis-cli -n 4 KEYS '*'` ra đúng một key `yona-database-ROUND_ROBIN_AGENTS:43`
(hàng đợi round-robin của một inbox id từ lần chạy trước). `redis-cli -n 4 FLUSHDB` rồi chạy lại: **2214/2214
xanh**. Đề xuất cho Lô 7 (TEST & CI): flush redis DB test trong `Pest.php`/CI trước mỗi lượt, không thì suite
phụ thuộc thứ tự chạy.

## Dọn dẹp

- Không commit, không `git add`, không đụng file của phiên khác (`Message.tsx`, `IncomingMessageService.php`,
  `services/zalo-bridge/**`).
- DB test riêng `yona_rw_test_lo6` — **chưa drop** để phiên chính chạy lại gate nếu cần
  (`dropdb -h 127.0.0.1 -U postgres yona_rw_test_lo6` khi xong).
- Dữ liệu QA trên `yona_rw`: inbox 84 / channel 7 đã xoá; inbox 58 mồ côi đã xoá theo yêu cầu; inbox 59 nguyên vẹn.
- **Không gọi bridge :3710 lần nào** — mọi thao tác đụng bridge đều bọc `Http::fake()` (in ra dòng
  `[CHAN] cầu nối KHÔNG bị gọi thật: …` làm bằng chứng); không restart bridge, không sửa `services/zalo-bridge/**`.
- Script bằng chứng: `~/www/pixel-diff/qa-lo6/{session-evidence,sidebar-shot,probe-409}.mjs` (thư mục riêng,
  không sửa file dùng chung của pixel-diff).

```
Status: DONE_WITH_CONCERNS
Summary: Xong 6.1/6.2/6.4/6.5/6.6/6.7/6.8/6.9/6.10 + half-open ngắt mạch + dọn inbox 58 mồ côi; 2214/2214 Pest, 792 vitest, tsc/pint/build/i18n xanh; ảnh Playwright chứng minh icon sidebar + biểu ngữ khi mất phiên.
Concerns/Blockers:
  1. 6.3 mới xong nửa Laravel — nửa bridge (`expected_personal_uid` so TRƯỚC khi post session_ok) phải do Lô 1 làm; hiện còn cửa sổ ngắn DB rơi về `connected` giả.
  2. Ba kịch bản phải bấm tay trên phiên Zalo thật (ngắt kết nối, F5 giữa wizard QR, mã QR hết hạn) — brief cấm gọi bridge ngoài GET read-only nên mình không chạy.
  3. Đã đụng 3 file dùng chung ngoài phạm vi (SetCurrentAccount, routes/console.php, MessagesView.tsx) — đều là điều kiện cần để mục 1 và mục 5 của brief chạy được; xin duyệt.
  4. Lệch có chủ ý: sidebar trả `reauthorization_required` cho mọi vai trò và mọi kênh khai `session_reauth` (gốc gate Email theo admin).
  5. Suite Pest phụ thuộc thứ tự vì redis DB test không được flush — 1 test hỏng lần đầu, xanh sau khi FLUSHDB; đề xuất chuyển cho Lô 7.
```
