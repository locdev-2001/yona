# E4 Help Center — backend (agent `e4-be`, 06/09/2026)

---

## 0. ROUTE CẦN PHIÊN CHÍNH THÊM

Chưa sửa `routes/*.php`. Pest tự đăng ký đúng danh sách dưới đây qua
`tests/Support/HelpCenterRoutes.php` (nguồn duy nhất — copy nguyên vào route file).

### `routes/web_api.php` — trong nhóm `/api/v1/accounts/{account}` sẵn có

```php
Route::get('/portals', [PortalsController::class, 'index']);
Route::post('/portals', [PortalsController::class, 'store']);
Route::get('/portals/{slug}', [PortalsController::class, 'show']);
Route::match(['put', 'patch'], '/portals/{slug}', [PortalsController::class, 'update']);
Route::delete('/portals/{slug}', [PortalsController::class, 'destroy']);
Route::patch('/portals/{slug}/archive', [PortalsController::class, 'archive']);
Route::delete('/portals/{slug}/logo', [PortalsController::class, 'destroyLogo']);
Route::post('/portals/{slug}/send_instructions', [PortalsController::class, 'sendInstructions']);

Route::get('/portals/{portalSlug}/categories', [CategoriesController::class, 'index']);
Route::post('/portals/{portalSlug}/categories', [CategoriesController::class, 'store']);
Route::post('/portals/{portalSlug}/categories/reorder', [CategoriesController::class, 'reorder']);
Route::get('/portals/{portalSlug}/categories/{categoryId}', [CategoriesController::class, 'show'])->whereNumber('categoryId');
Route::match(['put', 'patch'], '/portals/{portalSlug}/categories/{categoryId}', [CategoriesController::class, 'update'])->whereNumber('categoryId');
Route::delete('/portals/{portalSlug}/categories/{categoryId}', [CategoriesController::class, 'destroy'])->whereNumber('categoryId');

Route::post('/portals/{portalSlug}/articles/bulk_actions/translate', [ArticleBulkActionsController::class, 'translate']);
Route::patch('/portals/{portalSlug}/articles/bulk_actions/update_status', [ArticleBulkActionsController::class, 'updateStatus']);
Route::patch('/portals/{portalSlug}/articles/bulk_actions/update_category', [ArticleBulkActionsController::class, 'updateCategory']);
Route::delete('/portals/{portalSlug}/articles/bulk_actions/delete_articles', [ArticleBulkActionsController::class, 'deleteArticles']);

Route::get('/portals/{portalSlug}/articles', [ArticlesController::class, 'index']);
Route::post('/portals/{portalSlug}/articles', [ArticlesController::class, 'store']);
Route::post('/portals/{portalSlug}/articles/reorder', [ArticlesController::class, 'reorder']);
Route::get('/portals/{portalSlug}/articles/{articleId}', [ArticlesController::class, 'show'])->whereNumber('articleId');
Route::get('/portals/{portalSlug}/articles/{articleId}/edit', [ArticlesController::class, 'edit'])->whereNumber('articleId');
Route::match(['put', 'patch'], '/portals/{portalSlug}/articles/{articleId}', [ArticlesController::class, 'update'])->whereNumber('articleId');
Route::delete('/portals/{portalSlug}/articles/{articleId}', [ArticlesController::class, 'destroy'])->whereNumber('articleId');
```

Use: `App\Http\Controllers\WebApi\PortalsController`, `…\CategoriesController`, `…\ArticlesController`,
`App\Http\Controllers\WebApi\Articles\BulkActionsController as ArticleBulkActionsController`.

### `routes/web.php` (hoặc file public riêng) — help center công khai, KHÔNG auth

Thứ tự BẮT BUỘC giữ nguyên (route `articles`/`.md`/`.png` phải đứng trước `{locale}`):

