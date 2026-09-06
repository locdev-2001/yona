# D2 Reports — các trang còn lại (agent `d2-fe-pages`)

Ngày 06/09/2026. Nguồn: Chatwoot v4.17.1 (`refs/chatwoot`).
Tiếp nối `d2-notes-fe-charts.md` (lớp biểu đồ + khung Reports) và `d2-notes-be.md` (contract API).

## Tóm tắt
- Port nốt 12 trang báo cáo: 4 trang cũ (`/reports/{agent,inboxes,label,teams}`), 4 trang tổng quan
  (`*_overview`) + 4 trang chi tiết (`…/{id}`), CSAT và Bot.
- **Không tạo primitive mới**: dùng lại nguyên bộ của `d2-fe-charts`
  (`ReportsWrapper`/`ReportHeader`/`ReportFilters`/`OverviewReportFilters`/`ReportContainer`/
  `ReportMetricCard`/`ActiveFilterChip`, `dashboard/components/table/*`, `shared/components/charts`).
  Ba chỗ mở rộng đúng một điểm sửa: `useTableModel` (thêm chế độ phân trang thủ công),
  `DropdownList` (thêm slot `children` + tách `DropdownListItemButton`), `useAccountDirectory`
  (thêm phạm vi `labels`).
- `SLAReports.vue` là EE (paywall) → **KHÔNG port**; sidebar Yona không có mục SLA.
  `CsatReviewNotesPaywall.vue` + `CsatExpandedRow.vue` cũng EE/cloud → không port (xem §Khác biệt cố ý).

## Bảng trace Vue ↔ TSX

| Vue (`routes/dashboard/settings/reports/…`) | TSX (`resources/js/dashboard/reports/…`) |
|---|---|
| `AgentReports.vue` | `AgentReports.tsx` |
| `InboxReports.vue` | `InboxReports.tsx` |
| `LabelReports.vue` | `LabelReports.tsx` |
| `TeamReports.vue` | `TeamReports.tsx` |
| `AgentReportsShow.vue` | `AgentReportsShow.tsx` |
| `InboxReportsShow.vue` | `InboxReportsShow.tsx` |
| `TeamReportsShow.vue` | `TeamReportsShow.tsx` |
| `LabelReportsShow.vue` | `LabelReportsShow.tsx` |
| `components/WootReports.vue` | `components/WootReports.tsx` |
| (8 trang trên chỉ khác `type` + namespace i18n) | `components/EntityReportsPage.tsx` — lớp gộp |
| `AgentReportsIndex.vue` | `AgentReportsIndex.tsx` |
| `InboxReportsIndex.vue` | `InboxReportsIndex.tsx` |
| `TeamReportsIndex.vue` | `TeamReportsIndex.tsx` |
| `LabelReportsIndex.vue` | `LabelReportsIndex.tsx` |
| `components/SummaryReports.vue` + `components/SummaryReportLink.vue` | `components/SummaryReports.tsx` (gộp cả 4 trang Index) |
| `CsatResponses.vue` | `CsatResponses.tsx` |
| `components/CsatMetrics.vue` | `components/CsatMetrics.tsx` |
| `components/CsatMetricCard.vue` | `components/CsatMetricCard.tsx` |
| `components/CsatRatingDistribution.vue` | `components/CsatRatingDistribution.tsx` |
| `components/CsatTable.vue` | `components/CsatTable.tsx` |
| `components/CsatTableLoader.vue` | `components/CsatTableLoader.tsx` |
| `components/CsatContactCell.vue` | `components/CsatContactCell.tsx` |
| `components/CsatEmptyState.vue` | `components/CsatEmptyState.tsx` |
| `components/Csat/CsatFilters.vue` | `components/Csat/CsatFilters.tsx` |
| `components/Csat/CsatFilterHelpers.js` | `components/Csat/csatFilterHelpers.ts` |
| `components/Filters/v3/AddFilterChip.vue` | `components/Filters/AddFilterChip.tsx` |
| `BotReports.vue` | `BotReports.tsx` |
| `components/BotMetrics.vue` | `components/BotMetrics.tsx` |
| `store/modules/csat.js` + `api/csatReports.js` | `dashboard/reports/csatStore.ts` + phần CSAT trong `dashboard/reports/api.ts` |
| `store/modules/summaryReports.js` | trạng thái cục bộ trong `components/SummaryReports.tsx` (chỉ một nơi dùng) |
| `store/modules/reports.js` khối `botSummary` | ô nhớ `botSummary` + `fetchBotSummary` trong `dashboard/reports/store.ts` |
| `api/reports.js#getBotMetrics/getBotSummary/get*Reports` | `dashboard/reports/api.ts` (`getBotMetrics`, `getBotSummary`, `getEntityReportsCsv`) |
| `components/widgets/UserAvatarWithName.vue` | `dashboard/components/widgets/UserAvatarWithName.tsx` (mới) |
| `SLAReports.vue`, `components/SLA/**`, `components/CsatReviewNotesPaywall.vue`, `components/CsatExpandedRow.vue` | **không port** (EE/cloud) |

