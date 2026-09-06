# f6-slack-fe — Settings › Integrations › Slack (Vue → React/TSX)

## Bảng trace Vue ↔ TSX

| Vue (oracle) | TSX (port) |
|---|---|
| `settings/integrations/Slack.vue` | `resources/js/dashboard/settings/integrations/Slack.tsx` |
| `settings/integrations/Integration.vue` | `resources/js/dashboard/settings/integrations/Integration.tsx` |
| `settings/integrations/Slack/SelectChannelWarning.vue` | `resources/js/dashboard/settings/integrations/Slack/SelectChannelWarning.tsx` |
| `settings/integrations/Slack/SlackIntegrationHelpText.vue` | `resources/js/dashboard/settings/integrations/Slack/SlackIntegrationHelpText.tsx` |
| `store/modules/integrations.js` (`get`) | `composables/useIntegrationApps.ts` (đã có sẵn, không sửa) |
| `store/modules/integrations.js` (`connectSlack`) | `postJson('/api/v1/accounts/{id}/integrations/slack', {code})` trong `Slack.tsx` |
| `store/modules/integrations.js` (`updateSlack`/`listAllSlackChannels`) | `putJson`/`getJson` trong `SelectChannelWarning.tsx` |
| `store/modules/integrations.js` (`deleteIntegration`) | `deleteJson('/api/v1/accounts/{id}/integrations/{integrationId}')` trong `Integration.tsx` — với `integrationId='slack'` khớp đúng contract `DELETE /integrations/slack` |
| `IntegrationHelpText.vue` | KHÔNG port — Slack.vue/SlackIntegrationHelpText.vue không import file này (chỉ khai trong nhiệm vụ như một khả năng, thực tế không dùng tới) |

Không có spec Vue cho các file này (`specs/` chỉ có `hookMixin.spec.js`, không liên quan trực tiếp Slack) → không viết vitest mới, không vi phạm "chỉ port test có bản gốc tương ứng".

## Khác biệt cố ý

1. **Router-link no-op trên nút Disconnect** (`Integration.vue` bọc toàn bộ khối action trong `<router-link :to>` cùng route hiện tại). Bản gốc: click vào nút Disconnect vừa mở dialog xoá vừa kích hoạt router-link (nhưng cùng route nên Vue Router coi như no-op, không có gì xảy ra). Với Inertia `<Link>`, cùng hành vi sẽ tạo ra một Inertia visit thật (fetch lại trang), có nguy cơ đóng dialog vừa mở. Đã giữ đúng cấu trúc DOM (`<Link href=...>` bọc `Button`) để không lệch layout/pixel, nhưng gọi `event.preventDefault()` ngay trong `onClick` của nút để chặn điều hướng — dialog xoá mở ổn định, không reload trang.
2. **Lỗi khi đổi mã OAuth (`connectSlack`) thất bại**: bản gốc KHÔNG bọc try/catch quanh `await store.dispatch('integrations/connectSlack', ...)` trong `Slack.vue` — nếu lỗi, promise trong `onMounted` bị reject không bắt, `integrationLoaded` không bao giờ được set `true` → trang bị kẹt loading vĩnh viễn (không có thông báo lỗi cho user), và query `?code=` không được xoá khỏi URL. Bản port bắt lỗi, hiện toast (dùng key `INTEGRATION_SETTINGS.SLACK.UPDATE_ERROR` vì không có key riêng cho lỗi connect — xem mục "Khoá i18n còn thiếu"), và luôn dọn xong loading + xoá query `code`. Chọn cách này vì infinite-loading không phải hành vi cần tái tạo, còn phần UI tĩnh (loading spinner) không đổi khi thành công.
3. **`integrationLoaded` riêng của bản gốc → dùng thẳng `isFetching` của `useIntegrationApps`**: `useIntegrationApps` đã tự fetch khi mount (side-effect trong chính composable), nên không cần gọi lại `store.dispatch('integrations/get', 'slack')` ở page — theo đúng khuôn đã dùng ở `Index.tsx`/`ShowIntegration.tsx` (không tạo thêm state trùng lặp, DRY).
4. **Markdown trong `HELP_TEXT.BODY` / `SELECT_CHANNEL.DESCRIPTION`**: repo ĐÃ có `shared/helpers/MessageFormatter.ts` (markdown-it, dùng khắp nơi qua `new MessageFormatter(text, false).formattedMessage` + `DOMPurify.sanitize` + `dangerouslySetInnerHTML`) — đây chính là "helper markdown đã có sẵn" nên dùng thẳng thay vì tự dựng JSX `<strong>/<em>`, khớp 100% cách các màn khác trong repo đang render markdown (ví dụ `CampaignCard.tsx`, `ArticleDiffPanel.tsx`).

## Bẫy đã trả giá / lưu ý khi kiểm tra lại

- KHÔNG dùng `router.push`/named-route như Vue — dùng `accountScopedUrl(accountId, path)` (`dashboard/helper/URLHelper.ts`, đã có sẵn) để giữ đúng quy ước các file `.tsx` khác cùng thư mục.
- `<select>` trong `SelectChannelWarning.tsx` là **native** `<select>` (giống bản gốc), KHÔNG phải Radix `Select` — không dính bẫy `SelectItem value=""` (native option value="" hợp lệ).
- `Dialog` là chủ sở hữu `<form>` duy nhất — `Integration.tsx` không render `<form>` nào bên trong, chỉ dùng prop `onConfirm`/`isLoading` của `Dialog`.
- `deleteConfirmationText.title`/`.message` fallback về `INTEGRATION_SETTINGS.WEBHOOK.DELETE.CONFIRM.*` đúng như bản gốc (Slack.tsx luôn truyền title/message riêng nên nhánh fallback trên thực tế không kích hoạt ở màn này, nhưng giữ để `Integration.tsx` dùng lại được cho tích hợp khác).

## Khoá i18n còn thiếu

Không thiếu khoá nào cho luồng chính. Chỉ ghi chú: không có khoá riêng cho lỗi POST `/integrations/slack` (đổi code thất bại) — đang tái dùng `INTEGRATION_SETTINGS.SLACK.UPDATE_ERROR` làm fallback (xem "Khác biệt cố ý" #2). Không tự thêm khoá mới vào `lang/en/integration_settings.php`.

## Kết quả gate

- `npx tsc --noEmit`: sạch cho 4 file port (`Slack.tsx`, `Integration.tsx`, `SelectChannelWarning.tsx`, `SlackIntegrationHelpText.tsx`). Lỗi còn lại trong toàn repo (`resources/js/superadmin/resource/Form.tsx:31`) không liên quan, không thuộc phạm vi f6.
- `npx vitest run`: không có file test — không có spec Vue tương ứng để port (đã kiểm `specs/` thư mục nguồn).

Status: DONE
Summary: Port xong 4 màn Settings > Integrations > Slack (page + card tích hợp + cảnh báo chọn channel + help text) sang React/TSX, gọi thẳng API theo đúng contract POST/PUT/DELETE/GET `/integrations/slack*`, tsc sạch cho các file thuộc phạm vi.
Concerns/Blockers: Không có blocker. Một khác biệt cố ý đáng chú ý: nút Disconnect chặn Inertia navigate bằng preventDefault thay vì để router-link no-op như Vue (xem mục 1 "Khác biệt cố ý") — nên kiểm bằng mắt ở gate pixel-diff/e2e xem dialog xoá có mở/đóng mượt như oracle không.
