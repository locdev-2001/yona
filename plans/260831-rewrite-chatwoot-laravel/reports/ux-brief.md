# Brief UX — giai đoạn "cầu toàn sản phẩm" (lệnh founder 07/09/2026)

Áp dụng cùng `qa-account3-brief.md` (môi trường, cấm, gate). Brief này định hướng CÁCH NGHĨ: không chỉ "đã port đủ và chạy", mà **tính năng có hợp lý không, bất cập gì, bug ẩn, UX chưa tối ưu, UI có vấn đề**. Founder cầu toàn; **ưu tiên tuyệt đối là chat** (danh sách hội thoại, khung chat, panel phải, ô soạn, thao tác trên tin). Mục tiêu cảm xúc: khách hàng dùng omnichannel phải **"wow" ngay lập tức**.

## Quyết định đã chốt của founder (làm luôn, không hỏi lại)
1. **Khách vô danh** (contact không có tên từ kênh) → tên ngẫu nhiên dễ thương kiểu Google Docs, tiếng Việt: "Gấu mèo ẩn danh", "Cú ẩn danh", "Nai vàng ẩn danh", "Cáo đỏ ẩn danh"… thay cho haikunator `odd-wave-872`. Danh sách ≥ 60 con vật/thực thể dễ thương, tiếng Việt có dấu, ổn định theo contact (sinh 1 lần, lưu vào `name`), không trùng lộ liễu trong cùng account (thêm hậu tố nhẹ khi cạn). Avatar chữ cái lấy từ tên mới.
2. **Panel phải (thông tin liên hệ/hội thoại) hiện sẵn** khi mở hội thoại ở màn ≥ 1280px, không bắt bấm bubble; người dùng thu gọn thì nhớ lựa chọn (persist). Dưới 1280px giữ toggle như gốc.
3. **Giảm thao tác**: mọi việc thường làm trong chat (gán, nhãn, trạng thái, ưu tiên, ghi chú) phải ≤ 2 click từ khung chat; hạn chế modal cho việc nhỏ.
4. **Tích hợp kênh thật**: founder muốn tự tạo tài khoản kênh (Telegram bot, LINE, Facebook…) rồi tích hợp và nhắn thử. Phiên chính KHÔNG được tạo tài khoản/nhập token (luật an toàn); founder tạo và dán token, phiên chính đóng vai khách trên Chrome của founder.

## Chính sách lệch so với oracle Chatwoot (mới)
- Màn **chat** được phép lệch có chủ đích để tốt hơn Chatwoot. Mỗi lệch phải ghi vào `reports/ux-deviations.md`: màn · lý do (dựa trên nguyên tắc UX bên dưới) · ảnh trước/sau · cách harness pixel mask/loại trừ. Không ghi = coi là lỗi hồi quy.
- Màn không thuộc chat: giữ gate pixel cũ (≤0,1%) trừ khi có finding UX được founder duyệt.
- Không đổi nhận diện thương hiệu, không thêm gradient/shadow/animation "cho vui": phong cách **Flat, tối giản, 150–200ms ease, icon Lucide/Heroicons, không emoji làm icon** (khuyến nghị từ skill ui-ux-pro-max cho SaaS dashboard Việt: font Be Vietnam Pro/Noto Sans có sẵn tiếng Việt; primary indigo; tránh layout rối, onboarding phức tạp).

## Khung critique (skill design-critique) — dùng cho MỖI màn/luồng
1. Ấn tượng 2 giây: mắt rơi vào đâu trước, có đúng chỗ không, mục đích màn có rõ không.
2. Usability: người dùng làm xong việc không, bước thừa, phần tử tương tác có rõ là bấm được không.
3. Thứ bậc thị giác: thứ tự đọc, nhấn đúng thứ quan trọng, khoảng trắng, typography.
4. Nhất quán: spacing/màu/chữ/hành vi giống nhau cho phần tử giống nhau.
5. Accessibility: tương phản ≥ 4,5:1 (light+dark), target ≥ 44px, focus ring, label form, aria cho icon-only, tab order, `prefers-reduced-motion`.
Mỗi finding: **cụ thể** (không "layout rối"), **giải thích vì sao** (nguyên tắc/nhu cầu người dùng), **đề xuất cách sửa**, **mức độ** 🔴/🟡/🟢, ghi cả cái đang tốt.

## Checklist skill ui-ux-pro-max (ưu tiên giảm dần)
- Accessibility: contrast, focus-states, alt-text, aria-labels, keyboard-nav, form-labels.
- Touch & interaction: target ≥44px, click cho hành động chính, nút disable khi async, lỗi hiện cạnh chỗ sai, `cursor-pointer` cho mọi thứ bấm được, hover có phản hồi không làm layout nhảy.
- Performance: ảnh WebP/lazy, reduced-motion, **không content jumping** (giữ chỗ cho nội dung async), virtualize list > 100 dòng, key ổn định.
- Layout: font ≥ 16px mobile, không scroll ngang, z-index có thang, không che sau thanh cố định, responsive 375/768/1024/1440.
- Typography/màu: line-height 1.5–1.75, 65–75 ký tự/dòng, light mode text `slate-900`, muted ≥ `slate-600`, border nhìn thấy ở light.
- Animation: 150–300ms, transform/opacity, skeleton cho loading, ease-out vào/ease-in ra, ≤ 2 phần tử động mỗi màn.
- Feedback: empty state có hướng dẫn + hành động; lỗi có đường phục hồi (thử lại + trợ giúp); không thất bại im lặng.

## Những câu hỏi "wow" cho chat omnichannel (trả lời bằng bằng chứng)
- Mở inbox lần đầu: người mới có thấy ngay kênh nào, khách nào, việc gì cần làm không? Có empty state dẫn dắt kết nối kênh đầu tiên không?
- Tin đến: có thấy ngay kênh (icon Zalo/Telegram/Website…), khách là ai (tên/avatar), nội dung, chưa đọc, và trả lời được trong 1 click không?
- Trong khung chat: loại tin đặc thù (sticker, ảnh, file, danh thiếp, thẻ ngân hàng, nhắc hẹn, reaction, tin thu hồi, trích dẫn) hiện đẹp như app gốc của kênh không?
- Panel phải: thông tin khách hữu ích ngay (kênh, SĐT/email nếu có, hội thoại trước, nhãn, thuộc tính) hay chỉ là chỗ trống "Không có sẵn"?
- Tốc độ cảm nhận: chuyển hội thoại < 300ms, không màn trắng/đen, không spinner toàn trang; skeleton thay spinner.
- Ngôn ngữ: tiếng Việt tự nhiên, không lẫn tiếng Anh ("about 1 hour ago"), không Title Case máy móc.

## Báo cáo
`reports/ux-<nhóm>-notes.md`: bảng finding theo khung critique (màn · finding · mức · vì sao · đề xuất · bằng chứng ảnh trong `~/www/pixel-diff/ux-<nhóm>/`), phần "đang tốt", top-5 việc đáng làm nhất theo tác động/chi phí. Nếu được giao sửa: mỗi thay đổi ghi vào `ux-deviations.md`. Kết thúc theo mẫu Status của brief chung.
