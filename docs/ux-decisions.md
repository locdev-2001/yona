# Quyết định UX có chủ đích

Những chỗ Yona cố ý làm khác cách làm quen thuộc của ứng dụng nhắn tin, kèm lý
do. Quyết định mới ghi vào đây cùng commit với code. Sửa ngược một quyết định ở
đây mà không có lý do mới = lỗi hồi quy.

Từ 19/10/2026 Yona là ứng dụng nhắn tin giữa bạn bè (xem
[brand-positioning.md](brand-positioning.md)). Tài liệu này được viết lại cho sản
phẩm đó: chỉ giữ quyết định còn đúng với màn chat và bề mặt công khai. Quyết định
của thời CRM (hộp thư đa kênh, widget, phụ trách, trạng thái hội thoại, tìm kiếm
liên hệ, mời vào account, soạn hội thoại mới) đã bỏ; muốn tra lại thì xem lịch sử
git của tệp này trước tag `main-truoc-chat-ban-be`.

Kiến trúc: [system-architecture.md](system-architecture.md).

## Nhắn tin giữa bạn bè

| Màn | Quyết định | Lý do | Ngày |
|---|---|---|---|
| Màn chat (`/chat`, `/chat/c/{id}`) | **Dùng lại y hệt giao diện hộp thư** (`dashboard/conversation/ConversationView.tsx`, `ConversationContext.tsx` viết lại cho chat), không biến tấu. Payload tin và hội thoại giữ khuôn cũ (`ChatPresenter`) để component sẵn có chạy được | Founder chốt: giao diện hộp thư đã được mài qua nhiều vòng nghiệm thu, dựng lại từ đầu là mất công mà chưa chắc tốt hơn | 19/10/2026 |
| Tin từ người lạ | Hội thoại 1-1 mới: người mở là thành viên chính thức, người nhận ở trạng thái **chờ** và thấy nó ở tab **Tin chờ**, không ở danh sách chính. Tin chờ chỉ hiện khi đã có ít nhất một tin (mở hội thoại rồi bỏ đi không làm phiền ai). Trả lời trong Tin chờ = chấp nhận. Xoá khỏi danh sách không báo cho người kia | Nhắn tự do giữa người dùng (không có bảng bạn bè) mà không để người lạ chen thẳng vào danh sách chính. Người bị từ chối không cần biết, tránh gây khó xử | 19/10/2026 |
| Thông báo đẩy với Tin chờ | Tin vào Tin chờ **không** gửi thông báo đẩy; chỉ thành viên đã chấp nhận và không tắt thông báo hội thoại mới nhận | Người lạ không được dùng thông báo đẩy để gây chú ý | 19/10/2026 |
| Chặn | Chặn khai một chiều nhưng hiệu lực **hai chiều** ở 1-1: không bên nào gửi được cho bên kia. Người chặn vẫn thấy hội thoại cũ (`blocked_by_me`), ô soạn bị khoá (`can_reply = false`) | Chặn mà người bị chặn vẫn nhắn được thì không còn là chặn; giữ lịch sử để người chặn còn đối chiếu hoặc báo cáo | 19/10/2026 |
| Báo cáo vi phạm | Báo cáo được một người, một hội thoại hoặc một tin (`AbuseReport::REPORTABLE`); Super Admin xử lý ở console | Đủ ba mức người dùng thực sự gặp: kẻ quấy rối, nhóm xấu, một tin cụ thể | 19/10/2026 |
| Đã xem | Dấu đã xem chỉ có ở hội thoại 1-1 (tin tới id người kia đã đọc) | Ở nhóm, "đã xem" của từng người cần giao diện riêng; chưa làm thì không hiện nửa vời | 19/10/2026 |
| `@username` | Chưa chọn username thì mọi trang chat chuyển về màn chào mừng (`/chat/welcome`, middleware `EnsureUsername`) | Chưa có username thì không ai tìm thấy mình, vào chat cũng không làm được gì | 19/10/2026 |

## Bong bóng tin, avatar

