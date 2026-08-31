# Kiểm kê Frontend Chatwoot v4.17.1

> Báo cáo agent kiểm kê 31/08/2026. Nguồn: `refs/chatwoot/app/javascript` (không mở `enterprise/`). Stack gốc: Vue 3 + Vite (`vite-plugin-ruby`) + Vuex 4 (đang chuyển dần Pinia 3) + vue-router 4 + Tailwind + vue-i18n.

---

## 1. Entrypoint / app con

| Entrypoint | App source | Vai trò | .vue | .js/.ts | spec | tổng file |
|---|---|---|---|---|---|---|
| `dashboard.js` | `dashboard/` | App chính agent/admin (SPA, history mode) | **1057** | 534 | 344 | 4610 |
| `widget.js` | `widget/` | Live-chat widget trong iframe (hash mode) | 46 | 52 | 37 | 201 |
| `sdk.js` | `sdk/` | Script nhúng, build IIFE → `public/packs/js/sdk.js` | 0 | 6 | 2 | 9 |
| `v3app.js` | `v3/` | Auth/onboarding mới: login, signup, reset, verify, SAML, onboarding | 21 | 9 | 4 | 34 |
| `portal.js` | `portal/` | Help Center public (Rails-rendered + Vue sprinkles) | 5 | 3 | 4 | 13 |
| `survey.js` | `survey/` | Trang CSAT survey standalone | 5 | 5 | 1 | 68 |
| `superadmin*.js` | `superadmin_pages/` | Super admin pages | 6 | 0 | 0 | 7 |
| — | `shared/` | Dùng chung dashboard/widget/survey | 33 | 47 | 31 | 159 |

Build: `vite.config.ts` chung; `vite.lib.config.ts` riêng cho SDK (IIFE, inlineDynamicImports, sinh .gz/.br). Size limit: sdk 40KB, widget 300KB. Histoire (port 6179) = storybook nội bộ, **92 file `*.story.vue`** — dùng làm bộ đối chiếu visual regression khi port React.

Dashboard chiếm ~85% khối lượng.

---

## 2. Bản đồ màn hình dashboard

Router: `dashboard/routes/index.js` → tất cả dưới `/app/accounts/:accountId` với shell `Dashboard.vue`: `NextSidebar` (`components-next/sidebar/Sidebar.vue`, 1100 dòng) + router-view + CommandBar (ninja-keys) + Copilot (EE) + FloatingCallWidget (EE) + UpgradePage + AddAccountModal + WootKeyShortcutModal.

Ngoài shell: `/onboarding`, `/onboarding/inbox-setup`, `/suspended`, `/app/no-accounts`.

- **Conversations** (20 .vue): `home` `/dashboard`, `/conversations/:id`, `/inbox/:inbox_id`, `/label/:label`, `/team/:teamId`, `/custom_view/:id` (folders), `/mentions/conversations`, `/unattended/conversations`, `/participating/conversations`. Component chính: ChatList, ConversationBox, ConversationHeader, MessagesView, ReplyBox, ConversationSidebar, MacroList, CannedResponse, contextMenu, bulkActions; panel phải ContactPanel/ContactInfo/ConversationInfo/SharedFiles/CustomAttributes/LabelBox.
- **Inbox view mới**: `/inbox-view`, `/inbox-view/:type/:id` (notification-centric).
- **Contacts** (components-next/Contacts 36 .vue): `/contacts`, `/contacts/active`, `/contacts/segments/:segmentId`, `/contacts/labels/:label`, `/contacts/:contactId`.
- **Companies** (EE — skip): `/companies`.
- **Calls** (EE — skip): `/calls`.
- **Campaigns** (components-next/Campaigns 21 .vue): `/campaigns/{ongoing, one_off, live_chat, sms, whatsapp}` + whatsapp analytics.
- **Help Center** (15 + components-next/HelpCenter 49 .vue): `/portals`, portals_new, articles index/new/edit theo `:portalSlug/:locale/:categorySlug`, categories, locales, settings.
- **Captain** (EE — skip, 17 + 90 .vue).
- **Search**: trang search toàn cục (conversations/contacts/messages/articles).
- **Reports** (63 .vue): `/reports/{overview, conversation, csat, sla(EE), bot, agent(+overview,+:id), inboxes(+overview,+:id), teams(+overview,+:id), label(+overview,+:id)}`.
- **Settings** (278 .vue): general 7, agents 3, teams 10, assignment-policy 12, **inboxes 63** (wizard ~15 channel type), templates 3, labels 3, custom-attributes 3, automation 9, agent-bots 2, macros 7, canned-response 3, integrations 24, data imports 9, audit-logs (EE) 2, custom-roles (EE) 4, sla (EE) 5, conversation-workflow 1, security 5, billing (EE) 7, captain (EE) 4, profile 21 (`/profile/settings`, `/profile/mfa`).

Sidebar nav (Lucide icons): Inbox, Conversations (All/Mentions/Participating/Unattended/Folders/Teams/Channels/Labels — nhóm động), Contacts, Reports, Campaigns, Help Center, Settings (+ Captain/Calls/Companies = EE).

