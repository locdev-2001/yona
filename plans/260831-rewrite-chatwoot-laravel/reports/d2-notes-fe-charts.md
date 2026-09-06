# D2 Reports — lớp biểu đồ + khung Reports + trang Overview/Conversation (agent `d2-fe-charts`)

Ngày 06/09/2026. Nguồn: Chatwoot v4.17.1 (`refs/chatwoot`) + `@chatwoot/viz@0.1.5`.

## Tóm tắt
- Port `@chatwoot/viz@0.1.5` (Vue) sang React: `BarChart`, `HeatmapChart`, `PercentageChart` + toàn bộ
  module tính layout. Thư viện này **không** dựa trên chart.js/d3 — nó tự dựng SVG/CSS grid, nên bản
  React copy nguyên DOM/class/CSS, **không thêm dependency nào** (`package.json` giữ nguyên).
- Dựng khung Reports (wrapper/header/filters/metric card/chart stats/drilldown) + trang
  `/reports/overview` (LiveReports) và `/reports/conversation` (Index).
- Port kèm 3 primitive dùng chung còn thiếu ở Yona: `DatePicker` (13 file), `Dropdown` (button + list),
  `table/{Table,Pagination,BaseCell}`.

## Bảng trace Vue ↔ TSX

### Thư viện biểu đồ (`@chatwoot/viz@0.1.5` → `resources/js/shared/components/charts/`)
| Nguồn (viz-main/src) | Đích |
|---|---|
| `components/cartesian/cartesian-layout.js` | `viz/cartesianLayout.ts` |
| `components/cartesian/bar-layout.js` | `viz/barLayout.ts` |
| `components/cartesian/BarChart.vue` | `viz/BarChart.tsx` |
| `components/heatmap/heatmap-layout.js` | `viz/heatmapLayout.ts` |
| `components/heatmap/HeatmapChart.vue` | `viz/HeatmapChart.tsx` |
| `components/aggregate/aggregate-layout.js` + `percentage/percentage-layout.js` | `viz/aggregateLayout.ts` |
| `components/percentage/PercentageChart.vue` | `viz/PercentageChart.tsx` |
| `<style scoped>` của 3 component trên | `viz/viz.css` (trích nguyên văn bằng script; import trong từng .tsx) |