| Màn | Quyết định | Lý do | Ngày |
|---|---|---|---|
| Mọi avatar | Người chưa có ảnh hiện **avatar hình khối tất định** (Blobatar) thay ô chữ cái đầu. Hình dựng theo **định danh bền** `loại:id` (`user:3`), không theo tên: đổi tên không đổi hình, cùng một người ra cùng một hình ở mọi màn. Chỉ khi không có id mới dựng theo tên. Thứ tự: ảnh thật → icon riêng → hình khối; ảnh lỗi rơi về hình khối. Không animate (danh sách dài). Nguồn duy nhất: `resources/js/shared/avatar/` (`avatarSeed`, `GeneratedAvatar`) | Chữ cái đầu trùng nhau rất nhiều, đổi tên là đổi màu; hình khối theo id phân biệt bằng mắt nhanh hơn và ổn định | 08/10/2026 |
| Avatar hình khối · biểu cảm và ánh mắt | Mỗi avatar mang **một biểu cảm cố định theo định danh**, chỉ trong nhóm thân thiện (bình thường, vui, nháy mắt, tự tin, yêu, ngại, ngạc nhiên, buồn ngủ). Mắt nhìn theo con trỏ khi con trỏ ở gần (360px); chớp, liếc, nhún chỉ chạy khi trỏ vào một hội thoại trong danh sách; thiết bị cảm ứng và người bật giảm chuyển động thì đứng yên. Cỡ: danh sách hội thoại 40px, header 36px, bong bóng tin 32px | Avatar sống động giúp nhận ra người quen nhanh; mặt tiêu cực không hợp để đại diện bạn bè | 08/10/2026 |
| Bong bóng · thanh hành động khi rê chuột | Thứ tự cố định: Trả lời → Cảm xúc (❤️ 👍 😆 😮 😢 😡) → … → Thu hồi/Xoá. Cờ nút ở `dashboard/components-next/message/helpers/messageActions.ts` | Việc thường làm phải ≤ 2 click từ khung chat, không giấu trong menu chuột phải | 07/09/2026 |
| Thanh hành động trên máy cảm ứng | Máy không rê chuột được (`(hover: none)`) có nút ⋯ hiện sẵn mờ cạnh bong bóng, chạm mới bung; nút và ô emoji 36px | Ngón tay không tạo hover; không dùng nhấn giữ vì đã là cử chỉ chọn văn bản | 07/09/2026 |
| Hàng cảm xúc dưới bong bóng | Đọc dạng `[{emoji, by, at}]`, gom theo emoji + đếm, viền sáng emoji do chính mình thả, bấm lại là gỡ | Biết ngay mình đã thả gì và gỡ được một chạm | 07/09/2026 |
| Ngày giờ | Theo locale: tiếng Việt giờ 24, ngày trước tháng ("7 thg 9, 22:37"). Một chỗ: `shared/helpers/timeHelper.ts` (`PATTERN_BY_LOCALE`) | Giao diện tiếng Việt lẫn ngày giờ tiếng Anh là lỗi hiển thị | 08/09/2026 |
| Mốc thời gian rút gọn | Đơn vị ngắn lấy từ `lang/{locale}/time_ago.php`: "vừa xong", "3 phút", "2 giờ"… kèm "trước" khi cần. Thời gian nằm cùng hàng với tên thay vì lớp nổi | Không hiện "now", "26m" giữa giao diện tiếng Việt; chữ tiếng Việt rộng đè lên tên | 24/09/2026 |

## Ô soạn tin, trả lời, sticker

