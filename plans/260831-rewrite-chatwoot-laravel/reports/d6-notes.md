# D6 — Giờ làm việc + trả lời tự động (agent `d6`)

Ba việc trong một tính năng: **lịch làm việc theo inbox**, **tin ngoài giờ**, **tự đóng
hội thoại nguội**. Cả ba dùng lại khung có sẵn (BaseTemplate của C3, ActivityMessageJob
của B5, cron trong `routes/console.php`) — không dựng khung thứ hai.

## Bảng trace Ruby ↔ PHP

| Nguồn Chatwoot | Đích Laravel | Ghi chú |
|---|---|---|
| `db/schema.rb` bảng `working_hours` | `database/migrations/2026_09_06_930000_create_working_hours_table.php` | FK thật tới `inboxes`/`accounts` (cascade) thay index trần; `timestamps(6)`; migration BÙ 7 dòng cho inbox đã tồn tại |
| `app/models/working_hour.rb` | `app/Models/WorkingHour.php` | validation của ActiveRecord → hook `saving` (một cửa cho mọi đường ghi) |
| `WorkingHour#open_at?/open_now?/closed_now?` | `openAt()/openNow()/closedNow()` | so giờ trong múi giờ của inbox, `betweenIncluded` = `Range#between?` |
| `WorkingHour.today` (class method dùng `first.inbox`) | `OutOfOffisable::todayWorkingHour()` | đổi chỗ đặt: bản gốc là class method nhưng chỉ được gọi qua `inbox.working_hours.today`; đưa về inbox bỏ hẳn phụ thuộc "bản ghi đầu bảng" |
| `before_validation :ensure_open_all_day_hours` | `WorkingHour::ensureOpenAllDayHours()` | mở cả ngày → 00:00–23:59 |
| `before_save :assign_account` | hook `saving` | |
| `validate :close_after_open` / `:open_all_day_and_closed_all_day` | `validateSchedule()` | giữ nguyên hai câu lỗi gốc |
| `app/models/concerns/out_of_offisable.rb` | `app/Models/Concerns/OutOfOffisable.php` | `included do after_create` → `bootOutOfOffisable()`; `DEFAULT_WORKING_HOURS`, `OFFISABLE_ATTRS`, `weekly_schedule`, `update_working_hours` giữ nguyên tên/hình dạng |
| `Inbox include OutOfOffisable` | `App\Models\Inbox use OutOfOffisable` | |
| `inboxes_controller.rb#update_inbox_working_hours` | `InboxesController::update()` nhánh `working_hours` | KHÔNG có endpoint riêng ở bản gốc — lịch đi kèm PATCH inbox |
| `api/v1/models/_inbox.json.jbuilder` `json.working_hours resource.weekly_schedule` | `InboxResource` khóa `working_hours` | trước đây trả `[]` |
| `api/v1/widget/configs/create.json.jbuilder` `json.working_hours …` | `WidgetConfigResource` | xem Khác biệt #1 |
| `message_templates/template/out_of_office.rb` | `app/Services/MessageTemplates/Template/OutOfOffice.php` | 8 dòng vì `BaseTemplate` đã gánh transaction + rescue |
| `hook_execution_service.rb#should_send_out_of_office_message?` | `HookExecutionService::shouldSendOutOfOfficeMessage()` | thêm MỘT nhánh vào hook đã có, không mở hook thứ hai |
| `message.rb` `scope :today` / enum `template` | `Message::scopeToday()` / `scopeTemplate()` | |
| `account.rb` `store_accessor :settings, :auto_resolve_*` | `Account::SETTINGS_ATTRS` + `Account::setting()` | một cửa đọc `settings`; `Conversation` đã đổi sang dùng nó |
| `account.rb` `scope :with_auto_resolve` | `Account::scopeWithAutoResolve()` | cùng câu SQL `(settings ->> 'auto_resolve_after')::int IS NOT NULL` |
| `conversation.rb` `scope :resolvable_not_waiting` + `:resolvable_all` | `Conversation::scopeResolvable($after, $ignoreWaiting)` | gộp hai scope chỉ khác một mệnh đề thành một tham số |
| `message_templates/template/auto_resolve.rb` | `app/Services/MessageTemplates/Template/AutoResolve.php` | giữ nhánh "ngoài cửa sổ gửi tin → ghi activity" ngay trong lớp mẫu như bản gốc |
| `jobs/conversations/resolution_job.rb` | `app/Jobs/Conversations/ResolutionJob.php` | `Limits::BULK_ACTIONS_LIMIT` → `config('limits.bulk_actions')` |
| `jobs/account/conversations_resolution_scheduler_job.rb` | `app/Jobs/Account/ConversationsResolutionSchedulerJob.php` | queue `scheduled_jobs` như gốc |
| `config/schedule.yml` `trigger_scheduled_items_job` (`*/5`) | `routes/console.php` | job thứ hai trên cùng cron `*/5`, cạnh `ReopenSnoozedConversationsJob` của B5 |
| `activity_message_handler.rb#auto_resolve_message_key` | (đã có từ B5) `Conversation::autoResolveMessageKey()` | dùng lại, không viết lại |
| `api/v1/accounts_controller.rb#show/#update` | `app/Http/Controllers/WebApi/AccountsController.php` | cần cho ô `auto_resolve_after`; `create` đã ở A2 |
| `api/v1/models/_account.json.jbuilder` | `app/Http/Resources/AccountResource.php` | bỏ `cache_keys` (chưa port) + khối billing EE |
| `settings/inbox/helpers/businessHour.js` + `timezones.json` | `settings/inboxes/helpers/businessHour.ts` + `timezones.json` (chép nguyên) | |
| `settings/inbox/components/BusinessDay.vue` | `settings/inboxes/components/BusinessDay.tsx` | |
| `settings/inbox/components/WeeklyAvailability.vue` | `settings/inboxes/components/WeeklyAvailability.tsx` | |
| `settings/inbox/Settings.vue` tab Business Hours | nhánh `business-hours` trong `settings/inboxes/Show.tsx` | tab đã có sẵn trên thanh, trước đây trống |
| `components-next/select/Select.vue` (nhánh `groups`) | `components-next/select/Select.tsx` thêm `groups` | nợ ghi sẵn ở C1 "optgroup vào khi màn nào cần" — chính là màn này |
| `components-next/input/DurationInput.vue` + `constants.js` | `components-next/input/DurationInput.tsx` + `constants.ts` | |
| `settings/account/components/AutoResolve.vue` | `settings/account/AutoResolve.tsx` | |
| `settings/conversationWorkflow/index.vue` + routes | `settings/conversationWorkflow/Index.tsx` + route `settings/conversation-workflow` | xem Khác biệt #3 |
| `constants/editor.js` `Context::NoToolbar` | `helper/editorHelper.ts` FORMATTING + `WootWriter/Editor.tsx` MENU_BY_KEY + prop `channelType` của `components-next/Editor` | thiếu nó thì ô soạn tin auto-resolve mọc thanh công cụ, cao hơn oracle 36px |
| `spec/models/working_hour_spec.rb` + `spec/models/concerns/out_of_offisable_shared.rb` | `tests/Feature/Models/WorkingHourTest.php` (12 test) | |
| `spec/services/message_templates/template/{out_of_office,auto_resolve}_spec.rb` | thêm vào `tests/Feature/Services/MessageTemplates/TemplateTest.php` (5 test) | |
| `spec/services/message_templates/hook_execution_service_spec.rb` (khối out-of-office) | thêm vào `.../HookExecutionServiceTest.php` (7 test) | |
| `spec/jobs/conversations/resolution_job_spec.rb` + `spec/jobs/account/conversations_resolution_scheduler_job_spec.rb` | `tests/Feature/Jobs/ConversationsResolutionJobTest.php` (13 test) | |
| `spec/controllers/api/v1/accounts_controller_spec.rb` (show/update) | `tests/Feature/WebApi/AccountsControllerTest.php` (9 test) | |
| — | `tests/Feature/WebApi/InboxesControllerTest.php` +4 test (`working_hours` qua PATCH) | |
| `settings/inbox/helpers/specs/businessHour.spec.js` | `settings/inboxes/helpers/businessHour.test.ts` (15 test vitest) | |