```php
Route::prefix('/hc')->group(function () {
    Route::get('/{slug}/articles/{articleSlug}.md', [PublicArticlesController::class, 'showMarkdown']);
    Route::get('/{slug}/articles/{articleSlug}.png', [PublicArticlesController::class, 'trackingPixel']);
    Route::get('/{slug}/articles', [PublicArticlesController::class, 'index']);
    Route::get('/{slug}/articles/{articleSlug}', [PublicArticlesController::class, 'show']);
    Route::get('/{slug}/{locale}/search', [PublicSearchController::class, 'index']);
    Route::get('/{slug}/{locale}/articles', [PublicArticlesController::class, 'index']);
    Route::get('/{slug}/{locale}/categories', [PublicCategoriesController::class, 'index']);
    Route::get('/{slug}/{locale}/categories/{categorySlug}', [PublicCategoriesController::class, 'show']);
    Route::get('/{slug}/{locale}/categories/{categorySlug}/articles', [PublicArticlesController::class, 'index']);
    Route::get('/{slug}/{locale}', [PublicPortalsController::class, 'show']);
    Route::get('/{slug}', [PublicPortalsController::class, 'show']);
});
```

Use: `App\Http\Controllers\Public\Portals\{PortalsController, ArticlesController, CategoriesController, SearchController}`.

Chưa port (E4-fe / phiên chính): `GET /hc/{slug}/sitemap.xml` (view XML) và
`GET /portals/{slug}/ssl_status` (enterprise, bỏ hẳn).

---

## 1. CONTRACT API (cho `e4-fe`)

Mọi endpoint dashboard nằm dưới `/api/v1/accounts/{account}`, dùng session (`web_api`).
Quyền: **đọc mở cho mọi thành viên ở `portals#index/#show` và `categories#index`**;
mọi thứ còn lại đòi **administrator** → `401` `{"message":"You are not authorized to do this action"}`.
Không tìm thấy → `404` `{"error":"Resource could not be found"}`.
Sai dữ liệu → `422` `{"message":"<các lỗi nối bằng ', '>"}`;
lỗi nghiệp vụ riêng (analytics, bulk actions, send_instructions) → `422` `{"error":"<câu>"}`.

> **Ô slug: ẨN TRÊN FORM.** API vẫn nhận `slug` để tương thích, nhưng khi thiếu thì
> backend tự sinh slug ASCII không dấu từ tên/tiêu đề (`Trung tâm trợ giúp` →
> `trung-tam-tro-giup`), tự thêm hậu tố `-2`, `-3`… nếu trùng. FE **không** được
> hiển thị hay bắt buộc nhập slug ở form portal / category / article.

### 1.1 Portals

| Method | Path | Ghi chú |
|---|---|---|
| GET | `/portals` | `{ payload: Portal[], meta: { current_page, portals_count } }` |
| POST | `/portals` | body `{ portal: {...}, inbox_id?, blob_id? }` → `Portal` |
| GET | `/portals/{slug}?locale=en` | `Portal` (meta đếm theo locale) |
| PUT/PATCH | `/portals/{slug}` | như POST |
| DELETE | `/portals/{slug}` | 200, body rỗng |
| PATCH | `/portals/{slug}/archive` | 200 |
| DELETE | `/portals/{slug}/logo` | 200 |
| POST | `/portals/{slug}/send_instructions` | body `{ email }` → `{message:'Instructions sent successfully'}` |

`portal` nhận: `name`, `slug?`, `color`, `custom_domain`, `header_text`, `homepage_link`,
`page_title`, `archived`, `config`.
`config` nhận: `default_locale`, `layout` (`classic`|`documentation`), `allowed_locales[]`,
`draft_locales[]`, `social_profiles{facebook,x,instagram,linkedin,youtube,tiktok,github,whatsapp}`,
`locale_translations{<locale>:{name,page_title,header_text}}`,
`popular_content{<locale>:{category_ids[],article_ids[]}}`,
`analytics{gtm_container_id,ga4_measurement_id,hotjar_site_id,plausible_domain,amplitude_api_key,clarity_project_id,meta_pixel_id}`.

- `custom_domain` gửi kèm scheme sẽ bị rút về host (`https://a.dev` → `a.dev`); chuỗi rỗng → `null`.
- `inbox_id` (ngoài khối `portal`): id inbox Website để gắn live chat; `''` = gỡ liên kết;
  inbox của account khác → `404`.
- `blob_id` = `blob_id` trả về từ `POST /upload` → gắn làm logo. Gửi lại id số của logo đang có = không đổi gì.
- `draft_locales` **được giữ nguyên nếu payload không nhắc tới**; không được draft `default_locale` (422).
- `analytics` sai khoá hoặc giá trị không phải chuỗi → `422 {"error":"Invalid analytics configuration"}`;
  đúng khoá nhưng sai khuôn (vd `ga4_measurement_id` không dạng `G-XXXX`) → `422 {"message":"Config Ga4 measurement id is invalid"}`.