### Lớp Chatwoot
| Vue (`app/javascript/…`) | TSX (`resources/js/…`) |
|---|---|
| `shared/components/charts/BarChart.vue` | `shared/components/charts/BarChart.tsx` |
| `shared/helpers/ReportsDataHelper.js` | `shared/helpers/reportsDataHelper.ts` |
| `dashboard/composables/useReportMetrics.js` | `dashboard/reports/composables/useReportMetrics.ts` |
| `dashboard/composables/useLiveRefresh.js` | `dashboard/reports/composables/useLiveRefresh.ts` |
| `dashboard/api/{reports,liveReports,summaryReports}.js` | `dashboard/reports/api.ts` |
| `dashboard/store/modules/reports.js` | `dashboard/reports/store.ts` |
| `reports/constants.js` | `dashboard/reports/constants.ts` |
| `reports/helpers/reportFilterHelper.js` | `dashboard/reports/helpers/reportFilterHelper.ts` |
| `reports/composables/useReportDrilldown.js` | `dashboard/reports/composables/useReportDrilldown.ts` |
| `reports/components/ReportsWrapper.vue` | `dashboard/reports/components/ReportsWrapper.tsx` |
| `reports/components/ReportHeader.vue` | `…/components/ReportHeader.tsx` |
| `reports/components/ReportFilters.vue` | `…/components/ReportFilters.tsx` |
| `reports/components/OverviewReportFilters.vue` | `…/components/OverviewReportFilters.tsx` |
| `reports/components/ReportMetricCard.vue` | `…/components/ReportMetricCard.tsx` |
| `reports/components/ChartElements/ChartStats.vue` | `…/components/ChartElements/ChartStats.tsx` |
| `reports/components/Filters/v3/ActiveFilterChip.vue` | `…/components/Filters/ActiveFilterChip.tsx` |
| `reports/components/ReportDrilldownCard.vue` | `…/components/ReportDrilldownCard.tsx` |
| `reports/components/ReportDrilldownDrawer.vue` | `…/components/ReportDrilldownDrawer.tsx` |
| `reports/components/StatsLiveReportsContainer.vue` | `…/components/StatsLiveReportsContainer.tsx` |
| `reports/components/AgentLiveReportContainer.vue` | `…/components/AgentLiveReportContainer.tsx` |
| `reports/components/TeamLiveReportContainer.vue` | `…/components/TeamLiveReportContainer.tsx` |
| `reports/components/overview/{MetricCard,AgentCell,AgentTable,TeamTable}.vue` | `…/components/overview/*.tsx` |
| `reports/components/heatmaps/*.vue` (5 file) | `…/components/heatmaps/*.tsx` |
| `reports/ReportContainer.vue` | `dashboard/reports/ReportContainer.tsx` |
| `reports/LiveReports.vue` | `dashboard/reports/LiveReports.tsx` |
| `reports/Index.vue` | `dashboard/reports/Index.tsx` |
| `components/ui/DatePicker/**` (10 file) | `dashboard/components/ui/DatePicker/**` |
| `components/ui/Dropdown/{DropdownButton,DropdownList,DropdownListItemButton,DropdownSearch,DropdownEmptyState}.vue` | `dashboard/components/ui/Dropdown/{DropdownButton,DropdownList}.tsx` (gộp 4 file con vào DropdownList) |
| `components/table/{Table,Pagination,BaseCell}.vue` | `dashboard/components/table/{Table,Pagination,BaseCell}.tsx` + `useTableModel.ts` |
| `dashboard/helper/downloadHelper.js` | `dashboard/helper/downloadHelper.ts` |

### i18n (`lang/en/*.php` → namespace Chatwoot)
| JSON gốc | File lang |
|---|---|
| `report.json` khối `REPORT` | `lang/en/report.php` |
| `report.json` khối `OVERVIEW_REPORTS` | `lang/en/overview_reports.php` |
| `report.json` khối `DAYS_OF_WEEK` | `lang/en/days_of_week.php` |
| `report.json` khối `INBOX_REPORTS` | `lang/en/inbox_reports.php` (heatmap cần `ALL_INBOXES`/`SEARCH_INBOX`) |
| `datePicker.json` | `lang/en/date_picker.php` |

`php artisan i18n:generate` đã chạy. **`d2-fe-pages` chú ý:** `inbox_reports.php` đã có sẵn — bổ sung key
thiếu vào file đó, đừng tạo lại; `agent_reports.php` / `label_reports.php` / `team_reports.php` /
`csat_reports.php` chưa tạo, thuộc phần bạn.

### spec ↔ vitest
| Spec gốc | Test port |
|---|---|
| `shared/components/specs/BarChart.spec.js` | `resources/js/shared/components/charts/BarChart.test.tsx` (3 test) |
| `shared/helpers/specs/ReportsDataHelper.spec.js` | `resources/js/shared/helpers/reportsDataHelper.test.ts` (15 test) |
| `dashboard/composables/spec/useReportMetrics.spec.js` | `resources/js/dashboard/reports/composables/useReportMetrics.test.ts` (6 test) |

## Khác biệt cố ý
1. **Không thêm dependency.** `@chatwoot/viz` là Vue-only nhưng thuần SVG/CSS → port thẳng sang React.
   `@tanstack/vue-table` (Table/Pagination) thay bằng `useTableModel.ts` ~40 dòng: hai bảng Overview đều
   `enableSorting: false`, chỉ cần phân trang client → DOM sinh ra y hệt. (Thêm cả `npm install` trong repo
   này đang gãy: cây phụ thuộc có `workspace:*` ở `@vitejs/plugin-react` khiến npm báo `EUNSUPPORTEDPROTOCOL`.)