| Màn | Quyết định | Lý do | Ngày |
|---|---|---|---|
| Ô soạn tin, mọi cỡ màn | Chiều cao bám nội dung (44px khi rỗng), tự giãn tới 200px, kéo tay vượt trần được và nhớ lựa chọn. Công thức: `dashboard/conversation/composerHeight.ts`; luật tự giãn ở `shared/helpers/autoGrowField.ts`. Thanh cuộn luôn ẩn, chỉ cuộn khi chạm trần | Ô soạn cao cố định ăn hơn 1/4 màn điện thoại cho một ô trống | 25/09/2026 |
| Khung chat · đọc tin cũ | Cuộn cách đáy quá 200px thì hiện nút tròn "Xuống tin mới nhất" trên ô soạn; tin mới của người khác đến lúc đó **không** kéo khung xuống mà cộng vào số trên nút; tin chính mình gửi vẫn kéo xuống. Quy tắc ở `dashboard/conversation/conversationbox/useScrollToLatest.ts` | Đang đọc lại tin cũ mà bị giật xuống đáy là mất chỗ đang đọc | 02/10/2026 |
| Trả lời trích dẫn · điểm vào | Nút Trả lời đứng đầu thanh hành động của bong bóng (điện thoại: sau ⋯) | Thanh hành động là chỗ người dùng đã quen và dùng được trên điện thoại | 24/09/2026 |
| Trả lời trích dẫn · khung soạn | Tin đang trả lời lưu theo hội thoại ở localStorage (`dashboard/conversation/replyToStore.ts`), tải lại trang vẫn còn | Soạn dở không mất ngữ cảnh | 24/09/2026 |
| Sticker · làm từ ảnh | Sticker làm từ ảnh người dùng tải lên (PNG, JPG, WebP, GIF/WebP động): cắt, xoá nền không AI (nền trong suốt tuyệt đối, không quầng), luôn ra **64×64** | Tải Lottie hay tạo sticker bằng AI quá khó với người dùng cuối; 64px là cỡ sticker (founder chốt) | 28/09/2026 |
| Sticker · hiển thị | Sticker hiện bằng `<img>` cạnh 64px; WebP động tự chạy, không cần trình phát riêng | Nhẹ là ưu tiên số một: không tải thêm thư viện hay wasm | 28/09/2026 |
| Sticker · bong bóng | Không khung, không mở thư viện ảnh, không nút tải; xem trước ghi "Sticker". Sticker không mang trích dẫn (khối "Đang trả lời" giữ cho tin chữ kế tiếp) | Sticker là cảm xúc, không phải tệp | 24/09/2026 |
| Phím tắt | Phím bổ trợ theo hệ điều hành (`⌘` trên macOS, `Ctrl` nơi khác) qua một helper `shared/helpers/kbd.ts` | Phần lớn người dùng Việt dùng Windows/Linux | 07/09/2026 |
| Bảng lệnh (Ctrl+K) · chân bảng | Chân bảng gợi ý phím bằng tiếng Việt; không khớp gì thì báo "Không tìm thấy kết quả nào"; icon Lucide | Thư viện bảng lệnh nhúng chuỗi tiếng Anh và không có thông báo rỗng | 07/09/2026 |

## Kho sticker (console Super Admin)

| Màn | Quyết định | Lý do | Ngày |
|---|---|---|---|
| Lưới sticker | Ô 88px chỉ có ảnh, **không có chữ** trên ô: nhãn và số từ khoá nằm ở `aria-label`/`title`; sticker chưa có từ khoá chỉ mang chấm vàng 6px. Sửa nhãn, từ khoá, thứ tự, xoá gom vào menu ⋯ và ngăn chi tiết (320px ≥1280px, ngăn phủ bên phải dưới 1280px, bottom sheet dưới 768px) | Kho là bảng ảnh, người quản trị nhận sticker bằng mắt | 28/09/2026 |
| Header bộ | Xuất bản là **Switch** cạnh huy hiệu trạng thái, khoá khi bộ chưa có sticker sẵn sàng; tắt Switch thì toast "Đã chuyển về nháp" có nút **Hoàn tác**. Nút chính duy nhất là "+ Thêm sticker"; Đổi tên/Xoá bộ trong menu ⋯ | Xuất bản được bộ rỗng là lỗi; gỡ xuất bản làm người dùng mất sticker nên phải lấy lại được một chạm | 28/09/2026 |
| Điện thoại | **Hai màn** điều khiển bằng `?pack=` (danh sách bộ → chi tiết bộ, nút ‹ và Back của trình duyệt quay lại); "+ Thêm sticker" là thanh cố định đáy. Kéo đổi chỗ chỉ có trong chế độ **Sắp xếp** (menu ⋯, nhấn giữ 250ms, bấm Xong mới lưu) | Chạm giữ ngoài chế độ riêng sẽ tranh cử chỉ cuộn | 28/09/2026 |
| Trình chỉnh · vùng lấy Tuỳ chỉnh | Khung Tuỳ chỉnh gửi `fit: contain` (lấy đúng khung người dùng kéo, phần vượt biên là lề trong suốt) thay vì cover | Cover tự ôm chủ thể nên kéo khung không đổi kết quả, người dùng tưởng công cụ hỏng | 28/09/2026 |

## Bố cục theo cỡ màn

