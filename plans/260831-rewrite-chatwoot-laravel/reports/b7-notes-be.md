# B7 Labels — ghi chú agent `b7-be` (backend)

Ngày: 06/09/2026.

## ⚠️ CONTRACT API cho `b7-fe-settings` và `b7-fe-conversation` (chốt trước, code sau)

Mọi route nằm dưới `routes/web_api.php`, prefix `/api/v1/accounts/{accountId}`,
middleware `auth.api_token` + `auth` + `account.scope` (giống các tính năng trước).

### 1. CRUD nhãn của account (màn Settings → Labels)

| Method | Path | Quyền | Body | Response |
|---|---|---|---|---|
| GET | `/labels` | administrator **hoặc** agent | — | `{"payload": [Label, …]}` sắp xếp theo `title` tăng dần |
| GET | `/labels/{id}` | administrator | — | `Label` (KHÔNG bọc `payload`) |
| POST | `/labels` | administrator | `{title, description, color, show_on_sidebar}` | `Label` |
| PUT/PATCH | `/labels/{id}` | administrator | `{title?, description?, color?, show_on_sidebar?}` | `Label` |
| DELETE | `/labels/{id}` | administrator | — | `200`, body rỗng (`head :ok` của gốc) |

`Label` = đúng jbuilder gốc, 5 khóa:

```json
{ "id": 12, "title": "billing", "description": "Hoá đơn", "color": "#1f93ff", "show_on_sidebar": true }
```

- Body gửi **phẳng** (đúng như `LabelsAPI` của Chatwoot). Backend cũng chấp nhận
  dạng bọc `{"label": {...}}` — Rails ParamsWrapper của bản gốc bọc giúp, ở đây
  controller nhận cả hai.
- `title` bị **hạ chữ thường** trước khi lưu và phải khớp regex
  `UNICODE_CHARACTER_NUMBER_HYPHEN_UNDERSCORE` (`\A[\p{L}\p{N}]+[\p{L}\p{N}_-]+\z`)
  — ít nhất 2 ký tự, không khoảng trắng, không bắt đầu bằng `_`/`-`. Trùng title
  trong cùng account → **422** (`{"message": …, "errors": {…}}` chuẩn Laravel).
- `color` mặc định `#1f93ff` khi không gửi.
- Không có quyền → **401** `{"message": "You are not authorized to do this action"}`.
- Đổi `title` → job nền cập nhật mọi hội thoại/liên hệ đang gắn nhãn (FE chỉ cần
  refetch, hoặc chờ `conversation.updated`).
- Xóa nhãn → job nền gỡ mọi liên kết; `cached_label_list` của hội thoại được cập
  nhật **không** bắn event (đúng gốc — dùng `update_column`), FE nên refetch list.

### 2. Nhãn của một hội thoại

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/conversations/{displayId}/labels` | — | `{"payload": ["billing", "vip"]}` |
| POST | `/conversations/{displayId}/labels` | `{"labels": ["billing", "vip"]}` | `{"payload": ["billing", "vip"]}` |

- `{displayId}` = **display_id** (số hiển thị), không phải khóa chính.
- POST **thay TOÀN BỘ** danh sách (không phải thêm) — đúng `update_labels` gốc.
  Bỏ nhãn = POST lại danh sách thiếu nhãn đó. `{"labels": []}` = gỡ hết.
- `labels` nhận mảng, hoặc chuỗi `"a, b"` (tách theo dấu phẩy) như bản gốc.
- Quyền: giống mọi endpoint hội thoại (`fetchConversationForUser`) — admin, member
  của inbox, hoặc member của team đang giữ hội thoại; sai → 401, sai display_id → 404.
- Sau khi đổi: hội thoại bắn realtime `conversation.updated` (payload
  `ConversationResource` đã có `labels` thật) + sinh activity message
  `"<user> added a, b"` / `"<user> removed a"`.

### 3. Nhãn của một liên hệ

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/contacts/{contactId}/labels` | — | `{"payload": ["vip"]}` |
| POST | `/contacts/{contactId}/labels` | `{"labels": ["vip"]}` | `{"payload": ["vip"]}` |

