# chat-composer-polish — ô soạn tin gọn, mũ khung chat một dòng, ba mức bố cục (08/09/2026)

Nhánh `main`, cổng dev **8610**, tài khoản `dev.robertnguyen@gmail.com` (user 3 / account 3), hội thoại 2.
Ảnh + số đo: `~/www/pixel-diff/ux-composer/` (`probe.mjs`, `before-results.json`, `after-results.json`).
Không commit. Không đụng file của agent `zalo-link-card-fix`.

## Đọc gốc trước khi sửa

`refs/chatwoot/app/javascript/dashboard/components/widgets/conversation/{ReplyBox,ResizableEditorWrapper,ConversationHeader,ConversationSidebar,MessageSignatureMissingAlert}.vue`,
`components-next/Conversation/SidepanelSwitch.vue`, `constants/globals.js`. Không mở `enterprise/`.

**Cơ chế kéo cao ô soạn: bản gốc ĐÃ CÓ.** `ResizableEditorWrapper.vue` có thanh grip ở mép trên ô
soạn, kéo/dblclick-reset, `EXPAND_RATIO` cho nút ⤢, và một kênh `provide('requestEditorHeight')` để
nội dung *xin* cao thêm — nhưng **chỉ CopilotEditor (EE) dùng kênh đó**, ReplyBox thường thì không.
Nên trong bản gốc ô soạn luôn cao đúng `DEFAULT_HEIGHT = 120px`, sàn `MIN_HEIGHT = 80px`, không tự
giãn theo chữ và **không nhớ** chiều cao đã kéo. `isOnExpandedLayout` / `replyBoxHeight` không phải là
biến của ô soạn: `isOnExpandedLayout` là nút ⇥ đổi bố cục danh sách (đã port), còn `replyBoxHeight`
không tồn tại trong v4.17.1.

Việc đã làm vì thế là **mở rộng đúng cơ chế đã có**: thay `provide/inject` bằng phép ĐO nội dung thật
ngay trong wrapper (mọi editor cắm vào đều tự giãn, không phải tự khai báo), hạ mặc định xuống một
dòng, và ghi chiều cao đã kéo vào `ui_settings` — cùng chỗ `sidebar_width` và
`is_contact_sidebar_open` đang nằm.

## Số đo trước/sau (Playwright, chạm/bấm thật, KHÔNG `force`)

| Cỡ màn | Số đo | Trước | Sau |
|---|---|---|---|
| 390×844 | ô soạn (`.resizable-editor-body`) / cả khối soạn | 120 / **237px** | **32 / 149px** |
| 390×844 | mũ khung chat (mép trên vùng tin − mép trên khung) | **136px** (3 dòng) | **72px** (mũ 32 + hàng tab 40) |
| 390×844 | nút "Liên hệ" | nổi ở `y=151` — **đè lên bong bóng tin** | trong mũ, `y=0` — không đè |
| 390×844 | tự giãn: rỗng → 6 dòng → xoá hết | 120 → 120 → 120 (không giãn) | **32 → 200 → 32** |
| 390×844 | kéo cao → tải lại trang | 120 → kéo 248 → **tải lại 120 (quên)** | 32 → kéo 160 → **tải lại 160 (nhớ)** |
| 820×1180 | bề rộng danh sách / khung chat khi đã mở hội thoại | 340 / **1px** (ba cột chen nhau) | **0 (ẩn) / 548px** |
| 820×1180 | nút "Trở về" · panel lớp phủ | không có · panel là cột tĩnh chiếm 320px | chạm mở/đóng OK · panel thành lớp phủ, chạm nền mờ đóng được |
| 1440×900 | mũ khung chat, cụm nút nổi, panel phải cột tĩnh | — | **không đổi** (nhánh ≥1280 giữ nguyên gốc) |
| mọi cỡ | `documentElement.scrollWidth` vs `innerWidth` | bằng nhau | bằng nhau (không scroll ngang) |

Cả 6 lượt (3 cỡ màn × sáng/tối) đều: mở hội thoại bằng **chạm/bấm thật** OK, 0 lỗi console mới
(chỉ còn 1 lỗi `409` của poll Zalo, ngoài phạm vi). Ảnh `before-*` ↔ `after-*` cho `mobile-390x844`, `tablet-820x1180`, `desktop-1440x900`, mỗi cái
`light` + `dark`, các bước `01-list` · `02-thread` · `03-back` · `04-panel` · `05-grow` · `06-drag`.

## Đã làm

