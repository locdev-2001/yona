# G3 — Rà e2e toàn hệ thống sau hardening (agent `g3-e2e`, 07/09/2026)

Môi trường: yona `http://127.0.0.1:8000` (account 2, DB `yona_rw`), oracle Chatwoot
`http://127.0.0.1:3000` (account 1, podman `oracle-rails`). Login `john@acme.inc` / `Password1!`.
Harness chạy TUẦN TỰ (oracle + yona dùng chung state/session), dọn phiên headless sau mỗi lượt,
`reset-fixture.sh` chạy trước mỗi harness nhóm B.


## Nhóm B — e2e hội thoại (18 harness)

| Harness | Kết quả | Thời gian | Ghi chú |
|---|---|---|---|
| `b5-lifecycle-e2e` | ✅ | 28s | resolve/reopen/pending/snooze + phím tắt Alt+E |
| `b5-priority-e2e` | ✅ (sau khi sửa harness) | 22s | xem Lỗi #1 |
| `b5-e2e-full` | ✅ (sau khi sửa harness) | 79s | xem Lỗi #1 |
| `b6-assign-e2e` | ✅ | 30s | gán/gỡ agent + team, activity + F5 |
| `b6-selfassign-e2e` | ✅ | 16s | |
| `b6-bulk-e2e` | ✅ | 14s | |
| `b6-bulk-e2e2` | ✅ | 21s | |
| `b7-labels-e2e` | ✅ | 45s | |
| `b7-conv-labels-e2e` | ✅ | 35s | |
| `b79-e2e-full` | ✅ | 37s | gửi ảnh + PDF, nhãn, F5 |
| `b8-unread-e2e` | ✅ | 30s | |
| `b8-tabcount-e2e` | ✅ | 22s | |
| `b9-attachments-e2e` | ✅ (sau khi sửa harness) | 30s | xem Lỗi #2 |
| `b10-editor-e2e` | ✅ (sau khi dọn dữ liệu QA) | 58s | xem Lỗi #3 |
| `b11-finish-e2e` | ✅ | 32s | |
| `b11-finish-e2e2` | ✅ (sau khi sửa harness) | 26s | cùng nguyên nhân Lỗi #2 |
| `b11-merge-e2e` | ✅ (dựng fixture rồi chạy) | 19s | xem Lỗi #4 |
| `b11-participants-e2e` | ✅ | 25s | |

## Lỗi tìm thấy trong đợt rà

### Lỗi #1 — `b5-priority-e2e` / `b5-e2e-full` bám vào dropdown sai (LỖI HARNESS)
- **Triệu chứng:** `locator('li.dropdown-menu__item button').filter({hasText:/^Urgent$/})` và
  `locator('button:has-text("None")').last()` timeout.
- **Nguyên nhân gốc:** khối *Conversation Actions* có BA `MultiselectDropdown` cùng dạng
  `button:has(h4)` theo thứ tự Assignee → Team → Priority
  (`resources/js/dashboard/conversation/conversationbox/contact/ConversationAction.tsx`).
  Hai harness bám theo `.first()` / theo chữ "None", chỉ đúng khi hội thoại chưa có agent.
  Inbox `api-test` bật `enable_auto_assignment` + assignment **V2** (giống hệt oracle:
  `{"auto":true,"v2":true}` ở cả hai bên) nên `AssignmentJob` chạy bất đồng bộ sau mỗi lần đổi
  trạng thái và gán agent — chạy sau `reset-fixture.sh`, làm hai harness lệch mục tiêu.
- **KHÔNG phải lỗi app:** chạy lại với locator theo vị trí, dropdown Priority hoạt động đúng
  (`options = [None, Urgent, High, Medium, Low]`, toast "Changed priority of conversation id 4 to Urgent",
  đổi về None sạch icon).
- **Sửa harness:** `b5-priority-e2e.mjs` + `b5-e2e-full.mjs` — chọn section theo
  `h5:text-is("Conversation Actions")` rồi lấy `button:has(h4)` **nth(2)**; `b5-e2e-full` còn tự mở
  accordion khi chưa đủ 3 dropdown, và đọc nhãn priority từ đúng nút thay vì quét toàn trang.