---

## 3. Store + realtime

### 3.1 Vuex — 62 module
Core hội thoại: conversations, conversationPage, conversationLabels, conversationMetadata, conversationSearch, conversationStats, conversationTypingStatus, conversationUnreadCounts, conversationWatchers, draftMessages, bulkActions. Danh bạ: contacts, contactConversations, contactLabels, contactNotes. Tổ chức: accounts, auth, agents, agentBots, inboxes, inboxMembers, inboxAssignableAgents, teams, teamMembers, labels, attributes, customViews, macros, cannedResponse, automations, webhooks, integrations, dashboardApps, campaigns, auditlogs(EE), sla(EE), customRole(EE), agentCapacityPolicies(EE), assignmentPolicies, userNotificationSettings, sidebarSortPreferences, notifications, globalConfig. Reports: reports, summaryReports, slaReports(EE), csat. Help Center: portals, categories, articles. Captain/copilot (EE) ×13.

Hạ tầng: `store/storeFactory.js` — **factory kép sinh cả Vuex module lẫn Pinia store** từ một định nghĩa (SET_UI_FLAG, SET, ADD, EDIT, DELETE, SET_META, UPSERT). Pinia mới: calls(EE), callHistory(EE), companies(EE).

→ Port React: map sang TanStack Query + Zustand (hoặc tương đương), giữ shape data + UI-flag pattern.

### 3.2 Realtime
- `shared/helpers/BaseActionCableConnector.js`: `@rails/actioncable` subscribe `RoomChannel` với pubsub_token + account_id + user_id; presence heartbeat 20s (`update_presence`); reconnect timer 1s; dispatch theo map event.
- `dashboard/helper/actionCable.js` map ~30 event: message.created/updated, conversation.created/updated/read/status_changed/typing_on/typing_off/contact_changed/mentioned/unread_count_changed, assignee.changed, presence.update, contact.updated/deleted, notification.created/updated/deleted, account.cache_invalidated, user:logout, page:reload (+ EE voice/copilot). Throttle refetch unread 5s, retry jitter 30s±15s.
- Widget: cùng base + forward sang parent qua IFrameHelper.
- Event bus: mitt (`shared/constants/busEvents.js`).

---

## 4. Design system

### 4.1 Token màu — HAI HỆ SONG SONG (quyết định pixel)
4 file quyết định: **`tailwind.config.js`**, **`theme/colors.js`** (290 dòng), **`theme/icons.js`** (~256 icon woot), **`dashboard/assets/scss/_next-colors.scss`** (308 dòng).

- **Legacy**: `woot-*`, `slate-*`, `green/yellow/red/violet/black-*` scale 25→900 — hardcode từ @radix-ui/colors, không phản ứng theme, dùng kèm `dark:` (157 file .vue còn dùng).
- **Next (`n-*`)**: CSS variable RGB triplet (`:root` light, `.dark` dark), scale Radix 1→12 cho slate/iris/blue/ruby/amber/teal/gray/violet + token semantic: surface (n-background, n-surface-1/2/active, n-input-background, n-card), solid, alpha, border (n-weak/n-container/n-strong), text, overlay, button, label. Brand `#2781F6`. Dạng `rgb(var(--x) / <alpha-value>)` → opacity utilities hoạt động.

### 4.2 Dark mode
`darkMode: 'class'`; class `dark` gắn vào **`document.body`** (KHÔNG phải html) — themeHelper.js; 3 chế độ localStorage `COLOR_SCHEME`: auto/light/dark. → React: nếu dùng next-themes phải config attribute lên body, không thì sai toàn bộ màu `n-*`.

### 4.3 Typography/spacing/animation
- Font Inter + InterDisplay (`shared/assets/fonts/`); **font weight lẻ 420/440/460/520/620** (variable font — nguồn lệch pixel hay gặp).
- fontSize thêm xxxs 0.5rem, xxs 0.625rem; breakpoints thêm xs 480px, 3xl 1900px.
- Plugin typography preset **`prose-bubble`** (~150 dòng CSS cho message bubble) — port nguyên si.
- Keyframes: wiggle, fade-in-up, loader-pulse, card-select, shake.
- Tailwind v3 syntax (`<alpha-value>`); nhảy Tailwind v4 = viết lại token thành `@theme`.

### 4.4 Icon — 3 hệ
1. `@egoist/tailwindcss-icons`: collection custom **woot** (256 icon, theme/icons.js) + lucide, logos, ri, ph, material-symbols, teenyicons, fluent — class `i-lucide-inbox`, `i-woot-*`.
2. `<fluent-icon>`/DashboardIcon — icons.json (20) + dashboard-icons.json (204).
3. flag-icons (cờ quốc gia).

