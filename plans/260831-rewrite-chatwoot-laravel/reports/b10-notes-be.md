# B10 Tiện ích soạn thảo — ghi chú backend (`b10-be`)

## CONTRACT API (chốt — `b10-fe` đọc mục này)

Mọi endpoint nằm dưới `/api/v1/accounts/{accountId}`, auth phiên (cookie) hoặc header
`api_access_token`. **Không giới hạn admin** — agent thường CRUD được (đúng bản gốc:
`CannedResponsesController` không gọi `check_authorization`).

### 1. Canned responses

| Method | Path | Ghi chú |
|---|---|---|
| GET | `/canned_responses` | `?search=` tùy chọn |
| POST | `/canned_responses` | |
| PUT/PATCH | `/canned_responses/{id}` | |
| DELETE | `/canned_responses/{id}` | 200, body rỗng |

**Shape một canned response** (giống hệt `as_json` của oracle — đã đối chiếu curl):

```json
{
  "id": 2,
  "account_id": 1,
  "short_code": "probe1",
  "content": "probe one",
  "created_at": "2026-09-05T20:09:17.253Z",
  "updated_at": "2026-09-05T20:09:17.253Z"
}
```

- **`GET /canned_responses` trả MẢNG TRẦN**, KHÔNG bọc `payload` (khác `labels`).
  FE gốc xử lý riêng chỗ này bằng `extractDataFromResponse(response) => response.data`.
- Không có `?search` → thứ tự bảng (theo id, không sắp xếp) — y bản gốc.
- Có `?search=x` → lọc `short_code ILIKE %x% OR content ILIKE %x%`, xếp hạng giảm dần:
  `short_code` khớp **đầu chuỗi** (1) > `short_code` khớp **giữa** (0.5) > `content` khớp (0.2).
  `?search=` (rỗng) vẫn đi nhánh tìm kiếm → trả tất cả, không thứ tự — y bản gốc.
- POST/PUT nhận body **phẳng** `{"short_code": "...", "content": "..."}` **hoặc** bọc
  `{"canned_response": {...}}` (ParamsWrapper của Rails). FE gốc gửi phẳng.
- PUT cho phép gửi một phần (chỉ `short_code` hoặc chỉ `content`).

**Lỗi** (đối chiếu curl oracle):

| Tình huống | HTTP | Body |
|---|---|---|
| trùng `short_code` trong account | 422 | `{"message":"Short code has already been taken","attributes":["short_code"]}` |
| thiếu/rỗng `content` | 422 | `{"message":"Content can't be blank","attributes":["content"]}` |
| thiếu/rỗng `short_code` | 422 | `{"message":"Short code can't be blank","attributes":["short_code"]}` |
| thiếu cả hai (POST) | 422 | `{"message":"Content can't be blank, Short code can't be blank","attributes":["content","short_code"]}` |
| body không có khóa nào dùng được | 422 | `{"error":"param is missing or the value is empty: canned_response"}` |
| id không thuộc account / không tồn tại | 404 | `{"error":"Resource could not be found"}` |
| chưa đăng nhập | 401 | |

### 2. Draft message (Redis, không có bảng)

Singular resource — **một bản nháp cho mỗi conversation**, `{conversationId}` là **display_id**
(như mọi route conversation khác).

| Method | Path | Request | Response |
|---|---|---|---|
| GET | `/conversations/{displayId}/draft_messages` | — | `{"has_draft":false}` hoặc `{"has_draft":true,"message":"..."}` |
| PUT/PATCH | `/conversations/{displayId}/draft_messages` | `{"draft_message":{"message":"..."}}` | 200, body rỗng |
| DELETE | `/conversations/{displayId}/draft_messages` | — | 200, body rỗng |

- PATCH **thiếu** `draft_message.message` → ghi chuỗi rỗng; GET sau đó trả
  `{"has_draft":true,"message":""}` (đã kiểm trên oracle — không phải bug của bản port).
- Không hạn dùng (không TTL), không phát realtime.
- 401 nếu agent không thuộc inbox/team của conversation; 404 nếu display_id không có trong account.

> **Lưu ý cho FE:** dashboard Chatwoot v4.17.1 **KHÔNG dùng** hai endpoint draft này —
> store `draftMessages` là `localStorage` thuần (`app/javascript/dashboard/store/modules/draftMessages.js`,
> khóa `LOCAL_STORAGE_KEYS.DRAFT_MESSAGES`). Endpoint tồn tại để giữ đủ mặt tiền API như gốc.
> FE yona nên bám theo gốc: nháp lưu localStorage, không gọi API.

### 3. Khác biệt cố ý so với oracle

| Điểm | Gốc | Bản port | Lý do |
|---|---|---|---|
| Cache index canned responses | `CacheEnabledApiClient` + `GET /accounts/{id}/cache_keys` (IndexedDB) | chưa có `cache_keys` → FE lấy thẳng từ mạng | `AccountsController#cache_keys` + concern `CacheKeys`/`AccountCacheRevalidator` ngoài phạm vi B10 (endpoint nằm ở `AccountsController`); danh sách canned response nhỏ, gọi mạng không lệch UI |
| Tiền tố khóa Redis | `CONVERSATION::{id}::DRAFT_MESSAGE` | `{REDIS_PREFIX}CONVERSATION::{id}::DRAFT_MESSAGE` | prefix do `config/database.php` của Laravel áp cho MỌI khóa, giống B4/B6 |
| Index DB | `canned_responses` không có index nào ngoài PK | giữ nguyên (không thêm unique index) | uniqueness là validate tầng nhận input, y gốc |
| Thứ tự khi điểm tìm kiếm bằng nhau | PostgreSQL quyết | PostgreSQL quyết | không thêm tiebreaker để khỏi lệch gốc |

