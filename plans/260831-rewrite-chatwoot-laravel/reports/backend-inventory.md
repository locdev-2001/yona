# Kiểm kê Domain Model Backend — Chatwoot v4.17.1

> Báo cáo agent kiểm kê 31/08/2026. Nguồn: `refs/chatwoot/db/schema.rb` (version `2026_08_14_000000`, 98 bảng), `app/models/` (111 file), `config/initializers/`, `config/features.yml`, `lib/events/types.rb`. Không mở file nào dưới `enterprise/`.

**PostgreSQL extensions bắt buộc:** `pg_stat_statements`, `pg_trgm` (search GIN trigram), `pgcrypto` (`gen_random_uuid()`), `plpgsql`, `vector` (pgvector — chỉ EE dùng).

---

## 1. Danh sách 98 bảng theo domain

### 1.1 Accounts & Users (11 bảng)

| Bảng | Vai trò | Cột đặc biệt |
|---|---|---|
| `accounts` | Tenant gốc | `feature_flags` + `feature_flags_ext_1` bigint bitset (FlagShihTzu), `limits` jsonb, `custom_attributes` jsonb, `internal_attributes` jsonb, `settings` jsonb (auto_resolve_*, captain_*, reporting_timezone), enum `locale`, enum `status {active:0, suspended:1}`. **PG trigger** `accounts_after_insert_row_tr` tạo sequence `conv_dpid_seq_<id>` và `camp_dpid_seq_<id>` |
| `users` | Tài khoản đăng nhập (Devise + devise_token_auth) | `tokens` json, `ui_settings` jsonb, `custom_attributes` jsonb, `type` → **STI** (`SuperAdmin < User`), enum `availability {online, offline, busy}`, `pubsub_token` unique (ActionCable), 2FA: `otp_secret`/`otp_backup_codes`/`otp_required_for_login`/`consumed_timestep` |
| `account_users` | Join user↔account + role | enum `role {agent:0, administrator:1}`, enum `availability`, `auto_offline`, `inviter_id`, `custom_role_id` (EE), `agent_capacity_policy_id` (EE), unique `(account_id, user_id)` |
| `user_sessions` | Theo dõi phiên/thiết bị | `client_id`, geo, UA parsed, `last_activity_at` |
| `access_tokens` | API token đa chủ thể | **polymorphic** `owner` (User, AgentBot, PlatformApp), `token` unique |
| `teams` | Nhóm agent | `allow_auto_assign`, `icon`/`icon_color`, unique `(name, account_id)` |
| `team_members` | Join team↔user | unique `(team_id, user_id)` |
| `leaves` | Nghỉ phép agent — **bảng orphan, KHÔNG có model Ruby** → bỏ qua khi port | enum-int `leave_type`, `status` |
| `assignment_policies` | Chính sách gán conversation | enum `assignment_order {round_robin:0}` (EE mở rộng), enum `conversation_priority {earliest_created, longest_waiting}`, `fair_distribution_limit`/`_window`, `exclude_older_than_hours` |
| `inbox_assignment_policies` | Join inbox↔policy | unique index `inbox_id` |
| `agent_capacity_policies` | **EE** | `exclusion_rules` jsonb |

### 1.2 Inboxes & Channels (16 bảng)

`inboxes` trung tâm, **polymorphic `belongs_to :channel`**.

