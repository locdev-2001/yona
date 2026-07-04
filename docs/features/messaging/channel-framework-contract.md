# Channel Framework Contract — HỢP ĐỒNG ĐÓNG BĂNG (P11)

Module: messaging · Status: **FREEZE TẠM (mock-verified — đóng thật ở kênh thứ 2)** · Updated: 2026-07-04
Enforce: `tests/Feature/Framework/ChannelFrameworkContractTest.php` (8 test, 2 mock policy trái ngược)

## Mục tiêu (goal #4)
**Thêm kênh (Messenger/Zalo OA/TikTok/Shopee) = viết 1 driver + đăng ký. 0 dòng sửa core.**
Dev mới đọc file này là đủ viết driver — không hỏi thêm.

## Allowlist "CORE" — file KHÔNG ĐƯỢC SỬA khi thêm kênh
```
app/Modules/Integration/Contracts/*            (ChannelDriver, ChannelCapabilities)
app/Modules/Integration/ChannelManager.php
app/Services/InboundMessageService.php
app/Services/Inbox/*                           (OutboundSendPipeline, MessageStateService,
                                                MessageSourceResolver, SeenSyncService,
                                                SocialEventMaterializer, SessionGapMaterializer, ...)
app/Http/Controllers/Inbox/*
resources/js/components/inbox/*
```
CI/review check: PR "thêm kênh X" mà diff chạm file trong allowlist → REJECT (trừ khi đổi contract có RFC).
Grep gate (chạy trong contract test): **0** chỗ `if (channel === ...)` / `match(channel)` trong core — flags là data.

## Viết driver mới = implement `ChannelDriver`
| Method | Trách nhiệm | Lưu ý |
|---|---|---|
| `channelKey()` | định danh kênh | khớp `conversations.channel` |
| `capabilities()` | `ChannelCapabilities` flags (UI ẩn/hiện nút) | ADDITIVE — thêm flag mới không phá driver cũ |
| `parseInbound(array $raw): array` | raw webhook → normalized shape (xem PHPDoc contract) | **CHƯA freeze** — đóng ở kênh thật thứ 2 (MED-4/C6). Nhét raw platform subset vào `platform_meta` nếu kênh có quote/react |
| `sendMessage($conversation, $payload): Message` | **POLICY kênh** (cửa sổ giờ/cap/ToS — driver tự diễn giải, KHÔNG bộ field chung) + **TRANSPORT** + persist Message + bump `stream_version` | **CẤM metering trong driver** |
| `connect/disconnect` | auth kênh | tuỳ kênh |

Đăng ký: `ChannelManager::extend('kenh_moi', fn () => new KenhMoiDriver)` trong ServiceProvider CỦA MODULE KÊNH (file mới, ngoài allowlist).

## Money-path (BẤT BIẾN — nền monetization, pipeline enforce)
```
InboxController::send → OutboundSendPipeline::send(driver, conversation, payload)
  1. metering->assertCanSend   ← quota PER-CHANNEL, chặn TRƯỚC transport (conv mới + hết quota → throw)
  2. driver->sendMessage       ← policy kênh + transport + persist (driver-owned)
  3. metering->meterReply      ← đếm PER-CHANNEL, CHỈ sau transport thành công (reply-only)
```
- Hội thoại đếm **per-channel** (cùng người trên 2 kênh = 2 hội thoại) — contract test enforce.
- **Luôn nhận inbound** kể cả hết quota (F13/F20) — `InboundMessageService` không bao giờ gate.
- Circuit-breaker / echo-dedup / outbox retry / SendRateLimiter (NĐ91) = đặc thù kênh, SỐNG TRONG DRIVER.

## Capability ≠ Policy (MED-4)
- **Capability** = kênh làm được gì → UI flags (`ChannelCapabilities`).
- **Policy** = kênh cho phép gửi thế nào → HÀNH VI trong `sendMessage` (Zalo: 7h-22h + cap3 + reply-exempt 24h; OA sau: 48h session + template; Messenger: 24h + human-agent tag). Driver throw `SendException(message, error_code)` — controller map 422.

## Những gì core LO SẴN cho mọi kênh (đừng viết lại trong driver)
Account-keyed conversation (`channel_account_id`, `peer_uid`) · idempotency `source_id` + alias · message-state (recall set-once / receipts 1-1 / reactions monotonic) qua `MessageStateService` DTO trung tính · pending undo bounded · gap marker · stream hợp nhất + `stream_version` · CRM layer (assign/label/note/canned) · phone enrichment hook · RLS.

## Mock reference
`tests/Support/MockChannelDriverA.php` (tối giản nhất — không receipts/media) và `MockChannelDriverB.php` (receipts per_member + policy max-length) — copy làm skeleton.
