# Audit UX chat — phiên chính tự làm (07/09/2026 05:35, Browser pane 1520×845, account 3, locale vi)

Agent audit bị cắt hai lần vì giới hạn token nên phiên chính tự soi theo khung `ux-brief.md`. Không lặp lại các mục đã sửa ở lô 5 (icon kênh, panel phải, Title Case, Thử lại, tên ẩn danh) và `ux-zalo-main-session-notes.md`.

## Ấn tượng 2 giây khi mở inbox
Mở `/dashboard` lần đầu: tab mặc định **"Của tôi 0"** → cột giữa trống, cột phải hiện "Uh oh! Có vẻ như không có tin nhắn nào từ khách hàng trong hộp thư của bạn" trong khi **khách đang chờ ở "Chưa được phân công 1"**. Chủ shop 1 người sẽ tưởng inbox trống. Đây là parity Chatwoot nhưng ngược với mục tiêu "wow".

## Bảng finding
| # | Màn | Finding | Mức | Vì sao | Đề xuất | So oracle |
|---|---|---|---|---|---|---|
| 1 | Danh sách | Tab mặc định "Của tôi" rỗng dù có hội thoại chưa phân công; empty state nói "không có tin nhắn nào từ khách" | 🔴 | Ẩn việc khẩn sau một tab; câu chữ sai sự thật | Mặc định tab "Tất cả" (hoặc nhớ tab cuối); empty state đổi theo ngữ cảnh: "Không có hội thoại nào được gán cho bạn · 1 hội thoại đang chờ phân công → Xem" | Giống oracle (parity) → lệch có chủ đích |
| 2 | Ô soạn | Gõ `/` mở bảng câu trả lời mẫu: bảng cướp focus vào ô "Tìm kiếm…" của nó; **Escape và Backspace không đóng**, ký tự `/` kẹt trong editor; bảng che cả tab Trả lời/Lưu ý riêng | 🔴 | Người dùng gõ nhầm `/` là kẹt, phải bấm chuột ra ngoài | Giữ focus trong editor như gốc (`CannedResponse.vue` lắng nghe keydown của editor), Escape đóng, xoá `/` đóng; bảng neo trên ô soạn không che tab | Oracle: focus ở editor, Escape đóng |
| 3 | Ô soạn | Khi account chưa có câu trả lời mẫu: "Không tìm thấy kết quả." | 🟡 | Empty state không dẫn lối | "Chưa có câu trả lời mẫu nào · Tạo trong Cài đặt → Câu trả lời mẫu" kèm link | Giống oracle |
| 4 | Toàn cục | Ctrl+K không mở bảng lệnh trên Linux (đã thử 2 lần, focus ở body); gợi ý phím vẫn vẽ ⌘ | 🔴 | Phím tắt là "wow" của người dùng chuyên; hiện sai và không chạy trên Windows/Linux (đa số SME Việt) | Bind cả `ctrl+k`; hiển thị `Ctrl` khi `navigator.platform` không phải Mac (gốc có helper `isMac`) | Oracle: ninja-keys nhận `cmd+k, ctrl+k` |
| 5 | Danh sách | Thanh tab "Của tôi / Chưa được phân công / Tất cả" tràn, phải bấm mũi tên ‹ › ở bề rộng cột mặc định | 🟡 | Nhãn tiếng Việt dài hơn tiếng Anh; thao tác thừa | Rút "Chưa gán"; bỏ mũi tên khi đủ chỗ | Oracle tiếng Anh không tràn |
| 6 | Danh sách | Pill "Mở" cạnh tiêu đề là bộ lọc trạng thái nhưng không giống nút lọc | 🟢 | Khó đoán | Nhãn "Trạng thái: Mở ▾" | Giống oracle |
| 7 | Khung chat | Tin đã gửi từ Yona (881) hiện nhãn "từ điện thoại" vì tin ma echo 882 tạo trước fix đua | 🟡 (dữ liệu cũ) | Nhãn sai ngữ nghĩa | Đã xoá 882/884 bằng tay; fix đua đã có test khoá | — |
| 8 | Khung chat | Hành động trên tin chỉ hiện khi hover, không có ở mobile/touch; không có menu chuột phải | 🟡 | Touch không hover được | Thêm nút ⋯ luôn hiện mờ trên touch (`@media (hover: none)`) hoặc long-press | Oracle cũng hover |
| 9 | Panel phải | "Hành động của hội thoại" 4 dropdown "Không có" xếp dọc chiếm 1/3 panel | 🟡 | Việc thường làm (gán cho mình) vẫn 2 click + cuộn | Nút "Gán cho tôi" 1 click cạnh dropdown; gom 4 dropdown thành 2 hàng | Giống oracle |
| 12 | Cài đặt → Hộp thư | Inbox Zalo hiện phụ đề "Kênh API" | 🔴 | Nhãn kênh sai ngay trang quản lý kênh; SME nhiều inbox sẽ lẫn | Map `channel_type` → nhãn ở cùng helper icon kênh (`helper/inbox.ts`), thêm "Zalo"; bỏ nhánh mặc định rơi về API | Oracle không có Zalo |
| 13 | Cài đặt → Câu trả lời mẫu | Empty state: "Không có câu trả lời soạn trước nào…" trong khi tiêu đề là "Câu trả lời mẫu"; không có nút tạo ngay trong empty state | 🟡 | Thuật ngữ lệch, thiếu dẫn lối | Thống nhất "câu trả lời mẫu"; empty state có nút "Thêm câu trả lời mẫu" | Giống oracle |
| 14 | Menu hồ sơ (avatar góc dưới) | Locale vi vẫn hiện "Log out", "Light / Dark / System" tiếng Anh | 🟡 | Lẫn ngôn ngữ ở menu dùng hằng ngày | Khoá i18n cho 4 chuỗi trong `lang/vi` (`PROFILE_SETTINGS`/`APPEARANCE`), `i18n:generate` | Oracle en |
| 10 | Light mode | Bong bóng/panel/tab đều đọc được, tương phản ổn | ✅ | — | — | — |
| 11 | Realtime | Tin mới, badge, typing, tick trạng thái cập nhật không reload (đã kiểm nhiều lần trong phiên) | ✅ | — | — | — |