```jsonc
// Portal
{
  "id": 1, "color": "#1f93ff", "custom_domain": null, "header_text": null, "homepage_link": null,
  "name": "test_portal", "page_title": null, "slug": "portal-1", "archived": false, "account_id": 2,
  "config": {
    "allowed_locales": [{ "code": "en", "articles_count": 3, "categories_count": 1, "draft": false }],
    "default_locale": "en", "layout": "classic",
    "social_profiles": {}, "locale_translations": {}, "popular_content": {}, "analytics": {}
  },
  "inbox": { /* _inbox.json.jbuilder — chỉ khi portal gắn web widget */ },
  "logo": { "id": 9, "portal_id": 1, "file_type": "image/png", "account_id": 2,
            "file_url": "…", "blob_id": 9, "filename": "logo.png" },
  "meta": {
    "all_articles_count": 3, "archived_articles_count": 0, "published_count": 2,
    "draft_articles_count": 1, "mine_articles_count": 1,   // chỉ có ở #show và khi có bài
    "categories_count": 1, "default_locale": "en"
  },
  "ssl_settings": { "status": null, "verification_errors": null }
}
```
Ở `#index` / `#create` / `#update`, `meta.all_articles_count` = `0` và ba đếm còn lại = `null`
(bản gốc truyền mảng rỗng vào partial — giữ nguyên).

### 1.2 Categories

| Method | Path |
|---|---|
| GET | `/portals/{portalSlug}/categories?locale=&page=` |
| POST | `/portals/{portalSlug}/categories` |
| GET/PUT/PATCH/DELETE | `/portals/{portalSlug}/categories/{id}` |
| POST | `/portals/{portalSlug}/categories/reorder` body `{ positions_hash: { "<id>": 40, … } }` |

`category` nhận: `name`, `description`, `position`, `slug?`, `locale`, `icon`, `icon_color`,
`parent_category_id`, `associated_category_id`, `related_category_ids[]`.

```jsonc
// index: { payload: Category[], meta: { current_page, categories_count } }
// show/create/update: { payload: Category }
{
  "id": 3, "name": "Getting started", "slug": "getting-started", "locale": "en",
  "description": "…", "position": 1, "account_id": 2, "icon": "", "icon_color": "",
  "related_categories": [ { "id", "name", "slug", "locale", "description", "position", "account_id" } ],
  "parent_category": { …như trên… },   // chỉ khi có
  "root_category":  { …như trên… },    // chỉ khi có (associated_category_id)
  "meta": { "articles_count": 4 }      // đếm theo ?locale của request
}
```
Lỗi hay gặp: trùng `(slug, locale, portal)` → `422 {"message":"Locale should be unique in the category and portal"}`;
locale ngoài `allowed_locales` → `422 {"message":"Locale fr of category is not part of portal's [\"en\",\"es\"]."}`.
`related_categories` là quan hệ **một chiều**: gắn A→B không tạo B→A.

### 1.3 Articles

| Method | Path |
|---|---|
| GET | `/portals/{portalSlug}/articles?locale=&query=&category_slug=&status=&author_id=&page=` |
| POST | `/portals/{portalSlug}/articles` |
| GET | `/portals/{portalSlug}/articles/{id}` (+ `/edit`, cùng payload) |
| PUT/PATCH/DELETE | `/portals/{portalSlug}/articles/{id}` |
| POST | `/portals/{portalSlug}/articles/reorder` body `{ positions_hash }` → `{ positions: {"<id>": 10, …} }` |

`article` nhận: `title`, `slug?`, `position`, `content`, `description`, `category_id`, `author_id`,
`associated_article_id`, `status` (`draft`|`published`|`archived`), `locale`,
`draft_title`, `draft_content`, `meta{title,description,tags[]}`.