### Lỗi #2 — harness trỏ vào thư mục tạm của phiên đã chết (LỖI HARNESS)
- `b9-attachments-e2e.mjs`, `b9-attachments-diff.mjs`, `b11-finish-e2e2.mjs` đọc tệp mẫu từ
  `/tmp/claude-1000/.../fa315d62-.../scratchpad` (scratchpad của một phiên cũ) → `ENOENT`.
- **Sửa harness:** sinh ảnh PNG + PDF tối giản ngay trong `pixel-diff/shots/` (mẫu đã có ở
  `b79-e2e-full.mjs`), không phụ thuộc phiên khác.

### Lỗi #3 — `b10-editor-e2e` chết vì dữ liệu QA còn sót (DỌN DỮ LIỆU)
- Hai canned response `b10probe` / `a10probe` của phiên B10 cũ còn trong `yona_rw` (oracle sạch).
  Harness tạo lại `b10probe` → trùng `short_code` → modal không đóng, `modal-mask` chặn click.
- **Xử lý:** xoá 2 bản ghi thừa (không phải fixture chuẩn — `reset-fixture.sh` không đụng tới chúng,
  oracle không có bản tương ứng). Chạy lại: xanh.

### Lỗi #4 — `b11-merge-e2e` cần fixture ngoài (LỖI HARNESS/QUY TRÌNH)
- Harness mặc định `CONV=16`, `TARGET='B11 Merge Base'` — cặp liên hệ đó đã bị phiên B11 dọn đi,
  nên chỉ còn 404. Đợt này dựng lại cặp liên hệ tạm (`B11 Merge Base` / `B11 Merge Dup`) + hội thoại,
  chạy với `CONV=<display_id>`, rồi xoá sạch.

## Nhóm C → G — e2e còn lại (28 harness)

| Harness | Kết quả | Thời gian | Ghi chú |
|---|---|---|---|
| `c1-website-e2e` | ⚠️ xem Lỗi #5 | 41–64s | wizard tới bước Add agents thì kẹt bộ chọn agent |
| `c2-widget-e2e` | ✅ (sau khi sửa harness) | 53s | xem Lỗi #6 |
| `c2-widget-sdk-e2e` | ✅ | 12s | |
| `c3-prechat-e2e` | ✅ (sau khi sửa harness) | 82s | xem Lỗi #7 |
| `c3-setuser-e2e` | ✅ | 8s | HMAC `set_user` |
| `c4-campaign-e2e` | ✅ (truyền đúng tên inbox) | 70s | xem Lỗi #8 |
| `c4-snooze-e2e` | ✅ | 23s | phụ thuộc campaign của harness trên |
| `c5-settings-e2e` | ✅ (sau khi sửa harness) | 18s | xem Lỗi #9 |
| `c5-widget-e2e` | ⚠️ xem Lỗi #10 | 39s | backend đã kiểm: tin `input_csat` được tạo |
| `d1-e2e` | ✅ | 26s | automation rule end-to-end |
| `d3-macros-e2e` | ✅ | 75s | |
| `d4-bots-e2e` | ⚠️ 13/18 bước | 71s | xem Lỗi #11 |
| `d4-bot-handoff-e2e` | ⚠️ phụ thuộc bot của harness trên | 1s | cần bot `Bot Trợ Lý QA` tồn tại |
| `d5-e2e` | ✅ | 48s | thông báo realtime |
| `d6-out-of-office-e2e` | ✅ | 24s | |
| `e1-attributes-e2e` | ✅ (sau khi sửa harness) | 145s | 24/24; xem Lỗi #12 |
| `e2-search-e2e` | ✅ | 18s | |
| `e3-contacts-e2e` | ✅ | 190s | import CSV 100 dòng + bulk + export |
| `e4-helpcenter-e2e` | ✅ | 81s | |
| `f1-email-e2e` | ✅ | 297s | GreenMail (podman) dựng trong đợt này |
| `f2f5-channels-e2e` | ✅ | 133s | 16/16 sau khi chạy lại; xem Lỗi #13 |
| `f6-dashboard-apps-e2e` | ✅ | 41s | lần đầu 14/18 do nhiễu trạng thái, chạy lại xanh |
| `f7-e2e` | ✅ | 36s | platform API + super admin |
| `f8-mfa-e2e` | ✅ | 141s | bật/tắt 2FA, mã dự phòng, thu hồi phiên |
| `g1-zalo-e2e` | ⛔ BỊ CHẶN | 0s | cổng 3710 đang bị `services/zalo-bridge` của **phiên Claude khác** giữ (PID cha = claude-desktop). Không tự tắt tiến trình của phiên khác. |
| `g3-i18n-e2e` | ✅ (tạo lại user test) | 63s | xem Lỗi #14 |
| `b5-e2e-full` (chạy lại) | ✅ | 79s | |
| `b11-merge-e2e` (kèm fixture) | ✅ | 19s | |

