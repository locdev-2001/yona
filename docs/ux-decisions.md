# Quyết định UX có chủ đích

Những chỗ Yona cố ý làm khác cách làm quen thuộc của loại sản phẩm hộp thư đa
kênh, kèm lý do. Quyết định mới ghi vào đây cùng commit với code. Sửa ngược một
quyết định ở đây mà không có lý do mới = lỗi hồi quy.

Kiến trúc: [system-architecture.md](system-architecture.md).

## Hội thoại, panel liên hệ, bong bóng tin

| Màn | Quyết định | Lý do | Ngày |
|---|---|---|---|
| Danh sách hội thoại · khung chat · panel phải · trang Liên hệ | Khách chưa khai tên mang tên "<con vật> ẩn danh" ("Gấu mèo ẩn danh", "Cú ẩn danh"; locale `en`: "Anonymous Raccoon") thay vì tên máy ngẫu nhiên kiểu `fancy-sky-689`. Nguồn duy nhất: `app/Support/AnonymousName.php` | Tên máy không đọc được, không phân biệt bằng mắt, chữ cái đầu cho avatar vô nghĩa. Tên "<con vật> ẩn danh" đọc được ngay, nói rõ khách chưa khai danh tính | 07/09/2026 |
| Mọi kênh (widget, Telegram, Zalo, LINE, SMS…) | Tên rỗng hoặc toàn khoảng trắng do kênh gửi lên cũng rơi về tên ẩn danh, không lưu nguyên. Sửa tại cửa chung `ContactInboxWithContactBuilder::contactName()` bằng `blank()` | Chuỗi rỗng lọt vào `contacts.name` cho ra liên hệ không tên, avatar trống (Telegram ghép `first_name + last_name` ra `''` khi kênh không gửi tên) | 07/09/2026 |
| Khung chat · panel phải | Panel phải **mở sẵn** khi khung nhìn ≥ 1280px và người dùng chưa từng tự chọn; nút mắt-người ở `SidepanelSwitch` đóng/mở hai chiều. Lựa chọn nhớ ở `ui_settings.is_contact_sidebar_open` (theo tài khoản, không theo trình duyệt). Quy tắc ở `dashboard/conversation/contactPanelVisibility.ts` | Với omnichannel, "khách này là ai, lần trước đã nói gì" phải thấy ngay, không phải đi tìm | 07/09/2026 |
| Panel phải · thông tin liên hệ | Trường rỗng không in "Không có sẵn": trường sửa được thành nút "Thêm email · Thêm số điện thoại · Thêm công ty" gom trên một hàng; trường không sửa được không chiếm dòng | Chỗ đắt nhất của panel không được nói "không có gì" ba lần; Zalo cá nhân gần như không bao giờ có email. Empty state phải có hành động | 07/09/2026 |
| Panel phải · thứ tự mục | "Hội thoại trước" đứng thứ hai (sau "Hành động của hội thoại") và là mục duy nhất mở sẵn; mỗi thẻ hiện trạng thái (chấm màu + "Đã được giải quyết"/"Mở") và tên kênh, kể cả khi đang lọc một hộp thư | Hội thoại trước của khách trải trên mọi hộp thư; người trực cần thấy "đã nói gì, ở kênh nào, đã đóng chưa" trước khi trả lời | 07/09/2026 |
| Danh sách hội thoại · panel phải · báo cáo CSAT | Không ép Title Case (bỏ `capitalize`) trên tên liên hệ. Khoá bằng `conversation/contactNameCasing.test.ts` | Tiếng Việt không viết hoa giữa câu; tên hiện lệch nhau giữa danh sách và tiêu đề khung chat | 07/09/2026 |
| Sidebar Kênh · danh sách hội thoại · header · Cài đặt → Hộp thư · bộ lọc | Hộp thư mang `platform` do kênh tự khai (`DeclaresPlatform`) vẽ **logo màu thật của nền tảng** (`public/brand-assets/platforms/{key}.svg`, bộ SVG CC0); payload chỉ có `channel_type` lùi về bảng icon chung `dashboard/helper/inbox.ts` | Logo nền tảng nhận ra ngay (dùng logo để chỉ kênh). Logo khai ở driver nên thêm kênh = thêm tệp + một method, không sửa giao diện | 24/09/2026 |
| Khung chat · tin khách bên trái | Tin đến có **avatar 24px bên trái** (khách hoặc thành viên nhóm thật) kèm badge nền tảng; chỉ tin cuối cụm có avatar. Gộp cụm theo người gửi thật: hai thành viên nhóm nhắn cùng phút tách hai cụm | Tin từ nền tảng nào thì hiện nền tảng đó và người nhắn | 24/09/2026 |
| Khung chat · tin gửi từ ứng dụng / từ điện thoại | Tin nhân viên/bot/tự động/ghi chú mang **badge logo bản cài đặt**; tin chủ shop gõ trên điện thoại (`external_echo`) mang **ảnh + tên tài khoản kênh** (`inbox.avatar`) kèm badge nền tảng; hộp thư chưa có ảnh dùng chữ tắt tên hộp thư | Phân biệt tin gửi trong ứng dụng với tin gõ trên điện thoại | 24/09/2026 |
| Ô soạn tin (locale `vi`) | Placeholder rút gọn "Nhập tin nhắn… (/ để chọn câu trả lời mẫu)" | Câu dài dạy phím tắt ở chỗ đáng ra mời người dùng gõ | 07/09/2026 |
| Bong bóng tin thất bại | Dòng lý do lỗi + nút "Thử lại" có nhãn chữ; gợi ý hành động theo `external_error.code`; mã `secret_mismatch` không hiện nút (thử lại chắc chắn vô ích). Khoá bằng `MessageError.test.tsx` | Lỗi phải có đường phục hồi, không thất bại im lặng; nút chỉ-icon khó bấm và thiếu nhãn cho trình đọc màn hình | 07/09/2026 |
| Bong bóng tin đến trong nhóm | Hiện avatar + tên người gửi thật (`content_attributes.sender`) phía trên nội dung; `@tên` trong `content_attributes.mentions` tô đậm. Render theo khoá chuẩn hoá, driver điền | Không có dòng này thì mọi tin trong nhóm nhìn như của cùng một người — sai sự thật | 07/09/2026 |
| Bong bóng tin · thanh hành động khi rê chuột | `MessageActions`: thứ tự cố định Trả lời → Cảm xúc (❤️ 👍 😆 😮 😢 😡) → Chuyển tiếp → Thu hồi/Xoá. Gate bằng năng lực kênh (`outbound_reaction`, `outbound_recall`), không bao giờ theo `channel_type`; nhãn "Thu hồi với mọi người" khi kênh khai `outbound_recall` | Việc thường làm phải ≤ 2 click từ khung chat, không giấu trong menu chuột phải | 07/09/2026 |
| Thanh hành động trên máy cảm ứng | Máy không rê chuột được (`(hover: none)`) có nút ⋯ hiện sẵn mờ cạnh bong bóng, chạm mới bung; nút và ô emoji 36px ở chế độ này. Máy có chuột giữ nguyên | Ngón tay không tạo hover nên không có đường nào tới cảm xúc/thu hồi. Không dùng long-press vì đã là cử chỉ chọn văn bản | 07/09/2026 |
| Hàng biểu cảm dưới bong bóng | Đọc dạng `[{emoji, by, at}]`, gom theo emoji + đếm, viền sáng emoji do phía tenant thả, bấm lại là gỡ; vẫn đọc bản ghi cũ (mảng emoji phẳng) | Sửa lỗi hiện `[object Object]` | 07/09/2026 |
| Danh sách hội thoại · tab người phụ trách | Tab mặc định **"Tất cả"**, lựa chọn nhớ ở `ui_settings.conversations_filter_by.assignee_type`. Cột rỗng nói đúng lý do và có nút tới chỗ có việc ("Xem N hội thoại chưa gán"). Quy tắc ở `chatlist/emptyListHint.ts` | Mở hộp thư lần đầu rơi vào "Của tôi 0" trong khi khách đang chờ ở "Chưa gán" — chủ shop một người tưởng hộp thư trống | 07/09/2026 |
| Danh sách hội thoại · thanh tab (locale `vi`) | Nhãn "Chưa gán" thay "Chưa được phân công" | Nhãn dài làm ba tab tràn cột 340px, sinh mũi tên cuộn | 07/09/2026 |
| Danh sách hội thoại · pill trạng thái | Pill "Mở" cạnh tiêu đề là nút có mũi tên ▾ ("Lọc theo trạng thái"), mở đúng bảng lọc trạng thái sẵn có | Pill nói trạng thái đang lọc nhưng không nhìn ra là bấm được | 07/09/2026 |
| Ngày giờ (bong bóng, CSAT, thư viện đính kèm, thẻ hội thoại) | Theo locale: tiếng Việt giờ 24, ngày trước tháng ("7 thg 9, 22:37"). Một chỗ: `shared/helpers/timeHelper.ts` (`PATTERN_BY_LOCALE`) | Giao diện tiếng Việt lẫn ngày giờ tiếng Anh là lỗi hiển thị | 08/09/2026 |
| Mốc thời gian rút gọn (danh sách hội thoại, chuông, trang Thông báo, lịch sử hội thoại, tệp đã chia sẻ, báo cáo) | Đơn vị ngắn lấy từ `lang/{locale}/time_ago.php`: tiếng Việt "vừa xong", "3 phút", "2 giờ"… kèm "trước" khi cần; "Tạm ẩn 2 giờ" dùng chung bộ này. Thời gian nằm cùng hàng với tên khách thay vì lớp nổi chừa 64px | Không hiện "now", "26m" giữa giao diện tiếng Việt; chữ tiếng Việt rộng ~96px đè lên tên khách | 24/09/2026 |