### 4.5 Thư viện UI nội bộ
- **Legacy woot-*** (đăng ký global, DEPRECATED): woot-modal, woot-input, woot-tabs, woot-wizard, woot-confirm-modal… + `components/ui/` (Banner, ContextMenu, DatePicker×3, Dropdown, Tabs, TimeAgo…) + `components/widgets/` (~40 + forms/modal/conversation/FilterInput/WootWriter).
- **components-next**: **492 .vue / 62 thư mục**. Primitives: button, input, textarea, checkbox, switch, select, combobox (6), dropdown-menu (9), dialog, popover, side-panel, tabbar, table (4), pagination, avatar, label, spinner, banner, breadcrumb, icon, taginput, colorpicker, emoji-icon-picker, phonenumberinput, filter (14), Accordion, DraggableReorderList… Feature lớn: message (41), Contacts (36), Campaigns (21), Conversation (21), AssignmentPolicy (20), sidebar (17), NewConversation (14), HelpCenter (49).
- Dependency ngoài: floating-vue (tooltip/popper fixed), @chatwoot/ninja-keys (command bar), @tanstack/vue-table, @formkit + vuelidate, @vueuse, vue-dompurify-html, highlightjs, **@chatwoot/prosemirror-schema** (editor), **@chatwoot/viz** (charts), vue3-color, pico-search.

### 4.6 Lưu ý pixel-perfect React + Tailwind + Radix
1. **Radix hiện chỉ ở tầng màu** — Chatwoot tự viết dropdown/dialog/popover. Dùng Radix primitives sẽ đổi DOM/focus → override style + animation thủ công để giữ hình dạng.
2. Port nguyên 4 file token trước tiên, không tự "chuẩn hóa" scale màu.
3. Class `dark` trên `<body>`.
4. Giữ CẢ HAI hệ màu, không gộp.
5. Giữ plugin icon + bê nguyên collection woot (brand-specific).
6. `prose-bubble` + font weight lẻ = 2 nguồn lệch pixel lớn nhất trong bubble.
7. 92 Histoire story = bộ đối chiếu visual regression.
8. RTL-aware ngay từ đầu (TeleportWithDirection, prose-bubble đảo chiều).

---

## 5. Widget nhúng + SDK

### 5.1 SDK (script tag)
`window.chatwootSDK.run({baseUrl, websiteToken})`. Config `window.chatwootSettings`: locale, useBrowserLanguage, baseDomain, position, type, launcherTitle, hideMessageBubble, showPopoutButton, showUnreadMessagesDialog, widgetStyle (standard/flat), darkMode, welcome*, enableFileUpload/EmojiPicker/EndConversation. Public API `window.$chatwoot`: toggle, toggleBubbleVisibility, popoutChatWindow, setUser, setCustomAttributes, setConversationCustomAttributes, setLabel/removeLabel, setLocale, setColorScheme, reset. SPA-compat: turbo/turbolinks/astro before-render → restoreWidgetInDOM. Cookies: `cw_conversation` (auth token), `cw_snooze_campaigns_till`, user hash cookie — share cross-subdomain qua baseDomain.

### 5.2 iframe
`<iframe id="chatwoot_live_chat_widget" src="{baseUrl}/widget?website_token=...&cw_conversation=...">` allow camera/mic/fullscreen/clipboard; holder `div#cw-widget-holder.woot-widget-holder` + bubble holder; CSS `sdk/sdk.css` (.woot-widget-bubble, .woot--hide, .woot-elements--left/right, --flat…). Resize `setFrameHeightToFitContent`.

### 5.3 postMessage protocol
Prefix `"chatwoot-widget:" + JSON`. Parent→iframe: config-set, set-user, set-custom-attributes, set-label, set-locale, set-color-scheme, toggle-*, sdk-set-bubble-visibility. iframe→parent: loaded (authToken → cookie → config-set → chatwoot:ready), error, onEvent (custom window events), setBubbleLabel, setAuthCookie, setCampaignReadOn, postback (chatwoot:on-message), playAudio, setUnreadMode/resetUnreadMode, popoutChatWindow. Window events: CHATWOOT_READY, CHATWOOT_ERROR, CHATWOOT_POSTBACK.

### 5.4 App trong iframe
Vue app hash-router: `/` (ViewWithHeader) → home, prechat-form, messages, article-viewer; ngoài layout: unread-messages, campaigns. Store: agent, appConfig, articles, campaign, contacts, conversation, conversationAttributes, conversationLabels, events, message. 46 component (ChatHeader, ChatFooter, ConversationWrap, Agent/UserMessageBubble, Image/Video/FileBubble, UnreadMessage, TeamAvailability, PreChat, DragWrapper…). i18n 57 locale.

---

## Cần đào sâu sau
- Sidebar.vue (1100 dòng), ReplyBox, MessagesView, editor ProseMirror — mới nắm cấu trúc.
- settings/inbox/ 63 .vue (wizard ~15 channel) chưa liệt kê từng channel.
- Reports 63 .vue chưa map từng chart/metric (@chatwoot/viz).
- Ma trận permission (`dashboard/constants/permissions.js`) + featureFlags.js + UpgradePage paywall.
- dashboard/api/ (60+ module) chi tiết.
