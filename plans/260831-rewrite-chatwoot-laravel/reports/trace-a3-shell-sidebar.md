# Trace A3 — Dashboard shell + Sidebar + điều hướng

Nguồn: Chatwoot v4.17.1 (`refs/chatwoot`). Ngày: 31/08/2026.

## Bảng trace nguồn → đích

### Backend

| Ruby / hệ gốc | PHP | Ghi chú |
|---|---|---|
| `Current.account` / `Current.account_user` + router guard accounts | `app/Http/Middleware/SetCurrentAccount.php` (alias `account.scope`) | Resolve account từ route, non-member → 404; share currentAccount/currentAccountUser/userAccounts qua Inertia |
| `Api::V1::ProfilesController#availability`, `#auto_offline` | `app/Http/Controllers/WebApi/ProfileAvailabilityController.php` + `routes/web_api.php` | Mặt tiền web_api mount `/api/v1/accounts/{id}/profile/*` (gốc: `/api/v1/profile` + account_id trong body — account chuyển lên URL, trace-note). Presence Redis vào B4 |
| Router `/app/accounts/:accountId/*` (SPA) | `routes/web.php` group scoped + catch-all placeholder | Trang con chưa port render `dashboard/PlaceholderView`, URL giữ đúng shape Chatwoot (dashboard, mentions/conversations, reports/*, campaigns/*, settings/*, portals…) |
| `dashboard#index` route `/app/accounts/:id/dashboard` | `DashboardController@show` | `/app/accounts/{id}` redirect `/dashboard` như router gốc |

### Frontend (Vue → React)

| Vue | React | Ghi chú |
|---|---|---|
| `routes/dashboard/Dashboard.vue` | `resources/js/dashboard/Dashboard.tsx` | Shell: Sidebar + main + MobileSidebarLauncher. CommandBar (B10), Copilot/UpgradePage/Calls (EE), AddAccountModal (config tắt), KeyShortcutModal (B10) chưa port |
| `components-next/sidebar/Sidebar.vue` (1100 dòng) | `sidebar/Sidebar.tsx` | Đủ: header logo+switcher, search link, resize handle + snap collapse, popover state, nav groups, profile menu, mobile flyout + click-outside. ComposeConversation → nút pen disabled (B3); ChangelogCard/Button cloud-only bỏ; unread counts + sort menu đổ về từ B8 |
| `menuItems` computed trong Sidebar.vue | `sidebar/menuItems.ts` | Ẩn EE: Captain, Calls, Companies, Audit Logs, Custom Roles, SLA, Billing, Agent Assignment, Conversation Workflow. Nhóm động (Folders/Teams/Channels/Labels/Segments/Tagged) mảng rỗng → tự ẩn như gốc khi chưa có data |
| `sidebar/provider.js` | `sidebar/provider.tsx` | Resize + collapse threshold giữ nguyên hằng (56/160/200/320); sidebar_width lưu localStorage tạm (gốc: ui_settings server — chuyển ở A4); permission policy resolve vào cùng RBAC |
| `SidebarGroup.vue` | `SidebarGroup.tsx` | Active detection theo URL path thay route name; auto-expand nhóm có active child; collapsed click → điều hướng child đầu |
| `SidebarGroupHeader/Leaf/Separator/SubGroup/UnreadBadge/EmptyLeaf.vue` | cùng tên `.tsx` | Chuỗi class tree-line giữ nguyên; SidebarSortMenu chưa port (cần prefs backend) |
| `SidebarCollapsedPopover.vue` | `SidebarCollapsedPopover.tsx` | Bản rút gọn (không sort menu/keyboard nav) |
| `SidebarAccountSwitcher.vue` | `SidebarAccountSwitcher.tsx` | Switch → window.location như gốc; nút "New account" theo CREATE_NEW_ACCOUNT_FROM_DASHBOARD (mặc định false) chưa port |
| `SidebarProfileMenu.vue` + `SidebarProfileMenuStatus.vue` | cùng tên `.tsx` | Availability + auto_offline gọi web_api; **khác gốc:** Appearance = 3 nút light/dark/system trực tiếp (gốc mở ninja-keys — B10); Contact support/Docs/Changelog (link chatwoot.com) bỏ theo branding; Keyboard shortcuts vào B10 |
| `MobileSidebarLauncher.vue` | `MobileSidebarLauncher.tsx` | |
| `dropdown-menu/base/*` (Container/Body/Section/Item/Separator) | `dropdown-menu/base/index.tsx` | DropdownFloating (teleport) chưa cần; Item không click/link render div (giữ đúng gốc — button lồng button phá nested dropdown) |
| `next/icon/Logo.vue` (logo woot) | `icon/Logo.tsx` | Logo mark Yona (gỡ nhãn) |
| `components-next/switch/Switch.vue` | `switch/Switch.tsx` | |
| `helper/themeHelper.js` | `helper/themeHelper.ts` | + listener OS scheme trong app.tsx |
| `constants/globals.js` (phần dùng) | `constants/globals.ts` | |
| i18n `settings.json` (SIDEBAR/SIDEBAR_ITEMS/PROFILE_SETTINGS…), `components.json` | copy verbatim | |

### Tests

| Phạm vi | Pest |
|---|---|
| Account scoping (404 non-member, share props, placeholder routes) + web_api availability/auto_offline | `tests/Feature/App/AccountScopeTest.php` |

## Trạng thái DoD A3
- (a) Pest: ✅ 38/38 toàn suite (không có RSpec 1-1 cho sidebar — spec gốc là component test Vue; backend scoping có test port hành vi)
- (b) Trace: ✅ (file này)
- (c) Pixel-diff: ⏳ cần harness đăng nhập (đã nhờ yona-ee thêm bước login) — đối chiếu DOM/hành vi đã chạy trong phiên
- (d) Founder "Test ngay": ⏳ — kịch bản: login john@acme.inc → thấy shell + sidebar Acme Inc; click từng mục nav → URL đúng dạng Chatwoot, trang con "Coming soon"; kéo mép sidebar để thu gọn (icon-only, hover hiện flyout), double-click mép để snap; menu avatar dưới cùng: đổi availability (chấm màu avatar đổi), toggle auto-offline, đổi giao diện light/dark/system ăn toàn shell, logout.

## Ghi chú
- Nhóm nav động chưa có mục con (Folders/Teams/Channels/Labels/Segments/Tagged) tự ẩn — đúng hành vi gốc với account trống.
- Quyết định giữ lại từ gốc cần founder biết: mục Settings bỏ hẳn Conversation Workflow + Templates giữ (F5), Data giữ (E3).
