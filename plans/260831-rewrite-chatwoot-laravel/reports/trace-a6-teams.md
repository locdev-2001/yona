# Trace A6 — Teams (settings/teams)

Nguồn: `refs/chatwoot` v4.17.1. Không mở `enterprise/`.

## Bảng trace nguồn → đích

### Backend

| Ruby | PHP | Ghi chú |
|---|---|---|
| `db/schema.rb` bảng `teams` + `team_members` | `database/migrations/2026_08_31_110000_create_teams_table.php` | Giữ nguyên cột + index: `teams` unique `(name, account_id)`, `allow_auto_assign` default true, `icon`/`icon_color` **nullable** default `''` (schema gốc chỉ đặt default, không `null:false`); `team_members` unique `(team_id, user_id)` |
| `app/models/team.rb` | `app/Models/Team.php` | Giữ: `before_validation` (bỏ ký tự điều khiển → trim → hạ chữ thường) tách thành `Team::normalizeName()` để nơi nhận input validate trên tên ĐÃ chuẩn hóa; `add_members`/`remove_members`; xóa team kéo theo `team_members`. Bỏ: `conversations`/`messages`/`reporting_events` (nhóm B–D), `AccountCacheRevalidator` + invalidate unread counts (B4), `push_event_data` (realtime B4), `Audit::Team` (EE) |
| `app/models/team_member.rb` | `app/Models/TeamMember.php` | Bỏ: `invalidate_filtered_unread_count_visibility` (B4), `Audit::TeamMember` (EE) |
| `Api::V1::Accounts::TeamsController` | `app/Http/Controllers/WebApi/TeamsController.php` | 5 endpoint. `TeamPolicy`: index/show mở cho thành viên, create/update/destroy chỉ administrator |
| `Api::V1::Accounts::TeamMembersController` | `app/Http/Controllers/WebApi/TeamMembersController.php` | 4 endpoint. Giữ nguyên phép diff của Rails: `create` chỉ thêm id chưa có, `update` thêm phần thiếu + bỏ phần thừa, `destroy` bỏ theo `user_ids`; id ngoài account → **401 `Invalid User IDs`** |
| `api/v1/models/_team.json.jbuilder` | `TeamsController::teamPayload` | Đủ trường gốc, `is_member` tính theo user đang đăng nhập |
| `api/v1/models/_agent.json.jbuilder` (partial dùng lại cho team_members) | `app/Http/Resources/AgentResource.php` | Tách khỏi `AgentsController` vì team_members trả cùng partial — payload agent giờ chỉ định nghĩa 1 nơi |
| `check_authorization` của `Api::V1::Accounts::BaseController` | `Controller::authorizeAdministrator()` | Gom về base controller, dùng chung agents + teams (401 + đúng chuỗi lỗi gốc) |
| `teams.routes.js` (`meta.permissions: ['administrator']` mọi bước) | `routes/web.php` khối `account.role:administrator` + `app/Http/Controllers/App/TeamsSettingsController.php` | 7 route trang, URL giống hệt Chatwoot |

### Frontend (Vue → React)

| Vue | React | Ghi chú |
|---|---|---|
| `settings/teams/Index.vue` | `dashboard/settings/teams/Index.tsx` | Giữ DOM + class. Danh sách lấy qua `getJson` thay vuex store |
| `settings/teams/TeamForm.vue` | `settings/teams/TeamForm.tsx` | `OnClickOutside` của vueuse → listener `mousedown` trong `useEffect`; validate title (required + min 2) như `helpers/validations.js` |
| `settings/teams/AgentSelector.vue` | `settings/teams/AgentSelector.tsx` | Giữ nguyên bảng + checkbox select-all (indeterminate) |
| `Create/Index.vue` + `Edit/Index.vue` | `settings/teams/WizardLayout.tsx` | Hai khung wizard giống hệt nhau nên gộp 1 component, khác nhau ở bộ bước (`flow`) |
| `Create/CreateTeam.vue` | `settings/teams/CreateTeam.tsx` | |
| `Create/AddAgents.vue` | `settings/teams/AddAgents.tsx` | |
| `Edit/EditTeam.vue` | `settings/teams/EditTeam.tsx` | Team đến từ props Inertia nên không còn trạng thái chờ + Spinner của bản gốc |
| `Edit/EditAgents.vue` | `settings/teams/EditAgents.tsx` | Thành viên hiện tại được chọn sẵn |
| `FinishSetup.vue` | `settings/teams/FinishSetup.tsx` | Dùng chung cho bước cuối của cả 2 luồng (`flow`) |
| `components/ui/Wizard.vue` | `dashboard/components/ui/Wizard.tsx` | Bước đang đứng lấy từ prop `activeRoute` thay `route.name` |
| `settings/Wrapper.vue` + `SettingsHeader.vue` | `settings/SettingsContent.tsx` + `settings/SettingsHeader.tsx` | `keep-alive` là chi tiết Vue router — bỏ |
| `settings/SettingsSubPageHeader.vue` | `settings/SettingsSubPageHeader.tsx` | |
| `components/widgets/BackButton.vue` | `components/widgets/BackButton.tsx` | `router.go(-1)` → `history.back()` |
| `components/widgets/EmptyState.vue` | `components/widgets/EmptyState.tsx` | |
| `components/widgets/modal/ConfirmDeleteModal.vue` | `components/widgets/modal/ConfirmDeleteModal.tsx` | Nút xác nhận chỉ bật khi gõ đúng tên (so sau trim) |
| `components-next/checkbox/Checkbox.vue` | `components-next/checkbox/Checkbox.tsx` | |
| `components-next/table/BaseTable*.vue` | `components-next/table/BaseTable*.tsx` | Slot `header-{index}` → mảng ReactNode |
| `components-next/emoji-icon-picker/{constants,icons}.js` | `.../emoji-icon-picker/{constants,icons}.ts` | Dữ liệu 163 icon copy nguyên |
| `.../EmojiIcon.vue` + `ColorPalette.vue` + `EmojiIconPicker.vue` | `.../EmojiIcon.tsx` + `ColorPalette.tsx` + `EmojiIconPicker.tsx` | **Khác bản gốc:** danh sách emoji render thẳng trong khung cuộn (`h-60`) thay `virtua/vue` Virtualizer — xem mục Khác biệt |
| `shared/components/emoji/pickerHelper.js` + `emojisGroup.json` | `shared/components/emoji/pickerHelper.ts` + `emojisGroup.json` | Copy nguyên data 9 nhóm emoji |
| `i18n/locale/en/teamsSettings.json` + `emoji.json` | `i18n/locale/en/teamsSettings.json` + `emojiIconPicker.json` | Thêm `FORM.NAME.ERROR` (vuelidate gốc dùng message mặc định) |

