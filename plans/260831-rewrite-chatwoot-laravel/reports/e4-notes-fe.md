# E4 Help Center — frontend + trang công khai (agent `e4-fe`, 06/09/2026)

Port giao diện Help Center của Chatwoot v4.17.1 sang Yona: màn quản trị (Inertia + React)
và trang help center CÔNG KHAI `/hc/*` (Blade + một bundle JS nhỏ).
Backend đã có sẵn từ `e4-notes-be.md` — file này chỉ nói phần hiển thị.

---

## 0. VIỆC CẦN PHIÊN CHÍNH / AGENT KHÁC LÀM

1. **Sidebar (`components-next/sidebar/menuItems.ts` — e1-fe đang giữ).**
   Bốn mục Help Center đang trỏ `portals`, `portals/categories`, `portals/locales`,
   `portals/settings`. Chatwoot trỏ `portals_index` kèm `navigationPath`, tức URL:
   `portals/portals_articles_index`, `portals/portals_categories_index`,
   `portals/portals_locales_index`, `portals/portals_settings_index`.
   Tạm thời `pages/PortalsIndex.tsx` nhận **cả hai dạng** (bảng `NAVIGATION_ALIASES`)
   nên menu hiện tại chạy đúng; nếu muốn khớp 100% Chatwoot thì đổi `to:` như trên và
   xoá bảng alias.
2. **`InboxResource`** vẫn thiếu khối `help_center` (`portal.slug`, `portal.name`…) như
   `_inbox.json.jbuilder` — chủ sở hữu file đó bổ sung; màn "Portal Settings → Integrations"
   của E4 KHÔNG cần khối này (nó đọc `portal.inbox`).
3. **`league/commonmark` chưa khai báo trong `composer.json`** — đang dùng qua dependency
   của `laravel/framework` (`"league/commonmark": "^2.8.1"`, đã có ở `composer.lock`).
   Nên thêm `"league/commonmark": "^2.10"` vào `require` khi có mạng để khỏi phụ thuộc gián tiếp.
4. **Bố cục `documentation`** của trang công khai (30+ partial trong
   `views/public/api/v1/portals/documentation_layout/**`) CHƯA port — xem §5.

---

## 1. Bảng trace Vue ↔ TSX (màn quản trị)