```jsonc
// index: { payload: Article[], meta: {...} } ; show/create/update: { payload: Article }
{
  "id": 7, "slug": "getting-started", "title": "…", "content": "…", "description": "…",
  "status": "published", "draft_title": null, "draft_content": null, "position": 10,
  "account_id": 2, "updated_at": 1788700000, "meta": {},
  "category": { "id": 3, "name": "…", "slug": "…", "locale": "en", "icon": "", "icon_color": "" },
  "views": 12,
  "author": { /* _agent.json.jbuilder — CHỈ khi tác giả còn là thành viên account */ },
  "associated_articles": [ { "id", "category_id", "title", "content", "description",
                             "status", "account_id", "portal": {…Portal…}, "views", "author"? } ]
}
// meta của index
{ "all_articles_count": 12, "archived_articles_count": 0, "articles_count": 3, "current_page": 1,
  "draft_articles_count": 1, "mine_articles_count": 0, "published_count": 2 }
```
- Trang 25 bài. `category_slug` có mặt → xếp theo `position`; ngược lại theo `updated_at` giảm dần.
- `all_articles_count` = TỔNG bài của portal; `articles_count` và các đếm tab = theo bộ lọc
  hiện tại **trừ** `status`/`author_id`.
- Không gửi `status` khi tạo → `draft`.
- `author_id` không phải thành viên account: khi **tạo** → `422 {"error":"Invalid author ID"}`;
  khi **sửa** → bị bỏ qua âm thầm, các trường khác vẫn lưu.
- `associated_article_id` luôn được quy về bài gốc của chuỗi liên kết.
- **Autosave nháp:** nếu body chỉ có `draft_title`/`draft_content` thì `updated_at` KHÔNG đổi.
- Slug đụng `search` / `articles` / `categories` → `422 {"message":"Slug is reserved"}`.

### 1.4 Article bulk actions

| Method | Path | Body |
|---|---|---|
| PATCH | `…/articles/bulk_actions/update_status` | `{ ids: [], status: 'draft'\|'published'\|'archived' }` |
| PATCH | `…/articles/bulk_actions/update_category` | `{ ids: [], category_id }` |
| DELETE | `…/articles/bulk_actions/delete_articles` | `{ ids: [] }` |
| POST | `…/articles/bulk_actions/translate` | luôn `501` (Captain — enterprise) |

Thành công → `200` body rỗng. Lỗi → `422 {"error": …}` với
`No articles found to process` / `Invalid status value` / `Category not found in this portal`.

### 1.5 Help center công khai (`/hc`, không đăng nhập)

Portal `archived` → `404`. Hiện chỉ trả JSON; trang HTML là việc của E4-fe.

- `GET /hc/{slug}` và `GET /hc/{slug}/{locale}` → HcPortal
  `{ custom_domain, header_text, homepage_link, name, page_title, slug, categories: HcCategory[], logo?, meta:{articles_count, categories_count, default_locale} }`
- `GET /hc/{slug}/{locale}/categories` → `{ payload: HcCategory[] }`;
  HcCategory = `{ name, slug, locale, description, position, meta:{articles_count} }`
- `GET /hc/{slug}/{locale}/categories/{categorySlug}` → HcCategory
- `GET /hc/{slug}/articles`, `/hc/{slug}/{locale}/articles`,
  `/hc/{slug}/{locale}/categories/{categorySlug}/articles`
  → `{ payload: HcArticle[] | SearchArticle[], meta:{articles_count} }`.
  Query: `query`, `locale`, `sort=views`, `status`, `page`, `per_page` (≤100, <1 → 25).
  **Có `query` thì payload đổi shape** thành `{ id, category_id, title, content(đoạn trích), link }`.
- `GET /hc/{slug}/articles/{articleSlug}` → HcArticle (thêm `portal`, `category{id,slug,locale}`,
  `author{available_name,name,thumbnail}`, `associated_articles[]`, `link:"hc/{slug}/articles/{articleSlug}"`).
  **Không** cộng lượt xem.
- `GET /hc/{slug}/articles/{articleSlug}.md` → markdown thô, chỉ bài published, ngược lại `404`.
- `GET /hc/{slug}/articles/{articleSlug}.png` → ảnh 1x1, cộng lượt xem nếu bài published,
  `Cache-Control: private, max-age=86400`.
- `GET /hc/{slug}/{locale}/search?query=&page=` → `{ payload: SearchArticle[], meta:{articles_count, current_page} }`,
  10 kết quả/trang, `query` rỗng trả `[]`.

### 1.6 View `.html.erb` công khai CẦN PORT (E4-fe) — chưa làm ở đợt này

Tất cả nằm ở `refs/chatwoot/app/views/public/api/v1/portals/`:

