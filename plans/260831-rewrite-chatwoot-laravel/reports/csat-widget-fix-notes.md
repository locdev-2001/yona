# CSAT widget — sửa lỗi "reload xong không thấy khối khảo sát" (agent `csat-widget-fix`, 07/09)

Bối cảnh: `reports/c5-csat-widget-evidence.md` báo FAIL bước 7 của `~/www/pixel-diff/c5-widget-e2e.mjs` —
sau khi reload trang nhúng, `.customer-satisfaction` không hiện lại trong 20s.

## 1. Bác bỏ ba giả thuyết ban đầu (bằng payload thật, trước khi sửa)

Ba nghi vấn trong evidence (widget lọc `input_csat`; API không trả `input_csat` cho hội thoại resolved;
`submitted_values` không được serialize) đều **SAI**.

Gọi thẳng API widget bằng token phiên khách của hội thoại 173 (`WidgetTokenService::generate`):

```
GET /api/v1/widget/messages?website_token=PcvLj9tEFUsE4mHutBQN27ut   (X-Auth-Token: <jwt>)
→ payload[3] = { "id":893, "content":"Please rate the conversation", "message_type":3,
                 "content_type":"input_csat",
                 "content_attributes":{ "display_type":"emoji",
                   "submitted_values":{ "csat_survey_response":{ "rating":4, "feedback_message":"phuc vu tot" } } } }
```

- `MessageFinder` (`app/Finders/MessageFinder.php`) chỉ loại `private` + `message_type=2 (activity)` —
  đúng `message_finder.rb`, tin template `input_csat` không bị lọc.
- `WidgetMessageResource` trả nguyên `content_attributes` — `submitted_values` có mặt.
- `resources/js/widget/store/widgetStore.ts` chỉ lọc tin `deleted` (`getNonDeletedMessages`), không đụng content_type.
- `AgentMessage.tsx` + `template/CustomerSatisfaction.tsx` khớp `AgentMessage.vue` / `AgentMessageBubble.vue` /
  `shared/components/CustomerSatisfaction.vue` từng dòng (kể cả `hasRecordedResponse` loại `input_csat`).

→ Không phải lỗi backend, cũng không phải lỗi component CSAT.

## 2. Nguyên nhân gốc thật: đua giữa `toggle-open` và lượt nạp lịch sử tin

`App.vue#registerListeners`, nhánh `toggle-open`:

```js
const shouldShowMessageView =
  ['home'].includes(this.$route.name) && message.isOpen && this.messageCount;
if (shouldShowMessageView) this.router.replace({ name: 'messages' });
```

Tải lại trang nhúng → hash iframe về `/` (màn hình chủ). Khi khách bấm bong bóng, luật trên phải đưa
widget vào thẳng khung chat. Bản gốc nhúng sẵn `window.chatwootWebChannel` vào HTML nên
`fetchOldConversations` chạy rất sớm; bản port phải `POST /api/v1/widget/config` trước rồi mới gửi
`loaded` → SDK mới gửi `config-set` → mới `GET /widget/messages`. Danh sách tin do đó thường về **sau**
sự kiện `toggle-open`, `conversationSizeNow()` đọc phải 0 và widget **kẹt ở màn hình chủ**.

Đo trực tiếp (`~/www/pixel-diff/qa-csat/race3.mjs`, cùng cookie phiên khách, 4 lượt liên tiếp) — TRƯỚC khi sửa:

```
lượt 1: CSAT=1 | GET messages xong 21ms sau lúc bấm bong bóng
lượt 2: CSAT=1 | GET messages xong 44ms
lượt 3: CSAT=0 | GET messages xong 65ms
lượt 4: CSAT=0 | GET messages xong 63ms
```

Lỗi **không cố định** — càng chậm càng hỏng. Đây chính là lý do bước 7 của harness FAIL: harness bấm bong
bóng ngay khi bong bóng xuất hiện nên gần như luôn thua cuộc đua. Khối CSAT vẫn nằm trong DOM lịch sử,
chỉ là widget chưa vào màn hình `messages`.

Hệ quả rộng hơn CSAT: bất kỳ khách quay lại nào cũng có lúc bị ném về màn hình chủ thay vì thấy hội thoại cũ.

## 3. Sửa

`resources/js/widget/App.tsx` — gom luật vào **một chỗ** và chạy lại đúng luật đó khi lịch sử tin nạp xong:

```ts
export const showMessagesWhenConversationExists = (): void => {
    if (!widgetStore.getState().appConfig.isWidgetOpen) return;
    if (currentRoute() !== WIDGET_ROUTES.HOME) return;
    if (!conversationSizeNow()) return;
    replaceRoute(WIDGET_ROUTES.MESSAGES);
};
```

- nhánh `toggle-open` gọi helper thay cho điều kiện viết inline (hành vi giữ nguyên);
- nhánh `config-set`: `fetchOldConversations().then(showMessagesWhenConversationExists)`.

Không đổi backend, không đổi component CSAT. Lệch có chủ đích so với gốc: bản gốc chỉ xét luật ở
`toggle-open`; port xét thêm một lần khi lịch sử về, để bù round-trip `POST /config` mà bản gốc không có.

## 4. Kiểm chứng sau khi sửa