| Màn | Quyết định | Lý do | Ngày |
|---|---|---|---|
| Hai mức ngắt | `SMALL_SCREEN_BREAKPOINT = 1024`, `LARGE_SCREEN_BREAKPOINT = 1280` (một chỗ: `dashboard/constants/globals.ts`) | Ở tablet dọc 820px, danh sách + khung chat + panel ép khung chat còn 1px | 08/09/2026 |
| Màn chat dưới 1024px | **Hai màn bắt buộc**: danh sách chiếm hết bề rộng; mở hội thoại thì danh sách ẩn, header có nút "Trở về". Một chỗ: `dashboard/conversation/layoutMode.ts` | Ở 390px cột danh sách 340px đè khung chat, không mở nổi hội thoại | 08/09/2026 |

## Chủ đề màu

| Màn | Quyết định | Lý do | Ngày |
|---|---|---|---|
| Trang công khai, đăng nhập/đăng ký, console Super Admin | **Chỉ một giao diện sáng.** Không theo chế độ tối của hệ điều hành, không có nút đổi giao diện; `darkMode: []` ở cấu hình Tailwind của các bề mặt này, trang đặt cố định `color-scheme: light` | Hai bộ màu nhân đôi công nghiệm thu mà không đáng ở bề mặt ít dùng | 26/09/2026 |
| Màn chat | **Có chế độ Sáng / Tối**, mỗi người tự chọn (Hồ sơ, menu avatar, hoặc Ctrl+K); không theo chế độ hệ điều hành, lưu `users.ui_settings.color_scheme`, mặc định Sáng. Tối chỉ đổi giá trị biến màu ở `resources/scss/_dark-colors.scss`, không dùng biến thể `dark:` trong component; class `dark` đặt trên `<html>` ngay khi render để không nháy nền | Người dùng nhắn tin cả ban đêm; màu đã gom về biến nên giữ một bộ màu tối là rẻ | 09/10/2026 |
| Màn chat · phân lớp không viền | **Không dùng đường viền hay đường kẻ để tách khối.** Vùng phân biệt bằng bậc nền + khoảng cách; hover, đang chọn, ô nhập là lớp phủ trong suốt; lớp nổi (menu, popover, dialog) dùng nền trắng + `shadow-overlay`, không viền, không làm mờ nền sau. Nguồn duy nhất: biến `--surface-*`, `--shadow-overlay` ở `resources/scss/_next-colors.scss`. Ngoại lệ còn giữ đường kẻ: viền control nhỏ (checkbox, radio, công tắc), vòng trạng thái (tiêu điểm, lỗi, đang chọn), vùng thả tệp nét đứt | Giao diện nhiều khung kẻ nhìn rối và nặng; ngoại lệ là chỗ đường kẻ mang thông tin, không phải trang trí | 09/10/2026 |

## Thông báo đẩy

| Màn | Quyết định | Lý do | Ngày |
|---|---|---|---|
| Hồ sơ · Thông báo đẩy | **Ẩn** công tắc khi máy chủ không có khoá VAPID hoặc trình duyệt thiếu Push API (`isPushSupported()` ở `dashboard/helper/pushHelper.ts`) | Không hứa tính năng không chạy | 24/09/2026 |
| Tắt công tắc đẩy | Xoá luôn bản ghi phía máy chủ (DELETE `/api/v1/notification_subscriptions` theo `endpoint`) | Không đẩy tiếp vào đăng ký đã chết | 24/09/2026 |
| Đăng xuất | Gỡ đăng ký đẩy của trình duyệt (chờ tối đa 2 giây), xoá badge biểu tượng app, bỏ số ở tiêu đề tab, đóng mọi thông báo trong khay. Mọi lối đăng xuất đi qua `dashboard/helper/logout.ts` | Máy dùng chung: người sau không được nhận thông báo kèm trích tin của người trước | 24/09/2026 |
| Nội dung thông báo tin mới | Tiêu đề là tên người gửi, nội dung là xem trước tin (tối đa 120 ký tự; sticker, thẻ chuyển khoản, tin đã thu hồi có chữ riêng), `tag` theo hội thoại nên mỗi hội thoại một ô trong khay, cái sau thay cái trước. Nguồn: `app/Notifications/ChatMessageNotification.php` | Bạn nhắn năm tin không thành năm thông báo | 19/10/2026 |
| Bấm thông báo đẩy | Đưa tab Yona sẵn có lên rồi điều hướng tới hội thoại thay vì mở cửa sổ mới; thông báo tự đóng | Không mở chồng nhiều cửa sổ | 24/09/2026 |
| Kênh đẩy | Chỉ Web Push; `subscription_type: fcm` trả 422 | Chưa có app gốc | 24/09/2026 |
| Khoá VAPID | Env `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` thắng bản đã lưu; không có thì tự sinh một lần, lưu `installation_configs` (`VAPID_KEYS`, locked). Một chỗ: `VapidService` | Đổi khoá bằng env, không sửa DB tay | 24/09/2026 |
| Endpoint đăng ký đẩy | Kiểm đầu vào (`url:https`, p256dh/auth bắt buộc) + chặn SSRF (`SafeHttp`, không theo chuyển hướng) | Endpoint trình duyệt gửi lên là URL máy chủ sẽ gọi ra | 24/09/2026 |
| Bật đẩy thất bại | Câu lỗi "Không bật được thông báo đẩy…"; dịch vụ đẩy từ chối (`AbortError`) thì hiện hướng dẫn cố định dưới công tắc (Brave: bật "Use Google services for push messaging") | Brave tắt dịch vụ đẩy theo mặc định; hướng dẫn dài không đọc kịp trong toast | 24/09/2026 |
| Tiêu đề tab · biểu tượng app | Tiền tố `(N)` (quá 99 thì `99+`) và badge PWA; về 0 thì xoá. Số chưa đọc một nguồn: `dashboard/notifications/useUnreadCount.ts` | Để Yona ở tab nền vẫn thấy có tin | 24/09/2026 |

