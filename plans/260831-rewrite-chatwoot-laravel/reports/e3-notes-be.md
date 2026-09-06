# E3 backend — Contacts nâng cao + import/export CSV

Agent `e3-be`, 06/09/2026. Nguồn: `refs/chatwoot` v4.17.1 (trừ `enterprise/`).

## CONTRACT API (cho `e3-fe`)

Tất cả nằm dưới `/api/v1/accounts/{account}` (khối `// E3 data_imports + contacts export` trong `routes/web_api.php`).

### `GET /data_imports` — danh sách lần nhập
- Quyền: **administrator** + account phải bật feature `data_import` (mặc định TẮT trong `config/features.php`; bật bằng cột `feature_flags` của account). Không đủ → **401**.
- `200 { "payload": [DataImport, …] }`, mới nhất trước.

```jsonc
// DataImport
{
  "id": 12,
  "name": "Contacts - 2026-09-06",     // mặc định "<Data type> - <ngày>"
  "data_type": "contacts",
  "source_type": "file",
  "source_provider": null,              // null = nhập CSV
  "import_types": [],
  "status": "pending",                  // pending|processing|completed|failed|completed_with_errors|abandoned
  "stalled": false,
  "total_records": 100,
  "processed_records": 95,
  "stats": {}, "cursor": {},
  "created_at": "…", "updated_at": "…",
  "started_at": "…", "completed_at": "…", "abandoned_at": null,
  "initiated_by": { "id": 3, "name": "John", "email": "john@acme.inc" } | null,
  "failed_records_url": "http://…/storage/…csv" | null,   // THÊM so bản gốc (bản gốc chỉ gửi qua email)
  "import_errors_count": 0,
  "skip_logs_count": 0
}
```

### `GET /data_imports/{id}` — chi tiết
- Quyền như trên; id của account khác → **404**.
- `200` = đúng shape `DataImport` ở trên, **cộng thêm**:
  `import_errors: [{id, error_code, message, source_object_type, source_object_id, details, created_at}]`,
  `skip_logs: [{kind, …giống import_errors}]`,
  `skip_logs_filters: { selected_source_object_type: null, counts_by_type: {…} }`.

### `POST /contacts/import` — nhập CSV (multipart)
- Quyền: **administrator** (không cần feature flag — đúng bản gốc).
- Body multipart: `import_file` = tệp CSV.
- `200` (body rỗng) khi đã tạo bản ghi + xếp job. Thiếu tệp → `422 { "error": "File is blank" }`.
- Cột CSV hiểu được: `name`, `email`, `phone_number`, `identifier`, `company_name`, `city`, `labels`
  (nhãn ngăn bằng dấu phẩy, **phải đã tồn tại** trong account, so khớp chữ thường); cột khác vào `custom_attributes`.
- Kết quả xem qua `GET /data_imports` (FE gốc poll 5 giây khi còn `pending`/`processing`).

### `POST /contacts/export` — xuất CSV
- Quyền: **administrator**. Body (đều tuỳ chọn): `column_names: string[]`, `payload: <mảng điều kiện lọc như /contacts/filter>`, `label: string`.
- `200` (body rỗng). Job chạy nền, gửi email kèm liên kết tải về cho chính người bấm.
- Cột mặc định `["id","name","email","phone_number","labels"]`; cột không có thật bị bỏ; `labels` là cột ảo.

### Đã có sẵn từ trước (không đổi)
`GET /contacts` (nay nhận thêm `labels[]=`), `?sort=` (`name|email|phone_number|last_activity_at|created_at|company_name|city|country`, `-` = giảm dần),
`?include_contact_inboxes=true|false`, `GET /contacts/active`, `POST /contacts/filter`, `GET /contacts/search`,
`POST /contacts/{id}/destroy_custom_attributes`, `DELETE /contacts/{id}/avatar`.

## Bảng trace Ruby ↔ PHP

