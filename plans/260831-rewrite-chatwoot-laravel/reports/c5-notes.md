# C5 — CSAT (agent `c5`)

Port trọn tính năng khảo sát mức hài lòng: bảng + model, mẫu tin khảo sát khi hội thoại
được giải quyết, bong bóng chấm điểm trong widget, trang khảo sát công khai
`/survey/responses/{uuid}`, tab CSAT trong settings inbox.

## Hợp đồng (đọc trước khi cắm thêm)

### 1. Điểm kích hoạt DUY NHẤT

```
Conversation::updated → notifyStatusChange() → CONVERSATION_STATUS_CHANGED
    → App\Listeners\CsatSurveyListener::conversationStatusChanged
        → App\Services\CsatSurveyService::perform()          ← chỗ quyết định "có gửi không"
            → App\Services\MessageTemplates\Template\CsatSurvey  ← chèn tin input_csat
```

`CsatSurvey` KHÔNG đi qua `HookExecutionService` (khác greeting/email-collect) — đúng bản
gốc. Thêm kênh mới có mẫu khảo sát riêng (WhatsApp/Twilio, nhóm F) = thêm nhánh trong
`CsatSurveyService::perform()`, **không** rải điều kiện ra listener/controller.

Điều kiện gửi (`shouldSendCsatSurvey`): hội thoại `resolved` + `inbox.csat_survey_enabled`
+ chưa từng có tin `input_csat` + qua được `survey_rules`. Ngoài cửa sổ nhắn tin
(`conversation.canReply() == false`) thì chèn tin activity
`conversations.activity.csat.not_sent_due_to_messaging_window` thay vì khảo sát.

`survey_rules` = `{operator: contains|does_not_contain, values: [nhãn…]}`; danh sách nhãn
rỗng ⇒ không chặn gì.

### 2. Ghi phiếu trả lời

```
Message::updated → MESSAGE_UPDATED → CsatSurveyListener::messageUpdated
    → App\Builders\CsatSurveys\ResponseBuilder  (upsert theo message_id)
```

Nguồn dữ liệu là `messages.content_attributes.submitted_values.csat_survey_response`
(`{rating, feedback_message}`). Hai đường ghi vào đó:

| Đường | Dùng bởi |
|---|---|
| `PATCH /api/v1/widget/messages/{id}` | bong bóng CSAT trong widget (đã có từ C2) |
| `PUT/PATCH /public/api/v1/csat_survey/{uuid}` | trang khảo sát công khai |

Cả hai lọc payload qua `App\Support\SubmittedValues::permit()` — port của
`params.permit(message: [{submitted_values: [:name, :title, :value, {csat_survey_response:
[:feedback_message, :rating]}]}])`. Trước C5 đường widget ghi thẳng mảng thô của khách vào
`content_attributes`; nay khóa lạ bị loại (khách ghi được vào ô mà agent đọc).

`rating` phải thuộc 1..5, nếu không model từ chối lưu (`RecordInvalidException`); listener
bắt lại + `report()` nên khách vẫn nhận 200 như bản gốc (bản gốc chạy async, job hỏng lặng).

### 3. Gốc URL thứ hai của mặt tiền `api`

`/public/api/v1/*` (Chatwoot `namespace :public`) đăng ký ở `bootstrap/app.php` →
`routes/api_public.php`, middleware `api`: **không session, không CSRF, không token** —
người gọi tự chứng minh bằng `uuid` khó đoán trên URL. Cùng bản chất `routes/api.php`
(§0.4: API cho bên ngoài, hợp đồng công khai), chỉ khác gốc URL vì phải giữ đúng đường dẫn
Chatwoot. `shouldRenderJsonWhen` + handler 404 trong `bootstrap/app.php` đã nhận thêm
`public/api/*` để lỗi trả JSON chứ không phải HTML.

Nhóm D (Help Center `/hc`, `/public/api/v1/portals`) và Platform API cắm tiếp vào file này.

