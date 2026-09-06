# Trace D1 — Automation rules

Ngày: 06/09/2026 (vòng 2 — fidelity + e2e). Vòng 1 cùng ngày dựng backend/API/executor.

## Trạng thái

**Xong, chờ founder nghiệm thu cuối.** Đủ 5 cửa: gate tự động, bảng đối chiếu,
pixel ≤ 0,1% ở 9 trạng thái sáng/tối, rà nút hai bên, e2e trình duyệt 13/13.
Vòng 2 viết lại toàn bộ lớp giao diện form: vòng 1 tự vẽ side panel, dùng
`components-next/Input` thay `woot-input`, `<select>`/checkbox thay RadioCard,
và nhân bản ConditionRow — sai nhịp dọc 1–5px, nút đóng lệch 8px, thiếu run type.

## Bảng đối chiếu Ruby ↔ PHP

| Chatwoot OSS | Yona | Ghi chú |
|---|---|---|
| `AutomationRule` | `app/Models/AutomationRule.php` | conditions/actions JSONB, active, event, delay, account scope |
| `AutomationRulePendingExecution` | `app/Models/AutomationRulePendingExecution.php` | unique episode, pending/processing/executing/skipped, stale reclaim |
| `automation_rules_controller.rb` | `app/Http/Controllers/WebApi/AutomationRulesController.php` | index/show/create/update/destroy/clone; administrator + account scope |
| `conditions_filter_service.rb` + `condition_validation_service.rb` | `app/Services/AutomationRules/ConditionsFilterService.php` + `RuleValidator.php` | so sánh một conversation thuần PHP, không đưa key admin vào SQL |
| `automation_rules/action_service.rb` + `action_service.rb` | `app/Services/AutomationRules/ActionService.php` + `app/Services/ConversationActions/ActionExecutor.php` | executor độc lập, D3 Macros gọi lại cùng lõi |
| `automation_rule_listener.rb` | `app/Listeners/AutomationRuleListener.php` | chống tự kích hoạt bằng `performed_by` |
| pending jobs + `config/schedule.yml` | `app/Jobs/AutomationRules/*` + `routes/console.php` | sweep 5 phút |

## Bảng đối chiếu Vue ↔ React

| Chatwoot OSS | Yona | Ghi chú |
|---|---|---|
| `settings/automation/Index.vue` | `settings/automation/Index.tsx` | list, search, tab Instant/Delayed + banner khi feature tắt, toggle, clone, delete |
| `AutomationRuleForm.vue` + `Add/EditAutomationRule.vue` | `AutomationRuleForm.tsx` | side panel 3xl, `woot-input`, run type, wait/instant, actions; open() hydrate delay |
| `components/AutomationInstantTrigger.vue` | `AutomationInstantTrigger.tsx` | event `<select>` trong `<label>` + ConditionRow dùng chung |
| `components/AutomationRunTypeSelector.vue` | `AutomationRunTypeSelector.tsx` | RadioCard |
| `components/AutomationWaitCondition.vue` | `AutomationWaitCondition.tsx` | FilterSelect + DurationInput + MultiSelect, dịch trigger ↔ event/conditions |
| `components/AutomationActions.vue` | `AutomationActions.tsx` | ul không gap, `div.pt-2` nút thêm |
| `components/widgets/AutomationActionInput.vue` | `components/widgets/AutomationActionInput.tsx` | đặt ở widgets để D3 Macros dùng lại; textarea = WootMessageEditor |
| `components-next/side-panel/SidePanel.vue` | `components-next/side-panel/SidePanel.tsx` | **primitive mới** (gốc dùng ở 7 chỗ): header `-me-2`, Escape, khoá cuộn, trả focus |
| `components-next/filter/inputs/MultiTextInput.vue` | `filter/inputs/MultiTextInput.tsx` | **bổ sung vào ConditionRow chung** — B đã bỏ vì bộ lọc hội thoại không dùng; automation `content` cần |
| `dropdown-menu/base/DropdownFloating.vue` + `provideDropdownTeleport` | `DropdownTeleportProvider` + `DropdownFloating` trong `dropdown-menu/base/index.tsx` | menu fixed ra body; `composables/useDropdownPosition.ts` port chế độ fixed |
| `helper/automationHelper.js` + `filterQueryGenerator` + `actionQueryGenerator` + `useEditableAutomation` + `useAutomationValues` | `automationHelper.ts` | hàm thuần: buildFilterTypes, generateAutomationPayload, formatAutomation, option sets |
| `helper/validations.js#validateAutomation` | `validations.ts` | key lỗi giữ nguyên (`condition_N`, `action_N`) |
| `settings/automation/constants.js` + `operators.js` | `constants.ts` | thứ tự attribute theo event giữ đúng gốc |
| `BaseSettingsHeader.vue` slot `tabs` | `settings/BaseSettingsHeader.tsx` prop `tabs` | bổ sung slot còn thiếu từ nhóm A |

