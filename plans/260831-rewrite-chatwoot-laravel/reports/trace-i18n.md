# Trace — Cơ chế i18n một nguồn (`lang/` → `i18n:generate`)

Nguồn: Chatwoot v4.17.1 `app/javascript/dashboard/i18n/locale/en/*.json` (đọc theo tag). Ngày: 02/09/2026. Lệnh founder: "dùng resources/lang và lệnh artisan `i18n:generate` để đa ngữ backend + frontend đồng nhất".

## Quyết định

| Câu hỏi | Chốt | Lý do |
|---|---|---|
| Thư mục | `lang/` ở gốc (chuẩn Laravel 11+, `$app->langPath()`), KHÔNG tạo `resources/lang` | "resources/lang" theo ý founder = thư mục lang của Laravel; bản Laravel này đặt ở gốc |
| Chia file | Mỗi top-level key Chatwoot = 1 file `lang/en/<key_lower>.php` (66 namespace từ 17 JSON + 3 khối inline cũ) | Namespace FE `CONVERSATION.X` ≡ backend `conversation.X` — chỉ khác hoa/thường ở đoạn đầu, không cần bảng map |
| Tên key | Giữ NGUYÊN Chatwoot (UPPER_SNAKE, kể cả key con chữ thường như `OPERATOR_LABELS.equal_to`) | 106 file call-site `t()` không đổi; trace/pixel-diff không phải map lại |
| Placeholder | Giữ `{name}` (vue-i18n); `App\Translation\Translator::makeReplacements` thêm nhánh `{key}` sau nhánh `:key` của Laravel | Thử `:name` trước: 2 key thật bị mất biên (`{size}MB` → `:sizeMB`, `{seconds}s` → `:secondss`) — lệnh generate không thể tách ngược. `auth.php` với `:email`/`:seconds` vẫn chạy |
| Escape `{'@'}` | Bake thành `@` khi migrate (3 chỗ); helper `t()` bỏ bước unescape | `@` không đặc biệt với `t()` của mình |
| Plural `a \| b` | Giữ nguyên trong PHP; `t()` chọn nhánh theo `n` như cũ (3 call-site: AGENT_MGMT/TEAMS_SETTINGS/INBOX_MGMT `.COUNT`) | Laravel `trans_choice` cũng dùng `\|` — không xung đột |
| Bundle | `resources/js/i18n/generated/{locale}.ts` + `index.ts` (`locales`, `defaultLocale`), header "KHÔNG SỬA TAY", `.gitattributes` linguist-generated, **commit kèm** | tsc/vitest/CI không cần PHP để build; `--check` bắt lệch |
| Gate | `make build` = `i18n:generate` → tsc → vite; `make check` thêm `i18n-check`; `composer setup` generate trước `npm run build` | 1 lệnh, không phụ thuộc pre/post script của pnpm |
| Đa locale | Locale ≠ `app.fallback_locale` thiếu key → lệnh **fail** liệt kê `lang/vi thiếu key: LOGIN.SUBMIT`; key lạ → warn | Tiếng Việt nhóm G thêm `lang/vi/` là xong |
| Top-level scalar | `CONFIRM_EMAIL: "Verifying..."` (settings.json) BỎ — file lang phải return array; grep 0 nơi dùng cả Chatwoot dashboard lẫn Yona | ghi để không tìm lại |

## Chatwoot ↔ Yona

| Nguồn Chatwoot | Đích Yona | Ghi chú |
|---|---|---|
| `dashboard/i18n/locale/en/{login,signup,onboarding,setNewPassword,resetPassword,settings,components,teamsSettings,emojiIconPicker,agentMgmt,inboxMgmt,contact,conversation,chatlist,advancedFilters}.json` | `lang/en/*.php` (66 file; header từng file ghi JSON gốc) | Chuyển bằng script một lần (`migrate-json-to-lang.php`, scratchpad, không commit): JSON → mảng PHP, chỉ đổi `{'x'}` → `x`. `advancedFilters.json` = nguyên văn tag; `integrations.json` = subset `INTEGRATION_SETTINGS.OPEN_AI.REPLY_OPTIONS` (CopilotMenuBar B3) |
| `dashboard/i18n/index.js` (gộp JSON thành `messages.en`) | `app/Console/Commands/GenerateI18nBundles.php` → `resources/js/i18n/generated/en.ts` | Thay bước gộp lúc build của Vue bằng bước sinh file; namespace = `strtoupper(tên file)` |
| `vue-i18n $t(key, params)` | `resources/js/i18n/index.ts` `t(key, params)` | Chữ ký, đường import, nội suy `{name}`, plural giữ như trước; chỉ đổi nguồn `messages` sang `./generated` |
| `config/locales/*.yml` (Rails `I18n.t` backend) | cùng `lang/` + `__()`; `App\Translation\Translator` (qua `App\Providers\TranslationServiceProvider`, deferrable, ghi đè singleton `translator`) | Chatwoot backend/frontend là 2 kho chuỗi tách rời; Yona gộp về 1 theo lệnh founder |

## Chứng minh không đổi chữ

- So key phẳng JSON cũ (17 file + 3 khối inline, trừ `CONFIRM_EMAIL`) với bundle sinh ra (trừ `AUTH` từ `auth.php`): **2950 = 2950 key, 0 khác** (script node trong phiên; đã tính bước unescape `{'@'}` mà `t()` cũ làm lúc chạy).
- `php artisan i18n:generate --check` xanh trên bundle đã commit.
- Pest toàn suite **395/395** (5 test mới `tests/Feature/Console/GenerateI18nBundlesTest.php`: cấu trúc bundle, locale thiếu key fail rõ, file không return array fail, `--check` báo lệch, `__()` + bundle đọc cùng chuỗi `{name}`/`:name`).
- `npm run build` (vite) + `vitest` + `npx tsc` xanh (tsc chấm lại sau khi phiên B3 commit `aa12004`; giữa chừng đỏ 3 chỗ trong file B3 đang sửa dở, không liên quan i18n).
- 20 key phiên B3 khai báo đang gọi (COMBOBOX.*, DROPDOWN_MENU.SEARCHING, CONVERSATION.FILE_SIZE_LIMIT/FOOTER.*/PRIORITY.OPTIONS.*, CHAT_LIST.CHAT_STATUS_FILTER_ITEMS.*.TEXT, FILTER.*, INTEGRATION_SETTINGS.OPEN_AI.REPLY_OPTIONS.*) tra thấy đủ trong bundle.

## Bẫy đã gặp

- **`:name` không đảo ngược được** khi placeholder dính chữ (`{size}MB`). Đừng "Laravel hóa" placeholder — giữ `{name}` và dạy Translator.
- Ghi đè `translator` phải bằng provider **deferrable** kê sau trong `bootstrap/providers.php`: provider eager `singleton('translator')` sẽ bị core deferred provider ghi đè lại khi resolve lần đầu.
- Test dùng `app()->useLangPath()` + `app('translator')->setLoaded([])` để translator không dính cache đường lang cũ.
