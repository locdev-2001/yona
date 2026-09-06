# Đua echo ↔ ghi `external_source_ids` (07/09/2026)

Agent `zalo-echo-race-fix`. Một lỗi duy nhất: tin nhiều phần gửi từ Yona → bridge dội phần 2 về TRƯỚC
khi driver ghi xong bí danh → `findByAliasSourceId` trượt → dựng bong bóng ma (bằng chứng
`g1-inbound-evidence.md` §7, tin 883/884). Không commit, không `git add`, không gọi bridge :3710.

## File đã sửa / thêm

| File | Việc |
|---|---|
| `app/Services/Zalo/SendOnZaloService.php` | ghi bí danh ngay sau MỖI phần (1) + gộp tin ma sau khi gửi xong (3) |
| `app/Services/Zalo/IncomingMessageService.php` | echo chưa khớp bí danh ⇒ ném `EchoAwaitingSourceIdException` thay vì dựng tin (2) |
| `app/Services/Zalo/Exception/EchoAwaitingSourceIdException.php` | **mới** — tín hiệu "chưa chốt được, nhường một nhịp" |
| `app/Jobs/Webhooks/ZaloEventsJob.php` | ngân sách hoãn: `release(3s)` tối đa 2 lượt, hết lượt thì dựng tin (2) |
| `app/Services/Zalo/MessageStateService.php` | `findMessage()` tra tiếp bí danh khi trượt `source_id` (4) |
| `tests/Feature/Channels/ZaloEchoRaceTest.php` | **mới** — 6 case khoá (file riêng để không đụng test của agent song song) |

## Đã làm

| # | Việc | Cách sửa | Test khoá |
|---|---|---|---|
| 1 | Bí danh ghi **ngay sau mỗi phần** | `sendEveryPart()` gọi `rememberSourceIds($outcome['source_ids'])` trong vòng lặp, trước lượt gửi kế; bỏ lần ghi gộp cuối vòng. `rememberSourceIds()` vốn đã append + `update()` nên không phải sửa gì thêm | `ghi bí danh ngay sau mỗi phần chứ không đợi hết vòng gửi` (chụp trạng thái DB tại từng lượt gọi bridge: `[] → ['msg-1'] → ['msg-1','msg-2']`) |
| 2 | Echo chưa khớp thì hoãn, không dựng ngay | `guardEchoStillSettling()`: `direction !== 'in'`, có `source_id`, không phải `backfill`, chưa mang cờ `ECHO_WAIT_EXHAUSTED` ⇒ ném ngoại lệ. `ZaloEventsJob` bắt, `release(3)` khi `attempts() <= 2`; hết lượt thì gọi lại service kèm cờ ⇒ tin echo thật từ điện thoại vẫn được dựng | `hoãn echo của phần sau thay vì dựng tin ma khi bí danh chưa kịp ghi`, `vẫn dựng tin echo thật từ điện thoại sau khi hết lượt chờ`, `không bắt lô tin lịch sử chờ: backfill dựng tin ngay lượt đầu` |
| 3 | Chốt sau gửi: gộp tin ma | `absorbEchoDuplicates()` cuối `sendEveryPart()` (chạy cả khi một phần hỏng): tìm tin cùng inbox, khác khoá chính, `source_id` nằm trong mọi msgId vừa gửi → chuyển biểu cảm qua `Message::setReaction()`, chỉ dời đính kèm khi tin gốc chưa có tệp nào, rồi `delete()`. Rỗng thì là một truy vấn không kết quả ⇒ idempotent | `gộp tin ma trùng source_id vào tin gốc sau khi gửi xong` (khẳng định cả việc tệp của tin gốc KHÔNG bị hook `deleting` cuốn theo) |
| 4 | Thu hồi/biểu cảm theo bí danh | `MessageStateService::findMessage()` trượt `source_id` thì tra `jsonb_exists(... 'external_source_ids', ?)` — trước đó **chưa có**, nên thu hồi trỏ vào msgId phần 2 không áp được lên tin gốc | `thu hồi theo msgId của phần thứ hai vẫn áp lên tin gốc` |

### Hai quyết định cần biết
- **Ngân sách hoãn nằm ở lớp hàng đợi, không ở driver.** Driver chỉ nói "chưa chốt được"; `ZaloEventsJob`
  giữ `ECHO_RETRY_DELAY_SECONDS = 3`, `ECHO_MAX_RETRIES = 2` và `public int $tries = 3` — thiếu `$tries`
  thì worker mặc định (`--tries=1`) đánh job hoãn thành `MaxAttemptsExceededException` ngay lượt hai.
