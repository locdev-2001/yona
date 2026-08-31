# Trace A5 — Quản lý Agents

Nguồn: Chatwoot v4.17.1 (`refs/chatwoot`). Ngày: 31/08/2026.

## Bảng trace nguồn → đích

### Backend

| Ruby / hệ gốc | PHP | Ghi chú |
|---|---|---|
| `Api::V1::Accounts::AgentsController` (index/create/update/destroy/bulk_create) | `app/Http/Controllers/WebApi/AgentsController.php` | 5 endpoint dưới `/api/v1/accounts/{account}/agents`. Bỏ: `usage_limits[:agents]` + `render_payment_required` (billing cloud), `custom_role_id` (EE) |
| `AgentBuilder` | `app/Builders/AgentBuilder.php` | Giữ: `with_lock` trên account (→ `lockForUpdate` trong transaction), find-or-create user với mật khẩu tạm `1!aA + random(12)`, `skip_confirmation_notification` khi tạo rồi gửi mail sau transaction, name mặc định = phần trước `@`, và ngữ nghĩa `.compact` khi tạo `account_users` (tham số truyền `null` bị loại → cột dùng default của bảng: `availability`=0, `auto_offline`=true — đúng đường `create` của controller gốc, vốn luôn truyền key với giá trị nil; `bulk_create` không truyền nên giữ default `offline`/`false` của builder). Bỏ: `reserve_email_send_capacity` / `EmailLimitExceeded` (giới hạn email cloud), `LimitExceededError` (usage limit) |
| `UserPolicy` (`check_authorization(User)`) — agent không được create/update/destroy | `AgentsController::authorizeAdministrator` → 401 (chuỗi 'You are not authorized to do this action' như gốc); `index` mở cho mọi thành viên | Policy framework đầy đủ vào nhóm sau; hiện chỉ 2 role nên kiểm tra thẳng |
| `User.from_email` | `User::fromEmail()` | Email luôn lưu lowercase (đã có từ A1) |
| `scope :order_by_full_name` (`order('lower(name) ASC')`) | `orderByRaw('lower(users.name) ASC')` | |
| `DeleteObjectJob` | `app/Jobs/DeleteObjectJob.php` (queue `low`) | Xóa user khi không còn `account_users` nào; bỏ tham số `user`/`message` (chỉ dùng cho webhook EE) |
| `api/v1/models/_agent.json.jbuilder` | `AgentsController::agentPayload` | Đủ trường gốc trừ `custom_role_id` (EE). `availability_status`/`role` lấy từ `account_users` của account đang đứng |
| `concerns/availability_statusable.rb#user_availability_status` | `app/Models/Concerns/AvailabilityStatusable.php` (dùng ở `AccountUser`) | `auto_offline` bật (mặc định) → trạng thái đi theo presence, không có presence = `offline`; chỉ khi `auto_offline` tắt mới đọc thẳng cột `availability`. `onlinePresence()` trả false tới khi có OnlineStatusTracker (B4) |
| `DeviseOverrides::PasswordsController#create/#update` | `app/Http/Controllers/Auth/PasswordsController.php` | `#create` luôn 200 với chuỗi `messages.reset_password` (không lộ email tồn tại); `#update` xác nhận luôn user chưa confirm — đây là đường "Accept invitation" của agent được mời, rồi đăng nhập + trả `redirect_url`. Bỏ nhánh SAML (EE) |
| Devise `reset_password_token` / `reset_password_sent_at` | migration `2026_08_31_100000_add_reset_password_to_users_table` + `User::generateResetPasswordToken()` | Token random 40 ký tự lưu thẳng (Devise lưu digest — chi tiết gem, không phải hành vi) |
| `devise/mailer/confirmation_instructions.html.erb` (4 nhánh nội dung) | `App\Notifications\ConfirmationInstructions` | Port đủ 4 nhánh: đổi email / đã confirm / **được mời vào workspace** (link `password/edit?reset_password_token=` + tên người mời + tên workspace) / đăng ký mới. Layout mail đẹp đầy đủ vào D5 |
| `devise/mailer/reset_password_instructions` | `App\Notifications\ResetPasswordInstructions` | |
| `meta: { permissions: ['administrator'] }` của `agent.routes.js` + `routeHelpers#validateLoggedInRoutes` | middleware `account.role` (`app/Http/Middleware/EnsureAccountRole.php`), alias trong `bootstrap/app.php` | Route ngoài quyền → redirect dashboard của account, đúng `defaultRedirectPage`. Dùng lại cho mọi trang settings admin về sau (A6 teams…) |
| `spec/controllers/api/v1/accounts/agents_controller_spec.rb` | `tests/Feature/WebApi/AgentsControllerTest.php` — 14 test | Bỏ: toàn bộ context email-limit / usage-limit (billing cloud). Thêm: mời email đã là thành viên → 422, mời user của account khác → không tạo user mới + không gửi mail |
| `spec/builders/agent_builder_spec.rb` | `tests/Feature/Builders/AgentBuilderTest.php` — 3 test | Bỏ: context email capacity + agent limit |
| (spec passwords chỉ có bản `spec/enterprise/` — **không mở**) | `tests/Feature/Auth/PasswordsControllerTest.php` — 6 test | Viết từ source controller OSS; ghi rõ đầu file |
| — | `tests/Feature/App/AgentSettingsPageTest.php` — 3 test | Guard quyền trang + redirect `/settings/agents` → `/settings/agents/list` |

