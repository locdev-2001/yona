# Lô 2b — Tin nhóm (Q3) · Lời mời kết bạn (Q7) · Luật Lead (Q2) · Bong bóng tin từ điện thoại (5.1)

Agent `zalo-lo2b-driver`, 07/09/2026. Tiếp nối `zalo-lo2-notes.md` (driver), `zalo-lo1b-notes.md` (hợp đồng
bridge), `zalo-lo5-notes.md` (FE đã đọc `sender`/`mentions`, nợ 5.1).
**Không commit, không `git add`.** DB test riêng `yona_rw_test_lo2b` (đã `dropdb`). Không gọi bridge :3710.

## 1. File đã sửa / thêm

| File | Việc |
|---|---|
| `app/Services/Zalo/IncomingMessageService.php` | ngữ cảnh nhóm vào `content_attributes` theo khoá chuẩn; hồ sơ nhóm `zalo_thread_type=group` |
| `app/Services/Zalo/InboundCardParser.php` | `friend_request` thành một "kind" như các thẻ khác; nhắc hẹn nhận thêm `remind_reminder…` |
| `app/Services/Zalo/BridgeEventService.php` | **chỉ** thêm nhánh `friend_request` (+ hàm map payload) |
| `app/Models/Channel/Zalo.php` | **chỉ** 2 dòng `Capability::GroupThreads` + `Capability::FriendRequest` và sửa comment "nợ Q3/Q7" |
| `app/Models/Contact.php` | luật Lead (Q2) |
| `resources/js/dashboard/components-next/message/Message.tsx` | nhánh `externalEcho` + đăng ký bong bóng `friend_request` |
| `resources/js/dashboard/components-next/message/bubbles/FriendRequest.tsx` | **mới** — bong bóng trung tính theo kênh |
| `.../Conversation/ConversationCard/MessagePreview.tsx` | nhãn `[Lời mời kết bạn]` ở thẻ hội thoại |
| `lang/{en,vi}/{conversation,conversations,chat_list}.php` + bundle sinh lại | 5 chuỗi mới |
| `docs/channel-capabilities.md`, `docs/glossary.md` | luật Lead + đóng 2 dòng nợ ở §4.1 |
| `tests/…/ZaloChannelTest.php` (+12 case, đuôi file), `ZaloCapabilitiesTest.php`, `ContactTest.php`, `capability-matrix.snapshot.json` | test khoá |
| `tests/Fixtures/channels/zalo_inbound_group_text.json`, `zalo_friend_request.json`, `zalo_inbound_echo.json` | **mới** (uid/tên giả, không có PII) |

## 2. Đã làm

### 2.1 Tin nhóm (Q3)

| Việc | Cách làm | Test khoá |
|---|---|---|
| `content_attributes.sender / mentions / thread` | `groupContext()` — chỉ chạy khi `thread_type === 1`, và **lọc theo danh sách khoá cho phép** (`external_id/name/avatar`, `id/name/avatar`, `external_id/name/offset/length`). Payload bridge còn `sender_uid`, `thread.type`, `mention.type`… — lõi không cần và không được học tên riêng của nền tảng | `giữ người gửi, nhắc tên và nhóm theo khoá chuẩn của năng lực group_threads`; `bỏ khoá lạ của nền tảng trong ngữ cảnh nhóm thay vì bê nguyên vào lõi`; `không gắn ngữ cảnh nhóm vào chat 1-1` |
| Hồ sơ nhóm = tên + ảnh nhóm | Bridge đã gửi tên/ảnh nhóm ở `user.name`/`user.avatar` (`index.mjs:1875-1884`) nên đường tạo liên hệ có sẵn đã đúng; chỉ thêm dấu `additional_attributes.zalo_thread_type = group` trong `refreshDisplayProfile()` — **một chỗ duy nhất**, phủ cả lúc tạo lẫn lúc làm mới | `gom mọi tin của một nhóm vào MỘT hội thoại mang tên và ảnh nhóm` |
| Nhóm = 1 hội thoại | Không phải sửa gì: `contact_inboxes.source_id` = id nhóm nên mọi người gửi trong nhóm về đúng một `contact_inbox` → một hội thoại. Case khoá lại điều đó (2 tin, 2 người gửi khác nhau → 1 hội thoại, 2 tin) | cùng case trên |
| `isSelf` trong nhóm = tin đi đã dội lại | Đã đúng sẵn qua `direction !== 'in'` ⇒ `TYPE_OUTGOING` + `external_echo`; case khoá để lần sau ai đổi `direction()` thì đỏ ngay | `coi tin của chính tài khoản shop trong nhóm là tin đi đã dội lại` |
| Khai `group_threads` | `Channel\Zalo::capabilities()` + snapshot | `khai báo năng lực nhóm và lời mời kết bạn` |

