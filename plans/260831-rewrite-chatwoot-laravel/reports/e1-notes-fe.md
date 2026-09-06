# E1 frontend — Custom attributes + bộ lọc liên hệ + Folders/Segments

Agent `e1-fe`. Nguồn: Chatwoot v4.17.1 (`refs/chatwoot`). Ngày 06/09/2026.
Contract API đọc từ `reports/e1-notes-be.md` (agent `e1-be`).

## Bảng trace Vue ↔ TSX

| Chatwoot (Vue/JS) | Yona (React/TS) | Ghi chú |
|---|---|---|
| `routes/dashboard/settings/attributes/Index.vue` | `resources/js/dashboard/settings/attributes/Index.tsx` | SettingsLayout + BaseSettingsHeader + TabBar + AttributeListItem |
| `…/attributes/AddAttribute.vue` | `…/settings/attributes/AddAttribute.tsx` | bỏ ô "Key" (lệnh founder) |
| `…/attributes/EditAttribute.vue` | `…/settings/attributes/EditAttribute.tsx` | bỏ ô "Key" (gốc là ô readonly) |
| (phần thân trùng nhau của hai file trên) | `…/settings/attributes/AttributeForm.tsx` | gom một chỗ: tên, mô tả, kiểu, danh sách giá trị, regex |
| `…/attributes/constants.js` | `…/settings/attributes/constants.ts` | `ATTRIBUTE_MODELS`, `ATTRIBUTE_TYPES` + `attributeTypeIdOf` |
| `components-next/ConversationWorkflow/AttributeListItem.vue` | `components-next/ConversationWorkflow/AttributeListItem.tsx` | |
| `components-next/CustomAttributes/AttributeBadge.vue` | `components-next/CustomAttributes/AttributeBadge.tsx` | |
| `components-next/CustomAttributes/{Checkbox,Date,List,Other}Attribute.vue` | `components-next/CustomAttributes/{Checkbox,Date,List,Other}Attribute.tsx` | `+ types.ts` (prop chung) |
| `components-next/Contacts/ContactsSidebar/ContactCustomAttributeItem.vue` | cùng đường dẫn `.tsx` | map kiểu → component ở một chỗ |
| `components-next/Contacts/ContactsSidebar/ContactCustomAttributes.vue` | cùng đường dẫn `.tsx` | thay bản giữ chỗ của B2 |
| `components/CustomAttribute.vue` | `resources/js/dashboard/components/CustomAttribute.tsx` | dòng thuộc tính trong panel hội thoại |
| `components/ui/HelperTextPopup.vue` | `dashboard/components/ui/HelperTextPopup.tsx` | mới |
| `routes/dashboard/conversation/customAttributes/CustomAttributes.vue` | `conversation/conversationbox/contact/CustomAttributes.tsx` | thân hai accordion; trước E1 chỉ render phần tử tĩnh |
| `store/modules/attributes.js` + `api/attributes.js` | `dashboard/composables/useCustomAttributes.ts` | store Vuex → cache module-level + `useSyncExternalStore` (khuôn `useCannedResponses`) |
| `store/modules/customViews.js` + `api/customViews.js` | `dashboard/composables/useCustomViews.ts` | hai ngăn `conversation`/`contact`, chuẩn hoá `filter_type` 0/1 ↔ chuỗi |
| `components-next/filter/helper/filterHelper.js` (`CONTACT_ATTRIBUTES`, `getCustomAttributeInputType`, `buildAttributesFilterTypes`) | cùng file `.ts` (bổ sung) | một nguồn cho cả hai provider |
| `components-next/filter/provider.js` (phần custom attribute) | `components-next/filter/provider.ts` (bổ sung) | |
| `components-next/filter/contactProvider.js` | `components-next/filter/contactProvider.ts` | mới |
| `components-next/filter/ContactsFilter.vue` | `components-next/filter/ContactsFilter.tsx` | mới |
| `components-next/filter/SaveCustomView.vue` | `components-next/filter/SaveCustomView.tsx` | mới |
| `components-next/filter/ActiveFilterPreview.vue` | `components-next/filter/ActiveFilterPreview.tsx` | mới (chưa có call-site — xem "Khác biệt cố ý" #5) |
| `helper/customViewsHelper.js` (`generateValuesForEditCustomViews`) | `components-next/filter/helper/filterQuery.ts#conditionsFromPayload` | xem "Khác biệt cố ý" #2 |
| `components-next/Contacts/ContactsForm/CreateSegmentDialog.vue` | cùng đường dẫn `.tsx` | Dialog là chủ sở hữu `<form>` duy nhất |
| `components-next/Contacts/ContactsForm/DeleteSegmentDialog.vue` | cùng đường dẫn `.tsx` | |
| `routes/dashboard/customviews/DeleteCustomViews.vue` | nhánh xoá folder trong `conversation/chatlist/ChatList.tsx` | dùng `DeleteModal` có sẵn |
| `components/ChatListHeader.vue` (nhánh folder + save) | `conversation/chatlist/ChatListHeader.tsx` | viết lại đúng 3 nhánh của gốc |
| `components/ChatList.vue` (foldersId, save/delete folder) | `conversation/chatlist/ChatList.tsx` | |
| `components-next/sidebar/Sidebar.vue` (Folders/Segments) | `components-next/sidebar/{Sidebar,menuItems}.tsx/.ts` | children đọc từ store customViews |
| `routes/dashboard/contacts/pages/ContactsIndex.vue` (segment + filter) | `dashboard/contacts/Index.tsx` | |
| `components-next/Contacts/ContactsHeader/{ContactHeader,ContactListHeaderWrapper}.vue` | cùng đường dẫn `.tsx` | nút filter/save/delete segment + popup |
| `shared/helpers/Validators.js#normalizeRegexPattern`, `helper/URLHelper.js#isValidURL` | bổ sung vào file `.ts` cùng tên | |

### i18n (`lang/en/*.php`)

| JSON gốc | File lang |
|---|---|
| `attributesMgmt.json` → `ATTRIBUTES_MGMT` | `lang/en/attributes_mgmt.php` (mới) |
| `contactFilters.json` → `CONTACTS_FILTER` | `lang/en/contacts_filter.php` (mới) |
| `contact.json#CUSTOM_ATTRIBUTES`, `conversation.json#CONVERSATION_CUSTOM_ATTRIBUTES`, `FILTER.CUSTOM_VIEWS`, `CONTACTS_LAYOUT.*` | đã có sẵn từ nhóm B — không đụng |

Bundle sinh lại bằng `php artisan i18n:generate`.

## Bảng spec ↔ vitest

| Spec gốc | Test yona | Số case |
|---|---|---|
| `components-next/filter/helper/filterHelper.spec.js` (phần helper) | `components-next/filter/helper/filterHelper.test.ts` | 11 |
| — (mới, chiều ngược của `filterQueryGenerator` + `customViewsHelper`) | `components-next/filter/helper/filterQuery.test.ts` (bổ sung `conditionsFromPayload`) | 3 |
| `store/modules/specs/attributes/getters.spec.js` | `composables/useCustomAttributes.test.ts` | 3 |
| `store/modules/specs/customViews/{getters,mutations}.spec.js` (phần chuẩn hoá `filter_type`) | `composables/useCustomViews.test.ts` | 3 |

Phần `useConversationFilterContext` của `filterHelper.spec.js` không port: provider bản port là
hook React đọc Inertia props (mock cả Vuex + vue-i18n như spec gốc là dựng lại khung khác hẳn);
hành vi đó đã có gate pixel-diff `filter` + e2e phủ.

## Khác biệt cố ý

1. **Không có ô "Key" trong form thêm/sửa thuộc tính** (lệnh founder). Backend tự sinh key từ tên
   (`e1-be`, mục "Lệnh founder"). Modal của yona vì thế thấp hơn oracle đúng chiều cao một ô nhập;
   pixel-diff hai kịch bản `add`/`edit` so theo dải (ghép lại ảnh oracle sau khi bỏ dải ô Key) —
   xem đầu `~/www/pixel-diff/e1-attributes-ui.mjs`. Kết quả **0.000%**, tức mọi thứ ngoài ô Key khớp tuyệt đối.
2. **`generateValuesForEditCustomViews` không port nguyên bản.** Gốc là một `switch` theo
   `attribute_key` (status/assignee_id/inbox_id/labels/country_code/…) và một nhánh riêng cho custom
   attribute. Bản port thay bằng `conditionsFromPayload(payload, filterTypes)`: tra thẳng `FilterType`
   của provider để biết `inputType` và `options`. Một nguồn duy nhất — thêm thuộc tính mới (kể cả custom
   attribute) không phải thêm nhánh nào, và dùng chung cho cả folder lẫn segment.
3. **Huy hiệu "Pre-chat"/"Resolution" trên danh sách thuộc tính luôn rỗng.** `buildBadges` của gốc cần
   `pre_chat_form_options` của từng inbox (prop sidebar chỉ share `id/name/channel_type`) và
   `settings.conversation_required_attributes` (tính năng trả phí chưa port — xem
   `settings/conversationWorkflow/Index.tsx`). `AttributeBadge` đã port sẵn, chỉ thiếu nguồn dữ liệu.
4. **Kéo thả sắp xếp thuộc tính trong panel hội thoại** (vuedraggable) không port — cùng quyết định với
   ContactPanel ở B11. Thứ tự đã lưu trong `ui_settings` vẫn được tôn trọng khi đọc.
5. **`ActiveFilterPreview.tsx` chưa có call-site.** Ở gốc nó nằm trong `ContactsActiveFiltersPreview`
   (dải chip bộ lọc trên trang Contacts) — thành phần đó phụ thuộc bulk-action bar của nhóm sau.
   Port sẵn để nhóm đó chỉ việc cắm vào.
6. **Không port `activeConversationFolder`** của store customViews (và `getActiveFolderContactId`):
   folder đang mở suy ra từ `foldersId` trên route, không cần state toàn cục. Kéo theo:
   `refreshConversationUnreadCounts` cũng bỏ — cờ `unread_count_for_filters` chưa port.
7. **Sửa segment/folder điều hướng bằng `window.location`** thay vì `router.push`: bản port là Inertia,
   trang folder/segment là page riêng nên nạp lại trang là đúng vòng đời.
8. **Item trong dropdown chọn thuộc tính**: oracle render `<div>`, bản port render `<button>` (DropdownMenu
   của B-nhóm đã như vậy từ trước). Không lệch pixel; ghi lại để script e2e bắt theo `li.n-dropdown-item`.

9. **Danh sách Settings › Custom Attributes không in `attribute_key`** (lệnh founder, bổ sung sau QA
   06/09 — agent `e1-fix`). Oracle in dòng phụ "🔑 goi_quan_tam | mô tả" dưới tên thuộc tính; bản port
   bỏ hẳn key: `AttributeListItem` không còn prop `value`, dòng phụ chỉ còn mô tả và biểu tượng đổi từ
   `i-lucide-key-round` sang `i-lucide-align-left`. Ô tìm kiếm cũng bỏ `attribute_key` khỏi danh sách
   trường tra (người dùng không biết key thì không tìm theo key). Key vẫn nguyên trong payload API.
   Pixel: che hai dòng phụ — `ATTRIBUTE_KEY_LINE_MASKS` trong `e1-attributes-ui.mjs`, đồng bộ với
   `mask-diff.mjs#'e1-list'`.

## Sửa ngoài vùng sở hữu (đều là thêm mới hoặc sửa lỗi rõ ràng, đã ghi rõ)

| File | Việc |
|---|---|
| `app/Http/Controllers/WebApi/ConversationsController.php` + `routes/web_api.php` | **backend**: thêm `customAttributes` / `destroyCustomAttributes` (port `ConversationCustomAttributesConcern`) + 2 route. `e1-be` không nhận phần này, mà accordion "Conversation Information" không lưu được nếu thiếu. |
| `dashboard/conversation/ConversationContext.tsx` | thêm `updateConversationCustomAttributes` vào context (dùng `updateConversation` sẵn có) |
| `dashboard/conversation/api.ts` | thêm `updateConversationCustomAttributes` |
| `dashboard/contacts/api.ts` | thêm `deleteContactCustomAttributes`, `filterContacts` |
| `dashboard/components-next/taginput/TagInput.tsx` | thêm nhánh `allowCreate` + `showDropdown` của bản gốc (form thuộc tính cần) |
| `dashboard/components-next/inline-input/InlineInput.tsx` | **sửa lỗi**: `className` đặt trên component phải rơi xuống thẻ bọc như fallthrough attribute của Vue, không phải xuống `<input>` (xem "Bẫy đã trả giá" #2) |
| `shared/helpers/Validators.ts`, `dashboard/helper/URLHelper.ts` | thêm `normalizeRegexPattern`, `isValidURL` |
| `dashboard/conversation/conversationbox/ContactPanel.tsx` | truyền `contact` xuống accordion "Contact Attributes" |
| `dashboard/contacts/Show.tsx` | truyền `onContactUpdated` xuống `ContactCustomAttributes` |
| `dashboard/components-next/sidebar/{Sidebar.tsx,menuItems.ts}` | children cho hai nhóm Folders/Segments |
| `dashboard/conversation/{ConversationView,chatlist/ChatList,chatlist/ChatListHeader}.tsx` | prop `foldersId` + ba nhánh nút của `ChatListHeader.vue` gốc |
| `dashboard/components-next/Contacts/{ContactsListLayout,ContactsHeader/*}.tsx` | prop segment/filter |

## Bẫy đã trả giá

1. **Khoảng trắng JSX giữa `<input type="checkbox">` và nhãn "Enable regex validation"** — đúng bẫy #1
   của D4 lặp lại: Vue giữ một dấu cách từ whitespace template, JSX bỏ. Pixel bắt được; sửa bằng `{' '}`.
2. **`className` trên component React ≠ `class` trên component Vue.** `TagInput` truyền
   `class="w-full"` cho `InlineInput`; ở Vue nó rơi xuống **thẻ bọc**, ở bản port React nó nằm trong
   `...attrs` và bị spread **sau** `className` của `<input>` nên **ghi đè sạch toàn bộ class của ô nhập**
   (mất cả `text-sm`) → placeholder render 16px thay vì 14px. Pixel-diff bắt 0.365%/1.903% ở modal Edit.
   Lỗi có sẵn từ trước E1, ảnh hưởng cả `MultiTextInput` và TagInput của inbox. Sửa ở đúng một chỗ:
   `InlineInput` tách `className` ra cho thẻ bọc, `customInputClass` mới là class của ô nhập.
   **Bài học chung: mọi component port có "fallthrough attribute" của Vue phải tách `className` ra khỏi
   `...attrs`, nếu không nó lặng lẽ xoá class của phần tử bên trong.**
3. **`PUT /contacts/{id}` MERGE `custom_attributes`** (đúng bản gốc) — không xoá được thuộc tính bằng
   cách gửi `{}`. Script dọn fixture phải gọi `POST /contacts/{id}/destroy_custom_attributes`.
4. **Sidebar hai bên không so pixel toàn cột được**: oracle (account 1) và yona (account 2) khác inbox,
   team, nhãn; oracle còn mục "SLA" trong Settings (EE chưa port) làm mọi mục dưới lệch một dòng.
   Kịch bản `sidebar-*` vì thế cắt đúng khối nhóm (header + con) theo bounding box; các màn Settings
   che dải sidebar `[0,700,200,200]`.
5. **Nhóm con của sidebar mặc định ĐANG MỞ** (`sidebar_minimized_sections` rỗng trên context mới) —
   script bấm vào "Folders" để mở lại hoá ra đóng nó. Chỉ cần chờ leaf xuất hiện, không bấm.
6. **Điều kiện lọc mặc định (`status`, values rỗng) không apply được** — validate chặn. Kịch bản cần
   "đã áp bộ lọc" phải chọn một thuộc tính có giá trị hợp lệ trước (script dùng chính custom attribute).
7. **Cột chat + danh sách liên hệ hai bên khác dữ liệu** (bẫy #4 của D3) — mọi kịch bản có popup bộ lọc
   phải cắt đúng khung popup theo bounding box, không chụp cả trang.
8. **`npm run build` trước mỗi lượt pixel-diff** (bẫy đã ghi ở D3/D4): `:8000` chạy asset đã build.

9. **Trạng thái accordion panel liên hệ lưu trong `ui_settings` của user** → kịch bản `panel-conv`/
   `panel-contact` bấm mù vào tiêu đề sẽ **ĐÓNG** accordion khi phiên trước để mở, và accordion còn lại
   vẫn mở làm lệch cả cột. Script nay đặt đúng trạng thái cho CẢ hai accordion (mở cái đang chấm, đóng
   cái kia), lặp tối đa 3 lần theo mốc nội dung — chạy bao nhiêu lần cũng ra một kết quả.
10. **`conversation_display_type = "expanded"` giấu cột danh sách hội thoại** ở khổ 1280 → nút
    `#toggleConversationFilterButton` tồn tại nhưng không visible, kịch bản `filter`/`save-filter` timeout.
    Cờ này do phiên QA/audit-buttons bấm phải và **lưu vĩnh viễn trong `ui_settings`**; oracle vẫn mặc
    định `condensed`. Đã trả john về `condensed`. Kịch bản filter cũng tự đóng panel liên hệ nếu đang mở.
11. **Fixture còn sót khi script chết giữa chừng**: một lần chạy đầy đủ bị timeout ở `filter` để lại
    4 định nghĩa thuộc tính ở cả hai bên. `clean()` chỉ chạy cuối `shoot()` — script vỡ = phải dọn tay.

## Kết quả gate

- `npx tsc --noEmit`: **sạch toàn dự án** (0 dòng).
- `npx vitest run`: **73 file / 528 test xanh** (E1 đóng góp 4 file / 20 test).
- `npm run build` (vite + sdk): xanh. `php artisan i18n:generate`: sinh lại `resources/js/i18n/generated/en.ts`.
- `vendor/bin/pint lang/en/attributes_mgmt.php lang/en/contacts_filter.php app/Http/Controllers/WebApi/ConversationsController.php routes/web_api.php`: passed.
- Pixel-diff `~/www/pixel-diff/e1-attributes-ui.mjs` (light + dark, ngưỡng 0.1%, nhiễu nền ~0.030%) —
  **22/22 ĐẠT**:

  | Kịch bản | light | dark |
  |---|---|---|
  | `list-empty` — Settings › Custom Attributes rỗng | 0.030% | 0.031% |
  | `list` — 2 thuộc tính hội thoại (text + list) | 0.030% | 0.031% |
  | `add` — modal thêm (so theo dải, bỏ vùng ô Key) | 0.000% | 0.000% |
  | `edit` — modal sửa (so theo dải, bỏ vùng ô Key) | 0.000% | 0.000% |
  | `panel-conv` — accordion Conversation Information, 2 thuộc tính đã set giá trị | 0.000% | 0.000% |
  | `panel-contact` — accordion Contact Attributes, 2 thuộc tính đã set giá trị | 0.000% | 0.000% |
  | `filter` — bộ lọc hội thoại có điều kiện custom attribute | 0.000% | 0.000% |
  | `save-filter` — modal "Do you want to save this filter?" | 0.000% | 0.000% |
  | `sidebar-folder` — nhóm Folders có 1 folder | 0.000% | 0.000% |
  | `sidebar-segment` — nhóm Segments có 1 segment | 0.000% | 0.000% |
  | `contacts-filter` — trang Contacts với bộ lọc đang mở | 0.000% | 0.000% |

  Fixture (4 định nghĩa thuộc tính, giá trị trên hội thoại/liên hệ, 1 folder + 1 segment) được tạo
  trước và **xoá ngay sau** mỗi lần chụp, ở CẢ hai bên. Đã kiểm lại sau khi chạy: oracle và yona đều
  trở về rỗng (`custom_attribute_definitions`, `custom_filters` hai loại, `custom_attributes` của
  hội thoại và liên hệ).

- `audit-buttons.mjs` — so từng dòng với oracle:

  | Trang | Kết quả |
  |---|---|
  | `/settings/custom-attributes/list` | **giống hệt oracle từng dòng**: 2 nút tab DEAD ở cả hai bên (đổi tab trên account rỗng không đổi DOM), `Add Custom Attribute` OK |
  | `/dashboard` | **giống hệt oracle từng dòng**: `list-filter`, `arrow-up-down`, `arrow-right-to-line` đều OK |
  | `/contacts` | nút `list-filter` (E1) **OK** cả hai bên. Khác oracle duy nhất: nút "Message" DEAD ở yona — `ComposeConversation` là nợ có sẵn từ B2/B3, không thuộc E1 (đã ghi trong `ContactHeader.tsx`). Các nút DEAD còn lại trùng nhau |

- E2E thật `~/www/pixel-diff/e1-attributes-e2e.mjs` — **24/24 bước PASS**, tự dọn fixture:
  đăng nhập → mở modal thêm (kiểm tra **không có ô "Key"**) → điền tên/mô tả, chọn kiểu List, gõ 2 giá trị
  → Create → API xác nhận key tự sinh `goi_quan_tam`, kiểu `list`, đủ 2 giá trị → thuộc tính hiện trong
  danh sách → mở hội thoại, accordion Conversation Information hiện thuộc tính → chọn "Nâng cao" bằng chuột
  → API xác nhận `custom_attributes` của hội thoại → mở bộ lọc, chọn thuộc tính + giá trị → Apply
  (`POST /conversations/filter` 200, danh sách còn đúng hội thoại) → Save filter → điều hướng sang
  `/custom_view/{id}`, sidebar hiện folder, mở ra đúng hội thoại → **F5** vẫn đúng → xoá folder qua UI
  → trang Contacts: mở bộ lọc, Apply (`POST /contacts/filter` 200) → Save segment → điều hướng sang
  `/contacts/segments/{id}`, sidebar hiện segment, mở ra đúng liên hệ → xoá segment qua UI
  → xoá thuộc tính qua UI (modal gõ đúng tên để xác nhận).

## Nợ / cần theo dõi

1. ~~`custom_attributes` rỗng serialize thành `[]`~~ — **ĐÃ SỬA 06/09** (agent `e1-fix`):
   trait `App\Http\Resources\Concerns\SerializesAttributeMaps` là nơi DUY NHẤT ép map thuộc tính về
   object; chi tiết ở `e1-notes-be.md` mục "Sửa sau QA".
2. Nút "Message" trên trang Contacts vẫn DEAD (ComposeConversation, nợ B2/B3) — audit-buttons bắt được,
   không thuộc E1.
3. `ActiveFilterPreview` và huy hiệu thuộc tính chờ nhóm sau cắm vào (xem "Khác biệt cố ý" #3, #5).

## Lệnh chạy lại

```bash
# FE
cd ~/www/yona
npx tsc --noEmit
npx vitest run
npm run build
php artisan i18n:generate

# Pixel-diff (cần oracle :3000 + yona :8000 đang chạy)
cd ~/www/pixel-diff
node e1-attributes-ui.mjs            # tất cả kịch bản
node e1-attributes-ui.mjs edit       # một kịch bản
node audit-buttons.mjs http://localhost:8000 /settings/custom-attributes/list
node audit-buttons.mjs http://localhost:8000 /contacts
node audit-buttons.mjs http://localhost:8000 /dashboard

# E2E thật (tạo/gán/lọc/lưu/xoá bằng chuột, tự dọn fixture)
node e1-attributes-e2e.mjs
```

---

## Sửa sau QA (agent `e1-fix`, 06/09/2026)

Hai phát hiện của phiên chính khi QA trên trình duyệt.

### 1. Ẩn key kỹ thuật khỏi danh sách thuộc tính (lệnh founder)

| File | Việc |
|---|---|
| `resources/js/dashboard/components-next/ConversationWorkflow/AttributeListItem.tsx` | bỏ prop `value` (key), dòng phụ chỉ còn mô tả, đổi icon `key-round` → `align-left` |
| `resources/js/dashboard/settings/attributes/Index.tsx` | không map `attribute_key` vào item nữa; bỏ `attribute_key` khỏi trường tìm kiếm |

Form thêm/sửa đã không có ô Key từ trước; không còn chỗ nào trong `settings/attributes/**` hiển thị key
(tooltip/modal đều không dùng). Key vẫn có trong payload API và trong mọi đường dữ liệu nội bộ
(bộ lọc, panel hội thoại, pre-chat) — chỉ ẩn khỏi mắt người dùng.

**Khác biệt cố ý + vùng che:** `ATTRIBUTE_KEY_LINE_MASKS` trong `~/www/pixel-diff/e1-attributes-ui.mjs`
(kịch bản `list`), đồng bộ với `mask-diff.mjs#'e1-list'`. Che đúng hai dòng phụ của hai thuộc tính
(`[280,244,420,26]`, `[280,325,420,26]`); mọi thứ ngoài hai dòng đó vẫn so đủ.

### 2. Pixel-diff `e1-attributes-ui.mjs` — 22/22 ĐẠT sau khi sửa

| Kịch bản | light | dark |
|---|---|---|
| `list-empty` | 0.030% | 0.031% |
| `list` (sau che dòng key) | 0.030% | 0.031% |
| `add` / `edit` | 0.000% | 0.000% |
| `panel-conv` / `panel-contact` | 0.000% | 0.000% |
| `filter` / `save-filter` | 0.000% | 0.000% |
| `sidebar-folder` / `sidebar-segment` | 0.000% | 0.000% |
| `contacts-filter` | 0.000% | 0.000% |

Script được làm **bất biến theo trạng thái** (xem bẫy #9, #10): tự đặt đúng trạng thái hai accordion
panel liên hệ, tự đóng panel trước kịch bản filter.

### 3. Dọn fixture

- Định nghĩa thuộc tính (kể cả "Gói quan tâm") và custom filter: **rỗng cả hai bên**;
  `custom_attributes` của hội thoại display 4 (yona) và 1 (oracle) đều `{}`, liên hệ tương ứng đã sạch.
- `ui_settings.conversation_display_type` của john trên yona trả về `condensed` (bằng oracle).
- `~/www/pixel-diff/reset-fixture.sh`: chạy xong. Ghi nhận yona còn **hội thoại 58** ngoài fixture
  (oracle chỉ có 1) — không phải của E1, để phiên chính quyết định.

### Gate

| Gate | Kết quả |
|---|---|
| `npx tsc --noEmit` | sạch (0 dòng) |
| `npx vitest run` | 76 file / 576 test xanh |
| `npm run build` | xanh (chạy trước mỗi lượt pixel-diff) |
| Pest toàn suite (`DB_DATABASE=yona_rw_test_e1fix`) | **1588 passed**, DB đã `dropdb` |
| Pint | passed trên các file đã sửa |
