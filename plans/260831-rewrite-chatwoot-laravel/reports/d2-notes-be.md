# D2 Reports — backend (agent `d2-be`, 06/09/2026)

---

## 1. CONTRACT API (cho `d2-fe-charts` / `d2-fe-pages`)

Tất cả nằm dưới `/api/v2/accounts/{account}` (đã có sẵn trong `routes/web_api.php`).
Mọi endpoint yêu cầu **administrator** (ReportPolicy#view); không phải admin → `401`
với body `"You are not authorized to do this action"`.

Quy ước tham số dùng lại nhiều lần:

| Param | Kiểu | Ghi chú |
|---|---|---|
| `since` / `until` | epoch giây (chuỗi) | khoảng **nửa mở** `[since, until)`; thiếu một trong hai = không lọc thời gian |
| `type` | `account` \| `inbox` \| `agent` \| `label` \| `team` | chiều báo cáo; rỗng = `account` |
| `id` | int | bắt buộc khi `type` khác `account`; không tìm thấy → `404` |
| `group_by` | `hour` \| `day` \| `week` \| `month` \| `year` | mặc định `day`; giá trị lạ → `day`. **Tuần bắt đầu CHỦ NHẬT** |
| `timezone_offset` | số giờ, ví dụ `7`, `-8`, `5.5` | quyết định mốc gộp; mặc định UTC |
| `business_hours` | `true`/`false` | `true` → dùng cột `value_in_business_hours` |

### 1.1 `GET /reports` — chuỗi thời gian
`?metric=<metric>&type&id&group_by&timezone_offset&business_hours&since&until`

`metric` hợp lệ: `conversations_count`, `incoming_messages_count`, `outgoing_messages_count`,
`avg_first_response_time`, `avg_resolution_time`, `reply_time`, `resolutions_count`,
`bot_resolutions_count`, `bot_handoffs_count`. Metric lạ → `200` với body `[]`.

- metric **đếm** → `[{ "value": 3, "timestamp": 1787184000 }, …]`
- metric **trung bình** → `[{ "value": 120, "timestamp": 1787184000, "count": 3 }, …]`

Mảng luôn phủ **đủ mọi mốc** trong khoảng (mốc rỗng có `value: 0`, `count: 0`).
`timestamp` là epoch giây của đầu mốc theo `timezone_offset`.

### 1.2 `GET /reports/summary` và `GET /reports/bot_summary`
`?type&id&group_by&business_hours&timezone_offset&since&until`

```jsonc
// summary
{ "conversations_count": 3, "incoming_messages_count": 3, "outgoing_messages_count": 3,
  "avg_first_response_time": 120, "avg_resolution_time": 300, "resolutions_count": 2,
  "reply_time": null,
  "previous": { …y hệt các khóa trên… } }
// bot_summary
{ "bot_resolutions_count": 0, "bot_handoffs_count": 0, "previous": { … } }
```
`previous` = cùng công thức trên khoảng liền trước có **cùng độ dài**
(`since - (until - since)` → `since`). Trung bình không có dữ liệu = `null`.

### 1.3 `GET /reports/conversations` — số "ngay bây giờ" theo agent
`?type=account|agent&page=<int>`

- Thiếu `type` → `422` (body `null`).
- `type=account` → `{ "open": 2, "unattended": 1, "unassigned": 0, "pending": 0 }`.
  **`pending` LUÔN bằng 0** (bug gốc Chatwoot, giữ nguyên — xem §5).
- `type` khác → mảng 25 agent/trang, sắp xếp `metric.open` giảm dần (bằng điểm thì theo thứ tự
  NGƯỢC của `account_users`, đúng như `sort_by{…}.reverse` của bản gốc):
  `[{ "id", "name", "email", "thumbnail", "availability", "metric": { "open", "unattended" } }]`

### 1.4 `GET /reports/drilldown` — bản ghi phía sau một cột biểu đồ
`?metric&type&id&group_by&timezone_offset&business_hours&since&until&bucket_timestamp&page&per_page`

- Thiếu `metric`/`bucket_timestamp`/`since`/`until`, metric không hợp lệ, `type` không hợp lệ,
  hoặc mốc không giao với `[since, until)` → `422` (body `null`).
- `per_page` mặc định 25, tối đa 100. `page` mặc định 1.

```jsonc
{
  "meta": {
    "metric": "avg_first_response_time",
    "record_type": "message",          // "message" cho *_messages_count, avg_first_response_time, reply_time; còn lại "conversation"
    "bucket": { "since": 1787184000, "until": 1787270400 },  // đã cắt theo since/until
    "current_page": 1, "per_page": 25,
    "total_count": 3,                  // tổng bản ghi
    "conversation_count": 3            // số hội thoại riêng biệt
  },
  "payload": [
    {
      "record_type": "message",        // hoặc "conversation"
      "conversation": {
        "id", "display_id", "contact_id", "contact_name", "inbox_id", "inbox_name",
        "assignee_id", "assignee_name", "status",           // 'open'|'resolved'|'pending'|'snoozed'
        "created_at", "last_activity_at",                   // epoch giây
        "last_message": { "id", "content", "message_type", "sender_name", "created_at" } | null
      },
      "message": { "id", "content", "message_type", "sender_name", "created_at" } | null,
      "metric_value": 120 | null,
      "occurred_at": 1787227320,
      "event_name": "conversation_resolved"   // CHỈ có khi không suy ra được tin nhắn
    }
  ]
}
```

### 1.5 `GET /reports/bot_metrics`
`?since&until` → `{ "conversation_count", "message_count", "resolution_rate", "handoff_rate" }`
(hai `*_rate` là **số nguyên phần trăm**, làm tròn xuống).

### 1.6 `GET /reports/inbox_label_matrix`
`?since&until&inbox_ids[]&label_ids[]`
```jsonc
{ "inboxes": [{ "id", "name" }],       // sắp theo name
  "labels":  [{ "id", "title" }],      // sắp theo title
  "matrix":  [[0, 0], [0, 0]] }        // matrix[i][j] = số hội thoại inbox i × nhãn j
```

### 1.7 `GET /reports/first_response_time_distribution`
`?since&until` → `{ "<channel_type>": { "0-1h", "1-4h", "4-8h", "8-24h", "24h+" } }`
(`channel_type` là chuỗi thô `Channel::Api`, `Channel::WebWidget`…).

### 1.8 `GET /reports/outgoing_messages_count`
`?group_by=agent|team|inbox|label&since&until` — `group_by` khác → `422` (body `null`).
→ `[{ "id": 1, "name": "John", "outgoing_messages_count": 3 }]` (với `label`, `id` có thể `null`).

### 1.9 CSV tải về (`Content-Type: text/csv`, `Content-Disposition: attachment`)
`GET /reports/agents`, `/reports/inboxes`, `/reports/labels`, `/reports/teams`,
`/reports/conversations_summary` — nhận `since`, `until`, `business_hours`.
Bố cục: dòng `Reporting period <since> to <until>`, **hai dòng trống**, dòng tiêu đề, rồi dữ liệu.

`GET /reports/conversation_traffic?timezone_offset&days_before` (mặc định 6 ngày):
dòng `Timezone,(GMT+07:00) Bangkok`, hai dòng trống, rồi bảng `Start of the hour × ngày`.

### 1.10 `GET /summary_reports/{agent|team|inbox|label|channel}`
`?since&until&business_hours`

- `agent` / `team` / `inbox` →
  `[{ "id", "conversations_count", "resolved_conversations_count", "avg_resolution_time",
      "avg_first_response_time", "avg_reply_time" }]` (đủ **mọi** agent/team/inbox của account;
  không có số liệu → count `0`, trung bình `null`).
- `label` → thêm `"name"`, và trung bình không có dữ liệu là `0` (không phải `null`).
- `channel` → `{ "<channel_type>": { "open", "resolved", "pending", "snoozed", "total" } }`;
  khoảng > 6 tháng → `422` `{ "error": "Date range cannot exceed 6 months" }`.

### 1.11 `GET /live_reports/*`
- `/live_reports/conversation_metrics?team_id=` → `{ "open", "unattended", "unassigned", "pending" }`
  (ở đây `pending` **đếm đúng**, khác `/reports/conversations`).
- `/live_reports/grouped_conversation_metrics?group_by=team_id|assignee_id&team_id=` →
  `[{ "open", "unattended", "unassigned", "<group_by>": <id|null> }]`; `group_by` khác →
  `422` `{ "error": "invalid group_by" }`. Nhóm chưa gán có khóa `null`.

### 1.12 CSAT — **CẦN PHIÊN CHÍNH THÊM ROUTE**
Controller + resource đã có (`App\Http\Controllers\WebApi\CsatSurveyResponsesController`),
nhưng `routes/web_api.php` chưa có route. Thêm vào nhóm `/api/v1/accounts/{account}`:

```php
Route::get('/csat_survey_responses', [CsatSurveyResponsesController::class, 'index']);
Route::get('/csat_survey_responses/metrics', [CsatSurveyResponsesController::class, 'metrics']);
Route::get('/csat_survey_responses/download', [CsatSurveyResponsesController::class, 'download']);
```
(kèm `use App\Http\Controllers\WebApi\CsatSurveyResponsesController;`)

Hợp đồng: `?since&until&user_ids[]&inbox_id&team_id&rating&page&sort=created_at|-created_at`
- `index` → `[{ "id", "rating", "feedback_message", "account_id", "message_id",
  "conversation_id" (display_id), "contact": {…ContactResource…}, "assigned_agent": {…AgentResource…},
  "created_at" (epoch) }]`, 25 bản ghi/trang.
- `metrics` → `{ "total_count", "ratings_count": { "<rating>": n }, "total_sent_messages_count" }`.
- `download` → CSV `csat_report.csv`.

Cho tới khi route được thêm, `tests/Feature/Reports/CsatSurveyResponsesControllerTest.php`
tự đăng ký ba route đó (khối `Route::middleware([...])` trong `beforeEach`) — **gỡ khối này
khi route thật đã có**.

---

## 2. Bảng trace Ruby ↔ PHP

### Ghi sự kiện
| Chatwoot v4.17.1 | Yona |
|---|---|
| `db/schema.rb` `reporting_events`, `reporting_events_rollups` | `database/migrations/2026_09_06_960000_create_reporting_events_tables.php` |
| `app/models/reporting_event.rb` | `app/Models/ReportingEvent.php` |
| `app/models/reporting_events_rollup.rb` | `app/Models/ReportingEventsRollup.php` |
| `app/models/concerns/reportable.rb` | `app/Models/Concerns/Reportable.php` (dùng ở `Account`, `User`, `Inbox`, `Conversation`) |
| `app/listeners/reporting_event_listener.rb` | `app/Listeners/ReportingEventListener.php` |
| `app/helpers/reporting_event_helper.rb#business_hours` | `app/Services/ReportingEvents/BusinessHoursCalculator.php` |
| `…#last_non_human_activity` | `ReportingEventListener::lastNonHumanActivity()` |
| `services/reporting_events/rollup_service.rb` | `app/Services/ReportingEvents/RollupService.php` |
| `services/reporting_events/backfill_service.rb` | `app/Services/ReportingEvents/BackfillService.php` |
| `services/reporting_events/event_metric_registry.rb` + `metric_registry.rb` (phần EVENT_METRICS) | `app/Services/ReportingEvents/EventMetricRegistry.php` (gộp một sổ) |
| `lib/tasks/reporting_events_rollup.rake` | `app/Console/Commands/BackfillReportingEventsRollups.php` |
| `lib/tasks/reporting_events_rollup_timezone_setup.rake` | **không port** (xem §5) |
| `Message#clear_waiting_since_on_outgoing_response` bắn `REPLY_CREATED` | `App\Models\Message::dispatchCreateEvents()` (thêm 1 dòng dispatch) |
| `Account` `store_accessor :reporting_timezone` | `App\Models\Account::reportingTimezone()` + `SETTINGS_ATTRS` |
| `InboxBotStatus#active_bot?` | `App\Models\Inbox::activeBot()` |

### Đọc số liệu
| Chatwoot | Yona |
|---|---|
| `services/reports/report_metric_registry.rb` | `app/Services/Reports/ReportMetricRegistry.php` + `ReportMetric.php` |
| `services/reports/data_source.rb` | `app/Services/Reports/DataSource.php` + `DataSourceContext.php` |
| `services/reports/raw_data_source.rb` | `app/Services/Reports/RawDataSource.php` |
| `services/reports/drilldown_timestamp_validator.rb` | `app/Services/Reports/DrilldownTimestampValidator.php` |
| `helpers/date_range_helper.rb` | `app/Services/Reports/ReportRange.php` |
| `helpers/timezone_helper.rb` + `ActiveSupport::TimeZone[<số>]` | `app/Services/Reports/TimezoneResolver.php` + `config/rails_timezones.php` |
| gem Groupdate `group_by_period` | `app/Services/Reports/TimeseriesGrouper.php` |
| `helpers/report_helper.rb#scope` + quan hệ `conversations/messages/reporting_events` trên Account/Inbox/User/Label/Team | `app/Services/Reports/ReportScope.php` |
| `presenters/reports/time_format_presenter.rb` | `app/Services/Reports/TimeFormatPresenter.php` |
| gem `csv-safe` | `app/Services/Reports/CsvWriter.php` |
| `builders/v2/reports/timeseries/*` + `conversations/{base,report}_report_builder` | `app/Builders/Reports/TimeseriesReportBuilder.php` |
| `builders/v2/reports/conversations/metric_builder.rb` | `app/Builders/Reports/ConversationsMetricBuilder.php` |
| `builders/v2/reports/base_summary_builder.rb` | `app/Builders/Reports/BaseSummaryBuilder.php` |
| `…/{agent,inbox,team}_summary_builder.rb` | `app/Builders/Reports/{Agent,Inbox,Team}SummaryBuilder.php` |
| `…/label_summary_builder.rb` | `app/Builders/Reports/LabelSummaryBuilder.php` |
| `…/channel_summary_builder.rb` | `app/Builders/Reports/ChannelSummaryBuilder.php` |
| `…/drilldown_builder.rb` | `app/Builders/Reports/DrilldownBuilder.php` |
| `…/drilldown_record_serializer.rb` | `app/Builders/Reports/DrilldownRecordSerializer.php` |
| `…/first_response_time_distribution_builder.rb` | `app/Builders/Reports/FirstResponseTimeDistributionBuilder.php` |
| `…/inbox_label_matrix_builder.rb` | `app/Builders/Reports/InboxLabelMatrixBuilder.php` |
| `…/outgoing_messages_count_builder.rb` | `app/Builders/Reports/OutgoingMessagesCountBuilder.php` |
| `…/bot_metrics_builder.rb` | `app/Builders/Reports/BotMetricsBuilder.php` |
| `builders/v2/report_builder.rb#conversation_metrics` | `app/Builders/Reports/LiveConversationsBuilder.php` |
| `helpers/api/v2/accounts/reports_helper.rb` (CSV) | các method CSV trong `ReportsController` |
| `helpers/api/v2/accounts/heatmap_helper.rb` | `app/Services/Reports/ConversationTrafficReport.php` |
| `controllers/api/v2/accounts/reports_controller.rb` | `app/Http/Controllers/WebApi/Reports/ReportsController.php` |
| `…/summary_reports_controller.rb` | `…/SummaryReportsController.php` |
| `…/live_reports_controller.rb` | `…/LiveReportsController.php` |
| `policies/report_policy.rb` | `app/Policies/ReportPolicy.php` + `Reports/BaseReportsController.php` |
| `controllers/api/v1/accounts/csat_survey_responses_controller.rb` | `app/Http/Controllers/WebApi/CsatSurveyResponsesController.php` |
| `views/api/v1/models/_csat_survey_response.json.jbuilder` | `app/Http/Resources/CsatSurveyResponseResource.php` |
| `config/locales/en.yml` khối `reports:` / `time_units:` / `errors.reports` | `lang/en/reports.php`, `lang/en/time_units.php`, `lang/en/errors.php` |

### Spec ↔ Pest
| RSpec | Pest |
|---|---|
| `spec/listeners/reporting_event_listener_spec.rb`, `spec/helpers/reporting_event_helper_spec.rb` | `tests/Feature/Reports/ReportingEventListenerTest.php` (8 test) |
| `spec/services/reporting_events/{rollup_service,backfill_service,event_metric_registry}_spec.rb`, `spec/models/reporting_events_rollup_spec.rb` | `tests/Feature/Reports/ReportingEventsRollupTest.php` (7 test) |
| `spec/controllers/api/v2/accounts/{report,reports}_controller_spec.rb`, `spec/builders/v2/**` | `tests/Feature/Reports/ReportsControllerTest.php` (17 test) |
| `spec/controllers/api/v2/accounts/summary_reports_controller_spec.rb`, `spec/builders/v2/reports/{agent,inbox,team,label,channel}_summary_builder_spec.rb` | `tests/Feature/Reports/SummaryReportsControllerTest.php` (7 test) |
| `spec/controllers/api/v2/accounts/live_reports_controller_spec.rb` | `tests/Feature/Reports/LiveReportsControllerTest.php` (5 test) |
| `spec/services/reports/report_metric_registry_spec.rb`, `spec/presenters/…` | `tests/Feature/Reports/ReportMetricRegistryTest.php` (5 test) |
| `spec/controllers/api/v1/accounts/csat_survey_responses_controller_spec.rb` | `tests/Feature/Reports/CsatSurveyResponsesControllerTest.php` (5 test) |
| `spec/models/reporting_event_spec.rb` (chỉ validation presence) | phủ gián tiếp qua listener test |

---

## 3. Khác biệt cố ý

1. **Một sổ chỉ số thay vì hai.** Chatwoot có `ReportingEvents::EventMetricRegistry` và
   `ReportingEvents::MetricRegistry` trùng nội dung (kèm TODO tách sổ trong chính mã gốc).
   Ở đây phần "sự kiện thô → dòng rollup" chỉ khai báo ở `EventMetricRegistry`, phần
   "chỉ số công khai" chỉ ở `Reports\ReportMetricRegistry`. Một behavior = một chỗ sửa.
2. **`ReportScope` thay 5 bộ quan hệ.** Ruby rải `conversations/messages/reporting_events` lên
   Account/Inbox/User/Label/Team. Thêm chiều mới ở đây = thêm một nhánh `match` trong
   `ReportScope`, không đụng builder nào.
3. **`TimeseriesGrouper` thay Groupdate.** SQL `date_trunc(period, ts at time zone 'UTC' at time
   zone <tz>)`; tuần bắt đầu **Chủ nhật** (mặc định của Groupdate, khác `date_trunc('week')` của
   Postgres) nên phải `+1 day … -1 day`. Dãy mốc sinh trong PHP đúng luật Groupdate:
   mốc đầu = mốc chứa `since`, mốc cuối là mốc cuối còn `< until`.
4. **`BusinessHoursCalculator` thay gem `working_hours`.** Gem gốc cấu hình qua biến toàn cục
   (`WorkingHours::Config.working_hours = …`) — không an toàn khi chạy song song. Ở đây cộng
   trực tiếp phần giao của `[from, to)` với khung giờ từng ngày của inbox.
5. **`RollupService` upsert bằng SQL thuần.** `upsert_all(on_duplicate: 'count = count + EXCLUDED.count')`
   không có tương đương trong query builder; dùng `insert … on conflict do update` viết tay.
6. **Rake backfill tương tác → lệnh artisan tham số.** `php artisan reporting-events:backfill
   --account= --since= --until= --dry-run`. Bỏ phần hỏi–đáp STDIN và phần bật feature flag
   `report_rollup` (đường ĐỌC từ rollup chưa port — Chatwoot cũng vẫn đọc thô, xem
   `Reports::DataSource.for` còn nguyên TODO). Rake `set_timezone` không port: chỉ là trình
   hỏi–đáp để ghi `account.settings.reporting_timezone`.
7. **CSV**: nội dung trùng oracle từng byte trên fixture đã kiểm; luật bọc nháy đã chỉnh cho
   khớp Ruby CSV (chỉ bọc khi ô chứa `,`, `"`, CR/LF).
8. **Không port**: `year_in_review` (marketing/EE), `report_manage` custom role (EE),
   `csat_review_notes` / `review_notes_updated_*` (EE), `Reports::RollupDataSource` (chưa tồn tại
   ở bản gốc), `ChatwootExceptionTracker` → `report()` của Laravel.
9. **`json` số thực**: PHP in `120` còn Ruby in `120` cho `BigDecimal` — đã kiểm bằng oracle,
   trùng. (Ở tầng Pest thì `avg` trả `float`, nên vài assert dùng `toEqual` thay `toBe`.)

## 4. File ngoài vùng sở hữu đã đụng (đều nhỏ, ghi rõ để phiên chính đối chiếu)

| File | Thay đổi |
|---|---|
| `app/Models/Message.php` | thêm 1 dòng `DomainEvent::dispatch(EventType::REPLY_CREATED, …)` trước khi xóa `waiting_since` (chỗ này đã có sẵn comment "REPLY_CREATED bắn ở D2") |
| `app/Models/{Account,User,Inbox,Conversation}.php` | thêm `use Reportable` (+ import) |
| `app/Models/Account.php` | thêm `reporting_timezone` vào `SETTINGS_ATTRS` + method `reportingTimezone()` |
| `app/Models/Inbox.php` | thêm `activeBot()` (`InboxBotStatus#active_bot?`), sửa comment "Bỏ … Reportable" |
| `lang/en/errors.php` | thêm khối `reports.date_range_too_long` |
| `config/rails_timezones.php` | **mới** — bảng vùng giờ ActiveSupport (xuất từ oracle) |

`EventType.php` **không cần sửa**: đã đủ `first.reply.created`, `reply.created`,
`conversation.bot_handoff`, `conversation.opened`, `conversation.resolved`.
Lưu ý: **chưa có nơi nào dispatch `CONVERSATION_BOT_HANDOFF`** (thuộc phần agent bot của D4);
listener đã sẵn sàng nhận.

## 5. Bẫy đã trả giá

1. **`Conversation` đặt `waiting_since = created_at` ngay khi tạo** (`before_create` của bản gốc).
   Nên `reply_time` của lần trả lời đầu tiên đo từ lúc TẠO hội thoại, không phải từ tin đến.
   Test đầu tiên viết sai kỳ vọng 180s trong khi đúng là 240s.
2. **`/reports/conversations` luôn trả `pending: 0`.** Bản gốc lọc `.open` rồi lọc tiếp `.pending`
   trên cùng cột `status` → không bao giờ khớp. Đã giữ nguyên (`LiveConversationsBuilder`).
   `/live_reports/conversation_metrics` KHÔNG có lỗi này.
3. **`conversation_traffic` gộp theo múi giờ người xem nhưng cắt ngày theo UTC.** Helper gốc gọi
   `ActiveSupport::TimeZone[params[:timezone_offset]]` với **chuỗi** → luôn `nil` → `Time.zone`
   (UTC), trong khi `V2::ReportBuilder` lại nhận offset dạng số. Nếu port "đúng ý" (dùng múi giờ
   người xem cho cả hai) thì CSV lệch một ngày so với oracle. Đã giữ nguyên sự lệch.
4. **Nhãn múi giờ trong CSV là `(GMT+07:00) Bangkok`, không phải định danh IANA.** Chatwoot suy
   vùng giờ bằng cách quét `ActiveSupport::TimeZone.all` **theo thứ tự** và lấy vùng khớp đầu tiên;
   quét `DateTimeZone::listIdentifiers()` của PHP cho ra `Antarctica/Davis`. Đã xuất nguyên bảng
   của ActiveSupport ra `config/rails_timezones.php` và quét đúng bảng đó.
   Hệ quả: `TimezoneResolver::fromOffset(0)` trả `Atlantic/Azores` (đúng như Ruby, vì so bằng độ
   lệch HIỆN TẠI), còn `label()` so bằng độ lệch CHUẨN như `ActiveSupport::TimeZone[<số>]`.
5. **`inbox_type` trong CSV là tên người-đọc-được** (`API`, `Website`), lấy từ `Inbox::inboxType()`
   chứ không phải cột `channel_type`.
6. **CSV có 2 dòng trống** giữa dòng "Reporting period" và dòng tiêu đề (do template ERB gốc), và
   các file `agents/inboxes/teams/labels` có nhiều ô hơn số cột tiêu đề (bug gốc — `inboxes` khai
   5 cột nhưng in 7). Giữ nguyên.
7. **`ORDER BY` phải bị gỡ trước khi `GROUP BY`.** Ruby dùng `unscope(:order)`; ở Laravel phải
   `->reorder()` / `$query->orders = null`, nếu không Postgres từ chối truy vấn.
8. **Route test tự đăng ký phải có middleware `web`**, nếu không `SubstituteBindings` không chạy và
   `Account $account` trong controller là instance rỗng (`id = null`) → truy vấn trả rỗng mà vẫn 200.
   Mất khá lâu mới lần ra (xem `CsatSurveyResponsesControllerTest`).
9. **Carbon mutable trong script seed.** `$at->addSeconds(120)` dùng hai lần trong cùng mảng làm
   lệch mốc 2 phút và khiến drilldown không suy ra được tin nhắn — lỗi ở script seed, không phải
   ở port. Nếu số liệu lệch, nghi script seed trước.

## 6. Bảng so với oracle

Cách chạy: `~/www/pixel-diff/d2-report-api.mjs <oracle|yona> '<path>' [--text]`
(oracle = token John, account 1; yona = phiên trình duyệt, account 2).
Đã seed **cùng kịch bản** hai bên (3 hội thoại 2026-08-20 10:00/11:00/12:00 UTC, 1 tin đến +
1 tin agent trả lời sau 120s mỗi hội thoại, 3 sự kiện `first_response` value 120, 2 sự kiện
`conversation_resolved` value 300) rồi **đã xóa sạch** dữ liệu thử ở cả hai bên
(oracle còn đúng hội thoại display 1, yona còn display 4 + 58 của phiên khác).

| Endpoint (since=1787184000, until=1787270400) | Oracle | Yona | Kết luận |
|---|---|---|---|
| `reports?metric=conversations_count&type=account` | `[{"value":3,"timestamp":1787184000}]` | y hệt | ✅ |
| `reports?metric=avg_first_response_time&type=account` | `[{"value":120,"timestamp":1787184000,"count":3}]` | y hệt | ✅ |
| `reports?metric=incoming_messages_count&group_by=hour` | 24 mốc, `1` tại 3 giờ có dữ liệu | y hệt | ✅ |
| `reports?metric=conversations_count&group_by=week` | `[{3,1786838400},{0,1787443200}]` | y hệt | ✅ tuần bắt đầu CN |
| `reports?metric=conversations_count&group_by=day&timezone_offset=7` | 8 mốc lệch 17:00 UTC | y hệt | ✅ |
| `reports?metric=avg_resolution_time&business_hours=true` | `[{"value":0,…}]` | y hệt | ✅ |
| `reports?metric={resolutions_count,outgoing_messages_count,reply_time,bot_handoffs_count}` (nhiều `type`) | — | y hệt | ✅ |
| `reports/summary` | `conversations_count 3 / incoming 3 / outgoing 3 / frt 120 / art 300 / resolutions 2 / reply null` + `previous` toàn 0/null | y hệt | ✅ |
| `reports/bot_summary`, `reports/bot_metrics` | toàn 0 | y hệt | ✅ |
| `summary_reports/channel` | `{"Channel::Api":{open 1, resolved 2, pending 0, snoozed 0, total 3}}` | y hệt | ✅ |
| `summary_reports/agent` (John) | `3 / 2 / 300 / 120 / null` | y hệt | ✅ (danh sách agent khác nhau do fixture) |
| `summary_reports/inbox` (api-test) | `3 / 2 / 300 / 120 / null` | y hệt | ✅ (yona có thêm inbox "Yona") |
| `reports/outgoing_messages_count?group_by=agent` | `[{"id":1,"name":"John","outgoing_messages_count":3}]` | y hệt | ✅ |
| `reports/first_response_time_distribution` | `{"Channel::Api":{"0-1h":3,…}}` | y hệt | ✅ |
| `reports/drilldown?metric=conversations_count` | meta `total_count 3, conversation_count 3, record_type conversation` | y hệt | ✅ |
| `reports/drilldown?metric=avg_first_response_time&per_page=2` | 2 bản ghi `record_type message`, `metric_value 120`, khối `conversation` đầy đủ | y hệt (chỉ khác id) | ✅ |
| `reports/{agents,teams,conversations_summary,labels}` CSV | — | **trùng từng byte** | ✅ |
| `reports/inboxes` CSV | `api-test,API,3,2 minutes,5 minutes,N/A,2` | y hệt | ✅ (sau khi đổi sang `inboxType()`) |
| `reports/conversation_traffic?timezone_offset=7&days_before=1/3` | — | **trùng từng byte** | ✅ |
| `live_reports/*`, `reports/conversations` | khác số | khác số | ⚠️ **fixture**, không phải logic: oracle giữ 1 hội thoại chưa gán, yona giữ 2 hội thoại đã gán John |
| `reports/inbox_label_matrix` | oracle không có nhãn | yona có 2 nhãn | ⚠️ fixture |
| `reports/conversation_traffic` KHÔNG có `timezone_offset` | **500** | 200 | ⚠️ ta rộng lượng hơn; FE luôn gửi offset |

## 7. Cách chạy backfill (KHÔNG tự chạy trên `yona_rw` — phiên chính quyết)

```bash
# 1. Đặt múi giờ báo cáo cho account (bắt buộc, nếu chưa có thì rollup không ghi gì)
php artisan tinker --execute="\$a = App\Models\Account::find(2); \$a->update(['settings' => array_replace(\$a->settings ?? [], ['reporting_timezone' => 'Asia/Ho_Chi_Minh'])]);"

# 2. Xem kế hoạch trước
php artisan reporting-events:backfill --account=2 --dry-run

# 3. Chạy thật (mặc định: từ ngày của sự kiện đầu tiên tới HÔM QUA theo múi giờ báo cáo)
php artisan reporting-events:backfill --account=2
php artisan reporting-events:backfill --account=2 --since=2026-09-01 --until=2026-09-05
```

**Lưu ý quan trọng:** lệnh này chỉ dựng lại bảng **rollup** từ `reporting_events` đã có.
Hội thoại nhóm B tạo TRƯỚC khi bảng `reporting_events` tồn tại thì **không có sự kiện thô nào**
để dựng lại — không có đường nào tái tạo `first_response`/`reply_time` cho chúng (Chatwoot cũng
vậy). Đường đọc hiện tại vẫn là đọc thô nên việc backfill rollup **chưa ảnh hưởng số hiển thị**;
chạy nó chỉ để chuẩn bị cho lúc bật đường đọc rollup.

## 8. Kết quả gate

- `DB_DATABASE=yona_rw_test_d2 vendor/bin/pest tests/Feature/Reports` → **54 passed, 149 assertions**.
- `DB_DATABASE=yona_rw_test_d2 vendor/bin/pest` (toàn suite) → **1328 passed, 3185 assertions**.
- `vendor/bin/pint <danh sách file của D2>` → sạch.
- `php artisan migrate` đã chạy trên `yona_rw` (batch 21,
  `2026_09_06_960000_create_reporting_events_tables`).
- Đối chiếu oracle: §6.

## 9. Còn nợ / bàn giao

- Route CSAT (§1.12) — phiên chính thêm, rồi gỡ khối `Route::` trong test CSAT.
- `reporting_timezone` chưa được đặt cho account nào trên `yona_rw` → bảng rollup luôn rỗng.
  Không ảnh hưởng số hiển thị (đường đọc là thô), nhưng muốn thử `RollupService` thì phải đặt.
- Chưa có nơi dispatch `CONVERSATION_BOT_HANDOFF` (chờ agent bot của D4).
- Fixture `yona_rw`: hội thoại display 4 đã tích lũy 3 sự kiện `conversation_resolved` do các
  lượt audit bấm Resolve/Reopen; oracle cũng có 4+ sự kiện tương tự trên display 1. Hai bên đều
  "bẩn" theo cùng kiểu — nếu `d2-fe-charts` pixel-diff trang báo cáo thấy lệch số thì đây là lý do.