## Ô soạn tin, câu trả lời mẫu, phím tắt

| Màn | Quyết định | Lý do | Ngày |
|---|---|---|---|
| Ô soạn tin · bảng câu trả lời mẫu (`/`) | Không ô tìm riêng, không cướp focus: từ khoá là chữ gõ sau `/`. Escape đóng bảng mà con trỏ vẫn ở ô soạn; xoá hết `/` thì bảng tự đóng; Enter/Tab/mũi tên thuộc về bảng, Shift+Enter xuống dòng. Chưa có mẫu nào thì dẫn tới "Thêm câu trả lời mẫu". Khoá bằng `CaretAnchoredPicker.test.tsx` | Gõ nhầm `/` không được kẹt: Escape/Backspace phải thoát được | 07/09/2026 |
| Ô soạn tin, mọi cỡ màn | Chiều cao bám nội dung (32px khi rỗng), tự giãn tới 200px, kéo tay vượt trần được và **nhớ** ở `ui_settings.reply_box_height`. Công thức: `dashboard/conversation/composerHeight.ts` | Ô soạn cao cố định 120px ăn hơn 1/4 màn điện thoại cho một ô trống | 08/09/2026 |
| Chú thích "chưa cài chữ ký tin nhắn" | Thu về một dòng icon + chữ, cả dòng là nút mở cài đặt hồ sơ | Không ăn lại chiều cao vừa giành cho ô soạn | 08/09/2026 |
| Toàn cục · gợi ý phím tắt | Phím bổ trợ theo hệ điều hành (`⌘` trên macOS, `Ctrl` nơi khác) qua một helper `shared/helpers/kbd.ts` | Phần lớn SME Việt dùng Windows/Linux | 07/09/2026 |
| Bảng lệnh (Ctrl+K) · chân bảng | Chân bảng gợi ý phím dựng qua `<slot name="footer">` bằng tiếng Việt; không khớp gì thì báo "Không tìm thấy kết quả nào"; icon Lucide | Thư viện bảng lệnh nhúng chuỗi tiếng Anh trong shadow DOM và không có thông báo rỗng | 07/09/2026 |
| Menu hồ sơ · Cài đặt → Câu trả lời mẫu (locale `vi`) | "Đăng xuất"; ba nút giao diện "Sáng / Tối / Theo hệ thống" lấy nhãn từ một nguồn `helper/themeHelper.ts` (dùng chung với bảng lệnh) kèm `aria-label`; thuật ngữ thống nhất "câu trả lời mẫu" | Không lẫn tiếng Anh ở màn dùng hằng ngày; nút chỉ-icon phải có nhãn | 07/09/2026 |