| Chatwoot (`refs/chatwoot/app/javascript/dashboard`) | Yona (`resources/js/dashboard`) |
|---|---|
| `routes/dashboard/helpcenter/helpcenter.routes.js` | khối `// E4 helpcenter.routes.js — BEGIN/END` trong `routes/web.php` |
| `routes/dashboard/helpcenter/helpers/routeHelper.js` | (không cần — URL dựng thẳng trong page) |
| `pages/HelpCenterPageRouteView.vue` | `helpcenter/pages/usePortalPage.ts` (nạp portal + danh mục dùng chung) |
| `pages/PortalsIndexPage.vue` | `helpcenter/pages/PortalsIndex.tsx` |
| `pages/PortalsNewPage.vue` | `helpcenter/pages/PortalsNew.tsx` |
| `pages/PortalsArticlesIndexPage.vue` | `helpcenter/pages/PortalsArticlesIndex.tsx` |
| `pages/PortalsArticlesNewPage.vue` | `helpcenter/pages/PortalsArticlesNew.tsx` |
| `pages/PortalsArticlesEditPage.vue` | `helpcenter/pages/PortalsArticlesEdit.tsx` |
| `pages/PortalsCategoriesIndexPage.vue` | `helpcenter/pages/PortalsCategoriesIndex.tsx` |
| `pages/PortalsLocalesIndexPage.vue` | `helpcenter/pages/PortalsLocalesIndex.tsx` |
| `pages/PortalsSettingsIndexPage.vue` | `helpcenter/pages/PortalsSettingsIndex.tsx` |
| `components-next/HelpCenter/HelpCenterLayout.vue` | `helpcenter/components/HelpCenterLayout.tsx` |
| `…/PortalSwitcher/PortalSwitcher.vue` | `helpcenter/components/PortalSwitcher.tsx` |
| `…/PortalSwitcher/CreatePortalDialog.vue` | `helpcenter/components/CreatePortalDialog.tsx` |
| `…/ArticleCard/ArticleCard.vue` | `helpcenter/components/ArticleCard.tsx` |
| `…/CategoryCard/CategoryCard.vue` | `helpcenter/components/CategoryCard.tsx` |
| `…/LocaleCard/LocaleCard.vue` | `helpcenter/components/LocaleCard.tsx` |
| `…/EmptyState/Portal/PortalEmptyState.vue` + `portalEmptyStateContent.js` | `helpcenter/components/PortalEmptyState.tsx` + `helper/portalEmptyStateContent.ts` |
| `…/EmptyState/Article/ArticleEmptyState.vue` | `helpcenter/components/ArticleEmptyState.tsx` |
| `…/EmptyState/Category/CategoryEmptyState.vue` + `categoryEmptyStateContent.js` | `helpcenter/components/CategoryEmptyState.tsx` + `helper/categoryEmptyStateContent.ts` |
| `…/Pages/ArticlePage/ArticlesPage.vue` | `helpcenter/components/ArticlesPage.tsx` |
| `…/Pages/ArticlePage/ArticleList.vue` | `helpcenter/components/ArticleList.tsx` |
| `…/Pages/ArticlePage/ArticleHeaderControls.vue` | `helpcenter/components/ArticleHeaderControls.tsx` |
| `…/Pages/CategoryPage/CategoriesPage.vue` | `helpcenter/components/CategoriesPage.tsx` |
| `…/Pages/CategoryPage/CategoryList.vue` | `helpcenter/components/CategoryList.tsx` |
| `…/Pages/CategoryPage/CategoryHeaderControls.vue` | `helpcenter/components/CategoryHeaderControls.tsx` |
| `…/Pages/CategoryPage/CategoryForm.vue` | `helpcenter/components/CategoryForm.tsx` |
| `…/Pages/CategoryPage/CategoryDialog.vue` | `helpcenter/components/CategoryDialog.tsx` |
| `…/Pages/CategoryPage/EditCategoryDialog.vue` | `helpcenter/components/EditCategoryDialog.tsx` |
| `…/Pages/LocalePage/LocalesPage.vue` | `helpcenter/components/LocalesPage.tsx` |
| `…/Pages/LocalePage/LocaleList.vue` | `helpcenter/components/LocaleList.tsx` |
| `…/Pages/LocalePage/AddLocaleDialog.vue` | `helpcenter/components/AddLocaleDialog.tsx` |
| `…/Pages/LocalePage/LocaleContentDialog.vue` | `helpcenter/components/LocaleContentDialog.tsx` |
| `…/Pages/LocalePage/PopularContentDialog.vue` | `helpcenter/components/PopularContentDialog.tsx` |
| `…/Pages/PortalSettingsPage/PortalSettings.vue` | `helpcenter/components/PortalSettings.tsx` |
| `…/PortalSettingsPage/PortalGeneralSettings.vue` | `helpcenter/components/PortalGeneralSettings.tsx` |
| `…/PortalSettingsPage/PortalBaseSettings.vue` | `helpcenter/components/PortalBaseSettings.tsx` |
| `…/PortalSettingsPage/PortalConfigurationSettings.vue` | `helpcenter/components/PortalConfigurationSettings.tsx` |
| `…/PortalSettingsPage/PortalLayoutContentSettings.vue` (+ 2 svg preview) | `helpcenter/components/PortalLayoutContentSettings.tsx` (+ 2 svg trong `helper/`) |
| `…/PortalSettingsPage/PortalIntegrationsSettings.vue` | `helpcenter/components/PortalIntegrationsSettings.tsx` |
| `…/PortalSettingsPage/AddCustomDomainDialog.vue` | `helpcenter/components/AddCustomDomainDialog.tsx` |
| `…/PortalSettingsPage/DNSConfigurationDialog.vue` | `helpcenter/components/DNSConfigurationDialog.tsx` |
| `…/PortalSettingsPage/ConfirmDeletePortalDialog.vue` | `helpcenter/components/ConfirmDeletePortalDialog.tsx` |
| `…/ArticleEditorPage/ArticleEditor.vue` | `helpcenter/components/ArticleEditor.tsx` |
| `…/ArticleEditorPage/ArticleEditorHeader.vue` | `helpcenter/components/ArticleEditorHeader.tsx` |
| `…/ArticleEditorPage/ArticleEditorControls.vue` | `helpcenter/components/ArticleEditorControls.tsx` |
| `…/ArticleEditorPage/ArticleEditorProperties.vue` | `helpcenter/components/ArticleEditorProperties.tsx` |
| `…/ArticleEditorPage/ArticleDiffPanel.vue` | `helpcenter/components/ArticleDiffPanel.tsx` |
| `…/ArticleEditorPage/ArticlePendingChangesPopover.vue` | `helpcenter/components/ArticlePendingChangesPopover.tsx` |
| `helper/portalHelper.js` | `helpcenter/helper/portalHelper.ts` |
| `helper/articleDiffHelper.js` | `helpcenter/helper/articleDiffHelper.ts` |
| `helper/uploadHelper.js` | `dashboard/helper/uploadHelper.ts` (mới, dùng chung) |
| `constants/editor.js` (ARTICLE_EDITOR_MENU_OPTIONS) | `dashboard/constants/editor.ts` (mới) |
| `api/helpCenter/{portals,categories,articles}.js` | `helpcenter/api.ts` |
| `store/modules/helpCenter{Portals,Categories,Articles}` | `helpcenter/store.ts` (một ô nhớ + `useSyncExternalStore`, cùng lối `search/store.ts`) |
| `components/widgets/WootWriter/FullEditor.vue` | `dashboard/components/widgets/WootWriter/FullEditor.tsx` (mới) |
| `components-next/DraggableReorderList/DraggableReorderList.vue` | `components-next/DraggableReorderList/DraggableReorderList.tsx` (mới) |
| `components-next/captain/assistant/BulkSelectBar.vue` | `components-next/captain/assistant/BulkSelectBar.tsx` (mới) |
| `components-next/vertical-tabs/VerticalTabs.vue` | `components-next/vertical-tabs/VerticalTabs.tsx` (mới) |
| `components-next/buttonGroup/ButtonGroup.vue` | `components-next/buttonGroup/ButtonGroup.tsx` (mới) |
| `components-next/integration-card/IntegrationCard.vue` | `components-next/integration-card/IntegrationCard.tsx` (mới) |
| `components-next/combobox/ComboBoxDropdown.vue` | `components-next/combobox/ComboBoxDropdown.tsx` (mới) |
| `components-next/combobox/ReorderableMultiSelect.vue` | `components-next/combobox/ReorderableMultiSelect.tsx` (mới) |
| `shared/constants/locales.js` | `resources/js/shared/constants/locales.ts` (chép nguyên) |
| `i18n/locale/en/helpCenter.json` | `lang/en/help_center.php` (+ `artisan i18n:generate`) |