### 4. Payload trang khảo sát công khai

`GET /public/api/v1/csat_survey/{uuid}` → `App\Http\Resources\Public\CsatSurveyResource`:

```jsonc
{
  "id": 12, "csat_survey_response": null | {…hàng csat_survey_responses…},
  "display_type": "emoji|star", "content": "…hoặc null",
  "inbox_avatar_url": "…", "inbox_name": "…", "locale": "en",
  "conversation_id": 47, "created_at": "2026-09-06T…Z"
}
```

`PUT` cùng đường dẫn: quá **14 ngày** kể từ NGÀY tạo tin khảo sát → `422
{"error":"You cannot update the CSAT survey after 14 days"}`.

## Bảng trace Ruby ↔ PHP

| Nguồn Chatwoot | Đích Yona | Ghi chú |
|---|---|---|
| `db/schema.rb` khối `csat_survey_responses` | `database/migrations/2026_09_06_910000_create_csat_survey_responses_table.php` | bỏ 3 cột review notes (EE) — Khác biệt #1 |
| `app/models/csat_survey_response.rb` | `app/Models/CsatSurveyResponse.php` | scope `filter_by_*` để cùng báo cáo D2 |
| `app/services/csat_survey_service.rb` | `app/Services/CsatSurveyService.php` | bỏ 2 nhánh mẫu WhatsApp/Twilio — Khác biệt #2 |
| `app/services/message_templates/template/csat_survey.rb` | `app/Services/MessageTemplates/Template/CsatSurvey.php` | dùng `BaseTemplate` của C3 |
| `app/builders/csat_surveys/response_builder.rb` | `app/Builders/CsatSurveys/ResponseBuilder.php` | |
| `app/listeners/csat_survey_listener.rb` | `app/Listeners/CsatSurveyListener.php` | đồng bộ thay async — Khác biệt #3 |
| `app/controllers/public/api/v1/csat_survey_controller.rb` | `app/Http/Controllers/Public/CsatSurveyController.php` | |
| `app/views/public/api/v1/models/_csat_survey.json.jbuilder` | `app/Http/Resources/Public/CsatSurveyResource.php` | |
| `config/routes.rb` `namespace :public` + `namespace :survey` | `routes/api_public.php` + `routes/web.php` (`/survey/responses/{uuid}`) | |
| `app/controllers/survey/responses_controller.rb` + `show.html.erb` | `resources/views/survey.blade.php` | `window.globalConfig` nhúng sẵn như bản gốc |
| `params.permit(message: [{submitted_values: …}])` | `app/Support/SubmittedValues.php` | dùng chung widget + public |
| `message.rb` `has_one :csat_survey_response`, `input_csat?` | `Message::csatSurveyResponse()`, `Message::isInputCsat()` | |
| `conversation.rb#activity_message_params` (chỗ dùng chung) | `Conversation::activityMessageParams()` đổi `private` → `public` | CSAT "không gửi được" dùng lại, không chép |
| `spec/models/csat_survey_response_spec.rb` | `tests/Feature/Models/CsatSurveyResponseTest.php` (9 test) | |
| `spec/services/csat_survey_service_spec.rb` | `tests/Feature/Services/CsatSurveyServiceTest.php` (9 test) | |
| `spec/services/message_templates/template/csat_survey_spec.rb` | 2 test thêm vào `tests/Feature/Services/MessageTemplates/TemplateTest.php` | |
| `spec/builders/csat_surveys/response_builder_spec.rb` | `tests/Feature/Builders/CsatSurveys/ResponseBuilderTest.php` (4 test) | |
| `spec/listeners/csat_survey_listener_spec.rb` | `tests/Feature/Listeners/CsatSurveyListenerTest.php` (5 test) | |
| `spec/controllers/public/api/v1/csat_survey_controller_spec.rb` | `tests/Feature/Public/CsatSurveyControllerTest.php` (6 test) | |

### Vue ↔ React

