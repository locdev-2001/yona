# E1 backend — Custom attributes + Custom filters (folders/segments)

Agent `e1-be`, 06/09/2026. Nguồn: Chatwoot v4.17.1 (`refs/chatwoot`).

---

## CONTRACT API (cho `e1-fe`) — CHỐT

Mọi route nằm dưới `/api/v1/accounts/{accountId}` (middleware `auth.api_token, auth, account.scope`).
Mốc thời gian dạng Rails ISO8601 mili giây (`2026-09-06T10:00:00.000Z`).

### 1. `custom_attribute_definitions`

Hình dạng object (port `_custom_attribute_definition.json.jbuilder`, đúng thứ tự khóa):

```json
{
  "id": 1,
  "attribute_display_name": "Ngày đặt hàng",
  "attribute_display_type": "date",
  "attribute_description": "Ngày khách chốt đơn",
  "attribute_key": "ngay_dat_hang",
  "regex_pattern": null,
  "regex_cue": null,
  "attribute_values": [],
  "attribute_model": "conversation_attribute",
  "default_value": null,
  "created_at": "2026-09-06T10:00:00.000Z",
  "updated_at": "2026-09-06T10:00:00.000Z"
}
```

- `attribute_display_type` ∈ `text | number | currency | percent | link | date | list | checkbox`
- `attribute_model` ∈ `conversation_attribute | contact_attribute` (`company_attribute` port sẵn ở model
  nhưng chưa có UI)

| Method | Path | Body | Trả về |
|---|---|---|---|
| GET | `/custom_attribute_definitions?attribute_model=conversation_attribute` | – | **mảng JSON trần** (không bọc `payload`), sắp theo `id` |
| GET | `/custom_attribute_definitions/{id}` | – | object |
| POST | `/custom_attribute_definitions` | `{"custom_attribute_definition": {...}}` | object (200) |
| PATCH/PUT | `/custom_attribute_definitions/{id}` | như trên | object (200) |
| DELETE | `/custom_attribute_definitions/{id}` | – | 204, body rỗng |

Trường nhận trong `custom_attribute_definition`: `attribute_display_name` (bắt buộc),
`attribute_description`, `attribute_display_type`, `attribute_key` (**tùy chọn**), `attribute_model`,
`regex_pattern`, `regex_cue`, `attribute_values` (mảng).

**Lệnh founder — `attribute_key` tự sinh:** API vẫn NHẬN `attribute_key` để tương thích, nhưng khi client
KHÔNG gửi (hoặc gửi chuỗi rỗng) lúc **tạo mới**, backend tự sinh key từ `attribute_display_name`:
slug ASCII không dấu, ngăn cách bằng `_` ("Ngày đặt hàng" → `ngay_dat_hang`), và tự thêm hậu tố `_2`, `_3`…
khi trùng key đã có trong cùng `account + attribute_model` hoặc trùng thuộc tính chuẩn.
→ **`e1-fe` ẩn hoàn toàn ô "Key" trong form tạo/sửa.** Khi **sửa**, không gửi `attribute_key` thì key giữ
nguyên (đổi key sẽ mồ côi dữ liệu đã lưu trong `custom_attributes` của contact/conversation).

Mã lỗi:
- `422 {"message": "The provided key is not allowed as it might conflict with default attributes."}` — key trùng thuộc tính chuẩn.
- `422 {"message": "must only contain letters, numbers, underscores, hyphens, and dots"}` — key sai định dạng (chỉ khi client tự gửi key).
- `422 {"message": "Attribute display name can't be blank"}` — thiếu tên hiển thị.
- `422 {"message": "Attribute key has already been taken"}` — trùng key trong account + model.
- `401 {"error": "You are not authorized to do this action"}` — agent gọi create/update/destroy (index/show thì agent được phép).
- `404` — không thấy trong account.

### 2. `custom_filters` (folders hội thoại + segments liên hệ)

```json
{
  "id": 7,
  "name": "Khách VIP",
  "filter_type": "conversation",
  "query": { "payload": [ { "attribute_key": "status", "filter_operator": "equal_to", "values": ["open"], "query_operator": null } ] },
  "created_at": "…", "updated_at": "…"
}
```

- `filter_type` ∈ `conversation | contact | report` (mặc định `conversation`).
- `query` là jsonb tự do — backend KHÔNG kiểm nội dung khi lưu (đúng bản gốc); chỉ khi POST tới
  `/conversations/filter` hoặc `/contacts/filter` mới validate.