- `{contactId}` = khóa chính contact. Không có event/activity (giống gốc).

### 4. Bulk actions (thanh chọn nhiều hội thoại)

`POST /api/v1/accounts/{accountId}/bulk_actions` — nhánh nhãn đã cắm:

```json
{ "type": "Conversation", "ids": [4, 7], "labels": { "add": ["billing"], "remove": ["vip"] } }
```

Thứ tự đúng bản gốc: **gỡ `remove` cho mọi hội thoại trước**, rồi lần lượt
`add` + `fields`/`snoozed_until` cho từng hội thoại. Response vẫn `200` body rỗng,
chạy nền → FE chờ realtime.

### 5. ⚠️ Khác biệt cố ý quan trọng với FE

**Chỉ gắn được nhãn ĐÃ TỒN TẠI trong account.** Bảng `taggings` có khóa ngoại
thật tới `labels` (quyết định thiết kế của plan: bỏ gem `acts_as_taggable_on`),
nên title lạ bị **bỏ qua im lặng** — response trả về danh sách thật sau khi lưu,
FE lấy đó làm nguồn sự thật. Bản gốc tạo tag tự do; UI Chatwoot chỉ cho chọn từ
danh sách nhãn của account nên đường đi của người dùng không đổi.
So khớp không phân biệt hoa/thường (title nhãn luôn là chữ thường).

## Bảng trace Ruby ↔ PHP

| Ruby (refs/chatwoot v4.17.1) | PHP (yona) | Ghi chú |
|---|---|---|
| `db/schema.rb` bảng `labels` | `database/migrations/2026_09_06_200000_create_labels_tables.php` | cột y gốc (`color` default `#1f93ff`, `show_on_sidebar` nullable), unique `(title, account_id)`, `timestamps(6)` |
| gem `acts_as_taggable_on` (`tags` + `taggings` đa ngữ cảnh) | bảng `taggings` trong cùng migration | `account_id` + `label_id` khóa ngoại cascade + morph `taggable`, unique `(label_id, taggable_type, taggable_id)`, index `(taggable_type, taggable_id)` và `(account_id, label_id)`; bỏ `tags`, `tagger`, `context`, `taggings_count` |
| `Label` (`before_validation` downcase, `default_scope order(:title)`, `after_update_commit`) | `App\Models\Label` | `normalizeTitle()` + hook `saving` (giống `Team::normalizeName`); global scope `Label::ORDER_SCOPE`; hook `updated` → `Labels\UpdateJob` khi `wasChanged('title')`; hằng `TITLE_REGEX` = `RegexHelper::UNICODE_CHARACTER_NUMBER_HYPHEN_UNDERSCORE` |
| `Label#conversations` / `#messages` / `#reporting_events` | `Label::conversations()` + `Label::contacts()` (`morphedByMany`) | `messages`/`reporting_events` là đường của báo cáo nhãn (nhóm E) — chưa port |
| `ActsAsTaggableOn::Tagging` | `App\Models\Tagging` | không khai báo `taggable()` morphTo (không nơi nào cần đọc ngược); alias morph đăng ký trong `Labelable::bootLabelable()` |
| `Labelable` (`update_labels`, `add_labels`) | `App\Models\Concerns\Labelable` | thêm `labelList()`, `removeLabels()` (bản gốc để phép trừ trong `BulkActionsJob`); `parseLabelList` = `ActsAsTaggableOn.default_parser` (mảng hoặc chuỗi ngăn cách dấu phẩy); `syncLabels()` là chỗ DUY NHẤT ghi taggings, gọi hook `labelListChanged()` khi danh sách thật sự đổi |
| `cached_label_list` do gem ghi trong lượt save | `Conversation::labelListChanged()` | ghi `cached_label_list` (`implode(', ')`) rồi `save()` → cùng một lượt update sinh `conversation.updated` + activity, `updated_at` được nâng như gốc |
| `previous_changes[:label_list]` | `Conversation::$labelListChange` | `label_list` không phải cột nên giữ `[trước, sau]` của lượt hiện tại, chèn vào `PreviousChanges::of()` trong `notifyConversationUpdation()`; `label_list` đã có sẵn trong `UPDATED_EVENT_KEYS` |
| `ActivityMessageHandler#handle_label_change` + `LabelActivityMessageHandler` | `Conversation::labelChangeActivity()` + `labelChangeActivityMessage()` | chạy SAU nhánh status/priority đúng thứ tự `create_activity`; chủ thể lấy qua `activityMessageOwner()` dùng chung với B6 |
| `Conversation#cached_label_list_array` | `Conversation::cachedLabelListArray()` | đã có từ B3 |
| — (mới) | `Conversation::refreshCachedLabelList()` | đổi tên nhãn không đi qua `updateLabels` nên cần đường dựng lại cache qua đúng seam `labelListChanged` |
| `Labels::UpdateJob` / `Labels::RemoveAssociationsJob` | `App\Jobs\Labels\{UpdateJob,RemoveAssociationsJob}` | queue `default` như `queue_as :default` |
| `Labels::UpdateService` | `App\Services\Labels\UpdateService` | bỏ `old_label_title` (đổi tên = đổi 1 dòng `labels`); chỉ làm mới cache của hội thoại |
| `Labels::DestroyService` | `App\Services\Labels\DestroyService` | bỏ `label_deleted_at`; xóa taggings đã do FK cascade lo; viết `cached_label_list` bằng update thẳng (không hook/event) đúng `update_column` của gốc; bỏ `FilteredCountInvalidator` (B8) |
| `Api::V1::Accounts::LabelsController` + 4 jbuilder | `WebApi\LabelsController` + `App\Http\Resources\LabelResource` | `policy_scope` + `check_authorization` → `authorizeAdministrator()` (index mở cho mọi thành viên); ParamsWrapper của Rails → nhận cả body phẳng lẫn bọc `label`; `head :ok` → `noContent(200)` |
| `LabelConcern` + `Conversations::LabelsController` + `Contacts::LabelsController` | `WebApi\Conversations\LabelsController` + `WebApi\Contacts\LabelsController` | không tách concern: logic gán nhãn đã nằm trọn trong trait `Labelable`, controller chỉ chọn model + quyền (`fetchConversationForUser` / contact theo account) |
| `BulkActionsJob#bulk_remove_labels` + `#bulk_add_labels` | `BulkActionsJob::bulkUpdate()` | giữ nguyên hai vòng lặp: gỡ hết trước, rồi thêm + đổi trường |
| `config/locales/en.yml` `conversations.activity.labels` | `lang/en/conversations.php` | `{user_name} added {labels}` / `{user_name} removed {labels}` |

