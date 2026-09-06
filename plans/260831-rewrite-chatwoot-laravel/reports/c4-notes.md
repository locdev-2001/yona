# C4 — Campaigns ongoing (livechat) — ghi chú (agent `c4`)

## Hợp đồng API (chốt)

### Dashboard — `/api/v1/accounts/{accountId}/campaigns` (administrator only, 401 nếu agent)

| Method + path | Body | Trả về |
|---|---|---|
| `GET /campaigns` | — | mảng bản ghi campaign (KHÔNG bọc `payload`) |
| `POST /campaigns` | xem dưới | bản ghi vừa tạo |
| `GET /campaigns/{id}` | — | bản ghi |
| `PATCH /campaigns/{id}` | như POST, mọi khoá `sometimes` | bản ghi |
| `DELETE /campaigns/{id}` | — | `200`, body rỗng |

`{id}` là **display_id per-account** (sinh bằng PG trigger đọc `camp_dpid_seq_<account_id>`),
KHÔNG phải khoá chính — y hệt `conversations`.

Body tạo/sửa (nhận cả dạng phẳng lẫn bọc trong khoá `campaign`, đúng ParamsWrapper của Rails):

```jsonc
{
  "title": "c4 pricing greeting",          // bắt buộc khi tạo
  "message": "Hi there! …",                // bắt buộc khi tạo
  "inbox_id": 22,                          // bắt buộc khi tạo; phải cùng account + kênh hỗ trợ
  "sender_id": 1,                          // tuỳ chọn, null = Bot; phải là thành viên account
  "enabled": true,
  "trigger_only_during_business_hours": false,
  "trigger_rules": { "url": "https://…/pricing", "time_on_page": 5 },
  "description": null,
  "audience": [{ "type": "Label", "id": 4 }],   // one_off (E4)
  "scheduled_at": "2026-09-08T00:00:00Z",       // one_off (E4)
  "template_params": {}                          // WhatsApp (F5)
}
```

Bản ghi trả về (`_campaign.json.jbuilder`):

```jsonc
{
  "id": 1,                       // display_id
  "title": "…", "description": null, "account_id": 2,
  "inbox": { …InboxResource đầy đủ… },
  "sender": {} | { …AgentResource… },   // KHÔNG có sender thì là object RỖNG, không phải null
  "message": "…", "template_params": null,
  "campaign_status": "active",   // chuỗi: active | completed | processing
  "enabled": true,
  "campaign_type": "ongoing",    // chuỗi: ongoing | one_off
  "trigger_rules": { "url": "…", "time_on_page": 5 },
  "trigger_only_during_business_hours": false,
  "created_at": "2026-09-06T02:20:39.751Z",   // ISO8601 mili giây UTC (as_json của Rails)
  "updated_at": "…"
}
```

`scheduled_at` / `started_at` / `completed_at` / `audience` **chỉ có khi `campaign_type = one_off`**
(jbuilder rẽ nhánh) — đừng "sửa cho đều".

Lỗi:

| Ca | Kết quả |
|---|---|
| agent (không phải admin) | `401` |
| `inbox_id` của account khác / không tồn tại | `422` |
| inbox kênh không thuộc `['Website','Twilio SMS','Sms','Whatsapp']` | `422` `Unsupported Inbox type` |
| `sender_id` không thuộc account | `422` |
| `trigger_rules.url` không bắt đầu bằng `http(s)://` trên inbox Website | `422` `invalid` |
| sửa campaign đã `completed` (không đổi `campaign_status`) | `422` `The campaign is already completed` |

### Widget — `GET /api/v1/widget/campaigns?website_token=…`

Không cần `X-Auth-Token` (bản gốc `skip_before_action :set_contact` — widget hỏi campaign TRƯỚC khi
có phiên khách). Trả `[]` khi account tắt cờ `campaigns`. Chỉ campaign `enabled = true` của inbox đó.

```jsonc
[{
  "id": 1,                                     // display_id
  "trigger_rules": { "url": "…", "time_on_page": 5 },
  "trigger_only_during_business_hours": false,
  "message": "…",
  "sender": null | { "id": 1, "name": "John", "available_name": "John", "avatar_url": "",
                     "type": "user", "availability_status": null, "thumbnail": "" }
}]
```