### i18n (`lang/en/*.php` → namespace Chatwoot)
| Khối JSON gốc | File lang | Ghi chú |
|---|---|---|
| `report.json` → `AGENT_REPORTS` | `lang/en/agent_reports.php` | bỏ `DATE_RANGE` (mảng khóa số) |
| `report.json` → `LABEL_REPORTS` | `lang/en/label_reports.php` | như trên |
| `report.json` → `TEAM_REPORTS` | `lang/en/team_reports.php` | như trên |
| `report.json` → `CSAT_REPORTS` | `lang/en/csat_reports.php` | bỏ `REVIEW_NOTES` (EE) |
| `report.json` → `BOT_REPORTS` | `lang/en/bot_reports.php` | |
| `report.json` → `SUMMARY_REPORTS` | `lang/en/summary_reports.php` | |
| `csatMgmt.json` → `CSAT` | `lang/en/csat.php` | nhãn 5 mức đánh giá (`CSAT.RATINGS.*`) |
| `report.json` → `INBOX_REPORTS` | `lang/en/inbox_reports.php` | đã có sẵn, không sửa |

`php artisan i18n:generate` đã chạy.

### spec ↔ vitest
| Spec gốc | Test port |
|---|---|
| `reports/components/specs/CSATMetrics.spec.js` | `dashboard/reports/components/CsatMetrics.test.tsx` (3 test) |
| `store/modules/specs/csat/{getters,mutations,actions}.spec.js` | `dashboard/reports/csatStore.test.ts` (3 test) |
| — (mới, canh cửa cho phần mở rộng dùng chung) | `dashboard/components/table/useTableModel.test.ts` (2 test) |

Các spec `ReportContainer.spec.js`, `ReportDrilldownCard/Drawer.spec.js`, `ReportMetricCard.spec.js`,
`useReportDrilldown.spec.js`, `reportFilterHelper.spec.js` thuộc lớp của `d2-fe-charts` — **vẫn chưa ai port**.

## Khác biệt cố ý

1. **Gộp trang.** 8 trang cũ/chi tiết dùng chung `EntityReportsPage.tsx`, 4 trang `*_overview` dùng chung
   `SummaryReports.tsx`. Bản gốc phải nhân bản file vì Vue truyền tên getter/action vuex dạng chuỗi;
   ở đây `type` là đủ. Một thay đổi hành vi = sửa một chỗ.
2. **`ref` + `defineExpose` của SummaryReports biến mất.** Bản gốc để trang cha giữ nút tải về rồi gọi
   ngược vào con qua `ref`; ở đây trạng thái bộ lọc nằm luôn trong `SummaryReports.tsx` nên nút gọi
   thẳng hàm cùng file.
3. **Bỏ hàng mở rộng của bảng CSAT** (`CsatExpandedRow` + `CsatReviewNotesPaywall`): điều kiện hiện là
   `isCloudFeatureEnabled('csat_review_notes') || isOnChatwootCloud` — bản self-hosted (kể cả oracle)
   luôn false, nên cột mũi tên và hàng ghi chú KHÔNG bao giờ hiện. DOM sinh ra trùng oracle.
