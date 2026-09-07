# Đoạn mã nhúng kênh Website — discoverability (agent `website-embed-snippet-ux`, 07/09/2026)

## Vấn đề
Founder tạo inbox Website "Yona" (id 85, account 3) và không tìm thấy đoạn mã nhúng.
Bản port đúng như gốc Chatwoot: đoạn mã chỉ nằm dưới cùng tab **Cài đặt**, bên trong khung
Trình tạo widget, và chỉ hiện sau khi bấm nút chuyển sang tab con thứ hai
(`resources/js/dashboard/modules/widget-preview/components/Widget.tsx`, mặc định ở "Xem trước").
Locale `vi` còn dịch nút đó là **"Kịch bản"** — người Việt đọc thành "kịch bản chatbot" nên
không có lý do gì để bấm. Hai thứ cộng lại = việc bắt buộc phải làm một lần để kênh chạy
bị giấu sau hai lớp.

## Đã làm
| # | Thay đổi | File |
|---|---|---|
| 1 | Khối **"Đoạn mã nhúng"** thành khối ĐẦU TIÊN của tab Cấu hình (nhánh `isWebWidget`): tiêu đề + mô tả 1 câu "Dán đoạn mã này ngay trước thẻ `</body>` của website." + component `Code` sẵn có (`inbox.web_widget_script`, nút Sao chép có sẵn) + link "Tuỳ chỉnh giao diện widget" trỏ về tab Cài đặt (Inertia `Link` → `accountScopedUrl(accountId, 'settings/inboxes/<id>')`, không tải lại trang) | `resources/js/dashboard/settings/inboxes/settingsPage/ConfigurationPage.tsx` |
| 2 | Dòng phụ "Lấy mã nhúng ở tab Cấu hình." dưới khung Trình tạo widget (nút chuyển vốn đã mặc định ở "Xem trước", không đụng) | `resources/js/dashboard/settings/inboxes/Show.tsx` (1 thẻ `<p>`) |
| 3 | Khoá `INBOX_MGMT.SETTINGS_POPUP.EMBED_SCRIPT.{TITLE,DESCRIPTION,CUSTOMIZE_LINK,HINT_IN_BUILDER}` (en + vi) | `lang/{en,vi}/inbox_mgmt.php` + `resources/js/i18n/generated/{en,vi}.ts` |
| 4 | Sửa dịch sai `WIDGET_BUILDER.WIDGET_OPTIONS.WIDGET_VIEW_OPTION.SCRIPT`: "Kịch bản" → **"Mã nhúng"** (chỉ `vi`; `en` giữ "Script" nên harness bấm theo tên tiếng Anh không gãy) | `lang/vi/inbox_mgmt.php` |
| 5 | Test mới: khối chỉ hiện với `channel_type === 'Channel::WebWidget'`, không hiện ở kênh khác; kiểm cả `href` của link | `resources/js/dashboard/settings/inboxes/settingsPage/ConfigurationPage.test.tsx` (mới) |

Khối trong Trình tạo widget **giữ nguyên** (vẫn có CodePen + `window.chatwootSettings` theo tuỳ chọn
bong bóng). Khối mới ở tab Cấu hình in đúng `inbox.web_widget_script` thô — giống hệt đoạn mã màn
"Voilà" (`FinishSetup.tsx`) hiện ngay sau khi tạo inbox, tức là đúng thứ founder từng thấy một lần.

## Gate
| Gate | Kết quả |
|---|---|
| `npx vitest run resources/js/dashboard/settings/inboxes` | 5 file / 39 test xanh (gồm 2 test mới) |
| `npx tsc --noEmit` | 0 lỗi |
| `flock /tmp/yona-build.lock npm run build` | xanh (vite + vite sdk) |
| `php artisan i18n:generate --check` | "Bundle i18n khớp lang/." |
| Ảnh Playwright (account 3, chỉ đọc) | `~/www/pixel-diff/ux-embed/sau-tab-cau-hinh.png`, `sau-tab-cai-dat-goi-y.png`, `crop-top.png`, `crop-hint.png`, `crop-tabbar.png`; script `ux-embed/shot.mjs` |

Lệch có chủ đích + ghi chú mask harness: 3 dòng mới cuối `reports/ux-deviations.md`.
Điểm cần nhớ: **chưa harness pixel nào chụp tab Cấu hình của inbox Website**, nhưng
`c1-widget-ui.mjs` chụp cả khung nhìn tab inbox-settings và so trực tiếp với oracle ⇒ dòng phụ
(mục 2) là diff thật bên Yona, phải loại trừ dải dưới `.widget-wrapper` hoặc chụp lại baseline.

## Ngoài phạm vi (chỉ ghi, không sửa)
1. **`COMPONENTS.CODE.BUTTON_TEXT` (vi) = "Sao Chép"** — Title Case máy móc, `ux-brief.md` cấm; đúng phải là "Sao chép". Nhìn thấy ngay trong khối mới (`crop-top.png`). Không sửa vì `lang/vi/components.php` dùng chung cho mọi nút Sao chép (Trình tạo widget, khóa HMAC, email chuyển tiếp, mã định danh inbox) — đổi là chạm baseline của nhiều harness locale `vi`. Đề xuất: sửa 1 dòng khi có phiên giữ harness pixel.
2. **Sidebar cài đặt in "Trờ về"** (đúng: "Trở về") — lỗi chính tả trong `lang/vi/**`, thấy ở mọi màn Cài đặt (`sau-tab-cau-hinh.png`, góc trên trái). Ngoài phạm vi file được giao.
3. **409 Conflict trên `POST /app/login`** khi Playwright đăng nhập SSO ngay sau khi build lại FE — đây là cơ chế Inertia báo lệch phiên bản asset (client tự nạp lại), không phải lỗi sản phẩm và không liên quan thay đổi này. Ghi lại để phiên sau không truy nhầm.

## Dọn dẹp
Không tạo/sửa/xoá dữ liệu nào trên `yona_rw` (chỉ đọc inbox 85). Phiên Playwright headless của user 3 đã
xoá trước mỗi lượt. Không commit, không `git add`. File chạm: 2 `.tsx` + 1 test mới + `lang/{en,vi}/inbox_mgmt.php`
+ `resources/js/i18n/generated/{en,vi}.ts` + 2 file báo cáo — không đụng `settings/inboxes/{Index.tsx,components/ChannelName.tsx}`
hay `lang/vi/chat_list.php` của agent `chat-ui-fixes-finish`.

```
Status: DONE
Summary: Đoạn mã nhúng kênh Website nay là khối đầu tiên của tab Cấu hình (có nút Sao chép + link về Trình tạo widget), tab Cài đặt có dòng phụ chỉ đường, và nút chuyển "Kịch bản" đổi thành "Mã nhúng" cho locale vi; toàn bộ gate xanh, lệch đã ghi vào ux-deviations.md.
Concerns/Blockers: c1-widget-ui.mjs so cả khung nhìn tab inbox-settings với oracle nên dòng phụ mới sẽ tạo diff — cần phiên giữ harness loại trừ dải dưới .widget-wrapper hoặc chụp lại baseline (đã ghi rõ trong ux-deviations.md).
```