## Spec ↔ Pest

| RSpec | Pest |
|---|---|
| `spec/models/label_spec.rb` | `tests/Feature/Models/LabelTest.php` (hạ chữ thường, ký tự nước ngoài, thứ tự title, job đổi tên) + phần validate title chuyển sang `LabelsControllerTest` |
| phần `#update_labels` + `cached_label_list_array` của `spec/models/conversation_spec.rb`, `labelable` | `tests/Feature/Models/ConversationLabelsTest.php` (10 case: activity added/removed, đồng bộ cache, event `conversation.updated`, không đổi gì thì không chạm bản ghi, bỏ title lạ, chuỗi ngăn cách dấu phẩy, add/remove, contact không bị chạm, xóa nhãn gỡ liên kết) |
| `spec/services/labels/update_service_spec.rb` | `tests/Feature/Services/Labels/UpdateServiceTest.php` |
| `spec/services/labels/destroy_service_spec.rb` | `tests/Feature/Services/Labels/DestroyServiceTest.php` |
| `spec/controllers/api/v1/accounts/labels_controller_spec.rb` | `tests/Feature/WebApi/LabelsControllerTest.php` (24 case, gồm quyền agent vs admin + validate) |
| `spec/controllers/api/v1/accounts/conversations/labels_controller_spec.rb` | `tests/Feature/WebApi/Conversations/LabelsControllerTest.php` |
| `spec/controllers/api/v1/accounts/contacts/labels_controller_spec.rb` | `tests/Feature/WebApi/Contacts/LabelsControllerTest.php` |
| nhánh nhãn của `spec/jobs/bulk_actions_job_spec.rb` | `tests/Feature/Jobs/BulkActionsLabelsTest.php` |