Số điện thoại: nhánh danh thiếp so `business_card.contact_uid === $threadUid` — với nhóm `$threadUid` là id
nhóm nên **không bao giờ** khớp, tức thiếp gửi trong nhóm không gán số cho hồ sơ nhóm. Đúng ý muốn.

### 2.2 Lời mời kết bạn (Q7)

Không viết đường ghi tin thứ hai. `BridgeEventService::handleFriendRequest()` quy payload
`friend_request` về **đúng hình dạng `inbound`** rồi gọi `IncomingMessageService`, và
`InboundCardParser` nhận `friend_request` như một "kind" thẻ nữa. Nhờ vậy dùng lại nguyên: dedupe theo
`source_id`, tra/tạo liên hệ theo uid, `AvatarFromUrlJob`, nhãn `content` cho card hội thoại/tìm
kiếm/webhook, bong bóng chọn theo khoá `content_attributes`.

- Tạo **Liên hệ nháp** (`contact_type = visitor`) + `contact_inbox` theo uid + hội thoại + tin đến mang
  `content_attributes.friend_request {external_id, message?}`.
- `external_id` luôn có mặt: `friend_request` rỗng thì `filled()` của parser trượt và tin thành vô hình.
- Có lời nhắn ⇒ `content` = lời nhắn; không có ⇒ `content` = `[Lời mời kết bạn]` (đúng quy ước nhãn của
  các thẻ Zalo khác).
- Idempotent theo `source_id` bridge cấp (khoá không phụ thuộc `connection_id` — lô 1b).
- Thiếu `user.uid` ⇒ bỏ qua, không đẻ hồ sơ rác.
- Khai `friend_request` + FE: bong bóng `bubbles/FriendRequest.tsx`, thẻ hội thoại `[Lời mời kết bạn]`.

Test: `lời mời kết bạn dựng Liên hệ nháp + hội thoại, không phải Lead`, `… không có lời nhắn vẫn hiện nhãn
ở card hội thoại`, `bỏ qua lời mời kết bạn gửi lại cùng source_id`, `bỏ qua lời mời kết bạn thiếu uid`.

### 2.3 Luật Lead (Q2) — LỆCH CÓ CHỦ ĐÍCH VỚI CHATWOOT GỐC

`Contact::syncContactAttributes()` bỏ nhánh `socialDetailsPresent()` (xoá hẳn hàm đó):

```php
if (filled($this->email) || filled($this->phone_number)) {   // trước: || $this->socialDetailsPresent()
    $this->contact_type = self::CONTACT_TYPES[self::TYPE_LEAD];
}
```

- Gốc: `app/models/contact.rb#set_contact_type` thăng `lead` khi `additional_attributes` có **bất kỳ** khoá
  `social_*` ⇒ mọi người lạ nhắn vào từ Zalo/FB/IG đều thành Lead ngay từ tin đầu.
- Yona: uid kênh không gọi/gửi thư được nên chưa phải "đã xác nhận nhu cầu" (CLAUDE.md luật #2,
  `docs/channel-capabilities.md` §2.4). Hàm chỉ **NÂNG** hạng, không hạ ⇒ agent bấm chuyển tay vẫn giữ
  nguyên (`contact_type` nằm trong `$fillable`).
- `ContactTest` sửa 1 case (`has contact type lead when contacted through a social channel` →
  `stays visitor when the channel only knows a social id`) và thêm 2 case khoá đường ngược lại:
  số điện thoại đến sau thì thăng Lead; agent đặt tay thì giữ.
- **Rà toàn suite**: 2214 Pest xanh — không nơi nào khác dựa vào luật cũ (đã ngó riêng
  `resolvedContacts(useCrmV2: true)`, báo cáo, import CSV).
- Docs: `docs/glossary.md` (Liên hệ nháp / Lead) + `docs/channel-capabilities.md` §2.4 ghi rõ chỗ lệch.

### 2.4 Bong bóng tin chủ shop gửi từ điện thoại (5.1)

Port nhánh `externalEcho` của `Message.vue` (dòng 182, 475, 516) sang `Message.tsx`:

| Gốc | Port |
|---|---|
| `variant`: `externalEcho ⇒ MESSAGE_VARIANTS.AGENT` (đặt TRƯỚC nhánh `isBot`) | y nguyên, đọc `content_attributes.external_echo` (khoá snake_case của spine) |
| `avatarInfo`: tên/avatar của inbox, thiếu thì `t('CONVERSATION.NATIVE_APP')` | `t('CONVERSATION.NATIVE_APP')` — `Message.tsx` chưa được truyền object inbox (chỉ có `channelType`), ghi là nợ ở §4 |
| `avatarTooltip`: `NATIVE_APP_ADVISORY` | y nguyên |
| — (gốc không có) | thêm nhãn nhỏ **"từ điện thoại"** ở ô `[grid-area:meta]`, chuỗi i18n `CONVERSATION.SENT_FROM_NATIVE_APP`, tooltip vẫn là `NATIVE_APP_ADVISORY` |