### Frontend (Vue → React)

| Vue | React | Ghi chú |
|---|---|---|
| `settings/agents/Index.vue` | `dashboard/settings/agents/Index.tsx` | Giữ nguyên DOM + class. Bỏ: tooltip quyền custom role (EE). Danh sách lấy qua `fetch` thay vuex store `agents/*` |
| `settings/agents/AddAgent.vue` | `settings/agents/AddAgent.tsx` | vuelidate → validate tay (name required, email required + format). Role chỉ agent/administrator |
| `settings/agents/EditAgent.vue` | `settings/agents/EditAgent.tsx` | Nút "Reset Password" gọi `POST /app/auth/password`. Nhánh ẩn nút khi `provider === 'saml'` là EE nên bỏ |
| `settings/SettingsLayout.vue` | `dashboard/settings/SettingsLayout.tsx` | slot header/body/loading/no-records |
| `settings/components/BaseSettingsHeader.vue` | `dashboard/settings/BaseSettingsHeader.tsx` (mở rộng từ A4) | Thêm: search box, count, link help. Chưa port: back button + tabs (màn dùng chúng ở nhóm sau) |
| `dashboard/components/CustomBrandPolicyWrapper.vue` | `dashboard/components/CustomBrandPolicyWrapper.tsx` | MIT (ngoài `enterprise/`). Bọc link help với `showOnCustomBrandedInstance={false}` → bản cài đặt tên "Yona" là custom branded nên link **ẩn**, giống oracle |
| `components/Modal.vue` (+ style non-scoped) | `dashboard/components/Modal.tsx` + khối `.modal-mask` trong `resources/scss/app.scss` | Giữ hành vi Esc + mousedown-backdrop-rồi-mouseup mới đóng |
| `components/ModalHeader.vue` | `dashboard/components/ModalHeader.tsx` | |
| `components/widgets/modal/DeleteModal.vue` | `dashboard/components/widgets/modal/DeleteModal.tsx` | |
| `components/widgets/LoadingState.vue` | `dashboard/components/widgets/LoadingState.tsx` | |
| `components-next/input/Input.vue` | `dashboard/components-next/input/Input.tsx` | |
| `helper/featureHelper.js` | `dashboard/helper/featureHelper.ts` | Bỏ key EE (sla/saml/captain/audit_logs) |
| `v3/views/auth/password/Edit.vue` | `resources/js/v3/views/auth/password/Edit.tsx` | Màn đặt mật khẩu (agent nhận lời mời bấm vào đây) |
| `v3/views/auth/reset/password/Index.vue` | `resources/js/v3/views/auth/reset/password/Index.tsx` | Link "Forgot your password?" ở login giờ có đích thật |
| `sidebar/provider.js#isAllowed/resolvePermissions` | `sidebar/permissions.ts#filterMenuByRole` + trường `permissions` trong `menuItems.ts` | Mục settings gắn quyền đúng bảng route gốc: tất cả `['administrator']`, riêng Macros + Canned Responses mở cho mọi thành viên |
| `@chatwoot/pico-search` (lọc theo name/email) | dùng **chính thư viện đó** (`pnpm add @chatwoot/pico-search`) | Framework-agnostic, không viết lại |
| `i18n/locale/en/agentMgmt.json` | `resources/js/i18n/locale/en/agentMgmt.json` | Bỏ khối `MULTI_SELECTOR` (dùng ở màn hội thoại — nhóm B). `t()` bổ sung plural ngầm kiểu vue-i18n cho key `COUNT` |

