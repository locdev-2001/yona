# E3 frontend — Contacts nâng cao + import/export CSV

Agent `e3-fe`, 06/09/2026. Nguồn: Chatwoot v4.17.1 (`refs/chatwoot`, trừ `enterprise/`).
Contract API đọc từ `reports/e3-notes-be.md`; bộ lọc/segment dùng lại của `reports/e1-notes-fe.md`.

## Bảng trace Vue ↔ TSX

| Chatwoot (Vue/JS) | Yona (React/TS) | Ghi chú |
|---|---|---|
| `routes/dashboard/contacts/pages/ContactsIndex.vue` | `resources/js/dashboard/contacts/Index.tsx` | bổ sung: nhánh nhãn + tab Active, chọn hàng loạt, `Dialog` xoá hàng loạt |
| `routes/dashboard/contacts/components/ContactsBulkActionBar.vue` | `resources/js/dashboard/contacts/components/ContactsBulkActionBar.tsx` | mới |
| `components-next/Contacts/ContactsForm/ContactImportDialog.vue` | cùng đường dẫn `.tsx` | mới (+ khối trạng thái, xem "Khác biệt cố ý" #1) |
| `components-next/Contacts/ContactsForm/ContactExportDialog.vue` | cùng đường dẫn `.tsx` | mới |
| `components-next/Contacts/ContactsHeader/components/ContactsActiveFiltersPreview.vue` | cùng đường dẫn `.tsx` | mới — cắm `ActiveFilterPreview` mà E1 đã port sẵn |
| `components-next/Contacts/ContactsHeader/components/ContactMoreActions.vue` | cùng đường dẫn `.tsx` | thêm hai mục Export/Import (chỉ administrator) |
| `components-next/Contacts/ContactsHeader/{ContactHeader,ContactListHeaderWrapper}.vue` | cùng đường dẫn `.tsx` | chuyển tiếp import/export + hai dialog mới; expose `onToggleFilters` |
| `components-next/Contacts/ContactsListLayout.vue` | cùng đường dẫn `.tsx` | dải chip bộ lọc đang áp, cờ `isLabelView`/`isActiveView`/`showSearch` |
| `components-next/Contacts/ContactsSidebar/ContactHistory.vue` | cùng đường dẫn `.tsx` | mới |
| `components-next/Contacts/ContactsSidebar/ContactNotes.vue` | cùng đường dẫn `.tsx` | mới — dùng lại `ContactNoteItem` + `panelApi` của B11 |
| `components-next/Contacts/ContactsSidebar/ContactMedia.vue` | cùng đường dẫn `.tsx` | mới |
| `components-next/Contacts/ContactsSidebar/ContactMerge.vue` | cùng đường dẫn `.tsx` | mới |
| `components-next/Contacts/ContactsForm/ContactMergeForm.vue` | cùng đường dẫn `.tsx` | mới |
| `components-next/Contacts/ContactLabels/ContactLabels.vue` | cùng đường dẫn `.tsx` | thay bản giữ chỗ của B2 bằng bản đủ (đọc/ghi nhãn của liên hệ) |
| `components-next/label/{AddLabel,LabelItem}.vue` | cùng đường dẫn `.tsx` | `AddLabel` được nối dropdown; `LabelItem` mới |
| `components-next/Conversation/ConversationCard/ConversationCard.vue` | cùng đường dẫn `.tsx` | mới (tab History cần) |
| `…/ConversationCard/{CardMessagePreview,CardMessagePreviewWithMeta,MessagePreview,CardLabels}.vue` | cùng đường dẫn `.tsx` | mới — bản components-next, khác bộ ở `components/widgets/conversation/` |
| `components/widgets/conversation/conversationBulkActions/BulkLabelActions.vue` (nhánh `type="contact"`) | cùng đường dẫn `.tsx` | mở nhánh contact (nút có nhãn, cỡ sm, menu mở xuống) |
| `api/contacts.js` (`active`, `importContacts`, `exportContacts`, `getAttachments`, `labels`) | `dashboard/contacts/api.ts` | |
| `api/dataImports.js#get` | `dashboard/contacts/api.ts#fetchDataImports` | |
| `api/bulkActions.js` (nhánh `type: 'Contact'`) | `dashboard/contacts/bulkApi.ts` | file riêng, không đụng `conversation/bulkApi.ts` |
| `routes/dashboard/contacts/routes.js` (`labels/:label`, `active`) | khối `// E3 contacts/data routes` trong `routes/web.php` + `App\ContactsController@label/@active` | |

### i18n

`lang/en/contacts_layout.php` đã có gần đủ khoá của `contact.json`; chỉ thêm
`HEADER.ACTIONS.IMPORT_CONTACT.STATUS.*` + `DOWNLOAD_FAILED_RECORDS` cho khối trạng thái nhập
(khác biệt cố ý #1). `contacts_bulk_actions.php` đã có sẵn từ nhóm B — không đụng.
Bundle sinh lại bằng `php artisan i18n:generate`.

### Backend phải thêm (ngoài vùng e3-be, đã báo ở đây)

| File | Việc |
|---|---|
| `app/Http/Controllers/WebApi/BulkActionsController.php` | mở nhánh `type: 'Contact'` (port `enqueue_contact_job` + `check_authorization_for_contact_action`) |
| `app/Jobs/Contacts/BulkActionJob.php`, `app/Services/Contacts/BulkActionService.php` | port `Contacts::BulkActionJob` + `BulkActionService` (ba service con gộp thành ba method) |
| `app/Http/Controllers/WebApi/ContactsController.php#attachments` + route trong khối E3 của `web_api.php` | port `Contacts::AttachmentsController#index` (tab Media) |
| `app/Models/Attachment.php#apiData()` | `_attachment.json.jbuilder` = `push_event_data` + `created_at` — MỘT chỗ dùng cho cả hội thoại lẫn liên hệ (`ConversationsController@attachments` chuyển sang dùng, trước đó thiếu `created_at`) |
| `app/Http/Controllers/App/ContactsController.php` | hai action Inertia `label` + `active` |
| `public/downloads/import-contacts-sample.csv` | tệp mẫu của bản gốc (liên kết trong modal Import) |

Sửa nhỏ ngoài vùng, đều là thêm mới: `components-next/dialog/Dialog.tsx` (prop `descriptionSlot`
cho slot `#description` có liên kết), `components-next/filter/ActiveFilterPreview.tsx` (prop `className`),
`conversationBulkActions/BulkActionDropdown.tsx` (prop `label`/`size`/`buttonClassName`/`buttonIsLoading`/`disabled`
— `buttonIsLoading` tách riêng để nhánh conversation KHÔNG đổi hành vi, đúng bản gốc).

## Bảng spec ↔ vitest / Pest

| Spec gốc | Test yona | Số case |
|---|---|---|
| `api/specs/contacts.spec.js` (`#get` có labels, `#importContacts`, `#filter`) + `api/specs/bulkAction.spec.js` | `resources/js/dashboard/contacts/api.test.ts` | 8 |
| `spec/services/contacts/bulk_action_service_spec.rb` + ba service con + nhánh Contact của `bulk_actions_controller_spec.rb` | `tests/Feature/Jobs/ContactsBulkActionTest.php` | 7 |
| `spec/controllers/api/v1/accounts/contacts/attachments_controller_spec.rb` | `tests/Feature/WebApi/ContactAttachmentsTest.php` | 3 |

## Khác biệt cố ý

1. **Modal Import theo dõi trạng thái lần nhập ngay tại chỗ** (bản gốc chỉ báo "sẽ nhận email"):
   sau khi tải lên, hộp thoại poll `GET /data_imports` 5 giây/lần, hiện "Imported 95 of 100 rows."
   và liên kết tải tệp dòng lỗi (`failed_records_url` mà `e3-be` thêm). `GET /data_imports` đòi
   feature `data_import` (mặc định TẮT, đúng bản gốc) — tài khoản chưa bật thì khối trạng thái
   **biến mất hoàn toàn** và hộp thoại quay về đúng hành vi gốc. Trạng thái ban đầu của modal
   (lúc chụp pixel) giống oracle 100%.
2. **Không đóng modal sau khi bấm Import** (bản gốc đóng ngay). Cần giữ mở để hiện tiến trình ở #1;
   toast "You will be notified via email…" vẫn bắn như gốc.
3. **`ContactsBulkActionBar` không có `Policy` component**: quyền xoá kiểm bằng
   `currentAccountUser.role === 'administrator'` (custom role `contact_manage` là EE, chưa port) —
   cùng cách E1 đã làm cho menu.
4. **`ContactMerge` gọi thẳng `GET /contacts/search`** thay vì store `contacts/search`; validate
   "phải chọn liên hệ chính" thay `useVuelidate` bằng cờ `hasError` (khuôn đã dùng ở các form khác).
5. **`CardMessagePreviewWithMeta` bỏ nhánh SLA** (`SLACardLabel` là EE) → `hasSlaThreshold` luôn sai,
   lưới chỉ còn `grid-cols-[1fr_20px]`; `ConversationCard` vì thế chỉ đổi giữa hai kiểu preview theo nhãn.
6. **`ContactMedia` không gửi `sender`**: `_attachment.json.jbuilder` có `sender`, nhưng
   `SharedAttachments/{Media,Files}` của bản port không đọc tới; bỏ để khỏi kéo theo serializer sender.
7. **Điều hướng "nhảy tới tin nhắn" trong tab Media dùng `window.location`** (Inertia, trang hội thoại
   là page riêng) thay vì `router.push` như gốc.
8. **Route `/contacts/active` và `/contacts/labels/{label}` đặt SAU `/contacts/{contactId}`** trong
   `web.php` — an toàn vì `{contactId}` có `whereNumber`.

## Bẫy đã trả giá

1. **Thứ tự dòng khi sort hoà nhau không tái lập được.** Liên hệ tạo qua API có `last_activity_at`
   NULL; câu ORDER BY hai bên giống hệt (`last_activity_at <dir> NULLS LAST`, không khoá phụ) nên
   Postgres tự quyết thứ tự các dòng hoà — hai máy chủ khác dữ liệu nền là ra khác thứ tự. Mọi kịch
   bản danh sách vì thế phải áp một sort có khoá xác định (Name/Email) trước khi chụp; kịch bản
   `sort-activity` chỉ seed 1 liên hệ.
2. **Đổi sort trên route lọc theo nhãn làm oracle bắn hai request song song** (một có `labels[]`,
   một không) — ai về sau thắng, nên oracle thỉnh thoảng hiện thêm liên hệ ngoài nhãn. Harness phải
   `reload()` sau khi đổi sort (sort đọc lại từ `ui_settings`), nếu không sẽ đổ lỗi nhầm cho bản port.
3. **`main .sticky.top-0` bắt trúng HEADER của trang, không phải thanh bulk** (header cũng `sticky top-0`,
   nằm trong `main` của khung Dashboard) — kịch bản pixel "đạt" một cách giả vì so hai cái header.
   Selector đúng là `div.sticky.top-0.z-10` (header là `z-20`). Bài học: kịch bản chụp theo bounding box
   phải mở ảnh ra nhìn ít nhất một lần, đừng tin mỗi con số %.
4. **Job hàng loạt xếp SAU ~95 job của lượt nhập** — chờ cố định 5–7 giây là "gán nhãn/xoá không chạy"
   một cách oan uổng (HTTP 200, `bulk_actions` job DONE trong log, mà dữ liệu chưa đổi). Kịch bản e2e
   phải chờ theo điều kiện (poll tới 90 giây). Đã kiểm chứng backend riêng bằng API thuần: gán nhãn +
   xoá hàng loạt trên cả liên hệ tạo bằng API lẫn liên hệ nhập từ CSV đều đúng.
5. **`Message::query()->whereIn(...)` làm subquery** trong `whereIn('attachable_id', …)` sinh
   "subquery has too many columns" — phải `->select('id')`.
6. **Item của `DropdownMenu` bản port là `<button>` trần** (oracle bọc `<li>`), script e2e bắt theo
   `li` sẽ treo 30 giây rồi chết.
7. **Trang chi tiết liên hệ thiếu chip nhãn** — `ContactLabels` từ B2 là bản giữ chỗ chỉ render nút
   "+ tag". Pixel-diff bắt được (1.6%): mọi thứ dưới hàng nhãn bị đẩy lệch. Đã port đủ.
8. **`data_import` mặc định TẮT** nên khối trạng thái trong modal Import im lặng đứng ở "Import queued…"
   khi poll bị 401 — đã đổi thành ẩn hẳn khối đó (xem "Khác biệt cố ý" #1).

## Kết quả gate

- `npx tsc --noEmit`: **sạch toàn dự án**.
- `npx vitest run`: **79 file / 591 test xanh** (E3 đóng góp 1 file / 8 test).
- `npm run build` (vite + sdk): xanh. `php artisan i18n:generate`: đã sinh lại bundle.
- `vendor/bin/pint` theo danh sách file của E3: passed.
- **Pest toàn suite trên DB riêng `yona_rw_test_e3fe`: 1588/1588 (3863 assertion, 192s)**, sau đó `dropdb`.
  Test mới: `Jobs/ContactsBulkActionTest` (7), `WebApi/ContactAttachmentsTest` (3).
- Pixel-diff `~/www/pixel-diff/e3-contacts-ui.mjs` (light + dark, ngưỡng 0.1%) — **24/24 ĐẠT**
  (đo theo từng kịch bản trong khoảng 19:05–19:35; lượt chạy gộp lúc 20:05 KHÔNG hoàn tất vì
  môi trường hỏng — xem "Việc cần phiên chính" #1):

  | Kịch bản | light | dark |
  |---|---|---|
  | `label` — `/contacts/labels/e3-pixel`, sort theo Name | 0.000% | 0.000% |
  | `sort-email` — cùng danh sách, sort theo Email | 0.000% | 0.000% |
  | `sort-activity` — sort theo Last activity (1 liên hệ, xem bẫy #1) | 0.000% | 0.000% |
  | `bulk-bar` — chọn 2 liên hệ, thanh hành động hàng loạt | 0.000% | 0.000% |
  | `import` — modal Import contacts | 0.016% | 0.020% |
  | `create` — modal Add contact | 0.000% | 0.000% |
  | `detail` — trang chi tiết + sidebar tab Attributes | 0.021% | 0.000% |
  | `tab-history` / `tab-notes` / `tab-media` / `tab-merge` | 0.000% | 0.000% |
  | `active` — tab Active (chỉ dải header, xem ghi chú) | 0.000% | 0.000% |

  Fixture (1 nhãn + 3 liên hệ) tạo trước và **xoá ngay sau** mỗi lần chụp ở CẢ hai bên; liên hệ
  Trang Nguyen và các liên hệ có sẵn không bị đụng.
  **Ghi chú `active`:** danh sách "Active contacts" đọc trạng thái online thời gian thực từ Redis của
  TỪNG máy chủ. Lúc cả hai bên rỗng, so cả trang cho 0.000%; nhưng một khách thật mở widget bên yona
  là hai bên khác nhau ngay (đã gặp: `GET /contacts/active` oracle rỗng, yona có "Robert Nguyen" —
  cùng câu truy vấn, khác dữ liệu Redis). Kịch bản vì vậy chốt ở dải header (tiêu đề "Active contacts"
  + đúng bộ nút: không ô tìm kiếm, không nút bộ lọc) để gate ổn định.

- `audit-buttons.mjs /contacts` — so từng dòng với oracle: ba nút của E3 (`list-filter`,
  `arrow-down-up`, `ellipsis-vertical`) **OK ở cả hai bên**. Khác oracle duy nhất: nút "Message"
  DEAD ở yona (nợ `ComposeConversation` từ B2/B3, E1 đã ghi). Các nút DEAD còn lại trùng nhau
  (Update contact / Delete contact / Delete now ở cả hai bên).

- E2E thật `~/www/pixel-diff/e3-contacts-e2e.mjs` — **16/16 bước PASS**, tự dọn:
  đăng nhập → More actions › Import contacts → chọn CSV 100 dòng (5 dòng email sai) → Import
  → modal báo "Imported 95 of 100 rows." → liên kết tệp dòng lỗi tải về **đúng 5 dòng**
  → `/contacts/labels/e3-e2e` hiện **95 liên hệ** → đổi sort sang Name (dòng đầu "Nguoi E2E 001")
  → chọn 3 liên hệ bằng chuột (thanh bulk báo "3 selected") → Assign Labels → gán nhãn thật
  (API xác nhận 3 liên hệ) → Delete → hộp thoại xác nhận → còn **92 liên hệ**
  → More actions › Export contacts → `POST /contacts/export` 200 + toast "Export is in progress"
  → dọn sạch 92 liên hệ + 2 nhãn + trả `feature_flags.data_import` về mặc định.

## Việc cần phiên chính / nợ

1. **`POST /contacts` đang 500 trên DB dev `yona_rw`** (từ ~20:00 06/09): một agent song song đã
   đưa code đọc bảng `integrations_hooks` vào luồng tạo liên hệ, nhưng hai migration
   `2026_09_06_996000_create_dashboard_apps_and_integrations_hooks_tables` và
   `…_create_platform_apps_and_installation_configs_tables` vẫn **Pending**. Lỗi:
   `SQLSTATE[42P01] relation "integrations_hooks" does not exist`. Hệ quả: mọi harness seed liên hệ
   (kể cả của agent khác) đều dựng fixture rỗng và pixel-diff báo lệch oan. KHÔNG tự chạy
   `php artisan migrate` hộ vì migration đó thuộc agent khác đang viết dở — phiên chính quyết.
   Toàn bộ số đo pixel/e2e của E3 trong note này lấy TRƯỚC thời điểm đó.
2. **Giới hạn phiên đăng nhập chặn mọi harness.** Một agent song song vừa thêm `user_sessions` +
   `enforceSessionLimit` (`config('yona.max_user_sessions')` = 25). Mỗi lần đăng nhập headless tạo
   một phiên, không có bước đăng xuất → sau ~25 lần chạy, `POST /app/login` trả lại chính trang login
   (props `sessionsLimitReached`, `errors` rỗng) và MỌI script pixel-diff/e2e của MỌI agent sẽ chết
   ở `waitForURL` mà không có thông báo gì. Cách gỡ tạm đã dùng:
   `php artisan tinker --execute="App\Models\User::where('email','john@acme.inc')->first()->userSessions()->delete();"`.
   Đề xuất: harness đăng nhập kèm `revoke_all_sessions`, hoặc phiên chính dọn `user_sessions` định kỳ.
3. **Nút "Message" trên trang Contacts vẫn DEAD** (`ComposeConversation`, nợ B2/B3).
4. **Trang Settings › Data (`data.routes.js`: Index + Show, `NewImportDialog`) chưa port.** `e3-be`
   cố ý không port nguồn nhập tích hợp (Freshdesk/Intercom) — phần lớn màn hình đó phục vụ chúng.
   Trạng thái + tệp dòng lỗi của lượt nhập CSV đã có ngay trong modal Import (khác biệt cố ý #1).
   Nếu founder muốn màn hình lịch sử nhập, cần route Inertia `settings/data` + bật feature `data_import`.
5. **`contacts_edit_label` (`/contacts/{id}/labels/{label}`)** đã thêm route nhưng trang chi tiết chưa
   dùng tham số `label` để quay lại đúng danh sách (bản gốc cũng chỉ dùng cho breadcrumb/back).

## Lệnh chạy lại

```bash
cd ~/www/yona
npx tsc --noEmit && npx vitest run && npm run build && php artisan i18n:generate

# Pest (DB riêng)
createdb -h 127.0.0.1 -U postgres yona_rw_test_e3fe
psql -h 127.0.0.1 -U postgres -c 'ALTER DATABASE yona_rw_test_e3fe OWNER TO yona_owner;'
psql -h 127.0.0.1 -U postgres -d yona_rw_test_e3fe -c 'CREATE EXTENSION IF NOT EXISTS pg_trgm; CREATE EXTENSION IF NOT EXISTS pgcrypto;'
DB_DATABASE=yona_rw_test_e3fe vendor/bin/pest

# Pixel-diff + audit + e2e (cần oracle :3000 + yona :8000)
cd ~/www/pixel-diff
node e3-contacts-ui.mjs            # tất cả kịch bản
node e3-contacts-ui.mjs import     # một kịch bản
node audit-buttons.mjs http://localhost:8000 /contacts
node e3-contacts-e2e.mjs           # thêm --headed để xem thao tác
```