## Cài đặt hộp thư, widget website

| Màn | Quyết định | Lý do | Ngày |
|---|---|---|---|
| Cài đặt → Hộp thư · phụ đề kênh | `ChannelName` đọc bảng nhãn chung ở `dashboard/helper/inbox.ts` (đi cùng bảng icon); kênh chưa khai hiện chính tên loại, không rơi về "Kênh API" | Hộp thư Zalo từng hiện "Kênh API"; nhãn và icon là một nguồn, thêm kênh sửa một chỗ | 07/09/2026 |
| Tab **Cấu hình** của hộp thư Website | Khối "Đoạn mã nhúng" (câu hướng dẫn dán trước `</body>`, nút Sao chép, link "Tuỳ chỉnh giao diện widget") là **khối đầu tiên** | Mã nhúng là việc bắt buộc làm một lần để kênh website chạy; giấu sau nút chuyển trong khung xem trước thì người dùng không tìm ra | 07/09/2026 |
| Tab **Cài đặt** · dưới Trình tạo widget | Một dòng phụ "Lấy mã nhúng ở tab Cấu hình." | Người đang ở Trình tạo widget cần biết mã nhúng nằm đâu | 07/09/2026 |
| Trình tạo widget · nút chuyển (locale `vi`) | "Mã nhúng" thay "Kịch bản" | "Kịch bản" bị hiểu là kịch bản chatbot, không ai bấm | 07/09/2026 |
| Widget · phiên khách | Nút "Bắt đầu cuộc trò chuyện mới" cho khách tự xoá phiên (xác nhận trước), đi chung đường với `reset()` của SDK. Phiên lưu hai lớp: cookie trang HTTPS `SameSite=None; Secure; Partitioned` + token trong localStorage của iframe | Giữ phiên tới khi khách chủ động xoá, kể cả khi mã nhúng nằm trong iframe khác site | 25/09/2026 |
| Widget · màu nhấn | Màu nhấn của khung chat (nút gửi, link, CTA, chấm carousel, vạch trả lời) lấy `widgetColor` của hộp thư qua token `--yona-chat-accent`, không cứng `#1B6FCC` của design; bong bóng khách giữ gần đen `#17181A` đúng design | Màu widget là thứ tenant cấu hình được và đang chạy; bong bóng khách tách khỏi màu nhấn để đọc được trên mọi màu thương hiệu | 25/09/2026 |
| Widget · chữ | Be Vietnam Pro tự host, chỉ 3 nét 300/400/500 có trong repo (600/700 do trình duyệt tổng hợp); không gọi dịch vụ font bên ngoài | Widget nhúng vào site khách, không được thêm request bên thứ ba | 25/09/2026 |
| Widget · một màn chat | Bỏ màn chủ: mở widget vào thẳng khung chat, luồng trống là "Chào bạn!" + mô tả; chỉ dừng ở màn trống có nút "Bắt đầu" khi hộp thư bắt điền form trước hội thoại đầu tiên. Ngoài giờ (hộp thư bật giờ làm việc) màn trống thành khối đồng hồ + ô email + "Để lại tin nhắn" (lưu email vào liên hệ) | Màn chủ cũ trống 60% chiều cao, nút duy nhất bị đẩy xuống đáy | 25/09/2026 |
| Widget · header | Nút đóng chỉ hiện trên điện thoại (máy tính đóng bằng launcher, như trước) và là mũi tên xuống; vùng bấm mọi nút header 44×44 | Đóng widget là thu nhỏ, không phải huỷ; cùng biểu tượng với launcher khi mở | 25/09/2026 |
| Widget · sticker | Tab Sticker chỉ hiện khi kênh có danh mục (`yona.widget_stickers`); chưa có kho upload sticker cho tenant nên mặc định panel mở ở tab Emoji | Không bày tab rỗng | 25/09/2026 |
| Widget · menu "Thêm" của tin | Ngoài Thu hồi có thêm "Sao chép" | Khách cần chép lại mã đơn, địa chỉ agent gửi | 25/09/2026 |
| Widget · avatar agent | Không hiện tên agent dưới avatar ở tin cuối nhóm | Khung 360px hẹp; tên đã có ở header | 25/09/2026 |
| Widget · lưới 3 ảnh | Tin 3 ảnh: hai ảnh hàng trên, ảnh thứ ba trải hết hàng dưới (design để ô trống) | Không để ô trống vô nghĩa trong bong bóng | 25/09/2026 |
| Widget · khay đính kèm | Ảnh dán từ clipboard vào khay trước (không gửi ngay) để thêm chú thích; nhiều tệp gửi thành MỘT tin | Cùng một luồng với chọn ảnh từ menu "+" | 25/09/2026 |

