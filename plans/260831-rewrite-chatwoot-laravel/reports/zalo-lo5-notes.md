# Lô 5 — UI CHAT & NHẬN DIỆN KÊNH (agent `zalo-lo5-ui`, 07/09/2026)

Nguồn việc: `reports/zalo-deep-audit.md` mục 5.1–5.8, `reports/ux-zalo-main-session-notes.md` (#1, #2, #9,
#11, #12), hợp đồng `reports/zalo-lo3-notes.md` §"Hợp đồng cho Lô 5", `reports/zalo-lo4-notes.md` §2.1–2.5,
`docs/channel-capabilities.md` §3 FE. Mọi lệch có chủ đích đã ghi vào `reports/ux-deviations.md` (9 dòng mới).
Ảnh: `~/www/pixel-diff/ux-lo5/`. **Không commit.**

## 1. Đã làm

| # | Việc | Cách làm | Bằng chứng |
|---|---|---|---|
| 1 | **Icon kênh** ở card hội thoại, header hội thoại, sidebar "Kênh" | Vẽ tay `i-woot-zalo` trong `theme/icons.js` (bong bóng bo góc + chữ Z khoét rỗng, `currentColor`, không tải ảnh ngoài — Iconify không có Zalo). **Gộp hai bảng icon thành một**: `ChannelIcon.tsx` bỏ bản sao `CHANNEL_TYPE_ICON_MAP` và đọc `getInboxIconByType` của `helper/inbox.ts`. Một dòng sửa → card + header + sidebar + campaign + tìm kiếm cùng đổi. `channel_type` chỉ dùng chọn icon/nhãn (được phép), tooltip = tên inbox | `icon-zalo-zoom.png`, `sau-sidebar-kenh.png`, `sau-header-icon-kenh.png`; `ChannelIcon.test.tsx` (5 test) |
| 2 | **Panel phải mở sẵn ≥1280px**, nhớ lựa chọn, <1280px giữ gốc | `conversation/contactPanelVisibility.ts` là nơi DUY NHẤT quyết định: có `ui_settings.is_contact_sidebar_open` (boolean) thì theo người dùng, chưa có thì theo bề rộng khung nhìn (hook nghe `resize`). Dùng ở `ConversationView`, `ConversationSidebar`, `SidepanelSwitch`. Nút mắt-người giờ **đóng/mở hai chiều** (gốc chỉ mở được) | `truoc-1279-panel-dong.png` → `sau-1440-panel-mo-san.png`; `contactPanelVisibility.test.ts` (4 test) |
| 3 | **Panel: bỏ "Không có sẵn"** | `ContactInfoRow` rỗng + sửa được ⇒ nút "+ Thêm email / + Thêm số điện thoại / + Thêm công ty" (bấm là vào thẳng ô nhập); rỗng + không sửa được ⇒ không chiếm dòng. `ContactInfo` khai các dòng bằng MỘT mảng cấu hình (thêm/bớt trường chỉ sửa một chỗ), các nút "Thêm" gom trên một hàng | `sau-panel-phai.png`; khoá 3 chuỗi mới ở `lang/{en,vi}/contact_panel.php` |
| 4 | **"Hội thoại trước" đầy đủ, dễ bấm (Q1)** | Lên vị trí **thứ hai** trong `DEFAULT_CONVERSATION_SIDEBAR_ITEMS_ORDER`; là mục duy nhất **mở sẵn** khi `ui_settings` chưa có khoá; mỗi thẻ hiện **kênh + thời gian + trạng thái** (chấm màu + "Đã được giải quyết"/"Mở"…) qua prop `showStatus` mới của `ConversationCard`; tên kênh hiện cả khi đang lọc theo inbox (hội thoại cũ trải trên mọi inbox — §2.5 `threading_history`) | `sau-panel-phai.png`; `ContactPanel.test.tsx` (2 test viết lại), `previousConversations.test.ts` |
| 5 | **Bỏ Title Case** | Gỡ class `capitalize` ở 3 file đúng như nhận xét #11 | `truoc-card-title-case.png` → `sau-card-icon-kenh.png`; `contactNameCasing.test.ts` khoá cả 3 file |
| 6 | **Nút "Thử lại" + lý do lỗi** | `MessageError.tsx` (port `MessageError.vue`) + `helpers/retry.ts`. Đọc `external_error` **cả hai hình dạng** (chuỗi kênh cũ ↔ `{code,message}`); thêm gợi ý hành động theo `code` (bảng của lô 3, dịch ở `CONVERSATION.MESSAGE_FAILURE.HINT.*`); `secret_mismatch` ⇒ **không** hiện nút (thử lại vô ích); giữ luật gốc ≤24h + phải có nội dung/đính kèm. `api.ts: retryMessage()` → `POST …/messages/{id}/retry`, tin trả về đi qua đúng đường `addMessage` | `MessageError.test.tsx` (11 test) |
| 7 | **Tin nhóm (Q3)** | `helpers/groupSender.ts` đọc khoá chuẩn hoá `content_attributes.sender {external_id,name,avatar}` và `.mentions[]`. `bubbles/Base.tsx` vẽ avatar + tên người gửi (16px) trên nội dung cho bong bóng **bên trái**; `bubbles/Text.tsx` tô đậm `@tên` theo `offset/length` do kênh cấp, lùi về tìm chuỗi khi offset lệch. Không có `sender` ⇒ y như cũ | `GroupSender.test.tsx` (9 test) |
| 8 | **Chuỗi widget tiếng Anh** ("Give the team a way to reach you.", "Get notified by email") | **Không phải thiếu bản dịch** — `lang/vi/conversations.php` đã có. Lỗi ở locale: tin mẫu sinh ngoài request của agent (khách nhắn vào widget / job) nên `App::getLocale()` là mặc định. Sửa ở đúng một chỗ: `BaseTemplate::localizedMessages()` chốt theo `conversation.account.locale` rồi trả locale cũ về — mọi mẫu tin (EmailCollect, CsatSurvey…) cùng hưởng | `TemplateTest.php` +1 test khoá; 22 Pest xanh |
| 9 | **Placeholder ô soạn** | `CONVERSATION.FOOTER.MSG_INPUT` (chỉ `vi`) → "Nhập tin nhắn… (/ để chọn câu trả lời mẫu)"; `en` giữ nguyên chuỗi Chatwoot | `sau-1440-panel-mo-san.png` |
| 10 | **Mục 8 — reaction/recall (lô 4 đã có endpoint)** | `zalo-lo4-notes.md` xuất hiện giữa phiên ⇒ làm luôn. `MessageActions.tsx`: thanh hành động khi rê chuột — nút thả cảm xúc (bộ nhanh ❤️ 👍 😆 😮 😢 😡) gate `outbound_reaction`, nút thu hồi/xoá đổi nhãn theo `outbound_recall` (endpoint `DELETE` là một, lõi tự quyết). Gate qua `inboxSupports`, **không** qua `channel_type`. `api.ts`: `addMessageReaction` / `removeMessageReaction` / `deleteMessage`; handler ở `ConversationContext` | `sau-thanh-hanh-dong-hover.png`; `MessageActions.test.tsx` (8 test) |
| 11 | **Lỗi tìm thấy khi làm mục 10** | Sau lô 4 backend trả `reactions: [{emoji,by,at}]` nhưng `bubbles/Base.tsx` vẫn ép `as string[]` ⇒ hàng emoji in `[object Object]`. `helpers/reactions.ts` đọc phòng thủ cả hình dạng cũ lẫn mới, gom theo emoji + đếm, viền sáng emoji phía tenant, bấm lại là gỡ | test trong `MessageActions.test.tsx` khẳng định hàng emoji là `👍2❤️` |

## 2. Không làm / nợ có tên

1. **5.1 (bong bóng "Bot" tím cho tin gửi từ điện thoại) và 5.2 (bảng tick trạng thái)** — `MessageMeta.tsx` bị loại khỏi phạm vi vì lô 4 đang sửa; `zalo-lo4-notes.md` xác nhận đã sửa quy tắc lùi bậc tick ở đó. Nhánh `externalEcho` của `Message.vue` (variant AGENT + tooltip NATIVE_APP) **chưa ai làm** — cần một lượt riêng trên `Message.tsx` sau khi lô 4 rời file.
2. **5.8 (trích dẫn tin ngoài trang đang tải)** — cần `getPreviousMessages` cửa sổ ±100 như `MessageList.vue:65`, thuộc B9, chưa làm.
3. **5.7 (chuỗi "đã được thu hồi" riêng cho Zalo)** — nội dung do driver sinh (`app/**`), ngoài phạm vi lô này.
4. **Bong bóng "đang nhập…" gate `event_typing`** — lô 4 đề xuất; hiện `MessagesView` vẫn hiện vô điều kiện. Rẻ, nhưng cần đọc `inbox.capabilities` ở `MessagesView` — để lượt sau cùng với mục 1 ở trên.
5. **`notifications/InboxView.tsx`** đọc thẳng `uiSettings.is_contact_sidebar_open` (không qua `contactPanelVisibility`) nên màn "Hộp thư của tôi" **không** hưởng mặc định mở ≥1280px. Ngoài phạm vi được giao — đề xuất đổi 1 dòng sang `useContactPanelOpen` ở lượt sau.
6. **`hasOneDayPassed`** dựng tạm trong `components-next/message/helpers/retry.ts` vì `resources/js/shared/**` ngoài phạm vi. Khi port `shared/helpers/timeHelper.js` đầy đủ thì gọi về đó, xoá bản tạm.
7. **Chưa nghiệm thu trên dữ liệu thật** cho: nút Thử lại (account 3 không có tin `status=failed`, cấm gửi thử trên phiên Zalo thật), tin nhóm (chưa có hội thoại nhóm Zalo), reaction/recall bấm thật (bridge :3710 chờ founder restart theo `zalo-lo4-notes.md`). Ba mục này mới chỉ có test khoá.

## 3. Việc harness pixel phải làm (chỉ ghi, KHÔNG sửa — theo lệnh)

**Tác động lớn nhất:** mọi harness chụp màn hội thoại chạy `viewport.width = 1280` (79+38+30+5 lần trong
`~/www/pixel-diff/*.mjs`) và tài khoản đo `john@acme.inc` có `ui_settings = null` ⇒ **panel phải nay hiện
trong ảnh mà trước không có**. Ba cách xử lý (chọn một, thuộc phiên giữ harness): hạ viewport xuống 1279
cho kịch bản không đo panel · set trước `ui_settings.is_contact_sidebar_open = false` cho user đo · chụp lại
baseline. **Không hạ ngưỡng diff.**

Cùng vùng ảnh (panel phải) còn đổi vì: dòng "Không có sẵn" → nút "+ Thêm …", thứ tự accordion, "Hội thoại
trước" mở sẵn + có trạng thái. Chụp lại baseline một lần là xử lý được cả cụm.

Không đổi: icon của mọi kênh **trừ** Zalo (bảng `ChannelIcon` và `INBOX_ICON_MAP_LINE` vốn trùng nhau từng
dòng; account 2 chỉ có `Channel::Api` + `Channel::WebWidget`, không có Zalo/SMS/Twilio). `g1-zalo-e2e.mjs`
(account 3) cần chụp lại nếu có ảnh sidebar/header. Thanh hành động mới `opacity-0` cho tới khi rê chuột nên
ảnh tĩnh không đổi. Placeholder ô soạn chỉ đổi ở locale `vi` (`g3-i18n-e2e.mjs`).

## 4. Gate

| Gate | Kết quả |
|---|---|
| `npx vitest run` | **98 file / 779 test xanh** (thêm 5 file mới: `MessageError`, `MessageActions`, `GroupSender`, `ChannelIcon`, `contactPanelVisibility`, `contactNameCasing`; sửa `ContactPanel.test.tsx`, `previousConversations.test.ts`) |
| `npx tsc --noEmit` | 0 lỗi |
| `vendor/bin/pint --test` (file PHP đã đụng) | passed |
| Pest `TemplateTest` / `HookExecution` (DB `yona_rw_test_lo5`, đã `DROP`) | 22 + 18 xanh |
| `flock /tmp/yona-build.lock npm run build` | xanh, 2 environment; `i-woot-zalo` có mặt trong CSS đã build |
| `php artisan i18n:generate --check` | "Bundle i18n khớp lang/" |
| Console trình duyệt (account 3, hội thoại #2) | 0 lỗi ứng dụng — chỉ một 409 của `/app/login` là cơ chế đổi phiên bản asset của Inertia sau khi build lại |

## 5. Dọn dẹp

- `ui_settings` của user 3 bị **mượn tạm** (bỏ `is_contact_sidebar_open`/`is_previous_conv_open`) đúng một lần
  để chụp ảnh "trước" ở 1279px, đã **khôi phục nguyên trạng** ngay sau đó (đã đối chiếu JSON trước/sau).
- Không tạo/xoá dữ liệu hội thoại, không gửi tin nào ra Zalo, không chạm inbox 58/59 hay bridge :3710.
- DB test `yona_rw_test_lo5` đã `DROP`. Script chụp ảnh nằm trong `~/www/pixel-diff/ux-lo5/` (thư mục riêng,
  không sửa file dùng chung của `~/www/pixel-diff`).
- Không commit, không `git add`.

```text
Status: DONE_WITH_CONCERNS
Summary: Xong 5.3–5.6 + Q1/Q3/Q8 + chuỗi widget/placeholder, và làm luôn mục 8 (reaction/recall) vì lô 4
đã mở endpoint — nhân đó bắt được lỗi hàng biểu cảm in "[object Object]" sau lô 4. Toàn bộ gate xanh
(779 vitest, tsc, pint, 40 Pest, build, i18n --check).
Concerns/Blockers:
1. 5.1 (nhánh externalEcho — tin gửi từ điện thoại vẫn là bong bóng "Bot" tím) CHƯA ai làm: MessageMeta.tsx
   bị loại khỏi phạm vi cho lô 4, nhưng nhánh này nằm ở Message.tsx và không thuộc lô 4 — cần giao lượt sau.
2. Nút Thử lại, tin nhóm và reaction/recall mới có test khoá, chưa bấm được trên dữ liệu thật (không có tin
   failed, không có hội thoại nhóm, bridge chờ founder restart).
3. Harness pixel sẽ đỏ hàng loạt vì panel phải nay mở sẵn ở viewport 1280 — đã ghi 3 cách xử lý ở §3, cần
   phiên giữ harness quyết định trước khi chạy gate pixel.
```