| Nguồn Chatwoot (`app/javascript/`) | Đích Yona (`resources/js/`) | Ghi chú |
|---|---|---|
| `shared/components/CustomerSatisfaction.vue` | `widget/components/template/CustomerSatisfaction.tsx` | chuyển vào widget — Khác biệt #4 |
| `shared/components/StarRating.vue` | `shared/components/StarRating.tsx` | dùng chung widget + trang khảo sát |
| `shared/constants/messages.js` (`CSAT_RATINGS`, `CSAT_DISPLAY_TYPES`) | `shared/constants/messages.ts` | |
| `widget/components/AgentMessageBubble.vue` nhánh `isCSAT` | nhánh `contentType === 'input_csat'` trong `widget/components/AgentMessage.tsx` | |
| `<style scoped>` của `CustomerSatisfaction.vue` | khối `.customer-satisfaction` trong `resources/scss/widget.scss` | |
| `entrypoints/survey.js` + `survey/App.vue` | `survey/main.tsx` | không store, không router |
| `survey/views/Response.vue` | `survey/Response.tsx` | |
| `survey/components/{Banner,Rating,Feedback}.vue` | `survey/components/{Banner,Rating,Feedback}.tsx` | |
| `shared/components/{Button,TextArea}.vue` | dựng thẳng trong `survey/components/Feedback.tsx` | hai component chỉ trang này dùng |
| `survey/api/{endPoints,survey}.js` | `survey/api.ts` | fetch thay axios (như widget) |
| `survey/i18n/locale/en.json` | `lang/en/survey.php` + `survey/i18n.ts` | §17: lang/ là nguồn duy nhất |
| `survey/assets/scss/woot.scss` | `resources/scss/survey.scss` | + `body{line-height:1}` — Khác biệt #5 |
| `shared/components/Branding.vue` + `useBranding` | `shared/components/Branding.tsx` (+ vỏ `widget/components/Branding.tsx`) | tách để widget và trang khảo sát dùng chung |
| `settings/inbox/settingsPage/CustomerSatisfactionPage.vue` | `dashboard/settings/inboxes/settingsPage/CustomerSatisfactionPage.tsx` | bỏ nhánh WhatsApp/Captain — Khác biệt #2 |
| `…/components/{CSATDisplayTypeSelector,CSATEmojiInput,CSATStarInput}.vue` | `…/settingsPage/components/CSATDisplayTypeSelector.tsx` | gộp 3 file thành 1 |
| — | `shared/helpers/csatHelpers.ts` + `.test.ts` (10 case vitest) | hàm thuần dùng chung hai màn |

## Khác biệt cố ý

1. **Bỏ 3 cột review notes** (`csat_review_notes`, `review_notes_updated_at`,
   `review_notes_updated_by_id`). Chúng nằm trong bảng core của `schema.rb` nhưng chỉ mã
   enterprise ghi vào (`download.csv.erb` gate bằng `ChatwootApp.enterprise?`) — quyết
   định #12. Thêm lại = 1 migration + 2 quan hệ.
2. **Bỏ hai nhánh mẫu WhatsApp Cloud / Twilio** trong `CsatSurveyService` và toàn bộ UI
   tương ứng ở tab settings (Editor + button text + language + trạng thái duyệt template +
   bộ phân tích utility của Captain). Kênh WhatsApp thuộc nhóm F, Captain là EE. Với inbox
   không phải WhatsApp, bản gốc cũng chỉ chạy đúng nhánh đã port. Khoá i18n
   `INBOX_MGMT.CSAT.*` đã có sẵn đủ cho cả phần chưa port.
3. **Listener chạy đồng bộ** (bản gốc ở `AsyncDispatcher` → `EventDispatcherJob`), giống
   mọi listener đã port. Hệ quả duy nhất phải xử: phiếu `rating` sai (client tự chế) không
   được làm hỏng lượt cập nhật tin → bắt `RecordInvalidException` + `report()`.
