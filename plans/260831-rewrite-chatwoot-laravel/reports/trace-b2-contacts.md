# Trace B2 — Contacts + contact_inboxes

Nguồn: Chatwoot v4.17.1 (`refs/chatwoot`, đọc theo tag). Ngày port: backend 01/09/2026 (`413aea7`, phiên trước) + UI 01/09/2026 (phiên này). Backend đã được phiên này nghiệm thu lại độc lập: đối chiếu từng file với source gốc, toàn suite Pest 262/262 xanh.

## Backend Ruby ↔ PHP

| Nguồn Chatwoot | Đích Laravel | Ghi chú |
|---|---|---|
| `db/schema.rb` bảng `contacts` | `database/migrations/*_create_contacts_table.php` | Đủ cột + GIN trgm 4 cột (name/email/phone/identifier), partial index nonempty/resolved, unique (email,account) + (identifier,account), lower(email) index; `company_id` giữ chỗ không FK (companies = EE) |
| `db/schema.rb` bảng `contact_inboxes` | `database/migrations/*_create_contact_inboxes_table.php` | unique (inbox_id, source_id); FK cascade thay `dependent: :destroy_async` (deliberate như B1) |
| `app/models/contact.rb` | `app/Models/Contact.php` | prepare_contact_attributes (email hạ chữ thường, ''→null; jsonb default {}), sync qua saving hook; enum CONTACT_TYPES visitor/lead/customer; scopes order_on_* (NULLS LAST + CASE order_on_name) + resolvedContacts (crm_v2 → lead); `from_email` hạ chữ thường. BỎ: conversations/messages/csat/notes relations (B3+), Labelable (B7/C), ip_lookup, dispatcher events (đi cùng webhooks D4), LlmFormattable (EE), stale_without_conversations (job dọn rác chưa port) |
| `app/services/contacts/sync_attributes.rb` | `Contact::syncContactAttributes()` | location/country_code từ additional_attributes (city/country); thăng hạng visitor→lead khi có email/phone/social_*. **Lệch nhỏ cố ý:** vắng city/country thì gốc gán nil (NULL), bản port gán '' — cột không nằm trong payload API/jbuilder nào ở B2 nên không quan sát được từ ngoài |
| `app/models/contact_inbox.rb` | `app/Models/ContactInbox.php` | pubsub_token `Str::random(24)` khi creating (has_secure_token). BỎ: hmac key widget (C3), `dependent: :destroy_async` conversations (B3) |
| `app/builders/contact_inbox_with_contact_builder.rb` | `app/Builders/ContactInboxWithContactBuilder.php` | Dedupe đúng thứ tự identifier→email→phone; retry 1 lần khi UniqueConstraintViolation (RecordNotUnique); tìm theo source_id trước; avatar_url → AvatarFromUrlJob khi contact chưa có avatar; tên fallback Haikunator + truncate 255. BỎ: nhánh find_contact_by_instagram_source_id (đi cùng driver Instagram F3) |
| `app/builders/contact_inbox_builder.rb` | `app/Builders/ContactInboxBuilder.php` | Api/WebWidget → uuid; kênh khác throw như gốc. BỎ: source_id cho Email/Sms/Twilio/Whatsapp + vá update_old_contact_inbox (chỉ chạy cho các kênh đó — port cùng driver kênh F) |
| `app/jobs/avatar/avatar_from_url_job.rb` | `app/Jobs/Avatar/AvatarFromUrlJob.php` | queue `purgable` (đã thêm tier vào Makefile); rate-limit 60s + hash URL trong additional_attributes (chỉ Contact); ghi sync attrs kiểu update_columns = forceFill + saveQuietly (không chạy hook); content-type allowlist + trần 15MB |
| `Api::V1::Accounts::ContactsController` | `app/Http/Controllers/WebApi/ContactsController.php` | 9 action: index (Sift sort 8 trường qua SORT_SCOPES, paginate 15, meta count/current_page, resolved_contacts + gate crm_v2), search (ILIKE name/email/phone + identifier LIKE phân biệt hoa thường, lấy dư 1 → has_more), active (trả rỗng — OnlineStatusTracker B4), show, store (transaction + contact_inbox khi có inbox_id + AvatarFromUrlJob khi avatar_url), update (custom/additional_attributes MERGE), destroy (admin-only; chưa chặn khi online — B4), destroy_custom_attributes, avatar (DELETE). Validate kiểu Rails 422 `{message, attributes}` đúng câu chữ. BỎ: filter (segments E1/C), import/export (E3), contactable_inboxes (B3), lọc labels (B7/C) |
| `Api::V1::Accounts::Contacts::ContactInboxesController` | `app/Http/Controllers/WebApi/Contacts/ContactInboxesController.php` | ensure_inbox + authorize :show? (member/admin → 401 như fetchInbox B1); hmac_verified từ body |
| `api/v1/models/_contact.json.jbuilder` + `_contact_inbox` + `_inbox_slim` | `app/Http/Resources/ContactResource.php` | company_id chỉ emit khi feature companies (EE — luôn tắt); last_activity_at/created_at epoch; contact_inboxes chỉ khi with_contact_inboxes |
| `Haikunator` gem | `app/Support/Haikunator.php` | tên fallback adjective-noun-số |

