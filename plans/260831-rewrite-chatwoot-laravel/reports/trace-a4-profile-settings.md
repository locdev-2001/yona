# Trace A4 — Profile settings

Nguồn: Chatwoot v4.17.1 (`refs/chatwoot`). Ngày: 31/08/2026.

## Bảng trace nguồn → đích

### Backend

| Ruby / hệ gốc | PHP | Ghi chú |
|---|---|---|
| `Api::V1::ProfilesController#show/#update/#avatar` | `app/Http/Controllers/WebApi/ProfilesController.php` (show/update/destroyAvatar) | Route `/api/v1/profile` GET+PUT/PATCH + DELETE `/profile/avatar` (không gắn account, đúng gốc). `#set_active_account` chưa port (khi account switcher cần `active_at`); `#reset_access_token` → F8 (chưa có bảng access_tokens); `#resend_confirmation` đã có ở A2 (`Auth\RegistrationsController`) |
| `#availability` / `#auto_offline` | `WebApi\ProfileAvailabilityController` (A3) | **Fix trong A4:** mapping enum sai (`busy→1, offline→2`) sửa về đúng enum `account_users` Chatwoot (`online:0, offline:1, busy:2`) — hằng + `availabilityName()` trong `AccountUser`; share qua Inertia dạng tên chuỗi như Rails enum serialize |
| Concern `Avatarable` (`has_one_attached :avatar`, `avatar_url`, validate 15MB + jpeg/png/gif/webp) | `User::avatar()` morphOne `Attachment` + `User::avatarUrl()`; validate `mimes:jpg,jpeg,png,gif,webp|max:15360` trong controller | Thay ActiveStorage bằng bảng attachments polymorphic (quyết định #9, scaffold `b7cb796`). `avatar_url` trả URL file gốc — KHÔNG có variant resize 250px như ActiveStorage representation (xem lại khi cần thumbnail). `AvatarFromGravatarJob` bỏ — gọi Gravatar ngoài, không thuộc hành vi cốt lõi |
| Devise reconfirmable (đổi email → `unconfirmed_email`, mail về địa chỉ mới, confirm → swap) | `ProfilesController::startEmailChange` + `User::routeNotificationForMail` + `Auth\ConfirmationsController` (swap email/uid khi có `unconfirmed_email`) | |
| Devise `valid_password?` check trong `#update` | `Hash::check` + 422 `{message: 'Invalid current password'}` (giữ nguyên chuỗi) | Rule mật khẩu gộp về `User::passwordRules()` — signup (A2) dùng chung |
| `api/v1/models/_user.json.jbuilder` | `ProfilesController::profilePayload` | Thiếu so gốc: `access_token`, `accounts[]` (F8), `pubsub_token` (B4) |
| `spec/controllers/api/v1/profiles_controller_spec.rb` | `tests/Feature/WebApi/ProfilesControllerTest.php` — 18 test | Bỏ: 4 spec access_token (F8), availability/auto_offline (đã ở `AccountScopeTest`, expectation busy sửa 1→2), set_active_account. Lệch: assert lỗi name-quá-dài theo `errors.name` của Laravel thay vì chuỗi message Rails |

### Frontend (Vue → React)

| Vue | React | Ghi chú |
|---|---|---|
| `settings/profile/Index.vue` | `dashboard/settings/profile/Index.tsx` | Đủ section: picture, basic details, interface (font size + language), signature, hotkey, password. Chưa port theo roadmap: MFA + ActiveSessions + AccessToken (F8), Audio/Notification preferences (D5). `replaceInstallationName` áp cho INTERFACE NOTE như gốc |
| `UserProfilePicture.vue` | `UserProfilePicture.tsx` | Avatar allowUpload (đã có A3) |
| `UserBasicDetails.vue` | `UserBasicDetails.tsx` | vuelidate → validate tay cùng rule (name required, email required+format) |
| `ChangePassword.vue` | `ChangePassword.tsx` | Gọi PUT profile với current_password; lỗi hiện message từ API |
| `FontSize.vue` + `composables/useFontSize.js` | `FontSize.tsx` + `composables/useFontSize.ts` | 5 mức (SMALLER→LARGER); áp `font-size` lên `<html>`; Dashboard.tsx áp khi load (tương đương watch immediate) |
| `UserLanguageSelect.vue` | `UserLanguageSelect.tsx` | Chỉ `en` + "Use account default" tới khi i18n nhóm G; lưu `ui_settings.locale` như gốc |
| `MessageSignature.vue` (WootMessageEditor/ProseMirror) | `MessageSignature.tsx` — **textarea tạm** | ProseMirror `@chatwoot/prosemirror-schema` vào B3; flow lưu `message_signature` giữ nguyên |
| `settings/SettingsWrapper.vue` | `dashboard/settings/SettingsWrapper.tsx` | |
| `settings/account/components/SectionLayout.vue` | `dashboard/settings/account/SectionLayout.tsx` | |
| `settings/components/BaseSettingsHeader.vue` | `dashboard/settings/BaseSettingsHeader.tsx` | Phần dùng (title/description); back button/help link/search/tabs vào cùng màn cần |
| `components-next/radioCard/RadioCard.vue` | `components-next/radioCard/RadioCard.tsx` | Chip disabled/beta (Label.vue) vào khi màn nào dùng |
| `v3/components/Form/Select.vue` | `v3/components/Form/Select.tsx` | Caret nền từ style `select` global `_base.scss` (trùng data-URI bản scoped gốc) |
| `components/widgets/forms/Input.vue` (woot-input legacy) | `dashboard/components/widgets/forms/Input.tsx` | Style từ global `_base.scss` (label/input/.error/.message) như gốc |
| `composables/useUISettings.js` | `composables/useUISettings.ts` (`isEditorHotKeyEnabled`) | State ui_settings giữ ở trang profile (không có Vuex); server merge partial update |
| `public/assets/images/dashboard/profile/hot-key-*.svg` (4 file) | copy nguyên | |
| Store `updateProfile`/`deleteAvatar`/`updatePassword` | `putForm`/`putJson`/`deleteJson` trong `helper/apiClient.ts` + `ApiError`/`parseApiErrorMessage` | Multipart gửi POST + `_method=PUT` (Laravel không parse multipart PUT). Sau update thành công: `router.reload({only:['auth']})` để sidebar thấy avatar/tên mới (gốc: store mutation); đổi email → logout như `clearCookiesOnLogout` gốc |
| Shared props | `HandleInertiaRequests` thêm `avatar_url` + `message_signature` vào `auth.user` | |

### Fix finding A3 (founder, qua yona-ee): sidebar không kéo/thu gọn được

| Vấn đề | Nguyên nhân gốc | Fix |
|---|---|---|
| Resize handle không kéo được, không có flyout | Thiếu `dir` trên `<html>` → toàn bộ variant `ltr:`/`rtl:` của Tailwind chết (gồm `ltr:right-0` của handle → handle vô hình nằm mép TRÁI, `ltr:border-r` của aside cũng không áp). Gốc: `App.vue` đặt `:dir="isRTL ? 'rtl' : 'ltr'"` trên `#app` | `dir="ltr"` trong `app.blade.php` (rtl_view động vào nhóm G). Code resize/snap/flyout đã có sẵn từ A3 và chạy đúng sau fix |
| `sidebar_width` lưu localStorage tạm | Kế hoạch A4 ghi sẵn trong provider.tsx | Chuyển sang `ui_settings.sidebar_width` qua PUT `/api/v1/profile` (đúng gốc dùng updateUISettings) |

## 5 finding pixel-diff của yona-ee (đã xác minh source + fix hết)

| # | Finding | Nguyên nhân | Fix |
|---|---|---|---|
| 1 | Header flyout thiếu uppercase/tracking/kẻ dưới | Port thiếu class | Viết lại `SidebarCollapsedPopover.tsx` bám sát template gốc (thêm cả cấu trúc 2 lớp, sub-group collapsible + auto-expand theo active child, clamp đáy viewport) |
| 2 | Flyout hiện sub-group rỗng (Folders/Teams/Channels) | Thiếu filter `accessibleChildren` | Filter trong popover: child có children chỉ giữ khi có subChild điều hướng được |
| 3 | Popover lệch vị trí | Hard-code `left-14` + `top-8` | `left = sidebarWidth + 8`, `top = triggerRect.top` (clamp như onMounted gốc); thêm `sidebarWidth` vào SidebarContext |
| 4 | Section Interface mỗi hàng cao hơn +8px | Chatwoot có style leak KHÔNG scoped `p:last-child { margin-bottom: 0 }` từ `message/bubbles/Text/Index.vue` — hiệu lực toàn app gốc; bản port thiếu | Thêm rule vào `_base.scss` (kèm comment nguồn gốc); chỉ ảnh hưởng app.scss dashboard, auth v3.scss không import base |
| 5 | Select Preferred Language 171px thay vì 222px | Width của `<select>` = option dài nhất; mình mới có 2 option | Port đủ 42 ngôn ngữ enabled từ `config/initializers/languages.rb` (giữ nguyên tên, kể cả space thừa của 'nl'); đổi locale runtime vẫn ở nhóm G |

| 6 | Flyout render font hệ thống thay vì Inter | Blade chọn stylesheet theo trang đầu (`v3.scss` auth / `app.scss` dashboard); login → dashboard đi client-side Inertia nên `app.scss` (font + `_base`) không nạp tới khi F5 — bug thật với người dùng, không riêng harness | Login/logout trả `Inertia::location` → vượt ranh giới bundle là full-page load; test ghim 409 + X-Inertia-Location; probe Playwright fresh xác nhận dashboard nạp app.css + InterVariable sau login (commit `6823979`) |

Sau fix, đo DOM khớp oracle từng số: row Interface 47.09px = 47.09px, select ngôn ngữ 222px = 222px, `p` last-child margin 0. Nợ ghi roadmap từ finding vận hành: `MAX_USER_SESSIONS=25` + 409 session picker → mục F8.

## Kiểm chứng

- Pest: **56/56** (18 test A4 mới; port từ profiles_controller_spec). `tsc` + `pnpm build` + pint xanh.
- E2E browser (localhost:8000, tài khoản seed): đổi tên → DB + toast ✓; upload avatar → file lưu `storage/avatars/{id}`, sidebar hiện sau reload auth ✓; xóa avatar → DB + file sạch, toast ✓; font size → áp `<html>` + lưu ui_settings ✓; hotkey → `editor_message_key` lưu ✓ (cmd_enter mặc định active đúng logic gốc); kéo sidebar < 160px → snap 56 + lưu DB ✓; dblclick → 200 ✓; hover collapsed → flyout ✓; branding "Yona dashboard" ✓.
- Dev data đã trả về trạng thái sạch (name gốc, ui_settings rỗng) để không nhiễm pixel-diff.

## Kịch bản "Test ngay" (DoD d)

1. Đăng nhập `john@acme.inc / Password1!` → menu avatar góc dưới trái → **Profile Settings** (hoặc vào `/app/accounts/2/profile/settings`).
2. Đổi "Your full name" + "Display name" → **Update Profile** → toast xanh, tên ở sidebar đổi theo.
3. Hover ảnh đại diện → upload 1 ảnh → **Update Profile** → avatar hiện ở sidebar; hover avatar → bấm X → avatar về chữ cái.
4. Đổi **Font size** → chữ toàn dashboard to/nhỏ ngay, F5 vẫn giữ.
5. Chọn hotkey **Enter (↵)** → toast; F5 vẫn giữ lựa chọn.
6. Nhập chữ ký ở **Personal message signature** → Save → toast.
7. **Password**: nhập sai mật khẩu hiện tại → báo "Invalid current password"; nhập đúng + mật khẩu mới → toast xanh, logout/login lại bằng mật khẩu mới.
8. Đổi **email** → toast báo đăng nhập lại + bị logout; check mail (log) có link confirm; bấm link → login bằng email mới.
9. Sidebar: kéo mép phải sidebar hẹp lại → tự snap về dạng icon; hover icon nhóm → flyout menu; kéo rộng ra/double-click mép → mở lại; F5 giữ nguyên trạng thái.