## Trang công khai, đăng ký, đăng nhập

| Màn | Quyết định | Lý do | Ngày |
|---|---|---|---|
| `/` | Trang giới thiệu ứng dụng nhắn tin, có nút Tạo tài khoản / Đăng nhập (người đã đăng nhập thấy "Mở Yona"). Bề mặt riêng: `resources/js/landing/**`, `resources/css/landing.css`, `tailwind.landing.config.js`, `landing.blade.php`. Lời giới thiệu ở `resources/js/landing/copy.ts` (vi + en). Không có ảnh chụp màn hình cho tới khi có ảnh màn chat thật; không bảng giá vì chưa có gói cước | Gốc tên miền phải giới thiệu sản phẩm; ảnh màn hộp thư cũ và bảng giá là hứa điều không có | 19/10/2026 |
| `/zalo-ca-nhan`, `/dat-lich-demo` | Route còn nhưng giao diện hiện trang chủ | Link cũ đã chia sẻ không thành trang lỗi, cũng không còn nói về sản phẩm cũ | 19/10/2026 |
| `/app/login`, `/app/auth/signup` | Logo là liên kết về `/`, thêm "← Về trang chủ" dưới form | Có trang chủ thì phải quay lại được | 07/09/2026 |
| Đăng ký | Bằng email hoặc Google; chỉ tạo người dùng (`PersonalSignUpService`), không tạo không gian làm việc. Email chưa xác minh thì gửi thư xác nhận | Ứng dụng cá nhân, mỗi người một tài khoản | 19/10/2026 |
| Mọi mặt tiền công khai | `SetLocale` đọc `Accept-Language` cho khách vô danh, rút `vi-VN` → `vi` | Khách chưa đăng nhập không có hồ sơ để hỏi ngôn ngữ | 07/09/2026 |
| Đăng nhập bằng Google | Tài khoản đã bật 2FA vẫn phải nhập mã 2FA | 2FA là lớp bảo vệ người dùng tự bật; một lối đăng nhập không được lách qua nó | 25/09/2026 |

## Trạng thái đang tải

| Màn | Quyết định | Lý do | Ngày |
|---|---|---|---|
| Mọi bề mặt | Chờ tải dùng **một** hiệu ứng: ba khối nảy, màu theo chữ xung quanh, không vòng quay. Nguồn duy nhất `resources/js/shared/components/loader/LoaderIcon.tsx`; `Loader` là bản mang nhãn "Đang tải" (`role="status"`), `LoaderIcon` không nhãn chỉ dùng cạnh chữ "Đang…" đã hiện sẵn. Người bật giảm chuyển động thấy ba khối đứng yên so le. Skeleton giữ chỗ, chấm "đang gõ" và biểu cảm avatar không thuộc loại này | Mỗi vùng tự vẽ một kiểu quay riêng thì rối; đổi kiểu tải về sau chỉ sửa một tệp | 08/10/2026 |