2. **Vue scoped CSS** thêm `data-v-*` vào selector; bản React bỏ thuộc tính đó, khai báo CSS giữ nguyên.
3. **Store vuex → ô nhớ cấp module + `useSyncExternalStore`** (`dashboard/reports/store.ts`), đúng lối
   `useAgentsList.ts` đã dùng. Getter đổi thành `reportsSelectors.*`.
4. **`v-tooltip` → thuộc tính `title`** (Yona chưa có component tooltip). Chỉ khác khi rê chuột lâu.
5. **URL query**: `useRoute().query` + `router.replace` của vue-router đổi thành
   `helpers/urlQuery.ts` (`history.replaceState`) — không tạo mục lịch sử mới, giống `router.replace`.
6. **`menuSections` của `DropdownMenu`** chưa có ở Yona → dropdown khoảng ngày của heatmap hiện danh sách
   phẳng, thiếu vạch ngăn giữa nhóm ngày và nhóm tháng. Chỉ thấy khi mở dropdown đó (không nằm trong
   bộ ảnh gate). Việc cần làm: thêm prop `menuSections` vào `components-next/dropdown-menu/DropdownMenu.tsx`.
7. **Bỏ khối `GROUP_BY_*_OPTIONS` (report.json) và `INBOX_REPORTS.DATE_RANGE`** khi chuyển sang lang PHP:
   là mảng có khóa số, `i18n:generate` từ chối; code không dùng (đã có `constants.ts`).
8. Snapshot `toMatchInlineSnapshot` của `ReportsDataHelper.spec` phụ thuộc múi giờ máy chạy → đổi thành
   so khớp tường minh (kiểm cùng bất biến: nhóm theo ngày, `hour`, `date`).

## File dùng chung đã sửa (một dòng, cộng thêm — báo để các agent khác biết)
| File | Sửa gì |
|---|---|
| `resources/js/app.tsx` | thêm `'./dashboard/reports/*.tsx'` vào `import.meta.glob` |
| `resources/js/i18n/index.ts` | `t()` chọn nhánh số nhiều theo `count` ngoài `n` (Chatwoot dùng `{count}`) |
| `resources/js/types/chatwoot-prosemirror-schema.d.ts` | khai báo `formatTime` cho `@chatwoot/utils` |
| `resources/js/dashboard/helper/apiClient.ts` | thêm `getText()` cho endpoint trả CSV |
| `resources/js/dashboard/components/ui/TimeAgo.tsx` | thêm prop `className` |
| `resources/js/dashboard/components/widgets/LoadingState.tsx` | thêm prop `className` |
| `~/www/pixel-diff/mask-diff.mjs` | thêm mask `d2-reports` (che cột sidebar) |

## Bẫy đã trả giá
1. **`@chatwoot/utils` bị chặn bởi khai báo `declare module` cục bộ.** `resources/js/types/chatwoot-prosemirror-schema.d.ts`
   khai báo lại module này; ambient declaration **đè hoàn toàn** typings của gói, nên `formatTime` báo
   "no exported member" dù gói có export. Thêm hàm mới từ `@chatwoot/utils` ⇒ phải khai báo thêm ở file đó.
2. **`toSorted` không có trong lib ES2022** (`tsconfig` target ES2022) → dùng `[...arr].sort()`.
3. **Tooltip biểu đồ: React và Vue nghe hai sự kiện khác nhau.** Vue nghe `pointerenter` thật trên phần tử;
   React tổng hợp `onPointerEnter` từ `pointerover` ở gốc cây (pointerenter không bubble nên không tới
   listener uỷ quyền). Script pixel phải bắn **cả hai** (`pointerover` rồi `pointerenter`) mới mở tooltip ở
   cả hai phía. Cột giá trị 0 có chiều cao 0 nên `hover()` thật của Playwright timeout — bắt buộc dispatch.