4. **`CustomerSatisfaction` nằm trong `widget/components/template/`** thay vì `shared/`:
   trang khảo sát công khai có bộ `Rating`/`Feedback` riêng, nên component này chỉ widget
   dùng. Phần thật sự dùng chung (`StarRating`, `CSAT_RATINGS`, `csatHelpers`) mới đặt ở
   `shared/`.
5. **`resources/scss/survey.scss` thêm `body { line-height: 1 }`.** Bundle survey gốc nạp
   reset Meyer (`widget/assets/scss/reset`); Yona không port cả bộ reset đó, và dòng duy
   nhất còn ảnh hưởng tới trang này chính là nó — thiếu nó ô nhập phản hồi cao thêm 4px,
   pixel-diff 0.578% → 0.000%.
6. **`ConvertEmptyStringsToNull` của Laravel** biến `csat_config.message = ""` thành
   `null` khi lưu (oracle giữ `""`). Không đổi hành vi: mọi chỗ đọc đều dùng `blank()` /
   `?? ''`. Đây là hành vi toàn framework, không vá riêng cho CSAT.
7. **Chưa port `MessageContentPresenter#content_with_survey_link`** — nối đường dẫn khảo
   sát vào nội dung tin `input_csat` cho kênh KHÔNG phải web widget (email/WhatsApp).
   Người dùng của nó là bộ gửi tin theo kênh (nhóm F) và webhook (D4), cả hai chưa có.
   Khi port: một chỗ duy nhất, không rải vào `CsatSurvey` template.
8. **Không đổi locale theo `locale` của account** ở trang khảo sát (`setLocale` của bản
   gốc). Bundle i18n hiện chỉ có `en`; khi có `lang/vi/` (nhóm G) thì `survey/i18n.ts`
   nhận thêm nhánh chọn locale.

## Nợ / việc cho người khác

- **Báo cáo CSAT (D2)** cần: `GET /api/v1/accounts/{id}/csat_survey_responses`
  (+ `metrics`, `download.csv`), `app/views/api/v1/models/_csat_survey_response.json.jbuilder`
  và bộ scope `filter_by_{created_at,assigned_agent_id,inbox_id,team_id,rating}` — cố ý
  chưa dựng ở C5 (YAGNI). Bảng + model + phiếu đã có đủ dữ liệu.
- **Nhóm F (WhatsApp/Twilio):** thêm nhánh mẫu vào `CsatSurveyService::perform()` +
  `CsatTemplateNameService` + phần UI template trong `CustomerSatisfactionPage.tsx`.
- **Nhóm D (Help Center) / Platform API:** cắm route vào `routes/api_public.php` đã dựng.
- **Toolbar ProseMirror là `<button>` ở Yona, `<div class="ProseMirror-icon">` ở oracle**
  (khác biệt của B10, không phải C5): `audit-buttons.mjs` liệt kê thêm 9 nút toolbar bên
  Yona mà oracle không có. Hiển thị giống hệt (pixel-diff 0.000% vùng nội dung); nếu muốn
  audit hai bên ra cùng danh sách thì phải sửa ở lớp Editor.
- `vendor/bin/pint --dirty` của phiên này có định dạng lại 2 file test của agent `c4`
  (`tests/Feature/Models/CampaignTest.php`, `tests/Feature/Listeners/CampaignListenerTest.php`)
  — chỉ import/format, không đổi hành vi.

## Gate đã chạy

1. **Pest toàn suite trên DB riêng** `DB_DATABASE=yona_rw_test_c5 REDIS_DB=8 vendor/bin/pest`
   → **1051/1051** (2499 assertion), trong đó 26 test mới của C5. DB đã `DROP` sau khi chạy.
2. `vendor/bin/pint --test` → passed (toàn repo) · `php artisan i18n:generate --check` → khớp ·
   `npx tsc --noEmit` → sạch · `npm run build` → OK · `npm test` (vitest) → **377/377**
   (48 file, có `shared/helpers/csatHelpers.test.ts` mới).