4. **`vuex` → ô nhớ cấp module.** `csatStore.ts` giữ đúng hình dạng state/getter của `store/modules/csat.js`
   (kể cả `computeDistribution` trả chuỗi hai chữ số thập phân). Bỏ action `update` (chỉ dùng cho
   review notes EE) và phần AnalyticsHelper.
5. **`@tanstack/vue-table` → `useTableModel`.** Bảng CSAT phân trang phía máy chủ nên `useTableModel`
   được bổ sung tham số `manualPagination` (`rowCount`/`pageIndex`/`onPageIndexChange`) — đúng vai
   `manualPagination` của bản gốc, không nhân bản component phân trang.
6. **`v-tooltip` → thuộc tính `title`** (như lớp charts đã làm): `CsatMetricCard`, `ReportMetricCard`.
7. **`useTrack`/AnalyticsHelper không port** (quyết định chung của bản rewrite).
8. **Giữ nguyên hai lỗi của bản gốc** (xem §Bẫy 1 và 2): nhãn nút tải về của trang Agent cũ in ra
   nguyên key i18n, và mọi cột bảng `SummaryReports` rộng 150px.

## Bẫy đã trả giá

1. **`AgentReports.vue` gọi `$t('REPORT.DOWNLOAD_AGENT_REPORTS')` — key KHÔNG tồn tại.**
   Ba trang cũ còn lại dùng `<NS>.DOWNLOAD_<X>_REPORTS`. Oracle in nguyên chuỗi
   `REPORT.DOWNLOAD_AGENT_REPORTS` lên nút. Bản port lúc đầu "sửa cho đúng" → lệch 0.377%.
   Đã trả về đúng key sai của bản gốc qua prop `downloadLabelKey` (chỉ `AgentReports.tsx` truyền).
2. **`columnHelper.accessor(..., { width: 300 })` không có tác dụng.** `@tanstack/table` chỉ đọc `size`,
   nên `header.getSize()` của `SummaryReports.vue` luôn trả **150** cho cả 6 cột. Port theo con số khai
   trong mã (300/200) làm lệch 0.52% vì cột rộng hơn oracle. `CsatTable.vue` thì khai đúng `size`
   (120/500/160) nên cột đầu 150px, ba cột sau theo khai báo.
3. **Fixture nhãn hai bên lệch nhau.** Oracle (account 1) không có nhãn nào, yona (account 2) có 2 →
   `WootReports` chỉ vẽ biểu đồ khi `entities.length > 0`, nên trang `/reports/label` của oracle **trống
   hoàn toàn** còn yona có 7 biểu đồ (lệch 0.816%). Đã seed 2 nhãn cùng tên lên oracle để đo rồi xoá.
   Lưu ý: tiêu đề nhãn của yona (`Khách mới`, `Khách sộp`) **vi phạm chính validation của Chatwoot**
   (`UNICODE_CHARACTER_NUMBER_HYPHEN_UNDERSCORE`, không cho khoảng trắng) — tạo qua API oracle bị từ
   chối, phải `save(validate: false)`. Fixture yona nên được rà lại.
4. **Fixture inbox lệch:** yona có thêm inbox `Yona` (WebWidget) → bảng `inboxes_overview` của yona có
   thêm một dòng. Chênh lệch chỉ 0.020% (dòng chữ nhỏ) nên vẫn đạt ngưỡng; không seed thêm gì lên oracle.
5. **`npm run build` giữa lúc pixel-diff đang chạy làm hỏng phiên đo** (asset bị thay giữa chừng →
   `page.fill` timeout ở màn đăng nhập). Chạy build xong hẳn rồi mới đo.

## File ngoài vùng sở hữu đã đụng (cộng thêm, không đổi hành vi cũ)

