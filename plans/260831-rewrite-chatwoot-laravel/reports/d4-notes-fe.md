# D4 frontend — Integrations (danh mục + Webhooks), Agent Bots, tab Bots của inbox

Agent `d4-fe`. Nguồn: Chatwoot v4.17.1 (`refs/chatwoot`). Ngày 06/09/2026.
Contract API đọc từ `reports/d4-notes-be.md`.

## Bảng trace Vue ↔ TSX

| Chatwoot (Vue/JS) | Yona (React/TS) | Ghi chú |
|---|---|---|
| `routes/dashboard/settings/integrations/Index.vue` | `resources/js/dashboard/settings/integrations/Index.tsx` | lưới thẻ + ô tìm |
| `…/integrations/IntegrationItem.vue` | `…/integrations/IntegrationItem.tsx` | thẻ app, logo `/dashboard/images/integrations/{id}.png` |
| `…/integrations/IntegrationHooks.vue` | `…/integrations/ShowIntegration.tsx` | màn route `settings/integrations/:integration_id` |
| `…/integrations/SingleIntegrationHooks.vue` | `…/integrations/SingleIntegrationHooks.tsx` | app 1 hook (openai/google_translate/dyte) |
| `…/integrations/MultipleIntegrationHooks.vue` | `…/integrations/MultipleIntegrationHooks.tsx` | app nhiều hook (dialogflow) |
| `…/integrations/NewHook.vue` | `…/integrations/NewHook.tsx` | modal tạo hook; FormKit → input/textarea/select/checkbox thẳng |
| `…/integrations/Webhooks/Index.vue` | `…/integrations/Webhooks/Index.tsx` | list + modal thêm/sửa + xoá |
| `…/integrations/Webhooks/WebhookRow.vue` | `…/integrations/Webhooks/WebhookRow.tsx` | |
| `…/integrations/Webhooks/WebhookForm.vue` | `…/integrations/Webhooks/WebhookForm.tsx` | checkbox subscriptions + ô secret |
| `…/integrations/Webhooks/NewWebHook.vue` | `…/integrations/Webhooks/NewWebHook.tsx` | có bước "đã tạo → copy secret" |
| `…/integrations/Webhooks/EditWebHook.vue` | `…/integrations/Webhooks/EditWebHook.tsx` | |
| `…/integrations/DashboardApps/{Index,DashboardAppsRow,DashboardAppModal}.vue` | `…/integrations/DashboardApps/{Index,DashboardAppsRow,DashboardAppModal}.tsx` + `types.ts` | **chưa có route** — xem "Route còn thiếu" |
| `routes/dashboard/settings/agentBots/Index.vue` | `resources/js/dashboard/settings/agentBots/Index.tsx` | |
| `…/agentBots/components/AgentBotModal.vue` | `…/agentBots/components/AgentBotModal.tsx` | thêm/sửa + access token + secret |
| `routes/dashboard/settings/inbox/components/BotConfiguration.vue` | `resources/js/dashboard/settings/inboxes/settingsPage/BotConfigurationPage.tsx` | đăng ký ở `settings/inboxes/Show.tsx`, tab key `bot-configuration` (đã có sẵn trong `TAB_LABELS`/`tabKeysFor`, chỉ thiếu phần render) |
| `components/widgets/ShowMore.vue` | `dashboard/components/widgets/ShowMore.tsx` | mới |
| `routes/dashboard/settings/helper/settingsHelper.js` (`getI18nKey`) | `dashboard/settings/helper/settingsHelper.ts` | mới |
| `store/modules/integrations.js` + `api/integrations.js` (phần danh mục) | `dashboard/composables/useIntegrationApps.ts` | cache module-level + `useSyncExternalStore` (khuôn `useCannedResponses`) |
| `store/modules/webhooks.js` + `api/webhooks.js` | `dashboard/composables/useWebhooks.ts` | state trong hook (chỉ 1 màn đọc) |
| `store/modules/agentBots.js` + `api/agentBots.js` + `api/inboxes.js#{get,set}AgentBot` | `dashboard/composables/useAgentBots.ts` | dùng chung Settings > Bots và tab inbox |
| `components/BaseSettingsHeader.vue` prop `backButtonLabel` | thêm prop cùng tên vào `settings/BaseSettingsHeader.tsx` | dùng `components/widgets/BackButton.tsx` có sẵn |
| `constants/globals.js#EXAMPLE_WEBHOOK_URL` | `dashboard/constants/globals.ts` | thêm hằng |