### Test

| RSpec | Pest | Ghi chú |
|---|---|---|
| `spec/controllers/api/v1/accounts/teams_controller_spec.rb` (13) | `tests/Feature/WebApi/TeamsControllerTest.php` — 16 test | Thêm: tên rỗng sau chuẩn hóa → 422, trùng tên khác hoa/thường → 422, icon rỗng (null) vẫn tạo được, team account khác → 404 |
| `spec/controllers/api/v1/accounts/team_members_controller_spec.rb` (12) | `tests/Feature/WebApi/TeamMembersControllerTest.php` — 10 test | Đủ 4 nhóm endpoint + case `Invalid User IDs` |
| `spec/models/team_spec.rb` | `tests/Feature/Models/TeamTest.php` — 9 test | Bỏ: assert dispatcher `account.cache_invalidated` (B4) |
| `spec/models/team_member_spec.rb` | — | Toàn bộ spec là invalidate unread count (B4); phần association đã phủ trong `TeamTest` |
| `teams.routes.js` meta.permissions | `tests/Feature/App/TeamSettingsPageTest.php` — 6 test | Guard quyền + render đủ 6 bước wizard + team account khác → 404 |

## Khác biệt có chủ đích so bản gốc

1. **EmojiIconPicker không dùng `virtua/vue`**: bản gốc bọc danh sách section emoji trong `<Virtualizer>`; bản React render thẳng trong đúng khung `h-60 overflow-y-auto`. Lúc mới mở (chưa cuộn) phần nhìn thấy giống nhau; cuộn sâu có thể lệch do spacer của virtua.
2. **Điều hướng giữa các bước wizard dùng `window.location`** thay `router.replace` — mỗi bước là một trang Inertia riêng (không có vue-router trong bản port).
3. **`icon`/`icon_color` nullable**: middleware `ConvertEmptyStringsToNull` của Laravel biến `''` thành `null`; schema gốc chỉ đặt default nên cho phép null — giữ đúng vậy thay vì ép NOT NULL.
4. **Không có cache invalidation / unread counts** khi đổi thành viên team (`FilteredCountInvalidator`) — đi cùng realtime ở B4.

## Kiểm chứng

- Pest: **140/140 xanh** (`composer test`), thêm 41 test cho A6.
- `npx tsc --noEmit` + `npm run build` xanh; `pint` sạch.
- Kịch bản "Test ngay" chạy thật trên trình duyệt (`localhost:8000`, account Acme Inc id=2):
  1. `/settings/teams/list` khi chưa có team → "There are no teams created on this account."
  2. `/settings/teams/new` → wizard 3 bước hiện đúng (Create / Add Agents / Finish); điền "Sales Crew" + mô tả → tạo xong nhảy sang bước 2.
  3. Bước 2 liệt kê John + Samantha; chọn tất cả → "2 out of 2 agents selected" → lưu xong sang Finish.
  4. `/settings/teams/1/edit/agents` mở lại: 2 thành viên **được chọn sẵn**.
  5. Danh sách hiện "1 team" + "Sales Crew" (tên lưu chữ thường, hiển thị qua class `capitalize` như gốc).
  6. Xóa: modal yêu cầu gõ đúng "sales crew" mới bật nút → xóa xong danh sách trống, `team_members` mất theo.
  7. Emoji/icon picker: mở được, tab Icons 163 icon + bảng màu, tab Emojis 9 nhóm.
- **Lỗi thật bắt được khi chạy trình duyệt (test không thấy):** POST tạo team trả 500 vì `icon` gửi lên là `null` (do `ConvertEmptyStringsToNull`) mà cột đang NOT NULL. Đã sửa migration cho khớp schema gốc + thêm test gửi icon null.
- Pixel-diff: chờ phiên kiểm chứng chấm (list, wizard 3 bước create/edit, modal xóa, trang team members).