| Nhóm | File |
|---|---|
| Layout portal | `show.html.erb`, `show.html+plain.erb`, `show.html+documentation.erb`, `not_active.html.erb`, `sitemap.xml.erb`, `error/404.html.erb` |
| Mảnh dùng chung | `_header`, `_footer`, `_hero`, `_mobile_menu`, `_thumbnail`, `_authors`, `_article_count`, `_featured_articles`, `_home_categories`, `_category-block(.html+plain)`, `_uncategorized-block(.html+plain)` |
| Bài viết | `articles/index.html.erb`, `articles/show.html{,+plain,+documentation}.erb`, `articles/_article_body`, `_article_header`, `_content`, `_meta_head` |
| Category | `categories/index.html.erb`, `categories/show.html{,+plain,+documentation}.erb`, `categories/_article_list(.html+plain)`, `_category-block`, `_category-hero`, `_hero`, `_meta_head` |
| Tìm kiếm | `search/index.html{,+plain,+documentation}.erb`, `search/_form`, `_results`, `_results_header`, `_search_handler` |
| Layout "documentation" | `documentation_layout/_topbar`, `_sidebar`, `_hero`, `_breadcrumb`, `_footer`, `_empty_state`, `_section_header`, `_article_card`, `_category_card`, `_avatar_group`, `_user_avatar`, `documentation_layout/articles/_actions,_header,_meta_head`, `documentation_layout/categories/_header,_meta_head` |
| Layout ngoài | `refs/chatwoot/app/views/layouts/portal.html.erb` |

Ba biến thể của cùng một trang: mặc định (`classic`), `+plain` (khi `?show_plain_layout=true`,
dùng để nhúng iframe trong widget) và `+documentation` (khi `portal.config.layout == 'documentation'`).
Cả ba dùng chung dữ liệu JSON ở §1.5.

---

## 2. Bảng trace Ruby ↔ PHP

| Chatwoot (`refs/chatwoot`) | Yona |
|---|---|
| `db/schema.rb` portals/portals_members/categories/related_categories/articles | `database/migrations/2026_09_06_970000_create_help_center_tables.php` |
| `app/models/portal.rb` + `concerns/portal_config_schema.rb` | `app/Models/Portal.php` |
| `app/models/category.rb` | `app/Models/Category.php` |
| `app/models/article.rb` (PgSearch `text_search`) | `app/Models/Article.php` (`SEARCH_VECTOR` + `toTsQuery`) |
| `app/models/related_category.rb` | `app/Models/RelatedCategory.php` + pivot `relatedCategories()` |
| `application_record.rb#validates_column_content_length` | `app/Models/Concerns/SelfValidating.php::lengthMessages` |
| `render_record_invalid` (`{message, attributes}`) | `SelfValidating::validationSentence()` + `response()->json(['message'=>…],422)` |
| `app/policies/{portal,category,article}_policy.rb` | `app/Policies/{Portal,Category,Article}Policy.php` |
| `api/v1/accounts/portals_controller.rb` | `app/Http/Controllers/WebApi/PortalsController.php` |
| `api/v1/accounts/categories_controller.rb` | `app/Http/Controllers/WebApi/CategoriesController.php` |
| `api/v1/accounts/articles_controller.rb` | `app/Http/Controllers/WebApi/ArticlesController.php` |
| `api/v1/accounts/articles/bulk_actions_controller.rb` | `app/Http/Controllers/WebApi/Articles/BulkActionsController.php` |
| `public/api/v1/portals_controller.rb` | `app/Http/Controllers/Public/Portals/PortalsController.php` |
| `public/api/v1/portals/base_controller.rb` | `app/Http/Controllers/Public/Portals/BaseController.php` |
| `public/api/v1/portals/articles_controller.rb` | `app/Http/Controllers/Public/Portals/ArticlesController.php` |
| `public/api/v1/portals/categories_controller.rb` | `app/Http/Controllers/Public/Portals/CategoriesController.php` |
| `public/api/v1/portals/search_controller.rb` | `app/Http/Controllers/Public/Portals/SearchController.php` |
| `views/api/v1/accounts/portals/_portal.json.jbuilder` + `models/_portal_config` | `app/Http/Resources/PortalResource.php` |
| `views/api/v1/accounts/categories/_category` + `_associated_category` | `app/Http/Resources/CategoryResource.php` |
| `views/api/v1/accounts/articles/_article` + `_associated_article` | `app/Http/Resources/ArticleResource.php` |
| `views/public/api/v1/models/hc/_portal` | `app/Http/Resources/Public/Hc/PortalResource.php` |
| `views/public/api/v1/models/_category` | `app/Http/Resources/Public/Hc/CategoryResource.php` |
| `views/public/api/v1/models/_article` + `hc/_associated_article` + `hc/_author` | `app/Http/Resources/Public/Hc/ArticleResource.php` |
| `views/public/api/v1/models/_search_article` (`excerpt`/`truncate`) | `app/Http/Resources/Public/Hc/SearchArticleResource.php` + `app/Services/HelpCenter/ArticleSnippet.php` |
| `Article#ensure_article_slug`, `Portal`/`Category` slug do người dùng nhập | `app/Services/HelpCenter/SlugGenerator.php` |
| `app/mailers/portal_instructions_mailer.rb` | `app/Notifications/PortalCnameInstructions.php` |
| `spec/factories/{portals,categories,articles}.rb` | `database/factories/{Portal,Category,Article}Factory.php` |

