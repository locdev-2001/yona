# E2 — Tìm kiếm toàn cục (Global Search) · agent `e2` · 06/09/2026

Port `SearchService` + `SearchController` + toàn bộ module `dashboard/modules/search` của
Chatwoot v4.17.1 sang Laravel + Inertia/React.

## CONTRACT API (cho agent khác đọc)

Tất cả dưới `GET /api/v1/accounts/{account}/search…`, auth session hoặc `api_access_token`.
Query: `q` (bắt buộc về nghĩa, rỗng vẫn 200), `page` (mặc định 1, 15 bản ghi/trang),
`since` / `until` (unix, chỉ có tác dụng khi bật `advanced_search`),
`from` (`contact:{id}` | `agent:{id}`) và `inbox_id` — hai cái sau CHỈ áp cho `/messages`.

| Route | payload |
|---|---|
| `GET /search` | `{payload:{conversations[],contacts[],messages[],articles[]}}` |
| `GET /search/conversations` | `{payload:{conversations[]}}` — bản này CÓ `additional_attributes` |
| `GET /search/contacts` | `{payload:{contacts[]}}` |
| `GET /search/messages` | `{payload:{messages[]}}` (shape `MessageResource`) |
| `GET /search/articles` | `{payload:{articles:[]}}` — luôn rỗng tới E4 |

Shape con:
- `contact`: `email, id, name, phone_number, identifier, additional_attributes, last_activity_at`
  (hẹp hơn `ContactResource` chung: KHÔNG có `thumbnail`, `custom_attributes`, `created_at`).
- `conversation`: `id` = **display_id**, `account_id`, `created_at`, `message` (tin đầu tiên,
  `{}` nếu hội thoại chưa có tin), `contact`, `inbox` (`id, channel_id, name, channel_type`),
  `agent` (`id, available_name, email, name, role`). Khối vắng mặt là `{}` chứ không phải `null`.
- Không có `meta` — FE suy ra "còn trang" từ việc số bản ghi trả về đúng bằng 15.

## Trace Ruby ↔ PHP

| Chatwoot | Yona |
|---|---|
| `app/services/search_service.rb` | `app/Services/SearchService.php` |
| `#perform` (case search_type) | `SearchService::perform()` (match) |
| `#filter_conversations` | `filterConversations()` |
| `#filter_messages` → gin/like | `filterMessages()` → `filterMessagesWithGin()` / `filterMessagesWithLike()` |
| `#message_base_query` | `messageBaseQuery()` (public để test soi SQL như spec gốc) |
| `#apply_message_filters` / `#apply_sender_filter` / `#parse_from_param` / `#apply_inbox_id_filter` | cùng tên camelCase |
| `#should_skip_inbox_filtering?` / `#user_has_access_to_all_inboxes?` | `shouldSkipInboxFiltering()` / `userHasAccessToAllInboxes()` |
| `#filter_contacts` (+ `resolved_contacts`, `order_on_last_activity_at`) | `filterContacts()` dùng scope `resolvedContacts` / `orderOnLastActivityAt` có sẵn |
| `#apply_time_filter` + `cap_since_time` / `cap_until_time` | `applyTimeFilter()` + `capSinceTime()` / `capUntilTime()` |
| `Limits::MESSAGE_SEARCH_TIME_RANGE_LIMIT_DAYS = 90` | hằng `SearchService::TIME_RANGE_LIMIT_DAYS` |
| `Api::V1::Accounts::SearchController` | `app/Http/Controllers/WebApi/SearchController.php` |
| `search/_contact.json.jbuilder` | `App\Http\Resources\Search\SearchContactResource` |
| `search/_inbox.json.jbuilder` | `SearchInboxResource` |
| `search/_agent.json.jbuilder` | `SearchAgentResource` |
| `search/_conversation_search_result.json.jbuilder` + khối inline của `conversations.json.jbuilder` | `SearchConversationResource` (cờ `withAdditionalAttributes`) |
| `search/_message.json.jbuilder` → `api/v1/models/_message` | `MessageResource` (dùng lại, không nhân bản) |

## Trace Vue ↔ TSX

