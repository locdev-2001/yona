---
name: yona-sticker-pack
description: Tạo trọn một bộ sticker động (Lottie) đồng bộ một nhân vật cho kho sticker Yona qua MCP yona-stickers, từ ý tưởng nhân vật, thương hiệu shop hoặc chỉ một câu mô tả. Dùng khi người dùng muốn vẽ, thiết kế, tạo, sửa hay xuất bản bộ sticker cho hộp thư và widget Yona, cần sticker cảm xúc cho chat bán hàng, hoặc muốn một linh vật cho shop có đủ trạng thái chào, cảm ơn, đợi chút, chốt đơn.
---

# Tạo bộ sticker Yona

## Tổng quan

Skill này dẫn trợ lý AI tự viết một bộ sticker hoạt ảnh Lottie vector, tự xem ảnh để kiểm, rồi tải vào kho sticker Yona qua MCP `yona-stickers`. Kết quả là một bộ sticker cùng một nhân vật, cùng bảng màu và nét vẽ, dùng được ngay trong hộp thư và widget chat của shop.

Luôn làm việc qua tool MCP, không tự dựng tệp ngoài lề. Giới hạn kỹ thuật (kích thước tệp, khung, thời lượng, số lớp, số hình, những gì bị cấm, số sticker mỗi bộ, độ dài nhãn và từ khoá) nằm DUY NHẤT trong hướng dẫn viết Lottie mà máy chủ phát: phần instructions lúc kết nối và resource `lottie_authoring_guide` (`yona://stickers/lottie-guide`). Đọc nó trước khi viết sticker đầu tiên và coi đó là luật; skill này không nhắc lại con số.

## Đầu vào (đều tuỳ chọn)

| Đầu vào | Khi người dùng bỏ trống |
|---|---|
| Ý tưởng nhân vật hoặc thương hiệu shop | Hỏi một câu ngắn về shop bán gì; nếu vẫn không có thì chọn một linh vật thân thiện, dễ vẽ bằng hình khối (mèo, gấu, cún, quả bóng có mặt). |
| Tên bộ | Suy từ nhân vật và shop, ngắn, tiếng Việt, ví dụ "Mèo Mít chào khách". |
| Phong cách | `auto`: suy từ thương hiệu; không có gợi ý thì dùng `cute-flat`. |
| Số sticker | Dùng đúng bộ cảm xúc mặc định bên dưới; người dùng muốn ít hơn thì lấy theo thứ tự ưu tiên từ trên xuống. |

Chỉ hỏi lại khi thật sự không suy ra được; hỏi gộp một lần, không hỏi từng mục.

### Phong cách có sẵn

- `cute-flat`: khối tròn mập, màu phẳng, viền đậm cùng tông tối hơn màu nền, mắt chấm to.
- `minimal`: ít chi tiết, hai ba màu, không viền, chuyển động nhỏ và dứt khoát.
- `vibrant`: màu bão hoà, có vệt sáng đơn giản, chuyển động nảy nhiều.
- `brand`: lấy màu chủ đạo và tính cách từ thương hiệu người dùng đưa; không chép logo hay chữ.

## Checklist tiến độ cho người dùng

Hiện checklist này ngay khi bắt đầu, cập nhật sau mỗi bước, thay `<Tên>` bằng tên nhân vật:

```text
[ ] 1. Chuẩn bị <Tên>
[ ] 2. Phác dáng chính
[ ] 3. Tạo từng cảm xúc (0/N)
[ ] 4. Đóng gói & xuất bản
```

Ở bước 3 cập nhật số đếm sau mỗi sticker đã tải và ready. Không dán JSON Lottie dài vào câu trả lời cho người dùng.

## Bước 1: Chuẩn bị <Tên>

1. Gọi `list_sticker_packs` xem kho đang có gì và giới hạn của kho. Trùng tên bộ thì hỏi người dùng muốn thêm vào bộ cũ hay tạo bộ mới.
2. Chốt tên nhân vật, tên bộ, phong cách, danh sách cảm xúc.
3. Viết **khoá nhận diện** và giữ nó suốt phiên. Mọi sticker sau đều dùng lại đúng khoá này:
   - Bảng màu: 3 đến 5 màu, ghi rõ vai trò và giá trị RGBA dạng Lottie (0..1), ví dụ thân `[1,0.72,0.3,1]`, viền `[0.45,0.25,0.1,1]`, má `[1,0.55,0.55,1]`, mắt `[0.12,0.1,0.1,1]`.
   - Tỉ lệ: nhân vật cao khoảng 70% khung, tâm hơi dưới giữa khung; đầu so với thân; vị trí mắt, tai, tay.
   - Nét: độ dày viền (`st` `w`), bo góc, có hay không có viền.
   - Chi tiết nhận diện: một hai dấu hiệu luôn có mặt (khăn, nơ, vệt lông) để nhận ra nhân vật ở cỡ nhỏ.