## Bảng trace Ruby ↔ PHP

| Ruby (refs/chatwoot) | PHP (yona) |
|---|---|
| `db/schema.rb` — `create_table "canned_responses"` | `database/migrations/2026_09_06_500000_create_canned_responses_table.php` |
| `app/models/canned_response.rb` | `app/Models/CannedResponse.php` |
| `CannedResponse.order_by_search` + `where` trong controller | `CannedResponse::scopeSearch()` (gộp một chỗ) |
| `include AccountCacheRevalidator` | *(bỏ — xem Khác biệt cố ý)* |
| `Account#canned_responses` | `Account::cannedResponses()` |
| `Api::V1::Accounts::CannedResponsesController` | `app/Http/Controllers/WebApi/CannedResponsesController.php` |
| `render json: @canned_response` (as_json) | `app/Http/Resources/CannedResponseResource.php` |
| `render_record_invalid` (`request_exception_handler.rb`) | `app/Support/RecordInvalidResponse::validatedOrAbort()` |
| `Redis::Alfred::CONVERSATION_DRAFT_MESSAGE` (`lib/redis/redis_keys.rb`) | `app/Support/ConversationDraftMessage::KEY` |
| `Api::V1::Accounts::Conversations::DraftMessagesController` | `app/Http/Controllers/WebApi/Conversations/DraftMessagesController.php` |
| `config/routes.rb:135` `resources :canned_responses` | `routes/web_api.php` — 4 route `canned_responses` |
| `config/routes.rb:178` `resource :draft_messages` | `routes/web_api.php` — 3 route `draft_messages` |
| `spec/.../canned_responses_controller_spec.rb` | `tests/Feature/WebApi/CannedResponsesControllerTest.php` |
| `spec/.../conversations/draft_messages_controller_spec.rb` | `tests/Feature/WebApi/Conversations/DraftMessagesControllerTest.php` |

## Gate đã chạy (`b10-be`)

- **Pest toàn suite**: 725/725 xanh trên DB test RIÊNG `yona_rw_test_b10` (+ `REDIS_DB=14`), đã drop sau khi xong.
  Lệnh: `DB_DATABASE=yona_rw_test_b10 REDIS_DB=14 vendor/bin/pest`. Riêng 2 file B10: 29 test / 55 assertion.
- **pint**: sạch trên toàn bộ file B10.
- **route:list**: 4 route `canned_responses` + 3 route `draft_messages` hiện đúng.
- **curl thật** (yona :8000, token John, account 2) đối chiếu **từng byte** với oracle :3000 (account 1):
  tạo → tìm theo short_code (đúng thứ hạng `Thanks` > `content-with-thanks` > `name-short-code`) → sửa từng phần
  → xóa; trùng short_code / thiếu content / body rỗng trả **cùng body 422**; nháp conversation 4:
  `has_draft:false` → PATCH → đọc lại → PATCH rỗng (`message:""`) → DELETE → `has_draft:false`.
- **Dọn sạch**: canned response test đã xóa cả hai bên (oracle `CannedResponse.count = 0`, yona `canned_responses` 0 hàng),
  không còn khóa Redis `*DRAFT_MESSAGE*`, đã chạy `~/www/pixel-diff/reset-fixture.sh` (yona display 4 / oracle display 1, 5 tin mỗi bên).

## Nợ / cần biết

- `GET /api/v1/accounts/{id}/cache_keys` chưa port (nằm ở `AccountsController` — file ngoài phạm vi B10).
- `app/Support/RecordInvalidResponse` là chỗ dựng lỗi 422 kiểu Rails duy nhất; `ContactsController`
  vẫn còn bản sao inline của cùng shape — nên chuyển sang dùng helper này ở lần chạm kế tiếp.
- `CannedResponse` chưa có factory (`database/factories/**` ngoài phạm vi agent này) — test tạo bản ghi trực tiếp.
- **Không cần khóa i18n backend**: thông báo lỗi 422 là chuỗi ActiveRecord của Rails, bản port ghi thẳng
  đúng chữ đó để khớp oracle. Chuỗi màn hình canned response (`cannedMgmt.json` của gốc) thuộc `b10-fe` / `yona-i18n`.
- **Lệch 404 có sẵn từ trước, KHÔNG phải do B10**: oracle trả `{"error":"Resource could not be found"}`,
  yona trả body exception mặc định của Laravel (`APP_DEBUG=true`). Đã kiểm chéo `labels/9999` và
  `conversations/9999` — lệch y hệt, tức là thiếu handler chung ở `bootstrap/app.php` (ngoài phạm vi agent này).
- `vendor/bin/pint --dirty` chạm cả file đang sửa của `b8-be` (`ConversationsController.php`,
  `Services/Conversations/UnreadCounts/Counter.php`) — chỉ sắp lại import/khoảng trắng, `php -l` cả hai vẫn sạch.
  Phiên chính nên chạy pint theo danh sách file thay vì `--dirty` khi có nhiều agent song song.