### i18n (`lang/en/*.php`, namespace = tên file viết hoa)

| JSON gốc | File lang |
|---|---|
| `integrations.json` → `INTEGRATION_SETTINGS` | `lang/en/integration_settings.php` (ghi đè bản subset OPEN_AI cũ bằng **toàn bộ** cây, superset — subset cũ giữ nguyên chữ) |
| `integrationApps.json` → `INTEGRATION_APPS` | `lang/en/integration_apps.php` (mới) |
| `agentBots.json` → `AGENT_BOTS` | `lang/en/agent_bots.php` (mới) |
| `webhooks.json` → `WEBHOOKS_SETTINGS` | `lang/en/webhooks_settings.php` (mới) |

Bundle sinh lại bằng `php artisan i18n:generate`.

### Ảnh

`public/dashboard/images/integrations/*.png` (25 file) chép từ `refs/chatwoot/public/dashboard/images/integrations/`
— giữ nguyên đường dẫn `/dashboard/images/integrations/{id}.png` và `{id}-dark.png` của bản gốc.

## Spec ↔ vitest

Chatwoot v4.17.1 **không có** spec JS nào cho các file trên
(`routes/dashboard/settings/integrations/specs/` chỉ có spec của `Slack`/`hookMixin`, không thuộc phạm vi D4;
`agentBots` và `Webhooks` không có thư mục `specs`). Không port spec nào → không thêm vitest.
Gate hành vi của đợt này nằm ở pixel-diff + `audit-buttons.mjs`.

## Khác biệt cố ý

1. **Paywall webhook** (`WebhookPaywall.vue` + `BasePaywallModal`) chỉ chạy trên Chatwoot Cloud
   (`isOnChatwootCloud && !feature(api_and_webhooks)`). Bản tự host luôn bật webhook → không port,
   `Webhooks/Index.tsx` bỏ luôn nhánh `apiAndWebhooksEnabled`.
2. **`ShowIntegration.vue` + `Integration.vue` + `IntegrationHelpText.vue`** của Chatwoot **không nằm trên
   route nào** ở v4.17.1 (`integrations.routes.js` trỏ `:integration_id` sang `IntegrationHooks.vue`).
   Tên page Inertia `dashboard/settings/integrations/ShowIntegration` giữ theo route phiên chính đã thêm,
   nhưng **nội dung port từ `IntegrationHooks.vue`** — đó mới là thứ oracle render.
3. **`NewHook`**: bản gốc dựng form bằng FormKit từ `settings_form_schema`; bản port render thẳng
   input/textarea/select/checkbox theo cùng schema (cùng nhãn, cùng thứ tự, cùng `help`).
   Không nằm trong gate pixel — luồng hook thuộc nhóm F6.
4. **`inbox_updated`** trong danh sách subscriptions chỉ hiện khi bật `inboxEventsEnabled` (`useConfig`).
   Yona chưa có cờ này → giữ đúng danh sách mặc định 10 sự kiện của bản gốc.
5. **Tab `bot-configuration`**: Chatwoot gate bằng `FEATURE_FLAGS.AGENT_BOTS`; `Show.tsx` của Yona đã liệt kê
   tab này không điều kiện từ trước (B7) — giữ nguyên, không đổi hành vi tab.
6. `disconnectBot` của bản gốc gửi `agent_bot: undefined` (khoá bị JSON.stringify bỏ), bản port gửi
   `agent_bot: null` — backend đọc như nhau (`@agent_bot` nil → xoá `agent_bot_inbox`).

## Bẫy đã trả giá

- **Khoảng trắng JSX giữa hai thẻ**: `<span>Subscribed Events:</span>\n<ShowMore/>` trong Vue tự có một dấu
  cách (whitespace của template), JSX thì **bỏ** whitespace có xuống dòng → dính chữ `Subscribed Events:Conversation…`.
  Pixel-diff bắt được 0.160%. Phải viết `</span>{' '}`. Kiểm mọi chỗ ghép text + component inline.
- **Phải `npm run build` trước mỗi lượt pixel-diff**: `:8000` chạy asset đã build (`public/build`),
  không có vite dev/HMR (`public/hot` không tồn tại). Sửa TSX xong mà không build → đo lại đúng số cũ, tưởng chưa fix.