| Method | Path | Body | Trả về |
|---|---|---|---|
| GET | `/custom_filters?filter_type=conversation` | – | **mảng JSON trần**, chỉ filter của người đang đăng nhập |
| GET | `/custom_filters/{id}` | – | object (404 nếu của người khác) |
| POST | `/custom_filters` | `{"custom_filter": {"name","filter_type","query"}}` | object (200) |
| PATCH/PUT | `/custom_filters/{id}` | như trên | object (200) |
| DELETE | `/custom_filters/{id}` | – | 204 |

Mã lỗi: `422 {"message": "Account Limit reached. The maximum number of allowed custom filters for a user per account is 1000."}`
khi vượt 1000 filter/người/account; `422 {"message":"Name can't be blank"}`; `404` khi id thuộc người khác.

### 3. `POST /conversations/filter` (mở rộng, KHÔNG đổi hình dạng cũ)

Body `{"payload": [ condition… ], "page": 1}` (page cũng nhận qua query string).

```json
{ "attribute_key": "ngay_dat_hang",
  "filter_operator": "is_greater_than",
  "values": ["2026-01-01"],
  "query_operator": "and",
  "custom_attribute_type": "conversation_attribute" }
```

- `query_operator` (`and`/`or`, không phân biệt hoa thường) nằm ở **điều kiện đứng trước**, nối nó với điều
  kiện kế tiếp; điều kiện **cuối cùng phải bỏ trống** `query_operator` (gửi `null`/`""` đều được).
- `custom_attribute_type`: FE gửi `""` cho thuộc tính chuẩn. Với thuộc tính tuỳ chỉnh có thể bỏ trống —
  backend tự suy ra `conversation_attribute` (hoặc `contact_attribute` ở API contacts).
- Thuộc tính chuẩn hỗ trợ + operator hợp lệ: xem bảng dưới; mọi key khác được tra trong
  `custom_attribute_definitions` của account theo đúng model.
- Trả về không đổi: `{"data": {"meta": {mine_count, assigned_count, unassigned_count, all_count}, "payload": [conversation…]}}`.

### 4. `POST /contacts/filter` (MỚI)

Body giống trên (không có `page` trong body; dùng query `?page=1`, `?sort=`,
`?include_contact_inboxes=`). Trả về **giống `GET /contacts`**:

```json
{ "meta": { "count": 12, "current_page": 1 }, "payload": [ contact… ] }
```

### 5. Lỗi chung của hai endpoint filter — `422 {"message": "…"}`

| Tình huống | message |
|---|---|
| key không phải thuộc tính chuẩn và cũng không có custom attribute | `Invalid attribute key - [foo]. The key should be one of [status,assignee_id,…] or a custom attribute defined in the account.` |
| operator không hợp lệ cho key | `Invalid operator. The allowed operators for country_code are [equal_to,not_equal_to].` |
| `query_operator` khác AND/OR, hoặc điều kiện cuối vẫn còn `query_operator` | `Query operator must be either "AND" or "OR".` |
| thiếu `values`, hoặc giá trị không ép được về số/ngày, hoặc `days_before` ngoài 1..998 | `Invalid value. The values provided for created_at are invalid` |

### 6. Bảng thuộc tính chuẩn + operator (port `lib/filters/filter_keys.yml`)

**conversations:** `status`, `priority` (equal_to, not_equal_to) · `assignee_id`, `inbox_id`, `team_id`,
`campaign_id`, `labels` (+ is_present, is_not_present) · `contact_id` (equal_to, not_equal_to) ·
`display_id`, `referer` (+ contains, does_not_contain) · `browser_language`, `conversation_language`
(equal_to, not_equal_to) · `mail_subject` (equal_to, not_equal_to, contains, does_not_contain) ·
`created_at`, `last_activity_at` (is_greater_than, is_less_than, days_before).

**contacts:** `name`, `email`, `city`, `company_name` (equal_to, not_equal_to, contains, does_not_contain) ·
`phone_number` (+ starts_with) · `identifier`, `country_code` (equal_to, not_equal_to) ·
`labels` (equal_to, not_equal_to, is_present, is_not_present) · `blocked` (equal_to, not_equal_to) ·
`created_at`, `last_activity_at` (is_greater_than, is_less_than, days_before).

**Custom attribute:** operator hợp lệ suy từ `attribute_display_type` —
`text`/`link`/`list`: equal_to, not_equal_to, contains, does_not_contain, is_present, is_not_present ·
`number`: equal_to, not_equal_to, is_greater_than, is_less_than, is_present, is_not_present ·
`date`: is_greater_than, is_less_than, days_before, is_present, is_not_present ·
`checkbox`: equal_to, not_equal_to, is_present, is_not_present.