| Chatwoot (`dashboard/modules/search/`) | Yona (`resources/js/dashboard/search/`) |
|---|---|
| `components/SearchView.vue` | `SearchView.tsx` (trang Inertia, prop `tab?`) |
| `components/SearchHeader.vue` | `components/SearchHeader.tsx` |
| `components/SearchInput.vue` | `components/SearchInput.tsx` |
| `components/RecentSearches.vue` | `components/RecentSearches.tsx` |
| `components/SearchTabs.vue` | `components/SearchTabs.tsx` |
| `components/SearchResultSection.vue` | `components/SearchResultSection.tsx` |
| `components/SearchResult{Contacts,Conversations,Messages,Articles}List.vue` | cùng tên `.tsx` |
| `components/SearchResult{Contact,Conversation,Message,Article}Item.vue` | cùng tên `.tsx` |
| `components/MessageContent.vue` | `components/MessageContent.tsx` |
| `components/SearchFilters.vue` | `components/SearchFilters.tsx` |
| `components/SearchDateRangeSelector.vue` | `components/SearchDateRangeSelector.tsx` |
| `components/SearchInboxSelector.vue` | `components/SearchInboxSelector.tsx` |
| `components/SearchContactAgentSelector.vue` | `components/SearchContactAgentSelector.tsx` |
| `components/TranscribedText.vue` | **không port** (xem Khác biệt cố ý) |
| `helpers/searchHelper.js` | `helpers/searchHelper.ts` |
| `store/modules/conversationSearch.js` | `store.ts` (ô nhớ module + `useSyncExternalStore`) |
| `api/search.js` | `api.ts` |
| `search.routes.js` | route `web.php` `/search/{tab?}` (đã có sẵn) |
| `shared/composables/useExpandableContent.js` | `useExpandableContent.ts` (trong module search) |
| `composables/useInbox` | `useInboxLookup.ts` (đọc `inboxes` từ shared props Inertia) |
| `i18n/locale/en/search.json` | `lang/en/search.php` + `artisan i18n:generate` |

## Trace spec ↔ test

| RSpec | Pest / Vitest |
|---|---|
| `spec/services/search_service_spec.rb` | `tests/Feature/Services/SearchServiceTest.php` — 25 test |
| `spec/controllers/api/v1/accounts/search_controller_spec.rb` | `tests/Feature/WebApi/SearchControllerTest.php` — 13 test |
| `modules/search/helpers/specs/searchHelper.spec.js` | `resources/js/dashboard/search/helpers/searchHelper.test.ts` — 15 test |
| (không có spec cho store) | `resources/js/dashboard/search/store.test.ts` — 6 test, khoá hai bất biến ghi trong comment nguồn |

## Khác biệt cố ý

1. **Bỏ nhánh Elasticsearch/Searchkick.** `should_run_advanced_search?` yêu cầu
   `ChatwootApp.advanced_search_allowed?` = `enterprise? && OPENSEARCH_URL` — enterprise, cấm port.
   Còn lại đúng hai đường CE: GIN (`content @@ to_tsquery`) và ILIKE. `advanced_search_with_fallback`
   và toàn bộ khối spec `:opensearch` do đó không có bản PHP.
2. **`articles` luôn rỗng.** Help Center (portals/articles) vào ở E4; giữ nguyên khoá `articles`
   trong payload để FE không phải đổi shape khi E4 xong — chỉ cần thay thân `filterArticles()`.
3. **Bộ lọc nâng cao gate bằng cờ `advanced_search`, KHÔNG có installation type.** Bản gốc bọc
   `SearchFilters` trong `<Policy :installation-types="[ENTERPRISE, CLOUD]" :feature-flag="ADVANCED_SEARCH">`.
   Yona không có khái niệm community/cloud/enterprise nên chỉ còn cờ tính năng. Mặc định cờ tắt →
   trạng thái nhìn thấy giống hệt oracle (không có bộ lọc).
4. **Bỏ `Policy` theo permission vai trò tuỳ biến** (`CONVERSATION_PERMISSIONS`, `CONTACT_PERMISSIONS`,
   `PORTAL_PERMISSIONS`) — custom role là EE; ở CE mọi vai trò thấy đủ mục. Chỉ còn `help_center`
   quyết định tab/nhóm Articles.
5. **`TranscribedText.vue` không port.** Lời thoại tệp âm thanh (`transcribed_text`) là Captain/EE,
   payload đính kèm của Yona chưa mang trường đó — đúng ghi chú sẵn có ở `chips/Audio.tsx`.
   `MessageContent` vẫn giữ thứ tự ưu tiên `content` → `email.subject` → (transcript, hiện trả rỗng).