`availability_status` = **null** (request widget không có `Current.account`) — trả `'offline'` sẽ vẽ
thừa một chấm trạng thái xám trên avatar, lệch pixel với oracle (đã đo).

### Widget kích hoạt campaign

Dùng lại đúng endpoint sự kiện đã có: `POST /api/v1/widget/events`

```jsonc
{ "name": "campaign.triggered",
  "event_info": { "campaign_id": <display_id>, "custom_attributes": {…},
                  "initiated_at": { "timestamp": "…" }, "referer": "…" } }
```

`CampaignListener` nhận event → `Campaigns\CampaignConversationBuilder` khoá `contact_inbox`, từ chối
nếu phiên ĐÃ có hội thoại, rồi tạo `Conversation(campaign_id)` + 1 tin `outgoing` mang
`additional_attributes.campaign_id`, người gửi = `campaign.sender` (null = bot).

---

## Bảng trace Ruby ↔ PHP

| Nguồn Chatwoot | Đích Laravel | Ghi chú |
|---|---|---|
| `db/schema.rb` bảng `campaigns` | `database/migrations/2026_09_06_900000_create_campaigns_table.php` | đủ cột + 3 index + FK `conversations.campaign_id` (nullOnDelete) |
| trigger `camp_dpid_seq_<account_id>` (`campaign.rb` khối `trigger.before(:insert)`) | cùng migration, `campaigns_before_insert_row_tr` | sequence đã được migration accounts tạo sẵn từ Sóng 0 |
| `app/models/campaign.rb` | `app/Models/Campaign.php` | enum → hằng số + `typeName()/statusName()`, `ensure_correct_campaign_attributes` → hook `saving` |
| `validate_campaign_inbox` / `inbox_must_belong_to_account` / `sender_must_belong_to_account` / `validate_url` | `Campaign::validationRules()` | luật khai ở model, controller chỉ ghép vào `validate()` — một nguồn cho mọi cửa vào |
| `prevent_completed_campaign_from_update` | hook `saving` ném `ValidationException` | giữ ở model để MỌI đường ghi bị chặn; HTTP tự cho ra 422 |
| `before_update :set_completed_at` | hook `saving` | |
| `Inbox#inbox_type` | `Inbox::inboxType()` | `channel->name()` — 'Website' / 'API' |
| `Account#campaigns`, `Inbox#campaigns`, `Conversation#campaign` | quan hệ cùng tên | |
| `api/v1/accounts/campaigns_controller.rb` + `campaign_policy.rb` | `app/Http/Controllers/WebApi/CampaignsController.php` | 5 action, `authorizeAdministrator` |
| `api/v1/models/_campaign.json.jbuilder` | `app/Http/Resources/CampaignResource.php` | |
| `api/v1/widget/campaigns_controller.rb` + `widget/campaigns/index.json.jbuilder` | `app/Http/Controllers/Widget/CampaignsController.php` | shape gọn 5 khoá, không dùng CampaignResource |
| `app/listeners/campaign_listener.rb` | `app/Listeners/CampaignListener.php` | Laravel tự đăng ký qua event discovery |
| `app/builders/campaigns/campaign_conversation_builder.rb` | `app/Builders/Campaigns/CampaignConversationBuilder.php` | `with_lock` → `lockForUpdate()` trong `DB::transaction` |
| `messages/message_builder.rb#campaign_id` | `MessageBuilder::messageParams()` | `additional_attributes.campaign_id` |
| `spec/models/campaign_spec.rb` | `tests/Feature/Models/CampaignTest.php` (13 test) | |
| `spec/controllers/api/v1/accounts/campaigns_controller_spec.rb` | `tests/Feature/WebApi/CampaignsControllerTest.php` (20 test) | |
| `spec/controllers/api/v1/widget/campaigns_controller_spec.rb` | `tests/Feature/Widget/CampaignsControllerTest.php` (5 test) | |
| `spec/builders/campaigns/campaign_conversation_builder_spec.rb` | `tests/Feature/Builders/CampaignConversationBuilderTest.php` (5 test) | |
| `spec/listeners/campaign_listener_spec.rb` | `tests/Feature/Listeners/CampaignListenerTest.php` (3 test) | thêm 1 ca end-to-end qua HTTP `/widget/events` |
| `spec/factories/campaigns.rb` | `database/factories/CampaignFactory.php` | mặc định inbox kênh Website |