4. Gọi `create_sticker_pack` với tên bộ (bộ mới luôn ở trạng thái chưa xuất bản). Ghi lại `id` của bộ.

## Bước 2: Phác dáng chính

Dựng **dáng chuẩn**: nhân vật đứng yên, thở nhẹ (co giãn vài phần trăm rồi về lại). Đây là bản gốc mọi cảm xúc sẽ sao ra.

1. Viết Lottie dáng chuẩn theo luật ở mục "Luật viết Lottie".
2. Gọi `preview_sticker` với `lottie_json`, nhìn ảnh trả về, chạy checklist QA.
3. Sửa tới khi đạt rồi giữ nguyên cấu trúc lớp và nhóm hình của dáng chuẩn làm khung sườn. Mỗi cảm xúc chỉ đổi biểu cảm (mắt, miệng, lông mày), tay và chuyển động; không vẽ lại thân từ đầu.
4. Dáng chuẩn có thể tải lên làm sticker "chào" hoặc "ok" nếu hợp, không bắt buộc.

## Bước 3: Tạo từng cảm xúc

Với mỗi cảm xúc trong danh sách:

1. Sao từ dáng chuẩn, thêm biểu cảm và chuyển động theo bảng dưới.
2. `preview_sticker` → nhìn ảnh → chạy checklist QA. Hỏng thì chỉ sửa đúng phần hỏng (một lớp, một keyframe, một màu), không viết lại cả sticker, rồi xem thử lại.
3. Đạt thì `upload_sticker` với `pack_id`, `lottie_json`, `label` và `keywords`.
4. Báo tiến độ trên checklist.

### Bộ cảm xúc mặc định cho chat bán hàng

Thứ tự là thứ tự ưu tiên. Từ khoá: máy chủ so khớp không dấu, nên mỗi ý chỉ cần một dạng; ghi dạng có dấu cho dễ đọc, thêm biến thể khách hay gõ tắt.

| # | Cảm xúc | Chuyển động | label gợi ý | keywords gợi ý |
|---|---|---|---|---|
| 1 | Chào | Vẫy tay hai nhịp, người nghiêng nhẹ theo tay, mắt cười | `<Tên> chào bạn` | `chào`, `xin chào`, `hello`, `hi` |
| 2 | Cảm ơn | Cúi đầu nhẹ, hai tay chắp hoặc ôm tim nhỏ, bật lên lại | `<Tên> cảm ơn` | `cảm ơn`, `thanks`, `tks`, `cám ơn` |
| 3 | Ok, đồng ý | Gật đầu hai lần, tay giơ ngón cái hoặc dấu tích bật ra | `<Tên> ok nha` | `ok`, `oke`, `đồng ý`, `được` |
| 4 | Đợi chút | Tay giơ lên ra hiệu chờ, ba chấm tròn nhấp nháy lần lượt | `<Tên> đợi xíu` | `đợi chút`, `chờ xíu`, `wait`, `đợi` |
| 5 | Yêu thích | Tim bật ra từ ngực, nảy lên rồi thu về, má ửng | `<Tên> thương quá` | `yêu`, `thích`, `love`, `thương` |
| 6 | Vui cười | Người nảy lên xuống, mắt cong, miệng mở cười | `<Tên> vui quá` | `haha`, `vui`, `cười`, `hihi` |
| 7 | Ngạc nhiên | Giật nhẹ ra sau, mắt tròn to, dấu chấm than hình khối bật ra | `<Tên> bất ngờ` | `wow`, `ngạc nhiên`, `thật hả`, `bất ngờ` |
| 8 | Xin lỗi | Cúi đầu, tay gãi đầu, giọt mồ hôi trượt xuống | `<Tên> xin lỗi` | `xin lỗi`, `sorry`, `lỗi`, `thông cảm` |
| 9 | Buồn | Vai sụp, mắt cụp, giọt nước mắt nhỏ rơi rồi biến mất | `<Tên> buồn` | `buồn`, `huhu`, `tiếc`, `sad` |
| 10 | Chốt đơn / đã nhận | Hộp quà hoặc túi hàng bật ra, dấu tích xanh hiện, nhân vật giơ tay mừng | `<Tên> chốt đơn` | `chốt đơn`, `đã nhận`, `lên đơn`, `ok đơn` |