- `BaseSettingsHeader.tsx` của Yona thiếu prop `backButtonLabel` (bản gốc có) — ba màn của D4
  (Webhooks, ShowIntegration đơn, Dashboard Apps) cần nút "‹ Integrations". Đã thêm prop (thuần cộng thêm).
- Logo app lấy theo **`id`** (`webhook.png`) chứ không theo trường `logo` (`webhooks.png`) — dễ chép nhầm.
- **`GET /inboxes/{id}/agent_bot` trả `{"agent_bot": {}}` khi inbox chưa gắn bot** (cả hai bên) — object
  rỗng vẫn truthy. Bản Vue thoát nạn nhờ `getBot(undefined)` trả `{}`; bản port lúc đầu set
  `String(bot.id)` = `"undefined"` → ô select trống + nút "Disconnect bot" bật sáng (oracle mờ/disabled).
  Pixel-diff bắt 0.085%. Phải xét theo `bot?.id`, không xét theo object.
- **Form lồng trong `Dialog` — React KHÔNG gọi `onSubmit` của form bên trong** (QA 06/09 bắt được
  ở Settings › Bots › Add Bot: bấm "Create Bot" → modal đóng, không có POST, URL thành
  `…/settings/agent-bots?` vì trình duyệt chạy submit mặc định GET).
  `Dialog.vue` gốc đã bọc children trong `<form @submit.prevent="confirm">`, còn `AgentBotModal.vue`
  lại render `<form>` nữa bên trong — ở Vue vẫn chạy vì Vue gắn listener THẲNG lên phần tử;
  bản port React đưa `onSubmit` qua hệ thống sự kiện tổng hợp và handler của form lồng **không hề chạy**
  (đo tận tay: form lồng vẫn tồn tại trong DOM, `button.form` trỏ đúng form trong, listener native trên
  form trong có nổ, nhưng `preventDefault` không ai gọi → điều hướng GET). Chỉ form NGOÀI của Dialog
  được React xử lý (`forms[0].requestSubmit()` → không điều hướng).
  → **Luật:** `Dialog` là chủ sở hữu `<form>` DUY NHẤT; children không được render `<form>`, phải dùng
  prop `onConfirm`. `Dialog.tsx` có sẵn `useEffect` cảnh báo `console.error` khi phát hiện `form form`.
- **Namespace i18n `INTEGRATION_APPS` có HAI nguồn** — `integrationApps.json` của frontend (khoá VIẾT HOA:
  `CONFIGURE`, `STATUS.DISABLED`, …) và khối `integration_apps` của `config/locales/en.yml` backend
  (khoá viết thường theo id app, `App.php` đọc `__('integration_apps.dyte.name')`).
  Bản đầu chỉ để nguồn backend trong `lang/en/integration_apps.php` → trang Integrations in ra
  chuỗi khoá thô `INTEGRATION_APPS.CONFIGURE` (pixel `integrations` 3.946%, `show-dialogflow` 2.279%).
  Đã gộp cả hai vào cùng một file (khoá không đụng nhau vì khác kiểu chữ).
- `yona-api.mjs` cắt output ở 600 ký tự → đừng kết luận backend thiếu app khi danh sách dài; đo bằng pixel-diff.

## Sửa lỗi QA 06/09 — form lồng trong Dialog

Cách sửa (một chỗ, không chắp vá từng modal): **`Dialog` giữ nguyên `<form>` như `Dialog.vue` gốc và là
chủ sở hữu form duy nhất**; modal bên trong bỏ thẻ `<form>` của mình, chuyển sang prop `onConfirm`.
Nút `type="submit"` trong children vẫn thuộc form của Dialog nên `onSubmit` → `preventDefault` → `onConfirm`.

