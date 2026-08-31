# Trace A1 — Skeleton + design system + trang Login

Nguồn: Chatwoot v4.17.1 (`refs/chatwoot`). Ngày: 31/08/2026.

## Bảng trace nguồn → đích

### Design tokens (port nguyên, quyết định #11)

| Chatwoot | Yona | Ghi chú |
|---|---|---|
| `tailwind.config.js` | `tailwind.config.js` | Giữ nguyên toàn bộ theme/plugin; chỉ đổi `content` globs sang `resources/js` |
| `theme/colors.js` | `theme/colors.js` | Copy verbatim |
| `theme/icons.js` | `theme/icons.js` | Copy verbatim (256 icon woot) |
| `dashboard/assets/scss/_next-colors.scss` | `resources/scss/_next-colors.scss` | Copy verbatim |
| `dashboard/assets/scss/_base.scss` | `resources/scss/_base.scss` | Copy verbatim |
| `dashboard/assets/scss/_woot.scss` | `resources/scss/app.scss` | Port phần áp dụng (tailwind directives, fonts, next-colors, base, html/body font, .tooltip); `plugins/date-picker` chưa cần |
| `shared/assets/fonts/inter.scss` + `InterDisplay/inter-display.scss` | `resources/scss/_fonts.scss` | Đổi url sang `resources/fonts/`; Inter variable + InterDisplay 9 weight ×2 style |
| `shared/assets/fonts/{Inter,InterDisplay}/*.woff2` | `resources/fonts/…` | Copy verbatim |

### Backend

| Ruby | PHP | Ghi chú |
|---|---|---|
| `db/schema.rb` bảng `users` | `database/migrations/0001_01_01_000000_create_users_table.php` | Đủ cột Chatwoot. Khác biệt: `encrypted_password`→`password` (chi tiết Devise); `reset_password_token/sent_at`→bảng `password_reset_tokens` (idiom Laravel); `tokens` json (devise_token_auth) BỎ — session auth + bảng `access_tokens` dựng ở B3; `remember_created_at`→`remember_token`; index email unique (Chatwoot validate app-level) |
| `app/models/user.rb` | `app/Models/User.php` | email downcase, uid=email, pubsub_token tự sinh + xoay khi đổi password (port user_spec). STI SuperAdmin: cột `type` sẵn, model ở F7. MFA: cột otp_* sẵn, logic ở F8 |
| `DeviseOverrides::SessionsController` + devise | `app/Http/Controllers/Auth/SessionsController.php` | Session Laravel thay devise_token_auth (JSON token). Trackable (sign_in_count/ip/at) port. Unconfirmed bị chặn đăng nhập, message chứa email (spec parity); `error_code=user_not_confirmed` + redirect verify-email làm ở A2/A5 |
| `spec/controllers/devise/session_controller_spec.rb` | `tests/Feature/Auth/SessionsControllerTest.php` | Port: invalid credentials, unconfirmed, valid, special-char password, + track sign-in, throttle, logout, guest redirect. CHƯA port: `sso_auth_token` (F8), `data.accounts[].permissions` (cần accounts — A2) |
| `spec/models/user_spec.rb` (pubsub_token, email) | `tests/Feature/Models/UserTest.php` | Port phần pubsub_token + email normalization |
| `db/seeds.rb` (john@acme.inc / Password1!) | `database/seeders/DatabaseSeeder.php` | Seed user parity |
| ENV `ENABLE_ACCOUNT_SIGNUP` | `config/yona.php` `signup_enabled` | Mặc định false tới A2 |

### Frontend (Vue → React)

| Vue | React | Ghi chú |
|---|---|---|
| `v3/views/login/Index.vue` | `resources/js/v3/views/login/Index.tsx` | CHƯA port (chưa có ở A1): GoogleOAuthButton, SAML link, MfaVerification (F8), SessionLimitOverlay (EE-adjacent), sso_auth_token props. Signup link render theo `signupEnabled` (A2 bật) |
| `v3/components/Form/Input.vue` | `v3/components/Form/Input.tsx` | Đủ password toggle; icon fluent trái chưa cần |
| `v3/components/Form/WithLabel.vue` | `v3/components/Form/WithLabel.tsx` | Slot icon fluent bỏ (chưa màn nào dùng) |
| `v3/components/Divider/SimpleDivider.vue` | `v3/components/Divider/SimpleDivider.tsx` | |
| `v3/components/SnackBar/{Container,Item}.vue` | `v3/components/SnackBar/{Container,Item}.tsx` | transition-group → animate-fade-in-up |
| `dashboard/components-next/button/Button.vue` + `constants.js` | `dashboard/components-next/button/Button.tsx` + `constants.ts` | STYLE_CONFIG giữ nguyên chuỗi class; shorthand boolean giữ để call-site giống template gốc |
| `dashboard/components-next/{icon/Icon,spinner/Spinner}.vue` | cùng đường dẫn `.tsx` | |
| `shared/components/Spinner.vue` | `shared/components/Spinner.tsx` + style trong `app.scss` | Scoped scss → global `.spinner` (giữ nguyên rule) |
| `dashboard/composables/useAlert` (bus SHOW_TOAST) | `dashboard/composables/useAlert.ts` + `shared/helpers/emitter.ts` | mitt → emitter tối giản |
| `shared/composables/useBranding.js` | `shared/composables/useBranding.ts` | "Login to Chatwoot" → "Login to Yona" |
| `dashboard/helper/themeHelper.js` | script inline `resources/views/app.blade.php` | class `dark` trên `<body>`, key LS `color_scheme`, 3 chế độ auto/light/dark |
| i18n `en/login.json` (vue-i18n) | `resources/js/i18n/` | Copy json verbatim; `t()` tối giản; i18n đầy đủ + vi ở G3 |
| `entrypoints/v3app.js` | `resources/js/app.tsx` | Inertia + createRoot thay Vue app + router (Inertia routing server-driven) |

## Trạng thái DoD A1
- (a) Pest port xanh: ✅ 15/15 (`tests/Feature/Auth`, `tests/Feature/Models`)
- (b) Bảng trace: ✅ (file này)
- (c) Pixel-diff: ⚠️ CHƯA chạy được — máy dev không có docker nên chưa dựng được oracle Chatwoot local (Giao thức #2). Port class-for-class từ template gốc + đối chiếu DOM. Cần founder quyết: cài docker hoặc chấp nhận đối chiếu tay.
- (d) Founder bấm "Test ngay": ⏳ chờ founder — kịch bản: mở `/app/login` (light+dark), login `john@acme.inc` / `Password1!` → dashboard placeholder, logout, login sai thấy snackbar đỏ chữ trắng + form rung (wiggle).

## Ghi chú môi trường
- DB dev `yona_rw`, test `yona_rw_test` (đã tạo, pg_trgm bật). Main giữ `yona` không đụng.
- Logo `public/brand-assets/logo{,-dark}.svg` là wordmark placeholder — founder thay khi có brand asset chính thức.
- Pint lỡ format `refs/crm` (untracked, chỉ formatting) trước khi thêm exclude vào `pint.json` — không ảnh hưởng `refs/chatwoot`.