## Khác biệt cố ý

1. **`/config` của widget trả `weeklySchedule()` chứ không phải bản ghi thô.** Bản gốc
   serialize nguyên `inbox.working_hours` nên lộ `id`/`inbox_id`/`account_id`/timestamps ra
   endpoint công khai. Widget chỉ đọc đúng 7 khóa lịch (`resources/js/widget/types.ts`
   `WorkingHourSlot`), nên dùng chung một hàm với dashboard: ít mặt tiền hơn, không lộ id.
2. **`updateWorkingHours()` BỎ QUA trong im lặng dòng không hợp lệ** — đây là hành vi gốc,
   không phải lỗi. Đã kiểm bằng `rails runner` trên oracle: gửi `open_hour 18 / close_hour 9`
   cho thứ hai → phản hồi 200, DB vẫn 9→17. (Bản gốc dùng `update` chứ không phải `update!`.)
   FE chặn trước bằng `hasError` nên người dùng không rơi vào ca này.
3. **Mục sidebar "Conversation Workflow" được BẬT LẠI.** A3 ẩn nó với lý do "EE"; xác minh
   lại nguồn: `config/features.yml` của Chatwoot đặt `auto_resolve_conversations: enabled: true`
   (OSS) và `config/features.php` của yona cũng đã `true` — chỉ
   `conversation_required_attributes` mới là gói trả phí. Oracle self-hosted có hiện mục này.
   Không có nó thì ô `auto_resolve_after` không có đường vào.