## 3. Spec ↔ Pest

| RSpec | Pest |
|---|---|
| `spec/controllers/api/v1/accounts/portals_controller_spec.rb` | `tests/Feature/HelpCenter/PortalsControllerTest.php` (24) |
| `spec/controllers/api/v1/accounts/categories_controller_spec.rb` | `tests/Feature/HelpCenter/CategoriesControllerTest.php` (14) |
| `spec/controllers/api/v1/accounts/articles_controller_spec.rb` | `tests/Feature/HelpCenter/ArticlesControllerTest.php` (20) |
| `spec/controllers/api/v1/accounts/articles/bulk_actions_controller_spec.rb` | `tests/Feature/HelpCenter/ArticleBulkActionsControllerTest.php` (12) |
| `spec/models/{portal,category,article,related_category}_spec.rb` | `tests/Feature/HelpCenter/HelpCenterModelsTest.php` (22) |
| `spec/controllers/public/api/v1/portals/{articles,categories}_controller_spec.rb` | `tests/Feature/HelpCenter/PublicPortalsTest.php` (20) |

Bổ sung ngoài spec gốc (ràng buộc founder + rủi ro riêng của bản port):
sinh slug ASCII từ tên tiếng Việt (portal/category/article), hậu tố `-2` khi trùng,
liên kết related một chiều, chuyển category đẩy bài xuống cuối, tracking pixel,
markdown 404 cho bài nháp, portal archived bị ẩn khỏi `/hc`.

## 4. Khác biệt cố ý

1. **Slug tự sinh** (lệnh founder). Bản gốc bắt buộc `slug` cho portal/category
   (`Slug can't be blank`) và ghép timestamp cho article (`1788…-tieu-de`).
   Ở đây thiếu `slug` là hợp lệ: slug = `Str::slug(tên)` ASCII, unique trong phạm vi tương ứng
   (portal: toàn hệ thống; category: `(portal, locale)`; article: toàn hệ thống, tránh
   `RESERVED_SLUGS`), đụng thì `-2`, `-3`… → URL sạch, không có timestamp.
   Test gốc "will throw an error slug presence" được thay bằng "vẫn từ chối khi thiếu **name**".
2. **`PATCH /portals/{slug}/archive`**: bản gốc gọi `update(archive: true)` — cột `archive`
   không tồn tại nên endpoint luôn nổ. Ở đây đặt đúng cột `archived`.
3. **Bảng `folders`** (và `articles.folder_id`, `portal.folders`) KHÔNG port: còn trong
   `schema.rb` nhưng không có model/controller/UI nào dùng ở CE.
4. **`article_embeddings`, `LlmFormattable#to_llm_text`, `bulk_actions#translate` thật,
   `portals#ssl_status`**: Captain/enterprise → bỏ; `translate` giữ `501` như CE.
5. **`portals_members`** đổi tên bảng thành `portal_members` (quy ước Laravel); không có
   endpoint nào dùng (bản gốc đã gỡ "Portal members endpoint").
