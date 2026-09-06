# F6-misc — Dialogflow, Google Translate, OpenAI (KeyValidator), Dyte

Agent `f6-misc`. Nguồn: Chatwoot v4.17.1 (`refs/chatwoot`), cấm `enterprise/`. Ngày 06/09/2026.
Không đụng Slack (`f6-slack` làm riêng) — chỉ thêm 3 khoá vào `config/integration/apps.php`
(`dialogflow.event_processor`, `google_translate.event_processor`, `openai.credential_validator`).

## Khác biệt cố ý

1. **REST thay gRPC/gem.** Bản gốc Dialogflow dùng gem `google-cloud-dialogflow`
   (gRPC), Google Translate dùng `google-cloud-translate-v3` — cả hai đều KHÔNG
   có trong `composer.json`. Port gọi thẳng REST:
   - Dialogflow: `POST https://{endpoint}/v2/projects/{project}/agent/sessions/{id}:detectIntent`
     (hoặc `.../locations/{region}/agent/sessions/{id}` khi có region).
   - Google Translate: `POST https://translation.googleapis.com/v3/projects/{id}:translateText`
     và `:detectLanguage`.
   - Cả hai lấy access token qua JWT bearer grant (RFC 7523) tới
     `https://oauth2.googleapis.com/token`, gom một chỗ duy nhất:
     `app/Services/Integrations/Google/ServiceAccountToken.php` (DRY — Dialogflow
     và Google Translate cùng dùng, sửa cách lấy token chỉ sửa 1 file).
   - **Không cache token** — mỗi lần gọi API lấy token mới. Đơn giản hoá có chủ đích
     cho MVP; nếu tần suất gọi cao, thêm cache token theo `exp` là việc của người
     sau, sửa đúng 1 chỗ (`ServiceAccountToken`).
2. **`Google::Cloud::PermissionDeniedError`** (Dialogflow) → ánh xạ thành HTTP 403
   từ REST response (không có exception type gRPC để bắt).
3. **`BotProcessorService`** (`lib/integrations/bot_processor_service.rb`) port
   thành lớp trừu tượng `app/Services/Integrations/BotProcessorService.php` —
   Dialogflow là driver duy nhất cắm vào lúc này; thêm bot khác (LLM…) chỉ cần
   kế thừa lớp này, không sửa lõi HookJob/HookListener.
4. **Adapter tách khỏi processor.** `EventProcessorResolver` gọi driver qua
   `app($processorClass)` KHÔNG tham số (interface `EventProcessor::process()`),
   trong khi `ProcessorService` (Dialogflow/BotProcessorService) cần
   `hook`/`eventName`/`eventData` mỗi lần chạy (giống `pattr_initialize` của
   bản gốc). Giải quyết bằng một lớp mỏng `Dialogflow\EventProcessor` /
   `GoogleTranslate\EventProcessor` implements `Contracts\EventProcessor`, chỉ
   dựng `ProcessorService`/`DetectLanguageService` rồi `perform()`. Không hardcode
   tên app ở lõi — khai ở `config/integration/apps.php`.
5. **Dyte/`translate` dùng đúng cơ chế xác thực + JSON hiện có** (`Http`
   facade), port 1:1 `lib/dyte.rb` sang `app/Services/Integrations/Dyte/Client.php`.
6. **`translations` lưu trong `content_attributes['translations']`, KHÔNG
   thêm cột `translations`.** Bản gốc có cột `messages.translations` riêng;
   bảng `messages` ở nhánh này CHƯA có cột đó (comment sẵn trong
   `app/Models/Message.php`: "Bỏ: … translations (F6)"), và phạm vi giao việc
   của agent này CẤM sửa migration/`app/Models/**`. Vì `content_attributes`
   (json) đã tồn tại sẵn và KHÔNG cần migration, dùng nó làm bộ nhớ đệm — cùng
   hành vi (không dịch lại cùng ngôn ngữ), khác chỗ lưu. Khi có người port cột
   `translations` thật, chỉ cần sửa `alreadyTranslated()`/`storeTranslation()`
   trong `MessagesController`, đổi 1 chỗ.
7. **`update_columns` của Ruby (Dyte lưu participant id)** → port thành
   `newModelQuery()->whereKey(...)->toBase()->update([...])` (cùng khuôn
   `Conversation::handleResolvedStatusChange` đã có sẵn trong repo) để không
   phát lại sự kiện `message.updated` chỉ vì lưu participant id — khớp ý định
   bản gốc (dùng `update_columns` chính vì lý do này).
8. **`DyteController#authorize_request`** (`authorize @conversation, :show?`)
   tái dùng `Controller::fetchConversationForUser()` có sẵn (cùng logic
   `ConversationPolicy#show?` D1-era) thay vì viết lại authorization riêng.