| File | Trạng thái | Xử lý |
|---|---|---|
| `components-next/dialog/Dialog.tsx` | — | ghi rõ hợp đồng "Dialog là form duy nhất"; thêm `useEffect` bắt `form form` khi mở modal, `console.error` cảnh báo |
| `settings/agentBots/components/AgentBotModal.tsx` | **LỖI** (QA bắt) | `<form onSubmit>` → `<div>`; `Dialog` nhận `onConfirm={handleSubmit}`; `handleSubmit` bỏ tham số `FormEvent` |
| `components-next/Campaigns/…/LiveChatCampaignForm.tsx` | **lỗi tiềm ẩn** | thêm prop `embedded` → render `<div>` thay `<form>` khi nhúng trong Dialog |
| `components-next/Campaigns/…/EditLiveChatCampaignDialog.tsx` | **lỗi tiềm ẩn** | truyền `embedded` (đây là nơi duy nhất nhúng form đó vào Dialog) |
| `settings/integrations/Webhooks/WebhookForm.tsx` | sạch | nằm trong `components/Modal` (không phải `<form>`) → không lồng, đây là lý do webhook vẫn tạo được |
| `settings/integrations/NewHook.tsx`, `settings/integrations/DashboardApps/DashboardAppModal.tsx` | sạch | cũng dùng `components/Modal` |
| `settings/inboxes/settingsPage/BotConfigurationPage.tsx` | sạch | form của trang, không nằm trong modal |
| 22 file `<form>` còn lại trong `resources/js/dashboard`, 3 file trong `resources/js/widget` | sạch | rà toàn bộ: chỉ `Dialog.tsx` render `<form>` bao children; ngoài hai ca trên không còn chỗ nào lồng |

Cách rà lại: `grep -rln "<form" resources/js` rồi đối chiếu với danh sách file import
`components-next/dialog/Dialog` (và các component con mà chúng render).

## Route còn thiếu (phiên chính thêm)

```php
Route::get('/settings/integrations/dashboard_apps', fn () => Inertia::render(
    'dashboard/settings/integrations/DashboardApps/Index'
))->name('settings_integrations_dashboard_apps');
```

Phải đặt **TRƯỚC** route `'/settings/integrations/{integrationId}'` (regex `[a-z_]+` khớp cả `dashboard_apps`).
Hiện thẻ "Dashboard Apps" ở trang danh mục dẫn sang `ShowIntegration` → render nhầm bảng hook
thay vì màn Dashboard Apps của oracle. Backend `dashboard_apps` cũng chưa có (nợ F6) nên danh sách sẽ rỗng.
Đo hiện trạng: `node compare.mjs '/app/accounts/{id}/settings/integrations/dashboard_apps' --login`
→ **2.052% / 2.134% (KHÔNG ĐẠT)** — chỉ do thiếu route, component đã sẵn sàng; thêm route xong đo lại.

**06/09: phiên chính đã thêm route** (`routes/web.php:154`). Đo lại: **0.030% / 0.030% (ĐẠT)**.

## Kết quả gate (đo lại 06/09 sau khi sửa lỗi form lồng + i18n INTEGRATION_APPS)

- `npx tsc --noEmit`: **sạch toàn dự án** (hai lỗi nhóm Reports ghi ở lượt trước đã được chủ sở hữu sửa).
- `npm run build` (vite + sdk): xanh.
- `npx vitest run`: **64 file / 473 test xanh**.
- `vendor/bin/pint lang/en/integration_apps.php`: passed (không đụng file PHP nào khác).
- `php artisan i18n:generate`: sinh lại `resources/js/i18n/generated/en.ts`.
- Pixel-diff `~/www/pixel-diff/d4-integrations-ui.mjs` (light + dark, ngưỡng 0.1%, nhiễu nền ~0.03%) —
  chạy trọn 11 kịch bản:

| Kịch bản | light | dark |
|---|---|---|
| `integrations` | 0.030% | 0.030% |
| `show-openai` | 0.030% | 0.030% |
| `show-dialogflow` | 0.030% | 0.030% |
| `webhooks-empty` | 0.034% | 0.035% |
| `webhooks-list` | 0.038% | 0.038% |
| `webhook-add` | 0.039% | 0.031% |
| `webhook-edit` | 0.039% | 0.031% |
| `bots-empty` | 0.030% | 0.030% |
| `bots-list` | 0.030% | 0.030% |
| `bot-add` | 0.037% | 0.027% |
| `inbox-bots` | 0.030% | 0.030% |

Ngoài kịch bản gate: `settings/integrations/google_translate` 0.030% / 0.030%;
`settings/integrations/dashboard_apps` (route mới) **0.030% / 0.030%**.

> **Bẫy đo đạc:** lượt đầu `webhook-add/edit` nhảy lên 0.567% / 0.297%. Không phải do code —
> phiên QA để lại webhook `QA Receiver Đợt D4` trên Yona mà oracle không có, nền sau modal lệch.
> Cách đo đúng: seed webhook y hệt sang oracle, đo xong xoá khỏi oracle (đã trả oracle về rỗng).
> Webhook của phiên QA trên Yona giữ nguyên, không đụng.