## 2. Bảng trace ERB ↔ Blade (trang công khai `/hc`)

| Chatwoot | Yona |
|---|---|
| `views/layouts/portal.html.erb` (+ `portal.html+plain.erb`) | `resources/views/public/portal/layout.blade.php` |
| `views/layouts/_portal_head.html.erb` | `public/portal/partials/head.blade.php` |
| `views/layouts/_portal_scripts.html.erb` | `public/portal/partials/scripts.blade.php` |
| `views/layouts/_portal_analytics.html.erb` | `public/portal/partials/analytics.blade.php` |
| `views/layouts/_portal_analytics_noscript.html.erb` | `public/portal/partials/analytics-noscript.blade.php` |
| `portals/_header.html.erb` | `public/portal/partials/header.blade.php` |
| `portals/_mobile_menu.html.erb` | `public/portal/partials/mobile-menu.blade.php` |
| `portals/_footer.html.erb` | `public/portal/partials/footer.blade.php` |
| `portals/_hero.html.erb` | `public/portal/partials/hero.blade.php` |
| `portals/_featured_articles.html.erb` | `public/portal/partials/featured-articles.blade.php` |
| `portals/_home_categories.html.erb` | `public/portal/partials/home-categories.blade.php` |
| `portals/_category-block.html{,+plain}.erb` | `public/portal/partials/category-block.blade.php` (một file, rẽ theo `$isPlainLayout`) |
| `portals/_uncategorized-block.html{,+plain}.erb` | `public/portal/partials/uncategorized-block.blade.php` |
| `portals/_authors.html.erb` | `public/portal/partials/authors.blade.php` |
| `portals/_thumbnail.html.erb` | `public/portal/partials/thumbnail.blade.php` |
| `portals/_article_count.html.erb` | `public/portal/partials/article-count.blade.php` |
| `portals/show.html{,+plain}.erb` | `public/portal/show.blade.php` |
| `portals/articles/show.html{,+plain}.erb` | `public/portal/articles/show.blade.php` |
| `portals/articles/index.html.erb` | `public/portal/articles/index.blade.php` |
| `portals/articles/_article_header/_article_body/_content/_meta_head` | `public/portal/articles/{article-header,article-body,content,meta-head}.blade.php` |
| `portals/categories/show.html{,+plain}.erb` | `public/portal/categories/show.blade.php` |
| `portals/categories/_category-hero/_article_list/_meta_head` | `public/portal/categories/{category-hero,article-list,meta-head}.blade.php` |
| `portals/search/index.html{,+plain}.erb` + `_form/_results/_results_header/_search_handler` | `public/portal/search/{index,form,results,results-header,search-handler}.blade.php` |
| `portals/error/404.html.erb`, `not_active.html.erb`, `sitemap.xml.erb` | `public/portal/error/404.blade.php`, `not-active.blade.php`, `sitemap.blade.php` |
| `views/icons/_*.html.erb` (11 icon dùng ở portal) | `public/portal/icons/*.blade.php` |
| `app/helpers/portal_helper.rb` | `app/Support/HelpCenter/PortalLinks.php` |
| `lib/chatwoot_markdown_renderer.rb` + `custom_markdown_renderer.rb` (`render_article`, `render_markdown_to_plain_text`) | `app/Support/HelpCenter/ArticleMarkdown.php` |
| `config/languages/language_map.yml` | `config/portal_languages.php` |
| `config/locales/en.yml` khối `public_portal` | `lang/en/public_portal.php` |
| `entrypoints/portal.js` + `portal/portalHelpers.js` | `resources/js/portal/main.ts` |
| `portal/portalThemeHelper.js` | `resources/js/portal/portalThemeHelper.ts` |
| `shared/helpers/colorHelper.js#adjustColorForContrast` | `resources/js/portal/colorContrast.ts` |
| `portal/components/PublicArticleSearch.vue` | `resources/js/portal/components/PublicArticleSearch.tsx` |
| `portal/components/PublicSearchInput.vue` | `resources/js/portal/components/PublicSearchInput.tsx` |
| `portal/components/SearchSuggestions.vue` | `resources/js/portal/components/SearchSuggestions.tsx` |
| `portal/components/TableOfContents.vue` | `resources/js/portal/components/TableOfContents.tsx` |
| `portal/application.scss` | `resources/scss/portal.scss` |
| `@chatwoot/prosemirror-schema/styles/article.scss` + `<style>` FullEditor/ArticleEditor | `resources/scss/_article-editor.scss` |