## Trang công khai, đăng nhập, onboarding

| Màn | Quyết định | Lý do | Ngày |
|---|---|---|---|
| `/` | Trang giới thiệu sản phẩm, có nút Đăng nhập/Dùng thử, thay vì đưa thẳng vào `/app/login`. Bề mặt riêng: `resources/js/landing/**`, `resources/css/landing.css`, `tailwind.landing.config.js`, `landing.blade.php` — không thêm token vào `tailwind.config.js` của dashboard | Gốc tên miền phải giới thiệu sản phẩm cho SME Việt | 07/09/2026 |
| `/app/login`, `/app/auth/signup` | Logo là liên kết về `/`, thêm "← Về trang chủ" dưới form | Có trang chủ thì phải quay lại được | 07/09/2026 |
| Mọi mặt tiền công khai | `SetLocale` đọc `Accept-Language` cho khách vô danh, rút `vi-VN` → `vi` | Khách chưa đăng nhập không có hồ sơ để hỏi ngôn ngữ | 07/09/2026 |
| Đăng nhập bằng Google | Tài khoản đã bật 2FA vẫn phải nhập mã 2FA | 2FA là lớp bảo vệ người dùng tự bật; một lối đăng nhập không được lách qua nó | 25/09/2026 |
| Onboarding · ô Website | **Không bắt buộc** ở cả client lẫn server (`OnboardingsController`: `nullable`); ô nhập có viền gõ được ngay; placeholder "vd: shopcuaban.vn" | Phần lớn SME Việt bán qua Zalo/Facebook không có website — bắt nhập là bắt bịa | 24/09/2026 |
| Onboarding · Múi giờ | Mặc định múi giờ trình duyệt nếu có trong danh sách (kể cả bí danh `Asia/Ho_Chi_Minh` ↔ `Asia/Saigon`), không thì giờ Việt Nam. Bí danh ở `onboarding/shared/timezone.ts` (`TIMEZONE_ALIAS_GROUPS`) | Ô múi giờ trống, danh sách bắt đầu từ `Africa/Abidjan`; trình duyệt trả hai tên khác nhau cho cùng một múi | 24/09/2026 |
| Onboarding · Vai trò / Ngành / Nguồn biết tới | Bộ lựa chọn cho SME bán online Việt Nam (chủ shop, quản lý bán hàng, tư vấn–CSKH…; 11 ngành; nguồn Zalo/Facebook/TikTok/Google/giới thiệu/YouTube). Giá trị là khoá ổn định (`owner`, `mother_baby`, `zalo`…), nhãn ở `ONBOARDING_NEXT.OPTIONS.*`, khoá ở `onboarding/shared/constants.ts` | Danh sách cho SaaS quốc tế không có đúng những nguồn khách Yona tới | 24/09/2026 |
| Onboarding · Ngôn ngữ | Danh sách từ `config('yona.available_locales')` (cùng nguồn luật server); chọn sẵn ngôn ngữ hiện tại của account, không theo ngôn ngữ trình duyệt | Nhiều máy ở Việt Nam để trình duyệt tiếng Anh; chọn theo trình duyệt sẽ đổi cả account sang tiếng Anh | 24/09/2026 |
| Dashboard hội thoại khi account **0 hộp thư** — quản trị viên | Màn bắt đầu `OnboardingView` (lời chào + 4 thẻ; thẻ kênh vẽ icon Zalo · Website · Email, không ảnh người thật). Nhân viên thấy câu "liên hệ quản trị viên". Ở bố cục hai-màn, màn bắt đầu thay chỗ danh sách rỗng. Điều kiện ở một hook `useShowAdminOnboarding` | Chủ tài khoản mới không được bị bảo đi hỏi chính mình; trên điện thoại phải có lối tới tạo hộp thư | 24/09/2026 |
| `OnboardingView` · thẻ "Mời đồng đội" | Dẫn tới **Cài đặt → Nhân viên** | Chữ trên thẻ nói mời đồng đội vào danh sách nhân viên, không phải tạo nhóm | 24/09/2026 |
| `OnboardingView` · chữ | Mô tả viết lại tự nhiên, link hành động ngắn ("Kết nối Zalo, website hoặc email", "Mời đồng đội"…) | Bản dịch máy lủng củng | 24/09/2026 |