| File | Sửa gì |
|---|---|
| `resources/js/dashboard/components/table/useTableModel.ts` | thêm tham số thứ 3 `manualPagination` (phân trang phía máy chủ cho bảng CSAT) |
| `resources/js/dashboard/components/table/Pagination.tsx` | — không sửa, chỉ dùng lại |
| `resources/js/dashboard/components/ui/Dropdown/DropdownList.tsx` | tách `DropdownListItemButton` (export) + nhận `children` thay slot `listItem`; `onSelect` thành tuỳ chọn |
| `resources/js/shared/components/FluentIcon/FluentIcon.tsx` | thêm prop `style` (bản gốc `DropdownListItemButton` đặt `:style="{color: iconColor}"`) |
| `resources/js/dashboard/reports/api.ts` | thêm `getBotMetrics`, `getBotSummary`, `getEntityReportsCsv`, ba hàm CSAT; `buildQuery` nhận mảng (`user_ids[]`) |
| `resources/js/dashboard/reports/store.ts` | thêm ô nhớ `botSummary` + `fetchBotSummary` + 2 selector |
| `resources/js/dashboard/reports/components/ReportMetricCard.tsx` | thêm prop `className` (BotMetrics truyền `flex-1`, Vue tự kế thừa attr) |
| `resources/js/dashboard/reports/composables/useAccountDirectory.ts` | thêm phạm vi `labels` |
| `resources/js/dashboard/reports/components/index.ts` | — không sửa (các trang import trực tiếp file cùng thư mục) |
| `~/www/pixel-diff/d2-reports-pages-ui.mjs` | **mới** — kịch bản pixel của nhóm này |

## Kết quả gate

### 1. tsc + vitest + build + pint
- `npx tsc --noEmit`: **sạch** (0 lỗi toàn repo).
  *Ghi chú:* giữa phiên có một lúc `resources/js/dashboard/search/components/SearchInput.tsx:35`
  báo `TS2554` (`useRef<ReturnType<typeof setTimeout>>()` thiếu tham số) — file của agent khác
  đang làm song song, không đụng; lần chạy cuối đã hết.
- `npx vitest run`: **68 file / 486 test xanh** (gồm 8 test mới của đợt này).
- `npm run build`: xanh (cả bundle chính lẫn sdk).
- `vendor/bin/pint <7 file lang mới>`: passed. `php artisan i18n:generate` đã chạy lại.

### 2. Pixel-diff (`~/www/pixel-diff/d2-reports-pages-ui.mjs`, 1280×800, light + dark)

Chạy lại: `node d2-reports-pages-ui.mjs [kịch bản]` rồi `node mask-diff.mjs d2-reports-pages-<kịch bản>-<scheme>`
(mask `d2-reports` che nguyên cột sidebar — oracle còn mục "SLA", xem note charts).
Mọi kịch bản dùng khoảng ngày RỖNG hai bên `?from=1735689600&to=1736294399&range=custom` trừ `csat_data`.

| Kịch bản | Đường dẫn | Thô | Sau mask | Đạt? |
|---|---|---|---|---|
| `agent` | `/reports/agent` | 0.355% | **0.006%** | ✅ |
| `inbox` | `/reports/inboxes` | 0.354% | **0.006%** | ✅ |
| `label` | `/reports/label` | 0.354% | **0.006%** | ✅ (sau khi seed 2 nhãn lên oracle) |
| `team` | `/reports/teams` | 0.354% | **0.006%** | ✅ |
| `agents_overview` | `/reports/agents_overview` | 0.361% | **0.006%** | ✅ |
| `inboxes_overview` | `/reports/inboxes_overview` | 0.374% | **0.020%** | ✅ (yona thừa dòng inbox `Yona`) |
| `teams_overview` | `/reports/teams_overview` | 0.361% | **0.006%** | ✅ |
| `labels_overview` | `/reports/labels_overview` | 0.361% | **0.006%** | ✅ (sau khi seed nhãn) |
| `agent_show` | `/reports/agents/1` | 0.361% | **0.006%** | ✅ |
| `csat` | `/reports/csat` (rỗng) | 0.204% | **0.006%** | ✅ |
| `csat_data` | `/reports/csat` + 2 phản hồi seed | 0.347% | **0.080%** | ✅ (mask thêm, xem dưới) |
| `bot` | `/reports/bot` | 0.205% | **0.006%** | ✅ |

