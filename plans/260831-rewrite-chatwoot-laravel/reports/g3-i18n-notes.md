# G3 — i18n tiếng Việt toàn bộ giao diện (06/09/2026)

Agent `g3-i18n`. Vùng sở hữu: `lang/vi/**`, `resources/js/i18n/**`, `app/Http/Middleware/SetLocale.php`,
`tests/Feature/I18nVietnameseTest.php`, `~/www/pixel-diff/g3-i18n-e2e.mjs`, `config/yona.php` (danh sách locale),
`bootstrap/app.php` (đăng ký 1 middleware).

## Thống kê khóa

| Chỉ số | Số lượng |
|---|---|
| File lang | 112 (`lang/vi/*.php` khớp 1-1 với `lang/en`) |
| Khóa (đã làm phẳng) | 5.462 — phủ 100%, không thừa khóa |
| Lấy được từ bản dịch `vi` của Chatwoot v4.17.1 | 5.350 |
| Yona tự dịch mới (Chatwoot chưa có khóa) | 112 (Zalo, wait-automation, picker, MFA/session, import…) |
| Chatwoot có khóa nhưng **để nguyên tiếng Anh** → phiên này dịch tay | 2.647 |
| Còn trùng chữ với tiếng Anh sau cùng | 122 (danh từ riêng/kỹ thuật: WhatsApp, Twilio, WABA ID, GTM-XXXXXXX, Zalo…) |

Nguồn đã gộp: 48 JSON `dashboard/i18n/locale/vi/*`, `widget/i18n/locale/vi.json`,
`survey/i18n/locale/vi.json`, `config/locales/vi.yml` (đổi `%{x}` → `{x}` cho khớp quy ước Yona).

## Chuẩn hóa thuật ngữ (bản dịch Chatwoot vi rất lệch, đã ép về glossary founder)

| Chatwoot vi | Yona | Số chỗ |
|---|---|---|
| cuộc trò chuyện / cuộc hội thoại | **hội thoại** | 134 |
| hộp thư đến | **hộp thư** | 68 |
| đại lý / tổng đài viên (dịch sai "agent") | **nhân viên** | 52 |
| Nhà cung cấp (dịch sai "Agent"; giữ nghĩa "provider" ở `ONBOARDING_INBOX_SETUP.CHANNELS.OTHER_EMAIL`) | **Nhân viên** | 63 |
| luật tự động hóa | **quy tắc tự động hóa** | 19 |
| Thư mẫu phẩn hồi (sai chính tả) | **Câu trả lời mẫu** | 3 |
| Title Case kiểu Anh (`Cài Đặt Hồ Sơ`, `Trực Tuyến`, `Tất Cả Nhóm`) | câu thường tiếng Việt | 49 |
| hoá | hóa | 34 |

Bẫy đã trả giá: `Mở hội thoại` bị thay nhầm thành `Hội thoại đang mở` ở 4 khóa động từ
(`AUTOMATION.ACTIONS.OPEN_CONVERSATION`, `KEYBOARD_SHORTCUTS.TITLE.OPEN_CONVERSATION`, `SLACK_UNFURL.button`,
`CONVERSATION.VOICE_WIDGET.GO_TO_CONVERSATION`) — phải đối chiếu chuỗi tiếng Anh (danh từ hay động từ) trước khi
thay hàng loạt, không grep-replace mù.

## Cơ chế chọn locale (mới)

`app/Http/Middleware/SetLocale.php` (đăng ký ở `bootstrap/app.php` cho cả nhóm `web` lẫn `api`) — **một chỗ duy nhất**
quyết định locale, thứ tự ưu tiên:

1. tham số route `{locale}` (portal công khai `/hc/{slug}/{locale}`)
2. query `?locale=` (websdk truyền cho widget)
3. `ui_settings.locale` của người dùng đăng nhập (Profile settings)
4. `locale` của account (áp cho widget/portal khi không có 1–3)

Chỉ nhận mã có trong `config/yona.php → available_locales` (đã thêm `['name' => 'Tiếng Việt', 'iso_639_1_code' => 'vi']`).
Mọi Blade đã sẵn in `app()->getLocale()` ở `<html lang>`; `resources/js/i18n/index.ts` đọc lại đúng chỗ đó
(`document.documentElement.lang`) nên dashboard, widget, survey, portal dùng chung một nguồn locale — không thêm
prop Inertia, không hardcode danh sách locale ở FE.

`t()` nay tra bundle của locale hiện hành, thiếu khóa thì lùi về `en` (không bao giờ hiện key thô).
`setLocale()` được export để đổi runtime.

## Khác biệt cố ý so với Chatwoot

| Chỗ | Chatwoot | Yona | Lý do |
|---|---|---|---|
| Đổi ngôn ngữ ở Profile | vue-i18n đổi reactive, không tải lại trang | `window.location.reload()` sau khi lưu (`settings/profile/Index.tsx`, 1 dòng) | bundle locale nạp lúc khởi động; tải lại là cách chắc chắn mọi component (kể cả memo) đổi ngữ |
| Kho chuỗi | FE (JSON) và BE (YAML) tách rời | gộp về `lang/{locale}` | quyết định trace-i18n (lệnh founder) |
| Số nhiều | `a \| b` hai nhánh | tiếng Việt giữ **một** nhánh ở 3 khóa `PAGINATION_FOOTER.SHOWING`, `PAGINATION_FOOTER.CURRENT_PAGE_INFO`, `CONTACTS_LAYOUT.PAGINATION_FOOTER.SHOWING` | tiếng Việt không biến đổi số nhiều; `t()` trả nguyên chuỗi khi chỉ có 1 nhánh. `TIME_UNITS.*` và `PUBLIC_PORTAL.search.found_results` vẫn giữ đủ nhánh vì `trans_choice` đọc dải `{1}`/`[2,*]` |

