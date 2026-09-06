# Tên khách vô danh dễ thương (quyết định founder 07/09, `ux-brief.md` mục 1)

Trạng thái: hoàn tất, chưa commit. Nhánh `rewrite/chatwoot-laravel`, DB dev `yona_rw`.

## 1. Nguyên nhân & quyết định

Chatwoot dựng tên cho khách chưa khai danh tính bằng gem Haikunator, đúng **một** chỗ:
`refs/chatwoot/app/builders/contact_inbox_with_contact_builder.rb:63`
→ `name = contact_attributes[:name] || ::Haikunator.haikunate(1000)` → `"odd-wave-872"`.

Ba vấn đề với tên đó trong sản phẩm tiếng Việt:

1. **Không đọc được.** Người trực nhìn danh sách hội thoại thấy `fancy-sky-689`, `odd-wave-872` —
   không phân biệt được bằng mắt, không nhớ được, không nói ra miệng được với đồng nghiệp.
2. **Avatar chữ cái vô nghĩa.** `getInitials()` (FE) tách theo khoảng trắng; tên haikunator không có
   khoảng trắng nên ra đúng 1 chữ `F`, `O` — mọi khách vô danh trông giống nhau.
3. **Lỗi tên rỗng đi kèm.** Trong Ruby `''` là truthy, nên tên rỗng do kênh gửi lên **không** rơi vào
   nhánh Haikunator mà được lưu thẳng → liên hệ không tên, avatar trống. Đường đi có thật trong port:
   `Telegram/IncomingMessageService.php:87` ghép `trim(first_name.' '.last_name)` ra `''`;
   `Zalo/IncomingMessageService.php:153` và `Line/IncomingMessageService.php:51` dùng `?? null` nên
   không chặn `''`.

Quyết định: thay bằng `"<con vật> ẩn danh"` (locale `vi`) / `"Anonymous <animal>"` (locale `en`),
sinh **một lần** và lưu thẳng vào `contacts.name` (ổn định theo contact, không sinh lại mỗi lần render).

## 2. Kiến trúc — một cửa duy nhất

| Lớp | File | Vai trò |
|---|---|---|
| Chữ | `lang/en/contacts.php`, `lang/vi/contacts.php` khoá `anonymous` | **Nguồn chữ duy nhất**: `name`, `name_numbered`, `animals` (89 phần tử, chỉ mục khớp 1-1 giữa 2 locale). Theo luật i18n single-source: không có bảng chữ nào nằm trong PHP class |
| Sinh tên | `app/Support/AnonymousName.php` | `AnonymousName::forAccount($account)` — chọn locale theo `Account::$locale`, chống trùng trong phạm vi account, hậu tố số khi cạn |
| Cửa vào | `app/Builders/ContactInboxWithContactBuilder.php::contactName()` | **Chỗ duy nhất** gọi `AnonymousName` |
| Dữ liệu cũ | `app/Console/Commands/RenameAnonymousContacts.php` | `contacts:rename-anonymous [--account=] [--dry-run]` |
| Đã xoá | `app/Support/Haikunator.php` | — |

**Bằng chứng "một cửa":** `grep -rn "Contact::create\|contacts()->create" app/` cho đúng 2 kết quả —
`ContactInboxWithContactBuilder.php:84` (mọi kênh: widget, API, Telegram, Zalo, LINE, SMS, email…) và
`WebApi/ContactsController.php:201` (nhân viên tự thêm liên hệ qua form, không phải khách vô danh).
Widget đi qua đúng builder đó: `Widget/ConfigsController.php::buildContactInbox()`.
`grep -rniE "haikunat|odd-wave"` ngoài `vendor/`, `node_modules/`, `refs/` chỉ còn **văn bản mô tả**
(comment giải thích cái cũ, tên helper trong test, dòng trace) — không còn tham chiếu mã nào.

Điểm khác gốc thứ hai, cố ý: `contactName()` dùng `blank()` thay vì `||` của Ruby, nên tên rỗng /
toàn khoảng trắng cũng rơi về tên ẩn danh. Sửa đúng một chỗ, mọi kênh hưởng.

## 3. Rà chất lượng danh sách tên