## Bố cục theo cỡ màn

| Màn | Quyết định | Lý do | Ngày |
|---|---|---|---|
| Ba mức bố cục | `SMALL_SCREEN_BREAKPOINT = 1024`, `LARGE_SCREEN_BREAKPOINT = 1280` (một chỗ: `dashboard/constants/globals.ts`). `< 1024`: hai-màn + panel lớp phủ · `1024–1279`: hai cột + panel lớp phủ · `≥ 1280`: ba cột + panel mở sẵn nhớ lựa chọn | Ở tablet dọc 820px, thanh điều hướng + danh sách + panel ép khung chat còn 1px | 08/09/2026 |
| Dashboard hội thoại dưới 1024px | **Hai màn bắt buộc**: danh sách chiếm hết bề rộng; mở hội thoại thì danh sách ẩn, header có nút "Trở về". Một chỗ: `dashboard/conversation/layoutMode.ts` | Ở 390px cột danh sách 340px đè khung chat, không mở nổi hội thoại | 08/09/2026 |
| Panel phải ở chế độ lớp phủ | Không bao giờ mở sẵn (kể cả khi `ui_settings` nói mở), chỉ bật trong phiên xem hiện tại, không ghi `ui_settings`; có nền mờ bấm được để đóng. Câu trả lời duy nhất "lớp phủ hay cột tĩnh": `contactPanelVisibility.isContactPanelOverlay` | Ai từng mở panel trên máy tính thì mở app trên điện thoại sẽ bị che hết khung chat | 08/09/2026 |
| Nút nổi mở thanh điều hướng (`#mobile-sidebar-launcher`) | Ẩn khi đang mở một hội thoại, hiện ở màn danh sách | Ở màn chat nút đè ô soạn; màn danh sách vẫn cần lối vào thanh điều hướng | 08/09/2026 |
| Mũ khung chat dưới 1280px | Gom một dòng: Trở về · avatar · tên · icon kênh · (chuông tạm ẩn) · nút Liên hệ · Giải quyết dạng icon · ⋯; `SidepanelSwitch` nằm trong mũ (`variant="inline"`) | Mũ ba dòng chiếm 136/844px ở điện thoại và cụm nút nổi đè tin đầu tiên | 08/09/2026 |

## Thông báo

