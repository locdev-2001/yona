# F7 — Platform API + Super Admin console

Agent `f7`, 06/09/2026. Nguồn: `refs/chatwoot` v4.17.1 (không mở `enterprise/`).

## Cách founder đăng nhập Super Admin

- URL: **http://localhost:8000/super_admin** (chưa đăng nhập sẽ nhảy sang `/super_admin/sign_in`).
- Tài khoản dev: **john@acme.inc / Password1!** — cùng tài khoản agent, đã được nâng lên super admin
  (STI `users.type = 'SuperAdmin'`, đúng cơ chế bản gốc). Oracle cũng dùng đúng email/mật khẩu này.
- Tạo/nâng người khác: `php artisan super-admin:create <email> --password='...' [--name='...']`.
- Phiên super admin dùng **guard riêng** `super_admin`: đăng nhập console KHÔNG làm mất phiên agent và
  ngược lại; đăng xuất console (`/super_admin/logout`) không đá người dùng khỏi `/app`.

## Bảng trace Ruby ↔ PHP

| Chatwoot | Yona | Ghi chú |
|---|---|---|
| `db/schema.rb` `platform_apps`, `platform_app_permissibles`, `installation_configs` | `database/migrations/2026_09_06_996000_create_platform_apps_and_installation_configs_tables.php` | giữ nguyên tên index `index_platform_app_permissibles_on_permissibles`, `unique_permissibles_index`; `super_admins` KHÔNG phải bảng riêng — bản gốc là STI trên `users.type` (cột đã có sẵn từ A1) |
| `app/models/platform_app.rb` | `app/Models/PlatformApp.php` | `AccessTokenable` → hook `created` sinh token 24 ký tự; `permits()`/`permit()` thay cho `platform_app_permissibles.find_by/find_or_create_by` |
| `app/models/platform_app_permissible.rb` | `app/Models/PlatformAppPermissible.php` | quan hệ đa hình; unique (app, permissible) do DB giữ |
| `app/models/super_admin.rb` (`class SuperAdmin < User`) | `app/Models/SuperAdmin.php` | STI bằng global scope `users.type = 'SuperAdmin'` + hook `creating` gán type |
| `app/models/installation_config.rb` | `app/Models/InstallationConfig.php` | `serialized_value.value` qua accessor `value`; `scopeEditable` = `locked = false`; `RESTART_REQUIRED_CONFIG_KEYS` giữ nguyên |
| `config/installation_config.yml` (104 mục) | `config/installation_config.php` | chuyển máy móc sang mảng PHP (repo không có parser YAML) |
| `app/models/concerns/sso_authenticatable.rb` | `app/Models/Concerns/SsoAuthenticatable.php` (trait trên `User`) | token 32 byte hex, TTL 5 phút; Redis::Alfred → `Cache` |
| `app/controllers/platform_controller.rb` | `app/Http/Middleware/AuthenticatePlatformApp.php` + `app/Http/Controllers/Platform/Api/V1/PlatformController.php` | `ensure_access_token`/`set_platform_app` thành middleware (401 `Invalid access_token`); `validate_platform_app_permissible` thành `denyUnlessPermissible()` (401 `Non permissible resource`) |
| `platform/api/v1/accounts_controller.rb` | `Platform/Api/V1/AccountsController.php` | `features` bật/tắt `feature_flags`; `destroy` đẩy `DeleteObjectJob` |
| `platform/api/v1/users_controller.rb` | `Platform/Api/V1/UsersController.php` | `User.from_email || User.new` + `skip_confirmation!` = gán `confirmed_at`; `login` trả `generateSsoLink()`; `update` gộp `custom_attributes` |
| `platform/api/v1/account_users_controller.rb` | `Platform/Api/V1/AccountUsersController.php` | `find_or_initialize_by(user_id:)`, `destroy` theo `user_id` trong body |
| `platform/api/v1/agent_bots_controller.rb` | `Platform/Api/V1/AgentBotsController.php` | `avatar_url` → `AvatarFromUrlJob` (đã có từ trước) |
| `platform/api/v1/email_channel_migrations_controller.rb` | — | **bỏ theo giao việc** |
| `app/views/platform/api/v1/models/_{account,user,agent_bot}.json.jbuilder` + `users/token` | `app/Http/Resources/Platform/Platform{Account,User,AgentBot}Resource.php` | giữ đúng thứ tự khoá và `active_account_user` (`active_at DESC NULLS LAST`) |
| `config/routes.rb` `namespace :platform` | khối `// F7 Platform API` trong `routes/api.php` | đường dẫn công khai `/platform/api/v1/*` — xem "Khác biệt cố ý" #1 |
| `Administrate::BaseDashboard` + `app/dashboards/*.rb` | `app/Support/SuperAdmin/Dashboard.php` + `Dashboards/*Dashboard.php` | mỗi tài nguyên khai báo một chỗ: kiểu field, cột bảng, trường trang xem/biểu mẫu, bộ lọc, hành động khả dụng |
| tầng Field của Administrate (`Field::*`, `AvatarField`, `SecretField`, `CountField`, `SerializedField`, `AccountStatusField`, `SuspensionHistoryField`, `ConfirmedAtField`) | `app/Support/SuperAdmin/FieldPresenter.php` + `resources/js/superadmin/components/FieldValue.tsx` | một chỗ dựng payload, một chỗ vẽ |
| `Administrate::ApplicationController` (index/show/new/edit/create/update/destroy, `order`, search, filter) | `app/Http/Controllers/SuperAdmin/ResourceController.php` | 6 controller con chỉ khai báo dashboard + phần đặc thù |
| `super_admin/accounts_controller.rb` | `SuperAdmin/AccountsController.php` | `validate_suspension_metadata` + `apply_suspension_metadata` + `seed` + `reset_cache` + `destroy` qua `DeleteObjectJob` |
| `super_admin/users_controller.rb` | `SuperAdmin/UsersController.php` | mật khẩu để trống = giữ nguyên; `destroy_avatar`; `resend_confirmation`; `impersonate` |
| `super_admin/account_users_controller.rb` | `SuperAdmin/AccountUsersController.php` | `show` chuyển hướng sang trang user, `create`/`destroy` quay lại trang trước |
| `super_admin/{access_tokens,agent_bots,platform_apps,installation_configs}_controller.rb` | cùng tên trong `app/Http/Controllers/SuperAdmin/` | `installation_configs` chỉ thao tác bản ghi `locked = false` và luôn ghi lại `locked = false` |
| `super_admin/app_configs_controller.rb` | `SuperAdmin/AppConfigsController.php` | `GENERAL_CONFIGS` + bảng `mapping` (bỏ mục EE/cloud: captain, linear, notion, meta incident) |
| `super_admin/settings_controller.rb` + `SuperAdmin::FeaturesHelper` | `SuperAdmin/SettingsController.php` | CE chỉ còn danh sách mục cấu hình (khối gói cước/billing là enterprise) |
| `super_admin/instance_statuses_controller.rb` | `SuperAdmin/InstanceStatusesController.php` | phiên bản, Postgres alive, migration pending, thông số Redis |
| `super_admin/dashboard_controller.rb` | `SuperAdmin/DashboardController.php` | cache 30 phút, ước lượng số hội thoại bằng `pg_class.reltuples` như bản gốc |
| `super_admin/devise/sessions_controller.rb` + `devise_for :super_admins` | `SuperAdmin/SessionsController.php` + guard `super_admin` trong `config/auth.php` | |
| `devise_overrides/sessions_controller.rb` (`process_sso_auth_token`) | `app/Http/Controllers/Auth/SsoSessionsController.php` | token dùng một lần rồi bị xoá — xem "Khác biệt cố ý" #2 |
| khối `super_admin:` trong `config/locales/en.yml` (bỏ `captain_model_overrides` là EE) | `lang/en/super_admin.php` | nguồn duy nhất cho chuỗi phía máy chủ của console (nhãn lý do đình chỉ, thông báo gửi lại thư xác nhận) |
| `entrypoints/superadmin.js#initializeAccountSuspensionForm` | `depends_on` của trường biểu mẫu + lọc trong `resource/Form.tsx` | hai trường lý do đình chỉ chỉ hiện khi chọn trạng thái `suspended` |
| `super_admin/{push_diagnostics,platform_banners}_controller.rb` | — | **bỏ**: push diagnostics phụ thuộc FCM (chưa port, nợ D5), platform banners chỉ hiện trên bản cloud (`ChatwootApp.chatwoot_cloud?`) |