### Vue ↔ React

| Nguồn Chatwoot (`app/javascript/`) | Đích Yona (`resources/js/`) | Ghi chú |
|---|---|---|
| `dashboard/routes/dashboard/campaigns/campaigns.routes.js` | `routes/web.php` (`/campaigns`, `/campaigns/ongoing` → `/campaigns/live_chat`) | tab SMS/WhatsApp thuộc E4/F5 |
| `campaigns/pages/CampaignsPageRouteView.vue` + `LiveChatCampaignsPage.vue` | `dashboard/campaigns/LiveChat.tsx` | store vuex `campaigns` → fetch tại màn (cùng lối settings/labels) |
| `components-next/Campaigns/CampaignLayout.vue` | `dashboard/components-next/Campaigns/CampaignLayout.tsx` | `v-on-click-outside` → listener `mousedown`, vẫn bỏ qua backdrop ProseMirror |
| `…/Pages/CampaignPage/CampaignList.vue` | `…/Campaigns/Pages/CampaignPage/CampaignList.tsx` | |
| `…/CampaignCard/CampaignCard.vue` + `LiveChatCampaignDetails.vue` | `…/Campaigns/CampaignCard/{CampaignCard,LiveChatCampaignDetails}.tsx` | chỉ nhánh live chat |
| `…/LiveChatCampaign/{LiveChatCampaignDialog,EditLiveChatCampaignDialog,LiveChatCampaignForm}.vue` | 3 file cùng tên `.tsx` | vuelidate → `campaignFormErrors()` thuần |
| `…/Pages/CampaignPage/ConfirmDeleteCampaignDialog.vue` | cùng tên `.tsx` | |
| `…/EmptyState/{LiveChatCampaignEmptyState.vue,CampaignEmptyStateContent.js}` | cùng tên `.tsx`/`.ts` | |
| `widget/store/modules/campaign.js` | `widget/store/widgetStore.ts` (khối campaign) | 1 chỗ quyết định: `resetCampaignTimers()` |
| `widget/helpers/campaignHelper.js` | `widget/helpers/campaignHelper.ts` (+ test) | dùng `urlpattern-polyfill` như bản gốc |
| `widget/helpers/campaignTimer.js` | `widget/helpers/campaignTimer.ts` (+ test) | nhận callback thay vì `store.dispatch` |
| `shared/helpers/cache.js` (+ `LocalStorage`) | `shared/helpers/cache.ts` | nhớ đệm campaign 1 giờ theo website token |
| `widget/api/campaign.js` + `endPoints.js` (`getCampaigns`/`triggerCampaign`) | `widget/api/widget.ts` | gom `generateEventParams` thành `eventParams()` dùng chung với `createEvent` |
| `widget/views/Campaigns.vue` | `widget/views/Campaigns.tsx` | |
| `widget/components/UnreadMessageList.vue` + `UnreadMessage.vue` | `widget/components/UnreadMessageList.tsx` | **tách khỏi** `views/UnreadMessages.tsx` để campaign dùng chung |
| `widget/App.vue` (`registerCampaignEvents`, `setCampaignView`, `setCampaignReadData`, nhánh `change-url`/`toggle-open`) | `widget/App.tsx` | `campaignsSnoozedTill` là `useRef` (bản gốc để trong `data`, không render) |
| `widget/views/PreChatForm.vue` nhánh `activeCampaignId` | `widget/views/PreChatForm.tsx` | |
| `dashboard/helper/inbox.js` `INBOX_ICON_MAP_FILL` | `dashboard/helper/inbox.ts` | thêm tham số `variant` cho `getInboxIconByType` |

---

## Khác biệt cố ý