### Lỗi #5 — `c1-website-e2e` kẹt ở bước Add agents (LỖI HARNESS)
- Bộ chọn agent là `TagInput` (`components-next/taginput/TagInput.tsx`) đổ danh sách qua
  `DropdownMenu`, item render thành `li.n-dropdown-item > button`. Harness bám selector Vue cũ
  (`.multiselect__tags`) rồi `.catch(() => {})` nên lỗi bị nuốt, mãi sau mới vỡ ở màn Voilà.
- **Sửa harness:** dùng đúng cách `f2f5-channels-e2e.mjs` đang làm (`button` có chữ `JJohn` — avatar + tên).
- **KHÔNG phải lỗi app:** cùng bước này trong `f2f5-channels-e2e` chạy xanh cho Telegram và LINE.

### Lỗi #6 — `c2-widget-e2e` chờ lời chào cố định (LỖI HARNESS)
- Harness chờ `text=Hi there!`, nhưng inbox 25 (fixture founder) đặt lời chào `Hello guy!`.
- **Sửa harness:** chờ `.header-expanded h2` (bất kể nội dung), nội dung thật vẫn ghi ở `results.home.greeting`.

### Lỗi #7 — `c3-prechat-e2e` giả định form tiền chat đang bật (LỖI HARNESS)
- Bảng trường CHỈ render khi công tắc "Enable pre chat form" bật, và ô nhãn `disabled` khi trường tắt —
  **đúng bản gốc** (`PreChatForm/Settings.vue` `v-if="preChatFormEnabled"`, `:disabled="!item['enabled']"`).
  Fixture dev để tắt → harness timeout.
- **Sửa harness:** bật công tắc + bật mọi trường rồi Update trước khi sửa nhãn.
- **Dọn:** trả `pre_chat_form_enabled=false` và chỉ `emailAddress` bật như trước.

### Lỗi #8 — `c4-campaign-e2e` thiếu tham số tên inbox (LỖI HARNESS/QUY TRÌNH)
- Mặc định tìm inbox tên `c4-widget` (đã xoá). Chạy `node c4-campaign-e2e.mjs <token> Yona` → xanh,
  và `c4-snooze-e2e` xanh theo.

### Lỗi #9 — `c5-settings-e2e` giả định CSAT bật + có nhãn tên `vip` (LỖI HARNESS)
- Khối cấu hình CSAT chỉ bung khi công tắc bật (đúng bản gốc); fixture dev tắt.
- Dropdown nhãn render `li.n-dropdown-item button`, không phải `li.dropdown-menu__item`.
- **Sửa harness:** bật công tắc trước; chọn **nhãn đầu tiên có trong danh sách** thay vì tên cố định.

### Lỗi #11 — `d4-bots-e2e` 5 bước đỏ (LỖI HARNESS, đã kiểm chứng backend)
- `POST/PUT/POST set_agent_bot (gỡ)` báo `[]` = cửa sổ bắt request của harness quá hẹp, trong khi
  các bước đọc kết quả ("bot hiện trong danh sách", "mô tả đã lưu", "inbox không còn bot") đều xanh.