## Bảng trace ERB/Vue ↔ TSX

| Chatwoot | Yona | Ghi chú |
|---|---|---|
| layout Administrate + `super_admin/application/_navigation.html.erb`, `_nav_item`, `_settings_menu` | `resources/views/superadmin.blade.php` + `resources/js/superadmin/components/Layout.tsx` | giữ nguyên chuỗi class Tailwind của bản gốc |
| `super_admin/application/_icons.html.erb` (sprite) | `resources/js/superadmin/components/IconSprite.tsx` | 16 symbol đang dùng, trích thẳng từ sprite oracle |
| CSS gem Administrate + `administrate-field-active_storage` | `resources/scss/vendor/_administrate.scss` | vendor nguyên văn (MIT), chỉ gỡ một star-hack IE (`*display:inline`) mà lightningcss không parse được |
| `dashboard/assets/scss/super_admin/index.scss` | `resources/scss/superadmin-auth.scss` (+ `superadmin.scss` = Administrate + file này) | |
| `administrate/application/index.html.erb` + `_search`, `_filters`, `_collection`, `_pagination` | `resources/js/superadmin/resource/Index.tsx` | |
| `administrate/application/show.html.erb`, `super_admin/{accounts,users}/show.html.erb`, `shared/_account_user_form`, `users/_impersonate`, `accounts/_reset_cache`, `_seed_data` | `resources/js/superadmin/resource/Show.tsx` | |
| `administrate/application/{new,edit,_form}.html.erb` | `resources/js/superadmin/resource/Form.tsx` | |
| `superadmin_pages/views/dashboard/Index.vue` | `resources/js/superadmin/pages/Dashboard.tsx` | dùng lại `shared/components/charts/BarChart` do `d2-fe-charts` port (không dựng chart riêng) |
| `super_admin/devise/sessions/new.html.erb` | `resources/js/superadmin/pages/Login.tsx` | layout riêng `superadmin_auth.blade.php` — bản gốc cũng không nạp CSS Administrate ở màn này |
| `super_admin/{settings,app_configs,instance_statuses}/show.html.erb` | `pages/{Settings,AppConfig,InstanceStatus}.tsx` | |