| Bảng | Vai trò | Cột đặc biệt |
|---|---|---|
| `inboxes` | Hộp thư/kênh thuộc account | polymorphic `channel_type`+`channel_id`, `auto_assignment_config` jsonb, `csat_config` jsonb, enum `sender_name_type {friendly:0, professional:1}`, `working_hours_enabled`, `lock_to_single_conversation`, `portal_id` |
| `inbox_members` | Join inbox↔user | unique `(inbox_id, user_id)` |
| `inbox_capacity_limits` | **EE** | `conversation_limit` |
| `working_hours` | Giờ làm việc theo inbox | `day_of_week`, `open_hour/minutes`, `close_hour/minutes`, `closed_all_day`, `open_all_day` |
| `channel_web_widgets` | Widget web (live chat) | `feature_flags` int bitset (default 7), `pre_chat_form_options` jsonb, enum `reply_time`, `hmac_token` unique, `website_token` unique, `allowed_domains` |
| `channel_api` | Kênh API tùy biến | `additional_attributes` jsonb, `hmac_token` unique, `identifier` unique, `secret` |
| `channel_email` | Email (IMAP/SMTP/OAuth) | `provider_config` jsonb, cột IMAP/SMTP, `verified_for_sending`, `email` + `forward_to_email` unique |
| `channel_facebook_pages` | FB Messenger | `page_access_token`, `user_access_token`, `instagram_id` |
| `channel_instagram` | Instagram DM | `access_token`, `expires_at`, `instagram_id` unique |
| `channel_line` | LINE | `line_channel_id` unique, secret, token |
| `channel_sms` | SMS generic | `provider_config` jsonb, `phone_number` unique |
| `channel_telegram` | Telegram Bot | `bot_token` unique |
| `channel_tiktok` | TikTok Business | `access_token`/`refresh_token` + expiry |
| `channel_twilio_sms` | Twilio SMS/WhatsApp/Voice | enum `medium {sms:0, whatsapp:1}`, `content_templates` jsonb, `provider_config` jsonb, `voice_enabled` (EE), `twiml_app_sid` |
| `channel_twitter_profiles` | Twitter/X DM | `tweets_enabled`, unique `(account_id, profile_id)` |
| `channel_whatsapp` | WhatsApp Cloud / 360dialog | `provider_config` jsonb, `message_templates` jsonb, `phone_number_health` jsonb |

### 1.3 Conversations & Messages (9 bảng)

| Bảng | Vai trò | Cột đặc biệt |
|---|---|---|
| `conversations` | Hội thoại | enum `status {open:0, resolved:1, pending:2, snoozed:3}`, enum `priority {low, medium, high, urgent}`, `additional_attributes` + `custom_attributes` jsonb, `uuid`, `display_id` **per-account PG sequence trigger**, `cached_label_list`, polymorphic `ai_assignee` (`assignee_agent_bot_id` + `ai_assignee_type`), `waiting_since`, `first_reply_created_at`, `snoozed_until`, `status_changed_at`, `sla_policy_id` (EE) |
| `messages` | Tin nhắn | enum `message_type {incoming:0, outgoing:1, activity:2, template:3}`, enum `content_type {text, input_text, input_textarea, input_email, input_select, cards, form, article, incoming_email, input_csat, integrations, sticker, voice_call}`, enum `status {sent, delivered, read, failed}`, polymorphic `sender` (User/Contact/AgentBot), `content_attributes` json (in_reply_to, deleted, external_error, translations…), `external_source_ids` jsonb, `additional_attributes` jsonb, `sentiment` jsonb, `private` bool, GIN trgm index `content` |
| `attachments` | File đính kèm | enum `file_type {image, audio, video, file, location, fallback, share, story_mention, contact, ig_reel, ig_post, ig_story, embed}`, `meta` jsonb, coordinates, ActiveStorage `file` |
| `conversation_participants` | Agent theo dõi | unique `(user_id, conversation_id)` |
| `mentions` | @mention trong private note | `mentioned_at`, unique `(user_id, conversation_id)` |
| `contact_inboxes` | Định danh contact trong inbox | `source_id`, `hmac_verified`, `pubsub_token` unique (widget), unique `(inbox_id, source_id)` |
| `conversation_outcomes` | **EE (Captain)** | — |
| `calls` | **EE** voice | — |
| `action_mailbox_inbound_emails` | Rails ActionMailbox | `message_id` + `message_checksum` unique |

### 1.4 Contacts (3 bảng + csat)

| Bảng | Vai trò | Cột đặc biệt |
|---|---|---|
| `contacts` | Khách hàng cuối | enum `contact_type {visitor:0, lead:1, customer:2}`, `additional_attributes` + `custom_attributes` jsonb, `blocked`, `company_id` (EE), unique `(email, account_id)`, unique `(identifier, account_id)`, GIN trgm `(name, email, phone_number, identifier)`, index lower(email) |
| `notes` | Ghi chú nội bộ trên contact | `user_id` nullable |
| `companies` | **EE** | — |

### 1.5 Automation & Macros (4 bảng)