Controller (lớp render HTML, JSON giữ nguyên của `e4-be`):
`app/Http/Controllers/Public/Portals/{BaseController,PortalsController,ArticlesController,CategoriesController,SearchController}.php`.

## 3. Spec ↔ vitest

| Spec gốc | Bản port |
|---|---|
| `dashboard/helper/specs/portalHelper.spec.js` | `resources/js/dashboard/helpcenter/helper/portalHelper.test.ts` (8) |
| `dashboard/helper/specs/articleDiffHelper.spec.js` | `resources/js/dashboard/helpcenter/helper/articleDiffHelper.test.ts` (23) |
| `portal/specs/portalTheme.spec.js` | `resources/js/portal/portalThemeHelper.test.ts` (17) |

Chưa port: `portal/specs/portal.spec.js` (bám `InitializationHelpers` + Turbo — Yona không dùng
Turbo nên phần lớn bài test không còn nghĩa), `portal/specs/{PublicArticleSearch,SearchSuggestions}.spec.js`
(mount component Vue), `store/modules/helpCenter*/specs` (test mutation vuex — store đã đổi kiến trúc).

## 4. Khác biệt cố ý

1. **KHÔNG có ô slug ở form portal / danh mục / bài viết** (lệnh founder): backend tự sinh
   slug ASCII từ tên. Ảnh hưởng pixel: hộp thoại "Create new portal" thấp hơn oracle một
   hàng, tab General của Portal Settings thiếu hàng "Slug" nên mọi hàng dưới dịch lên ~80px.
   Hai vùng này được che trong `mask-diff.mjs` (`e4-helpcenter-create-dialog`,
   `e4-helpcenter-settings`), phần còn lại của màn so đủ.