## Spec ↔ Pest

| RSpec bản gốc | Pest |
|---|---|
| `spec/controllers/platform/api/v1/accounts_controller_spec.rb` | `tests/Feature/Platform/AccountsControllerTest.php` (7) |
| `.../users_controller_spec.rb` | `tests/Feature/Platform/UsersControllerTest.php` (7) |
| `.../account_users_controller_spec.rb` | `tests/Feature/Platform/AccountUsersControllerTest.php` (3) |
| `.../agent_bots_controller_spec.rb` | `tests/Feature/Platform/AgentBotsControllerTest.php` (4) |
| `spec/models/platform_app_spec.rb`, `platform_app_permissible_spec.rb` | `tests/Feature/Models/PlatformAppTest.php` (3) |
| `spec/controllers/super_admin/devise/sessions_controller_spec.rb` | `tests/Feature/SuperAdmin/SessionsControllerTest.php` (4) |
| `spec/controllers/super_admin/{accounts,users,account_users,app_configs,installation_configs,dashboard}_controller_spec.rb` | `tests/Feature/SuperAdmin/ResourcesControllerTest.php` (17) |
| (view test của gem Administrate) | `resources/js/superadmin/components/FieldValue.test.tsx` (6, vitest) |

## Khác biệt cố ý

1. **Tiền tố mặt tiền `api`**: bản gốc đặt widget ở `/api/v1/widget` còn Platform API ở `/platform/api/v1`
   (không có `/api`). `bootstrap/app.php` trước đây gắn cứng `apiPrefix: 'api'` nên không thể ra đúng đường
   dẫn. Đã đổi thành `apiPrefix: ''` và chuyển tiền tố vào chính `routes/api.php`
   (`->prefix('/api/v1/widget')`) — URL cuối của widget KHÔNG đổi, chỉ khai báo rõ hơn ở đúng chỗ.