4. **`ConversationRequiredAttributes` chưa port.** Cần custom attributes của E1 + cờ trả phí.
   Trên oracle self-hosted khối này KHÔNG render gì (đã chụp ảnh đối chiếu: trang chỉ có thẻ
   Auto-resolve), nên pixel vẫn khớp — thêm vào khi làm E1.
5. **Bỏ cổng `conversation.tweet?`** trong `shouldSendOutOfOfficeMessage()` — kênh Twitter
   chưa port, cùng lý do đã ghi ở C3 cho greeting/email-collect.
6. **`SingleSelect` chọn nhãn chưa có `variant="faded"`** của bản gốc (prop chưa port ở
   `components-next/filter/inputs/SingleSelect.tsx`). Pixel đo 0.000% ở cả hai chế độ nên
   khác biệt này hiện không nhìn thấy; ghi lại để nhóm E1 (filter) biết.

## Sửa nhân tiện ngoài phạm vi

- **`Makefile` `QUEUE_TIERS` viết sai tên hàng đợi `scheduled` → `scheduled_jobs`.** Chatwoot
  đặt tên hàng đợi là `scheduled_jobs` (`config/sidekiq.yml`); trước D6 chưa job nào dùng tier
  đó nên lỗi nằm im. Hậu quả quan sát được: `schedule:run` đẩy `ConversationsResolutionSchedulerJob`
  vào hàng đợi mà worker KHÔNG nghe → hội thoại nguội không bao giờ được đóng. Đã sửa; ai đang
  chạy worker cũ phải khởi động lại (`make down && make up`).
- `Select.tsx` thêm `groups` (optgroup) — nợ khai từ C1.
- `Context::NoToolbar` thêm vào bảng FORMATTING + MENU_BY_KEY và prop `channelType` cho
  `components-next/Editor` — nợ khai từ B3 ("bỏ nhánh channelType").

## Nợ / việc cho người khác

- `Conversation::canReply()` mới có nhánh `Channel::Api`; khi port kênh WhatsApp/Facebook
  (nhóm F) thì nhánh "ngoài cửa sổ gửi tin" của `AutoResolve` mới chạy thật với các kênh đó.
- `AccountsController` chưa port `cache_keys`, `update_active_at`, khối billing — thêm khi
  màn Account Settings (nhóm F) cần.
- `ConversationRequiredAttributes` trên trang Conversation Workflow: chờ E1.
- Kênh khác ngoài Web Widget/API chưa có màn Business Hours riêng vì tab dùng chung.

## Gate đã chạy

1. **Pest toàn suite** trên DB riêng `yona_rw_test_d6` (`REDIS_DB=6`): xem mục "Trạng thái
   cuối" bên dưới. 43 test mới của D6 đều xanh. DB đã `DROP` sau khi xong.
2. `vendor/bin/pint` — xanh trên toàn bộ file đã đụng.
3. `npx tsc --noEmit` — xanh. `npm run build` — xanh. `npm test` (vitest) — 49 file / 392 test xanh.
4. `php artisan i18n:generate --check` — xanh sau khi sinh lại bundle.
5. **Pixel-diff** (`~/www/pixel-diff/d6-business-hours-diff.mjs`, `d6-auto-resolve-diff.mjs`,
   `compare.mjs`):

   | Màn | light | dark |
   |---|---|---|
   | Tab Business Hours (toàn trang, tắt) | 0.030% | 0.030% |
   | Khối Business Hours — tắt | 0.000% | 0.000% |
   | Khối Business Hours — bật (editor + múi giờ + bảng) | 0.024% | 0.055% |
   | Bảng 7 ngày (mở cả ngày + tắt một ngày) | 0.000% | 0.000% |
   | Trang Conversation Workflow (toàn trang) | 0.030% | 0.030% |
   | Thẻ Auto-resolve — tắt | 0.000% | 0.000% |
   | Thẻ Auto-resolve — bật (form đầy đủ) | 0.000% | 0.000% |

   0.030% là nền nhiễu của sidebar (đúng mức các tính năng trước). Vùng lệch của "Business
   Hours bật" nằm gọn ở y 12–165 = ô soạn tin ngoài giờ (nợ placeholder đậm hơn oracle, ghi
   từ B3).
6. **Audit nút** (`audit-buttons.mjs`) hai bên: tab Business Hours 3/3 nút (Back / công tắc /
   Update business hours settings) phản ứng giống oracle; trang Conversation Workflow 1/1
   (công tắc).
7. **E2E trình duyệt** — xem mục dưới.

## E2E

### Tin ngoài giờ (`d6-out-of-office-e2e.mjs`, qua `public/widget-test.html` + SDK thật)

