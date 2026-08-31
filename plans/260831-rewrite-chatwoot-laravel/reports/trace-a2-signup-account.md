# Trace A2 — Signup + tạo Account + onboarding

Nguồn: Chatwoot v4.17.1 (`refs/chatwoot`). Ngày: 31/08/2026.

## Bảng trace nguồn → đích

### Backend

| Ruby | PHP | Ghi chú |
|---|---|---|
| `db/schema.rb` bảng `accounts` | `database/migrations/0001_01_01_000003_create_accounts_table.php` | Khác biệt theo quyết định plan: `feature_flags` bigint bitset (FlagShihTzu) → jsonb (quyết định #8, bỏ `feature_flags_ext_1`); `locale` int enum → string iso code |
| `db/schema.rb` bảng `account_users` | cùng migration | Bỏ cột EE: `custom_role_id`, `agent_capacity_policy_id` |
| Trigger hairtrigger `create sequence conv/camp_dpid_seq_<id>` (account.rb) | Trigger PG `accounts_after_insert_row_tr` trong migration | Y hệt hành vi (quyết định #7); drop sequence khi xóa account = model `deleted` callback (như Ruby callback) |
| `app/models/account.rb` | `app/Models/Account.php` | Port phần A2: status enum, onboarding_step helpers. Settings schema/store_accessor/Featurable vào các nhóm sau |
| `app/models/account_user.rb` | `app/Models/AccountUser.php` | Role agent=0/administrator=1, permissions(). Notification setting + presence Redis + events AGENT_ADDED vào D5/B4 |
| `app/builders/account_builder.rb` | `app/Builders/AccountBuilder.php` | Port đủ flow validate → transaction → account + user + admin link + `onboarding_step=account_details`. `SignUpEmailValidationService`: valid-email + BLOCKED_EMAIL_DOMAINS port; check disposable (gem valid_email2) BỎ — ghi nhận |
| `api/v1/accounts_controller.rb#create` | `app/Http/Controllers/Auth/RegistrationsController.php` | check_signup_enabled → 404 y hệt; hCaptcha BỎ (chưa cấu hình); response {email} → redirect verify-email (session flash). Nhánh "user đã đăng nhập tạo account thêm" chưa port (vào A3 switch account) |
| Devise confirmable + `DeviseOverrides::ConfirmationsController` | `Auth/ConfirmationsController` + `App\Notifications\ConfirmationInstructions` | Link confirm → confirmed_at + auto login (Chatwoot: confirm → sso_auth_token auto-login — cùng end-behavior). Template mail Chatwoot port ở D5 |
| `api/v1/accounts/onboardings_controller.rb` | `app/Http/Controllers/App/OnboardingsController.php` | Self-hosted: chỉ bước `account_details` rồi finish (nhánh cloud `inbox_setup` + WebWidgetCreationService bỏ đúng như `ChatwootApp.chatwoot_cloud?` false); guard replay stale giữ nguyên |
| Router guard accounts/onboarding (dashboard routes/index.js) | `App/DashboardController` | `/app` → account đầu tiên; không account → NoAccounts; onboarding_step + admin → redirect onboarding (server-side thay router guard) |
| `db/seeds.rb` | `database/seeders/DatabaseSeeder.php` | john@acme.inc + account Acme Inc (admin, đã qua onboarding) |

### Tests (RSpec → Pest)

| RSpec | Pest |
|---|---|
| `spec/builders/account_builder_spec.rb` | `tests/Feature/Builders/AccountBuilderTest.php` (+ test sequence trigger) |
| `spec/controllers/api/v1/accounts_controller_spec.rb` (create) | `tests/Feature/Auth/RegistrationsControllerTest.php` |

### Frontend (Vue → React)

| Vue | React | Ghi chú |
|---|---|---|
| `v3/views/auth/signup/Index.vue` | `resources/js/v3/views/auth/signup/Index.tsx` | Testimonials (chỉ Chatwoot cloud) bỏ; bg + overlay + card y nguyên class |
| `signup/components/Signup/Form.vue` | `.../components/Signup/Form.tsx` | hCaptcha + GoogleOAuth bỏ; **company-email-validator bỏ chủ đích** — SME VN dùng gmail (khác gốc, ghi nhận product-fit); account_name/full_name suy từ email như `getCredentialsFromEmail` |
| `signup/components/Signup/PasswordRequirements.vue` | `.../PasswordRequirements.tsx` | |
| `v3/views/auth/verify-email/Index.vue` | `.../verify-email/Index.tsx` | hCaptcha bỏ; resend qua POST session |
| `v3/views/auth/confirmation/Index.vue` (spinner rồi POST confirm) | Server-side confirm trực tiếp trong `ConfirmationsController` | Trang spinner không cần — GET link là confirm luôn |
| `dashboard/routes/dashboard/onboarding/Index.vue` | `resources/js/dashboard/onboarding/Index.tsx` | Enrichment (Firecrawl brand-info, cloud) bỏ → không spinner "Setting up"; language options: en + vi (Chatwoot dùng config 57 locale — mở rộng ở G3) |
| `onboarding/shared/OnboardingLayout.vue`, `OnboardingSection.vue` | cùng đường dẫn `.tsx` | SVG timeline + grid + connector y nguyên |
| `onboarding/account-details/OnboardingFormRow.vue`, `OnboardingFormSelect.vue` | cùng đường dẫn `.tsx` | |
| `onboarding/shared/constants.js` | `constants.ts` | Copy verbatim |
| `components-next/avatar/Avatar.vue` | `components-next/avatar/Avatar.tsx` | Port đủ (initials/màu theo độ dài tên/badge status/upload); `inbox` + ChannelIcon vào B1 |
| `components-next/inline-input/InlineInput.vue` | `InlineInput.tsx` | |
| `_woot.scss` typography utilities + `#app` + `custom-dashed-border` + `no-scrollbar` | `resources/scss/app.scss` | Bổ sung phần thiếu từ A1 |
| i18n `signup.json`, `onboarding.json`, `setNewPassword.json` | `resources/js/i18n/locale/en/` | Copy verbatim |

## Trạng thái DoD A2
- (a) Pest port xanh: ✅ 32/32 toàn suite
- (b) Bảng trace: ✅ (file này)
- (c) Pixel-diff: ⚠️ như A1 — chưa có oracle docker
- (d) Founder "Test ngay": ⏳ — kịch bản: bật `ENABLE_ACCOUNT_SIGNUP=true` (đã bật dev), mở `/app/auth/signup`, đăng ký email mới → màn "Check your inbox" → lấy link confirm trong `storage/logs/laravel.log` (mailer dev = log) → click → vào onboarding "Hello …" → điền website + chọn role/timezone → Continue → dashboard account. Đăng nhập john@acme.inc vẫn vào Acme Inc.

## Ghi chú
- Mailer dev = `log` — link xác nhận nằm trong `storage/logs/laravel.log`. Muốn bấm trong hộp thư thật: cài mailpit rồi đổi `MAIL_MAILER=smtp`, `MAIL_PORT=1025`.
- E2E trình duyệt phiên này đã chạy: signup founder@yona.vn → confirm → onboarding (role/website/vi/Asia_Saigon) → dashboard; dữ liệu account đúng trong DB.
