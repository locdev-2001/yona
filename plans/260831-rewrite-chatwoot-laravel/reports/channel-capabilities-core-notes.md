# Lõi contract năng lực kênh (mục 5.1 của `docs/channel-capabilities.md`)

Agent `channel-capabilities-core` · 07/09/2026 · nhánh `rewrite/chatwoot-laravel` · **không commit**.

## 1. Đã dựng gì

| Tầng | File | Vai trò |
|---|---|---|
| Lõi | `app/Channels/Capability.php` | enum chuỗi, 55 năng lực đúng §2 (16 inbound · 16 outbound · 7 event · 8 định danh · 8 hội thoại/phiên) + `allValues()` |
| Lõi | `app/Channels/CapabilitySet.php` | tập bất biến: `of()` · `none()` · `has()` · `values()` · `all()` · `merge()` · `isEmpty()`; luôn sắp theo thứ tự enum nên snapshot ổn định |
| Lõi | `app/Channels/DeclaresCapabilities.php` | interface một hàm `capabilities(): CapabilitySet` |
| Kênh | 13 model trong `app/Models/Channel/*` | mỗi kênh tự khai; `TwilioSms` khai theo `medium` (quyết lúc đọc model, đúng §3); `TwitterProfile` khai rỗng |
| Lõi | `app/Models/Inbox.php` | `capabilities()` + `supports(Capability)` — cửa duy nhất; kênh không implement interface = rỗng, không nổ |
| API | `app/Http/Resources/InboxResource.php` | thêm khoá `capabilities` (mảng chuỗi) ở cuối khối lõi, **không đổi tên/thứ tự khoá cũ** |
| FE | `resources/js/shared/constants/channelCapabilities.ts` | danh sách + type `ChannelCapability` + shape `InboxWithCapabilities` |
| FE | `resources/js/shared/composables/useInboxCapabilities.ts` | hook `useInboxCapabilities(inbox)` (`supports`, `supportsAny`, `capabilities`) + helper thuần `inboxSupports(inbox, cap)` |
| FE | `resources/js/shared/components/IfSupports.tsx` | cổng hiển thị `<IfSupports inbox cap="…">`, nhiều cap = cần đủ |
| Test | `tests/Contracts/Channels/CapabilityDeclarationTest.php` | 4 kiểm: mọi kênh trong morph map có khai báo · giá trị hợp lệ/không trùng/đúng thứ tự · snapshot ma trận · **danh sách FE khớp enum PHP** |
| Test | `tests/Contracts/Channels/capability-matrix.snapshot.json` | snapshot sinh từ khai báo (14 dòng, gồm 2 biến thể TwilioSms) |
| Test | `tests/Contracts/Channels/Contracts/*.php` | khung `ChannelContract` + 4 contract đầu: `InboundImageContract`, `OutboundAttachmentsContract`, `ReplyToContract`, `EventSeenContract` |
| Test | `tests/Contracts/Channels/Harness/*` | `ChannelHarness` (hợp đồng phần đặc thù kênh), `OutboundAttempt`, `TelegramHarness` (kênh mẫu) |
| Test | `tests/Contracts/Channels/ChannelContractRunner.php` + `ChannelContractsTest.php` | chạy ĐÚNG contract của năng lực kênh đã khai; kênh mẫu Telegram chạy `inbound_image` + `outbound_file` + `outbound_reply_to`, bỏ qua `event_seen` (không khai) |
| Docs | `docs/code-standards.md` §0.9 | mục "Năng lực kênh" trỏ về chuẩn |
| Docs | `docs/channel-capabilities.md` §4.1 | bảng chênh lệch đã kiểm chứng giữa ma trận và code |

**Vị trí thư mục:** giữ `app/Channels/` đúng như §3 của chuẩn. Nhánh rewrite **không có** `app/Modules/*` (grep: 0 kết quả), khái niệm kênh hiện nằm rải ở `app/Models/Channel/*` (dữ liệu) + `app/Services/<Kênh>/*` (driver) + `SendReplyJob::CHANNEL_SERVICES` + morph map. Một namespace trung tính ở gốc `app/Channels` là chỗ duy nhất cả model lẫn service lẫn Http đều được phép phụ thuộc mà không tạo phụ thuộc ngược.