### 7. Route cần phiên chính thêm

`routes/web_api.php` đã có sẵn `/custom_attribute_definitions` và `/custom_filters`.
**Đã thêm 1 dòng** (nằm trong vùng sở hữu E1 theo brief):

```php
Route::post('/contacts/filter', [ContactsController::class, 'filter']);
```

---

## Bảng trace Ruby ↔ PHP

| Chatwoot (refs/chatwoot) | Yona |
|---|---|
| `db/schema.rb` `custom_attribute_definitions`, `custom_filters` | `database/migrations/2026_09_06_980000_create_custom_attributes_and_filters_tables.php` |
| `app/models/custom_attribute_definition.rb` | `app/Models/CustomAttributeDefinition.php` |
| `app/models/custom_filter.rb` (+ `lib/limits.rb` `MAX_CUSTOM_FILTERS_PER_USER`) | `app/Models/CustomFilter.php` (`MAX_PER_USER`, `reachedLimit()`) |
| `app/policies/custom_attribute_definition_policy.rb` | `app/Policies/CustomAttributeDefinitionPolicy.php` |
| `app/policies/custom_filter_policy.rb` | (không port — xem "Khác biệt cố ý") |
| `app/controllers/api/v1/accounts/custom_attribute_definitions_controller.rb` | `app/Http/Controllers/WebApi/CustomAttributeDefinitionsController.php` |
| `app/controllers/api/v1/accounts/custom_filters_controller.rb` | `app/Http/Controllers/WebApi/CustomFiltersController.php` |
| `app/views/api/v1/models/_custom_attribute_definition.json.jbuilder` | `app/Http/Resources/CustomAttributeDefinitionResource.php` |
| `app/views/api/v1/models/_custom_filter.json.jbuilder` | `app/Http/Resources/CustomFilterResource.php` |
| `lib/filters/filter_keys.yml` + `FilterService::ATTRIBUTE_TYPES` | `app/Services/Filters/FilterKeys.php` |
| `app/services/filter_service.rb` + `app/helpers/filters/filter_helper.rb` + `app/services/filters/custom_attribute_filter_helper.rb` | `app/Services/Filters/BaseFilterService.php` |
| `app/services/conversations/filter_service.rb` | `app/Services/Conversations/FilterService.php` (mở rộng lớp có sẵn, KHÔNG nhân bản) |
| `app/services/contacts/filter_service.rb` | `app/Services/Contacts/FilterService.php` |
| `lib/custom_exceptions/custom_filter.rb` | `app/Exceptions/CustomFilterException.php` |
| `config/locales/en.yml` `errors.custom_filters` + `errors.custom_attribute_definition` | `lang/en/errors.php` |
| `contacts_controller#filter` + `contacts/filter.json.jbuilder` | `ContactsController@filter` (dùng lại `paginatedContacts`) |
| `spec/factories/custom_attribute_definitions.rb`, `custom_filters.rb` | `database/factories/CustomAttributeDefinitionFactory.php`, `CustomFilterFactory.php` |

Cấu trúc lớp: `BaseFilterService` giữ toàn bộ phần chung (kiểm payload, nối AND/OR,
custom attribute, labels, ngày, biểu thức so sánh). Hai lớp con chỉ khai báo bảng, bảng
thuộc tính chuẩn, model custom attribute, và ghi đè hai điểm mở:
`applyEntitySpecificColumn()` (hội thoại: enum status/priority, assignee hai cột,
display_id ép text) và `normalizeValue()` (liên hệ: số điện thoại E.164).
Thêm thực thể lọc mới = thêm một lớp con + một hằng trong `FilterKeys`, không sửa lõi.

## Spec ↔ Pest

| RSpec | Pest |
|---|---|
| `spec/controllers/api/v1/accounts/custom_attribute_definitions_controller_spec.rb` | `tests/Feature/WebApi/CustomAttributeDefinitionsControllerTest.php` (14 test) |
| `spec/controllers/api/v1/accounts/custom_filters_controller_spec.rb` | `tests/Feature/WebApi/CustomFiltersControllerTest.php` (8 test) |
| `spec/models/custom_attribute_definition_spec.rb` (định dạng key, strip, key trùng chuẩn) | gộp vào `CustomAttributeDefinitionsControllerTest` — kiểm qua API vì validation nằm ở tầng controller |
| `spec/controllers/.../contacts_controller_spec.rb` khối `contacts/filter` | `tests/Feature/WebApi/ContactsFilterControllerTest.php` (7 test) |
| `spec/services/filter_service_spec.rb`, `spec/services/contacts/filter_service_spec.rb`, `spec/services/filters/**` | `tests/Feature/Services/CustomAttributeFilterTest.php` (10 test) + `ContactsFilterControllerTest` |
| `spec/models/custom_filter_spec.rb` (invalidate cache đếm) | KHÔNG port — `FilteredCountStore` chưa có trong Yona |

