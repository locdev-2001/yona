# F8 — MFA/2FA (TOTP + mã dự phòng) + quản lý phiên đăng nhập

Agent `f8`, 06/09/2026. Nguồn: Chatwoot v4.17.1 (`refs/chatwoot`, không mở `enterprise/`).

## CONTRACT API (không gắn account — đúng gốc `/api/v1/profile/...`)

| Method | Path | Body | Trả về | Lỗi |
|---|---|---|---|---|
| GET | `/api/v1/profile/mfa` | — | `{feature_available, enabled, backup_codes_generated, remaining_backup_codes}` | 403 `{error}` khi tắt tính năng |
| POST | `/api/v1/profile/mfa` | — | `{provisioning_url, secret}` | 422 `{error}` nếu đã bật |
| POST | `/api/v1/profile/mfa/verify` | `{otp_code}` | `{enabled, backup_codes[10]}` | 422 `{error}` mã sai / đã bật |
| DELETE | `/api/v1/profile/mfa` | `{password, otp_code?, backup_code?}` | `{enabled:false}` | 422 `{error}` sai mật khẩu / mã / chưa bật |
| POST | `/api/v1/profile/mfa/backup_codes` | `{otp_code}` | `{backup_codes[10]}` | 422 `{error}` |
| GET | `/api/v1/profile/sessions` | — | `[{id, browser_name, browser_version, device_name, platform_name, platform_version, ip_address, city, country, country_code, last_activity_at, created_at, current}]` | 401 |
| DELETE | `/api/v1/profile/sessions/{id}` | — | `200 []` | 422 khi là phiên hiện tại, 404 khi không phải phiên của mình |

Đăng nhập (`POST /app/login`, Inertia) có thêm ba trạng thái trả về dưới dạng **prop của
chính trang login** thay cho 206/409 JSON của Chatwoot:

| Trạng thái | Prop |
|---|---|
| Cần mã OTP | `mfaRequired: true`, `mfaToken` |
| Mã OTP/mã dự phòng sai, token hết hạn | `mfaRequired: true`, `mfaToken`, `mfaError` |
| Chạm trần phiên | `sessionsLimitReached: true`, `sessions[]` |

Body gửi lên: `{mfa_token, otp_code|backup_code}` cho bước 2; `{email, password, revoke_session_id|revoke_all_sessions}`
cho màn chọn phiên.

## Bảng trace Ruby ↔ PHP