2. **Không có wizard 3 bước tạo portal.** Chatwoot v4.17.1 chỉ có một hộp thoại
   `CreatePortalDialog` (wizard 3 bước là bản cũ hơn) — bản port bám đúng v4.17.1.
3. **Bỏ mọi nhánh Captain/enterprise**: nút "Translate" trong menu thẻ bài viết và
   `BulkTranslateDialog` (bulk translate) không port; API `bulk_actions/translate` vẫn trả 501.
4. **Bỏ nhánh `ssl_status`** (chỉ có trên Chatwoot cloud): tab Domain không hiện chấm trạng
   thái SSL/nút làm mới, chỉ còn thêm/sửa custom domain + hộp thoại hướng dẫn DNS.
5. **`FullEditor` chưa có menu lệnh `/` (SlashCommandMenu) và ô nhúng video** — phần còn lại
   (ProseMirror + markdown bài viết, thanh công cụ nổi khi bôi đen, chèn ảnh) port đủ.
6. **`buildPortalURL` lấy base từ `window.location.origin`** thay vì `window.chatwootConfig`
   (Yona không có biến cấu hình đó; help center chạy cùng host với dashboard).
7. **Bố cục `documentation` của trang công khai chưa port** — `Portal::layout()` vẫn nhận
   giá trị `documentation` và màn Appearance vẫn cho chọn, nhưng `/hc` luôn render bố cục
   `classic` (và biến thể `+plain` cho iframe xem trước). Xem §5.
8. **Markdown**: `CommonMarker` (Ruby) → `league/commonmark`. Giữ: bảng bọc `.tableWrapper`,
   `<colgroup>` theo `<!--cw-colwidths:…-->`, `^chữ^` thành `<sup>`. Chưa port: nhúng
   video/embed theo `config/markdown_embeds.yml`, chèn `style="width:…"` theo
   `cw_image_width` trên URL ảnh. HTML thô trong bài bị **strip** (bản gốc thay bằng
   `<!-- raw HTML omitted -->`).
9. **Ô tìm kiếm ở hero gọi `/hc/{slug}/{locale}/articles` với `Accept: application/json`**,
   không dùng hậu tố `.json` như bản gốc (`articles.json`) — route Laravel không nhận hậu tố.
10. **`t()` của i18n**: sửa để khớp vue-i18n — message có `|` LUÔN là message số nhiều,
    `t(key)` không kèm số trả **nhánh đầu**. Trước đó trả nguyên chuỗi kèm dấu gạch đứng
    (placeholder ô Name của hộp thoại tạo portal hiện "User Guide | Chatwoot").
    Đây là sửa ở `resources/js/i18n/index.ts` — dùng chung toàn app.

## 5. Việc còn thiếu (ghi rõ để phiên chính xếp lịch)

- **Bố cục `documentation`** của `/hc`: `views/public/api/v1/portals/documentation_layout/**`
  (topbar, sidebar, hero, breadcrumb, footer, empty state, section header, article card,
  category card, avatar group, user avatar + biến thể `show.html+documentation.erb` của
  portal/article/category/search) ≈ 500 dòng ERB. Dữ liệu backend đã đủ
  (`PortalHomeData` tương đương đã port trong `Public\Portals\PortalsController`:
  recommended categories/articles; còn thiếu `visible_categories`, `popular_topics`,
  `featured`, `category_contributors` — chỉ bố cục documentation dùng).
- `og:image` (`set_og_image_url` — cần GlobalConfig `OG_IMAGE_CDN_URL`): thẻ meta og:image
  chưa render.