## Số click cho thao tác thường làm (từ khung chat, Yona hiện tại)
| Thao tác | Yona | Oracle | Mục tiêu |
|---|---|---|---|
| Gán cho tôi | 2 (dropdown → chọn) | 2 | 1 (nút "Gán cho tôi") |
| Đổi trạng thái (Giải quyết) | 1 | 1 | 1 |
| Snooze | 2 | 2 | 2 |
| Gắn nhãn | 2–3 | 2–3 | 2 |
| Ghi chú riêng | 2 (tab → gõ) | 2 | 2 |
| Chuyển hội thoại | 1 | 1 | 1 |
| Thả cảm xúc / Thu hồi | 2 (hover → nút) | không có | 2 |

## Đang tốt
Icon Zalo nhận diện rõ ở 3 nơi; panel phải hiện sẵn với "Hội thoại trước" dễ bấm; thẻ danh thiếp/nhắc hẹn/sticker/GIF đẹp; tick trạng thái + "đang nhập" realtime; thu hồi/cảm xúc hai chiều; tên khách ẩn danh dễ thương; placeholder ô soạn gọn; thời gian tiếng Việt.

## Top-5 đáng làm ngay (S = nhỏ, M = vừa)
1. (S) #2 bảng `/` — sửa focus/đóng: đây là lỗi kẹt phím thật.
2. (S) #4 Ctrl+K + hiển thị phím theo hệ điều hành.
3. (S) #1 tab mặc định "Tất cả" + empty state theo ngữ cảnh (cần founder duyệt vì lệch gốc — đề xuất làm).
4. (S) #5 rút nhãn tab, bỏ mũi tên.
5. (S) #12 nhãn kênh Zalo ở danh sách hộp thư; (S) #3/#13 empty state câu trả lời mẫu; (M) #9 nút "Gán cho tôi".