## Khác biệt có chủ đích so bản gốc

1. **Không có giới hạn số agent / giới hạn email**: `usage_limits` + `reserve_email_send_capacity` thuộc billing cloud của Chatwoot, không port (quyết định #12). Hệ quả: `bulk_create` không bao giờ trả 402/429.
2. **`bulk_create` bỏ qua lỗi từng email** như Rails (log rồi tiếp), nhưng không có nhánh “hết hạn mức giữa chừng”.
3. **Xóa agent** vẫn để `DeleteObjectJob` chạy nền (queue `low`) như Chatwoot — dev phải có worker (`php artisan queue:work`) thì user mồ côi mới bị xóa; `account_users` thì xóa ngay trong request.
4. **Token reset lưu thẳng** thay vì digest như Devise.

## Kiểm chứng

- Pest: **93/93 xanh** (`composer test`), thêm 29 test cho A5.
- `npx tsc --noEmit` + `npm run build` xanh; `pint` sạch.
- Kịch bản "Test ngay" chạy thật trên trình duyệt (`localhost:8000`, tài khoản seed):
  1. Admin mở `/settings/agents/list` → thấy danh sách + count.
  2. Mời `mailan@acme.inc` → danh sách lên 2, trạng thái "Verification Pending".
  3. Mail lời mời trong `storage/logs/laravel.log`: "John Kennedy invited you to join the Acme Inc workspace on Yona" + nút "Accept invitation".
  4. Mở link → đặt mật khẩu → tự đăng nhập vào `/app/accounts/2/dashboard`, `/api/v1/profile` trả `confirmed: true`.
  5. Agent thường mở `/settings/agents/list` → redirect về dashboard; sidebar chỉ còn Macros + Canned Responses trong nhóm Settings.
  6. Admin sửa role Mai Lan → Administrator (danh sách đổi ngay), xóa → còn 1 agent; chạy worker → user bị xóa hẳn.
  7. Ô tìm kiếm lọc đúng, không khớp thì hiện "No agents found matching your search".
- Pixel-diff (phiên yona-ee chấm): modal Add Agent 0.006% light / 0.000% dark; modal Confirm Deletion 0.000%; `/app/auth/reset/password` 0.032%/0.029%; `/app/auth/password/edit` 0.000%. Trang list lệch 0.93–0.96% → đã sửa theo 3 finding dưới, chờ re-diff.

## Finding từ phiên kiểm chứng (đã xác minh source rồi mới áp)

| # | Finding | Nguồn xác minh | Xử lý |
|---|---|---|---|
| 1 | Link "Learn about user roles" phải **ẩn** trên bản đổi tên (đẩy nội dung 34px → lệch cả trang) | `dashboard/components/CustomBrandPolicyWrapper.vue` nằm ngoài `enterprise/`; getter `isACustomBrandedInstance = installationName !== 'Chatwoot'` (`shared/store/globalConfig.js:67`) | Port wrapper thành `CustomBrandPolicyWrapper.tsx` + `useBranding().isCustomBrandedInstance`; `BaseSettingsHeader` bọc link help — áp cho mọi trang settings sau |
| 2 | `availability_status` không phải cột `availability` | `concerns/availability_statusable.rb#user_availability_status`; `db/schema.rb:52` `auto_offline` default true | Trait `AvailabilityStatusable` (presence tạm false tới B4); builder trả về ngữ nghĩa `.compact` nên agent tạo qua UI giữ default bảng như oracle |
| 3 | `COMMON.CLICK_HERE` là "click here" (chữ thường) | `dashboard/i18n/locale/en/generalSettings.json:236` | Sửa chuỗi i18n |