6. **`v-dompurify-html` → `dangerouslySetInnerHTML`.** An toàn tương đương vì chuỗi đã qua
   `getPlainText` (bóc markdown) rồi `escapeHtml`; thẻ thật duy nhất còn lại là `<span class="searchkey--highlight">`
   do chính ta chèn.
7. **SCSS scoped của `MessageContent` → biến thể Tailwind inline** (`[&_p]:inline [&_p]:m-0 [&_br]:hidden`)
   để không thêm file CSS toàn cục.
8. **Attachment giữ khoá snake_case.** `api.ts` liệt `attachments` vào `stopPaths` của `camelizeKeys`
   để khớp `MessageAttachment` mà `chips/File|Audio` của Yona đang dùng — không nhân bản kiểu.

## File đã sửa NGOÀI vùng sở hữu (tối thiểu, ghi rõ để phiên chính rà)

- `resources/js/app.tsx`: thêm `'./dashboard/search/*.tsx'` vào `import.meta.glob`.
  Thiếu dòng này Inertia ném `Page not found: dashboard/search/SearchView` và trang trắng.
- `resources/js/dashboard/components-next/dropdown-menu/DropdownMenu.tsx`: thêm nhánh
  `menuSections` (nhóm có tiêu đề / loading / empty riêng) + `disableLocalFiltering`,
  `isSearching`, `onSearch` — đúng theo `DropdownMenu.vue` gốc, hai selector bộ lọc cần.
  Đường `menuItems` cũ giữ nguyên hành vi (đã tách hàm `renderItem` dùng chung).
- `resources/js/i18n/generated/en.ts`: sinh lại bằng `php artisan i18n:generate` sau khi thêm
  `lang/en/search.php` (file generated, không sửa tay).

> Lưu ý cùng working tree: hai file `DropdownMenu.tsx` + `en.ts` đã bị **agent khác commit kèm**
> vào `52d52a9`/`650cf6d` trong lúc E2 còn đang làm. Nội dung vẫn đúng, chỉ là không còn nằm trong
> danh sách "chưa commit" khi phiên chính rà `git status`.

## Bẫy đã trả giá

1. **`whereRaw` với binding có tên (`:search`) trộn positional → `SQLSTATE[HY093]`.** Laravel
   ghép câu lệnh của builder (positional) với whereRaw, PDO không cho trộn. Phải dùng `?`
   + `array_fill`.
2. **Laravel KHÔNG tự bọc `whereRaw` trong ngoặc, Rails thì có.** `where("a OR b")` của Rails ra
   `(a OR b)`; Laravel ghép thẳng nên `account_id = X AND a OR b` — OR nuốt luôn điều kiện tenant.
   Đã tự bọc ngoặc ở cả conversation và contact query. Lỗi này im lặng, test đa-account mới bắt được.
3. **`$account->update(['feature_flags' => …])` không có tác dụng** — `feature_flags` không nằm
   trong `$fillable` của `Account`. Test phải dùng `forceFill(...)->save()` (đúng lối
   `AssignmentServiceTest` đã làm).
4. **`sender_type` lưu tên lớp Ruby qua morphMap** (`'User'` / `'Contact'`), không phải FQCN —
   `parse_from_param` phải trả chuỗi đó, nếu trả `User::class` thì bộ lọc `from` luôn rỗng.
5. **Fixture pixel-diff sót lại làm seed thất bại IM LẶNG.** Một lần chạy hỏng giữa chừng để lại
   liên hệ trùng email → `POST /contacts` trả 422 → `contactId` undefined → không có hội thoại,
   oracle hiện "No messages found" trong khi Yona đầy đủ, diff 1%. Harness giờ `purgeFixture()`
   trước khi seed và **ném lỗi** nếu seed không ra id.
6. **`useRef<T>()` không đối số bị TS bắt lỗi** ở React 19 typings — phải `useRef<T>(undefined)`.
7. **Migration của agent khác làm hỏng toàn suite.** `2026_09_06_970000_create_help_center_tables.php`
   (e4-be) có lúc thiếu ngoặc quanh biểu thức index GIN → mọi test của MỌI agent đỏ. Đã tự khỏi khi
   e4-be sửa; ghi lại vì cùng working tree.
