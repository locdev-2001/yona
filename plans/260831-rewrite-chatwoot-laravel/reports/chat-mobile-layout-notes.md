# chat-mobile-layout — bố cục di động cho dashboard hội thoại (08/09/2026)

Việc nhận: lỗi 🔴 #A của `chat-polish-2-notes.md` — ở 390×844 `.conversations-list-wrap` cố định
`w-[340px]` đè lên khung chat, Playwright báo "subtree intercepts pointer events", điện thoại thật
không mở nổi hội thoại.

Ảnh chứng: `~/www/pixel-diff/ux-mobile/` (script `probe.mjs`, `diff-desktop.mjs`, `debug-tap.mjs`;
kết quả đo `after-results.json`). Cổng 8610.

## Đọc gốc trước khi sửa

`refs/chatwoot/app/javascript/dashboard/routes/dashboard/conversation/ConversationView.vue` +
`components/ChatList.vue` + `components/widgets/conversation/{ConversationBox,ConversationHeader,ConversationSidebar}.vue`
+ `components-next/sidebar/{Sidebar,MobileSidebarLauncher}.vue` + `constants/globals.js`. Không mở
`enterprise/`.

**Đính chính giả định của việc giao:** Chatwoot **KHÔNG** có breakpoint hai-màn cho inbox. Không có
lớp `hidden`/`md:flex` nào trên `ChatList`/`ConversationBox`; `showConversationList` /
`showMessageView` / `showBackButton` đều đọc **một** biến `isOnExpandedLayout`, và biến đó chỉ đến từ
`ui_settings.conversation_display_type` — tức người dùng phải tự bấm nút ⇥. Ở 390px bản gốc cũng dựng
ba cột cạnh nhau, tức lỗi này Chatwoot cũng có (họ có app di động riêng). Thứ gốc **có** dùng `md:` là
cột phải (`ConversationSidebar.vue`: lớp phủ `fixed … max-w-sm` dưới `md`, cột tĩnh từ `md`) và thanh
điều hướng trái (`Sidebar.vue` off-canvas + `MobileSidebarLauncher.vue` `block md:hidden`).

Vì vậy ý đồ gốc được port bằng cách **mở rộng đúng cơ chế đã có**, không dựng nhánh layout thứ hai:
dưới `md` thì `isOnExpandedLayout` bị **ép true**. Mọi thứ ăn theo nó (danh sách `basis-full`, danh
sách ẩn khi đã chọn, nút "Trở về" trong header, bỏ viền trái khung chat) tự đúng theo — một điểm sửa.

## Đã làm

| File | Việc |
|---|---|
| `resources/js/dashboard/composables/useViewportWidth.ts` (mới) | Nguồn duy nhất đo bề rộng khung nhìn (thay `useWindowSize()` của @vueuse) + `isSmallScreen()` / `useIsSmallScreen()` |
| `resources/js/dashboard/conversation/layoutMode.ts` (mới) | Logic thuần: `isOnExpandedLayout(uiSettings, width)` = màn hẹp **hoặc** người dùng bật ⇥; `showConversationList` / `showMessageView`; `hasExpandedLayoutPreference` để nút ⇥ lật đúng lựa chọn đã lưu chứ không lật theo breakpoint |
| `ConversationContext.tsx` | `isOnExpandedLayout` tính qua `layoutMode`; `toggleConversationLayout` đọc `hasExpandedLayoutPreference` |
| `ConversationView.tsx` | Dùng `showConversationList` / `showMessageView` của `layoutMode` thay hai biểu thức viết tay |
| `contactPanelVisibility.ts` | Thêm lớp phủ màn hẹp: trạng thái sống trong phiên xem (external store), **không** ghi `ui_settings`; `useContactPanelControl()` là chỗ duy nhất quyết định panel mở/đóng và cách lật (màn rộng ghi `ui_settings`, màn hẹp lật lớp phủ) |
| `conversationbox/ConversationSidebar.tsx` | Dùng `useContactPanelControl`; nghe cả `mousedown` lẫn `touchstart` để đóng; thêm **nền mờ bấm được** `md:hidden` dưới lớp phủ; `data-testid="conversation-sidebar"` |
| `conversationbox/SidepanelSwitch.tsx` | Nút bật/tắt panel đi qua `useContactPanelControl` |
| `conversationbox/ContactPanel.tsx` | Nút × đóng panel đi qua `useContactPanelControl` (trước đây ghi thẳng `ui_settings` ⇒ **không đóng nổi lớp phủ di động**) |
| `components-next/sidebar/MobileSidebarLauncher.tsx` | Ẩn nút nổi khi đang mở một hội thoại (prop Inertia `conversationId`) — nó đè lên ô soạn tin; màn danh sách vẫn có nút |
| `dashboard/constants/globals.ts` | `SMALL_SCREEN_BREAKPOINT` **1024 → 768** cho khớp gốc và khớp `md:` của CSS; thêm `LARGE_SCREEN_BREAKPOINT = 1024` |
| `lang/{en,vi}/conversation.php` | `CONVERSATION.SIDEBAR.CLOSE_OVERLAY` (nhãn cho nền mờ) |