1. **`Campaign::validationRules()` là nguồn luật duy nhất.** Bản gốc để validation ở model
   (ActiveRecord); ở đây model khai luật, controller ghép vào `$request->validate()` — cùng lối
   `WebWidget::channelRules()` của C1. Riêng `prevent_completed_campaign_from_update` giữ Ở TRONG
   hook `saving` (ném `ValidationException`) vì đó là bất biến của bản ghi, không phải luật của một
   cửa vào; nhờ vậy mọi đường ghi (kể cả job E4 sau này) đều bị chặn.
2. **Chưa port `Campaign#trigger!` / `execute_campaign`** — chỉ chạy cho `one_off` (Twilio SMS / Sms /
   WhatsApp) mà các kênh đó thuộc E4/F5. Cột + enum `one_off` đã port đủ, `ensure_correct_campaign_attributes`
   giữ nguyên cả hai nhánh nên E4 chỉ cần thêm service, không sửa model.
3. **Chưa port `invalidate_filtered_unread_count_filters`** (after_destroy) — `FilteredCountStore`
   thuộc E1, cùng nợ mà B8 đã ghi cho `Conversation`/`InboxMember`.
4. **`campaigns` là mảng trần**, không bọc `payload` — đúng `index.json.jbuilder` (`json.array!`).
5. **`sender` rỗng là `{}` chứ không phải `null`** ở API dashboard (jbuilder mở khối rồi mới kiểm
   `present?`), nhưng ở API widget là `null` (`campaign.sender&.push_event_data`). Hai shape khác nhau
   là đúng bản gốc.
6. **`UserResource::pushEventData` đổi mặc định `availability_status` từ `'offline'` → `null`** khi
   không có account. Bản gốc trả nil; giữ `'offline'` làm widget vẽ thừa chấm trạng thái (đo được
   trên pixel-diff bong bóng campaign). Mọi call-site dashboard đều có account nên không đổi hành vi.
7. **`campaignTimer` nhận callback thay vì gọi store.** Bản gốc `import store` ngay trong helper;
   ở đây helper không biết store — store truyền `startCampaign` vào.
8. **Bộ đếm thời gian chỉ có MỘT chỗ quyết định** (`widgetStore.resetCampaignTimers`): lọc theo URL +
   giờ làm việc rồi giao cho `campaignTimer`. `initCampaigns` chỉ gọi API đúng một lần cho cả vòng
   đời trang (SPA đổi URL liên tục), đúng ghi chú của bản gốc.
9. **`urlpattern-polyfill@10.1.0` thêm vào dependencies** — Chatwoot cũng import chính thư viện này ở
   cả widget lẫn form dashboard; Node 22 và một phần trình duyệt chưa có `URLPattern` sẵn.
10. **`EmptyStateLayout` luôn dựng một `<div>` bọc slot `actions`.** Bản gốc dùng `<Policy>` (luôn
    render thẻ bọc); thiếu nó thì `gap-6` mất một khoảng 24px và khối chữ màn rỗng tụt xuống — đã đo.
    Sửa ở component dùng chung nên màn Contacts cũng đúng theo.
11. **Sidebar có thêm `featureFlag` cho mục menu.** Nhánh WhatsApp campaigns của bản gốc gắn
    `FEATURE_FLAGS.WHATSAPP_CAMPAIGNS` nên oracle KHÔNG hiện mục đó; yona trước đây hiện thừa (không
    thấy vì nhóm Campaigns luôn thu gọn ở các màn khác). Lọc theo `currentAccount.features`.
12. **`.unread-wrap .chat-bubble` được nâng specificity trong `widget.scss`.** `UnreadMessage.vue` có
    `<style scoped>` (`p-4`) thắng `.chat-bubble` chung (`py-3`); ở React không có scoped style nên
    utility đặt thẳng trên thẻ bị `.chat-bubble` đè → bong bóng thấp hơn oracle 8px. Đây là lỗi có
    sẵn từ C2 cho cả màn tin chưa đọc, nay đã đúng cả hai.
13. **`RailsTimestamp::format()`** tách từ `CannedResponseResource` — hai resource cùng in mốc thời
    gian kiểu `as_json` của Rails thì chỉ nên có một định dạng.