9. **`account.hooks.find_by!(app_id: 'dyte')` chưa có hook → `RecordNotFound`**
   không được Rails controller catch riêng, mặc định Rails trả 404. Port giữ
   nguyên: `Hook::firstOrFail()` ném `ModelNotFoundException`, Laravel exception
   handler tự trả 404 — không thêm try/catch giả.

## Nợ (do KHÔNG được sửa `lang/**`/migration/`app/Models/**`)

| Chỗ thiếu | Giá trị bản gốc | Xử lý hiện tại |
|---|---|---|
| `lang/en/errors.php` thiếu `errors.openai.invalid_api_key` | "OpenAI API key is invalid or revoked. Please check your key in your OpenAI dashboard." | Hardcode trong `OpenAi\KeyValidator::invalidKeyMessage()` |
| `lang/en/errors.php` thiếu `errors.dyte.realtimekit_credentials_required` | "Cloudflare RealtimeKit credentials are required. Delete the existing Dyte integration and create it again with Cloudflare RealtimeKit credentials." | Hardcode trong `Dyte\ProcessorService::missingCredentialsResponse()` |
| `lang/en/integration_apps.php` thiếu `dyte.meeting_name` | "%{agent_name} has started a meeting" | Hardcode trong `Dyte\ProcessorService::meetingTitle()` |
| Cột `messages.translations` chưa port | — | Dùng `content_attributes['translations']` (xem mục 6 ở trên) |

Khi các file trên được mở khoá cho người khác sửa, thay hardcode bằng `__('errors.openai.invalid_api_key')`
/ `__('errors.dyte.realtimekit_credentials_required')` / `__('integration_apps.dyte.meeting_name', ['agent_name' => …])`
— đúng một chỗ mỗi cái, đã cô lập trong private method riêng để dễ tìm.

## Trace Ruby ↔ PHP

| Ruby (refs/chatwoot) | PHP (yona) |
|---|---|
| `lib/integrations/bot_processor_service.rb` | `app/Services/Integrations/BotProcessorService.php` |
| `lib/integrations/dialogflow/processor_service.rb` | `app/Services/Integrations/Dialogflow/ProcessorService.php` |
| — (adapter mới, không có tương đương Ruby) | `app/Services/Integrations/Dialogflow/EventProcessor.php` |
| `lib/integrations/google_translate/detect_language_service.rb` | `app/Services/Integrations/GoogleTranslate/DetectLanguageService.php` |
| `lib/integrations/google_translate/processor_service.rb` | `app/Services/Integrations/GoogleTranslate/ProcessorService.php` |
| — (adapter mới) | `app/Services/Integrations/GoogleTranslate/EventProcessor.php` |
| `lib/integrations/openai/key_validator.rb` | `app/Services/Integrations/OpenAi/KeyValidator.php` (implements `Contracts\CredentialValidator`) |
| `lib/dyte.rb` | `app/Services/Integrations/Dyte/Client.php` |
| `lib/integrations/dyte/processor_service.rb` | `app/Services/Integrations/Dyte/ProcessorService.php` |
| `app/controllers/api/v1/accounts/integrations/dyte_controller.rb` | `app/Http/Controllers/WebApi/Integrations/DyteController.php` |
| `messages_controller.rb#translate` | `MessagesController::translate()` (+ `alreadyTranslated`/`storeTranslation`) |
| — (dùng chung, không có tương đương Ruby — Ruby lấy token qua thư viện SDK) | `app/Services/Integrations/Google/ServiceAccountToken.php` |

## Trace spec RSpec ↔ Pest

| RSpec | Pest |
|---|---|
| `spec/lib/integrations/dialogflow/processor_service_spec.rb` | `tests/Feature/Integrations/DialogflowProcessorServiceTest.php` |
| `spec/lib/integrations/google_translate/detect_language_service_spec.rb` | `tests/Feature/Integrations/GoogleTranslateDetectLanguageServiceTest.php` |
| (không có spec riêng cho `processor_service.rb` — test qua `messages_controller_spec#translate`) | `tests/Feature/Integrations/GoogleTranslateProcessorServiceTest.php` (đơn vị dịch) + `tests/Feature/Integrations/MessageTranslateTest.php` (qua controller) |
| `spec/lib/integrations/openai/key_validator_spec.rb` | `tests/Feature/Integrations/OpenAiKeyValidatorTest.php` |
| `spec/lib/dyte_spec.rb` | `tests/Feature/Integrations/DyteClientTest.php` |
| (không có spec riêng cho `dyte/processor_service.rb`) | `tests/Feature/Integrations/DyteProcessorServiceTest.php` |
| `spec/controllers/api/v1/accounts/integrations/dyte_controller_spec.rb` | `tests/Feature/Integrations/DyteControllerTest.php` |
| phần `translate` của `spec/controllers/.../messages_controller_spec.rb` | `tests/Feature/Integrations/MessageTranslateTest.php` |
| — (bổ sung, seam wiring) | `tests/Feature/Integrations/HookEventProcessorRegistryTest.php` — bịt lỗ "container resolve ≠ registry": hỏi thẳng `EventProcessorResolver::forHook()` cho hook thật + gọi `HooksController` thật với `credential_validator` openai thật (không mock lớp validator). |