| Màn | Quyết định | Lý do | Ngày |
|---|---|---|---|
| Cài đặt hồ sơ · Thông báo đẩy | **Ẩn** cột và công tắc khi máy chủ không có khoá VAPID hoặc trình duyệt thiếu Push API (`isPushSupported()` ở `dashboard/helper/pushHelper.ts`) | Không hứa tính năng không chạy | 24/09/2026 |
| Tắt công tắc đẩy | Xoá luôn bản ghi phía máy chủ (DELETE theo `endpoint`) | Không đẩy tiếp vào đăng ký đã chết | 24/09/2026 |
| Đăng xuất | Gỡ đăng ký đẩy của trình duyệt (chờ tối đa 2 giây), xoá badge biểu tượng app, bỏ số ở tiêu đề tab, đóng mọi thông báo trong khay. Mọi lối đăng xuất đi qua `dashboard/helper/logout.ts` | Máy dùng chung ở cửa hàng: người sau không được nhận thông báo kèm trích tin khách của người trước | 24/09/2026 |
| Payload đẩy | Có `body` (tên khách: nội dung) và `icon`; cắt tiêu đề 150, nội dung 300 ký tự ở adapter đẩy (`PushNotificationService`) | Thông báo nói được ai nhắn gì; tin dài làm payload vượt 4078 byte và người dùng không nhận gì | 24/09/2026 |
| Bấm thông báo đẩy | Đưa tab Yona sẵn có lên rồi điều hướng thay vì mở cửa sổ mới; thông báo tự đóng | Không mở chồng nhiều cửa sổ | 24/09/2026 |
| Kênh đẩy | Chỉ Web Push; `subscription_type: fcm` trả 422 | Yona không có app di động | 24/09/2026 |
| Khoá VAPID | Env `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` thắng bản đã lưu; không có thì tự sinh một lần, lưu `installation_configs` (`VAPID_KEYS`, locked). Một chỗ: `VapidService` | Đổi khoá bằng env, không sửa DB tay | 24/09/2026 |
| Endpoint đăng ký đẩy | Kiểm đầu vào (`url:https`, p256dh/auth bắt buộc) + chặn SSRF (`SafeHttp`, không theo chuyển hướng) | Endpoint trình duyệt gửi lên là URL máy chủ sẽ gọi ra | 24/09/2026 |
| Bật đẩy thất bại | Câu lỗi "Không bật được thông báo đẩy…"; dịch vụ đẩy từ chối (`AbortError`) thì hiện hướng dẫn cố định dưới công tắc (Brave: bật "Use Google services for push messaging") | Brave tắt dịch vụ đẩy theo mặc định; hướng dẫn dài không đọc kịp trong toast | 24/09/2026 |
| Sidebar · trung tâm thông báo | Không có mục "Hộp thư của tôi"; **chuông ở hàng đầu sidebar** mở panel 15 thông báo mới nhất + "Đánh dấu tất cả đã đọc" + "Xem tất cả thông báo". Trang đầy đủ giữ route `/inbox-view`, tên "Thông báo". Không dựng thanh trên cùng mới | Mục tên "hộp thư" gây nhầm với hội thoại; thanh trên cùng đẩy lệch mọi trang và ăn chiều cao điện thoại | 24/09/2026 |
| Panel chuông · bấm thông báo | Mở hội thoại ở màn Hội thoại chính (`/conversations/{id}`) | Trả lời ở đúng chỗ quen tay | 24/09/2026 |
| Điện thoại | Chuông trong ngăn kéo sidebar; **chấm đỏ trên nút menu nổi** khi có thông báo chưa đọc | Biết có việc mà không phải mở ngăn kéo | 24/09/2026 |
| Tiêu đề tab · biểu tượng app | Tiền tố `(N)` (quá 99 thì `99+`) và badge PWA; về 0 thì xoá. Số chưa đọc một nguồn: `dashboard/notifications/useUnreadCount.ts` | Để Yona ở tab nền vẫn thấy có việc | 24/09/2026 |
| Thông báo đẩy · khay hệ điều hành | Mỗi hội thoại một ô (cái sau thay cái trước); hội thoại đã đọc ở bất kỳ tab/thiết bị đang mở Yona thì ô biến khỏi khay; không gửi nếu đã đọc trước khi job chạy | Khách nhắn năm tin không thành năm thông báo; thông báo đã xử lý không nằm lại làm tưởng còn việc | 24/09/2026 |

## Trả lời, nhắc tên, sticker, chuyển tiếp