**Sổ đăng ký kênh dùng lại morph map** (`AppServiceProvider::morphMap`) thay vì chép danh sách kênh lần thứ hai — thêm kênh mới mà quên khai năng lực thì `CapabilityDeclarationTest` đỏ ngay.

## 2. Khai báo vs ma trận §4 — ô lệch là nợ có tên

Nguyên tắc áp dụng: **ma trận nói nền tảng làm được gì, code khai cái đã chạy thật hôm nay.** Mọi ô ✓ trong §4 mà đọc code không thấy đường thực thi thì KHÔNG khai, và được ghi thành bảng "chênh lệch đã kiểm chứng" ngay trong chuẩn (`docs/channel-capabilities.md` §4.1 — 15 dòng). Tóm tắt:

- Không kênh nào khai `outbound_retry` (không có endpoint lẫn nút retry), `outbound_reaction/recall/edit` (không có route ghi), `messaging_window` (lõi chưa cảnh báo cửa sổ 24h).
- `outbound_typing` chỉ WebWidget (đường `toggle_typing_status` → widget là thật).
- Zalo: khai đủ 14 năng lực tin đến (text/image/gif/video/audio/file/sticker/location/contact_card/bank_card/reminder/call_log/link_preview/caption), `outbound_text|sticker|reply_to`, `event_delivered|seen|reaction|recall`, `profile_name|avatar|refresh`, `identity_stable_id`, `threading_continuous`, `session_qr|reauth`, `health`. **Không** khai outbound media (`SendOnZaloService` mới gửi đính kèm đầu tiên — Zalo lô 3), `group_threads` (Q3), `friend_request` (Q7), `event_typing` (bridge có sự kiện nhưng lõi cố ý bỏ), `session_disconnect` (chưa có hành động).
- Telegram **không** khai `group_threads`: `Telegram\IncomingMessageService` bỏ qua chat nhóm (có test "bỏ qua chat nhóm").
- Thêm so với bảng (code có, bảng thiếu): `inbound_rich_text` (Email), `event_typing` (Website), `profile_refresh` (Zalo).
- `Channel::TwitterProfile` khai rỗng (không có driver vào/ra trong bản port).

Toàn bộ ma trận thật nằm ở snapshot; đổi khai báo có chủ đích thì sửa docs rồi chạy:
`UPDATE_CAPABILITY_SNAPSHOT=1 php artisan test tests/Contracts/Channels/CapabilityDeclarationTest.php`

## 3. FE: bảng đối chiếu gate cũ ↔ quyết định

Repo **không có** `INBOX_FEATURE_MAP`, `INBOX_FEATURES` hay `inboxHasFeature` (grep 0 kết quả) — bản port mới chỉ có vài chỗ so `channel_type` trực tiếp. Rà hết `resources/js` được 3 nhóm:

| Chỗ | Gate hiện tại | Quyết định | Vì sao |
|---|---|---|---|
| `dashboard/components-next/message/MessageMeta.tsx:11` | `channelType === 'Channel::Api'` → hiện tick sent/delivered/read thật | **Giữ nguyên, nợ có tên** | Đúng năng lực tương ứng là `event_delivered/seen`; ma trận cho API là "○" (bản port không có endpoint để hệ ngoài đẩy trạng thái) còn Zalo/Web/WhatsApp là ✓. Đổi ngay = API mất tick thật, Zalo bỗng có tick → **đổi hành vi**. Chuyển khi lô Zalo 4 + trạng thái tin từng kênh xong, một lượt cho cả bảng. |
| `message/Message.tsx:105` (variant EMAIL), `conversationbox/ReplyBox.tsx:95` (subject/cc-bcc/quoted reply/`MESSAGE_MAX_LENGTH.EMAIL`), `NewConversation/ComposeConversation.tsx:76`, `components/widgets/WootWriter/Editor.tsx` (`FORMATTING[channelType]`) | `channel_type === Channel::Email` | **Giữ nguyên** | Đây là hình thức soạn/hiển thị của thư (tiêu đề, CC/BCC, trích dẫn thư, giới hạn ký tự, schema định dạng), §2 chưa có năng lực nào mô tả; ép vào `inbound_rich_text` sẽ sai nghĩa và đụng pixel-diff. Cần thêm hàng "email headers/rich compose" vào chuẩn trước khi chuyển. |
| `settings/inboxes/Show.tsx`, `FinishSetup.tsx`, `settingsPage/ConfigurationPage.tsx`, `helpcenter/PortalIntegrationsSettings.tsx`, `Campaigns/.../LiveChatCampaignForm.tsx`, `helper/inbox.ts` (icon), `components-next/icon/ChannelIcon.tsx` | `channel_type === …` | **Giữ nguyên (hợp lệ)** | Màn hình cài đặt/onboarding **của chính kênh đó** và icon/nhãn — chuẩn cho phép dùng `channel_type` ở đúng hai việc này. |

Kết luận: **không có gate nào chuyển được trong đợt này mà không đổi hành vi**, nên hook/`IfSupports` giao hàng dạng hạ tầng (có vitest) cho lô Zalo 4–5 và lô từng kênh dùng ngay. Không có nút/tính năng nào đang hiện bị ẩn đi, không có cái nào mới hiện ra.

## 4. API ghi cần gate (mục 5 của brief)

- Không có endpoint reactions / recall / edit cho bất kỳ kênh nào (`grep` routes: 0) → **không thêm `abort_unless` nào, không tạo endpoint mới** (đúng brief: lô Zalo sẽ làm).
- Có 2 endpoint typing: `web_api` `POST /conversations/{id}/toggle_typing_status` và widget `POST /conversations/toggle_typing`. **Cố ý KHÔNG gate** bằng `outbound_typing`: đây là typing nội bộ giữa agent ↔ widget/dashboard (Chatwoot gốc cho mọi inbox), gate lại sẽ trả 422 cho Email/API/Telegram… đang chạy bình thường = đổi hành vi. Khi có `outbound_typing` thật cho kênh ngoài thì gate ở tầng đẩy ra kênh, không phải ở endpoint dùng chung.

## 5. Cách các lô sau nối vào khung contract

1. Viết `tests/Contracts/Channels/Harness/<Kênh>Harness.php` implements `ChannelHarness`: `receiveInbound(Capability)` bơm fixture thật của kênh, `sendOutbound(Message)` gọi driver và trả `OutboundAttempt` (payload đã bắn ra nhà cung cấp), `receiveEvent(Capability, Message)` bơm sự kiện trạng thái.
2. Thêm một `it(...)` gọi `ChannelContractRunner::runDeclared($harness)` — runner tự chạy đúng contract của năng lực kênh đã khai, không khai thì bỏ qua.
3. Thêm năng lực mới = thêm một class trong `Contracts/` + một dòng trong `ChannelContractRunner::CONTRACTS`; không sửa kênh nào.
   Lưu ý cho người viết harness: lõi tự đẩy `SendReplyJob` ngay khi tin đi được tạo (hàng đợi `sync` khi test) nên tin đã có `source_id` trước khi contract kịp gắn đính kèm — dùng `ChannelContract::readyToSend()` để lần gọi driver là tất định.

Chưa làm (ghi rõ): kiểm "mọi năng lực khai báo phải có fixture `tests/Fixtures/channels/<kênh>/<capability>.json`" của §3 — fixture hiện đặt phẳng và đặt tên theo payload (`telegram_photo.json`, `zalo_inbound_sticker.json`), đổi tên hàng loạt sẽ đụng 16 test kênh đang chạy. Đề xuất làm ở lô kênh đầu tiên có đủ fixture (Zalo lô 3).

