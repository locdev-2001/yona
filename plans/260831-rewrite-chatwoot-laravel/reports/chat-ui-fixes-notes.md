# Sửa UX chat — lô `chat-ui-fixes` (07/09/2026)

Nối tiếp agent `chat-ui-fixes-3` bị cắt giữa chừng. Nguồn việc: `ux-chat-notes.md` (audit phiên chính).
Môi trường theo `qa-account3-brief.md` (account 3 `dev.robertnguyen@gmail.com`, SSO, Playwright chỉ đọc,
không gửi tin). Lệch có chủ đích đã ghi vào `ux-deviations.md` (6 dòng mới).
Ảnh: `~/www/pixel-diff/ux-fixes-3/` (`before-*.png` do agent trước chụp trước khi sửa, `sau-*.png` của lô này).
**Chưa commit.**

## Bảng mục · trạng thái · file · test

| # | Việc | Trạng thái | File | Test / bằng chứng |
|---|---|---|---|---|
| 2 | Bảng `/` không cướp focus, Escape đóng, xoá `/` đóng, Enter chọn, neo trên ô soạn | **Xong** (agent trước làm phần bảng; lô này sửa nốt lỗi Escape làm mất con trỏ) | `WootWriter/{CaretAnchoredPicker,PreviewPicker,Editor}.tsx`, `conversation/CannedResponse.tsx`, `WootWriter/TagAgents.tsx`, `conversationbox/ReplyBox.tsx` | `CaretAnchoredPicker.test.tsx` 14 test; `ux-fixes-3/probe3.mjs` — sau Escape `activeElement = ProseMirror` (trước là `BODY`) và Backspace xoá được `/` |
| 4 | Ctrl+K + gợi ý phím theo hệ điều hành | **Xong** | `shared/helpers/kbd.ts` (+ test), `conversationbox/EmptyState.tsx`, `ReplyBox.tsx`, `NewConversation/ComposeConversation.tsx`, `portal/PublicArticleSearch.tsx` | `kbd.test.ts` 4 test; `ux-fixes-3/probe.mjs` — `ninjaOpen = "open"` sau khi bấm Ctrl+K; `sau-02-ctrl-k.png`, `sau-08-*.png` (hai dòng `CTRL K` / `CTRL /`) |
| 12 | Nhãn kênh Zalo trong Cài đặt → Hộp thư | **Xong** | `dashboard/helper/inbox.ts`, `settings/inboxes/{Index.tsx,components/ChannelName.tsx}`, `lang/{en,vi}/inbox_mgmt.php` | `probe.mjs` — `inboxLabels = ["Zalo"]` (trước là "Kênh API"); `sau-06-cai-dat-hop-thu.png` |
| 5 | Nhãn tab ngắn, hết mũi tên cuộn | **Xong** | `lang/vi/chat_list.php` | `probe.mjs` — `arrows = 0`, `scrollable = false`; `sau-01-inbox-mac-dinh.png` |
| 1 | Tab mặc định "Tất cả" + nhớ tab trong `ui_settings` + empty state theo ngữ cảnh | **Xong** (lô này) | `conversation/constants.ts`, `conversation/ConversationContext.tsx`, `chatlist/{ConversationBasicFilter,ChatList}.tsx`, `chatlist/emptyListHint.ts` (mới), `conversationbox/EmptyState.tsx`, `lang/{en,vi}/chat_list.php` | `emptyListHint.test.ts` 5 test; `shot.mjs` — mặc định `active = 2` ("Tất cả"), tab "Của tôi" rỗng cho `emptyText = "Chưa có hội thoại nào được gán cho bạn."` + nút "Xem 3 hội thoại chưa gán"; `sau-08-tab-cua-toi-empty-state.png` |
| 3 / 13 | Empty state câu trả lời mẫu | **Xong** | `conversation/CannedResponse.tsx` (bảng `/` dẫn tới trang tạo), `lang/vi/canned_mgmt.php` | `probe2.mjs` — `emptyText = "Chưa có câu trả lời mẫu nào trong tài khoản này.Thêm câu trả lời mẫu"`; `sau-05-bang-cau-tra-loi-mau.png` |
| 14 | Dịch menu hồ sơ (Log out, Light/Dark/System) | **Xong** (lô này) | `helper/themeHelper.ts` (`COLOR_SCHEME_OPTIONS`), `components-next/sidebar/SidebarProfileMenu.tsx`, `commands/useAppearanceHotKeys.ts`, `lang/vi/sidebar_items.php` | `probe.mjs` — `hasLogoutVi = true`, `hasLogoutEn = false`, `titles` = `["Sáng","Tối","Theo hệ thống"]`; `sau-03-menu-ho-so.png` |
| 9 | Nút "Gán cho tôi" 1 click ở panel phải | **Đã có sẵn — không phải sửa** | `conversationbox/contact/ConversationAction.tsx` (`shouldShowSelfAssign` + `CONVERSATION_SIDEBAR.SELF_ASSIGN`) | `probe2.mjs` — nút "Phân công cho tôi" ở `top = 345px` trên khung 1440×900, **thấy được không cần cuộn**, 1 click; `sau-04-hoi-thoai-panel-phai.png` |

## Nguyên nhân gốc đáng ghi (#2)