Dựng inbox Website tạm → PATCH lịch đóng cửa NGÀY HÔM NAY (múi giờ UTC) + thông điệp
`D6 e2e — we are closed right now.` → mở trang nhúng, bấm bong bóng, gõ tin trong iframe:

```
widget thấy tin ngoài giờ: CÓ
tin trong hội thoại: [[0,"text","Chao shop, con hang khong?"],
                      [3,"text","D6 e2e — we are closed right now."],
                      [3,"text","Give the team a way to reach you."],
                      [3,"input_email","Get notified by email"]]
số tin ngoài giờ sau 2 lượt nhắn: 1 (kỳ vọng 1)
xoá inbox tạm: 200
```

Đúng thứ tự `trigger_templates` của bản gốc (out-of-office trước greeting/email-collect) và
đúng cổng "một lần mỗi ngày".

### Tự đóng hội thoại nguội (`d6-auto-resolve-e2e-setup.mjs` → `schedule:run` → `d6-auto-resolve-e2e-verify.mjs`)

Bật auto-resolve bằng chuột trên trang Conversation Workflow (10 phút + thông điệp), F5 giữ
nguyên; tạo hội thoại thử, lùi `last_activity_at` 2 giờ, chạy `php artisan schedule:run` ở
mốc `*/5`:

```
{"toggle":"true","duration":"10","unit":"minutes","message":"Closing this conversation — D6 e2e.",
 "settings":{"auto_resolve_after":10,"auto_resolve_message":"Closing this conversation — D6 e2e.",
             "auto_resolve_ignore_waiting":false,"auto_resolve_label":null}}

03:40:00 Running [App\Jobs\Account\ConversationsResolutionSchedulerJob] DONE
worker:  03:40:05 App\Jobs\Conversations\ActivityMessageJob DONE
```

Màn hội thoại (đọc chữ hiển thị thật, sau F5 vẫn giữ):

```
Hội thoại thử auto-resolve D6            (tin của khách)
Assigned to John by Default Policy       (activity B6)
Closing this conversation — D6 e2e.      (tin mẫu auto-resolve)
Conversation was marked resolved by system due to 10 minutes of inactivity
nút header: Reopen   → sau reload vẫn Reopen
```

Tắt công tắc trên UI xoá sạch cấu hình: `{"auto_resolve_after":null,"auto_resolve_message":null,
"auto_resolve_ignore_waiting":false,"auto_resolve_label":null}`.

## Dọn dẹp

- Inbox Website thử (`d6-ooo-test`) đã xoá; hội thoại + tin thử đã xoá; account 2 về
  `auto_resolve_* = null`.
- Inbox 1 hai bên trả về `timezone UTC`, `working_hours_enabled false`,
  `out_of_office_message` rỗng, lịch mặc định (đối chiếu từng dòng, hai bên trùng nhau).
- `~/www/pixel-diff/reset-fixture.sh` → yona `{"hội thoại":[4],"tin":5}`, oracle
  `{"hội thoại":[1],"tin":5}`; chấm lại tab Business Hours sau khi dọn vẫn 0.030% / 0.030%.
- DB `yona_rw_test_d6` đã `DROP`.

## Harness thêm (`~/www/pixel-diff/`)

`d6-business-hours-diff.mjs`, `d6-auto-resolve-diff.mjs`, `d6-out-of-office-e2e.mjs`,
`d6-auto-resolve-e2e-setup.mjs`, `d6-auto-resolve-e2e-verify.mjs`, `d6-cleanup.mjs`.

## Trạng thái cuối

**Pest 1186/1186** (2743 assertion) trên `yona_rw_test_d6` — gồm 43 test mới của D6 và cả
phần của agent `d5` chạy song song. pint · tsc · build · vitest (52 file / 404 test, gồm 15
test businessHour) · `i18n:generate --check` đều xanh.

Status: DONE_WITH_CONCERNS
Summary: Bảng `working_hours` + lịch làm việc theo inbox, tin ngoài giờ cắm vào hook mẫu tin
có sẵn, và tự đóng hội thoại nguội theo `auto_resolve_after` đã chạy thật trên trình duyệt;
pixel-diff mọi màn ≤ 0.055%.
Concerns: (1) mục sidebar "Conversation Workflow" được bật lại — đảo một quyết định ghi ở A3,
đã xác minh nguồn (`config/features.yml` gốc bật `auto_resolve_conversations`) nhưng founder
nên biết; (2) `Makefile` `QUEUE_TIERS` sai tên hàng đợi `scheduled` → đã sửa thành
`scheduled_jobs`, ai đang chạy worker cũ phải `make down && make up` nếu không job lịch mới
sẽ nằm im; (3) `ConversationRequiredAttributes` chưa port (chờ E1) — hiện KHÔNG lệch pixel vì
oracle self-hosted cũng không render khối đó.