| Bảng | Vai trò | Cột đặc biệt |
|---|---|---|
| `automation_rules` | Luật tự động (event → conditions → actions) | `conditions` jsonb, `actions` jsonb, `event_name`, `execution_delay` (delayed automations), `active`, attach `files` |
| `automation_rule_pending_executions` | Hàng đợi automation trễ | enum `status {pending, processing, executed, skipped, executing}`, `due_at`, `episode_key` unique 3 cột, `skip_reason` |
| `macros` | Chuỗi hành động thủ công | enum `visibility {personal:0, global:1}`, `actions` jsonb, attach `files` |
| `canned_responses` | Reply mẫu `short_code` | — |

### 1.6 Campaigns (2 bảng)
- `campaigns`: enum `campaign_type {ongoing:0, one_off:1}`, `campaign_status {active, completed, processing}`, `trigger_rules` jsonb, `audience` jsonb, `template_params` jsonb, `display_id` per-account PG sequence, `trigger_only_during_business_hours`.
- `campaign_recipients`: **EE**.

### 1.7 Help Center / Portal (7 bảng)
- `portals` (`config` jsonb + JSON Schema validator, `ssl_settings`, `custom_domain` unique, `slug` unique, `channel_web_widget_id`, `archived`), `portals_members` (không PK), `categories` (self-ref `parent_category_id`, `associated_category_id` bản dịch, unique `(slug, locale, portal_id)`), `related_categories`, `folders`, `articles` (enum `status {draft, published, archived}`, `views`, `associated_article_id`, `slug` unique, `draft_title`/`draft_content`), `article_embeddings` (**EE**, vector 1536).

### 1.8 Reports / Events (2 bảng)
- `reporting_events`: `value` + `value_in_business_hours` float, `event_start_time`/`event_end_time`, index `(account_id, name, created_at)`.
- `reporting_events_rollups`: `dimension_type {account, agent, inbox, team}`, `metric {resolutions_count, first_response, resolution_time, reply_time, bot_resolutions_count, bot_handoffs_count}`, unique `(account_id, date, dimension_type, dimension_id, metric)`.

### 1.9 Integrations & Bots (4 bảng + apps.yml)
- `integrations_hooks` (enum `status`, `hook_type {account, inbox}`, `settings` jsonb, `app_id`), `agent_bots` (`bot_type {webhook}`, `bot_config` jsonb, `secret`, `outgoing_url`), `agent_bot_inboxes` (`status {active, inactive}`), `dashboard_apps` (`content` jsonb array).
- `Integrations::App` = PORO đọc `config/integration/apps.yml`: `webhook, dashboard_apps, openai, linear, notion, slack, dialogflow, google_translate, dyte, shopify, leadsquared`.

### 1.10 Data Import (4 bảng)
- `data_imports` (enum `status {pending, processing, completed, failed, completed_with_errors:6, abandoned:7}`, `import_types`/`source_metadata`/`stats`/`cursor` jsonb, attach `import_file` + `failed_records`), `data_import_items` (enum `status`, pseudo-polymorphic `chatwoot_record_*`, `attempt_count`), `data_import_mappings` (idempotency, unique 4 cột), `data_import_errors` (`details` jsonb).

### 1.11 Notifications (3 bảng)
- `notifications`: enum `notification_type {conversation_creation:1, conversation_assignment:2, assigned_conversation_new_message:3, conversation_mention:4, participating_conversation_new_message:5, sla_missed_*:6-8}`, 2 polymorphic `primary_actor` + `secondary_actor`, `meta` jsonb, `snoozed_until`, `read_at`, `last_activity_at`.
- `notification_settings`: `email_flags` + `push_flags` int bitset, unique `(account_id, user_id)`.
- `notification_subscriptions`: enum `subscription_type {browser_push:1, fcm:2}`, `subscription_attributes` jsonb, `identifier` unique.

### 1.12 CSAT (1 bảng)
- `csat_survey_responses`: `rating` 1-5, `feedback_message`, `assigned_agent_id`, `csat_review_notes` (EE feature), unique `message_id`. Config ở `inboxes.csat_survey_enabled` + `csat_config`; trigger = message `content_type: input_csat`.