Bảng `/` sau khi sửa vẫn để ký tự `/` kẹt lại: đo bằng `probe5.mjs` cho thấy Escape làm ô soạn
mất con trỏ **kể cả khi không có bảng nào mở**. Nguồn: `composables/useKeyboardEvents.ts`
`shouldIgnoreEvent()` gọi `event.target.blur()` với mọi phần tử gõ được khi gặp Escape — đúng
parity Chatwoot (`refs/chatwoot/.../useKeyboardEvents.js:23-25`), nhưng ở ô soạn nó biến Escape
thành "rời ô soạn". Vì handler đó nằm ở tầng `document`, cách duy nhất chắc chắn là **chặn phím
ngay tại ô soạn**: `Editor.tsx` bắt Escape khi bảng gợi ý đang mở, `preventDefault + stopPropagation`
rồi tự gọi hàm đóng của bảng đang mở. Hành vi blur-on-Escape toàn cục giữ nguyên cho mọi chỗ khác.

## Ghi chú kiến trúc (DRY, một điểm sửa)

- **Nhãn kênh** và **icon kênh** giờ chung một bản đồ (`helper/inbox.ts`) — thêm kênh = thêm một dòng.
- **Nhãn giao diện sáng/tối/hệ thống** chung một nguồn `COLOR_SCHEME_OPTIONS` (`helper/themeHelper.ts`)
  cho cả command bar lẫn menu hồ sơ.
- **`ui_settings.conversations_filter_by`** chỉ còn MỘT điểm ghi (`persistConversationFilters` trong
  `ConversationContext`); `ConversationBasicFilter` không còn `putJson` riêng. Bắt buộc vì
  `WebApi/ProfilesController::update()` merge NÔNG (`array_merge` một tầng) — ghi thiếu khoá nào là
  mất khoá đó. Đây là bẫy cho mọi khoá lồng nhau trong `ui_settings` về sau.
- **Quy tắc empty state** thuần trong `chatlist/emptyListHint.ts`, dùng chung cho cột danh sách và
  khung chat — hai chỗ không thể nói khác nhau.

## Gate

| Gate | Kết quả |
|---|---|
| `npx vitest run` (toàn bộ) | 103 file · 820 test PASS (~30s) |
| `npx tsc --noEmit` | sạch |
| `vendor/bin/pint --test` | passed |
| `php artisan i18n:generate --check` | "Bundle i18n khớp lang/" (đã regenerate `en.ts`/`vi.ts`) |
| `flock /tmp/yona-build.lock npm run build` | ✓ built |
| Console trình duyệt | 0 lỗi ứng dụng. Còn: `409 POST /app/login` (giới hạn 25 phiên khi SSO lại) và `WebSocket … :8080 ERR_CONNECTION_REFUSED` — **Reverb không chạy lúc đo**, môi trường, ngoài phạm vi |

## Việc chưa làm / để lại

- **#9 gom 4 dropdown "Không có" thành 2 hàng** (nửa sau của finding #9): không làm — đổi bố cục
  panel phải là thay đổi pixel diện rộng trên màn không thuộc chat, cần founder duyệt trước.
- **#8 hành động trên tin ở thiết bị cảm ứng** (không có hover): chưa làm, còn nguyên trong `ux-chat-notes.md`.
- **#6 pill "Mở" trông không giống nút lọc** (🟢): chưa làm.
- Escape-đóng-bảng chưa có unit test riêng (logic nằm trong handler `keydown` của ProseMirror,
  không tách được thành hàm thuần mà không bịa trừu tượng); bằng chứng là đo trực tiếp trên trình duyệt
  (`probe3.mjs`) và `CaretAnchoredPicker.test.tsx` khoá phần lý do đóng (`'keyboard'` vs `'outside'`).
- **Harness pixel cần chụp lại** (chỉ ghi, không sửa — thuộc phiên giữ harness): tab mặc định "Tất cả",
  nhãn `CTRL` thay `⌘`, nhãn tab "Chưa gán". Chi tiết ở cột "Mask harness" của `ux-deviations.md`.

## Dọn dẹp

- `ui_settings` của user 3 đã được sao lưu trước khi đổi để chụp ảnh và **khôi phục nguyên trạng**
  (`conversations_filter_by = {"status":"open","order_by":"last_activity_at_desc","assignee_type":"unassigned"}`).
- Ô soạn của hội thoại 3/2 đã dọn sạch nháp (`probe3.mjs` kết thúc với ô soạn rỗng). Không gửi tin nào.
- Phiên Playwright headless của user 3 đã xoá sau mỗi lượt. Không đụng inbox 58/59 ngoài việc mở đọc.
- Không đụng file của agent lô 7 (`.github/workflows/*`, `tests/**`, `database/factories/AgentBotFactory.php`).

```text
Status: DONE_WITH_CONCERNS
Summary: 8/9 mục của audit đã xong và đo được trên trình duyệt (account 3); #9 hoá ra đã có sẵn từ bản port, chỉ nửa "gom 4 dropdown" là chưa làm vì đổi bố cục panel phải cần founder duyệt.
Concerns/Blockers: (1) Reverb :8080 không chạy lúc đo nên không kiểm được realtime — cần dựng lại trước khi nghiệm thu. (2) Ba lệch mới làm ảnh baseline pixel lệch (tab mặc định "Tất cả", nhãn CTRL, nhãn tab "Chưa gán") — phiên giữ harness phải chụp lại, đừng hạ ngưỡng diff. (3) Chưa commit theo yêu cầu.
```