| File | Việc |
|---|---|
| `dashboard/constants/globals.ts` | **Nguồn duy nhất** hai ngưỡng: `SMALL_SCREEN_BREAKPOINT` 768→**1024**, `LARGE_SCREEN_BREAKPOINT` 1024→**1280** (trùng `lg`/`xl` của Tailwind) |
| `dashboard/conversation/constants.ts` | Xoá `LARGE_SCREEN_BREAKPOINT` trùng lặp (không nơi nào dùng) — hết hai nguồn cho một con số |
| `composables/useViewportWidth.ts` | Thêm `isLargeScreen` / `useIsLargeScreen` cạnh `isSmallScreen` |
| `conversation/composerHeight.ts` (mới) | Logic THUẦN của chiều cao ô soạn: `composerSizeBounds`, `resolveComposerHeight`, `readStoredComposerHeight`, hằng số sàn/trần và khoá `ui_settings.reply_box_height` |
| `conversationbox/ResizableEditorWrapper.tsx` | Đo nội dung thật bằng `MutationObserver` + `ResizeObserver` (không dùng `scrollHeight` — ô soạn bị ghim chiều cao nên `scrollHeight` không bao giờ nhỏ hơn chiều cao đang áp ⇒ xoá chữ mà không co lại được); kéo xong ghi `ui_settings`; ⤢ và dblclick đi cùng một hàm ghim/bỏ ghim |
| `conversation/contactPanelVisibility.ts` | `isContactPanelOverlay` / `useIsContactPanelOverlay` — câu trả lời duy nhất cho "panel phải đang là lớp phủ hay cột tĩnh"; ngưỡng đọc thẳng `LARGE_SCREEN_BREAKPOINT` |
| `conversationbox/ConversationSidebar.tsx` | Cột tĩnh đổi từ `md:` sang `xl:` cho khớp JS; **nền mờ z-30 → z-40, panel z-40 → z-50** |
| `conversationbox/ConversationHeader.tsx` | Nhánh gọn dưới 1280px: một dòng (Trở về · avatar · tên · icon kênh · chuông tạm ẩn · nút Liên hệ · Giải quyết · ⋯); `data-testid="conversation-header"`. Nhánh ≥1280 giữ nguyên từng lớp CSS cũ |
| `conversationbox/SidepanelSwitch.tsx` | Thêm `variant` `floating`/`inline` — cùng một component, chỉ khác lớp bao, nên logic bật/tắt panel vẫn một chỗ |
| `conversationbox/ConversationBox.tsx` | Cụm nổi chỉ dựng từ 1280px trở lên |
| `conversationbox/{MoreActions,ResolveAction}.tsx` | `isCompact`: nút Giải quyết/Mở lại thành icon + `title`; menu neo `end-0` để không tràn mép phải màn hẹp |
| `conversationbox/MessageSignatureMissingAlert.tsx` | Thu về một dòng, cả dòng là nút mở cài đặt hồ sơ |
| `scss/_editor.scss` | Fallback `clamp()` theo sàn/trần mới |
| `lang/{en,vi}/conversation.php` | `FOOTER.RESIZE_COMPOSER`, `FOOTER.MESSAGE_SIGNATURE_NOT_CONFIGURED_SHORT`; sửa lỗi chính tả "Chứ ký" → "Chữ ký" |

### Bug tìm được khi đo (đã sửa)

1. **820×1180 khung chat còn 1px.** Ngưỡng cũ 768 nên tablet dọc vẫn dựng đủ ba cột: thanh điều
   hướng 272 + danh sách 340 + panel phải 320 = 932 > 820. Ảnh `before-tablet-820x1180-light-02-thread.png`
   cho thấy khung chat biến mất hoàn toàn. Sửa bằng ngưỡng mới.
2. **Nền mờ của panel lớp phủ chui xuống dưới thanh điều hướng trái.** Nền mờ `z-30`, `Sidebar.tsx`
   `z-40`: ở 820px thanh điều hướng là cột tĩnh nên dải 0–272px **không mờ** và chạm vào đó không đóng
   được panel (Playwright: `locator.tap: Timeout` ở bước đóng — bằng chứng ở lượt đo trước khi sửa,
   ảnh `after-tablet-820x1180-light-04-panel.png` của lượt đó). Sửa: nền mờ `z-40`, panel `z-50`.
3. **Menu của nút Giải quyết tràn ra ngoài khung nhìn ở màn hẹp.** Gốc neo `start-0` (chỉ đổi sang
   `end-0` từ `xl`); ở chế độ gọn nút nằm sát mép phải nên menu rộng ≥156px tràn khỏi màn 390px. Chế
   độ gọn neo `end-0`.

## Gate