### 1.13 Labels / Custom Attributes / Custom Filters (5 bảng)
- `labels` (metadata màu + sidebar, unique `(title, account_id)`), `tags` + `taggings` (acts_as_taggable_on; `tags.name` unique **toàn cục**, counter cache **đã tắt** tránh deadlock; taggable = Conversation/Contact, context `labels`), `custom_attribute_definitions` (enum `attribute_model {conversation, contact, company}`, `attribute_display_type {text, number, currency, percent, link, date, list, checkbox}`, `attribute_values` jsonb, regex), `custom_filters` (enum `filter_type {conversation, contact, report}`, `query` jsonb).

### 1.14 Webhooks (1 bảng)
- `webhooks`: enum `webhook_type {account, inbox}`, `subscriptions` jsonb (default: conversation_status_changed, conversation_updated, conversation_created, contact_created, contact_updated, message_created, message_updated, webwidget_triggered), `secret` HMAC, unique `(account_id, url)`.

### 1.15 Platform / SuperAdmin / Installation (5 bảng)
- `platform_apps`, `platform_app_permissibles` (polymorphic permissible: Account/AgentBot/User), `platform_banners` (OSS — SuperAdmin banner), `installation_configs` (key-value jsonb, `locked`), `email_templates` (`template_type {layout, content}`, 3 partial unique index theo scope installation/account/inbox; layout Liquid phải chứa `{{ content_for_layout }}`).
- `SuperAdmin` = STI của `User`.

### 1.16–1.18 Enterprise (30 bảng — SKIP)
SLA: `sla_policies`, `applied_slas`, `sla_events`. Captain AI: `captain_*` (9 bảng), `agent_sessions`, `conversation_outcomes`, `article_embeddings`. Copilot: `copilot_threads`, `copilot_messages`. RBAC/SSO/Audit: `custom_roles`, `account_saml_settings`, `audits`. Advanced assignment: `agent_capacity_policies`, `inbox_capacity_limits`. CRM: `companies`. Voice: `calls`. Campaign: `campaign_recipients`.

### 1.19 ActiveStorage (3 bảng Rails built-in)
`active_storage_blobs`, `active_storage_attachments` (polymorphic), `active_storage_variant_records`.

---

## 2. STI & Polymorphic

- STI thật duy nhất: `SuperAdmin < User` (cột `users.type`).
- Channel = "class table inheritance": 12 model `Channel::*` mỗi loại 1 bảng, include `Channelable` (`belongs_to :account`, `has_one :inbox, as: :channel, touch: true`). `channel_type` lưu tên class Ruby (`"Channel::WebWidget"`) → Laravel cần morph map alias.
- `Reauthorizable` trên các channel OAuth (đếm lỗi ở Redis, không DB).

Polymorphic đầy đủ: `Inbox.channel` (12 Channel), `Message.sender` (User/Contact/AgentBot), `Conversation.ai_assignee` (FK custom `assignee_agent_bot_id`), `Notification.primary_actor` + `secondary_actor`, `AccessToken.owner`, `PlatformAppPermissible.permissible`, `Tagging.taggable/tagger`, `ActiveStorage::Attachment.record`, `DataImportItem.chatwoot_record_*` (pseudo).

---

## 3. Cơ chế xuyên suốt

### 3.1 Multi-tenancy
- Không RLS/gem — enforce thủ công tầng controller/finder qua `account_id` (denormalize xuống cả `messages`, `attachments`, `mentions`…). `Current.account`/`Current.user` request scope. Account có ~40 `has_many dependent: :destroy_async`.
- **Per-account sequence**: `conversations.display_id` + `campaigns.display_id` sinh bởi PG trigger đọc `conv_dpid_seq_<account_id>` / `camp_dpid_seq_<account_id>` (tạo bởi trigger AFTER INSERT ON accounts). → Laravel: giữ trigger PG hoặc thay bằng counter table + lock.

### 3.2 Event dispatch (Wisper)
- `Dispatcher` singleton = `SyncDispatcher` + `AsyncDispatcher` (Wisper::Publisher), nạp listener ở `config/initializers/event_handlers.rb`.
- 11 listeners: `action_cable, agent_bot, automation_rule, campaign, csat_survey, hook, installation_webhook, notification, participation, reporting_event, webhook`.
- Event types (`lib/events/types.rb`, ~35 event): account.created/cache_invalidated; campaign.triggered; webwidget.triggered; conversation.created/updated/deleted/read/bot_handoff/opened/resolved/status_changed/contact_changed/unread_count_changed/typing_on/typing_off/mentioned; assignee.changed; team.changed; message.created/updated; first.reply.created; reply.created; contact.created/updated/merged/deleted; inbox.created/updated; notification.created/updated/deleted; agent.added/removed. (Captain/copilot events = EE.)
- Model dispatch trực tiếp trong `after_create_commit`/`after_update_commit`.

