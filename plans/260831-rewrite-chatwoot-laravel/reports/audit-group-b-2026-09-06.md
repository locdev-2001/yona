# Audit nhóm B — kiểm chứng lại bằng browser

Ngày: 06/09/2026. Phạm vi: B1→B11 sau phản hồi về B5/B6 và label tiếng Việt.

## Kết luận ngắn

Nhóm B có đủ lõi nghiệp vụ chính, nhưng các report cũ không nên được xem là
evidence hiện tại tuyệt đối. B5 đã sửa để status đổi nhanh và không lệch sau thao
tác liên tiếp; B7 đã sửa label thành tên hiển thị tự do. Hai vấn đề đo pixel còn
lại chủ yếu do fixture/harness không đồng nhất, không phải do khối UI tương ứng.

## Fresh browser evidence

| Feature | Kết quả kiểm tra thực tế | Trạng thái |
|---|---|---|
| B1 Inbox/API | Browser smoke `/settings/inboxes/list`: trang tải, hiển thị 2 inbox `Api-Test` + `Yona`, nút `Add Inbox` hiện, không có HTTP lỗi nghiệp vụ | `PASS SMOKE; FULL WIZARD REPORT CŨ` |
| B2 Contacts | Browser smoke `/contacts?page=1` thấy `Trang Nguyen`; mở `/contacts/3` thấy detail/Message/Update/Delete/History/Notes/Media/Merge, không có HTTP lỗi nghiệp vụ | `PASS SMOKE; FULL CRUD REPORT CŨ` |
| B3 Conversation/Message | Conversation/message được dùng xuyên suốt các browser flow B5→B11; backend contract nằm trong full Pest | `PASS WITH SHARED-FLOW EVIDENCE` |
| B4 Realtime | `realtime-ws.mjs`: Reverb websocket mở, 2 private channel subscribe, auth `200/200`, presence `200` | `PASS; 409 LOGIN NOISE` |
| B5 Lifecycle | Browser E2E Resolve/Reopen/Pending/Open/Snooze/Open + reload + transcript modal + hotkey pass. API delay `1.5s`: UI đổi khoảng `0.3s`; `Alt+M` mở ngay; lỗi chậm rollback. Case Snooze→Open liên tiếp: request được queue, reload vẫn Open | `PASS AFTER FIX` |
| B6 Assignment | Browser panel mở bằng nút Contact; Assignee/Team/Priority hiện đủ. Gán Samantha/team, self-assign, clear và reload pass. Bulk được kiểm với conversation tạm thứ hai: team/status/command bar/realtime pass | `PASS; PIXEL FIXTURE NOISE` |
| B7 Labels | Tạo label `VIP Khách Hàng #1`, giữ nguyên casing/khoảng trắng/ký hiệu, gắn conversation, click sidebar filter và tab All trả đúng 1 conversation, rồi dọn sạch | `PASS AFTER FIX` |
| B8 Unread/tabs | Badge card, unread pill, mark read/unread và reload pass | `PASS; 409 LOGIN/REDIRECT NOISE` |
| B9 Attachments | Original fixture PDF/PNG đã mất; probe thay bằng ảnh user-provided, upload image → bubble ảnh → URL GET `200`, dọn message/attachment | `PASS IMAGE; PDF NEEDS FRESH FIXTURE` |
| B10 Composer | Canned response CRUD, popup `/`, draft sau F5, Ctrl+K, shortcut modal và go-to pass | `PASS; 409 LOGIN NOISE` |
| B11 Panel/Mentions | Participants, mention `@Samantha`, Mentions tab, Contact Notes add/save/F5/delete và 6 accordion pass | `PASS; 409 LOGIN NOISE` |

## Findings cần giữ trong backlog

1. `yona_rw` account 2 đang có thêm inbox WebWidget `Yona`, trong khi oracle chỉ
   có `api-test`. `reset-fixture.sh` reset conversation/user settings nhưng không
   chuẩn hóa danh sách inbox. Vì vậy full-frame B5 diff hiện lệch header/sidebar;
   không được gọi đó là pixel regression của B5.
2. Worker/auto-assignment có thể xử lý job cũ sau khi fixture vừa gỡ assignee, làm
   B6 pixel probe tự xuất hiện `John`/`None` và đổi chiều cao dropdown. Cần dọn
   queue/marker trước pixel gate hoặc dùng DB fixture riêng cho measurement.
3. Panel bên phải mặc định đóng đúng như oracle. Mở từ nút `Contact` (`i-ph-user-bold`)
   trong màn conversation; màn Settings → Labels trong ảnh không có ContactPanel
   hay Assignee là đúng phạm vi, không phải thiếu B6.
4. `POST …/transcript` vẫn là nợ F1/D5; mic ghi âm và thumb 250px/bubble sending
   vẫn là nợ B9. Đây không phải lỗi mới của B5.
5. Browser script sau mỗi `npm run build` có thể ghi nhận một `409` Inertia khi
   login/redirect do asset version đổi; client tự refresh và flow tiếp tục. Đây là
   noise môi trường cần tách khỏi lỗi nghiệp vụ.

## Gate cuối phiên

- `vendor/bin/pest`: **1195/1195**, **2780 assertions**.
- `npm test`: **403/403**; `npx tsc --noEmit`: pass.
- `vendor/bin/pint --test`: pass; `php artisan i18n:generate --check`: pass.
- `npm run build`: pass (dashboard + SDK).
- Fixture sau kiểm tra: conversation Yona display `4`, còn `5` tin; status/priority/
  assignee/team/snooze về rỗng; label probe và attachment probe đã dọn.
