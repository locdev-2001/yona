# Trace B3 — Conversation + Message (lõi)

Nguồn: Chatwoot v4.17.1 (`refs/chatwoot`, đọc theo tag). Ngày port: 01/09/2026.

## Backend Ruby ↔ PHP

| Nguồn Chatwoot | Đích Laravel | Ghi chú |
|---|---|---|
| `db/schema.rb` bảng `conversations` | `database/migrations/2026_09_01_300000_create_conversations_tables.php` | Đủ cột + 15 index như gốc; display_id sinh qua PG trigger `conversations_before_insert_row_tr` đọc sequence `conv_dpid_seq_<account_id>` (tạo sẵn từ migration accounts A2 — quyết định #7); uuid default `gen_random_uuid()`; FK cascade thay `dependent: :destroy_async` (deliberate như B1/B2); `campaign_id`/`sla_policy_id`/`assignee_agent_bot_id`/`ai_assignee_type`/`cached_label_list` giữ chỗ chưa FK (C4/EE/D4/B7) |
| `db/schema.rb` bảng `messages` | cùng migration | Đủ cột (content_attributes json thường, external_source_ids/additional_attributes/sentiment jsonb — đúng kiểu gốc) + index GIN trgm content + GIN `additional_attributes->campaign_id` |
| `db/schema.rb` bảng `access_tokens` | cùng migration | owner polymorphic + token unique; backfill token cho user có sẵn (AccessTokenable after_create chỉ chạy cho user mới) |
| `app/models/conversation.rb` | `app/Models/Conversation.php` | Enum status open/resolved/pending/snoozed + priority; hooks: validate_additional_attributes, validate_referer_url (URL sai → null), determine_conversation_status (contact blocked → resolved; nhánh campaign/bot chưa port), ensure_waiting_since (= created_at), ensure_snooze_until_reset, set_status_changed_at, load display_id/uuid từ DB sau insert, resolve → waiting_since NULL qua update_column; scopes unassigned/assigned/assignedTo + sort_on_* (priority NULLS LAST, waiting_since). BỎ: dispatcher ~9 event + FilteredCountInvalidator (B4), ActivityMessageHandler (B5), Assignment/AutoAssignmentHandler (B6), Labelable (B7), mentions/participants (B11), csat (C5), mute Redis (B4), agent bot/ai_assignee (D4/EE), SLA (EE), tweet/campaign (F/C4) |
| `app/models/message.rb` | `app/Models/Message.php` | Enum message_type/content_type (13)/status; hooks: ensure_content_type, prevent_message_flooding (config `limits.conversation_message_per_minute`, mặc định 200/phút → 'Too many messages'), validate content ≤150000, ensure_processed_message_content (email quoted → content), after create GIỮ ĐÚNG THỨ TỰ: reopen_conversation (incoming: snoozed→open, resolved→open) → set_conversation_activity (update_columns last_activity_at) → first_reply/waiting_since (valid_first_reply? đếm outgoing không-bot ≤1 → set first_reply_created_at + xóa waiting_since; human_response xóa waiting_since; incoming set waiting_since khi trống) → update_contact_activity (sender Contact → last_activity_at). BỎ: MESSAGE_CREATED/UPDATED dispatch (B4), SendReplyJob (webhook outbound D4), attachments (B9), email content/liquid/cc-bcc (F1), template hooks (D6), InReplyToMessageBuilder external id (driver kênh), translations (F6), searchkick (EE), agent bot/captain (EE/D4) |
| `app/models/access_token.rb` + `concerns/access_tokenable.rb` | `app/Models/AccessToken.php` + `User::created` hook | has_secure_token → Str::random(24); mỗi User có token ngay khi tạo (`$user->accessToken->token`) |
| `app/builders/conversation_builder.rb` | `app/Builders/ConversationBuilder.php` | lock_to_single_conversation → trả conversation cuối của contact_inbox; map đủ params (status theo tên) |
| `app/builders/messages/message_builder.rb` | `app/Builders/Messages/MessageBuilder.php` | message_type mặc định outgoing; incoming chỉ cho Channel::Api (throw đúng câu chữ); sender = user (outgoing) / contact (incoming); content_attributes chuỗi JSON được parse, array giữ, kiểu khác {}; echo_id transient trả lại trong payload. BỎ: attachments (B9), email (F1), sender AgentBot (D4), campaign_id (C4), template_params (F5) |
| `app/finders/conversation_finder.rb` + `services/conversations/permission_filter_service.rb` | `app/Finders/ConversationFinder.php` | counts mine/unassigned/assigned/all bằng COUNT(*) FILTER 1 query như gốc; assignee_type me/unassigned/assigned; status mặc định open, 'all' bỏ lọc; inbox_id ∩ assigned inboxes; PermissionFilter: admin thấy hết, agent chỉ inbox mình là member; team_id; source_id; page 25/trang; SORT_OPTIONS đủ 9 + 4 alias cũ trừ `unread`/`last_user_message` (B8). BỎ: labels (B7), q search (E2), conversation_type mention/participating (B11)/unattended (B8), updated_within (B4), custom view (E1) |
| `app/finders/message_finder.rb` | `app/Finders/MessageFinder.php` | 20 tin cuối (trả tăng dần), before/after/between, clamp MESSAGE_ID_MAX, filter_internal_messages (boolean false = không lọc như `present?` Ruby — bẫy blank() đã dính, xem mục bẫy) |
| `AccessTokenAuthHelper` + `Api::BaseController` | `app/Http/Middleware/AuthenticateApiAccessToken.php` | Header `api_access_token` → tra AccessToken, sai → 401 `Invalid Access Token`; đúng → user đó thay session. CÙNG endpoint web_api như Chatwoot (không tách route). `implements AuthenticatesRequests` để SortedMiddleware không đẩy `auth` chạy trước (bẫy middlewarePriority — xem mục bẫy). BỎ: AgentBot owner + BOT_ACCESSIBLE_ENDPOINTS (D4) |
| Rails API không bật CSRF | `app/Http/Middleware/ValidateCsrfToken.php` (extends `PreventRequestForgery`) | Request `/api/*` mang header api_access_token → miễn CSRF (token tự nó chống CSRF); request session (browser) vẫn kiểm XSRF như cũ. Laravel 12 đổi tên class CSRF thành `PreventRequestForgery` — replace đúng class này trong bootstrap |
| `Api::V1::Accounts::ConversationsController` | `app/Http/Controllers/WebApi/ConversationsController.php` | index (data.meta counts + payload), meta, show (theo display_id + ConversationPolicy#show?: admin/inbox member/team member → 401 khi trái), create (inbox+contact → ContactInboxBuilder, fallback tra source_id scope inbox/account, RecordNotUnique → 422 `source_id should be unique`, transaction + MessageBuilder khi có message). BỎ: filter/search (E1/E2), toggle_status/toggle_priority/mute/unmute/transcript (B5), toggle_typing_status/update_last_seen/unread (B4/B8), attachments (B9), custom_attributes (E1), destroy + DeleteService (nhóm sau), update priority (B5) |
| `Api::V1::Accounts::Conversations::MessagesController` + `BaseController` | `app/Http/Controllers/WebApi/Conversations/MessagesController.php` + `Controller::fetchConversationForUser()` | index (meta contact/assignee/labels + payload MessageFinder), create (422 {error} khi builder/validation fail như render_could_not_create_error). BỎ: update status (driver kênh), destroy (cụm tiện ích), retry (D4), translate (F6) |
| `api/v1/conversations/partials/_conversation.json.jbuilder` | `app/Http/Resources/ConversationResource.php` | Đủ key: meta(sender _contact/channel/assignee _agent + assignee_type/team _team/hmac_verified), id=display_id, messages=[tin cuối push_event_data], can_reply (MessageWindowService nhánh Channel::Api: agent_reply_time_window), *_last_seen_at epoch (nil→0), labels từ cached_label_list, muted=false (Redis B4), status/priority theo tên, updated_at float, waiting_since epoch, unread_count, last_non_activity_message, sla_policy_id=null (feature sla tắt) |
| `api/v1/models/_message.json.jbuilder` + `Message#push_event_data` | `app/Http/Resources/MessageResource.php` | _message: đủ key + echo_id khi có + sender push_event_data (User: availability_status 'offline' cố định tới B4; Contact: đủ trường + company gate); push_event_data: toàn bộ attributes + conversation{assignee_id, unread_count, last_activity_at, contact_inbox.source_id} |
| `Conversations::MessageWindowService` | `Conversation::canReply()` | Chỉ nhánh Channel::Api (kênh khác chưa port → true); window theo `additional_attributes.agent_reply_time_window` của channel |
| `lib/limits.rb` | `config/limits.php` | CONVERSATION_MESSAGE_PER_MINUTE_LIMIT |
| morph map 'User'/'Contact'/'Inbox' | `AppServiceProvider` | sender_type/owner_type lưu đúng tên lớp Ruby; migration đổi attachable_type cũ `App\Models\*` → tên ngắn |

## Routes

| Chatwoot | Yona |
|---|---|
| `GET/POST /api/v1/accounts/:id/conversations`, `GET meta`, `GET :id` (display_id), `GET/POST :id/messages` | `routes/web_api.php` cùng path, middleware `auth.api_token` + `auth` + `account.scope` (token HOẶC session trên cùng endpoint như Chatwoot) |
| dashboard routes `/app/accounts/:id/dashboard` (home), `/conversations/:id`, `/inbox/:inbox_id`(+`/conversations/:id`) | `routes/web.php` → `DashboardController@show/conversation/inbox` render `dashboard/conversation/ConversationView` |
| `team_conversations` `/team/:teamId` + `conversations_through_team` `/team/:teamId/conversations/:id` | `DashboardController@team` → cùng ConversationView với prop `teamId`; finder lọc `team_id` (đã có từ backend B3) |

## Spec ↔ Pest (125 test mới, toàn suite 387)

| RSpec | Pest |
|---|---|
| `spec/models/conversation_spec.rb` | `tests/Feature/Models/ConversationTest.php` (30) |
| `spec/models/message_spec.rb` | `tests/Feature/Models/MessageTest.php` (22) |
| `spec/builders/conversation_builder_spec.rb` | `tests/Feature/Builders/ConversationBuilderTest.php` (5) |
| `spec/builders/messages/message_builder_spec.rb` | `tests/Feature/Builders/MessageBuilderTest.php` (8) |
| `spec/finders/message_finder_spec.rb` | `tests/Feature/Finders/MessageFinderTest.php` (9) |
| `spec/finders/conversation_finder_spec.rb` | `tests/Feature/Finders/ConversationFinderTest.php` (17) |
| `spec/controllers/api/v1/accounts/conversations_controller_spec.rb` | `tests/Feature/WebApi/ConversationsControllerTest.php` (24) |
| `spec/controllers/api/v1/accounts/conversations/messages_controller_spec.rb` | `tests/Feature/WebApi/ConversationMessagesControllerTest.php` (10) |

Case cắt ghi chú ở đầu từng file test (theo đúng nhóm B4–B11/C/D/E/F đã liệt kê ở bảng backend).

## Bẫy đã trả giá trong B3 (đừng lặp)

1. **`middlewarePriority` nuốt thứ tự khai báo:** Kernel Laravel ưu tiên interface `AuthenticatesRequests` nên `auth` bị đẩy chạy TRƯỚC `auth.api_token` dù route khai báo ngược lại → token auth chết im lặng (luôn 401). Middleware tự viết đứng cạnh `auth` phải `implements AuthenticatesRequests` để cùng bậc ưu tiên (sort ổn định giữ thứ tự khai báo).
2. **Laravel 12 đổi tên middleware CSRF:** web group chứa `Illuminate\Foundation\Http\Middleware\PreventRequestForgery`, KHÔNG phải `ValidateCsrfToken` — `$middleware->web(replace: [ValidateCsrfToken::class => ...])` là no-op im lặng. Phải soi `Router::getMiddlewareGroups()` để biết class thật. Test Pest không bắt được vì CSRF middleware skip khi `runningUnitTests()` — chỉ curl thật mới lộ.
3. **`blank()` của Laravel ≠ `present?` của Ruby với boolean:** `blank(false) === false` trong khi `false.present? == false` — filter_internal_messages=false bị lọc nhầm. Chỗ nào port điều kiện `present?/blank?` trên tham số có thể là boolean phải xử lý riêng `=== false`.
4. **Enum/attribute default DB không tự có trên model Laravel mới tạo** — `status`/`private` phải khai báo `protected $attributes` không thì hook/serializer đọc null (Rails tự đọc default từ schema).

3. **Timestamp precision 0 (finding hệ thống 02/09):** `$table->timestamps()` Laravel = `timestamp(0)`, gốc là 6 số lẻ → nhiều tin cùng giây thành tie khi `order by created_at` (display 4 hiện sai thứ tự, note "kẹp" vào cụm outgoing nên meta/khóa ẩn theo luật gộp nhóm). Fix 2 tầng: migration `2026_09_02_100000` ALTER mọi cột `timestamp` hiện có sang `timestamp(6)` (đọc information_schema, không hardcode bảng) + mọi migration cũ đổi `timestamps(6)` / `timestamp('x', 6)`; VÀ `App\Database\PostgresConnection` (grammar `getDateFormat` = `Y-m-d H:i:s.u`) đăng ký qua `Connection::resolverFor('pgsql')` — vì Laravel cắt phần lẻ NGAY LÚC GHI bằng format mặc định dù cột có precision. Đọc lại: `asDateTime` thử `createFromFormat('.u')`, PG trả chuỗi không phần lẻ thì fallback `Date::parse`. Equivalence test: `MessageFinderTest` "ordering within the same second" (4 tin cùng giây chèn không theo thứ tự, khẳng định DB lưu `.228` + finder + relation trả đúng thứ tự micro). Luật ghi ở plan.md quyết định #14.
4. **vitest + testing-library không tự cleanup** khi `globals: false` → DOM test trước còn sót, id trùng làm nwsapi (`#id .class` tối ưu qua getElementById) bắt nhầm phần tử test cũ → assertion null giả. `resources/js/test-setup.ts` gọi `afterEach(cleanup)`.

## Khác biệt cố ý backend (pixel/contract cần biết)

1. User ngoài account → 404 (SetCurrentAccount) thay 401 như Rails — hành vi đã có từ A-group, giữ thống nhất.
2. `custom_attributes`/`content_attributes` rỗng serialize thành `[]` thay `{}` (PHP array) — cùng hành vi B2 (ContactResource), FE nội bộ không phân biệt; sẽ chuẩn hóa một thể nếu cần contract chặt.
3. `updated_at` trong push_event_data: ISO 8601 6 số lẻ (Carbon) vs 3 số lẻ (Rails) — FE không dùng key này.
4. Thông điệp lỗi validation content dài: không có prefix `Validation failed:` của Rails save!.
5. Số đếm rate-limit flooding dùng config thay ENV trực tiếp (cùng default 200).
6. `SendReplyJob` không tồn tại → tin outgoing trên kênh API không bắn webhook ra ngoài (webhook_url B1 để trống, D4 mới có webhooks).
7. Hai lệch nhỏ B2 giữ nguyên (location ''-vs-NULL…), không đổi ở B3.

## Frontend Vue ↔ React

### Nền dùng chung (spine)

| Nguồn | Đích | Ghi chú |
|---|---|---|
| store vuex `conversations/*` + `conversationPage` (phần B3) | `dashboard/conversation/ConversationContext.tsx` + `api.ts` + `types.ts` + `constants.ts` | list + counts + selected chat + messages + gửi tin theo pattern createPendingMessageAndSend (pending status `progress` → server thay thế, lỗi → `failed` + toast); filter/tab đổi → reset trang 1; chọn conversation theo display_id trên URL (Inertia visit preserveState). Realtime B4 sẽ cắm Echo vào đây |
| `routes/dashboard/conversation/ConversationView.vue` + `conversation.routes.js` | `dashboard/conversation/ConversationView.tsx` + `routes/web.php` | 5 route: dashboard (home) / conversations/{id} / inbox/{inboxId}(/conversations/{id}) / team/{teamId}(/conversations/{id}). Bỏ: expanded layout (conversation_display_type), ConversationSidebar/SidepanelSwitch (B11), CmdBar (B10), mentions/participating/unattended/label/custom_view routes (B7/B8/B11/E1 — URL con giữ qua placeholder) |
| `sidebar/Sidebar.vue` `teams/getMyTeams` + `sortedTeams` + `helper/URLHelper.conversationUrl` | `SetCurrentAccount` share `teams` (member-only, `lower(name) ASC` = tiebreak alphabetical của sortSidebarItems khi unread 0) → `menuItems.ts` nhóm Teams leaf `to: team/{id}` (label = name, không icon như gốc) + `URLHelper.conversationUrl` (ưu tiên inbox → team) | Finding #1 pixel-diff 02/09: sót từ A6, lộ khi có menu Conversations. Unread badge theo team = B8 |
| `WootWriter/Editor.vue` (ProseMirror) | `dashboard/components/widgets/WootWriter/Editor.tsx` | GIỮ NGUYÊN engine `@chatwoot/prosemirror-schema@1.4.1` (quyết định plan — không viết lại): MessageMarkdownTransformer/Serializer + buildEditor + schema theo FORMATTING (Channel::Api: strong/em; note: đủ bộ); Enter/Cmd+Enter gửi theo `ui_settings.editor_message_key`; style gốc port vào `resources/scss/_editor.scss` (kể cả base.scss của package — biến `--space-*`/`--w-*` KHÔNG định nghĩa y như oracle, đừng "sửa giùm"). Bỏ ở B3: mention @ (B11), canned `/` (B10), variables (D1), macros (D3), emoji `:` (B10), upload ảnh inline (B9), copilot (EE) |
| `shared/helpers/MessageFormatter.js` + `markdownIt/link.js` | `shared/helpers/MessageFormatter.ts` | markdown-it 14.1.1 đúng version gốc + mention plugin + link attrs + image resize qua cw_image_width; render qua DOMPurify |
| `shared/components/FluentIcon/DashboardIcon.vue` + dashboard-icons.json | `shared/components/FluentIcon/FluentIcon.tsx` + copy nguyên json | bộ icon fluent inline SVG đầy đủ |
| `shared/helpers/timeHelper.js` | `shared/helpers/timeHelper.ts` | thêm messageStamp/messageTimestamp/dateFormat/shortTimestamp |
| i18n `en/conversation.json` + `en/chatlist.json` | copy nguyên văn + đăng ký; FILTER.TOOLTIP_LABEL trích từ advancedFilters.json | |

### Cột trái — ChatList

| Nguồn | Đích | Ghi chú |
|---|---|---|
| `components/ChatList.vue` | `conversation/chatlist/ChatList.tsx` | pageTitle: inbox.name → activeTeam.name → TAB_HEADING như gốc. Bỏ B3: custom views/folders, advanced filter modal (E1), bulk actions + BulkActionBar, delete dialog, mentions/participating/unattended |
| `components/ChatListHeader.vue` | `chatlist/ChatListHeader.tsx` | nhánh applied-filters/folders cắt; nút filter render giữ chỗ (bấm chưa mở) |
| `widgets/ChatTypeTabs.vue` | `chatlist/ChatTypeTabs.tsx` | tab Mine/Unassigned/All THẬT (counts từ finder meta); phím tắt Alt+N bỏ (B10) |
| `widgets/conversation/ConversationBasicFilter.vue` | `chatlist/ConversationBasicFilter.tsx` | status + sort THẬT, lưu `ui_settings.conversations_filter_by` như useUISettings |
| `search/SwitchLayout.vue` | `chatlist/SwitchLayout.tsx` | nút render, bấm không đổi layout (expanded layout cắt B3) |
| `components/ConversationList.vue` | `chatlist/ConversationList.tsx` | BỎ virtua Virtualizer → list thường; selector `[&>div:has(+div.active)]` tái hiện trên wrapper phẳng; load-more qua IntersectionObserver API |
| `components/ConversationItem.vue` | `chatlist/ConversationItem.tsx` | context menu chuột phải (B5/B6/B7) + expanded card bỏ; Cmd+click mở tab mới giữ |
| `widgets/conversation/ConversationCard.vue` | `components/widgets/conversation/ConversationCard.tsx` | checkbox chọn hover avatar bỏ (bulk C), VoiceCallStatus + SLACardLabel (EE), CardLabels (B7 — labels rỗng nên gốc cũng không render) |
| `widgets/conversation/MessagePreview.vue` | `.../MessagePreview.tsx` | getPlainText qua MessageFormatter; icon fluent lock-closed/arrow-reply/info |
| `widgets/InboxName.vue`, `ui/TimeAgo.vue`, `components-next/.../UnreadBadge.vue` + `CardPriorityIcon.vue`, `helper/conversationHelper.js` (getLastMessage) | cùng tên .tsx | TimeAgo tự refresh theo bậc phút/giờ/ngày như gốc, tooltip qua title |

### Cột giữa — ConversationBox

| Nguồn | Đích | Ghi chú |
|---|---|---|
| `widgets/conversation/ConversationBox.vue` | `conversation/conversationbox/ConversationBox.tsx` | không woot-tabs/DashboardAppFrame (dashboardApps nhóm D); header luôn `border-b !pt-2`; giữ `border-l` (layout condensed) |
| `widgets/conversation/ConversationHeader.vue` | `conversationbox/ConversationHeader.tsx` | copy #display_id + toast; inbox name inline (ChannelIcon + span) khi >1 inbox; bỏ SLACardLabel + ConversationCallButton (EE), icon HMAC (WebWidget C3), BackButton (expanded layout), snoozedReopenTime → dateFormat (B5 mới có snooze thật) |
| `widgets/conversation/MoreActions.vue` + `buttons/ResolveAction.vue` | `conversationbox/MoreActions.tsx` | đúng cấu trúc Resolve/Reopen/Open + chevron + ⋮; dropdown mở/đóng được, item CHƯA có hành vi (B5) |
| `widgets/conversation/EmptyState/*` (EmptyState/EmptyStateMessage/FeaturePlaceholder/Hotkey) | `conversationbox/EmptyState.tsx` | OnboardingView (admin 0 inbox) không port; ảnh no-chat(.dark).svg copy vào `public/assets/images/dashboard/` |
| `widgets/conversation/MessagesView.vue` | `conversationbox/MessagesView.tsx` | banner !can_reply (API_HOURS_WINDOW), spinner đầu list, fetch previous khi scrollTop<100 + giữ vị trí scroll (đo scrollHeight trước/sau), scroll đáy khi mở, unread badge line. Bỏ: typing (B4), label suggestions (EE), referral/Instagram banner (F), markMessagesRead (B8) |
| `widgets/conversation/ReplyBox.vue` | `conversationbox/ReplyBox.tsx` | REPLY/NOTE; API inbox: canSendPublicReply luôn true, `isEditorDisabled = !note && !can_reply` + placeholder MESSAGING_RESTRICTED_API; signature append/remove theo watch [flag, isPrivate] + giữ chữ ký sau khi gửi; send = nút hoặc Enter/Cmd+Enter theo `editor_message_key`. Bỏ: draft (B10), reply-to (B10/B11), attachments/audio (B9), email head/quoted (F1), WhatsApp templates (F5), canned/mention/variables (B10/B11/D1), copilot (EE), typing on/off (B4) |
| `conversation/ResizableEditorWrapper.vue` | `conversationbox/ResizableEditorWrapper.tsx` | forwardRef handle {toggleEditorExpand, resetEditorHeight, scheduleResetAfterSend}; containerHeight/topBannerHeight đo bằng ResizeObserver trong MessagesView thay useElementSize |
| `WootWriter/ReplyTopPanel.vue` | `conversationbox/ReplyTopPanel.tsx` | khối phải render theo cờ `captain_tasks` (mặc định bật): ✨ giữ pixel, ⤢ nối `toggleEditorSize` thật; Alt+P/Alt+L (B10) |
| `WootWriter/EditorModeToggle.vue` | `conversationbox/EditorModeToggle.tsx` | đo bề rộng 2 nhãn ResizeObserver, chip width+16/translate y gốc |
| `WootWriter/ReplyBottomPanel.vue` | `conversationbox/ReplyBottomPanel.tsx` | emoji + paperclip (giữ chỗ B9) + signature toggle THẬT (key `channel_api_signature_enabled` = slugifyChannel, merge ui_settings → PUT /api/v1/profile) + Send (label kèm (↵)/(CTRL/⌘ + ↵)); bỏ audio/video/article/templates/quoted |
| `ui/Banner.vue` | `conversationbox/Banner.tsx` | màu scheme + link đúng style scoped gốc (alert = bg-n-ruby-3 text-n-ruby-12) |
| `components-next/message/MessageList.vue` | `components-next/message/MessageList.tsx` | slot → props ReactNode; Message là con TRỰC TIẾP của `<ul>` (CSS `.group-with-next + .message-bubble-container` cần sibling — bẫy wrapper); grouping cùng sender + cùng type + cùng phút |
| `components-next/message/Message.vue` | `Message.tsx` | map snake_case→camel tại chỗ (không camelize toàn payload); variant private/error/bot/agent/user/activity; orientation + grid + avatar phải khi outgoing (chỉ khi !groupWithNext). Bỏ: context menu tin nhắn, MessageError/retry (SendReplyJob D4), highlight ?messageId (E2), bubble media/email/CSAT/form/location… (B9/C5/F) |
| `components-next/message/provider.js` | `provider.tsx` | React createContext thay provide/inject; thêm `channelType` vào context (gốc đọc inbox từ store) |
| `components-next/message/constants.js` | `constants.ts` | re-export từ spine + SENDER_TYPES |
| `MessageMeta.vue` / `MessageStatus.vue` | `MessageMeta.tsx` / `MessageStatus.tsx` | nhánh API inbox: sent=check, delivered/read=check-check (read #7EB6FF), progress=đồng hồ xoay 500ms; khóa private i-lucide-lock-keyhole; nhánh kênh khác port cùng driver F |
| `bubbles/Base.vue` / `Activity.vue` / `Text/Index.vue` + `FormattedContent.vue` | `bubbles/Base.tsx` / `Activity.tsx` / `Text.tsx` | FormattedContent = MessageFormatter + DOMPurify (`prose prose-bubble`); empty → NO_CONTENT; Activity tooltip title; `.prose-bubble p:last-child{mb:0}` (style global của Text/Index.vue) vào _editor.scss |
| `WootWriter/constants.js` | `components/widgets/WootWriter/constants.ts` | CHAR_LENGTH_WARNING + re-export REPLY_EDITOR_MODES |

## Khác biệt cố ý frontend (pixel-diff cần biết)

00. **Đợt "mọi nút phải phản ứng" (lệnh founder 02/09) — trạng thái từng nút trên `/conversations/{id}`:**
   - ⇥ SwitchLayout: THẬT — `toggleConversationLayout` lưu `ui_settings.conversation_display_type` (+ `previously_used_…`) qua `updateUISettings` (1 điểm, `composables/useUISettings.ts`), state trong ConversationContext; expanded = list `basis-full`, ẩn list khi đã chọn conversation, ConversationBox bỏ border-l + BackButton (`conversationListPageURL` port). Khác biệt: `ConversationCardExpanded` (card dạng hàng rộng ở lg) CHƯA port — list expanded vẫn dùng card condensed (nhóm sau nếu cần pixel).
   - ⤢ maximize: THẬT (ResizableEditorWrapper, đợt trước).
   - Chữ ký: THẬT — bật/tắt lưu `channel_api_signature_enabled`, gắn/gỡ chữ ký trong editor; agent chưa có chữ ký → `MessageSignatureMissingAlert` port (link `profile/settings`) như gốc.
   - Đính kèm: input file ẩn (accept `ALLOWED_FILE_TYPES` port, multiple) → `checkFileSizeLimit` 40MB (`FileHelper.ts` port) + toast FILE_SIZE_LIMIT → `AttachmentsPreview` port (thumb dataURL, gỡ từng tệp, `is-focused` khi có tệp, nút Send bật dù chưa gõ như gốc). Khác biệt: gửi KHÔNG upload (B9) — toast `UPLOADING_ATTACHMENTS` rồi xóa danh sách; drag-drop/paste tệp chưa có.
   - Bộ lọc: `components-next/filter/*` port (ConversationFilter, ConditionRow, FilterSelect/MultiSelect/SingleSelect, operators, filterHelper, filterAttributeIcons, validations, languages) — modal teleport vào `#conversationFilterTeleportTarget` (createPortal), click-outside bỏ qua nút toggle, thêm/xóa dòng, AND/OR, validate + wiggle lỗi. Nguồn attribute: status/priority/display_id/created_at/last_activity_at/browser_language/referer tĩnh; assignee GET /agents; inbox/team từ shared props; contact asyncSearch GET /contacts/search; labels/campaigns/custom attributes rỗng (B7/C/E1). Khác biệt: Apply chỉ validate + đóng, CHƯA gọi POST /conversations/filter (E1); MultiTextInput không port (không có trong bộ mặc định); EmojiIcon team/label không render (chưa share icon).
   - ✨ copilot: `CopilotMenuBar` port (khối theo nội dung + khối chung, submenu hover Change tone, nút toggle đổi nền `bg-n-violet-3`, click-outside đóng). Khác biệt: chọn item chỉ đóng menu (tác vụ captain nhóm sau); submenu luôn `left-full` (gốc tính theo useWindowSize).
   - `#id`: đã có copy + toast từ trước; thêm try/catch như gốc (clipboard headless không quyền → im lặng).
   - Mic: placeholder theo cờ (đợt trước; headless chết cả hai bên).
   - **Panel contact (finding cuối 02/09):** `SidepanelSwitch` port (nút `i-ph-user-bold` nổi `absolute top-36 xl:top-24 right-2 !z-20` trong `conversation-details-wrap relative` — trước đó KHÔNG render nên `elementFromPoint` trúng list) → lưu `is_contact_sidebar_open` (+ tắt `is_copilot_panel_open`); nút Copilot chỉ khi `captain_integration` (tắt). `ConversationSidebar` port (320/360px md+, drawer + click-outside đóng trên màn < 1024). `ContactPanel` shell: `SidebarActionsHeader` (đóng = tắt cờ) + `ContactInfo` + accordion đúng tên/thứ tự gốc (`conversation_sidebar_items_order` + cờ `is_*_open` lưu ui_settings; `AccordionItem` port với FluentIcon add/subtract solid): Conversation Actions / Macros (cờ `macros`) / Conversation Information / Contact Attributes / Contact Notes / Attachments / Previous Conversations / Conversation participants. Khác biệt: thân accordion rỗng (ConversationAction B5/B6, Macros D3, Info/CustomAttributes E1, Notes/Participants/SharedFiles/ContactConversations nhóm sau); linear/shopify bỏ; kéo thả sắp xếp bỏ; ContactInfo (fix 4 finding pixel 02/09): nạp contact đầy đủ GET /contacts/{id} (contacts/show gốc) → ⓘ tooltip `Created {dynamicTime(created_at)}` + cờ quốc gia `Flag` từ `country_code` (🌎 khi thiếu) đúng `findCountryFlag`; sửa inline email/phone/company qua PATCH contact (B2), copy; **4 nút đủ như gốc**: New message → `ComposeConversation` port (Popover port `components-next/popover/Popover.tsx`; form rút về contactId cố định: chip To, Via chọn inbox từ shared inboxes — contactable_inboxes chưa port, editor + emoji + chữ ký, Discard, Send THẬT POST /conversations {inbox_id, contact_id, message} rồi mở conversation; bỏ tìm/tạo contact, Email/WhatsApp/Twilio options, đính kèm, copilot), Edit → trang contact (EditContact modal nhóm sau), Merge → `ContactMergeModal` port (ComboBox thêm `useApiResults`/`onSearch`, tìm GET /contacts/search, tóm tắt hợp nhất, validate; nút Merge chỉ đóng — POST merge nhóm sau), Delete → dialog B2. Call (EE) không render. `AccordionItem`: bỏ ô giữ chỗ icon (EmojiOrIcon gốc với icon rỗng không render gì). Vòng cuối: sửa tên inline port (click tên/✎ → input, Enter/blur PATCH name, Esc hủy; nút ✎ `opacity-0 -mx-1` hiện khi hover — chính khoảng ~50px giữa tên và ⓘ↗ của gốc); accordion đóng mặc định khi thiếu `is_*_open` (vitest `ContactPanel.test.tsx` mock context + `AccordionItem.test.tsx` 2 case) — nếu thấy mở là do audit đã bấm từng `+` (mỗi toggle PUT true vào ui_settings). Chưa port: SocialIcons, mô tả.
   - EditorModeToggle pill: sửa đo `contentBoxWidth` (offsetWidth − padding) = `useElementSize` contentRect gốc; `chipGeometry` thuần + vitest 2 mode.

0. **Fix finding #2-#4 pixel-diff 02/09 (ReplyBox):** (a) `ResizableEditorWrapper.vue` → `conversationbox/ResizableEditorWrapper.tsx` port THẬT (DEFAULT 120 / MIN 80 / max = container − 200 − panel, kéo grip, dblclick reset, ⤢ toggleEditorExpand, reset 120ms sau gửi qua callback `onMessageSent` thay bus MESSAGE_SENT; bỏ `requestEditorHeight` — chỉ CopilotEditor dùng) + rule `.resizable-editor-wrapper .resizable-editor-body { height: clamp(...) }` port vào `_editor.scss` — trước đó thiếu rule này nên editor chỉ ~30px (rule `min-h-[5rem]` của `.ProseMirror-woot-style` bị `:not(...)` loại cả ở gốc vì EditorView gắn `resizable-editor-body`). (b) ReplyTopPanel khối phải theo cờ `captain_tasks` (`isCloudFeatureEnabled` = tra `account.features`, mặc định bật): ✨ giữ pixel (CopilotMenuBar nhóm captain sau), ⤢ nối thật. (c) ReplyBottomPanel nút mic `i-ph-microphone` giữ pixel theo `voice_recorder` + `showFileUpload` (API inbox true) + ẩn khi private note; AudioRecorder thật = B9.

1. Nút **filter** (list-filter) + **SwitchLayout** + **paperclip** render đúng chỗ, bấm không có hành vi (advanced filter E1, expanded layout, attachments B9). MoreActions/Resolve: nút + dropdown đúng pixel, item không hành vi (B5).
2. **EmojiIconPicker dùng bản portal A6** thay `.emoji-dialog` absolute (gốc bị khung cuộn xén — pattern founder đã duyệt ở A6); picker đóng ngay sau khi chọn 1 emoji (gốc mở tới khi clickaway). Nút emoji bọc thêm 1 `div.flex` làm anchor (NextButton không forward ref) — pixel không đổi.
3. **Không realtime** (B4): tin inbound mới hiện sau F5 (đúng phạm vi B3); typing/presence chưa có; unread badge không tự mất khi xem (update_last_seen B8).
4. **Không draft** (B10): đổi conversation là editor reset (giữ chữ ký nếu đang bật).
5. **Virtualizer (virtua) bỏ** — list thường + IntersectionObserver; hiệu ứng xóa border-top trước card active tái hiện trên wrapper phẳng.
6. **Checkbox chọn conversation khi hover avatar** không render (bulk actions nhóm C).
7. Banner hết cửa sổ trả lời: shared props `inboxes` chưa mang `additional_attributes` nên khi channel đặt `agent_reply_time_window`, message hiển thị fallback API_HOURS_WINDOW với hours rỗng (editor vẫn khóa đúng theo can_reply); bổ sung khi cần ở B4+.
8. Scroll-to-bottom dùng `scrollTop = scrollHeight` thay calculateScrollTop + querySelector `.message--read/--unread` (2 class này đã stale ngay trong bản gốc — components-next Message không còn gán chúng).
9. Tab đầu vào mặc định = Mine (như gốc); danh sách conversation của tab hiện tại rỗng thì EmptyState cột phải hiện NO_MESSAGE_1 (gốc đọc store tổng — tương đương ở lần tải đầu).
10. `#display_id` trong header + timestamps + token/uuid là dữ liệu lệch tự nhiên giữa 2 bên khi pixel-diff — che vùng hoặc seed trùng.

## Gate (01/09/2026)

- Pest toàn suite: **387/387** xanh (262 cũ + 125 mới, không `--parallel`).
- `npx tsc --noEmit` sạch; `npm run build` xanh (vite); `vendor/bin/pint --test` sạch.
- Curl token API: tạo conversation + inbound (display 4), inbound bổ sung vào conversation có sẵn, token sai → 401, counts finder đúng.
- E2E trình duyệt (login john@acme.inc, làm thật trọn vòng): mở dashboard → tab Mine/Unassigned/All (counts đúng, đổi tab refetch) → mở conversation từ card (URL `/conversations/4`) → bubble inbound trái (bg-n-slate-4) → trả lời bằng nút Send VÀ hotkey Ctrl+Enter → bubble phải xanh (bg-n-solid-blue), 2 tin cùng phút GỘP NHÓM (group-with-next, avatar chỉ ở tin cuối) → Private Note (toggle trượt, editor amber `is-private`, nút signature ẩn, label "Add Note") → note lưu `private=true`, bubble amber (bg-n-solid-amber) + khóa lock-keyhole → curl inbound mới → **F5 + deep-link reload: đủ 5 tin persistence**, unread badge "2 Unread Messages" → inbox view `/inbox/1` (title api-test, lọc theo inbox) → DB kiểm: sender đúng morph (Contact/User), first_reply_created_at SET sau reply đầu, waiting_since NULL sau reply, last_activity_at = tin cuối. Console 0 lỗi.
- Ghi chú e2e: click vật lý qua browser-pane có lúc không dispatch khi pane không hiển thị (screenshot cũng timeout vì không compositing) — xác minh lại bằng JS click; không phải bug app.

## Gate (02/09/2026 — đợt nút bấm + pill EditorModeToggle)

- Pest 390/390 · vitest **5/5** (MessageList 2 + EditorModeToggle 3) · tsc · build · pint xanh.
- i18n: key `FILTER.*` (advancedFilters.json) + `INTEGRATION_SETTINGS.OPEN_AI.REPLY_OPTIONS.*` do agent `yona-i18n` sở hữu/migrate vào `lang/en/*.php` (không commit `resources/js/i18n/` từ phiên này).

## Gate (02/09/2026 — precision 6 + test render note)

- Migration precision chạy trên `yona_rw` (45 cột → 6), 5 tin display 4 giữ nguyên (chờ phiên kiểm chứng đặt lại micro-giây y oracle).
- Pest **390/390** (+1 equivalence micro-giây) · `npx tsc` · `npm run build` · pint xanh.
- **vitest mới cắm** (`npm test` = `vitest run`, jsdom + @testing-library/react, alias như vite.config): `components-next/message/MessageList.test.tsx` 2 case — note giữa cụm outgoing cùng phút: amber chỉ trên note, meta/khóa ẩn vì còn gộp với tin kế (đúng `shouldShowMeta = !shouldGroupWithNext` của Base.vue gốc); note đóng cụm (tin kế là inbound): amber + khóa hiện. Kết luận: style lấy từ `private` của CHÍNH tin; "mất khóa" chỉ do thứ tự sai đẩy note vào giữa cụm.

## Gate (02/09/2026 — fix finding #1 pixel-diff: nhóm Teams sidebar)

- Pest toàn suite **389/389** (+2: `tests/Feature/App/TeamConversationsPageTest.php` — share teams member-only/sort/scope account, route team + team/conversations) + `npx tsc` + `npm run build` + pint xanh.
- Trình duyệt: phiên code không tự nhập mật khẩu vào form login (ràng buộc an toàn) → xác nhận hình ảnh nhóm Teams > support do phiên kiểm chứng chấm trên phiên đã đăng nhập.