| Chatwoot (Ruby/Vue) | Yona (PHP/TSX) | Ghi chú |
|---|---|---|
| `db/schema.rb` bảng `user_sessions` | `database/migrations/2026_09_06_100000_create_user_sessions_table.php` | Đủ cột; unique `(user_id, client_id)` |
| cột `users.otp_secret` (varchar + unique) | `2026_09_06_100001_widen_users_otp_secret.php` | Nới sang `text`, **bỏ unique** — xem "Khác biệt cố ý" |
| `app/models/user_session.rb` | `app/Models/UserSession.php` | `current?` → `isCurrent()`, `should_update_activity?` → `shouldUpdateActivity()`, hằng 5 phút giữ nguyên |
| `User` (`devise-two-factor`, `encrypts :otp_secret/:otp_backup_codes`) | `User::casts()` `encrypted` + `encrypted:array`, `mfaEnabled()`, `userSessions()`, hằng `OTP_LEEWAY_SECONDS` | |
| `Mfa::ManagementService` | `app/Services/Mfa/ManagementService.php` | enable/disable/verify_and_activate/provisioning_uri/generate+validate backup codes; giữ placeholder `XXXXXXXX` cho mã đã dùng và so sánh hằng thời gian (`hash_equals`) |
| `Mfa::AuthenticationService` | `app/Services/Mfa/AuthenticationService.php` | `validate_and_consume_otp!` → verify + ghi `consumed_timestep` (một mã dùng một lần) |
| `Mfa::TokenService` (JWT HS256, 5 phút) | `app/Services/Mfa/TokenService.php` | Encrypter Laravel (APP_KEY) thay JWT; vẫn 5 phút, payload `{user_id, exp}` |
| `UserSessionTrackingService` (gem `browser`) | `app/Services/UserSessionTrackingService.php` | Bảng mẫu UA tối giản; tên nền tảng khớp gem (`Generic Linux`, `macOS`, `Windows`, `Android`, `iOS`) |
| xoá token trong `users.tokens` để thu hồi | `app/Services/UserSessionRevoker.php` | Yona dùng session Laravel: xoá dòng ở bảng `sessions` + dòng `user_sessions`. Một nơi duy nhất cho mọi lối thu hồi |
| `Api::V1::Profile::MfaController` + 5 jbuilder | `app/Http/Controllers/WebApi/Profile/MfaController.php` | `before_action :check_mfa_feature_available` → middleware của controller (`HasMiddleware`) |
| `Api::V1::Profile::SessionsController` + jbuilder | `WebApi/Profile/SessionsController.php` + `app/Http/Resources/UserSessionResource.php` | |
| `DeviseOverrides::SessionsController` (MFA + `MAX_SESSIONS`) | `app/Http/Controllers/Auth/SessionsController.php` | `MAX_USER_SESSIONS=25` → `config('yona.max_user_sessions')` |
| base controller gọi `update_activity!` | `app/Http/Middleware/TrackUserSessionActivity.php` (nhóm `web`) | |
| `Chatwoot.mfa_enabled?` (khoá mã hoá) | `config('yona.mfa_enabled')` + `globalConfig.isMfaEnabled` | Laravel luôn có APP_KEY nên mặc định bật |
| — | `app/Support/CurrentUserSession.php` | Mới: nguồn duy nhất trả lời "request này thuộc phiên nào" (xem "Bẫy đã trả giá" #2) |

## Bảng trace Vue ↔ TSX

| Vue | TSX |
|---|---|
| `settings/profile/MfaSettings.vue` | `dashboard/settings/profile/mfa/MfaSettings.tsx` (trang Inertia) |
| `settings/profile/MfaStatusCard.vue` | `.../mfa/MfaStatusCard.tsx` |
| `settings/profile/MfaSetupWizard.vue` | `.../mfa/MfaSetupWizard.tsx` (+ `BackupCodesPanel.tsx` tách phần lưới mã dùng chung) |
| `settings/profile/MfaManagementActions.vue` | `.../mfa/MfaManagementActions.tsx` |
| `settings/profile/MfaSettingsCard.vue` | `dashboard/settings/profile/MfaSettingsCard.tsx` |
| `settings/profile/ActiveSessions.vue` | `dashboard/settings/profile/ActiveSessions.tsx` |
| `components/auth/MfaVerification.vue` | `dashboard/components/auth/MfaVerification.tsx` |
| `components/auth/SessionLimitOverlay.vue` | `dashboard/components/auth/SessionLimitOverlay.tsx` |
| `v3/views/login/Index.vue` (nhánh MFA + session limit) | `resources/js/v3/views/login/Index.tsx` |
| `dashboard/api/mfa.js` | `dashboard/settings/profile/mfa/mfaApi.ts` |
| `shared/helpers/clipboard.js#handleOtpPaste` | `shared/helpers/clipboard.ts#handleOtpPaste` |
| i18n `en/mfa.json` | `lang/en/mfa_settings.php` + `lang/en/mfa_verification.php` (một file = một namespace) |
| i18n `en/sessionLimit.json` | `lang/en/session_limit.php` |
| `en.yml` `errors.mfa.*`, `profile_settings.sessions.cannot_revoke_current` | `lang/en/errors.php` khối `mfa` + `sessions` |

## Trace spec ↔ Pest / vitest

| Spec gốc | Test Yona | Số test |
|---|---|---|
| `spec/models/user_session_spec.rb` | `tests/Feature/Models/UserSessionTest.php` | 5 |
| `spec/services/mfa/authentication_service_spec.rb` | `tests/Feature/Services/Mfa/AuthenticationServiceTest.php` | 7 |
| `spec/services/mfa/token_service_spec.rb` | `tests/Feature/Services/Mfa/TokenServiceTest.php` | 6 |
| `spec/requests/api/v1/profile/mfa_controller_spec.rb` | `tests/Feature/WebApi/Profile/MfaControllerTest.php` | 17 |
| `spec/requests/api/v1/profile/sessions_controller_spec.rb` | `tests/Feature/WebApi/Profile/SessionsControllerTest.php` | 8 |
| `spec/controllers/devise_overrides/sessions_controller_spec.rb` (MFA + session limit) | `tests/Feature/Auth/MfaLoginTest.php` | 12 |
| `components/auth/MfaVerification.spec.js` | `resources/js/dashboard/components/auth/MfaVerification.test.tsx` | 4 |
| — (không có spec gốc) | `resources/js/dashboard/components/auth/SessionLimitOverlay.test.tsx` | 3 |

## Khác biệt cố ý

1. **Trạng thái MFA về qua prop Inertia, không phải 206/409 JSON.** Chatwoot là API token
   (devise_token_auth) nên trả JSON; Yona đăng nhập bằng session + Inertia. Nội dung
   giống hệt (`mfaRequired`/`mfaToken`/`sessionsLimitReached`/`sessions`).
2. **`otp_secret` mất ràng buộc UNIQUE và đổi sang `text`.** Chatwoot mã hoá xác định
   (deterministic) nên vẫn unique được; cast `encrypted` của Laravel không xác định →
   ràng buộc vô nghĩa và chuỗi dài quá `varchar(255)`.
3. **Mã dự phòng lưu ở dạng mã hoá, không băm.** Bản v4.17.1 làm đúng như vậy
   (`encrypts :otp_backup_codes` + `secure_compare`), khác với mô tả "băm" trong giao việc.
   Đã giữ nguyên hành vi nguồn: so sánh hằng thời gian, mã đã dùng thay bằng `XXXXXXXX`.
4. **`mfa_token` mã hoá bằng APP_KEY thay vì JWT HS256.** Cùng thời hạn 5 phút, cùng payload.
   Không thêm dependency JWT chỉ để phục vụ một token nội bộ.
5. **Không lọc phiên theo hạn token.** Chatwoot phải lọc `users.tokens` còn hạn; ở Yona mỗi
   dòng `user_sessions` ứng với một phiên Laravel còn sống nên không có khái niệm token hết hạn.
   Cũng vì thế bỏ nhánh "token chưa được theo dõi" (`evict_oldest_token`) — dữ liệu di sản đó không tồn tại.
6. **Màn chọn phiên luôn hiện với trình duyệt.** Chatwoot phân biệt `browser_request?` để
   client không phải trình duyệt tự bỏ phiên cũ; mặt tiền `/app/login` của Yona chỉ phục vụ trình duyệt.
   Đường đăng nhập sau bước OTP vẫn tự bỏ phiên cũ nhất như gốc.
7. **`MfaVerification` xoá ô nhập ngay khi gửi** (gốc xoá khi server báo lỗi). Kết quả nhìn thấy
   như nhau vì gửi đúng thì chuyển trang; cách này tránh lần thử sau tự gửi lại mã cũ.
8. **`LowBackupCodesBanner` chưa port** — banner cảnh báo sắp hết mã dự phòng nằm trong khung
   shell dashboard, không thuộc màn nào của F8. API đã trả `remaining_backup_codes` sẵn.
9. **Chưa port**: `UserSessionIpLookupJob` (điền city/country từ IP — cần khoá IP lookup, cột đã có),
   header client di động `X-Chatwoot-Client-*` (chưa có app di động), `two_factor_provisioning_uri`
   dùng `config('app.name')` làm issuer thay chuỗi cứng `Chatwoot`.
10. **Chuỗi `profile_settings.sessions.cannot_revoke_current` chuyển vào `errors.sessions`**
    để không đụng namespace `PROFILE_SETTINGS` của bundle FE.

## Bẫy đã trả giá

1. **`Inertia::render` không khớp kiểu trả về `SymfonyResponse`.** `Inertia\Response` không kế thừa
   `Symfony\...\Response` → 500 câm. Phải khai báo `SymfonyResponse|Response`.
2. **Không được đọc `session()->getId()` rải rác.** Id phiên xoay mỗi lần `regenerate()`
   (đăng nhập, đổi mật khẩu) nên chỗ này ghi id A, chỗ kia đọc id B → không dòng nào là
   "phiên hiện tại", và trong Pest (driver `array`) id đổi sau MỖI request nên test luôn đỏ.
   Đã gom về `App\Support\CurrentUserSession`: id được ghi vào payload phiên lúc đăng nhập
   và mọi nơi đọc lại từ đó.
3. **Lỗi mã OTP KHÔNG được ném `ValidationException`.** Redirect-back của Inertia dựng lại
   trang login bằng GET → mất `mfaRequired`/`mfaToken`, người dùng rơi về form mật khẩu và
   không thấy lỗi. Phải dựng lại trang kèm prop `mfaError`. E2E bắt được lỗi này.
4. **`onSuccess` của `router.post` vẫn chạy khi server trả bước OTP** (đó là response 200 hợp lệ)
   → snackbar "đăng nhập thành công" sai. Phải kiểm prop trong `onSuccess`.
5. **otphp bắt `leeway < period`.** `otp_allowed_drift = 30` của devise-two-factor không truyền
   thẳng được (period cũng 30) → dùng 29.
6. **Một file `lang/en/*.php` = MỘT namespace** (`i18n:generate` lấy tên file viết hoa làm namespace).
   Ban đầu gộp `mfa.php` chứa cả `MFA_SETTINGS` lẫn `MFA_VERIFICATION` → key thành `MFA.MFA_SETTINGS.*`,
   giao diện hiện nguyên key. Phải tách hai file.
7. **`assertInertia` không dùng được cho POST tới trang có Blade + Vite manifest** — request không
   kèm header `X-Inertia` sẽ render Blade và 500 trong môi trường test. Gửi kèm `X-Inertia: true`
   rồi assert thẳng JSON `component`/`props`.
8. **`migrate:rollback --step=1` lùi migration của agent khác** (cùng batch). Đã tách phần sửa
   bảng `users` ra migration riêng thay vì rollback.
9. **Pixel-diff toàn viewport trên trang profile là vô nghĩa** — Yona chưa port Audio Alerts và
   Access Token, oracle giấu Security. Phải chụp riêng khối `<section>` của mục cần so.

## Phụ thuộc thêm

- composer `spomky-labs/otphp` ^11.5 — thư viện TOTP/HOTP theo RFC 6238, tương đương ROTP mà
  `devise-two-factor` dùng; API `TOTP::generate()/createFromSecret()/verify()/getProvisioningUri()`
  khớp 1-1 với các lời gọi ở bản gốc, không kéo theo dependency nào ngoài base32.
- pnpm `qrcode` ^1.5.4 + `@types/qrcode` — đúng thư viện `MfaSetupWizard.vue` gốc dùng để
  vẽ QR từ provisioning URI ở phía client.

## Kết quả gate

| Gate | Kết quả |
|---|---|
| Pest (DB riêng `yona_rw_test_f8`, đã `dropdb` sau khi xong) | Toàn suite **1761/1766**. 85 test của F8 (59 mới + các test A1 sẵn có trong `tests/Feature/Auth`) xanh hết khi chạy riêng. 5 test đỏ đều ở `DialogflowProcessorServiceTest` (vùng agent khác, **xanh 11/11 khi chạy riêng** → phụ thuộc thứ tự chạy, không liên quan F8) |
| `vendor/bin/pint` theo file | passed |
| `php artisan migrate` trên `yona_rw` | 2 migration chạy xong |
| `npx tsc --noEmit` | sạch |
| `npx vitest run` | 82 file / 665 test xanh (gồm 7 test mới của F8) |
| `pnpm run build` | Xanh với toàn bộ code F8 (lần build cuối trước khi chốt). Lần chạy lại sau đó **đỏ vì file của agent khác**: `resources/scss/vendor/_administrate.scss` (untracked, thuộc nhóm super admin) có star hack CSS `*display: inline;` → lightningcss `SyntaxError: Unexpected token Semicolon`. Không sửa hộ; cách xử lý là bỏ hack đó hoặc bật `css.lightningcss.errorRecovery` |
| audit-buttons `/profile/mfa` | 2/2 nút phản hồi (`Profile Settings` back, `Enable Two-Factor Authentication`) |
| audit-buttons `/profile/settings` | 1/1 nút trong viewport (`Update Profile`) — nút của mục Security/Sessions nằm dưới màn hình nên script không quét tới |
| pixel-diff `f8-mfa-ui.mjs` | `sessions` **0.000%**, `security` **0.000%**, `mfa-off` **0.030%** (light + dark) — đều ĐẠT |
| pixel-diff `mfa-setup` / `mfa-backup` / `mfa-on` / `login-otp` | **CHƯA CHẤM ĐƯỢC** — xem mục dưới |
| e2e `f8-mfa-e2e.mjs` | **11/11 bước đạt** |

### Vì sao 4 trạng thái pixel-diff còn nợ

`podman exec oracle-rails … puts Chatwoot.mfa_enabled?` trả **false**: container oracle chạy
không có `ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY` / `_DETERMINISTIC_KEY` / `_KEY_DERIVATION_SALT`,
nên mọi endpoint MFA của oracle trả 403 và không dựng được các trạng thái cần gọi API.
Script đã ép cờ FE `window.chatwootConfig.isMfaEnabled` để so được ba màn KHÔNG cần API
(`security`, `mfa-off`, `sessions`).

**Cần phiên chính quyết**: thêm ba biến môi trường đó cho `oracle-rails` (phải tạo lại container —
việc này ảnh hưởng các agent đang dùng oracle nên agent F8 không tự làm). Sau khi có,
chạy `node ~/www/pixel-diff/f8-mfa-ui.mjs mfa-setup mfa-backup mfa-on login-otp` là chấm được ngay.

## Kịch bản "Test ngay" cho founder

1. `/app/accounts/2/profile/settings` → cuộn tới **Security** → bấm **Manage Two-Factor Authentication**.
2. Bấm **Enable Two-Factor Authentication** → quét QR bằng Google Authenticator (hoặc mở
   "Can't scan? Enter code manually" để chép khoá) → nhập 6 số → **Verify & Continue**.
3. Lưu 10 mã dự phòng (Download / Copy All) → tick xác nhận → **Complete Setup**.
4. Đăng xuất → đăng nhập lại: nhập sai mã → báo lỗi ngay trong khung; nhập đúng → vào dashboard.
5. Đăng xuất → đăng nhập → tab **Backup Code** → dán một mã dự phòng → vào được; mã đó
   không dùng lại được lần hai.
6. Trong `/profile/mfa`: **Regenerate Backup Codes** (nhập mã TOTP) → hiện bộ mã mới.
7. **Disable Two-Factor Authentication** → nhập mật khẩu + mã TOTP (hoặc chuyển sang mã dự phòng) → 2FA tắt.
8. Phiên: đăng nhập cùng tài khoản ở một trình duyệt khác → `/profile/settings` mục
   **Active Sessions** hiện 2 dòng (dòng của mình có nhãn *Current session*) → **Revoke** dòng kia →
   trình duyệt kia thao tác tiếp sẽ bị đá về `/app/login`.

## Ghi chú vận hành

- Script pixel-diff xoá `user_sessions` của `john@acme.inc` ở CẢ hai bên trước mỗi lần chụp
  (chỉ xoá dòng theo dõi, không thu hồi cookie) để nhãn "N phút trước" và số dòng khớp nhau.
- `f8-mfa-e2e.mjs` tạo và **xoá** tài khoản `mfa-f8@acme.inc`; không bật MFA cho `john@acme.inc`.
  Kịch bản `mfa-setup`/`mfa-backup` của `f8-mfa-ui.mjs` có bật 2FA cho john ở Yona nên script
  tự trả cột `otp_*` về rỗng sau khi chụp.
- File dùng chung đã sửa (rất nhỏ, cộng thêm): `bootstrap/app.php` (đăng ký middleware),
  `config/yona.php` (`mfa_enabled`, `max_user_sessions`), `app/Http/Middleware/HandleInertiaRequests.php`
  (`globalConfig.isMfaEnabled`), `resources/js/types/index.ts`, `resources/js/dashboard/helper/apiClient.ts`
  (`deleteJson` nhận body, `parseApiErrorMessage` đọc thêm `body.error`),
  `database/factories/UserFactory.php` (state `withMfa`), `lang/en/errors.php`.
- Route F8 nằm trong nhóm `/api/v1` **không gắn account** ở đầu `routes/web_api.php` (đúng gốc);
  khối `// F8 …` sẵn có trong nhóm account-scoped được để trống kèm chú thích.