### Bug phụ tìm được khi đọc

1. `SMALL_SCREEN_BREAKPOINT = 1024` trong khi CSS của panel phải đổi ở `md` (768). Hệ quả: ở bề rộng
   768–1023px panel phải **là cột tĩnh** nhưng JS vẫn coi là màn nhỏ ⇒ bấm vào khung chat là panel tự
   đóng. Đã sửa về 768.
2. `ContactPanel.closeContactPanel` ghi thẳng `updateUISettings({is_contact_sidebar_open:false})`.
   Trên màn hẹp (lớp phủ) nút × sẽ không đóng được gì. Đã đưa về `useContactPanelControl`.

## Bằng chứng (Playwright, KHÔNG dùng `force`)

Kịch bản mỗi cỡ màn × sáng/tối: mở danh sách → (di động) mở/đóng thanh điều hướng → **chạm** một thẻ
hội thoại → mở/đóng panel phải → **chạm** "Trở về".

| Cỡ màn | Kịch bản | Trước | Sau |
|---|---|---|---|
| 390×844 cảm ứng | bề rộng danh sách / khung chat khi đã mở hội thoại | danh sách **340px** hiện, khung chat **50px** | danh sách **ẩn** (0px), khung chat **390px** |
| 390×844 cảm ứng | chạm thẻ hội thoại | mở được thẻ đầu (nằm trên cùng), thẻ dưới bị đè — `chat-polish-2` phải dùng `force` | `OK → /app/accounts/3/conversations/2`, khung chat đọc được toàn bộ |
| 390×844 cảm ứng | nút quay lại | không có | `OK → /app/accounts/3/dashboard`, danh sách hiện lại, khung chat gỡ khỏi DOM |
| 390×844 cảm ứng | thanh điều hướng trái | — | `x đóng=-200 → mở=0 → đóng lại=-200` (off-canvas 200px, nút ☰ mở và đóng được) |
| 390×844 cảm ứng | panel phải | — | vào màn: **đóng** (dù `ui_settings` nhớ lựa chọn của màn rộng); chạm nút Liên hệ → lớp phủ hiện (`sau=1`); nền mờ có; chạm nền mờ → đóng (`0`) |
| 1440×900 | bề rộng danh sách / khung chat | 340 / 828 | **340 / 828** (không đổi) |
| 1440×900 | nút "Trở về" / nút nổi ☰ | không có | **vẫn không có** |
| 1440×900 | panel phải | bấm nút → mở, bấm lại → đóng, ghi `ui_settings` | **y hệt**, không có nền mờ |

Ảnh: `before-…-{01-list,02-thread}.png` ↔ `after-…-{01-list,01b-nav,02-thread,03-back,04-panel}.png`
cho `mobile-390x844` và `desktop-1440x900`, mỗi cái ở `light` + `dark`.

**Pixel 1440×900 trước/sau** (`diff-desktop.mjs`): `01-list` 0,067% (light) / 0,103% (dark) — chỉ là
nhãn thời gian tương đối ("7m" → "19m") của các thẻ hội thoại. `02-thread` 2,6% / 7,6% — khung tin
cuộn tới vị trí khác giữa hai lần chạy (ảnh diff `diff-desktop-*-02-thread.png` cho thấy nội dung
lệch theo chiều dọc, mép cột **không** dịch). Bề rộng cột đo bằng `getBoundingClientRect` giống hệt
nhau, nên đây không phải hồi quy bố cục.