`isBotOrAgentMessage` không phải sửa: tin echo không có sender nội bộ nên đã trả `true` ⇒ đứng bên phải.
`status = failed` vẫn thắng (bong bóng lỗi) đúng thứ tự gốc.

Test `ExternalEcho.test.tsx` (8 case): bong bóng `bg-n-solid-blue` chứ không `bg-n-solid-iris`, có nhãn +
tooltip, không còn chữ "Bot", tin đi thường **giữ nguyên** hành vi cũ (case này chính là cái sẽ đỏ nếu ai
nới điều kiện quá tay), tin thất bại vẫn ưu tiên bong bóng lỗi, và 3 case bong bóng/preview lời mời kết bạn.

### 2.5 Nhắc hẹn tới giờ (biến thể 2 của `chat.ecard`)

Đọc thẳng bản ghi thật trong DB dev (tin 804, chỉ SELECT): `act = "remind_reminder11"` — trong khi parser
chỉ nhận tiền tố `create_reminder` ⇒ tin nhắc lúc tới giờ rơi về chuỗi thô `"[Link] ⏰ … .png"`.
`REMINDER_ACT_PREFIX` (chuỗi) đổi thành `REMINDER_ACT_PREFIXES` (danh sách) + `isReminderAct()`; thêm loại
`act` sau này chỉ sửa một hằng số.
Test `tin nhắc hẹn tới giờ về cùng thẻ nhắc hẹn với tin lúc tạo` (dựng từ fixture nhắc hẹn, đổi `act`).

## 3. Bảng trace gốc ↔ port

| Hành vi | Ruby/Vue gốc | PHP/TSX port | Ghi chú |
|---|---|---|---|
| Tin echo hiện như tin agent | `components-next/message/Message.vue:182` (`variant`) | `Message.tsx` `isExternalEcho` + `MESSAGE_VARIANTS.AGENT` | đặt đúng thứ tự: sau `failed`, trước `isBot` |
| Avatar/tooltip tin echo | `Message.vue:475-483, 516-518` | `avatarInfo()` / `avatarTooltip()` | gốc lấy tên inbox, port dùng nhãn chung (nợ §4.1) |
| Bubble theo khoá `content_attributes` | `Message.vue componentToRender` (`whatsappFlowResponse`, `type === 'dyte'`, `imageType`) | `CHANNEL_CARD_BUBBLES` + `friend_request` | rẽ theo KHOÁ, không theo `channel_type` |
| Thăng hạng liên hệ | `app/models/contact.rb#set_contact_type` | `Contact::syncContactAttributes()` | **lệch có chủ đích**, xem §2.3 |
| Kênh tự làm mới hồ sơ trong driver | `services/telegram/incoming_message_service.rb:15,62` | `refreshDisplayProfile()` (+ `zalo_thread_type`) | đúng chỗ gốc cho phép |
| Nhóm | — (Telegram gốc **bỏ qua** chat nhóm ngay ở `IncomingMessageService`) | `groupContext()` | phần ngoài gốc, khoá chuẩn do `docs/channel-capabilities.md` §2.4 đặt |
| Lời mời kết bạn | — (gốc không kênh nào có) | `BridgeEventService::handleFriendRequest()` → `IncomingMessageService` | quy về payload `inbound`, không có đường ghi tin thứ hai |

## 4. Chưa làm / nợ có tên

1. **`Message.tsx` chưa nhận object inbox** nên tin echo dùng nhãn chung `CONVERSATION.NATIVE_APP` thay vì
   tên + avatar hộp thư như gốc. Cần truyền `inbox` (hoặc `inboxName`/`inboxAvatarUrl`) từ `MessageList` —
   đụng prop chain của B3, ngoài phạm vi lô này.
2. **Chưa có `GroupThreadsContract` / `FriendRequestContract`** trong `tests/Contracts/Channels/Contracts/`
   (docs §3 muốn mỗi năng lực một contract dùng chung). Hiện chỉ có test riêng của kênh Zalo khoá hành vi.
   `ChannelHarness`/`ZaloHarness` là file dùng chung với các kênh khác nên không tự thêm — đề xuất một lượt
   riêng dựng 2 contract + harness cho Telegram/LINE cùng chạy.