- `audit-buttons.mjs http://localhost:8000 /settings/agent-bots`: `OK "Add Bot" (Δel=25)` — không nút DEAD.
- E2E trình duyệt `~/www/pixel-diff/d4-bots-e2e.mjs` — **18/18 bước đạt**, dữ liệu tự dọn sạch:
  đăng nhập → Add Bot điền tên `Bot Trợ Lý QA` + URL `http://localhost:9999/bot` → `POST /agent_bots` 200
  (không còn điều hướng GET) → hiện màn access token có giá trị → bot vào danh sách → F5 vẫn còn →
  sửa mô tả qua UI → cập nhật `/agent_bots/{id}` 200 (FE gửi multipart nên là `POST` + `_method=PUT`,
  tương đương `PATCH` của Chatwoot) → tab Bots của inbox `api-test` chọn bot + lưu → `set_agent_bot` 200,
  `GET /inboxes/{id}/agent_bot` trả đúng bot → Disconnect → inbox hết bot → xoá bot → danh sách rỗng.
- Smoke `~/www/pixel-diff/d4-campaign-dialog-smoke.mjs` (kiểm ca form lồng thứ hai vừa sửa):
  hộp thoại Edit live chat campaign mở, `dialog[open] form form` = không, bấm lưu → `PATCH 200`,
  không điều hướng native; campaign fixture tự xoá.

## Lệnh chạy lại

```bash
cd ~/www/yona && php artisan i18n:generate && npm run build && npx tsc --noEmit
cd ~/www/pixel-diff && node d4-integrations-ui.mjs                 # tất cả kịch bản
cd ~/www/pixel-diff && node d4-integrations-ui.mjs webhook-edit    # một kịch bản
cd ~/www/pixel-diff && node audit-buttons.mjs http://localhost:3000 /settings/integrations
cd ~/www/pixel-diff && node audit-buttons.mjs http://localhost:8000 /settings/integrations
cd ~/www/pixel-diff && node audit-buttons.mjs http://localhost:8000 /settings/integrations/webhook
cd ~/www/pixel-diff && node audit-buttons.mjs http://localhost:8000 /settings/agent-bots
cd ~/www/pixel-diff && node d4-bots-e2e.mjs                        # e2e agent bots (tự dọn dữ liệu)
cd ~/www/pixel-diff && node d4-campaign-dialog-smoke.mjs           # smoke hộp thoại campaign
```

Seed của script pixel tự tạo và tự xoá (webhook + agent bot) ở cả hai bên.

---

## Sửa lỗi QA 06/09 (đợt 2) — agent `d4-fix2`

QA bắt: tin của agent bot (`message_type` outgoing, `sender.type = agent_bot`) hiển thị
**bên trái** như tin khách. Rà tiếp màn hội thoại thì thấy thiếu luôn cả banner bot handoff.

### Trace Vue ↔ TSX

| Chatwoot | Yona | Sửa gì |
|---|---|---|
| `components-next/message/Message.vue` `variant` (dòng 186-191) | `components-next/message/Message.tsx` | `isBot` = `sender.type === agent_bot \|\| senderType === agent_bot \|\| (!sender && !additionalAttributes.senderName)`; trước đó bản port rút gọn còn `!sender` |
| `Message.vue` `isBotOrAgentMessage` (dòng 222-228) | như trên | thêm nhánh `[AGENT_BOT, CAPTAIN_ASSISTANT].includes(senderType)` → hướng PHẢI |
| `Message.vue` `avatarInfo` (dòng 493-513) | như trên | bot/captain lấy `avatar_url` (bot không có avatar riêng thì backend trả avatar inbox), sender khác lấy `thumbnail`; không có sender thì dùng `additional_attributes.senderName/senderAvatarUrl` trước khi rơi về `CONVERSATION.BOT` |
| `widgets/conversation/ReplyBoxBanner.vue` | `conversation/conversationbox/ReplyBoxBanner.tsx` | port nhánh `showBotHandoffBanner` (pending + `meta.assignee_type === 'AgentBot'`) → banner "This conversation is currently handled by …" + nút **Take over** (mở hội thoại rồi tự nhận việc) |
| `widgets/conversation/ReplyBox.vue` `isBotOwnedPendingConversation` / `canSendPublicReply` (dòng 199-222) | `conversation/conversationbox/ReplyBox.tsx` | bot giữ hội thoại pending → `isPrivate` ép true và `isReplyRestricted` truyền xuống `ReplyTopPanel` (trước đây hardcode `false`) → `EditorModeToggle` khoá ở Private Note đúng như oracle |
| — | `conversation/constants.ts` | thêm hằng `AGENT_BOT_ASSIGNEE_TYPE` |
| — | `conversation/types.ts` | `MessageSender.type` nhận thêm `agent_bot`/`captain_assistant`; `ConversationMessage.additional_attributes` |