8. **`createdb` phải chạy bằng superuser `postgres`** (`yona_owner` không có quyền tạo DB), rồi
   `ALTER SCHEMA public OWNER TO yona_owner` + `CREATE EXTENSION pg_trgm, pgcrypto`.

## Index pg_trgm — đã có sẵn, KHÔNG thêm migration

- `index_messages_on_content` (gin, `content gin_trgm_ops`) — `2026_09_01_300000_create_conversations_tables.php:118`
- `index_contacts_on_name_email_phone_number_identifier` (gin, 4 cột `gin_trgm_ops`) —
  `2026_09_01_200000_create_contacts_tables.php:45`

Đúng bộ index của Chatwoot; nhánh B đã port. Không cần migration mới cho E2.

## Kết quả gate

| Gate | Kết quả |
|---|---|
| Pest E2 riêng | `SearchServiceTest` 25 pass, `SearchControllerTest` 13 pass |
| Pest toàn suite (`yona_rw_test_e2`) | **1532 test / 3732 assertion — xanh hết**; DB đã `dropdb` sau khi chạy |
| Pint | passed (file của E2) |
| `npx tsc --noEmit` | 0 lỗi ở file của E2 (xem ghi chú lỗi của agent khác bên dưới) |
| `npx vitest run` | 73 file / 528 test pass (gồm 21 test mới của E2) |
| `npx vite build` | build sạch |
| Pixel-diff `e2-search-ui.mjs` (ngưỡng 0.1%) | **0.000% trên cả 5 kịch bản × light/dark** sau khi che sidebar + số `#display_id` (xem mục dưới); số thô 0.03–0.21% |
| `audit-buttons.mjs … /search` | Yona 1 nút (`Back` → `/dashboard`) — oracle giống hệt 1 nút, cùng đích |
| E2E `e2-search-e2e.mjs` | **12/12 bước xanh** |

### Số đo pixel-diff (light / dark)

Chạy **thô** (chưa che gì) hai lượt đầu:

| Kịch bản | Lượt 1 | Lượt 2 |
|---|---|---|
| `empty` | 0.031 / 0.032 | 0.034 / 0.034 |
| `results` | 0.095 / 0.093 | 0.046 / 0.111 |
| `contacts` | 0.032 / 0.033 | 0.034 / 0.035 |
| `conversations` | 0.041 / 0.042 | 0.043 / 0.040 |
| `messages` | 0.070 / 0.063 | 0.071 / 0.062 |

Số thô dao động 0.03–0.21% giữa các lượt, **không phải khác biệt layout của E2**. Đã truy ra đúng
hai nguồn, cả hai đều nằm ngoài vùng nội dung của màn tìm kiếm:

1. **Cột sidebar** — ngoài logo / badge số chưa đọc / avatar lệch cố định, chữ trong menu
   (Conversations, Contacts, Reports…) còn lệch 1px do font nạp không cùng nhịp giữa hai app;
   lệch này **bập bùng theo lượt chạy** (lượt này `contacts light` 0.119%, lượt khác 0.032%).
   Nhiễu nền của A3, khoá `'d2-reports'` cũng đã che nguyên cột vì lý do tương tự.