- `portals#ssl_status`, `bulk_actions/translate` thật: enterprise, bỏ hẳn.
- Trang `not_active` đã có view nhưng chưa có nhánh controller gọi tới (Chatwoot render nó
  khi tài khoản tắt tính năng help center — Yona chưa có gate đó ở `/hc`).

## 6. Bẫy đã trả giá

1. **`resources/js/app.tsx` chỉ `import.meta.glob` một số thư mục page.** Thiếu
   `./dashboard/helpcenter/pages/*.tsx` → Inertia ném `Page not found` và trang trắng
   (pixel-diff ra ảnh trắng chứ không lỗi rõ ràng).
2. **`line-height` của body ở bundle portal.** Chatwoot nạp reset Meyer
   (`widget/assets/scss/reset` → `body { line-height: 1 }`); thiếu nó hàng chân thẻ danh mục
   cao 24px thay vì 20px, cả trang lệch 0.17%. `resources/scss/survey.scss` đã gặp đúng bẫy
   này trước đó — đọc comment ở đó trước khi dựng bundle công khai mới.
3. **`Article::status` là accessor trả CHUỖI** (`'published'`), không phải số. Lọc collection
   bằng `->where('status', Article::STATUS_PUBLISHED)` (số 1) luôn ra rỗng — phải dùng
   `->filter(fn ($a) => $a->isPublished())`. Ở tầng query builder thì so số mới đúng.
4. **Tailwind quét tĩnh nên class ghép động không tồn tại.** `w-{{ $size }} h-{{ $size }}`
   của `_thumbnail` không sinh ra CSS — thay bằng bảng class cố định.
5. **`categoryContent.reverse()` của bản gốc đảo mảng TẠI CHỖ.** Thứ tự thẻ ở trạng thái
   rỗng phụ thuộc số lần render: oracle hiện cột trái = mảng đảo, cột phải = mảng gốc, và
   sáng/tối còn khác nhau. Không thể khớp tất định → kịch bản `categories-empty` che lưới
   thẻ giả; kịch bản `categories` dùng danh mục thật nên so đủ.
6. **`t(key, số)` của vue-i18n truyền số vào cả `count` lẫn plural.** Bản port phải gọi
   `t(key, { count })` khi chuỗi dùng `{count}` và `{ n }` khi chuỗi dùng `{n}` — gọi sai
   thì màn Locales hiện thẳng chuỗi `{count} articles`.
7. **`Button` của Yona không `forwardRef`** — không đặt `ref` lên nó được (TS chặn); neo
   popup (EmojiIconPicker) phải dùng `ref` của thẻ bọc.
8. **`DropdownMenu` của Yona chưa render `item.emoji`** — help center dùng emoji danh mục
   trong menu; đã bổ sung (thay đổi cộng thêm, không đụng nhánh cũ).
9. **`CardLayout` chưa nhận `onMouseEnter/onMouseLeave`** — thẻ bài viết cần hover để hiện
   ô chọn; đã bổ sung hai prop tuỳ chọn.

## 7. Kết quả gate

| Gate | Kết quả |
|---|---|
| `npx tsc --noEmit` | sạch |
| `npx vitest run` (toàn bộ) | 76 file / 576 test — xanh (trong đó 48 test mới của E4) |
| `npm run build` | xanh (client + sdk) |
| `php artisan i18n:generate` | sinh lại bundle, thêm namespace `HELP_CENTER` + `PUBLIC_PORTAL` |
| `vendor/bin/pint` (file của e4-fe) | passed |
| pixel-diff `~/www/pixel-diff/e4-helpcenter-ui.mjs` | xem §8 |
| `audit-buttons.mjs` 3 trang | xem §9 |
| e2e `~/www/pixel-diff/e4-helpcenter-e2e.mjs` | xem §10 |

## 8. Pixel-diff (light + dark, ngưỡng ≤ 0,1%)

Chạy: `node ~/www/pixel-diff/e4-helpcenter-ui.mjs [kịch bản …]`
(script tự seed portal "Trung tâm trợ giúp" + 1 danh mục + 2 bài **giống nhau hai bên**
qua API rồi dọn sạch khi xong).

| Kịch bản | light | dark |
|---|---|---|
| `empty` (chưa có portal) | (điền sau khi chạy đủ) | |

## 9. audit-buttons

## 10. e2e