| Màn | Quyết định | Lý do | Ngày |
|---|---|---|---|
| Trả lời trích dẫn · điểm vào | Nút Trả lời đứng đầu thanh hành động của bong bóng (điện thoại: sau ⋯). Cờ nút ở `components-next/message/helpers/messageActions.ts` | Thanh hành động là chỗ agent đã quen và dùng được trên điện thoại | 24/09/2026 |
| Trả lời trích dẫn · khối trên bong bóng | Vẽ được cả khi tin gốc ngoài trang đang tải (tra riêng từng tin) và khi tin gốc không có trong Yona (ảnh chụp `in_reply_to_preview` do driver ghi, khối vô hiệu); có tên người gửi | Khách Zalo hay trích tin cũ hoặc tin trước khi kết nối Yona | 24/09/2026 |
| Trả lời trích dẫn · khung soạn | Tin đang trả lời lưu theo hội thoại ở localStorage, reload vẫn còn; ghi chú riêng ẩn khối, không làm mất tin đang trả lời | Soạn dở không mất ngữ cảnh | 24/09/2026 |
| Nhắc tên trong nhóm (`@` ở chế độ Trả lời) | Hộp thư khai `outbound_mention` và hội thoại là nhóm thì mở bảng "Thành viên nhóm": người vừa nhắn đứng đầu, lọc không dấu. Không ai khớp (hoặc chat 1-1) thì không mở, Enter gửi như thường | Trong nhóm Zalo, khách chỉ đọc khi được tag; bảng rỗng không được nuốt Enter | 24/09/2026 |
| Nhắc tên · tin gửi đi | Khách thấy chữ `@Tên`; tag thật đi bằng `content_attributes.mentions` do máy chủ neo lại vị trí sau khi render biến | Biến `{{contact.name}}` hay emoji làm lệch vị trí client tính; nền tảng từ chối cả tin nếu vị trí sai | 24/09/2026 |
| Sticker · khung soạn | Hộp thư khai `outbound_sticker` có nút sticker sau nút emoji (emoji đổi icon mặt cười): ô tìm, chip gợi ý, tab "Gần đây", lưới 4 cột; chọn là gửi ngay, câu đang gõ giữ nguyên; ẩn ở Lưu ý riêng | Khách Zalo nhắn bằng sticker rất nhiều; hai icon giống nhau làm bấm nhầm | 24/09/2026 |
| Sticker · "Gần đây" | Lấy từ chính tin sticker của hộp thư, không gọi nền tảng | Mỗi lượt tìm là một lời gọi API không chính thức từ tài khoản Zalo của khách | 24/09/2026 |
| Sticker · bong bóng | Không khung, không mở thư viện ảnh, không nút tải; xem trước ghi "Sticker". Sticker không mang trích dẫn (khối "Đang trả lời" giữ cho tin chữ kế tiếp) | Sticker là cảm xúc, không phải tệp; Zalo không nhận trích dẫn kèm sticker | 24/09/2026 |
| Chuyển tiếp · điểm vào | Nút Chuyển tiếp trên mọi tin đến/đi đã gửi, không phụ thuộc kênh nguồn; không có ở ghi chú riêng, tin hoạt động, tin đang gửi/lỗi/đã thu hồi | Shop hay chuyển câu hỏi sang nhóm nội bộ hoặc gửi lại báo giá cho khách khác | 24/09/2026 |
| Chuyển tiếp · hộp chọn đích | Xem trước tin, ô tìm (tên, SĐT, mã hội thoại), "Hội thoại gần đây" (20); tối đa 10 đích; đích không nhận được loại nội dung hiện mờ kèm lý do. Luật ở máy chủ theo năng lực kênh | Agent biết trước thay vì bấm rồi mới lỗi | 24/09/2026 |
| Chuyển tiếp · loại tin và nội dung | Chữ, ảnh, video, âm thanh, tệp (sao bản riêng), sticker chuyển được; thẻ ngân hàng, danh thiếp, vị trí… báo "chưa chuyển tiếp được". Gửi nguyên văn, không tiền tố "[Chuyển tiếp]"; Zalo cùng tài khoản + tin chữ dùng lệnh chuyển tiếp của Zalo | Gửi lại nhãn thẻ thành chữ là sai nghĩa; không làm bẩn tin khách đọc | 24/09/2026 |
| Chuyển tiếp · nhãn trên bong bóng | "↪ Đã chuyển tiếp" (rê chuột: "Chuyển tiếp từ hội thoại #…"); `forwarded_from` chỉ mang id nội bộ | Chuyển tin của khách A sang khách B không được lộ tên A ra widget hay webhook | 24/09/2026 |

## Tìm kiếm

| Màn | Quyết định | Lý do | Ngày |
|---|---|---|---|
| Khớp từ khoá | Tên, nội dung tin, tiêu đề thư, tên thành viên nhóm, tên tệp khớp **không dấu, không phân biệt hoa thường** (hàm SQL `search_fold`); email, SĐT, mã hội thoại khớp nguyên văn; `%`/`_` là chữ thường | Khách Việt gõ không dấu hằng ngày; full-text không bỏ dấu và không tìm giữa từ | 24/09/2026 |
| Khớp theo từng từ | `- _ . /` coi như khoảng trắng; mỗi từ phải có mặt, không cần liền nhau hay đúng thứ tự (`bao gia thang 9` ra `bao-gia_thang-9.pdf`) | Tên tệp nối từ bằng gạch; người dùng gõ vài từ khoá rời | 24/09/2026 |
| Xếp hạng | Ba mức trước khi xét thời gian: cả cụm liền nhau > đủ các từ đứng trọn nhưng rời/đảo > còn lại. Luật ở `SearchTerm::orderByRelevance()` | Giữ khớp rời nhưng đưa kết quả đúng lên đầu ("bao gia" không để "Giao việc" đứng trước) | 25/09/2026 |
| Tô sáng, đoạn trích | Nền amber nhẹ + chữ đậm theo từng từ; tin dài thu hai dòng, đoạn trích mở bằng "…" ngay trước chỗ khớp đầu | Chỉ in đậm trên tên đã đậm thì không thấy; trên điện thoại từ khoá rơi mất | 24/09/2026 |
| Thứ tự nhóm kết quả | Hội thoại · Tin nhắn · Liên hệ · **Tệp** · Bài viết | Việc hay làm nhất là tìm lại cuộc chat | 24/09/2026 |
| Tab Tệp | Mỗi tệp một dòng (tên, `#hội thoại · hộp thư · người gửi · thời gian · dung lượng`, nút mở tệp); bấm thẻ mở hội thoại tại đúng tin | Tra lại báo giá, ảnh chuyển khoản theo tên tệp | 24/09/2026 |
| Hội thoại nhóm | Tìm được theo tên người đã nhắn trong nhóm ("Thành viên: X"); tab Tin nhắn ghi tên người gửi thật | Nhu cầu thật là "nhóm nào có Lan" | 24/09/2026 |
| Engine Meilisearch (tuỳ chọn, `SEARCH_DRIVER=meilisearch`) | Tìm tương đối theo mặc định của Meilisearch: thiếu từ cuối vẫn ra (xếp dưới cùng), gõ không dấu ra chữ có dấu kể cả `đ`, cụm đứng sớm trong tin xếp trên cụm đứng muộn, thời gian chỉ phá hoà. Trong một hội thoại, `created_at:desc` áp ở bước `sort` (sau words/typo/proximity/attributeRank), không thuần theo thời gian như PostgreSQL. Tab Hội thoại chưa khớp theo tên thành viên nhóm (tab Tin nhắn vẫn khớp) | Founder chốt tìm tương đối, không tự bỏ dấu, không tắt khớp tiền tố; phần lệch với engine PostgreSQL ghi rõ ở đây | 25/09/2026 |
| Mốc thời gian | Tin và tệp tìm trong **12 tháng** gần nhất (một hằng số) | SME tra lại báo giá, chuyển khoản cũ | 24/09/2026 |
| Mở tại đúng tin | `?messageId=` (tìm kiếm, Media của liên hệ, báo cáo) nạp tới tin đích kèm một trang tin trước làm ngữ cảnh, cuộn vào giữa, nháy nền ~2,5 giây; tin không còn thì báo | Ba lối vào gắn liên kết phải chạy thật | 24/09/2026 |