Backend đi kèm (xem `d4-notes-be.md`): `meta.assignee` + `meta.assignee_type: 'AgentBot'`
trong `ConversationResource` — không có nó thì banner và khoá Private Note không bao giờ bật.

### Spec ↔ vitest

Chatwoot không có spec JS cho `Message.vue`. Thêm mới
`resources/js/dashboard/components-next/message/Message.test.tsx` — **5 test**: tin bot
outgoing sang phải, dùng bong bóng variant `bot` (`bg-n-solid-iris`) chứ không phải `agent`
(`bg-n-solid-blue`), avatar lấy từ `avatar_url`, tin agent thật vẫn phải + bong bóng agent,
tin khách vẫn trái.

### Bẫy đã trả giá

- **Thanh Reply/Private Note không đổi theo `isPrivate`** mà theo prop `isReplyRestricted`
  truyền vào `EditorModeToggle` (`isPrivate = isReplyRestricted || mode === NOTE`). Sửa mỗi
  `isPrivate` trong `ReplyBox` thì ô soạn đúng màu amber nhưng pill vẫn nằm ở "Reply" —
  pixel-diff bắt ngay. Bản gốc truyền `:is-reply-restricted="!canSendPublicReply"`.
- **Fixture drift làm hỏng phép đo, không phải code.** Trước khi kết luận, chạy
  `~/www/pixel-diff/reset-fixture.sh`: hội thoại nền (yona display 4 / oracle 1) đang bị gán cho
  John ở yona nhưng bỏ trống ở oracle → tab Mine/Unassigned và cả danh sách trái lệch hẳn
  (0.374% → 0.047% sau khi reset).
- **`yona_rw` có thêm inbox 25 `Yona` (Channel::WebWidget) mà oracle không có.** Hai hệ quả:
  cột điều hướng trái lệch một dòng ở nhóm Channels, và header hội thoại hiện thêm chip inbox
  (`hasMultipleInboxes = inboxes.length > 1` trong `ConversationHeader.vue` — port đúng, chỉ là
  dữ liệu khác). Script pixel cắt bỏ cột trái (`clip` từ x=200) và dùng route theo inbox
  (`/inbox/{id}/conversations/{displayId}`) để danh sách trái không dính hội thoại của inbox 25.
  **Việc cho phiên chính:** dọn inbox 25 hoặc seed inbox tương ứng sang oracle thì mới so được
  nguyên màn.
- Số hiệu hội thoại (`#37` vs `#68`) khác nhau vì bộ đếm `display_id` hai bên đã lệch từ lâu —
  phần nhiễu còn lại của phép đo nằm ở đây.

### Kết quả gate

- `npx tsc --noEmit`: sạch. `npm run build`: xanh. `npx vitest run`: **65 file / 478 test xanh**.
- Pixel-diff `~/www/pixel-diff/d4-bot-conv-diff.mjs` (ngưỡng 0.1%): dựng bot + liên kết inbox +
  liên hệ + hội thoại + tin khách incoming + tin bot outgoing (token bot) **y hệt hai bên**, chụp
  màn hội thoại rồi tự dọn sạch:

| Kịch bản | light | dark |
|---|---|---|
| `bot-conv` | **0.047%** | **0.064%** |

- E2E `~/www/pixel-diff/d4-bot-handoff-e2e.mjs` trên Yona — **8/8 bước đạt**, fixture tự xoá:
  hội thoại mới ở pending → banner đúng tên bot → ô soạn khoá Private Note → tin bot bên phải →
  bấm **Take over** → hội thoại `open` + `assignee_type = User` (John) → banner biến mất →
  ô soạn trả về Reply.

### Lệnh chạy lại

```bash
cd ~/www/yona && npm run build && npx tsc --noEmit && npx vitest run
cd ~/www/pixel-diff && ./reset-fixture.sh          # BẮT BUỘC trước khi đo
cd ~/www/pixel-diff && node d4-bot-conv-diff.mjs   # pixel màn hội thoại có bot
cd ~/www/pixel-diff && node d4-bot-handoff-e2e.mjs # e2e nút Take over
```