14. **`i18n` chỉ port khối `CAMPAIGN.LIVE_CHAT` + `CAMPAIGN.CONFIRM_DELETE`** (`lang/en/campaign.php`).
    Khối SMS/WHATSAPP đi cùng kênh của chúng; khoá `CREATE.FORM.BUTTONS.EDIT` không tồn tại trong
    bản gốc (chế độ edit không hiện nút) nên cũng không thêm.

## Nợ / việc cho người khác

- **`resources/js/widget/components/PreChat/Form.tsx` (vùng C3, không được sửa) thiếu 2 nhánh campaign:**
  (a) tiêu đề `PRE_CHAT_FORM.CAMPAIGN_HEADER` khi có campaign đang chờ mà form pre-chat tắt,
  (b) ẩn ô `message` khi có campaign (`v-if="!hasActiveCampaign"`).
  Luồng nghiệp vụ đã nối đủ ở `views/PreChatForm.tsx` (submit khi có campaign thì bắn
  `EXECUTE_CAMPAIGN` + cập nhật hồ sơ khách, KHÔNG tạo hội thoại thứ hai) — chỉ còn phần hiển thị.
  Khoá i18n `PRE_CHAT_FORM.CAMPAIGN_HEADER` cũng chưa có trong `lang/en/`.
- **`/assets/images/chatwoot_bot.png` vẫn chưa có trong `public/`** (nợ c2). Campaign KHÔNG có người
  gửi sẽ hiện avatar chữ cái đầu thay ảnh bot của oracle. Pixel-diff bong bóng campaign ở dưới chạy
  với campaign CÓ người gửi nên không dính; ca bot vẫn lệch đúng cái ảnh này.
- **CORS `/audio/widget/ding.mp3`**: khi widget nhúng trên tên miền khác, SDK nạp file âm thanh
  cross-origin và bị chặn (2 lỗi console, không ảnh hưởng luồng). Cùng họ với nợ CORS/`allowed_domains`
  mà c2 đã ghi.
- **Nhóm E4 (campaigns one-off)**: cột/enum/`ensure_correct_campaign_attributes`/`audience`/
  `scheduled_at` đã sẵn; cần thêm `Campaign::trigger!` + service theo kênh + `TriggerScheduledItemsJob`
  + tab SMS/WhatsApp + khối i18n tương ứng.

## Gate đã chạy

1. **Pest toàn suite trên DB riêng** `DB_DATABASE=yona_rw_test_c4 REDIS_DB=9 vendor/bin/pest`
   → **1051/1051** (2499 assertion), trong đó 46 test C4 mới. DB đã `DROP` sau khi xong.
   Sửa 1 test cũ của C3 (`HookExecutionServiceTest` gán `campaign_id = 1` giả, nay vướng FK thật).
2. `npx tsc --noEmit` sạch · `npm run build` (app + sdk) sạch · `npx vitest run` → **48 file / 377 test**
   (thêm 9 test: `campaignHelper.test.ts`, `campaignTimer.test.ts`) · `vendor/bin/pint --test` passed ·
   `php artisan i18n:generate --check` khớp.
3. **Pixel-diff màn Campaigns > Live chat** (1280x800, oracle account 1 / yona account 2, cùng một
   campaign "c4 pricing greeting" trên inbox Website cùng tên hai bên):

   | Trạng thái | light | dark |
   |---|---|---|
   | danh sách (có 1 campaign) | 0.030% | 0.030% |
   | màn rỗng (4 thẻ nền mờ + chữ) | 0.030% | 0.030% |
   | bảng "Create a live chat campaign" | 0.030% | 0.030% |
   | hộp thoại "Edit live chat campaign" | 0.037% | 0.027% |
   | hộp thoại xác nhận xoá | 0.037% | 0.027% |

   Nền lệch 0.030–0.031% là **có sẵn** ở mọi màn (3 icon sidebar: logo tài khoản, bút soạn, Contacts) —
   `compare.mjs /app/accounts/{id}/contacts` cũng ra đúng 0.031%.

   Script: `~/www/pixel-diff/c4-campaign-ui.mjs [create|edit|delete]`.