2. **Link SSO trỏ `/app/sso_login`** thay vì `/app/login?sso_auth_token=` của bản gốc: `SessionsController`
   (`/app/login`) đang do agent `f8` giữ trong đợt này nên không đụng vào. Hành vi giữ nguyên (token 5 phút,
   dùng một lần, có cờ `impersonation`). Khi f8 xong, có thể gộp nhánh này vào `/app/login` và đổi
   `SsoAuthenticatable::generateSsoLink()` — đúng một chỗ.
3. **Nút "Generate Seed Data"** chỉ hiện khi `ENABLE_ACCOUNT_SEEDING=true` (mặc định tắt) vì
   `Internal::SeedAccountJob` chưa port; oracle chạy production nên cũng đang ẩn.
4. **Bỏ mục "Sidekiq Dashboard" và "Push Diagnostics"** ở chân thanh điều hướng: hàng đợi ở đây là Laravel
   queue (không có Sidekiq Web), push diagnostics phụ thuộc FCM chưa port.
5. **Nhãn thanh điều hướng** là `INSTALLATION_NAME` + `yona.version` ("Yona 4.17.1") thay cho chuỗi cứng
   "Chatwoot" — thương hiệu, không phải sai lệch giao diện.
6. **Biểu mẫu gắn user** dùng `<select>` gốc (có mượn khung hình của selectize) thay plugin selectize +
   endpoint `users.json` tìm kiếm của bản gốc; danh sách người dùng nạp sẵn theo trang.
7. **`InstanceStatus`** không có "Chatwoot edition"/"Git SHA" (không áp dụng), thêm "Database Migrations".
8. `SuperAdmin::AccountsController#reset_cache` của bản gốc xoá cache key trên Redis; ở đây `touch()` account
   (Yona chưa có `reset_cache_keys`), giữ đúng ý nghĩa "ép client nạp lại".

## Bẫy đã trả giá

1. **`Request::query('account.order')` KHÔNG hiểu dấu chấm** (khác `input()`): tham số sắp xếp của
   Administrate là `?account[order]=id&account[direction]=asc`, phải đọc mảng `query('account')` rồi lấy khoá.
2. **Sắp xếp theo cột tính toán** (`users`, `conversations`, `account_users`) không có trong SQL — phải
   lọc theo kiểu field, nếu không `orderBy('users')` làm 500 ngay khi bấm tiêu đề cột.
3. **Màn đăng nhập không được nạp CSS Administrate**: quy tắc `button:not(.reset-base)` của Administrate
   đè lên nút Login (thấp hơn, xanh đậm hơn) → pixel lệch 0.62%. Tách layout `superadmin_auth.blade.php`,
   diff về 0.000%.
4. **Inertia bọc trang trong `<div id="app">`** còn bản gốc render thẳng vào `<body>` — thanh điều hướng
   `h-full flex justify-between` không kéo hết chiều cao nên nhóm mục dưới (Instance Health/Logout) trôi
   lên giữa. Thêm `#app { height: 100%; width: 100%; }` vào `superadmin.scss`.
5. **lightningcss không parse star-hack IE** trong CSS của Administrate (`*display: inline`) — `npm run build`
   chết ở bước minify. Gỡ đúng khai báo đó khi vendor.
6. **`page.default.layout ??= ...` không dùng được** để trang tự tắt layout: `null ?? x` vẫn ra `x`. Phải
   kiểm `=== undefined` thì màn đăng nhập mới bỏ được khung điều hướng.
7. **`auth:super_admin` mặc định đá về `route('login')` = `/app/login`** — phải cho `redirectGuestsTo`
   (và `redirectUsersTo`) rẽ theo đường dẫn `super_admin/*`.