## Việc cần founder / phiên chính quyết

1. **`lang/en` vẫn còn ~40 chuỗi hiển thị chữ "Chatwoot"** (`LOGIN.TITLE`, `REGISTER.GET_STARTED`,
   `SURVEY.POWERED_BY`, `WIDGET.POWERED_BY`, `INBOX_MGMT.*`, `INTEGRATION_SETTINGS.*`, link
   `https://www.chatwoot.com/terms`…). Brief đợt này nói "en đã thay Chatwoot → Yona", thực tế **chưa**.
   Bản vi đang **mirror đúng chữ của en** (nói "Chatwoot" ở đúng những khóa en nói "Chatwoot") để không tạo
   thương hiệu lệch giữa hai locale và để một lượt sweep sau này sửa được cả hai. Cần lệnh: giữ nguyên cho pixel-diff
   với oracle, hay đổi hết sang Yona (khi đó phải sửa **cả** `lang/en` lẫn `lang/vi` cùng lúc).
   *(Ghi chú: `PROFILE_SETTINGS.FORM.INTERFACE_SECTION.NOTE` hiện ra "Yona" trên UI vì FE có
   `replaceInstallationName()` thay lúc chạy — chỉ khóa đó, không phải toàn bộ.)*
2. **Sidebar cắt chữ**: mục Settings "Thuộc tính tùy chỉnh" bị ellipsis thành "Thuộc tính tùy c..."
   (tiếng Anh "Custom Attributes" vừa khung). Cần founder duyệt: rút gọn nhãn (ví dụ "Thuộc tính") hay nới cột.
   Các màn còn lại (Profile, Hội thoại, Liên hệ, Báo cáo, Hộp thư, Tự động hóa) không tràn nút, không xuống dòng lạ.
3. **Widget xem trong trình duyệt của chính nhân viên** sẽ theo `ui_settings.locale` của nhân viên đó khi websdk
   không truyền `?locale=`. Khách thật không có phiên dashboard nên vẫn nhận locale của account — chấp nhận được,
   ghi lại để không bất ngờ khi test.
4. **Portal công khai `/hc/...` chưa test được trên trình duyệt** vì DB dev `yona_rw` chưa có portal nào
   (`Portal::count() = 0`). Đường chọn locale của portal đã có test Pest (tham số route `{locale}`).
   Mã locale kiểu `en-US`/`vi-VN` của help center **không** nằm trong `available_locales` nên rơi về locale account —
   nếu E4 muốn portal đa ngữ theo locale bài viết thì phải mở rộng danh sách này.

## Ràng buộc cho các agent khác (QUAN TRỌNG)

`php artisan i18n:generate` **fail** nếu `lang/vi` thiếu bất kỳ khóa nào của `lang/en`.
Agent nào thêm khóa vào `lang/en/*.php` phải thêm khóa tương ứng vào `lang/vi/*.php`, nếu không `make build`/gate CI đỏ.

Ghi nhận: `resources/js/i18n/generated/en.ts` trong git đang **cũ hơn** `lang/en` (thiếu
`AUTOMATION.ACTIONS.SEND_EMAIL_TO_TEAM`); lệnh generate của phiên này đã cập nhật lại — ai đó trước đây sửa
`lang/en` mà quên chạy generate.

## Kết quả gate

| Gate | Kết quả |
|---|---|
| Pest `tests/Feature/I18nVietnameseTest.php` | 8/8 xanh (đủ file, phủ khóa, không thừa khóa, trùng placeholder, trùng thẻ HTML, ngưỡng chưa dịch < 5%, `i18n:generate --check`, thứ tự chọn locale của `SetLocale`) |
| Pest toàn suite (DB riêng `yona_rw_test_g3i`, đã `dropdb`) | **2057/2057** xanh, 5031 assertion |
| `vendor/bin/pint` (file của g3) | passed |
| `npx tsc --noEmit` | sạch |
| `npm test` (vitest) | 685/685 xanh |
| `npm run build` | xanh (vite + sdk) |
| E2E `~/www/pixel-diff/g3-i18n-e2e.mjs` | ✅ 6 màn `lang=vi`, **0 key thô** (regex `[A-Z_]{6,}\.[A-Z_]+` trên `document.body.innerText`), widget trả `lang=vi` cả khi mặc định lẫn `?locale=vi`. Ảnh: `~/www/pixel-diff/shots/g3-vi-{profile,conversations,contacts,reports,inboxes,automation}.png` |

Không có oracle tiếng Việt nên **không** chạy pixel-diff cho các màn này (đúng như brief).
User test riêng `g3vi@acme.inc` / `Password1!` (account 2, đã tạo trên `yona_rw`) — **không đụng locale của john**.