| # | Kịch bản | Kết quả | Bằng chứng |
|---|---|---|---|
| 1 | API widget trả `input_csat` + `submitted_values` sau resolve | PASS | payload ở §1 |
| 2 | Reload **trước** khi chấm → khối CSAT hiện, còn form để chấm | PASS | `qa-csat/repro.mjs` bước 5c: `khối CSAT = 1 | form chấm = 1 | tiêu đề "Please rate the conversation"` |
| 3 | Reload **sau** khi chấm → khối CSAT ở trạng thái đã gửi | PASS | bước 7b/7c: `tiêu đề "Thank you for submitting the rating" | form = 0 | button.selected = 1`, 5 nút `disabled` |
| 4 | Hết đua (8 lượt liên tiếp) | PASS | `race3.mjs` chạy 2 vòng × 4 lượt → `CSAT=1` cả 8, kể cả khi messages về sau 78ms |
| 5 | Harness gốc `c5-widget-e2e.mjs` (không sửa file harness) | bước 7 XANH | `7. reload trang nhúng → khảo sát còn, tiêu đề "Thank you for submitting the rating" | form còn: 0` |

Console/pageerror: 0 lỗi trong mọi lượt chạy.

### Test khoá

- `tests/Feature/Widget/MessagesControllerTest.php` — thêm *"returns the resolved conversation csat message
  with the submitted rating"*: hội thoại resolved + tin `input_csat` có `submitted_values` → `GET /widget/messages`
  trả đủ `content`, `display_type`, `submitted_values`.
- `resources/js/widget/components/AgentMessage.test.tsx` (mới) — 3 test: render trạng thái **chưa chấm**
  (5 nút + form), trạng thái **đã chấm** (tiêu đề SUBMITTED_TITLE, form biến mất, 1 nút `selected`, 5 nút `disabled`),
  và không lặp điểm đã chấm thành bong bóng tin khách (`hasRecordedResponse` loại `input_csat`).
- `resources/js/widget/App.test.tsx` (mới) — 4 test khoá luật điều hướng: chỉ vào `messages` khi
  widget đang mở + đang ở màn hình chủ + đã có tin; ba trường hợp còn lại giữ nguyên màn hình.

### Gate

| Gate | Kết quả |
|---|---|
| `DB_DATABASE=yona_rw_test_csat php artisan test tests/Feature/Widget` | 86 passed / 262 assertions |
| `npx vitest run resources/js/widget` | 7 file, 67 passed |
| `npx tsc --noEmit` | sạch |
| `flock /tmp/yona-build.lock npm run build` | built OK |
| `vendor/bin/pint --test tests/Feature/Widget/MessagesControllerTest.php` | passed |

DB test `yona_rw_test_csat` đã `DROP` sau khi chạy. Không commit.

## 5. Ghi chú cho harness (không phải lỗi app)

`c5-widget-e2e.mjs` bước 8 in `submitted_values: undefined`. Đây là **giới hạn của harness**, không phải lỗi:
`GET /api/v1/accounts/{id}/conversations/{id}` chỉ trả **một tin cuối cùng**, đúng bản gốc
(`app/views/api/v1/conversations/partials/_conversation.json.jbuilder`: `json.messages [ ...messages.last ]`),
mà tin cuối của hội thoại vừa resolve là tin activity. Muốn kiểm `submitted_values` phải đọc DB hoặc
`GET /api/v1/accounts/{id}/conversations/{id}/messages`.

## 6. Dọn dẹp

- Xoá hội thoại **173** (theo yêu cầu) + hai hội thoại do phiên này tạo (**184** = display 156 của `repro.mjs`,
  **185** = display 157 của harness) cùng contact ẩn danh mồ côi 1211/1221/1222 và `contact_inboxes` của chúng.
  `messages` và `csat_survey_responses` liên quan đã sạch (đếm = 0).
- `inbox 25 csat_survey_enabled = false` (harness tự trả lại; đã xác nhận lại bằng tinker).
- **Còn sót, cố ý không đụng:** hội thoại **172** (display 146) — rác của lượt chạy c5 phiên trước, không do
  phiên này tạo; hội thoại **181** (display 155, "alo") của agent khác. Đề xuất phiên chính xoá 172 nếu
  fixture pixel account 2 cần sạch.
- Script QA để lại ở `~/www/pixel-diff/qa-csat/` (`repro.mjs`, `race2.mjs`, `race3.mjs`, `state.json`,
  2 ảnh chụp); không sửa file nào có sẵn trong `~/www/pixel-diff`.

## 7. File đã sửa

- `resources/js/widget/App.tsx`
- `tests/Feature/Widget/MessagesControllerTest.php`
- `resources/js/widget/components/AgentMessage.test.tsx` (mới)
- `resources/js/widget/App.test.tsx` (mới)

```
Status: DONE
Summary: Lỗi không nằm ở API/serializer/component CSAT (đã bác bỏ bằng payload thật) mà ở đua giữa sự kiện `toggle-open` và lượt nạp lịch sử tin trong `resources/js/widget/App.tsx` — tải lại trang thì widget kẹt ở màn hình chủ nên không thấy khối khảo sát; đã gom luật điều hướng về một chỗ và chạy lại khi lịch sử tin về, bước 7 của harness c5 xanh và 8/8 lượt lặp đều ổn định.
Concerns/Blockers: Lệch có chủ đích so với gốc (gốc chỉ xét luật ở `toggle-open`) — cần ghi vào `ux-deviations.md` nếu phiên chính đồng ý. Hội thoại 172 (fixture account 2) là rác của lượt c5 trước, phiên này không tự xoá.
```
