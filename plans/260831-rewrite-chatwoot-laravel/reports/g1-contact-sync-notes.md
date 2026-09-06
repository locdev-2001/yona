# g1-contact-sync — đồng bộ thông tin khách từ kênh về hồ sơ liên hệ (07/09/2026)

Agent `g1-contact-sync-fix`. Nhánh `rewrite/chatwoot-laravel`, DB dev `yona_rw`, tài khoản kiểm thử
`dev.robertnguyen@gmail.com` (user 3 / account 3, locale vi). Pest chạy trên DB riêng
`yona_rw_test_csync` (đã `dropdb` khi xong). Không commit.

---

## 1. Bảng kịch bản

| # | Tính năng | Bước | Kết quả | Bằng chứng |
|---|-----------|------|---------|------------|
| 1 | Avatar Zalo về hồ sơ | Đọc trạng thái thật của contact 1057 | **FAIL (trước sửa)** — `attachments` với `attachable_type=Contact` = 0 dòng, UI hiện chữ "PL" | `additional_attributes` đã có `avatar_url_hash=8050e8aa…` + `last_avatar_sync_at=2026-09-06T17:09:36+00:00` |
| 2 | Job avatar có chạy không | Truy `storage/logs/worker.log` | Job CHẠY và báo DONE, không lỗi | `worker.log:16077-16078` — `AvatarFromUrlJob .. RUNNING` → `111.06ms DONE` |
| 3 | Job có ghi log lý do bỏ không | `grep "not fetchable" laravel.log` | **0 dòng** → phản hồi là 200, job thoát ở nhánh `return` câm | `grep -c "not fetchable" storage/logs/laravel.log` = 0; mọi dòng `AvatarFromUrlJob error` trong log đều là `testing.ERROR` của fixture |
| 4 | Nhận `image/jpg` | Dựng JPEG thật bằng GD rồi gọi `AvatarContentType::resolve` | **PASS** — `resolve('image/jpg', $jpeg) = 'image/jpeg'` | tinker, xem §3.1 |
| 5 | Chống giả mạo kiểu ảnh | `resolve('image/png', '<html>x</html>')` | **PASS** — trả `NULL` | tinker |
| 6 | Chặn SVG (véc-tơ chạy script) | `resolve('image/svg+xml', '<svg …>')` | **PASS** — trả `NULL` | tinker |
| 7 | SSRF không chặn nhầm CDN Zalo | `SafeHttp::assertPublicUrl('https://s120-26-ava-talk.zadn.vn/x.jpg')` | **PASS** — OK | tinker; `curl -D-` tới host trả `HTTP/2 403 server: Universe` (host sống, phân giải được) |
| 8 | Pest job avatar | 8 case mới | **PASS 8/8** | `tests/Feature/Jobs/Avatar/AvatarFromUrlJobTest.php` |
| 9 | Cập nhật hồ sơ đã có (builder) | So từng dòng Ruby ↔ PHP | **PASS parity** — port đã đúng gốc; bản gốc KHÔNG có đường cập nhật (xem §4) | bảng trace §4 |
| 10 | Pest builder | 4 case mới khoá hành vi avatar | **PASS 12/12** | `tests/Feature/Builders/ContactInboxWithContactBuilderTest.php` |
| 11 | Twilio đổi tên số → ProfileName | So Ruby `update_contact_name_if_needed` ↔ PHP | **FAIL (trước sửa)** — PHP thiếu hẳn; đã port + 2 case Pest | `tests/Feature/Channels/TwilioChannelTest.php` PASS 5/5 |
| 12 | Thời gian tương đối trang liên hệ | Mở `/app/accounts/3/contacts/1057` bằng Playwright, locale vi | **PASS (sau sửa)** — "Tạo **khoảng 1 giờ trước** • Hoạt động lần cuối **23 phút trước**"; không còn chuỗi `ago` nào trên trang | `~/www/pixel-diff/qa-contact-sync/contact-time.png` + log script |
| 13 | Danh sách hội thoại không vỡ | Mở `/dashboard` → tab "Tất cả", locale vi | **PASS** — vẫn hiện dạng rút gọn `1h • 19m`, không lọt "giờ trước/phút trước" | `~/www/pixel-diff/qa-contact-sync/conv-shorttime.png` |
| 14 | Console sạch | Cả 2 kịch bản trình duyệt | **PASS** — chỉ còn `HTTP 409 /app/login` (SSO bị bỏ qua khi đã có phiên — đúng như brief mô tả), không có pageerror | log script |
| 15 | Gate | `pint --test`, `tsc --noEmit`, `vitest run`, `npm run build` (flock), Pest | **PASS** — pint passed; tsc 0 lỗi; vitest 90 file / 730 test; build OK; Pest 301 (Jobs+Builders+Channels) + 134 (WebApi avatar-adjacent) | §6 |