4. **Fixture hai bên lệch nhau** (oracle account 1 vs yona account 2): tuần gần nhất oracle 1 hội thoại /
   2 tin vào / 3 tin ra, yona 2 / 8 / 5. Mọi so pixel có dữ liệu đều lệch vì số, không phải vì bố cục →
   kịch bản khung chạy trên khoảng ngày rỗng ở **cả hai** bên (1–8/1/2025).
5. **Sidebar oracle còn mục "SLA"** (báo cáo SLA thuộc nhóm sau, chưa port) nên mọi mục dưới nó lệch 1 dòng.
   Đã che nguyên cột sidebar trong `mask-diff.mjs` (`d2-reports`).
6. `getSummary` của d2-be ném lỗi Postgres `time zone displacement out of range` khi `until` quá lớn
   (thử `until=99999999999`). Không chặn màn nào (bộ lọc luôn gửi mốc thật) nhưng nên chặn đầu vào —
   đã ghi cho `d2-be`.

## Kết quả gate

### 1. tsc + vitest + build
- `npx tsc --noEmit`: sạch (0 lỗi toàn repo).
- `npm test`: 64 file / 473 test xanh (gồm 24 test mới của đợt này).
- `npm run build`: xanh.
- `vendor/bin/pint lang/en/{report,overview_reports,days_of_week,date_picker,inbox_reports}.php`: passed.

### 2. Pixel-diff (`~/www/pixel-diff/d2-reports-ui.mjs`, 1280×800, light + dark)
Chạy lại: `node d2-reports-ui.mjs [kịch bản]` rồi `node mask-diff.mjs d2-reports-<kịch bản>-<scheme>`.

| Kịch bản | Dữ liệu | Thô | Sau mask sidebar | Đạt? |
|---|---|---|---|---|
| `empty` — trang Conversation, khoảng ngày rỗng hai bên | không phụ thuộc | 0.204% | **0.006%** | ✅ |
| `datepicker` — mở bảng chọn khoảng ngày | không phụ thuộc | 0.204% | **0.006%** | ✅ |
| `groupby` — mở dropdown Group By (khoảng 30 ngày) | không phụ thuộc | 0.204% | **0.006%** | ✅ |
| `tooltip` — tooltip một cột của biểu đồ Conversations | không phụ thuộc | 0.204% | **0.006%** | ✅ |
| `overview` — `/reports/overview` (stats live, 2 heatmap, bảng agent + team) | phụ thuộc | 0.224% | **0.027%** | ✅ |
| `drilldown` — side panel drilldown | phụ thuộc | 0.894% | **0.090%** (thêm mask vùng biểu đồ + `#display_id` + timeago) | ✅ |
| `conversation` — `/reports/conversation` dữ liệu thật | phụ thuộc | 3.424% | 3.227% | ⚠️ xem dưới |

Con số dark lệch ≤ 0.01 điểm so với light (chi tiết in ra khi chạy script).

**`conversation` chưa đạt vì số liệu, không phải bố cục.** Ảnh
`shots/d2-reports-conversation-light-masked-diff.png` cho thấy toàn bộ chữ, trục, lưới, nhãn ngày, khung
thẻ trùng khít; chỉ các **cột và con số** đỏ vì fixture hai bên khác nhau (xem bẫy 4). Cùng trang đó với
khoảng ngày rỗng (`empty`) đạt 0.006%. Để đóng ô này cần **kịch bản seed chung** — việc của `d2-be`:
đề xuất seed cùng số hội thoại/tin nhắn/độ trễ trên cả hai bên trong cửa sổ 7 ngày gần nhất rồi chạy lại
`node d2-reports-ui.mjs conversation`.

Lệnh mask dùng cho drilldown:
```
node mask-diff.mjs d2-reports-drilldown-light d2-reports-drilldown-dark \
  --box 200,0,492,800 --box 725,168,70,24 --box 1150,168,100,22
```