Test cũ `tests/Feature/WebApi/ConversationsFilterControllerTest.php` (6 test) giữ nguyên
và vẫn xanh sau khi thay lõi — đây là lưới an toàn cho việc refactor.

## Khác biệt cố ý

1. **`attribute_key` tự sinh** (lệnh founder): bản gốc bắt buộc nhập key. Yona vẫn nhận key
   nếu client gửi; không gửi thì sinh slug ASCII từ tên hiển thị, tránh trùng bằng hậu tố số.
   Sửa mà không gửi key thì key giữ nguyên (đổi key sẽ mồ côi dữ liệu trong `custom_attributes`).
2. **Không có `CustomFilterPolicy`**: policy gốc cho phép cả admin lẫn agent, mà Yona chỉ có
   hai vai trò đó → luôn true. Phạm vi thật đã khoá bằng `account_id + user_id` trong controller.
3. **Kiểu hiển thị không lọc được** (`currency`, `percent`) trả 422 "Invalid attribute key"
   thay vì rơi vào SQL hỏng như bản gốc (`::` rỗng vì `ATTRIBUTE_TYPES` không có hai kiểu này).
4. **Operator của custom attribute được kiểm**: bản gốc bỏ qua bước kiểm operator khi key
   không phải thuộc tính chuẩn, nên `contains` trên số sinh SQL sai kiểu. Yona trả 422 với
   danh sách operator hợp lệ theo `attribute_display_type`.
5. **So bằng trên custom attribute text nhận nhiều giá trị**: bản gốc chỉ lấy `values[0]`
   (`string_filter_values` trả về vô hướng). Yona dùng `IN (…)` cho cả danh sách — siêu tập
   của hành vi cũ, UI hiện chỉ gửi một giá trị.
6. **`starts_with` của `phone_number` thật sự là "bắt đầu bằng"**: bản gốc rơi vào nhánh
   `else` và biến nó thành so bằng (`like_filter_string` khai báo nhưng không dùng).
7. **`does_not_contain` trên custom attribute cũng bắt hàng chưa gán** (thêm `OR … IS NULL`);
   bản gốc chỉ làm vậy cho `not_equal_to`. Cùng nguyên tắc "không chứa thì chưa có cũng tính".
8. **Chuẩn hoá số điện thoại chỉ áp cho so bằng**, không áp cho `contains`/`starts_with`
   (bản gốc dùng hai đường giá trị khác nhau cho hai nhóm operator — kết quả tương đương).
9. **Không port**: `company_attribute` (chỉ giữ hằng trong model, chưa có UI/route),
   đồng bộ pre-chat field của widget (`Inboxes::*WidgetPreChatCustomFieldsJob`), và
   invalidate cache đếm chưa đọc theo filter (`Conversations::UnreadCounts::FilteredCount*`).
   Ba thứ này chờ tính năng tương ứng được port.
10. **`filter_type = report`** giữ trong enum (bản gốc có) nhưng chưa có màn hình dùng.

## Bẫy đã trả giá

- **`ContactsFilterService` phải dùng `resolvedContacts`**: liên hệ không có email/điện thoại/
  identifier bị loại khỏi kết quả — giống `GET /contacts`. Test tạo contact phải có email,
  nếu không sẽ "lọc đúng mà đếm ra 0" và tưởng là lỗi bộ lọc.
- **`country_code` của liên hệ nằm trong `additional_attributes`, không phải cột cùng tên**
  (model Yona có cả cột `country_code`). Nguồn chuẩn là `filter_keys.yml`, không phải schema.
- **Tên custom attribute phải là placeholder, không nội suy**: `custom_attributes ->> ?`.
  Bản gốc dùng `sanitize_sql_array` cho đúng lý do này; nội suy thẳng sẽ mở đường SQL injection
  vì key do người dùng đặt.
- **`NOT IN` trên jsonb bỏ sót hàng chưa gán thuộc tính** — phải thêm `OR … IS NULL`, đây là
  lỗi hay gặp khi dịch `not_in_custom_attr_query`.
- **`query_operator` nằm ở điều kiện ĐỨNG TRƯỚC**, không phải điều kiện hiện tại; điều kiện
  cuối cùng bắt buộc bỏ trống. Nhầm chỗ này làm AND/OR lệch một nhịp mà test một điều kiện
  không phát hiện được.