Test mới: `validations.test.ts` (5), `automationHelper.test.ts` (6, gồm round-trip
hydrate → payload theo luật equivalence).

## Action đã port / để nợ

Đã port và có test: assign agent (kể cả `last_responding_agent`)/team, remove
assignment, add/remove label, send message, add private note, mute, snooze,
open, pending, resolve, change priority.

Ẩn khỏi builder + reject ở API để không sinh nút giả: `send_email_to_team`
(F1 mailer), `send_email_transcript`, `send_webhook_event` (D4),
`send_attachment` (chưa có seam lưu trữ), `add_sla` (EE). Custom attribute
conditions để E1. `enable-variables` của editor (gợi ý `{{contact.name}}`) chưa
port — chỉ là popup gợi ý, ô soạn vẫn nhận biến gõ tay.

## Khác biệt cố ý

1. Matcher xử lý một conversation trong PHP thay vì SQL động; giữ semantics
   operator/AND/OR, tránh injection từ `attribute_key`.
2. Event actor dùng `CurrentExecutedBy`; action sinh ra không chạy lại cùng rule,
   activity ghi chủ thể `Automation System`.
3. Wrapper editor của gốc có `[&_.ProseMirror-menubar]:hidden` nhưng bị style
   của chính Editor.vue đè → toolbar vẫn hiện; bên Yona thứ tự CSS khác nên bỏ
   class này để ra đúng kết quả (toolbar hiện).
4. `FilterValue` của bộ lọc hội thoại chưa có `string[]`; nhánh multiText cast
   tại chỗ thay vì sửa type dùng chung (phiên B đang sửa cùng vùng).
5. Text i18n `FORM.RESET_MESSAGE` giữ nguyên "…conditions and **events**…" của
   gốc (gốc viết vậy) để pixel khớp.

## Gate đã chạy (vòng 2)

| Gate | Kết quả |
|---|---|
| Pest D1 (controller + services + jobs) | 10/10, 35 assertions |
| Vitest toàn bộ | 416/416 (gồm test phiên B đang thêm) |
| `pnpm tsc --noEmit` | xanh trên file D1; 1 lỗi ở `filter/helper/filterQuery.ts` là file phiên B đang sửa dở (13:28), không thuộc D1 |
| `pnpm build` | xanh |
| `php artisan i18n:generate --check`, pint `lang/en/automation.php` | xanh |
| `audit-buttons.mjs` oracle/Yona `/settings/automation/list` | cùng 1 nút `Create Automation`, cùng phản ứng |
| `d1-automation-ui.mjs` list / create / invalid / message / content / edit | light 0.029–0.030%, dark 0.026–0.030% — tất cả ≤ nhiễu nền 0.030% |
| `d1-delayed.sh` (bật `delayed_automations` hai bên → delayed-list / delayed-create / delayed-wait → tắt) | 0.026–0.030% |
| `d1-e2e.mjs` | 13/13: tạo qua UI (Message Created · content contains "giá" · assign team support + add label "Khách sộp") → reload còn → mở sửa hydrate đúng → payload API đúng shape → tin inbound "cho em hỏi giá" → team=2, nhãn có |

Trước vòng 2 side panel lệch 0.511%/0.506%; `message` (editor) 0.684%/1.292%.

## Bẫy đã trả giá

1. Eloquent không có `Model::withLock()`; lock trên query trong transaction.
2. Event chạy đồng bộ trong request nên `auth()->user()` vẫn là John; phải ưu
   tiên `CurrentExecutedBy`.
3. Từ khoá tiếng Việt phải giữ dấu (`gia` không match `giá`).
4. Form gốc dùng **legacy `woot-input`** + global `_base.scss` (label leading-7,
   input mb-4), không phải `components-next/Input` — nhịp dọc lệch 1–5px nếu
   chọn sai primitive. Cùng lý do: `<select>` phải nằm TRONG `<label>`.
5. Nút đóng side panel lệch 8px vì thiếu wrapper `-me-2` → port `SidePanel`
   thành primitive thay vì tự vẽ.
6. Dropdown không teleport: focus ô tìm kiếm trong menu làm thân panel cuộn
   xuống ~74px → ảnh lệch dù DOM đúng. Gốc `provideDropdownTeleport` trong form.
7. `reset-fixture.sh` chỉ null `cached_label_list` → taggings sót → `addLabels`
   thấy "không đổi" và không ghi lại cache → e2e đọc nhãn rỗng dù rule chạy.
   Đã sửa script: detach taggings + xoá notification John hai bên (notification
   sót làm huy hiệu "My Inbox" lệch 0.5%).
8. Playwright: sau khi Enter vào chip input phải click ra ngoài rồi mới bấm nút
   kế — mousedown làm chip input blur → layout dịch → click trượt.
9. Hai phiên cùng working tree: lỗi tsc/pest ở file phiên kia phải lọc ra và
   ghi rõ, không sửa hộ.