| Chatwoot | Yona | Ghi chú |
|---|---|---|
| `db/schema.rb` `data_imports`, `data_import_errors` | `database/migrations/2026_09_06_990000_create_data_imports_tables.php` | đủ cột bản gốc; thêm cột `role` cho bảng `attachments` dùng chung (thay `has_one_attached :import_file/:failed_records/:contacts_export`) |
| `app/models/data_import.rb` | `app/Models/DataImport.php` | enum `status` giữ nguyên số (6 = completed_with_errors, 7 = abandoned); `set_default_name`; chỉ nhánh `legacy_contacts_csv_import?` |
| `app/models/data_import_error.rb` | `app/Models/DataImportError.php` | scope `skip_logs` / `non_skip_logs` theo `details->>'kind'` |
| `has_one_attached` của ActiveStorage | `app/Support/RoleAttachment.php` | chỗ DUY NHẤT biết lưu/thay/đọc tệp theo vai trò trên mọi model |
| `CSV` của Ruby + gem `csv-safe` | `app/Support/Csv.php` (+ `App\Exceptions\MalformedCsvException`) | đọc RFC 4180 có báo lỗi trích dẫn hỏng, cắt BOM, bỏ byte UTF-8 hỏng; khi ghi thì chặn ký tự mở đầu công thức (`= + - @ tab CR`) |
| `app/jobs/data_import_job.rb` | `app/Jobs/DataImportJob.php` | queue `low`; cùng thứ tự: lọc nhãn lạ → dựng liên hệ → lưu → gắn nhãn → cập nhật trạng thái → ghi tệp lỗi → gửi thư |
| `app/services/data_import/contact_manager.rb` | `app/Services/DataImport/ContactManager.php` | gộp theo identifier → email → phone_number, chuẩn hoá `+` cho số điện thoại |
| `after_create_commit :process_data_import` (chờ 1 phút) | `app/Services/DataImports/ContactsImportService.php` | cổng duy nhất tạo lần nhập; tệp đã nằm trên đĩa trước khi xếp job nên không cần độ trễ |
| `app/jobs/account/contacts_export_job.rb` | `app/Jobs/Account/ContactsExportJob.php` | queue `low`; BOM UTF-8, cột ảo `labels`, lọc theo `payload` (dùng lại `Contacts\FilterService` của E1) hoặc `label` |
| `AdministratorNotifications::AccountNotificationMailer` + 3 liquid | `app/Notifications/AccountNotification.php` + `resources/views/mail/account-notification/*.blade.php` | một lớp cho mọi thư cấp tài khoản: `contact-import-complete`, `contact-import-failed`, `contact-export-complete` |
| `data_imports_controller.rb` (index/show) + jbuilder | `app/Http/Controllers/WebApi/DataImportsController.php` + `app/Http/Resources/DataImportResource.php` | |
| `app/policies/data_import_policy.rb` | `app/Policies/DataImportPolicy.php` | |
| `contacts_controller.rb#import/#export` + `params[:labels]` ở `index` | `WebApi/ContactsController.php` (3 chỗ) | |
| `Contact` model validations (`email`, `identifier`, `phone_number`, độ dài) | `Contact::validationErrors()` (concern `SelfValidating`) | **gộp một nguồn**: trước đây luật này nằm trong `ContactsController::validateContactPayload`; nay controller (422) và đường nhập CSV (dòng lỗi) dùng chung |

## Bảng trace spec ↔ Pest

| RSpec | Pest |
|---|---|
| `spec/models/data_import_spec.rb` (phần CSV) | `tests/Feature/Models/DataImportTest.php` (4) |
| `spec/jobs/data_import_job_spec.rb` | `tests/Feature/Jobs/DataImportJobTest.php` (10, gồm kịch bản "Test ngay" 100 dòng/5 lỗi) |
| `spec/jobs/account/contacts_export_job_spec.rb` | `tests/Feature/Jobs/ContactsExportJobTest.php` (8) |
| `spec/controllers/api/v1/accounts/contacts_controller_spec.rb` (`#import`, `#export`) + data_imports | `tests/Feature/WebApi/DataImportsControllerTest.php` (10) |
| `contacts_controller_spec.rb` (lọc `labels` ở index) | `tests/Feature/WebApi/Contacts/IndexLabelsFilterTest.php` (2) |
| thư viện CSV của Ruby | `tests/Feature/Support/CsvTest.php` (7) |

## Khác biệt cố ý