### 3. audit-buttons
- `/reports/conversation`: hai bên **giống hệt** — `Download conversation reports` DEAD ở cả hai (nút tải
  file, không đổi DOM), nút khoảng ngày OK (Δel=169), công tắc Business Hours OK (đổi URL `business_hours=true`).
- `/reports/overview`: 4 nút điều khiển (All Teams, Last 7 days, All Inboxes) + 2 nút tải về + ô heatmap.
  **Cả hai bên đều 197 nút OK**; DEAD ở cả hai là 2 nút tải về (tải file, không đổi DOM) và hàng ô heatmap
  cuối cùng ở y=786 (nằm sát mép dưới khung nhìn, tooltip mở ra ngoài màn hình nên bộ rà không đo được).
  Oracle 214 dòng / 17 DEAD, yona 223 dòng / 26 DEAD — chênh lệch là số ô ở hàng y=786 mà bộ rà tìm lại
  được sau reload (oracle ghi 9 ô đó là SKIP), không phải khác biệt hành vi.
  Chạy lâu (~20 phút/bên) vì mỗi ô heatmap là một `<button>` và bộ rà reload giữa các lần bấm.

## Hướng dẫn tái dùng cho `d2-fe-pages`
Import **chỉ** qua hai barrel:
```ts
import { BarChart, VizPercentageChart, VizHeatmapChart } from 'shared/components/charts';
import { ReportsWrapper, ReportHeader, ReportFilters, ReportMetricCard, ChartStats,
         MetricCard, AgentTable, TeamTable, ReportDrilldownDrawer } from 'dashboard/reports/components';
```

- **Trang mới**: bọc `Dashboard > ReportsWrapper > ReportHeader + nội dung`, đúng như `LiveReports.tsx`.
- **Bộ lọc có chọn thực thể** (Agent/Inbox/Label/Team): truyền `entityFilter` vào `ReportFilters`:
  ```ts
  <ReportFilters
    showGroupBy
    entityFilter={{ filterType: 'agents', options, selectedId, placeholder, defaultLabel, onSelect }}
    onFilterChange={…}
  />
  ```
  `ReportFilters` tự đọc/ghi query URL (`from`,`to`,`business_hours`,`group_by`,`range`) — không tự làm lại.
- **Biểu đồ + drilldown của một thực thể**: dùng lại `ReportContainer` với
  `reportType="agent" selectedItemId={id}`; nó tự nối `ReportDrilldownDrawer`.
- **Chỉ số tóm tắt**: `ChartStats` nhận `accountSummarySelector` / `summaryFetchingSelector` — muốn dùng
  summary khác (vd. bot) thì thêm ô nhớ + selector trong `dashboard/reports/store.ts`, đừng nhân bản component.
- **Bảng**: `dashboard/components/table/{Table,Pagination,BaseCell}` + `useTableModel(data, pageSize)`.
  Cần sắp xếp (CSAT) thì bổ sung vào `useTableModel` + nhánh `SortButton` trong `Table.tsx` — sửa **một chỗ**.
- **Danh bạ agent/team/inbox**: `useAccountDirectory(accountId, ['agents','teams','inboxes'])` (cache cấp
  module, gọi API một lần cho mỗi tài khoản).
- **API**: mọi endpoint báo cáo nằm trong `dashboard/reports/api.ts` (`getReports`, `getSummary`,
  `getSummaryReports`, `getDrilldown`, các CSV…). Thêm endpoint mới vào đó, không gọi `fetch` rải rác.
- **Số liệu tải về**: `dashboard/helper/downloadHelper.ts` (`downloadCsvFile`, `generateFileName`).

## Việc còn nợ
1. `conversation` pixel — chờ kịch bản seed chung với `d2-be` (mục gate 2).
2. `menuSections` cho `DropdownMenu` (khác biệt cố ý 6).
3. Trang Agent/Inbox/Label/Team/CSAT/Bot + các file lang tương ứng: `d2-fe-pages`.