- **Cây thư mục dùng chung**: migration `help_center` của `e4-be` lúc đang viết có index GIN
  thiếu cặp ngoặc → MỌI test của mọi agent đỏ với "syntax error at or near ||". Không sửa hộ,
  chờ họ sửa (họ đã sửa). Bài học: lỗi đỏ hàng loạt ở migration lạ = chờ, đừng đi truy lõi mình.
- **`createdb` bằng `yona_owner` bị từ chối**: phải `createdb -U postgres` rồi
  `ALTER DATABASE … OWNER TO yona_owner`, sau đó tạo `pg_trgm` + `pgcrypto`.

## Kết quả gate

| Gate | Kết quả |
|---|---|
| Pest của E1 | `CustomAttributeDefinitionsControllerTest` 14 ✓, `CustomFiltersControllerTest` 8 ✓, `ContactsFilterControllerTest` 7 ✓, `CustomAttributeFilterTest` 10 ✓ |
| Test hồi quy lõi cũ | `ConversationsFilterControllerTest` 6 ✓ (không sửa test) |
| Toàn suite | `DB_DATABASE=yona_rw_test_e1 vendor/bin/pest` → **1532 passed, 3732 assertions**, 236s |
| Pint | sạch trên toàn bộ file thuộc E1 |
| `php artisan migrate` trên `yona_rw` | ✓ (`2026_09_06_980000_create_custom_attributes_and_filters_tables`) |
| DB test | `yona_rw_test_e1` đã `dropdb` sau khi chạy xong |

---

## Sửa sau QA (agent `e1-fix`, 06/09/2026) — map thuộc tính rỗng phải là `{}`

Phát hiện của phiên chính: `custom_attributes` rỗng của Contact/Conversation serialize thành `[]`
(mảng PHP rỗng) trong khi oracle trả `{}`.

**Một nơi duy nhất:** trait `app/Http/Resources/Concerns/SerializesAttributeMaps.php`
(`attributeMap(mixed $attributes): stdClass`). Mọi resource emit `custom_attributes` /
`additional_attributes` gọi qua nó:

| Resource | Khóa |
|---|---|
| `ContactResource` (toArray, pushEventData, webhookData) | `custom_attributes`, `additional_attributes` |
| `ConversationResource` (toArray, pushEventData/webhookData dùng lại) | `custom_attributes`, `additional_attributes` |
| `MessageResource` (toArray, webhookData) | `additional_attributes` |
| `AgentResource` | `custom_attributes` |
| `InboxResource` (channel) | `additional_attributes` |
| `Widget/WidgetConversationResource` | `custom_attributes` |
| `Search/SearchContactResource`, `Search/SearchConversationResource` | `additional_attributes` |

Map có dữ liệu vẫn ra JSON y hệt trước; chỉ khác ở trường hợp rỗng.

**Pest:** `tests/Feature/Http/Resources/AttributeMapSerializationTest.php` (4 test) — khẳng định chuỗi
JSON chứa `"custom_attributes":{}` / `"additional_attributes":{}` cho conversation, contact, message,
và map có dữ liệu giữ nguyên nội dung.

### Bẫy đã trả giá

- **`===` trên payload có stdClass là so ĐỊA CHỈ, không phải so giá trị.** Ba test cũ so payload
  broadcast/event bằng `$data === [...Resource::pushEventData($x), …]` đỏ ngay sau khi đổi:
  `ActionCableBroadcastJobTest`, `ActionCableListenerTest`, `Models/ContactTest`. Đổi đúng ba chỗ đó sang
  `==` (so giá trị đệ quy, không nới lỏng nội dung) + ghi chú lý do tại chỗ. Các assert dùng `toEqual`
  không bị ảnh hưởng.

### Nợ ghi lại (KHÔNG sửa vì nằm ngoài tầng Resource)

Ba chỗ serialize map thuộc tính không đi qua resource, vẫn trả `[]` khi rỗng:
`WebApi/ProfilesController` (`custom_attributes` của user), `WebApi/Conversations/MessagesController`
(`meta.additional_attributes`), và các đường `attributesToArray()` của widget
(`Widget/ContactsController@destroyCustomAttributes`, `Widget/ConversationsController@destroyCustomAttributes`).

### Gate

`DB_DATABASE=yona_rw_test_e1fix vendor/bin/pest` → **1588 passed** (DB đã `dropdb`); pint passed trên
toàn bộ file đã sửa.