1. **Không port nguồn nhập tích hợp Freshdesk/Intercom** (`DataImports::{Source,Importer,CreationService,RetryService,RestartService}` + client HTTP + `data_import_items`/`data_import_mappings`): cần API bên ngoài, không thuộc wedge CSV, và các action `validate_source/start/retry/abandon/error_logs/skip_logs` chỉ phục vụ chúng. `data_import_errors` VẪN được tạo vì JSON index/show mang `import_errors_count`/`skip_logs_count`; hiện đường CSV không ghi vào bảng này.
2. Trường `stalled` luôn `false` và `POST /data_imports` chưa mở — cả hai chỉ có nghĩa với nguồn tích hợp.
3. Thêm `failed_records_url` vào JSON để FE tải tệp lỗi (bản gốc chỉ đính liên kết trong email).
4. `Contact.import(on_duplicate_key_ignore:)` thay bằng lưu từng dòng có kiểm tra trùng trước khi lưu — cùng kết quả: dòng trùng vẫn tính vào `processed_records` nhưng không tạo thêm liên hệ.
5. Bảng `attachments` có thêm cột `role` (nullable) — cần cho ba tệp cùng gắn trên một bản ghi; các nơi cũ không dùng cột này.
6. Không có độ trễ 1 phút trước khi chạy job (xem bảng trace).

## Bẫy đã trả giá

1. **`update(['feature_flags' => …])` im lặng không ghi** — `feature_flags` không nằm trong `$fillable` của `Account`; factory ghi được vì dùng `forceCreate`. Trong test phải `forceFill([...])->save()`, nếu không sẽ tưởng gate feature hỏng.
2. **Sinh CSV trong test bằng `implode(',')`** làm cột `labels` ("customer,vip") vỡ thành nhiều cột → nhãn biến mất một cách khó hiểu. Phải bọc dấu nháy kép; ngược lại KHÔNG dùng `Csv::generate` để dựng dữ liệu nhập vì nó thêm `'` vào số điện thoại mở đầu bằng `+`.
3. **`processed_records` đếm dòng hợp lệ, không đếm liên hệ được tạo** — dòng trùng email vẫn được tính (đúng bản gốc); ai đọc nhầm sẽ sửa sai logic.
4. Bảng `attachments` gắn morph theo tên lớp đầy đủ (`App\Models\…`) vì `morphMap` chưa khai báo các model này — `RoleAttachment` phải dùng quan hệ `morphMany` của chính model thay vì tự dựng `attachable_type`.

## Gate

1. **Pest toàn suite xanh trên DB riêng `yona_rw_test_e3`: 1573/1573 (3823 assertion, 207s)**, sau đó `dropdb`.
   Test mới của E3: `Models/DataImportTest` (4), `Jobs/DataImportJobTest` (10), `Jobs/ContactsExportJobTest` (8),
   `WebApi/DataImportsControllerTest` (11), `WebApi/Contacts/IndexLabelsFilterTest` (2), `Support/CsvTest` (7).
2. `vendor/bin/pint` theo danh sách file của E3 — xanh.
3. `php artisan migrate` trên `yona_rw` — chạy `2026_09_06_990000_create_data_imports_tables`, DONE (không dùng fresh/refresh/wipe).
4. **"Test ngay" (nhập thật, 100 dòng / 5 dòng lỗi)** — hai lượt:
   - Qua đúng đường HTTP `POST /contacts/import` trong Pest: 95 liên hệ vào, `processed_records=95`, `total_records=100`,
     trạng thái `completed`, tệp lỗi đúng **5 dòng**.
   - Chạy thật trên DB dev `yona_rw` (bọc transaction rồi rollback, đã dọn tệp trong `storage/app/public/data_imports`):
     `status=completed processed=95 total=100 contacts=95 failed_rows=5`, dòng lỗi đầu tiên mang
     `"Email Invalid email, Phone number should be in e164 format"`.

## Việc cần phiên chính / agent khác
- Route Inertia cho trang `settings/data` (Index + Show) chưa có trong `routes/web.php` — `e3-fe` cần thì phiên chính thêm.
- Feature `data_import` mặc định TẮT: muốn thấy màn hình Data import trên `localhost:8000` phải bật `feature_flags.data_import` cho account 2.
- File dùng chung đã sửa (tối thiểu): `app/Models/Account.php` (thêm quan hệ `dataImports`), `app/Models/Attachment.php`
  (thêm `role` vào `$fillable`), `app/Models/Contact.php` (thêm `validationErrors()`),
  `app/Http/Controllers/WebApi/ContactsController.php` (3 chỗ: `import`, `export`, lọc `labels` ở `index`;
  `validateContactPayload` nay gọi validation của model), `lang/en/errors.php` (khối `contacts.import/export`).