| Yêu cầu | Kết quả |
|---|---|
| ≥ 80 con vật/sinh vật | **89** mỗi locale (`en` 89, `vi` 89, số lượng khớp nhau) |
| Tiếng Việt có dấu | Đạt. Phần tử duy nhất không dấu là `Voi` — đúng chính tả, không phải thiếu dấu |
| Không trùng nghĩa | `array_unique` = 89/89 ở cả hai locale. Cặp duy nhất còn sát nghĩa: `Sếu đầu đỏ` / `Hạc trắng` (đều là hạc) — giữ vì người Việt đọc ra hai hình ảnh khác nhau |
| Không từ nhạy cảm | Đạt, và danh sách **chủ động né** đúng những từ dễ thành xúc phạm/tục trong tiếng Việt: không có `bướm`, `chim` (chỉ dùng ghép `Chim ruồi`/`Chim cánh cụt`), `dê`, `gà`, `chó` (dùng `Cún con`), `lợn/heo`, `khỉ`, `trâu/bò`, `chuột` trần (chỉ `Chuột lang`/`Chuột túi`) |
| Dễ thương | Đa số đạt. Vài mục thiên "sinh vật" hơn "dễ thương" (`Nhím biển`, `Bọ ngựa`, `Kiến vàng`, `San hô`, `Hải quỳ`) — brief cho phép "con vật/**thực thể** dễ thương", và không mục nào mang nghĩa xấu |
| Tên dài nhất | `Lạc đà không bướu ẩn danh` (25 ký tự) — vẫn vừa một dòng danh sách hội thoại ở 1440px |

Không sửa danh sách: 89 mục đã đạt và vượt mọi tiêu chí, sửa thêm chỉ là khẩu vị.

## 4. Test

| File | Nội dung khoá |
|---|---|
| `tests/Feature/Support/AnonymousNameTest.php` (8 test) | dạng tên theo locale `vi` / `en`; locale rỗng → fallback; không trùng cho tới khi cạn 89 tên; hậu tố `2` khi cạn; phạm vi chống trùng **chỉ trong account mình**; danh sách ≥80, không trùng, hai locale cùng số lượng; tên luôn bắt đầu bằng chữ hoa để avatar chữ cái có nghĩa |
| `tests/Feature/Console/RenameAnonymousContactsTest.php` | đổi tên đúng mẫu haikunator; **không đụng** tên không khớp mẫu; `--dry-run` không ghi; `--account=` giới hạn phạm vi; chạy lại lần hai = 0 (idempotent) |
| `tests/Feature/Builders/ContactInboxWithContactBuilderTest.php` | tên rỗng/khoảng trắng → tên ẩn danh (lệch cố ý so với Ruby) |

## 5. Gate

| Gate | Kết quả |
|---|---|
| `vendor/bin/pint --test` | `passed` |
| Pest lọc `Anonymous\|RenameAnonymous\|ContactInbox\|Contact` (DB riêng `yona_rw_test_names`) | **235/235 pass**, 560 assertion |
| Pest **toàn bộ** suite trên DB riêng | **2127/2127 pass**, 5214 assertion, 206s |
| `php artisan i18n:generate --check` | `Bundle i18n khớp lang/` |
| Dọn | `DROP DATABASE yona_rw_test_names` đã chạy |

Ghi chú: bundle FE (`resources/js/i18n/generated/{en,vi}.ts`) có chứa 89 chuỗi `animals` dù FE không
dùng (≈2 KB/locale). Đây là hệ quả của luật "lang/ là nguồn i18n duy nhất, generator chép cả file" —
chấp nhận, không đục lỗ ngoại lệ cho generator.

## 6. Backfill trên `yona_rw`

```
php artisan contacts:rename-anonymous --dry-run   # 9 contact, toàn bộ ở account 2
php artisan contacts:rename-anonymous             # Đã đổi tên 9 contact
```