## Bẫy đã trả giá (để người sau khỏi lặp lại)

1. **`Conversation::messages()` có sẵn `->orderBy('created_at')` trong relation.**
   Gọi thêm `->latest('id')` KHÔNG override thứ tự này — Postgres áp dụng
   `ORDER BY created_at ASC` trước, `id DESC` chỉ là tie-breaker khi
   `created_at` bằng nhau. Hai tin tạo liên tiếp trong cùng transaction test
   có thể có `created_at` khác nhau đủ để `id DESC` vô tác dụng. Test đúng:
   `$conversation->messages()->get()->last()`.
2. **Cache quan hệ Eloquent giữa các đối tượng khác nhau.** `MessageFactory`
   tự truy cập `$message->conversation` trong `configure()` để lấy `inbox_id`
   → quan hệ `conversation` bị cache ngay trên đối tượng `$message`. Nếu test
   sau đó `update()` một biến `$conversation` KHÁC (một PHP object khác trỏ
   cùng hàng DB) thì `$message->conversation` vẫn trả bản cache CŨ. Phải
   `$message->fresh()` trước khi dùng lại trong `ProcessorService`.
3. **`Http::fake()` gọi nhiều lần trong cùng một test KHÔNG ghi đè** — Laravel
   merge (nối thêm) `stubCallbacks`, request khớp stub ĐĂNG KÝ TRƯỚC vẫn thắng.
   Test nào cần đổi response giữa hai bước phải tách thành hai `it()`, không
   gọi `Http::fake()` hai lần trong một test mong đợi ghi đè.
4. **`$request['queryInput']['text']` (ArrayAccess lồng nhau) không ổn định
   trong closure của `Http::assertSent`** khi các request khác trong cùng
   assertion không có khoá đó (form-encoded OAuth token request) — PHP ném
   "Undefined array key" (test env coi warning là exception). Dùng
   `$request->data()['key'] ?? null` cho mọi so sánh lồng nhau trong closure
   dùng chung cho nhiều request.

## Kết quả gate

- `DB_DATABASE=yona_rw_test_f6b vendor/bin/pest tests/Feature/Integrations/` —
  116 test / 173 assertion, xanh.
- `DB_DATABASE=yona_rw_test_f6b vendor/bin/pest tests/Feature/Integrations/ tests/Feature/WebApi/Integrations/ tests/Feature/Listeners/HookListenerTest.php` —
  136 test / 231 assertion, xanh (không phá vỡ HooksController/AppsController/HookListener của `d4-be`).
- `vendor/bin/pint` trên toàn bộ file đã tạo/sửa — sạch (đã tự fix format 2 vòng đầu).
- DB test riêng `yona_rw_test_f6b` đã tạo/dùng/xoá đúng quy trình, không đụng `yona_rw`/`yona`.

## File đã tạo/sửa

- `app/Services/Integrations/Google/ServiceAccountToken.php` (mới)
- `app/Services/Integrations/BotProcessorService.php` (mới)
- `app/Services/Integrations/Dialogflow/{ProcessorService,EventProcessor}.php` (mới)
- `app/Services/Integrations/GoogleTranslate/{DetectLanguageService,ProcessorService,EventProcessor}.php` (mới)
- `app/Services/Integrations/OpenAi/KeyValidator.php` (mới)
- `app/Services/Integrations/Dyte/{Client,ProcessorService}.php` (mới)
- `app/Http/Controllers/WebApi/Integrations/DyteController.php` (mới)
- `app/Http/Controllers/WebApi/Conversations/MessagesController.php` (thêm method `translate` + 2 helper private)
- `config/integration/apps.php` (thêm 3 khoá: `openai.credential_validator`, `dialogflow.event_processor`, `google_translate.event_processor` — không đụng khoá `slack` của `f6-slack`)
- `tests/Feature/Integrations/{DialogflowProcessorServiceTest,GoogleTranslateDetectLanguageServiceTest,GoogleTranslateProcessorServiceTest,OpenAiKeyValidatorTest,DyteClientTest,DyteProcessorServiceTest,DyteControllerTest,MessageTranslateTest,HookEventProcessorRegistryTest}.php` (mới)