- "hiện màn access token": API **có** trả `access_token`. Kiểm bằng cách dựng resource thật:
  `AgentBotResource` trả `access_token` dài 24 ký tự cho admin (`AccessToken::booted` sinh token khi tạo bot).
  → phần đỏ nằm ở selector/thời điểm đọc của harness.
- **URL bot:** harness dùng `http://localhost:9999/bot` — validator URL mới (mục 8 của G3, port regex
  vuelidate) **từ chối localhost** nên nút Submit không bao giờ bật. Đã đổi sang
  `https://bot.example.com/webhook` (lý do: khác biệt cố ý của G3, không phải lỗi app).

### Lỗi #12 — `e1-attributes-e2e` đọc trang folder/segment quá sớm (LỖI HARNESS)
- Sau khi lưu, FE gọi `window.location.assign(...)` (`ChatList.tsx`) → tải lại trang thật.
  Harness chỉ `waitForTimeout(2500)` nên có lần đọc trước khi trang tải xong; mỗi lần chạy hỏng
  một bước khác nhau (15/16 hoặc 22), còn bước sau F5 luôn xanh → đúng dấu hiệu đua thời gian.
- **Sửa harness:** thêm `waitForLoadState('networkidle')` ngay sau `waitForURL`. Chạy lại **24/24 xanh**.

### Lỗi #13 — `f2f5-channels-e2e` (LINE) — nhiễu thời gian, KHÔNG phải lỗi app
- Hai lần chạy đầu báo `line: màn Voilà hiện URL webhook để khai báo` đỏ. Kiểm chứng backend:
  `InboxResource.callback_webhook_url` trả đúng `.../webhooks/line/<line_channel_id>`
  (dựng inbox LINE thật trong tinker rồi xoá). Lần chạy thứ ba **16/16 xanh** → nhiễu thời gian.

### Lỗi #14 — `g3-i18n-e2e` thiếu user test (DỮ LIỆU)
- Harness đăng nhập bằng `g3vi@acme.inc` — user này đã bị phiên trước xoá.
- Tạo lại user (member account 2), chạy xanh: 4 màn (profile/conversations/contacts/reports)
  đều `lang=vi`, không còn key thô. **Xoá lại user sau khi chạy.**

### Lỗi #10 — `c5-widget-e2e`: khảo sát CSAT không hiện trong widget (CHƯA KẾT LUẬN)
- Backend ĐÚNG: sau khi agent resolve, hội thoại widget (display 143) có tin
  `content_type = 9 (input_csat)`, nội dung "Please rate the conversation"; `canReply = true`.
- Widget không render `.customer-satisfaction` trong 20s → phần còn lại nằm ở lớp widget
  (hoặc harness không chờ đúng sự kiện realtime). **Cần một phiên soi riêng lớp widget.**
- Điều kiện chạy: inbox phải bật CSAT trước (fixture dev tắt) — đợt này bật tạm rồi trả lại.

## Harness đã sửa (và lý do)