2. **Số `#display_id`** — hai fixture đếm khác nhau (oracle #42–46, Yona #73–86) nên chữ số rộng
   khác nhau, đẩy tên inbox ngay sau nó lệch vài pixel.

`e2-search-ui.mjs` giờ che đúng hai vùng đó rồi mới chấm (cùng bộ hộp với khoá `'e2-search'` đã đăng
ký trong `mask-diff.mjs`), và vẫn in số thô để soi được:
`… lệch X% (đã che) — thô Y%`. Ảnh lưu hai bản: `<slug>-diff.png` (thô) và `<slug>-masked-diff.png`.

Chấm lại sau khi che — **0 pixel lệch trên toàn bộ 5 kịch bản × light/dark**:

```
node mask-diff.mjs e2-search-{empty,results,contacts,conversations,messages}-{light,dark}
e2-search-empty-light:         0.000% (0 px) ĐẠT
e2-search-empty-dark:          0.000% (0 px) ĐẠT
e2-search-results-light:       0.000% (0 px) ĐẠT
e2-search-results-dark:        0.000% (0 px) ĐẠT
e2-search-contacts-light:      0.000% (0 px) ĐẠT
e2-search-contacts-dark:       0.000% (0 px) ĐẠT
e2-search-conversations-light: 0.000% (0 px) ĐẠT
e2-search-conversations-dark:  0.000% (0 px) ĐẠT
e2-search-messages-light:      0.000% (0 px) ĐẠT
e2-search-messages-dark:       0.000% (0 px) ĐẠT
```

Hộp che gồm: nguyên cột sidebar `[0,0,200,800]` và ba vị trí thẻ kết quả mang `#display_id`
(`y≈210` cho tab đơn, `y≈420` / `y≈587` cho hai khối Messages/Conversations của tab All).

Nói cách khác: bỏ sidebar (không thuộc E2) và số id fixture ra, **toàn bộ nội dung màn tìm kiếm
trùng khít từng pixel với Chatwoot** ở cả light lẫn dark — khung, khoảng cách, tiêu đề nhóm, thẻ
kết quả, phần tô sáng từ khoá, trạng thái rỗng, khối recent searches.

### Bộ lọc: KHÔNG pixel-diff được với oracle này

Oracle là bản **community** nên `<Policy :installation-types="[ENTERPRISE, CLOUD]">` chặn
`SearchFilters` **kể cả khi đã bật `advanced_search`** — đã thử bật cờ trên account 1, chụp lại,
khối bộ lọc vẫn không render, và đã **tắt cờ trả lại nguyên trạng**. Vì vậy kịch bản `filters`
trong harness giữ nguyên nhưng chỉ chạy được khi có oracle enterprise/cloud.

Thay vào đó tự kiểm trên Yona bằng `~/www/pixel-diff/e2-filters-selfcheck.mjs` (bật cờ
`advanced_search` cho account 2, chụp, rồi **tắt cờ trả lại**): 4 ảnh
`shots/e2-filters-{closed,time,sender,inbox}.png` — nút "Filter by time" mở đúng menu 4 preset +
khối Custom range hai ô ngày + Clear/Apply; "Sender" mở dropdown hai nhóm CONTACTS/AGENTS có ô tìm;
"Inbox" mở nhóm INBOXES. Không có lỗi JS.

## Script kiểm chứng (đều nằm trong `~/www/pixel-diff`)

- `e2-search-ui.mjs [empty|results|contacts|conversations|messages|filters]` — pixel-diff light+dark,
  tự seed 1 liên hệ + 1 hội thoại có tin "bảo hành" hai bên và dọn sau.
- `e2-search-e2e.mjs` — e2e bấm thật trên Yona, 12 bước.
- `e2-filters-selfcheck.mjs` — chụp khối bộ lọc của Yona (cần bật `advanced_search` trước).
- `e2-probe.mjs <base>` — mở nhanh `/search` một bên, in danh sách input + lỗi console.

## Lỗi thuộc agent khác (KHÔNG sửa hộ, ghi lại theo quy ước)

`npx tsc --noEmit` ở lượt chấm cuối báo 1 lỗi trong file mới của **e4-fe**:

```
resources/js/portal/components/PublicArticleSearch.tsx(24,22): error TS2554: Expected 1 arguments, but got 0.
```

Đúng bẫy số 6 của E2: `useRef<ReturnType<typeof setTimeout>>()` phải truyền `undefined`
→ `useRef<ReturnType<typeof setTimeout>>(undefined)`. Lúc E2 chạy gate riêng (trước khi file đó
xuất hiện) `tsc` sạch 0 lỗi.

## Việc còn nợ cho nhóm sau

- **E4 (Help Center):** thay thân `SearchService::filterArticles()` (hiện `return []`) bằng
  `Article::textSearch($q)` + `applyTimeFilter(..., 'updated_at')` + phân trang 15, rồi thêm
  `SearchArticleResource` theo `search/_article.json.jbuilder`
  (`id,title,locale,content,slug,portal_slug,account_id,category_name,status,updated_at`).
  FE đã sẵn sàng: `SearchResultArticlesList/Item` + tab Articles + kiểu `SearchArticle` đã port đủ.
  Link của item trỏ `accounts/{id}/portals/{slug}/{locale}/articles/edit/{id}` — route đó E4-fe phải thêm.
- Nếu sau này có oracle enterprise/cloud: chạy `node e2-search-ui.mjs filters` để chốt pixel bộ lọc.