Console: 1 lỗi mỗi lần tải, vẫn là `409 (Conflict)` của poll trạng thái Zalo — đã ghi ở finding C của
`chat-polish-2-notes.md`, ngoài phạm vi, không phát sinh thêm.

## Gate

| Gate | Kết quả |
|---|---|
| `npx vitest run` | **109 file / 848 test xanh** (mới: `layoutMode.test.ts` 7 test, `contactPanelMobile.test.tsx` 4 test) |
| `npx tsc --noEmit` | sạch |
| `flock /tmp/yona-build.lock npm run build` | `✓ built in 14.26s` (+ sdk `✓ built in 1.64s`) |
| `php artisan i18n:generate --check` | `INFO Bundle i18n khớp lang/.` |
| `vendor/bin/pint --test lang/{vi,en}/conversation.php` | passed |

Lệch đã ghi 4 dòng vào `reports/ux-deviations.md` (mục "Bố cục di động cho dashboard hội thoại").
Không harness pixel nào cần chụp lại: mọi `viewport:` trong `~/www/pixel-diff/*.mjs` đều ≥ 1280px nên
nhánh mới không chạy ở gate hiện tại.

Không commit. Không đụng `resources/js/widget/**`. Dữ liệu account 3 không tạo/xoá gì (chỉ mở hội
thoại 2 và bật/tắt UI). Phiên Playwright headless đã dọn trước mỗi lượt.

## Ngoài phạm vi — ghi lại, không sửa

| # | Màn | Finding | Mức | Bằng chứng | Đề xuất |
|---|---|---|---|---|---|
| A | Dashboard 768–1023px | Ba cột vẫn dựng: thanh điều hướng (~200–260px) + danh sách 340px + khung chat còn ~200–450px. Đúng hành vi gốc, nhưng khung chat hẹp tới mức bong bóng tin xuống dòng liên tục | 🟡 | suy ra từ số đo (`aside` 200px off-canvas / `sidebarWidth` mặc định; danh sách `w-[340px]`) | Cân nhắc nâng ngưỡng hai-màn lên `lg` (1024) hoặc thu danh sách xuống ~280px trong dải này. Cần founder quyết vì đụng cả màn tablet |
| B | Nút nổi `SidepanelSwitch` ở 390px | Cụm nút tròn neo `top-36` đè lên bong bóng tin đầu tiên của khung chat | 🟡 | `after-mobile-390x844-light-02-thread.png` (icon người ở mép phải, chồng lên tin) | Ở màn hẹp nên đưa nút Liên hệ vào header hội thoại (cạnh ⋮) thay vì để nổi — thuộc phạm vi header, không thuộc bố cục |
| C | Tất cả | Lỗi console `409 (Conflict)` mỗi lần tải dashboard account 3 | 🟡 | `after-results.json` (`errors: 1` ở cả 4 lượt) | Đã có ở finding C của `chat-polish-2-notes.md` — poll trạng thái Zalo nên trả 200 + payload thay vì 409 |

```
Status: DONE
Summary: Dashboard hội thoại có bố cục hai-màn dưới 768px — danh sách chiếm hết bề rộng, mở hội thoại thì ẩn danh sách và header mọc nút "Trở về"; panel phải thành lớp phủ không mở sẵn, có nền mờ để đóng; thanh điều hướng trái mở/đóng được bằng nút nổi ở màn danh sách. Cơ chế dùng lại đúng `isOnExpandedLayout` của gốc (chỉ thêm điều kiện breakpoint) nên chỉ có một điểm sửa; màn 1440×900 đo lại không đổi một pixel bề rộng cột.
Concerns/Blockers: Chatwoot gốc KHÔNG có breakpoint hai-màn (chỉ có nút ⇥) — đây là lệch có chủ đích, đã ghi ux-deviations.md. Dải 768–1023px vẫn ba cột chật như gốc (finding A). Nút nổi mở panel phải đè lên tin ở 390px (finding B). Sửa kèm hai bug phụ: SMALL_SCREEN_BREAKPOINT port nhầm 1024→768, và nút × của ContactPanel ghi thẳng ui_settings nên không đóng được lớp phủ di động.
```