6. **Logo/ActiveStorage** → `Attachment` morph (quyết định #9). `blob_id` = tham chiếu đã ký
   của `POST /upload`, không phải signed_id ActiveStorage.
7. **Phản hồi 422** chỉ có khoá `message` (chuỗi nối `', '`), chưa kèm `attributes` như
   `render_record_invalid` gốc — chưa có FE nào đọc `attributes`.
8. **Public API trả JSON, chưa có HTML.** URL không nhận hậu tố `.json` như bản gốc
   (`/hc/x/en/articles.json`); controller vẫn tự bỏ hậu tố `.json/.md/.png/.xml` khỏi tham số
   slug để E4-fe thêm nhánh HTML mà không phải sửa lại.
9. **`SearchController` công khai trả JSON** — bản gốc chỉ render HTML (không có
   `index.json.jbuilder`). Thêm để E4-fe dùng chung component kết quả.
10. **Full-text**: `pg_search` → biểu thức `setweight(to_tsvector('simple', …))` A/B/C +
    `ts_rank(..., 2)`, prefix `từ:*` nối bằng `&`, kèm GIN index `articles_text_search_index`.
    Ký tự không phải chữ/số bị loại khỏi từ khoá; query chỉ còn ký tự rác ⇒ 0 kết quả.
11. **`validates_column_content_length`** của `ApplicationRecord` chỉ áp cho các model E4
    (danh sách cột khai báo trong `validationMessages()`), chưa nâng lên lớp base dùng chung.

## 5. Bẫy đã trả giá

1. **GIN index trên biểu thức** phải bọc thêm một lớp ngoặc:
   `USING gin ((expr))`, thiếu là `syntax error at or near "||"`.
2. **`$builder->update()` của Eloquent tự thêm `updated_at`** — autosave bản nháp phải đi
   qua `->toBase()->update()`, nếu không test "không đổi updated_at" đỏ.
3. **`wasRecentlyCreated` KHÔNG reset sau lần save thứ hai** trên cùng instance: dùng nó để
   phân biệt create/update trong hook `saved` khiến logic đổi category không chạy.
   Đã chuyển sang hook `updated`.
4. **`Article::search()` thêm `leftJoin('categories')`** — gọi hai lần trên cùng builder sẽ
   nhân đôi join. Bản gốc `@articles.search(...)` sau khi đã search một lần chạy được nhờ
   Arel gộp join; ở đây phải dựng builder mới mỗi lần (`Article::forPortal($portal)`).
5. **`related_categories` có unique index cả hai chiều** nhưng vẫn cho phép tồn tại đồng thời
   `(A,B)` và `(B,A)` — đừng "sửa" thành quan hệ hai chiều tự động.
6. **`Portal::normalizeConfig()` phải chạy trước validate**, không chỉ trong `saving`:
   nếu không, `draft_locales` bị bỏ qua khi payload không nhắc tới nó.
7. **`yona_owner` không có quyền `CREATEDB`** — tạo DB test phải dùng vai trò `ACER`
   (`PGUSER=ACER PGHOST=127.0.0.1 createdb …`) rồi `ALTER DATABASE … OWNER TO yona_owner`.

## 6. Việc còn treo cho phiên chính / agent khác

- **Thêm route** theo §0.
- **`InboxResource`** đang ghi chú `help_center: bỏ tới khi có portals (nhóm D)` —
  jbuilder gốc `_inbox.json.jbuilder` có khối `help_center` (`portal.slug`, `portal.name`…).
  Chủ sở hữu file đó nên bổ sung; e4-be không sửa để tránh đụng vùng.
- **`e2` (SearchController dashboard)**: `GET /search/articles` dùng được
  `Article::search(Article::query()->where('account_id', …), ['query' => $q])`;
  status/locale/category lọc như §1.3.
- **`lang/en/*.php`**: e4-be chưa tạo file i18n nào (backend trả chuỗi tiếng Anh cứng như
  các port trước); `lang/en/help_center.php` thuộc về E4-fe.

## 7. Kết quả gate

| Gate | Kết quả |
|---|---|
| `vendor/bin/pest tests/Feature/HelpCenter` (DB `yona_rw_test_e4`) | 92 test / 236 assertion — xanh |
| Toàn suite trên `yona_rw_test_e4` | **1532 test / 3732 assertion — xanh**, không đỏ chỗ nào (đã `dropdb` sau khi chạy) |
| `vendor/bin/pint <file của e4-be>` | passed |
| `php artisan migrate` trên `yona_rw` | đã áp `2026_09_06_970000_create_help_center_tables`, index `articles_text_search_index` có mặt |
