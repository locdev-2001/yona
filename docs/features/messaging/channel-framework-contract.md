# Channel Framework Contract — HỢP ĐỒNG ĐÓNG BĂNG (P11)

Module: messaging · Status: **FREEZE TẠM (mock-verified — đóng thật ở kênh thứ 2)** · Updated: 2026-07-26
Enforce: `tests/Feature/Framework/ChannelFrameworkContractTest.php` (8 test, 2 mock policy trái ngược)

## Mục tiêu (goal #4)
**Thêm kênh (Messenger/Zalo OA/TikTok/Shopee) = viết 1 driver + đăng ký. 0 dòng sửa core.**
Dev mới đọc file này là đủ viết driver — không hỏi thêm.

## Allowlist "CORE" — file KHÔNG ĐƯỢC SỬA khi thêm kênh
```
app/Modules/Chat/Broadcast/*                   (BroadcastService)
app/Modules/Chat/Delivery/*                    (DeliveryPipeline, ComposeMessageService,
                                                InteractionPipeline, SeenSyncService)
app/Modules/Chat/Intake/*                      (IntakeService, DuplicateResolver, InboundEvent)
app/Modules/Chat/Port/*                        (ChannelDriver, ChannelCapabilities,
                                                ChannelRegistry, AbstractChannelDriver)
app/Modules/Chat/Port/Capability/*             (Supports*)
app/Modules/Chat/Status/*                      (MessageStatusService)
app/Modules/Chat/Store/*                       (GapMarkerService, SystemLineService,
                                                PhoneEnrichmentService, DedupConversation)
app/Modules/Chat/Timeline/*                    (TimelineCursor, MessageItemSerializer)
app/Http/Controllers/Chat/*
resources/js/components/inbox/*
resources/js/pages/inbox/*
```
Danh sách này khớp 1-1 với `$patterns` trong contract test — sửa một bên phải sửa bên kia.
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

Diện tương tác tuỳ chọn: implement thêm interface trong `app/Modules/Chat/Port/Capability/` (`SupportsReactions`, `SupportsStickers`, `SupportsSeenReceipts`, `SupportsPhoneVerification`, `SupportsHistoryResync`). Lõi lọc qua `ChannelRegistry::supporting()` — kênh không làm được thì KHÔNG implement, lõi tự bỏ qua.

Đăng ký: `ChannelRegistry::extend('kenh_moi', fn () => new KenhMoiDriver)` trong ServiceProvider CỦA MODULE KÊNH (file mới, ngoài allowlist), khai thẳng vào `bootstrap/providers.php` — mẫu: `app/Modules/Chat/Adapter/Widget/WidgetServiceProvider.php`.

## Money-path (BẤT BIẾN — nền monetization, pipeline enforce)
```
InboxController::send → ComposeMessageService::compose → DeliveryPipeline::send(driver, conversation, outbound)
  1. driver->sendMessage       ← policy kênh + transport + persist (driver-owned)
  2. metering->meterReply      ← đếm PER-CHANNEL, CHỈ sau transport thành công (reply-only, không chặn gửi)
```
- Hội thoại đếm **per-channel** (cùng người trên 2 kênh = 2 hội thoại) — contract test enforce.
- **Luôn nhận inbound** (F13/F20) — `IntakeService` không bao giờ gate (không còn quota gate từ 25/07).
- Circuit-breaker / echo-dedup / outbox retry / SendRateLimiter (NĐ91) = đặc thù kênh, SỐNG TRONG DRIVER.

## Capability ≠ Policy (MED-4)
- **Capability** = kênh làm được gì → UI flags (`ChannelCapabilities`).
- **Policy** = kênh cho phép gửi thế nào → HÀNH VI trong `sendMessage` (Zalo: 7h-22h + cap3 + reply-exempt 24h; OA sau: 48h session + template; Messenger: 24h + human-agent tag). Driver throw `SendException(message, error_code)` — controller map 422.

## Những gì core LO SẴN cho mọi kênh (đừng viết lại trong driver)
Account-keyed conversation (`channel_account_id`, `peer_uid`) · idempotency `source_id` + alias · message-state (recall set-once / receipts 1-1 / reactions monotonic) qua `MessageStatusService` DTO trung tính · pending undo bounded · gap marker · stream hợp nhất + `stream_version` · CRM layer (assign/label/note/canned) · phone enrichment hook · RLS.

## Seam CHƯA trung tính (biết trước — đóng ở kênh thật thứ 2, đừng hỏi lại)
Freeze này là **TẠM** (mock-verified). Các chỗ sau còn Zalo-cứng NGOÀI đường send/ingest chính — kênh 2 có tính năng tương ứng sẽ phải trung tính hoá (được phép sửa, có RFC 1 dòng trong PR):
| Seam | File | Hướng trung tính hoá |
|---|---|---|
| Banner kết nối | `resources/js/components/inbox/connection-banner.tsx` (hardcode `route('integrations.zalo.index')`) | route từ capability/props |
| Permission | `tenant.zalo.manage` (`TenantPermission::ZaloManage`) gate reaction/resync/seen-sync | permission per-channel hoặc generic `tenant.channel.manage` |
| Usage badge cột trái | `resources/js/pages/inbox/index.tsx` (hardcode `quota.conversations.zalo_personal`) | badge render per-channel từ `channelAccounts` + `entitlements.usage` (thông tin, không chặn) |

Đã trung tính hoá qua `Port\Capability\*` — không còn Zalo-cứng, đừng sửa lại: reaction/sticker (`InteractionPipeline` + `SupportsReactions`/`SupportsStickers`), verify SĐT (`SupportsPhoneVerification`), resync lịch sử (`ChannelRegistry::supporting(SupportsHistoryResync::class)`), seen-sync (`SupportsSeenReceipts` — driver tự bóc metadata nền tảng).

## Mock reference
`tests/Support/MockChannelDriverA.php` (tối giản nhất — không receipts/media) và `MockChannelDriverB.php` (receipts per_member + policy max-length) — copy làm skeleton.