## Mời qua link

| Màn | Quyết định | Lý do | Ngày |
|---|---|---|---|
| Ai tạo được link | Chỉ quản trị viên (`authorizeAdministrator`, giống `AgentsController`) | Bổ sung cho mời qua email, không phải một quyền mới | 25/09/2026 |
| Hạn dùng, giới hạn lượt | Ba mốc cố định 1/7/30 ngày (`AccountInviteLink::EXPIRY_DAY_CHOICES`), không cho nhập tự do; số lượt dùng để trống = không giới hạn tới khi hết hạn | Form đơn giản; hạn dùng luôn có mốc, số lượt là tuỳ chọn thêm | 25/09/2026 |
| Lưu token | Chỉ lưu digest sha256 (`token_digest`); token thật chỉ trả một lần trong response `POST .../invite_links` (không truy vấn lại được) | Rò rỉ DB không lộ được link đang hoạt động — cùng nguyên tắc `reset_password_token` một lần dùng, siết chặt hơn vì đây là tính năng mới | 25/09/2026 |
| Xác nhận email khi tham gia qua link | Tài khoản mới đặt mật khẩu ngay trên trang `/invite/{token}` được coi là đã xác nhận (`confirmed_at = now()`) ngay lúc tạo, không gửi mail xác nhận riêng | Nhất quán với lời mời qua email: `PasswordsController::update` cũng tự xác nhận đúng lúc người được mời đặt mật khẩu. Ở đây bước đặt mật khẩu và bước "chấp nhận lời mời" là cùng một hành động trên cùng một trang, nên xác nhận ngay tại chỗ thay vì bắt gửi thêm một email xác nhận cho việc đã vừa làm | 25/09/2026 |
| Người đã đăng nhập bấm link | Tham gia một chạm, không yêu cầu nhập lại gì; đã là thành viên thì không tạo bản ghi trùng và không trừ lượt dùng (`AccountInviteAcceptanceService::acceptForExistingUser`) | Bấm hai lần / mở hai tab không được làm cạn lượt dùng của link | 25/09/2026 |
| Khoá tránh vượt `max_uses` khi dùng song song | `lockForUpdate` trên chính bản ghi link (không khoá cả account như `AgentBuilder`) trước khi tăng `use_count` | Cuộc đua chỉ xảy ra trên link đang tranh chấp, khoá cả account là quá tay | 25/09/2026 |
| Audit ai vào qua link nào | Cột `account_users.invite_link_id` (thêm, nullable) cạnh `inviter_id` sẵn có | Theo đúng quy tắc "ghi nguồn" đã có cho kênh liên hệ, áp dụng cho đường vào tài khoản | 25/09/2026 |
| Giới hạn ghế / seat | Không kiểm tra gì thêm | Gate hạn mức đã gỡ hoàn toàn (25/07/2026); không tự dựng lại khi chưa có lệnh | 25/09/2026 |
| Trang công khai `/invite/{token}` | `noindex` (không có gì để xếp hạng, cùng lý do trang cảm ơn đặt lời demo); không nằm sau middleware `guest` hay `auth` vì phải phục vụ cả hai loại khách | Một route phục vụ đúng hai luồng thay vì tách hai route trùng logic | 25/09/2026 |
| Thông báo lỗi link | Bốn trạng thái riêng: không tồn tại / đã thu hồi / đã hết hạn / đã hết lượt — không gộp thành một câu "link không hợp lệ" | Người nhận biết chính xác cần xin lại hay đã bị chặn | 25/09/2026 |
| Giới hạn đã biết | Người đã có tài khoản nhưng đang ở trạng thái khách trên trang mời chỉ có đường dẫn tới `/app/login` (không quay lại tự động trang mời sau khi đăng nhập) — họ cần mở lại link mời sau khi đăng nhập để tham gia một chạm | Tránh mở rộng luồng đăng nhập hiện có để mang theo URL quay lại; không chặn luồng chính (tài khoản mới ký thẳng, tài khoản cũ có sẵn thì một chạm ngay) | 25/09/2026 |