Con số dark lệch ≤ 0.005 điểm so với light (in ra khi chạy script).

Lệnh mask dùng cho `csat_data`:
```
node mask-diff.mjs d2-reports-pages-csat_data-light d2-reports-pages-csat_data-dark \
  --box 290,496,130,20 --box 290,567,130,20 --box 1112,480,30,30 --box 1112,551,30,30
```
Bốn vùng che đó là: `#display_id` của hai hội thoại seed (oracle 38/39, yona 71/72 — không điều khiển
được) và chấm trạng thái trên avatar John (yona `online`, oracle `offline`; `hide-offline-status` giấu
chấm bên oracle). Phần đỏ còn lại (~800px) là **cột Rating lệch đúng 1px**: bảng để `table-auto`, ô
"Contact" của oracle rộng 202px còn yona 201px vì bề rộng chữ số `#38` khác `#71` — đã đo bằng
`getBoundingClientRect` hai bên, không phải khác biệt bố cục.

**Kịch bản seed dùng chung (đã dọn sạch cả hai bên sau khi đo):**
- oracle: `podman exec oracle-rails bundle exec rails runner` tạo 2 contact `Csat Alice`/`Csat Bob`,
  mỗi contact 1 hội thoại `resolved` trong inbox `api-test` do John phụ trách, 1 tin `input_csat`
  và 1 `CsatSurveyResponse` (rating 5 kèm nhận xét "Great support" / rating 2 không nhận xét),
  toàn bộ `created_at = 2026-06-15 10:00 UTC`;
- yona: cùng nội dung qua `php artisan tinker` (script trong scratchpad của phiên).
- Kiểm chứng trước khi chụp: `/csat_survey_responses/metrics?since=1780272000&until=1782863999`
  trả **y hệt nhau** hai bên (`total_count 2`, `ratings_count {2:1,5:1}`, `total_sent_messages_count 2`).
- Dọn: xoá response → message → conversation → contact ở cả hai bên, và xoá 2 nhãn seed trên oracle.
  Đã xác nhận sau khi dọn: oracle `labels=0 csat=0`, hai bên `total_count=0`.
  **Không đụng** hội thoại display 1 (oracle) / display 4 (yona).

### 3. audit-buttons (`node audit-buttons.mjs <base> <path>`)
Ba trang tiêu biểu, hai bên **giống hệt nhau từng dòng**:

| Trang | Kết quả (cả oracle lẫn yona) |
|---|---|
| `/reports/agents_overview` | 3 nút: `Download agent reports` **DEAD** ở cả hai (tải file, không đổi DOM); nút khoảng ngày OK (Δel=169); công tắc Business Hours OK (đổi URL `business_hours=true`) |
| `/reports/csat` | 3 nút: `Download CSAT Reports` **DEAD** ở cả hai (tải file); nút khoảng ngày OK (Δel=169); `Add filter` OK (Δel=13) |
| `/reports/bot` | 1 nút: nút khoảng ngày OK (Δel=169) — trang này không có công tắc Business Hours (đúng bản gốc) |

## Việc còn nợ / bàn giao
1. **Fixture nhãn của yona sai luật Chatwoot**: `Khách mới`, `Khách sộp` có khoảng trắng, trong khi
   `Label` của Chatwoot chỉ cho `[chữ, số, -, _]` và tự `downcase`. Nên đổi tên hoặc tạo lại cho khớp
   trước khi nghiệm thu nhóm nhãn.
2. **Fixture inbox lệch**: yona có thêm inbox `Yona`; nếu muốn `inboxes_overview` về 0.006% thì phải
   đồng bộ danh sách inbox hai bên.
3. Các spec chưa port của lớp charts (xem §spec ↔ vitest).
4. `menuSections` cho `DropdownMenu` (nợ cũ của `d2-fe-charts`) — không ảnh hưởng nhóm trang này.