## Khác biệt cố ý

1. **Chỉ gắn được nhãn đã tồn tại trong account** (xem mục 5 phần contract). Bản gốc tạo tag tự do vì tag là bảng riêng; ở đây `taggings.label_id` là khóa ngoại thật nên `labels` là nguồn sự thật duy nhất, title lạ bị bỏ qua và response trả danh sách thật.
2. **`Labels::UpdateService` bỏ `old_label_title`, `Labels::DestroyService` bỏ `label_deleted_at`.** Bản gốc cần cả hai vì tag sống độc lập với nhãn (đổi tên phải viết lại từng tag; xóa nhãn có thể bỏ sót liên kết tạo sau). Với khóa ngoại cascade, đổi tên là đổi một dòng và không thể có liên kết mồ côi.
3. **Gắn/gỡ nhãn cho contact KHÔNG bắn `contact.updated`.** Bản gốc save contact nên `after_update_commit` chạy, nhưng payload contact (`push_event_data`) không chứa nhãn nên FE không mất thông tin; contact cũng không có cột cache để đồng bộ.
4. **`title` kết thúc bằng khoảng trắng/xuống dòng được nhận** (lưu bản đã cắt) vì middleware `TrimStrings` của Laravel chạy trước validate; bản gốc trả 422 nhờ neo `\z`. Xuống dòng NẰM GIỮA title vẫn bị chặn — case regression của Chatwoot vẫn còn ý nghĩa. Đã ghi thành test riêng.
5. **Thứ tự nhãn** lấy theo thứ tự dòng `taggings` (thứ tự gắn) và `cached_label_list` luôn dựng lại từ đó, nên cache và danh sách thật luôn khớp. Bản gốc ghi cache theo thứ tự client gửi lên, có thể lệch với thứ tự association khi gửi lại cùng tập nhãn theo thứ tự khác.
6. **`Account::labels()` chưa có** (file `app/Models/Account.php` ngoài phạm vi tính năng này) — `LabelsController::accountLabels()` truy vấn `Label::query()->where('account_id', …)`. Nên thêm quan hệ vào Account ở phiên sở hữu file đó.
7. **`Relation::morphMap` alias `'Conversation'`** đăng ký trong `Labelable::bootLabelable()` thay vì `AppServiceProvider` (cùng lý do phạm vi file). `Tagging` vì thế không khai báo `taggable()` morphTo.
8. Chưa port: `Label#messages` / `#reporting_events` (báo cáo nhãn — nhóm E), `FilteredCountInvalidator` (B8), `AccountCacheRevalidator` (cache key theo account), endpoint `cache_keys` mà `CacheEnabledApiClient` của FE gọi khi bật cache (FE nên dùng `LabelsAPI.get(false)` / gọi thẳng `GET /labels`).

## Kiểm chứng đã chạy

- `vendor/bin/pest` toàn suite: **696/696 xanh** (lần chạy trước đó fail do agent song song `b9-be` chạy test cùng lúc trên `yona_rw_test` — drop bảng giữa chừng; chạy lại xanh).
- `vendor/bin/pint --dirty`: sạch.
- `php artisan route:list | grep label`: đủ 9 route (5 CRUD + 2 conversation + 2 contact).
- curl thật (token John, account 2, conversation 4): tạo nhãn `B7-Test` → hạ chữ thường `b7-test` → gán vào hội thoại 4 → `GET` trả `["b7-test"]` → payload hội thoại có `labels: ["b7-test"]` → đổi tên `B7-Renamed` → job nền cập nhật `cached_label_list` = `b7-renamed` → title sai định dạng trả 422 → xóa nhãn → hội thoại còn `[]`. Activity sinh đúng một dòng `John added b7-test` (đổi tên/xóa chạy trong job không có user nên không sinh activity — đúng bản gốc).
- **Dọn sạch:** đã xóa nhãn test + activity message 94, `conversations.display_id=4` trở về `cached_label_list = NULL`, đúng 5 tin (id 3–7), `last_activity_at` và `updated_at` = `2026-09-01 06:11:52`; `labels` và `taggings` rỗng.