3. **Chưa nghiệm thu trên dữ liệu thật**: account 3 không có hội thoại nhóm Zalo nào
   (`additional_attributes->>'thread_type' = '1'` ⇒ 0 bản ghi) và không được phép gọi bridge/tạo dữ liệu
   trong inbox 58/59. Tin nhóm, lời mời kết bạn và bong bóng echo mới chỉ có test khoá + fixture theo đúng
   payload bridge lô 1b. Cần phiên QA có quyền chạm dữ liệu bấm thật.
4. **Bridge vẫn gửi song song bản thô `social_event`/`friend_event`** (lô 1b ghi rõ). Chúng rơi vào
   `default => null` của `BridgeEventService` nên vô hại, nhưng nếu sau này bật log `default` thì sẽ ồn.
5. `zalo_thread_type` là khoá mang tên kênh nằm trong `additional_attributes` (theo đúng đặc tả được giao).
   Nếu muốn trung tính hoàn toàn thì nên là `thread_kind` ở chuẩn năng lực §2.4 — cần founder chốt trước khi
   đổi, vì nó là dữ liệu đã ghi.

## 5. Ngoài phạm vi được giao nhưng có đụng (nói rõ để phiên chính duyệt)

1. **`tests/Feature/Channels/ZaloCapabilitiesTest.php`** — case cũ khẳng định `GroupThreads` là `false`
   ("nợ có tên"). Nay đã có đường thực thi nên đảo thành `true` + thêm `FriendRequest`. Không đụng dòng nào
   khác của case đó.
2. **`tests/Contracts/Channels/capability-matrix.snapshot.json`** — snapshot sinh lại bằng
   `UPDATE_CAPABILITY_SNAPSHOT=1` nên **ôm luôn `session_disconnect` của lô 6** (cùng working tree, lô 6
   đang sửa `Channel\Zalo`). Ba dòng thêm: `group_threads`, `friend_request` (của tôi) và
   `session_disconnect` (của lô 6).
3. **`resources/js/i18n/generated/{en,vi}.ts`** — `php artisan i18n:generate` sinh lại toàn bộ bundle nên
   file này cũng ôm chuỗi `inbox_mgmt` mới của lô 6.
4. **`lang/{en,vi}/chat_list.php`** — thêm `FRIEND_REQUEST`. File dùng chung, chỉ thêm 1 khoá + 1 comment.

## 6. Gate

| Gate | Kết quả |
|---|---|
| `DB_DATABASE=yona_rw_test_lo2b php artisan test tests/Feature/Channels tests/Contracts tests/Feature/Models/ContactTest.php` | **233 passed / 831 assertions** |
| `DB_DATABASE=yona_rw_test_lo2b php artisan test` (toàn bộ) | **2214 passed / 5632 assertions** |
| `vendor/bin/pint --test` (app/Services/Zalo, Contact, Channel\Zalo, tests, lang) | passed |
| `npx tsc --noEmit` | 0 lỗi |
| `npx vitest run` (toàn bộ) | **99 file / 787 test** xanh; chạy riêng cụm message + Conversation: 9 file / 77 test |
| `flock /tmp/yona-build.lock npm run build` | xanh, 2 environment |
| `php artisan i18n:generate --check` | "Bundle i18n khớp lang/" |

Dọn dẹp: `dropdb yona_rw_test_lo2b` đã chạy. Không đụng `yona_rw` (chỉ một câu SELECT đọc tin 804), không
gọi/khởi động lại bridge :3710, không commit, không `git add`.

```text
Status: DONE_WITH_CONCERNS
Summary: Xong 5 mục được giao — tin nhóm theo khoá chuẩn `group_threads`, lời mời kết bạn quy về đường
`inbound` có sẵn (Liên hệ nháp + hội thoại + bong bóng + nhãn thẻ), luật Lead chỉ theo SĐT/email (lệch có
chủ đích, đã ghi docs), nhánh externalEcho ở Message.tsx và nhắc hẹn tới giờ; toàn bộ gate xanh (2214 Pest,
787 vitest, tsc, pint, build, i18n --check).
Concerns/Blockers:
1. Ba tính năng mới chỉ có test khoá + fixture, CHƯA bấm được trên dữ liệu thật: account 3 không có hội
   thoại nhóm Zalo nào và tôi không được phép gọi bridge / tạo dữ liệu trong inbox 58/59.
2. Luật Lead là thay đổi LÕI, chạm mọi kênh: người lạ từ Zalo/FB/IG nay ở lại `visitor` cho tới khi có
   SĐT/email. Toàn suite xanh, nhưng đây là thứ founder nên xác nhận bằng mắt trên UI danh sách liên hệ.
3. Snapshot năng lực và bundle i18n sinh lại nên ôm luôn thay đổi của lô 6 (cùng working tree) — xem §5.
4. Chưa có contract test dùng chung cho `group_threads`/`friend_request` (harness là file chung của mọi
   kênh) — §4.2.
```