8. **Hành động khả dụng khác nhau theo tài nguyên** (`access_tokens` chỉ index/show, `installation_configs`
   không có destroy) — Administrate suy ra từ `only:` trong routes.rb; ở đây khai báo trong dashboard, nếu
   không sẽ mọc nút "New access token" mà oracle không có.

## Gate

1. **Pest**: 45/45 test mới xanh, và **toàn suite 1982/1982** (4808 assertion) trên DB riêng
   `yona_rw_test_f7` — đã `dropdb` sau khi chạy. `vendor/bin/pint` xanh trên toàn bộ file mới/sửa.
   Lưu ý vận hành: **không chạy hai lệnh pest cùng lúc trên cùng DB test** — lần đầu mình chạy chồng nên
   `RefreshDatabase` của tiến trình này xoá bảng của tiến trình kia, sinh 15 lỗi "relation does not exist"
   và 2 test AutoAssignment đỏ giả; chạy tuần tự thì xanh sạch.
2. `php artisan migrate` trên `yona_rw` — batch 27, không đụng dữ liệu sẵn có.
3. `npx tsc --noEmit` sạch · `npm run build` xanh · **vitest 671/671** (83 file, gồm `FieldValue.test.tsx` mới).
4. **Pixel-diff** (`~/www/pixel-diff/f7-superadmin-ui.mjs`, light — Administrate không có chế độ tối),
   sau khi che các vùng khác biệt chủ đích (khai báo ngay trong script, có ghi lý do):
   - `login` **0.000%**
   - `dashboard` **0.006%**
   - `accounts` (lọc `?search=Acme` để hai bên cùng một dòng) **0.000%**
   - `account-show` **0.054%**
   - `users` (lọc theo email john) **0.060%**
   - `platform-apps` (script tự tạo app cùng tên hai bên rồi tự xoá) **0.002%**
   Vùng che: cột thanh điều hướng (nhãn "Chatwoot" xuống 2 dòng vs "Yona" 1 dòng + 2 mục EE không port),
   ô id bản ghi, số liệu/biểu đồ phụ thuộc dữ liệu instance, khối biểu mẫu selectize.
5. **E2E** (`~/www/pixel-diff/f7-e2e.mjs`): **13/13 bước xanh** — đăng nhập super admin → tạo platform app →
   lộ + đọc access token → `POST /platform/api/v1/accounts` → `POST /users` → `POST /account_users` →
   `GET /users/{id}/login` trả link SSO → thấy account + user mới trong Super Admin → trang show account
   liệt kê thành viên → xoá user + account qua API → xoá platform app → token của app đã xoá trả 401.
   Script tự dọn, DB dev sạch sau khi chạy (đã kiểm bằng `artisan tinker`).

## Ảnh hưởng ra ngoài vùng F7 (đã cân nhắc, tối thiểu)

- `bootstrap/app.php`: `apiPrefix: ''` (xem Khác biệt cố ý #1) + `redirectGuestsTo/redirectUsersTo` rẽ theo
  `super_admin/*`.
- `routes/api.php`: nhóm widget đổi `->prefix('/v1/widget')` thành `->prefix('/api/v1/widget')` (URL không đổi).
- `app/Providers/AppServiceProvider.php`: thêm 2 dòng morph map `Account`, `PlatformApp`.
- `config/auth.php`: guard `super_admin` + provider `super_admins`.
- `config/yona.php`: thêm `version` và `account_seeding_enabled`.
- `app/Models/User.php`: thêm trait `SsoAuthenticatable` + method `sendConfirmationInstructions()` — chuyển
  từ `RegistrationsController::sendConfirmationInstructions()` (DRY: console quản trị và luồng đăng ký nay
  dùng chung một chỗ; controller chỉ còn gọi `$user->sendConfirmationInstructions()`).
- `vite.config.js`: thêm 3 entry của khu super admin.

- `lang/en/super_admin.php`: mới (chuỗi máy chủ của console). Chuỗi trên trang React giữ nguyên tiếng Anh
  đúng bản gốc — gem Administrate không đa ngữ nên console chỉ có một ngôn ngữ; không kéo bundle i18n của
  dashboard vào khu này.