| Harness | Sửa gì | Lý do |
|---|---|---|
| `b5-priority-e2e.mjs` | chọn section theo `h5:text-is("Conversation Actions")`, lấy dropdown **nth(2)** | 3 dropdown cùng dạng; auto-assignment V2 có thể đã gán agent |
| `b5-e2e-full.mjs` | như trên + tự mở accordion + đọc nhãn priority từ đúng nút | như trên |
| `b9-attachments-e2e.mjs`, `b9-attachments-diff.mjs`, `b11-finish-e2e2.mjs` | sinh ảnh/PDF mẫu trong `pixel-diff/shots/` | đường dẫn cũ trỏ scratchpad của phiên đã chết |
| `c1-website-e2e.mjs` | bước Add agents dùng cách của `f2f5` (`button` chữ `JJohn`) | selector Vue cũ (`.multiselect__tags`) không còn |
| `c2-widget-e2e.mjs` | chờ `.header-expanded h2` thay vì `text=Hi there!` | fixture dev đổi lời chào |
| `c3-prechat-e2e.mjs` | bật "Enable pre chat form" + bật mọi trường rồi Update trước khi sửa | bảng/ô nhãn chỉ hiện/bật khi form bật — đúng bản gốc |
| `c5-settings-e2e.mjs` | bật công tắc CSAT; chọn nhãn ĐẦU TIÊN (`li.n-dropdown-item button`) | khối cấu hình ẩn khi tắt; fixture không có nhãn tên `vip` |
| `d4-bots-e2e.mjs` | URL bot → `https://bot.example.com/webhook` | validator URL của G3 (regex vuelidate) từ chối `localhost` |
| `e1-attributes-e2e.mjs` | thêm `waitForLoadState('networkidle')` sau khi lưu folder/segment | FE dùng `location.assign` → tải lại trang thật |
| `c4-campaign-e2e.mjs` | (không sửa file) chạy kèm tham số tên inbox `Yona` | inbox `c4-widget` mặc định đã bị xoá |

## Pixel hồi quy (mẫu quanh vùng G3 đụng tới)

| Cảnh | Kết quả | Ghi chú |
|---|---|---|
| `b6-assign-diff agent-open` | **0,000%** | dropdown agent trong Conversation Actions |
| `b6-bulk-diff` — `b6-bar` | **0,000%** | trước đây 0,205%; hết lệch sau khi xoá nhãn QA thừa `b79-kiemthu` |
| `b6-bulk-diff` — menu agent / team / status | **0,000% / 0,000% / 0,000%** | trước đây 0,013% |
| `b5-lifecycle-diff dropdown` | 0,363% light / 0,361% dark | **KHÔNG phải hồi quy:** ảnh diff cho thấy toàn bộ lệch nằm ở nhóm Labels trong sidebar trái (yona có 2 nhãn tiếng Việt fixture, oracle không) — bản thân dropdown Snooze/Mark as pending trùng khít |
| `conversations-ui all` | 1,388% light / 0,776% dark | lệch gồm (a) nhóm Labels sidebar như trên, (b) thẻ hội thoại + khối rỗng lệch dọc ~15–50px. **Chưa quy được cho G3** — không có số nền của cảnh này trong các note trước; cần một lần đo có baseline |
| `d1-automation-ui actions-menu` | ⚠️ không chạy được | `waitForURL` sau đăng nhập timeout ở trạng thái `load` (điều hướng tới `/dashboard` đã xảy ra, `domcontentloaded` đã bắn). Chạy lại một mình để xác nhận |
| `contacts-ui dialog` | ⚠️ không chạy được | harness dò nút ⋮ theo toạ độ của thẻ "Trang Nguyen"; danh sách liên hệ đổi sau khi dọn dữ liệu QA |

## Dọn dẹp

| Việc | Trạng thái |
|---|---|
| `reset-fixture.sh` cuối đợt | ✅ yona `{58,4,109}` · 5 tin · oracle `{1}` · 5 tin |
| Inbox 25 "Yona" | ✅ trả về `csat_survey_enabled=false`, `csat_config={}`, `pre_chat_form_enabled=false`, chỉ `emailAddress` bật |
| Inbox QA thừa (`QA line probe` 74, `c1-website` 76/79/80) | ✅ xoá cùng channel + contact_inbox |
| Hội thoại widget QA (8 cái: 132,133,138,139,140,143,144,145) + contact mồ côi | ✅ xoá; còn đúng 4/58/109 |
| Canned response `b10probe`/`a10probe` | ✅ xoá (oracle vốn không có) |
| Nhãn `b79-kiemthu` | ✅ xoá (fixture chuẩn chỉ còn "Khách mới"/"Khách sộp") |
| Campaign `c4 e2e pricing` | ✅ xoá |
| Cặp liên hệ `B11 Merge Base`/`B11 Merge Dup` + hội thoại 131 | ✅ xoá |
| User test `g3vi@acme.inc` | ✅ xoá (kèm account_user + phiên) |
| Phiên đăng nhập headless | ✅ `user_sessions` = 0 |
| Container GreenMail (dựng cho F1) | ✅ `podman rm -f greenmail` |
| Oracle | ✅ chỉ còn `api-test` + hội thoại 1, 0 nhãn, 0 canned, 0 bot, 0 campaign |
| DB test Pest | ⛔ không dùng đợt này (không chạy Pest — chỉ e2e trình duyệt) |
| File repo | chỉ thêm note này; **không sửa file app nào** (77 file đang `M` trong worktree là của phiên khác) |