---

## 2. Lỗi tìm thấy và đã sửa

### 2.1 Avatar không bao giờ về — `AvatarFromUrlJob` loại ảnh rồi khoá vĩnh viễn

**Nguyên nhân gốc (3 tầng, cả 3 đều thật):**

1. **Danh sách kiểu ảnh quá hẹp.** `ALLOWED_CONTENT_TYPES` chỉ nhận đúng 4 tên chuẩn. CDN avatar Zalo
   (`s*-ava-talk.zadn.vn`) trả `Content-Type: image/jpg` — tên không chuẩn nhưng nội dung là JPEG thật.
2. **So sánh không chuẩn hoá.** `Str::before($header, ';')` không `trim`, không hạ chữ thường, trong khi
   gốc dùng `value.to_s.split(';').first&.strip&.downcase`
   (`refs/chatwoot/lib/safe_fetch/fetcher.rb:78-79`). Header `IMAGE/PNG; charset=binary` — có hẳn RSpec
   khoá ở gốc (`spec/jobs/avatar/avatar_from_url_job_spec.rb`, case *"attaches avatars with parameterized
   content type headers"*) — cũng rớt ở bản PHP.
3. **Thất bại câm rồi tự khoá.** Nhánh loại kiểu ảnh `return` không log gì, nhưng `finally` vẫn ghi
   `avatar_url_hash`. Từ lần đó trở đi `duplicateUrl()` chặn mọi lần thử lại **vĩnh viễn**. Đây là lý do
   contact 1057 vừa có hash vừa có 0 attachment và log không hề có dấu vết.

**Đã sửa** — file mới `app/Support/AvatarContentType.php` (nguồn duy nhất của luật "ảnh nào làm avatar
được"), `app/Models/Concerns/Avatarable.php` (`ALLOWED_AVATAR_CONTENT_TYPES = AvatarContentType::ALLOWED`,
hết trùng hằng số với job), `app/Jobs/Avatar/AvatarFromUrlJob.php`:

- Chuẩn hoá header: bỏ tham số charset, `trim`, hạ chữ thường, quy tên lạ về tên chuẩn
  (`image/jpg`/`image/pjpeg` → `image/jpeg`, `image/x-png` → `image/png`).
- Header chỉ dùng để **chặn sớm** (`image/*`); kiểu ghi vào DB lấy từ **nội dung** bằng `finfo` và phải nằm
  trong allowlist. Máy chủ lạ không khai gian được (`image/png` + thân HTML → loại).
- Mọi nhánh từ chối đều `Log::warning` kèm URL và Content-Type đã khai.
- `avatar_url_hash` **chỉ ghi khi gắn được ảnh**; `last_avatar_sync_at` vẫn ghi mọi lượt nên cửa sổ 1 phút
  vẫn chặn tải lại dồn dập.

**Khác biệt CỐ Ý so với gốc (đã ghi trong comment đầu file job):**

| Điểm | Gốc Ruby | Bản Yona | Lý do |
|------|----------|----------|-------|
| Nhận `image/jpg` | Loại (`allowed_content_types` khớp chính xác, `allowed_content_type_prefixes: []`) | Nhận, quy về `image/jpeg` | CDN Zalo khai sai tên; không nhận thì khách Zalo không bao giờ có avatar |
| Kiểu ảnh ghi vào DB | Lấy theo header (`Down`/`SafeFetch` trả `content_type` của phản hồi) | Lấy theo nội dung (`finfo`) | Bù lại phần nới allowlist ở trên: nới cửa header nhưng siết cửa nội dung, không mở đường nhét tệp lạ |
| Ghi `avatar_url_hash` khi thất bại | **Có** — RSpec khoá hẳn (*"updates sync attributes when file download is valid but content type is unsupported"*) | **Không** | Đúng chỗ sinh ra lỗi của founder: một lần hỏng là khoá vĩnh viễn. Rate limit 1 phút vẫn giữ nên không có nguy cơ tải dồn |

**Pest khoá** (`tests/Feature/Jobs/Avatar/AvatarFromUrlJobTest.php`, 8 case): `image/jpg` → gắn được +
`content_type` lưu là `image/jpeg`; `IMAGE/PNG; charset=binary` → gắn được; nội dung không phải ảnh → không
gắn **và không ghi hash** (nhưng có ghi `last_avatar_sync_at`); `application/json` → không gắn; URL từng
hỏng thử lại được sau khi hết rate limit; hash trùng → bỏ qua, không gọi mạng; trong 1 phút → bỏ qua, không
gọi mạng; URL rỗng → không ghi gì.

### 2.2 Twilio: tên là số điện thoại không bao giờ được thay bằng tên thật

`refs/chatwoot/app/services/twilio/incoming_message_service.rb:190-204` có
`update_contact_name_if_needed` — bản PHP thiếu hẳn. Hệ quả: hồ sơ tạo từ tin đầu (chưa có `ProfileName`)
mang tên là số, và tin sau có `ProfileName` cũng không sửa lại.

**Đã sửa** — `app/Services/Twilio/IncomingMessageService.php::updateContactNameIfNeeded()`: chỉ thay khi
tên hiện tại **đúng bằng** số điện thoại (tên agent sửa tay không bị đè). Nhánh so với số đã định dạng quốc
tế (`TelephoneNumber.parse(...).international_number`) **không port** vì repo chưa có thư viện định dạng số
— ghi lại ở §5.3. Pest: 2 case trong `tests/Feature/Channels/TwilioChannelTest.php`.

### 2.3 Thời gian tương đối không dịch

`dynamicTime` gọi `formatDistanceToNow` không truyền `locale` → "Tạo about 1 hour ago" khi app chạy tiếng
Việt. Gốc Chatwoot cũng vậy, nhưng sản phẩm chạy tiếng Việt nên đây là **khác biệt cố ý**.

**Đã sửa** — `resources/js/shared/helpers/timeHelper.ts`:

- `activeDateFnsLocale()` — một điểm duy nhất ánh xạ locale → `Locale` của date-fns. Đọc từ
  `document.documentElement.lang` (đúng nguồn mà `resources/js/i18n/index.ts` đang dùng và tự cập nhật khi
  `setLocale`), **không** import bundle i18n để widget/portal không phải kéo theo chuỗi dịch.
- `dynamicTime` truyền `locale`; `vi`/`vi-VN`/`vi_VN` → tiếng Việt, locale lạ hoặc trống → `enUS`.

**Bẫy đi kèm — đã xử lý:** dạng rút gọn `1m/1h/3d` (bám gốc, founder yêu cầu giữ) được tạo bằng cách **cắt
chuỗi tiếng Anh**. Nếu chỉ dịch `dynamicTime` mà để nguyên các chỗ gọi
`shortTimestamp(dynamicTime(x))` thì danh sách hội thoại sẽ hiện "khoảng 1 giờ trước" trong cột hẹp — vỡ
giao diện. Vì vậy:

- thêm `distanceToNowInEnglish(time)` — nguồn duy nhất của chuỗi tiếng Anh dùng cho mọi phép rút gọn;
- `shortTimestamp` và `shortenSnoozeTime` nhận thêm dạng **mốc thời gian (number)**, tự dựng chuỗi tiếng
  Anh; dạng chuỗi giữ nguyên hành vi cũ nên test sẵn có không đổi;
- 7 chỗ gọi đổi từ `shortTimestamp(dynamicTime(x))` sang `shortTimestamp(x)` (danh sách ở §5.1).

`messageStamp` / `messageTimestamp` / `dateFormat` (định dạng `h:mm a`, `MMM d, yyyy`) **giữ nguyên tiếng
Anh** như gốc — đổi sẽ chạm mốc thời gian trên từng bong bóng tin và làm lệch pixel-diff. Nếu founder muốn
dịch cả nhóm này thì mở việc riêng.

**vitest khoá** (`resources/js/shared/helpers/timeHelper.test.ts`, 7 case): dịch theo `vi`, nhận `vi-VN`,
locale lạ/trống → tiếng Anh; rút gọn giữ đúng dạng gốc kể cả khi giao diện tiếng Việt. Một case ghi lại
quirk của gốc: `'about 3 hours ago'` → `' 3h'` (gốc bỏ chữ "about" nhưng để lại khoảng trắng — **không sửa**,
giữ parity).

---

## 3. Bằng chứng đo

### 3.1 Kiểu ảnh (tinker, JPEG thật dựng bằng GD)

```
jpeg bytes=726
finfo says: image/jpeg
resolve(image/jpg)      = 'image/jpeg'
resolve(image/jpg;q=1)  = 'image/jpeg'   # 'image/jpg; charset=binary'
resolve(null header)    = 'image/jpeg'
resolve(text/html)      = NULL
resolve(image/png,html) = NULL           # chống khai gian
resolve(image/svg+xml)  = NULL
SafeHttp zadn: OK
```

### 3.2 Trình duyệt (Playwright headless, account 3, locale vi)

```
url = http://127.0.0.1:8000/app/accounts/3/contacts/1057 | lang = vi
--- dòng thời gian ---
Tạo khoảng 1 giờ trước • Hoạt động lần cuối 23 phút trước
--- còn "ago" tiếng Anh trên trang? --- false
```

```
--- danh sách hội thoại (tab "Tất cả") ---
KQ | Kênh QA B | Khách QA Một | Tin realtime … | 1h • 19m
dấu thời gian rút gọn thấy trong danh sách: 1h, 19m
lọt chuỗi dài tiếng Việt vào danh sách? false
```

Script: `~/www/pixel-diff/qa-contact-sync/contact-time.mjs`, `~/www/pixel-diff/qa-contact-sync/conv-shorttime.mjs`
(ảnh `.png` cùng thư mục). Không sửa file nào sẵn có trong `~/www/pixel-diff`.

---

## 4. Bảng trace Ruby ↔ PHP — `ContactInboxWithContactBuilder`

| Hành vi | Ruby `contact_inbox_with_contact_builder.rb` | PHP `app/Builders/ContactInboxWithContactBuilder.php` | Kết luận |
|---|---|---|---|
| Trả về sớm khi có contact_inbox theo `source_id` | `return @contact_inbox if @contact_inbox` (dòng 15-16) | `if ($existing !== null) return $existing;` | **Khớp** |
| Thứ tự chống trùng | identifier → email → phone_number (+ nhánh Instagram) | identifier → email → phone_number | **Khớp** (nhánh Instagram bỏ có chủ ý từ B2, đã ghi trong comment) |
| Tạo contact | name (cắt 255, fallback Haikunator), phone, email, identifier, additional/custom attributes | y hệt | **Khớp** |
| Dispatch job avatar | `update_contact_avatar(@contact) unless @contact.avatar.attached?`, và **sau** nhánh trả về sớm | `if ($avatarUrl && $contact->avatar === null) dispatch`, cùng vị trí | **Khớp** |
| Cập nhật `name` khi contact đã tồn tại | **KHÔNG CÓ** | không có | **Khớp** |
| Cập nhật `phone_number` / `email` khi đang trống | **KHÔNG CÓ** | không có | **Khớp** |
| Đổi avatar khi `avatar_url` mới đến mà contact đã có avatar | **KHÔNG CÓ** | không có | **Khớp** |

**Kết luận mục 2 của yêu cầu:** bản port đã đúng gốc, **không thiếu gì**. Cái founder gặp không phải lỗi
port mà là **giới hạn có thật của Chatwoot**: khi `contact_inbox` đã tồn tại theo `source_id` (tin thứ hai
trở đi của cùng một người), builder trả về ngay — tên/avatar/số điện thoại đến sau **không** được ghi. Kênh
nào cần làm mới thì tự làm trong driver của mình; ở gốc chỉ Telegram làm
(`update_contact_avatar` gọi `get_telegram_profile_image`), và bản Yona đã port đúng chỗ đó
(`app/Services/Telegram/IncomingMessageService.php:101-113`).

Vì vậy tôi **không tự nới lõi** — đó là đổi hợp đồng dùng chung cho 11 chỗ gọi. Đã thêm 4 case Pest khoá
đúng hành vi này để lần sau không ai tưởng là lỗi, trong đó có case ghi thẳng giới hạn:
*"does not refresh the contact when the contact inbox already exists for the source id"*.

---

## 5. Ngoài phạm vi — bằng chứng + đề xuất (KHÔNG tự sửa)

### 5.1 Các chỗ gọi buộc phải đổi theo (ĐÃ sửa, báo để rà chéo)

Đây không phải lỗi có sẵn — là hệ quả bắt buộc của việc dịch `dynamicTime`; để nguyên thì vỡ giao diện.
Cả 7 chỗ chỉ đổi đúng một biểu thức, không đổi logic:

| File | Trước | Sau |
|---|---|---|
| `resources/js/dashboard/components-next/Conversation/ConversationCard/ConversationCard.tsx:37` | `shortTimestamp(dynamicTime(conversation.timestamp))` | `shortTimestamp(conversation.timestamp)` |
| `resources/js/dashboard/components-next/SharedAttachments/Files.tsx:53` | `shortTimestamp(dynamicTime(attachment.created_at), true)` | `shortTimestamp(attachment.created_at, true)` |
| `resources/js/dashboard/components-next/SharedAttachments/Media.tsx:104` | như trên | như trên |
| `resources/js/dashboard/reports/components/ReportDrilldownCard.tsx:16` | `shortTimestamp(dynamicTime(timestamp)).trim()` | `shortTimestamp(timestamp).trim()` |
| `resources/js/dashboard/notifications/components/InboxCard.tsx:72` | `shortTimestamp(dynamicTime(inboxItem.last_activity_at))` | `shortTimestamp(inboxItem.last_activity_at)` |
| `resources/js/dashboard/notifications/components/InboxCard.tsx:97` | `shortenSnoozeTime(dynamicTime(ts))` | `shortenSnoozeTime(ts)` |
| `resources/js/dashboard/components/ui/TimeAgo.tsx:61-62` | `shortTimestamp(lastActivityAtTimeAgo)` | `shortTimestamp(lastActivityTimestamp)` |

`resources/js/dashboard/helper/snoozeHelpers.ts` nhận thêm dạng number (dạng chuỗi giữ nguyên; test sẵn có
của file đó vẫn xanh). `TimeAgo` giờ đúng hơn trước: nhãn ngắn giữ `1h`, còn tooltip
("Tạo …", "Hoạt động lần cuối …") đã dịch.

### 5.2 Zalo cá nhân: số điện thoại từ danh thiếp không được ghi vào hồ sơ đã có — ĐỀ XUẤT

`plans/…/reports/g1-inbound-notes.md` **chưa tồn tại** (chỉ có `g1-inbound-evidence.md`,
`g1-relay-notes.md`, `g1-sticker-notes.md`), và `git status` cho thấy
`app/Services/Zalo/IncomingMessageService.php` đang được sửa (thêm `InboundCardParser.php`,
`RelayEventParser.php`). Theo đúng yêu cầu: **không đụng file đó**, chỉ ghi đề xuất.

**Hiện trạng đo được:** contact 1057 `phone_number = NULL`, `email = NULL`.
`IncomingMessageService::phoneNumber()` lấy `user.phone` hoặc `business_card.phone` và đưa vào builder,
nhưng builder chỉ dùng số **lúc TẠO**; từ tin thứ hai trở đi nhánh `source_id` trả về sớm nên số đến sau
(danh thiếp) rơi mất.

**Đề xuất cho agent sở hữu file** (đặt trong driver, không đụng lõi — đúng hướng "thêm kênh = thêm driver"):

```php
// app/Services/Zalo/IncomingMessageService.php — sau khi có $contactInbox
private function syncContactProfile(ContactInbox $contactInbox, array $user): void
{
    $contact = $contactInbox->contact;

    // 1. Avatar: builder chỉ dispatch lúc tạo. Tin sau vẫn mang user.avatar,
    //    contact chưa có ảnh thì thử lại — job đã bỏ khoá hash khi thất bại nên
    //    lần thử này thật sự chạy.
    if (blank($contact->avatar) && filled($user['avatar'] ?? null)) {
        AvatarFromUrlJob::dispatch($contact, (string) $user['avatar']);
    }

    // 2. Số điện thoại: CHỈ điền khi đang trống — không đè số agent đã nhập.
    $phone = $this->phoneNumber();

    if (blank($phone) || filled($contact->phone_number)) {
        return;
    }

    // Số đã thuộc hồ sơ khác trong cùng account → đây là hai nguồn của MỘT người:
    // đi qua ContactMergeAction của lõi, KHÔNG tự UPDATE (validation sẽ chặn).
    $owner = $contact->account->contacts()
        ->where('phone_number', $phone)->where('id', '!=', $contact->id)->first();

    if ($owner !== null) {
        (new ContactMergeAction(account: $contact->account, baseContact: $owner, mergeeContact: $contact))->perform();

        return;
    }

    $contact->update(['phone_number' => $phone]);
}
```

Lưu ý cho người thực thi — **ba cái bẫy đã kiểm bằng schema/model, đừng bỏ qua**:

1. **Phải quy về E.164 TRƯỚC khi ghi.** `Contact::PHONE_NUMBER_REGEX = /^\+[1-9]\d{1,14}$/`
   (`app/Models/Contact.php:43`). Danh thiếp Zalo thường trả số nội địa `0901234567`. Ghi thẳng sẽ bị
   `discardInvalidAttrs()` (`app/Models/Contact.php:216-219`) **âm thầm trả về giá trị cũ** — không lỗi,
   không log, số vẫn mất. Cần chuẩn hoá `0x…` → `+84x…` ngay trong driver (đặc thù thị trường Việt sống ở
   driver Zalo, không đẩy lên lõi).
2. **Trùng số bị chặn ở tầng model, không phải tầng DB.** `contacts_phone_number_account_id_index` là
   index **thường**, KHÔNG unique (chỉ email có `uniq_email_per_account_contact`); chặn nằm ở
   `Contact::validationErrors()` → *"Phone number has already been taken"* (khớp
   `validates :phone_number, uniqueness: { scope: [:account_id] }` của gốc). Nên UPDATE thẳng sẽ **thất
   bại validation**, không phải ném 23505. Đường đúng là `ContactMergeAction`
   (`app/Actions/ContactMergeAction.php`) theo luật chống trùng SĐT của CLAUDE.md.
3. **Chỉ điền khi trống.** Đè số có sẵn là phá dữ liệu agent nhập tay.

**Cảnh báo định danh:** theo ghi nhớ *identity-merge-needs-verification*, định danh lấy từ bề mặt công khai
chưa xác minh không được tự động gộp hồ sơ. Số trong `business_card` là do **chính khách gửi** nên chấp
nhận được; số suy ra từ nguồn khác cần founder chốt trước.

Cần Pest: điền số khi trống · **số nội địa được quy về E.164 chứ không bị nuốt** · không đè số có sẵn ·
số trùng contact khác thì gộp chứ không rớt validation.

### 5.3 SMS (Bandwidth): tên hiển thị là số thô thay vì số định dạng quốc tế

`refs/chatwoot/app/services/sms/incoming_message_service.rb:72-77` dùng `name: formatted_phone_number`
(gem `TelephoneNumber`); `app/Services/Sms/IncomingMessageService.php:25` dùng thẳng `params['from']`.
Chỉ khác về hiển thị. File thuộc `qa-f` (`app/Services/Sms/**`) → **không sửa**. Cùng gốc rễ với nhánh
`formatted_phone_number` chưa port ở Twilio (§2.2): nếu founder muốn xử lý một lần thì thêm thư viện định
dạng số (ví dụ `giggsey/libphonenumber-for-php`) rồi dùng chung ở cả Sms + Twilio.

### 5.4 Backfill avatar cho contact 1057

Sửa job **không tự cứu** contact 1057: builder không dispatch lại vì `contact_inbox` đã tồn tại theo
`source_id`. Hai đường:

**A. Có URL avatar trong tay** (đọc từ payload `inbound` kế tiếp của bridge, trường `user.avatar`):

```bash
php artisan tinker --execute='
$c = App\Models\Contact::find(1057);
$a = $c->additional_attributes ?? [];
unset($a["avatar_url_hash"], $a["last_avatar_sync_at"]);   # gỡ khoá cũ
$c->forceFill(["additional_attributes" => $a])->saveQuietly();
App\Jobs\Avatar\AvatarFromUrlJob::dispatch($c, "<DÁN URL user.avatar Ở ĐÂY>");
'
```

**B. Sau khi §5.2 được cài** — chỉ cần gỡ khoá rồi để khách nhắn một tin bất kỳ:

```bash
php artisan tinker --execute='
$c = App\Models\Contact::find(1057);
$a = $c->additional_attributes ?? [];
unset($a["avatar_url_hash"], $a["last_avatar_sync_at"]);
$c->forceFill(["additional_attributes" => $a])->saveQuietly();
'
```

Kiểm tra: `App\Models\Attachment::where('attachable_type','Contact')->where('attachable_id',1057)->count()`
phải ra 1.

Tôi **không chạy** backfill: không có URL avatar thật (cấm gọi bridge :3710 — phiên Zalo thật của founder).

---

## 6. Bảng: kênh → trường đồng bộ được từ nền tảng

"Lúc tạo" = chỉ ghi khi hồ sơ được tạo mới; tin sau đến thì **rơi mất** (giới hạn gốc, §4).

| Kênh | Tên | Avatar | SĐT | Email | Ghi chú |
|---|---|---|---|---|---|
| **Zalo cá nhân** | ✅ lúc tạo (`user.name`) | ✅ lúc tạo (`user.avatar`) — **nay tải được** sau §2.1 | ⚠️ lúc tạo, chỉ khi có (`user.phone` / `business_card.phone`) | ❌ nền tảng không lộ | Số chủ yếu đến từ danh thiếp, tức luôn **sau** tin đầu → thực tế gần như không bao giờ ghi được. Đề xuất §5.2 |
| **Telegram** | ✅ lúc tạo (first+last) | ✅ **mọi tin** — driver tự gọi lại `getUserProfilePhotos` khi contact chưa có ảnh | ❌ | ❌ | Kênh duy nhất ở gốc có đường làm mới avatar |
| **LINE** | ✅ lúc tạo (`displayName`) | ✅ lúc tạo (`pictureUrl`) | ❌ | ❌ | Đổi ảnh đại diện bên LINE không về |
| **WhatsApp Cloud** | ✅ lúc tạo (`contacts.0.profile.name`) | ❌ nền tảng không trả | ✅ lúc tạo (`+wa_id`) | ❌ | |
| **Twilio SMS/WhatsApp** | ✅ lúc tạo + **cập nhật được** khi tên đang là số (§2.2) | ❌ | ✅ lúc tạo (`From`) | ❌ | Tên hiển thị chưa định dạng quốc tế (§5.3) |
| **SMS (Bandwidth)** | ✅ lúc tạo (= số) | ❌ | ✅ lúc tạo | ❌ | §5.3 |
| **Facebook Messenger** | ✅ lúc tạo (Graph `first_name`+`last_name`) | ✅ lúc tạo (`profile_pic`) | ❌ | ❌ | URL `profile_pic` của Meta có hạn dùng — hỏng thì nay có log cảnh báo và thử lại được |
| **Instagram** | ✅ lúc tạo (username/name) | ❌ ở đường tạo contact_inbox | ❌ | ❌ | |
| **TikTok** | ✅ lúc tạo (`from`) | ❌ | ❌ | ❌ | |
| **Email (Mailbox)** | ✅ lúc tạo (tên trong header From) | ❌ (gốc dựa vào Gravatar theo email) | ❌ | ✅ lúc tạo | |
| **Website widget** | ❌ (khách tự khai qua `setUser`/pre-chat) | ❌ | ❌ | ❌ | Builder gọi với `contactAttributes: []`; mọi thứ do khách nhập |

Đọc bảng này để trả lời câu hỏi của founder: **không phải kênh nào cũng có đủ 4 trường** — Zalo cá nhân
không lộ email, và số điện thoại chỉ có khi khách chủ động gửi danh thiếp.

---

## 7. Gate

| Gate | Lệnh | Kết quả |
|---|---|---|
| Pest — job avatar | `DB_DATABASE=yona_rw_test_csync php artisan test tests/Feature/Jobs/Avatar/AvatarFromUrlJobTest.php` | 8/8 pass |
| Pest — builder | `… tests/Feature/Builders/ContactInboxWithContactBuilderTest.php` | 12/12 pass |
| Pest — Twilio | `… tests/Feature/Channels/TwilioChannelTest.php` | 5/5 pass |
| Pest — vùng rộng | `… tests/Feature/Jobs tests/Feature/Builders tests/Feature/Channels` | 301/301 pass |
| Pest — API dính avatar | `… WebApi/{Profiles,Contacts,Inboxes}ControllerTest.php Models/AttachmentTest.php` | 134/134 pass |
| pint | `vendor/bin/pint --test <8 file>` | passed |
| tsc | `npx tsc --noEmit` | 0 lỗi |
| vitest | `npx vitest run` | 90 file / 730 test pass |
| build | `flock /tmp/yona-build.lock npm run build` | OK (app + sdk) |

Không đụng `lang/**` nên không cần `i18n:generate --check`. Repo không có cấu hình PHPStan trên nhánh này.

---

## 8. Dọn dẹp

- DB test `yona_rw_test_csync`: đã `dropdb`.
- Phiên Playwright của user 3: đã xoá (`user_sessions` còn 0 dòng).
- Không tạo/xoá dữ liệu nào trong account 3; không đụng inbox 58/59, hội thoại 132.
- Không gọi và không khởi động lại bridge Zalo :3710.
- Không chạm oracle :3000.
- Script kiểm thử để riêng ở `~/www/pixel-diff/qa-contact-sync/`; không sửa file sẵn có trong `~/www/pixel-diff`.
- Không commit, không `git add`.

## 9. File đã đổi

**Mới:** `app/Support/AvatarContentType.php`, `tests/Feature/Jobs/Avatar/AvatarFromUrlJobTest.php`,
`~/www/pixel-diff/qa-contact-sync/{contact-time,conv-shorttime}.mjs`.

**Sửa:** `app/Jobs/Avatar/AvatarFromUrlJob.php`, `app/Models/Concerns/Avatarable.php`,
`app/Services/Twilio/IncomingMessageService.php`, `resources/js/shared/helpers/timeHelper.ts` (+ test),
`resources/js/dashboard/helper/snoozeHelpers.ts`, và 6 file giao diện ở §5.1,
`tests/Feature/Builders/ContactInboxWithContactBuilderTest.php`,
`tests/Feature/Channels/TwilioChannelTest.php`.

**Không đụng:** `app/Services/Zalo/**` (agent khác đang sửa), `app/Builders/ContactInboxWithContactBuilder.php`
(đã đúng gốc), `app/Services/{Email,Mailbox,Telegram,Line,Whatsapp,Sms,Facebook,Instagram,Tiktok}/**`
(thuộc `qa-f`), `lang/**`, `routes/*.php`, `app/Models/**` ngoài trait Avatarable.

```
Status: DONE_WITH_CONCERNS
Summary: Đã tìm và sửa tận gốc 3 lỗi thật (job avatar loại nhầm ảnh rồi tự khoá vĩnh viễn; Twilio thiếu
cập nhật tên; thời gian tương đối không dịch) kèm test khoá và 2 kịch bản trình duyệt xanh; xác nhận
ContactInboxWithContactBuilder đã port ĐÚNG gốc — chỗ founder thấy thiếu là giới hạn có thật của Chatwoot.
Concerns/Blockers:
  1. Contact 1057 vẫn chưa có avatar: cần backfill (§5.4) và cần URL user.avatar từ bridge — tôi không
     được phép gọi bridge :3710.
  2. Số điện thoại Zalo từ danh thiếp vẫn rơi mất với hồ sơ đã tồn tại. File sửa thuộc agent
     `g1-inbound-fix` đang chạy (g1-inbound-notes.md chưa có) → chỉ ghi đề xuất kèm mã mẫu ở §5.2.
  3. Đã đổi 7 chỗ gọi ngoài phạm vi file được giao (§5.1) vì bắt buộc — không đổi thì danh sách hội thoại
     hiện "khoảng 1 giờ trước" trong cột hẹp. Cần rà chéo nếu agent khác đang sửa cùng file.
```