| Trước | Sau (account 2, locale `en`) |
|---|---|
| `muddy-bread-860` (#103) | `Anonymous Blue Whale` |
| `noisy-pine-960` (#104) | `Anonymous Brown Bear` |
| `flat-feather-801` (#1060) | `Anonymous Red-crowned Crane` |
| `restless-sky-380` (#1063) | `Anonymous Skylark` |
| `delicate-unit-774` (#1065) | `Anonymous Elephant` |
| `fragrant-leaf-214` (#1183) | `Anonymous Snail` |
| `steep-dawn-806` (#1190) | `Anonymous Sloth` |
| `solitary-shadow-912` (#1193) | `Anonymous Kangaroo` |
| `lucky-dream-660` (#1199) | `Anonymous Pufferfish` |

Kiểm sau khi chạy:

- `SELECT count(*) FROM contacts WHERE name ~ '^[a-z]+-[a-z]+-[0-9]+$'` → **0**
- Chạy lại `--dry-run` → **0 contact** (idempotent, đúng thiết kế)
- An toàn với phiên song song: cả 9 liên hệ đều **0 hội thoại**, **không** email/SĐT/identifier nên
  không lọt vào `resolvedContacts` (trang Liên hệ) và không xuất hiện ở danh sách hội thoại.
  `grep -riE 'haiku|muddy-bread|noisy-pine|flat-feather|restless-sky|delicate-unit|fragrant-leaf|steep-dawn|solitary-shadow|lucky-dream' ~/www/pixel-diff` = **0** → không harness nào tham chiếu.

## 7. Kiểm trên trình duyệt (Playwright headless, account 3, locale `vi`)

Account 3 **không sẵn** khách vô danh nào (chỉ có 1 liên hệ `Phước Lộc` từ Zalo, và 2 inbox Zalo
58/59 của phiên chính — không được đụng). Nên dựng khách thật rồi dọn:

1. `make-guests.mjs` — đăng nhập SSO user 3, tạo inbox Website tạm `QA khách ẩn danh` (id 83) qua
   `POST /api/v1/accounts/3/inboxes`, rồi 4 phiên khách độc lập gọi
   `POST /api/v1/widget/config` + `POST /api/v1/widget/conversations` (đúng đường đi thật của widget).
2. Kết quả sinh tên: `Ngựa vằn ẩn danh` (#1206), `Bạch tuộc ẩn danh` (#1207),
   `Chích chòe ẩn danh` (#1208), `Gấu nâu ẩn danh` (#1209) — **4/4 khác nhau**, tiếng Việt có dấu.
3. `shot-guests.mjs` → `~/www/pixel-diff/ux-chat-guest-names/conversation-khach-an-danh-sau.png`
   (1440×900): danh sách hội thoại + khung chat + panel phải cùng một khung hình.
4. `shot-contacts.mjs sau` → `contacts-sau.png` (trang Liên hệ — xem phát hiện #3 mục 9).
5. `clean-guests.mjs` — xoá 4 contact + inbox 83 qua API dashboard. Kiểm lại bằng psql: account 3
   trở về **đúng** 2 inbox Zalo / 1 liên hệ / 2 hội thoại (132, 138). Phiên headless của user 3 đã xoá.

**Kết quả PASS:** tên hiện đúng ở cả 3 chỗ (thẻ hội thoại, tiêu đề chat, panel phải);
avatar chữ cái ra 2 chữ có nghĩa — `NV`, `BT`, `CC`, `GN` (thay cho 1 chữ `F`/`O` của haikunator,
xem `conversation-12-truoc.png`).

## 8. Deviation

`reports/ux-deviations.md` — hàng 1 (tên khách vô danh) và hàng 2 (tên rỗng → tên ẩn danh) đã có;
phiên này cập nhật cột **Ảnh trước/sau** (trỏ đúng file tồn tại, ảnh `conversation-12-sau.png` mà agent
trước dự tính không dựng được vì hội thoại #12 đã bị agent QA khác dọn) và cột **Mask harness**
(thêm kết quả grep cơ học sau backfill). Kết luận giữ nguyên: **chưa harness pixel nào cần mask.**

Đồng thời sửa 2 dòng đã lỗi thời trong `reports/trace-b2-contacts.md` (còn trỏ `app/Support/Haikunator.php`
— file đã xoá) sang `app/Support/AnonymousName.php` kèm ghi chú lệch cố ý.

## 9. Phát hiện ngoài phạm vi (KHÔNG tự sửa — file dùng chung)

| # | Màn | Phát hiện | Mức | Bằng chứng | Đề xuất |
|---|---|---|---|---|---|
| 1 | Danh sách hội thoại + panel phải | **Title Case máy móc**: CSS `capitalize` biến `Gấu nâu ẩn danh` → `Gấu Nâu Ẩn Danh`. Tiêu đề chat (đúng) và danh sách/panel (sai) **không nhất quán** trong cùng một khung hình | 🟡 | `conversation-khach-an-danh-sau.png`: header "Ngựa vằn ẩn danh" vs panel "Ngựa Vằn Ẩn Danh" | Là **parity** với Chatwoot (`refs/chatwoot/.../conversation/contact/ContactInfo.vue:209` cũng có `capitalize`) nên không phải bug port. Nhưng `ux-brief.md` cấm "Title Case máy móc". Sửa = bỏ `capitalize` ở đúng 3 chỗ thật sự render tên người: `conversation/conversationbox/contact/ContactInfo.tsx:136` (panel phải), `components/widgets/conversation/ConversationCard.tsx:162` (thẻ hội thoại — `chatlist/ConversationItem.tsx` dùng thẻ CŨ này chứ không phải `components-next/.../ConversationCard.tsx`, thẻ mới đã sạch), `reports/components/CsatContactCell.tsx:26`. (`UserAvatarWithName.tsx:30` có `text-capitalize` — class chết, không phải Tailwind, giống hệt bản gốc, bỏ qua.) Là 1 lệch mới → cần ghi `ux-deviations.md` + rà harness pixel vì chạm nhiều màn |
| 2 | Khung chat, account locale `vi` | Tin "email collect" của widget ra **tiếng Anh**: "Give the team a way to reach you." / "Get notified by email" | 🟡 | cùng ảnh trên | Chuỗi hệ thống của widget chưa đi qua `lang/vi`. Cần truy chuỗi trong service dựng tin email-collect và đưa về `lang/{locale}` |
| 3 | Trang Liên hệ | Khách vô danh từ kênh **không bao giờ** xuất hiện ở trang Liên hệ, vì `Contact::scopeResolvedContacts` lọc `email <> '' OR phone_number <> '' OR identifier <> ''` | 🟢 | `contacts-sau.png`: account 3 hiện empty state dù có liên hệ | Parity Chatwoot, không phải bug. Nhưng nghĩa là ảnh "trang Liên hệ" không dùng được làm bằng chứng cho tính năng này — bằng chứng thật nằm ở danh sách hội thoại |
| 4 | Trang Liên hệ | Empty state "Tài khoản này chưa có liên hệ nào" đè lên **hàng mẫu giả** vẫn đọc được (Candice Matherson / candice.matherson@lumora.com…), lộ dữ liệu bịa | 🟢 | `contacts-sau.png` | Làm mờ mạnh hơn hoặc bỏ hẳn hàng mẫu; nếu giữ thì dùng dữ liệu trung tính, không phải email/tên trông như thật |
| 5 | Avatar chữ cái | Con vật **một từ** (`Cú`, `Thỏ`, `Sóc`, `Voi`, `Công`, `Nhím`) ra chữ tắt lấy sang phần "ẩn danh": `Cú ẩn danh` → `CẨ`, `Thỏ ẩn danh` → `TẨ` | 🟢 | suy ra từ `Avatar.tsx#getInitials` (lấy 2 từ đầu) | Không phải lỗi hồi quy (vẫn hơn 1 chữ của haikunator). Nếu muốn đẹp hơn: cho `getInitials` bỏ qua hậu tố "ẩn danh"/"Anonymous" — nhưng đó là sửa lõi avatar dùng chung, nên chờ lệnh |
| 6 | Form thêm liên hệ (web_api) | `WebApi/ContactsController.php:394` cho `'name' => ['sometimes','nullable','string']` — nhân viên tạo liên hệ không tên thì lưu tên rỗng (không rơi về tên ẩn danh) | 🟢 | đọc mã | Parity Chatwoot, và đây là liên hệ do người tạo chứ không phải khách vô danh — cố tình **không** đụng. Nếu founder muốn chặn thì thêm `required` ở form, không phải ở lớp sinh tên |

## 10. Dọn dẹp

- Dữ liệu QA trên account 3: **đã xoá hết** (4 contact + inbox 83 + 4 hội thoại), kiểm lại bằng psql.
- Phiên Playwright của user 3: đã xoá khỏi `user_sessions`.
- DB test `yona_rw_test_names`: đã `DROP DATABASE`.
- Oracle Chatwoot :3000: **không đụng**. Zalo bridge :3710: **không gọi, không restart**.
- Không commit, không `git add`.

```
Status: DONE_WITH_CONCERNS
Summary: Tên khách vô danh đã chạy đúng end-to-end (89 con vật/locale, chống trùng theo account, một cửa duy nhất ở ContactInboxWithContactBuilder); pint + Pest 2127/2127 + i18n --check xanh; backfill 9 contact trên yona_rw về 0; kiểm trình duyệt account 3 với 4 khách widget thật rồi dọn sạch.
Concerns: 2 lỗi ngoài phạm vi làm giảm chất lượng chính tính năng này — (1) CSS `capitalize` biến "Gấu nâu ẩn danh" thành "Gấu Nâu Ẩn Danh" ở danh sách + panel phải nhưng KHÔNG ở tiêu đề chat (parity Chatwoot, trái lệnh "không Title Case máy móc"); (2) tin email-collect của widget còn tiếng Anh trong account locale vi. Cả hai nằm ở file dùng chung nên chỉ báo cáo, chưa sửa.
```