Chữ như "OK", "cảm ơn" không được vẽ bằng lớp chữ; nếu muốn, vẽ thành hình vector đơn giản, và ưu tiên diễn đạt bằng động tác thay vì chữ.

## Luật viết Lottie

Giới hạn và danh sách cấm nằm trong hướng dẫn máy chủ phát; ngoài ra luôn theo các luật sau để sticker đẹp và qua kiểm ngay lần đầu:

- Chỉ dùng lớp hình vector (`ty` 4). Không lớp chữ, không expression, không ảnh bitmap, không asset ngoài.
- Khung vuông, bằng kích thước khung tối đa trong hướng dẫn. Tốc độ 30 khung/giây, dài khoảng 2 giây và không vượt trần thời lượng của hướng dẫn.
- Vòng lặp khép kín: mọi thuộc tính động có keyframe cuối trùng giá trị keyframe đầu, để lặp không giật.
- Mọi hình nằm trong vùng an toàn, cách mép khung ít nhất 8% kể cả ở biên độ chuyển động lớn nhất; không để tay hay tim bị cắt mép.
- Nhận ra được ở cỡ ảnh tĩnh gửi sang kênh chat ngoài (con số nằm trong hướng dẫn Lottie, rất nhỏ): nét dày, hình khối to, ít chi tiết nhỏ, tương phản rõ giữa thân, viền và nền, biểu cảm nằm ở mắt và miệng to.
- Dùng ít lớp, gom hình vào nhóm (`gr`) có `tr`; ưu tiên `el`, `rc`, `sh` đơn giản. Easing mềm (`i`/`o` khoảng 0.4 đến 0.6).
- Nền trong suốt, không lớp nền đặc.
- Giữ đúng khoá nhận diện: cùng giá trị màu, cùng độ dày viền, cùng tỉ lệ ở mọi sticker.

## Checklist QA trên ảnh xem thử

Chạy trên ảnh `preview_sticker` trả về, trước mỗi lần tải:

1. Ảnh có nhân vật, không trống, không đen, không vỡ hình.
2. Nhận ra đúng nhân vật so với dáng chuẩn: màu, tỉ lệ, chi tiết nhận diện không lệch.
3. Hình dung thu nhỏ về cỡ ảnh tĩnh gửi kênh chat ngoài: vẫn nhận ra nhân vật và cảm xúc; nét mảnh hay chi tiết li ti biến mất thì làm dày, làm to hoặc bỏ đi.
4. Không phần nào bị cắt ở mép khung.
5. Không chữ, không hình lạ thừa, không lỗi thứ tự lớp (tay nằm sau thân khi không định thế).
6. Phần chữ kèm ảnh báo kích thước, số khung, thời lượng khớp luật ở trên.
7. Bị từ chối: đọc câu lỗi, nó nói rõ giới hạn nào; sửa đúng chỗ đó.

## Bước 4: Đóng gói & xuất bản

1. Gọi `get_sticker_pack` với `pack_id`. Sticker còn `processing` thì đợi vài giây rồi gọi lại.
2. Sticker `failed`: đọc `failure_message`, sửa đúng phần hỏng, `preview_sticker` lại, rồi `upload_sticker` bản mới và `delete_sticker` bản hỏng.
3. Cần sửa nhãn hay từ khoá thì dùng `update_sticker`, không tải lại.
4. Khi mọi sticker `ready`, tóm tắt cho người dùng và **hỏi trước khi xuất bản**. Chỉ khi người dùng đồng ý mới gọi `set_sticker_pack_published` với `published: true`.

## Báo cáo cuối

Gửi người dùng một báo cáo ngắn:

- Tên bộ, mã bộ, nhân vật, phong cách, khoá nhận diện (bảng màu, nét).
- Danh sách sticker: label, từ khoá, trạng thái.
- Sticker nào phải sửa và đã sửa gì.
- Trạng thái xuất bản; chưa xuất bản thì nói cách bật lại (`set_sticker_pack_published`).