4. **Pixel-diff bong bóng campaign của widget** (`~/www/pixel-diff/c4-widget-diff.mjs <token_oracle> <token_yona>`,
   trang khách giả `http://shop.test/pricing` phục vụ bằng `public/widget-test.html`):
   **light 0.000% · dark 0.000%**.
   Chrome chặn Private Network Access (public → localhost) nên script bật cờ
   `--disable-features=BlockInsecurePrivateNetworkRequests,PrivateNetworkAccessSendPreflights,LocalNetworkAccessChecks`.
5. **Audit nút** `audit-buttons.mjs … /campaigns/live_chat` — hai bên khớp từng vị trí/kích thước và
   đều PHẢN ỨNG: `Create campaign` @1093,24 159x32 · `i-lucide-sliders-vertical` @1156,144 32x32 ·
   `i-lucide-trash` @1196,144 32x32 (Δel=0 ở CẢ HAI vì hộp thoại alert đã nằm sẵn trong DOM).
   Thêm `c4-delete-check.mjs`: mở hộp thoại xoá → Cancel thì campaign CÒN, → Delete thì mất đúng thẻ đã chọn.
6. **E2E trình duyệt** (`~/www/pixel-diff/c4-campaign-e2e.mjs <website_token>`), đúng kịch bản founder:
   admin tạo campaign "chào sau 5 giây ở trang /pricing" bằng UI dashboard → tải lại vẫn còn →
   khách mở `http://shop.test/pricing` → **5.686s** sau widget tự nhả tin (bong bóng campaign, trang
   khách có class `has-unread-view`, widget chưa mở) → bấm vào tin → hội thoại được tạo
   (`conversation 54`, inbox 22, nội dung = tin campaign) và hiện trên dashboard → **tải lại trang:
   campaign KHÔNG nhả lại** (đã có hội thoại) và tin cũ vẫn còn trong khung chat.
   `c4-snooze-e2e.mjs`: bấm "Close" trên bong bóng → cookie `cw_snooze_campaigns_till` được ghi,
   tải lại trang campaign không nhả nữa (tạm ngưng 1 giờ).
7. **Dọn dẹp**: campaign + inbox `c4-widget` + kênh + hội thoại + liên hệ thử đã xoá ở CẢ hai bên
   (`campaigns = 0`, oracle/yona mỗi bên chỉ còn inbox `api-test` và contact `Trang Nguyen`);
   `~/www/pixel-diff/reset-fixture.sh` chạy xong → yona `{"hội thoại":[4],"tin":5}`,
   oracle `{"hội thoại":[1],"tin":5}`. DB test `yona_rw_test_c4` đã DROP.

## Bẫy đã trả giá

1. **Trang Inertia mới phải thêm vào `import.meta.glob` của `resources/js/app.tsx`** — thiếu thì
   route trả trang TRẮNG, không có lỗi nào ngoài `Page not found` trong console.
2. **Model vừa `create()` chưa có `display_id`** (PG trigger sinh) → phải `->refresh()`, nếu không URL
   test thành `/campaigns/` và server trả 405 chứ không phải 404 (dễ tưởng route sai).
3. **`Account::feature_flags` không nằm trong `$fillable`** — test phải `forceFill([...])->save()`,
   `update()` im lặng không ghi gì.
4. **Selector `li:has-text(...)` trong playwright dính vào sidebar** (nhóm Inboxes cũng là `li` chứa
   tên inbox) → click ra ngoài panel làm panel tạo campaign tự đóng. Phải `li[role="option"]`.
5. **Chrome chặn Private Network Access** khi trang giả (public) gọi `localhost` — SDK không tải được,
   không có iframe nào. Phải bật cờ khi launch chromium.
6. **`c5` xoá inbox thử `c5-csat` giữa chừng** làm campaign của mình (đang trỏ vào inbox đó) biến mất
   theo FK cascade — tưởng nhầm là nút xoá tự chạy. Khi đo chung môi trường, campaign phải nằm trên
   inbox DO MÌNH tạo.
7. **Utility Tailwind đặt thẳng trên thẻ KHÔNG chắc thắng rule trong `widget.scss`** (cùng
   specificity, file scss đứng sau). Vue có scoped style nên bản gốc luôn thắng — port sang React
   phải nâng specificity trong scss.