| Gate | Kết quả |
|---|---|
| `npx vitest run` | **110 file / 868 test xanh** (mới: `composerHeight.test.ts` 14 test; `layoutMode.test.ts` +3 test ba mức bố cục) |
| `npx tsc --noEmit` | sạch |
| `flock /tmp/yona-build.lock npm run build` | xanh |
| `php artisan i18n:generate --check` | `INFO Bundle i18n khớp lang/.` |
| `vendor/bin/pint --test lang/{vi,en}/conversation.php` | passed |

## Harness pixel cần chụp lại

**Mọi kịch bản có mở một hội thoại** trong `~/www/pixel-diff/*.mjs` (viewport 1280×800 / 1280×900):
khối soạn thấp đi ~88px nên vùng tin nhắn cao thêm chừng đó. Không mask — chiều cao mới là hành vi
đúng. Mũ khung chat, cụm nút nổi và panel phải ở 1280px **không đổi** (ranh giới đặt đúng 1280).
Dải 1024–1279 và dưới 1024 chưa harness nào chạy.

Đã ghi 5 dòng lệch vào `reports/ux-deviations.md`, mục "Ô soạn tin gọn, mũ khung chat một dòng, ba
mức bố cục".

## Ngoài phạm vi / chưa làm được

| # | Việc | Vì sao | Đề xuất |
|---|---|---|---|
| A | "Tab chỉ hiện khi **inbox** thực sự có dashboard app" | Bảng `dashboard_apps` chỉ có `id, title, content, account_id, user_id` — **không có ràng buộc theo inbox**, đúng như Chatwoot gốc (app là của cả account). Không lọc theo inbox được nếu không đổi lược đồ | Thêm bảng nối `dashboard_app_inboxes` + ô chọn hộp thư trong màn cài đặt Dashboard App, rồi `useDashboardApps` lọc theo `inbox_id` của hội thoại đang mở. Là việc backend + settings, đụng public contract ⇒ cần founder duyệt phạm vi. Hiện tại mũ đã còn 2 dòng (32 + 40) nên vẫn đạt yêu cầu "1–2 dòng" |
| B | Thanh điều hướng trái vẫn là cột tĩnh từ 768px | Ngưỡng off-canvas của thanh điều hướng nằm ở `Sidebar.tsx`/`MobileSidebarLauncher.tsx` (`md:`), dùng chung cho **mọi** màn dashboard (cài đặt, báo cáo…), không riêng màn chat | Ở 820px cột này chiếm 272/820 nhưng khung chat vẫn còn 548px và có thanh điều hướng thấy được là điểm cộng cho tablet ⇒ để nguyên. Nếu founder muốn đồng bộ hẳn theo `lg`, đó là một lượt sửa riêng cho cả dashboard |
| C | Lỗi console `409 (Conflict)` mỗi lần tải dashboard account 3 | Poll trạng thái Zalo — đã ghi ở finding C của `chat-polish-2-notes.md` và finding C của `chat-mobile-layout-notes.md` | Trả 200 + payload thay vì 409 |
| D | Nút icon ở chế độ gọn cao ~32px, dưới ngưỡng chạm 44px của `ux-brief.md` | Dùng đúng cỡ `sm` của hệ nút hiện có (`Button.tsx`), giống mọi nút trong mũ khung chat của gốc | Nâng cỡ chạm là việc của hệ nút (một biến thể `touch` cho `Button.tsx`), nên làm một lượt cho cả app thay vì lệch riêng màn này |

## Dọn dẹp

Chỉ mở hội thoại 2 và bật/tắt UI; không tạo/xoá dữ liệu account 3. `ui_settings.reply_box_height`
sinh ra trong lúc đo đã được xoá lại sau lượt cuối. Phiên Playwright headless dọn trước mỗi lượt.
Không đụng oracle.

```
Status: DONE
Summary: Ô soạn tin mặc định còn một dòng (32px thay vì 120px), tự giãn theo nội dung tới 200px, kéo cao được và nhớ chiều cao trong ui_settings qua các lần tải trang; mũ khung chat dưới 1280px gom về một dòng và nuốt cụm nút nổi vốn đè lên tin; ba mức bố cục 1024/1280 đưa tablet dọc 820px từ khung chat 1px lên 548px. Từ 1280px trở lên mọi thứ giữ nguyên bản gốc.
Concerns/Blockers: Chiều cao ô soạn đổi ⇒ MỌI ảnh baseline pixel có mở hội thoại phải chụp lại. "Tab chỉ hiện khi inbox có dashboard app" không làm được vì dashboard_apps không có ràng buộc theo inbox (như gốc) — cần founder duyệt việc đổi lược đồ.
```