## Không sửa — và căn cứ

1. **Auto-assignment V2 gán agent sau `reset-fixture.sh`** — không phải lỗi: inbox `api-test` bật
   `enable_auto_assignment` + V2 ở **cả hai bên** (`{"auto":true,"v2":true}`), đúng
   `AutoAssignmentHandler` port từ gốc. Chỉ harness cần locator bền hơn.
2. **Validator URL từ chối `localhost`** — khác biệt cố ý của G3 (mục 8), bám regex `url` của vuelidate.
   Harness phải dùng tên miền hợp lệ; đã sửa `d4-bots-e2e`.
3. **Bảng pre-chat / khối CSAT ẩn khi công tắc tắt** — đúng bản gốc (`v-if` trong `Settings.vue`,
   `PreChatFields.vue` `:disabled="!item['enabled']"`), không đổi code.
4. **Hai nhãn tiếng Việt trong sidebar làm lệch pixel cảnh so nguyên màn** — fixture cố ý giữ
   (mục 11 của `g3-hardening-notes.md`); cách đúng là cắt hộp/mask, không xoá nhãn.
5. **`g1-zalo-e2e`** — không chạy được vì cổng 3710 do tiến trình `services/zalo-bridge/src/index.mjs`
   của **phiên Claude khác** (PPID = claude-desktop) đang giữ. **Không tắt tiến trình của phiên khác.**
   Cần chạy lại khi cổng rảnh.
6. **`c5-widget-e2e`** — backend đã kiểm đúng (tin `input_csat` được tạo khi resolve); phần widget
   chưa kết luận, cần phiên soi riêng. Lưu ý điều kiện chạy: inbox phải bật CSAT **và** `csat_config`
   không có luật nhãn (luật nhãn `survey_rules.values` sẽ chặn khảo sát — đúng bản gốc).
7. **`d4-bot-handoff-e2e`** — phụ thuộc bot `Bot Trợ Lý QA` do `d4-bots-e2e` tạo rồi tự xoá;
   cần chạy nối tiếp hoặc seed bot trước.

## Chưa làm trong đợt này

- **`audit-buttons.mjs`** — bấm thử được 4 nút trên màn hội thoại (đều phản ứng) rồi phải dừng:
  harness tải lại trang giữa mỗi nút nên một màn ~30 nút cần ~30 phút, vượt hạn 600s của trình chạy.
  Cần chạy riêng với timeout dài hoặc sửa harness bỏ reload giữa các nút không phá trạng thái.
- **Bộ pixel `*-ui.mjs` / `*-diff.mjs` đầy đủ** — chỉ chạy 6 cảnh quanh vùng G3 đụng tới (bảng trên).
  Phần lớn cảnh còn lại cần dựng fixture đối xứng hai bên (inbox/nhãn/bot/portal), là một đợt riêng.
- **Pest** — không chạy (đợt này chỉ e2e trình duyệt); `g3-hardening-notes.md` đã ghi 2075 pass cho lần trước.

## Trạng thái cuối

- **Yona:** hội thoại `{4, 58, 109}` · conv 4 sạch (open, không assignee/priority/nhãn) ·
  inbox `api-test` + `Yona` · nhãn `Khách mới`/`Khách sộp` · 0 canned · `user_sessions` = 1 (phiên người dùng thật).
- **Oracle:** hội thoại `{1}` · 5 tin · không còn dữ liệu QA.
