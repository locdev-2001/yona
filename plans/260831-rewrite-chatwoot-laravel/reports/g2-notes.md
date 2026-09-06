# G2 — Đối chiếu automation nhánh `main` với D1 (Automation rules)

Ngày: 06/09/2026. Phạm vi: rà toàn bộ `app/Modules/Automation/**` + UI canvas trên
`main`, đối chiếu từng khả năng với D1 đã port, bổ sung phần diễn đạt được trong mô
hình Chatwoot, phần còn lại ghi nợ kèm lý do.

## 1. Bảng đối chiếu engine cũ (`main`) ↔ D1

| Khả năng engine cũ | Nơi ở `main` | Tương đương D1 | Kết luận |
|---|---|---|---|
| Trigger `message_received` | `EvaluateWorkflowTriggers` + `DebounceMessageReceivedTriggerJob` | event `message_created` + `AutomationRuleListener` | ĐÃ CÓ |
| Trigger `lead_created` / `lead_assigned` / `lead_stage_changed` | cùng listener | — | NỢ (thực thể Lead/Pipeline chưa port) |
| Trigger `manual` (enroll thủ công) | `WorkflowController@enroll` + `enroll-dialog.tsx` | Macro (D3) chạy tay trên hội thoại | NỢ CÓ TƯƠNG ĐƯƠNG — Chatwoot không có "chạy tay một rule"; hành động thủ công của gốc là Macro, đã có ở D3 (`POST /macros/{id}/execute`) |
| Điều kiện AND nhiều dòng, operator `equals/not_equals/contains/greater_than/less_than` | `ConditionNodeHandler` | `ConditionsFilterService` + `AutomationRule::CONDITION_OPERATORS` (`equal_to`, `not_equal_to`, `contains`, `does_not_contain`, `starts_with`, `is_present`, `is_not_present`) + AND/**OR** | D1 PHỦ RỘNG HƠN. `greater_than/less_than` của gốc Chatwoot chỉ dùng cho custom attribute số (OPERATOR_TYPES_4) → đợt E1 |
| Điều kiện trên field tuỳ ý (`data_get`) | `ConditionNodeHandler` | danh sách attribute cố định theo event | KHÁC BIỆT CỐ Ý — Chatwoot khoá danh sách theo event; field tự do là lỗ hổng (trace D1: không đưa `attribute_key` vào SQL) |
| Chờ N phút/giờ/ngày (`WaitNodeHandler` + cron resume) | `ResumeWaitingWorkflowRuns` | `execution_delay` + `AutomationRulePendingExecution` + `TriggerPendingExecutionsJob` (quét 5 phút) | ĐÃ CÓ (xem §3 khác biệt) |
| Gắn/Gỡ tag (`TagNodeHandler`) | `TagService` | `add_label` / `remove_label` trong `ActionExecutor` | ĐÃ CÓ |
| Gửi tin nhắn (`SendMessageNodeHandler`) | `DeliveryPipeline` | `send_message` (+ `add_private_note`) | ĐÃ CÓ. Nhánh "chọn kênh khi subject=Lead/Contact" không cần: rule Chatwoot luôn gắn với đúng một hội thoại |
| Thông báo nội bộ (`NotifyInternalNodeHandler` → `NotificationService`) | chọn danh sách user | (a) `send_email_to_team` — **ĐÃ PORT trong đợt này**; (b) `add_private_note` có `[@Tên](mention://user/…)` → `MentionService` (B11) tạo notification + participant | ĐÃ CÓ SAU ĐỢT NÀY |
| Tạo Task (`CreateTaskNodeHandler`) | `TaskService` | — | NỢ (Task/Project chưa port) |
| Đổi Lead stage (`ChangeLeadStageNodeHandler`) | `LeadService::moveStage` | — | NỢ (Lead/Pipeline chưa port) |
| Graph nhiều bước, nhánh true/false, vòng lặp có cap | `WorkflowEngine` | rule phẳng: event + conditions + actions | KHÁC BIỆT KIẾN TRÚC CỐ Ý — nhánh rewrite port 100% Chatwoot; canvas graph là sản phẩm riêng của Yona, cắm lại ở nhóm G sau swap |
| Audit trail mỗi bước (`workflow_run_logs`) | — | không có bảng log; hành động lỗi được `report()` | NỢ (ghi ở §4) |
| Quyền `tenant.automation.manage` | `WorkflowController` | administrator của account (`AutomationRulesController`) | ĐÃ CÓ, theo mô hình quyền của Chatwoot |
| Entitlement `module.marketing` gate | `WorkflowEngine::enrollActiveWorkflowsForTrigger` | feature flag `automations` (+ `delayed_automations`) trong `config/features.php` | ĐÃ CÓ, cơ chế gốc |
| i18n `lang/vi/automation.php` | song ngữ | `lang/en/automation.php` (nguồn duy nhất) + `artisan i18n:generate` | ĐÃ CÓ; bản vi của rewrite làm ở đợt i18n chung |

## 2. Việc đã port trong đợt này — `send_email_to_team`

Đây là mục duy nhất của engine cũ (NotifyInternal) diễn đạt được nguyên vẹn trong mô
hình Chatwoot mà D1 còn để trống (D1 ẩn nó vì lúc đó chưa có tầng mail; F1 đã dựng xong).

| Chatwoot OSS | Yona |
|---|---|
| `AutomationRules::ActionService#send_email_to_team` | `app/Services/AutomationRules/ActionService::sendEmailToTeam()` |
| `TeamNotifications::AutomationNotificationMailer#conversation_creation` | `app/Notifications/TeamAutomationNotification.php` |
| `views/.../conversation_creation.liquid` | `resources/views/mail/team-automation-notification.blade.php` |
| `AUTOMATION_ACTION_TYPES` (vị trí sau `remove_label`, inputType `team_message`) | `settings/automation/constants.ts` |
| `AutomationActionTeamMessageInput.vue` | `TeamMessageInput` trong `components/widgets/AutomationActionInput.tsx` |
| `useEditableAutomation#generateActionsArray` nhánh `team_message` | `automationHelper.ts#formatAutomation` |
| `automation.json` `ACTIONS.SEND_EMAIL_TO_TEAM` | `lang/en/automation.php` |

Kiến trúc: hành động này chỉ có ở automation (danh sách action của Macro trong gốc
**không** có nó), nên nó nằm trong `AutomationRules\ActionService` chứ không nhét vào
`ActionExecutor` dùng chung — đúng chỗ bản gốc đặt, và giống cách `Macros\ExecutionService`
giữ hai hành động riêng của macro. Thêm action mới = thêm một nhánh `match` ở đúng lớp
của nó + một dòng trong `SUPPORTED_ACTIONS` + một dòng trong `constants.ts`; không có
`if` rải rác.

Spec ↔ test:

| Hành vi | Test |
|---|---|
| gửi thư cho mọi thành viên của các đội được chọn | `tests/Feature/Services/AutomationRulesTest.php` — "emails every member of the selected teams…" |
| chỉ nhận đội thuộc account của rule; chấp nhận cả `team_ids` dạng id thuần lẫn `{id,name}` | cùng file — "still resolves teams when the builder sends dropdown objects…" |
| chưa cấu hình SMTP thì không gửi (`smtp_config_set_or_development?`) | cùng file — "sends nothing when smtp is not configured" |
| API nhận action + giữ nguyên shape `[{team_ids, message}]` | `tests/Feature/WebApi/AutomationRulesControllerTest.php` |
| hydrate ↔ payload round-trip của `team_message` | `settings/automation/automationHelper.test.ts` |
| danh sách action đúng thứ tự + form đội/lời nhắn | pixel `d1-automation-ui.mjs actions-menu`, `team-email` |

## 3. Khác biệt cố ý

1. **Chờ**: node Wait cũ cho phép chờ bất kỳ (kể cả < 10 phút) ở mọi vị trí trong graph;
   Chatwoot chỉ có `execution_delay` ở cấp rule, 10 phút–30 ngày, và chỉ khi feature
   `delayed_automations` bật. Đã kiểm: mặc định của gốc (`config/features.yml:271`) là
   `enabled: false` — `config/features.php` của Yona cũng `false`, giữ đúng gốc.
2. **`team_ids` chuẩn hoá về id khi sinh payload** (`generateActionParams`). Bản gốc gửi
   nguyên object dropdown `{id,name}` nếu người dùng mở rule cũ mà không chỉnh lại ô đội
   → `Team.where(id: [hash])` không tra ra đội nào và rule im lặng không gửi gì. Yona
   chuẩn hoá ở FE **và** chấp nhận cả hai dạng ở BE. Không ảnh hưởng pixel.
3. **Không port giới hạn email/ngày** (`AccountEmailRateLimitable`): bản gốc `return true
   unless ChatwootApp.chatwoot_cloud?` — chỉ chạy trên bản cloud, bản self-host luôn true.
4. **Tiêu đề thư để chuỗi cứng** như gốc (`This email has been sent via automation rule
   actions.`), không đưa vào `lang/en/automation.php` để bundle i18n của FE không phình
   thêm khoá chỉ dùng ở server.
5. **Cảnh pixel `actions-menu` chưa xanh** — xem §5, nguyên nhân nằm ở primitive dùng
   chung, không phải D1.

## 4. Nợ (không làm ở đợt này) — lý do và đề xuất cắm lại

| Nợ | Lý do | Đề xuất |
|---|---|---|
| Trigger theo Lead (`lead_created`, `lead_assigned`, `lead_stage_changed`), action `create_task`, `change_lead_stage` | Bản rewrite chưa có Lead/Pipeline/Task — dựng thực thể CRM ở đợt này là đi trước lộ trình (nhóm G sau swap) | Khi CDP/pipeline của Yona được port: thêm event vào `EventType` + `AutomationRule::EVENTS` + `CONDITION_ATTRIBUTES`, thêm action vào `ActionExecutor` (hoặc một executor riêng cho subject Lead) + `constants.ts`. Lõi rule không phải sửa |
| Canvas graph nhiều bước (`@xyflow/react`) | Chatwoot không có; nhánh rewrite chốt port 100% Chatwoot | Sau swap, dựng lại như một mặt tiền riêng đọc/ghi cùng bảng `automation_rules` (rule phẳng = graph 3 node) hoặc giữ bảng `workflows` riêng — quyết định sản phẩm, cần founder chốt |
| `workflow_run_logs` (audit "vì sao rule không chạy") | Chatwoot OSS không có bảng này | Có thể cắm vào `AutomationRulePendingExecution` + reporting events sau; không chặn nghiệm thu D1 |
| `send_webhook_event` cho automation | **Chặn kỹ thuật**: `App\Models\Conversation` chưa có `webhookData()` (chỉ Account/Inbox/AgentBot/ContactInbox có). `Macros\ExecutionService::sendWebhookEvent()` đang tự phòng vệ bằng `method_exists` nên hiện là no-op im lặng — **đã báo phiên chính** | Chủ sở hữu D4/`Conversation` thêm `webhookData()`; sau đó bật action cho cả macro và automation (một dòng trong `constants.ts` + một nhánh trong `ActionService`) |
| `send_email_transcript`, `send_attachment` (rule), `add_sla` | như trace D1 (transcript cần mailer transcript + rate limit; attachment cần seam lưu tệp của rule; SLA là EE — cấm mở) | giữ ẩn |

## 5. Bẫy đã trả giá / phát hiện

1. **Cảnh pixel mới `actions-menu` phơi ra hai lỗi của primitive dùng chung, không phải D1**
   (lệch 0,55% light/dark). Đã soi diff: toàn bộ vùng lệch nằm ở các dòng trong menu.
   - `components-next/dropdown-menu/base/index.tsx` — `DropdownItem` chỉ gắn
     `hover:bg-n-alpha-2 rounded-lg w-full gap-3` khi **không** có `children`. Bản gốc
     gắn khi **không có default slot**; `SingleSelect.vue`/`MultiSelect.vue` của gốc dùng
     slot có tên (`#icon`, `#label`) nên vẫn giữ class. Bản port truyền children → mất
     `gap-3` → icon dính sát chữ ở MỌI dropdown chọn của app. Sửa đúng chỗ: cho
     `DropdownItem` hai prop kiểu slot (`iconSlot`/`labelSlot`) và để `SingleSelect`/
     `MultiSelect` dùng chúng thay cho children.
   - Ô "Search…" trong menu của oracle có viền focus, bản Yona không.
   Hai file này thuộc primitive nhóm B, đang có nhiều phiên FE chạy song song nên **G2
   không sửa** (luật không đụng file phiên khác). Đã ghi lại để phiên chính giao chủ.
2. Fixture bẩn: huy hiệu "My Inbox 1" chỉ có bên Yona khi chụp — notification sót của
   phiên khác. `reset-fixture.sh` cần chạy trước khi lấy số cuối cùng (bẫy đã ghi ở trace D1).
3. Kịch bản pixel hay hỏng ở bước đăng nhập (`waitForURL` 20s) khi chạy song song
   với suite Pest — chạy pixel và Pest lệch nhau, đừng kết luận là lỗi giao diện.
4. `formatAutomation` của gốc trả **object** cho `team_message` (không phải mảng) — port
   sai thành mảng thì ô đội hiện rỗng khi mở rule cũ để sửa; đã có test round-trip chặn.

## 6. Gate

| Gate | Kết quả |
|---|---|
| Pest D1 (services + controller + jobs) trên `yona_rw_test_g2` | 11/11 (6 services + 5 controller), 3 test mới |
| Pest toàn suite (`yona_rw_test_g2`, đã `dropdb` sau khi chạy) | 2048/2048, 5015 assertions |
| `vendor/bin/pint` các file G2 | xanh |
| `npx tsc --noEmit` | xanh (0 lỗi toàn cây) |
| `npx vitest run` automationHelper | 8/8 |
| `npm run build` | xanh |
| `php artisan i18n:generate` | xanh |
| pixel `d1-automation-ui.mjs` (list/create/invalid/message/content/edit + **team-email** mới) | light 0,029–0,030% · dark 0,026–0,030% — tất cả ≤ nhiễu nền |
| pixel `actions-menu` (cảnh mới) | 0,55% — lỗi primitive dùng chung, xem §5 |
| `d1-e2e.mjs` | 13/13 PASS |