## Routes

| Chatwoot | Yona | |
|---|---|---|
| `GET/POST /api/v1/accounts/:id/contacts`, `GET search`, `GET active`, member `GET/PUT/DELETE :id`, `POST :id/destroy_custom_attributes`, `DELETE :id/avatar`, `POST :id/contact_inboxes` | `routes/web_api.php` cùng path (10 route) | BỎ: filter/import/export/contactable_inboxes/labels (nhóm C/E/B3) |
| `contacts/routes.js`: `/contacts` (contacts_dashboard_index) + `/contacts/:contactId` (contacts_edit) | `routes/web.php` → `App\ContactsController` render `dashboard/contacts/Index|Show` | admin + agent như meta.permissions; route con segments/labels/active giữ URL qua placeholder, port ở nhóm C/B4 |

## Frontend Vue ↔ React

| Nguồn | Đích | Ghi chú |
|---|---|---|
| `routes/dashboard/contacts/pages/ContactsIndex.vue` | `dashboard/contacts/Index.tsx` | fetch/search debounce 300ms + page/search sync URL (history.replaceState thay router.replace); sort đọc `ui_settings.contacts_sort_by`, lưu qua `PUT /api/v1/profile`; search = has_more + Load more (append); empty state 3 nhánh như gốc. BỎ: segments/labels/filter/active view (C/B4), ContactsBulkActionBar + bulk delete dialog (C) |
| `routes/dashboard/contacts/pages/ContactManageView.vue` | `dashboard/contacts/Show.tsx` | fetch contact + toggle block + TabBar sidebar 5 tab; nội dung tab (Attributes/History/Notes/Media/Merge) trống chờ feature (E1/B3/B11); goToContactsList = history.back fallback `?page=1` |
| `components-next/Contacts/ContactsListLayout.vue` | `components-next/Contacts/ContactsListLayout.tsx` | PaginationFooter sticky; ContactsActiveFiltersPreview không render (điều kiện chỉ đúng khi có segments/filter — nhóm C) |
| `Contacts/ContactsHeader/ContactHeader.vue` | `.../ContactHeader.tsx` | **Khác biệt cố ý:** nút filter render giữ chỗ, bấm chưa mở popup (ContactsFilter nhóm C); nút "New message" render giữ chỗ (ComposeConversation B3); nút save-segment/delete-segment không render (chỉ hiện khi có filter/segment) |
| `Contacts/ContactsHeader/ContactListHeaderWrapper.vue` | `.../ContactListHeaderWrapper.tsx` | luồng tạo contact + alert duplicate (email/phone từ `attributes` của 422). BỎ: Import/Export/CreateSegment/DeleteSegment dialog (C/E3) |
| `Contacts/ContactsHeader/components/ContactSortMenu.vue` | `.../components/ContactSortMenu.tsx` | 7 sort option + asc/desc qua SelectMenu; clickaway |
| `Contacts/ContactsHeader/components/ContactMoreActions.vue` | `.../components/ContactMoreActions.tsx` | **Khác biệt cố ý:** menu chỉ còn "New contact" — Import/Export CSV nhóm C (pixel-diff đừng chấm trạng thái menu mở) |
| `Contacts/Pages/ContactsList.vue` | `.../Pages/ContactsList.tsx` | expand 1 card, update qua API + alert duplicate, chọn qua hover avatar; View details → Inertia visit giữ query |
| `Contacts/ContactsCard/ContactsCard.vue` | `.../ContactsCard/ContactsCard.tsx` | CardLayout row + phần expand (grid-rows transition); location từ countriesMap (country→countryCode fallback) + Flag |
| `Contacts/ContactsCard/ContactDeleteSection.vue` | `.../ContactsCard/ContactDeleteSection.tsx` | Policy administrator = check role từ shared props |
| `Contacts/ContactsForm/ContactsForm.vue` | `.../ContactsForm/ContactsForm.tsx` | FORM_CONFIG 8 field + SOCIAL_CONFIG 7; splitName firstName/lastName ↔ name; vuelidate (required firstName + email) = validate nội bộ, chỉ emit khi hợp lệ; COUNTRY → ComboBox set cả country name; PHONE_NUMBER → PhoneNumberInput. BỎ: CompanySelector (feature companies EE — nhánh else Input chạy như gốc khi feature tắt) |
| `Contacts/ContactsForm/CreateNewContactDialog.vue` | `.../CreateNewContactDialog.tsx` | Dialog 3xl + footer Cancel/Save; disabled theo validity |
| `Contacts/ContactsForm/ConfirmContactDeleteDialog.vue` | `.../ConfirmContactDeleteDialog.tsx` | alert dialog; xóa qua API + toast |
| `Contacts/EmptyState/ContactEmptyState.vue` + `contactEmptyStateContent.js` | `.../EmptyState/ContactEmptyState.tsx` + `contactEmptyStateContent.ts` | backdrop 5 card mẫu (data copy nguyên văn 5 entry đầu — EmptyState chỉ slice(0,5)) |
| `Contacts/ContactsLoadMore.vue` | `.../ContactsLoadMore.tsx` | |
| `Contacts/ContactsDetailsLayout.vue` | `.../ContactsDetailsLayout.tsx` | breadcrumb + block/send message + sidebar desktop/mobile. **Khác biệt cố ý:** VoiceCallButton không render (voice = EE, khớp oracle khi không có voice inbox); "Send message" giữ chỗ (B3) |
| `Contacts/Pages/ContactDetails.vue` | `.../Pages/ContactDetails.tsx` | avatar 72 allowUpload (upload chỉ gửi file `avatar` qua `_method=PUT` — gốc gửi cả state, controller validate `sometimes` nên tương đương); identifier + created/last activity (dynamicTime); delete section admin. BỎ: ContactLabels (B7/C), fetchContactableInbox sau update (B3) |
| `Contacts/VoiceCallButton.vue` | — | không port (EE voice) |
| `Contacts/ContactLabels/ContactLabels.vue` + `label/AddLabel.vue` | `.../ContactLabels/ContactLabels.tsx` + `label/AddLabel.tsx` | **Shell B2 (finding pixel-diff #1):** nút "+ tag" viền đứt render đúng vị trí dưới dòng Created; LabelItem + DropdownMenu chọn label mở ở nhóm C (bấm chưa mở gì — pattern giữ chỗ) |
| `Contacts/ContactsSidebar/ContactCustomAttributes.vue` | `.../ContactsSidebar/ContactCustomAttributes.tsx` | **Tối thiểu B2 (finding pixel-diff #3):** account 0 definition → nhánh else của gốc = `<p>` `ATTRIBUTES.EMPTY_STATE` (xác minh source: nhánh 0-definition render EMPTY_STATE, không phải NO_ATTRIBUTES); used/unused + search + Item port ở E1 |
| `Contacts/ContactsSidebar/*` (Notes/History/Media/Merge) | — | tab trống chờ feature (B3/B11) |
| `components-next/breadcrumb/Breadcrumb.vue` | `components-next/breadcrumb/Breadcrumb.tsx` | mới, dùng lại được |
| `components-next/tabbar/TabBar.vue` | `components-next/tabbar/TabBar.tsx` | indicator trượt đo offset qua ResizeObserver. **Bẫy đã trả giá (finding pixel-diff #2):** button phải là con TRỰC TIẾP của root (Fragment, không bọc div) — caller dùng selector `[&>button]:w-full` để chia đều 5 tab, bọc div là selector chết, tab về bề rộng nội dung |
| `components-next/avatar/Avatar.vue` slot `overlay` | `Avatar.tsx` prop `overlay` (render-prop) | thay lớp upload phủ — ContactsCard dùng cho checkbox chọn khi hover |
| `composables/useTransformKeys.js` (camelcase/snakecase-keys) | `dashboard/helper/transformKeys.ts` | camelize đọc (stopPaths custom_attributes như getter store), snakeize ghi (giữ nguyên custom_attributes như action update) |
| store `contacts/*` (vuex) | `dashboard/contacts/api.ts` + state cục bộ trang | theo pattern các màn đã port (không vuex) |

## Bẫy hệ thống đã trả giá 2 lần — arbitrary-variant selector xuyên component

Chatwoot truyền class dạng `[&>...]`/`[&_...]` từ CALLER vào component con để nhắm phần tử bên trong theo **cấu trúc DOM thật** của bản Vue. Port sang React mà thêm/bớt MỘT lớp wrapper là selector của caller trượt im lặng (không lỗi build, chỉ lệch pixel):

1. TabBar: caller `[&>button]:w-full` — button phải là con TRỰC TIẾP của root; bọc `div.contents` là selector chết → 5 tab về bề rộng nội dung thay vì chia đều (finding pixel-diff đợt 2).
2. ComboBox: caller `[&>div>button]:h-8` + `!bg-n-alpha-black2` — bản gốc bọc Button trong `<OnClickOutside>` (@vueuse) render MỘT `<div>` thật → DOM `root > div > button`; port bỏ lớp div này → select country cao 40px, sai nền, cả form dưới trôi 8px (finding pixel-diff đợt 3).

**Luật khi port component Vue → React từ nay:** trước khi chốt JSX, soi template gốc xem có wrapper vô hình không (`OnClickOutside`, `Transition`, component @vueuse render phần tử thật) và grep mọi call-site truyền `[&`-class vào component đó, đối chiếu selector với DOM render thực tế. Đã rà toàn cây Contacts + primitives mới sau fix: các `[&`-class còn lại trong phạm vi B2 đều là self-selector trên chính phần tử nhận class (`[&:not(.error,.focus)]` trên input) — khớp.

## Khác biệt cố ý (tổng hợp — pixel-diff cần biết)

1. Nút **filter** + nút **New message** (list) + nút **Send message** (chi tiết) render đúng vị trí/nhãn nhưng bấm chưa có hành vi (ContactsFilter nhóm C, ComposeConversation B3).
2. Menu ⋮ chỉ có "New contact" (Import/Export nhóm C) — nội dung menu lệch chủ đích 1 item vs 3 item khi chấm trạng thái menu mở (crop vùng menu). Hành vi GIỮ MỞ khi bấm "Add contact" đã khớp gốc: handleContactAction gốc không đóng menu, chỉ clickaway đóng — dialog modal chặn pointer nên menu nằm nguyên sau backdrop (finding pixel-diff đợt 4).
3. Chọn contact (checkbox hover avatar) hoạt động nhưng **ContactsBulkActionBar chưa có** (bulk actions nhóm C) — chọn xong chưa có thanh hành động.
4. Presence: `availability_status` luôn `offline` (chấm trạng thái ẩn vì `hideOfflineStatus`) — khớp oracle khi Redis presence trống; B4 mới có online.
5. Sidebar chi tiết: TabBar đủ 5 tab chia đều bề ngang (truncate như gốc); tab Attributes có empty-state text như oracle khi account 0 custom attribute definition; tab History/Notes/Media/Merge trống chờ feature (oracle có nội dung — vùng nhiễu nếu chấm các tab đó).
5b. Nút "+ tag" (ContactLabels/AddLabel) render đúng, bấm chưa mở dropdown (labels nhóm C).
6. `location`/`country_code` cột DB: vắng city/country → '' thay vì NULL (không lộ ra API).
7. additional_attributes field rỗng lưu `null` thay `''` (ConvertEmptyStringsToNull của Laravel) — hai giá trị đều falsy phía client, không đổi render.
8. Trang `/contacts/active` giữ URL qua placeholder (active view + presence B4); segments/labels URL giữ qua placeholder (C).

## Spec ↔ Pest (port ở `413aea7`, phiên này chạy lại toàn suite 262/262)

| RSpec | Pest |
|---|---|
| `spec/builders/contact_inbox_with_contact_builder_spec.rb` | `tests/Feature/Builders/ContactInboxWithContactBuilderTest.php` |
| `spec/builders/contact_inbox_builder_spec.rb` (phần Api/WebWidget) | `tests/Feature/Builders/ContactInboxBuilderTest.php` |
| `spec/models/contact_spec.rb` | `tests/Unit/Models/ContactTest.php` |
| `spec/controllers/api/v1/accounts/contacts_controller_spec.rb` (9 action trong phạm vi) | `tests/Feature/WebApi/ContactsControllerTest.php` |
| `spec/controllers/api/v1/accounts/contacts/contact_inboxes_controller_spec.rb` | `tests/Feature/WebApi/ContactInboxesControllerTest.php` |
| `spec/jobs/avatar/avatar_from_url_job_spec.rb` | `tests/Feature/Jobs/AvatarFromUrlJobTest.php` |

## Gate (01/09/2026)

- Pest toàn suite: **262/262** xanh (không chạy `--parallel`).
- `npx tsc --noEmit` sạch; `npm run build` xanh; `vendor/bin/pint --test` sạch.
- E2E trình duyệt (login john@acme.inc): tạo contact qua dialog (empty state + menu ⋮) → hiện list + pagination; tạo trùng email → toast "This email address is in use for another contact.", dialog giữ mở; sửa city → DB sync `location`, `contact_type` thăng hạng lead; View details → breadcrumb/block/unblock/update/tab sidebar; search có kết quả + không kết quả (empty text) + xóa search khôi phục list, URL sync `?page&search`; sort lưu `ui_settings.contacts_sort_by`; hover avatar → checkbox chọn + style selected; xóa qua card (Delete now → Confirm Deletion) → **reload kiểm persistence**: sạch UI + DB (contact_inboxes = 0).

## Pixel-diff (DoD (c) — CHƯA CHẤM, việc của phiên kiểm chứng)

Danh sách màn cần chấm gửi kèm báo cáo phiên.