## 6. Gate đã chạy

| Gate | Lệnh | Kết quả |
|---|---|---|
| Pest contract | `DB_DATABASE=yona_rw_test_caps php artisan test tests/Contracts` | 5 passed / 82 assertions |
| Pest kênh + inbox | `… tests/Feature/Channels tests/Feature/Models/InboxTest.php` | 158/162 passed lúc 02:2x — 4 fail của `ZaloSendTest` (xem §7), đã tự hết ở lượt chạy đầy đủ |
| **Pest toàn bộ** | `DB_DATABASE=yona_rw_test_caps php artisan test --compact` | **2161 passed / 5416 assertions**, 0 fail |
| Pest inbox API | `… tests/Feature/WebApi/Inboxes*Test.php tests/Feature/Platform` | 73 passed |
| vitest | `npx vitest run resources/js/shared/composables/useInboxCapabilities.test.tsx` | 3 passed |
| tsc | `npx tsc --noEmit` | sạch |
| pint | `vendor/bin/pint app/Channels app/Models/Channel app/Models/Inbox.php app/Http/Resources/InboxResource.php tests/Contracts` | đã format, `--test` sạch |
| build | `flock /tmp/yona-build.lock npm run build` | ✓ |
| i18n | không đụng `lang/**` → không cần `i18n:generate --check` | — |

DB test riêng `yona_rw_test_caps` (tạo + dropdb sau khi xong), không đụng `yona_rw`.

## 7. Ngoài phạm vi — chỉ báo, không sửa

1. **`ZaloSendTest` từng đỏ 4 test giữa chừng** (`quét lại mã QR`, `lỗi liên tục`, trần 3 tin/ngày, khung 7h–22h) khi agent `zalo-lo2-driver` đang xoá `app/Services/Zalo/Exception/*` theo quyết định 07/09 "bỏ cửa sổ giờ/trần ngày". Lượt chạy toàn bộ sau đó **xanh hết** (agent kia đã cập nhật xong). Ghi lại để biết cây làm việc đang có agent khác sửa `app/Services/Zalo/**` — đo gate ở đó phải chạy lại, đừng tin số cũ.
2. **Hai file cấu hình test dùng chung phải sửa** để `tests/Contracts` chạy được: `phpunit.xml` (thêm `<testsuite name="Contracts">`) và `tests/Pest.php` (`->in('Feature', 'Contracts')`). Diff tối thiểu, không đổi suite `Feature`.
3. **`SetCurrentAccount` (Inertia props `inboxes`)** chỉ trả `id/name/channel_type` cho sidebar — đúng mục đích icon/nhãn nên chưa thêm `capabilities` (thêm sẽ phải nạp channel cho từng inbox = N+1). Khi FE cần gate ở sidebar thì nên nạp qua `InboxResource`.
4. **Ma trận §4 nên được founder/phiên chính duyệt lại** theo bảng §4.1 mới thêm: 15 ô đang ✓ mà code chưa có. Tôi không sửa ô nào trong bảng gốc, chỉ thêm mục 4.1 bên dưới để giữ nguyên bản chốt.

Status: DONE_WITH_CONCERNS
Summary: Đã dựng đủ lõi contract năng lực kênh (enum + CapabilitySet + interface + khai báo 13 kênh + `Inbox::supports` + `InboxResource.capabilities` + hook/`IfSupports` FE + khung contract test có kênh mẫu Telegram + snapshot ma trận), mọi gate xanh trừ 4 test Zalo thuộc agent khác.
Concerns/Blockers: (1) Ma trận §4 lệch code ở 15 ô — đã ghi §4.1, cần phiên chính duyệt; (2) 3 chỗ FE còn gate theo `channel_type` chưa chuyển được vì sẽ đổi hành vi (MessageMeta ↔ event_delivered/seen là chỗ quan trọng nhất, chờ lô Zalo 4); (3) kiểm fixture-theo-capability của §3 hoãn tới lô kênh đầu tiên.