3. **Pixel-diff (light + dark, oracle inbox 6 ↔ yona inbox 21, đã xoá sau khi đo):**

   | Màn | light | dark |
   |---|---|---|
   | Bong bóng CSAT trong widget — emoji | 0.000% | 0.000% |
   | Bong bóng CSAT trong widget — star | 0.000% | 0.000% |
   | Bong bóng CSAT — đã chấm + đã gửi phản hồi | 0.000% | 0.000% |
   | Trang `/survey/responses/{uuid}` — chưa chấm | 0.000% | 0.000% |
   | Trang khảo sát — đã chấm (hiện ô phản hồi) | 0.000% | 0.000% |
   | Trang khảo sát — đã gửi phản hồi | 0.000% | 0.000% |
   | Tab CSAT settings inbox | 0.030% | 0.030% |
   | Tab CSAT — tắt công tắc | 0.030% | 0.030% |
   | Tab CSAT — chọn kiểu sao | 0.030% | 0.030% |
   | Tab CSAT — mở dropdown toán tử | 0.030% | 0.030% |
   | Tab CSAT — mở dropdown chọn nhãn | 0.030% | 0.030% |
   | Tab CSAT — đã chọn nhãn (chip + nút gỡ) | 0.030% | 0.030% |

   0.030% của các màn dashboard = đúng vùng avatar account/user ở sidebar (seed ảnh khác
   nhau), đã biết từ nhóm A; ảnh diff không có điểm đỏ nào trong vùng nội dung CSAT.
   Script: `~/www/pixel-diff/c5-widget-diff.mjs`, `c5-survey-diff.mjs`, `c5-csat-ui.mjs`,
   `compare.mjs '/app/accounts/{id}/settings/inboxes/{inbox}/csat' --login --var inbox=6:21`.
4. **Audit nút** `audit-buttons.mjs` trên tab CSAT hai bên: cùng kết quả cho mọi nút chung
   (Back → dashboard, công tắc, dropdown toán tử, dropdown nhãn phản ứng; hai ô chọn kiểu
   hiển thị và nút Update báo DEAD **ở cả hai bên** vì heuristic chỉ đếm DOM, không thấy
   đổi class/toast). Chênh duy nhất = 9 nút toolbar ProseMirror, xem mục Nợ.
5. **E2E trình duyệt** (`~/www/pixel-diff/c5-widget-e2e.mjs`, `c5-survey-e2e.mjs`,
   `c5-settings-e2e.mjs`):
   - Qua SDK nhúng `public/widget-test.html`: khách chat → agent đóng hội thoại qua API →
     bong bóng khảo sát hiện **realtime** → chấm 4 → tiêu đề đổi "Thank you for submitting
     the rating" → gửi phản hồi → form ẩn → **reload trang nhúng**: khảo sát vẫn ở trạng
     thái đã gửi. DB: `csat_survey_responses` có `rating=4, feedback_message='phuc vu tot'`,
     `messages.content_attributes.submitted_values.csat_survey_response` khớp.
   - Trang `/survey/responses/{uuid}`: chấm 5 → hiện ô phản hồi → gửi → ô ẩn → reload vẫn
     giữ trạng thái.
   - Tab CSAT settings: đổi kiểu hiển thị sang sao + nhập thông điệp + chọn nhãn `vip` →
     Update → toast thành công → reload giữ nguyên cả ba.
6. **Dọn dẹp:** inbox thử (oracle 6, yona 21) + kênh + 10 hội thoại + tin + phiếu CSAT +
   14 contact ẩn danh + 2 nhãn tạm (`vip`, `urgent`) đã xoá ở CẢ HAI bên;
   `~/www/pixel-diff/reset-fixture.sh` chạy xong → yona `{"hội thoại":[4],"tin":5}`,
   oracle `{"hội thoại":[1],"tin":5}`. DB `yona_rw_test_c5` đã `DROP`.
   (Inbox `c4-widget` của agent c4 vẫn còn — không đụng.)