### 3.3 Feature flags (FlagShihTzu bitset)
1. Account: `feature_flags` + `feature_flags_ext_1` bigint (63 flag/cột), đọc `config/features.yml`, default theo `InstallationConfig ACCOUNT_LEVEL_FEATURE_DEFAULTS`.
2. Web widget: `channel_web_widgets.feature_flags` int (default 7).
3. Notification: `email_flags` + `push_flags`.
- Flag premium (EE): disable_branding, audit_logs, custom_tools, sla, help_center_embedding_search, captain_*, custom_roles, channel_voice, advanced_search(_indexing), saml, companies, csat_review_notes, conversation_required_attributes, advanced_assignment.
- Flag OSS chính: inbound_emails, channel_email/facebook/website/instagram/tiktok, help_center, agent_bots, macros, labels, custom_attributes, automations, canned_responses, integrations, campaigns, reports, crm/crm_v2, auto_resolve_conversations, report_rollup, assignment_v2, whatsapp_*, delayed_automations, data_import, api_and_webhooks, unread_count_for_filters, search_with_gin.

### 3.4 ActiveStorage (8 điểm)
`Attachment.file`, `Account.contacts_export`, `Portal.logo`, `DataImport.import_file` + `failed_records`, `AutomationRule.files`, `Macro.files`, `Avatarable.avatar` (User/Contact/Inbox/AgentBot — max 15MB, jpeg/png/gif/webp, Gravatar fetch job).

### 3.5 ActionCable
- Redis adapter, một channel duy nhất `RoomChannel`, auth bằng `pubsub_token`: `users.pubsub_token` (rotate khi đổi password) + `contact_inboxes.pubsub_token` (widget).
- `ActionCableListener` broadcast mọi event, payload từ `push_event_data`/`PushDataHelper`. `OnlineStatusTracker` presence trong Redis.

### 3.6 Cơ chế phụ
- EE injection: `prepend_mod_with`/`include_mod_with`/`extend_mod_with` — điểm nối EE ở cuối model OSS (skip).
- Liquid templating: `Liquidable` trên Message; EmailTemplate layout `{{ content_for_layout }}`.
- JSON Schema validation: `AccountSettingsSchema`, `PortalConfigSchema`; `JsonbAttributesLengthValidator` trên Conversation.
- Searchkick/ES: chỉ feature premium.
- `destroy_async` khắp nơi; schema chỉ có 8 FK thật.
- Concerns đáng port: Featurable, Pubsubable, Avatarable, Labelable, Reportable, AccessTokenable, Channelable, AssignmentHandler, AutoAssignmentHandler, ActivityMessageHandler (+con), OutOfOffisable, Reauthorizable, SortHandler, MessageFilterHelpers, ConversationMuteHelpers, PushDataHelper, CacheKeys, AccountCacheRevalidator, Liquidable, WebhookSecretable, SsoAuthenticatable, AvailabilityStatusable, InboxAgentAvailability, InboxBotStatus, EmailAddressParseable, ContentAttributeValidator…

---

## 4. Cột EE trong bảng core (giữ bảng, bỏ cột hoặc để null)
`account_users.custom_role_id/agent_capacity_policy_id`; `conversations.sla_policy_id/ai_assignee_type(Captain)`; `contacts.company_id`; `csat_survey_responses.csat_review_notes*`; `channel_twilio_sms.voice_*`; `accounts.settings.captain_*`; `messages.content_type: voice_call`.

## Tổng kết
- 98 bảng − 30 EE − 3 ActiveStorage − 2 taggable − 1 ActionMailbox ≈ **62 bảng nghiệp vụ OSS cần port**.
- 111 model OSS: 12 Channel, 41 concern, 1 STI, ~10 polymorphic.
- 3 phụ thuộc PG đặc thù: per-account sequence trigger, bitset feature flags, pgvector (EE — bỏ).
- Bảng `leaves` orphan (không model) → bỏ. `audits` chỉ chạy ở EE → bỏ.