- **Chỉ hàng đợi THẬT mới có "lượt sau".** `canDeferAgain()` loại `SyncJob` và trường hợp `job === null`
  (harness hợp đồng, lane đồng bộ, lời gọi `handle()` trực tiếp) — ở đó `release()` là đánh rơi sự kiện,
  nên xử lý ngay với cờ đã-chờ-đủ. Nhờ vậy mọi test echo sẵn có (đi qua `sync`) không đổi hành vi.

### Kiểm chứng test có "cắn" thật (5 phép đảo, khôi phục ngay sau mỗi lần đo)
| Đảo về bản cũ | Đỏ |
|---|---|
| `rememberSourceIds` quay lại ghi một lần cuối vòng | `ghi bí danh ngay sau mỗi phần…` |
| bỏ `guardEchoStillSettling()` | `hoãn echo của phần sau…`, `vẫn dựng tin echo thật…` |
| bỏ nhánh bí danh trong `MessageStateService::findMessage()` | `thu hồi theo msgId của phần thứ hai…` |
| bỏ `absorbEchoDuplicates()` | `gộp tin ma trùng source_id…` |

## Trace gốc ↔ port
Chatwoot gốc không có kênh nào cắt một tin thành nhiều lượt gửi nên **không có đối chiếu Ruby** cho
phần này; hợp đồng dùng lại là `external_source_ids` của lô 2/lô 3 (`Message#source_id` +
`find_message_by_source_id` của WhatsApp là đường gốc, phần bí danh là mở rộng của driver Zalo).
Hoãn-rồi-thử-lại đi bằng `release()` — idiom Laravel của `retry_job` trong ActiveJob.

## Gate

| Gate | Kết quả |
|---|---|
| `DB_DATABASE=yona_rw_test_echo php artisan test tests/Feature/Channels/ZaloEchoRaceTest.php` | **6 passed / 21 assertions** |
| `… tests/Feature/Channels tests/Contracts` | **231 passed / 861 assertions** |
| `… tests/Feature/Services tests/Feature/Jobs tests/Feature/Models` | **608 passed** |
| `vendor/bin/pint --test` (4 file sửa + 2 file mới) | passed |

DB riêng `yona_rw_test_echo` đã `dropdb`. Không đụng `yona_rw`, không commit.

## Ngoài phạm vi — báo, không tự sửa
1. **`MessageStateService::applyReceipts()` vẫn chỉ tra `source_id`**: biên nhận `seen`/`delivered` trỏ
   vào msgId của phần thứ hai KHÔNG nâng tick của tin gốc. Cùng gốc lỗi nhưng là truy vấn hàng loạt
   (`whereIn`), gắn `jsonb_exists` vào đó phải đổi hình dạng truy vấn — để lô sau quyết.
2. **Chi phí độ trễ**: echo thật do chủ shop gửi từ điện thoại giờ mất ~6 giây mới hiện trong Yona (2
   lượt hoãn). Đúng chỉ dẫn của `g1-inbound-evidence.md` §7 và an toàn hơn bong bóng ma, nhưng nếu
   founder thấy chậm thì cách siết là chỉ hoãn khi inbox CÓ tin ra đang gửi dở trong ~2 phút.
3. **`content_attributes` vẫn là cột `json`** nên `jsonb_exists` không có index đỡ (lô 2 và lô 4 đã ghi).
   Nay có thêm một chỗ đọc (`MessageStateService`) — đổi cột sang `jsonb` + GIN càng đáng làm.
4. **Worktree đang có agent khác sửa** `app/Models/Attachment.php`, `app/Services/Channels/RemoteAttachmentDownloader.php`,
   `app/Support/AvatarContentType.php`, `tests/Feature/Channels/ZaloChannelTest.php` — không đụng.

```
Status: DONE
Summary: Cuộc đua echo ↔ ghi bí danh đã đóng tận gốc ở cả bốn điểm: ghi `external_source_ids` ngay sau mỗi phần gửi, hoãn echo chưa khớp 3s × 2 lượt qua hàng đợi rồi mới dựng tin, gộp tin ma trùng source_id vào tin gốc sau khi gửi xong (idempotent), và cho thu hồi/biểu cảm tra theo bí danh. 6 case khoá mới đã kiểm chứng cắn thật; 845 test Pest liên quan + pint xanh.
Concerns/Blockers: `applyReceipts` (tick delivered/seen) vẫn chưa tra bí danh — cùng gốc lỗi, nằm ở truy vấn hàng loạt, để lô sau; echo thật từ điện thoại chậm thêm ~6 giây là cái giá cố ý của ngân sách hoãn.
```
