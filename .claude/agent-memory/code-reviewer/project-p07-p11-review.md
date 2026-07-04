---
name: p07-p11-review
description: Review 5 commit P07/P08/P09/P06b/P10/P11 (freeze khung omnichannel) — PASS voi concerns MED ve contract doc/parseInbound shape
metadata:
  type: project
---

Review 04/07 (commits 797fcc1..d810ac4, branch feat/inbox-full-messaging): P11 money-path hoist DUNG (pipeline = assertCanSend TRUOC driver, meterReply SAU; ZaloSendService sach metering; InboxController::send caller duy nhat; 0 bypass jobs/console). Contract test 8 cai cham metering THAT (marketplace_items fixture qua pgsql_privileged).

**Why:** gate chien luoc goal #4 — freeze TAM, dong that o kenh thu 2.

**How to apply:** khi review kenh thu 2 (Messenger), kiem lai cac MED treo:
- ChannelDriver::parseInbound PHPDoc shape STALE (thieu channel/channel_account_id/platform_meta; peer_avatar_url vs peer_avatar) — InboundMessageService:100 fallback `?? 'zalo_personal'` se mis-attribute channel neu driver quen key `channel` (metering sai kenh, im lang). Fix de xuat: bo fallback, throw.
- Grep gate hep hon doc allowlist: khong quet Controllers/Inbox + pages/inbox; regex miss `!==`/ternary/`??` default.
- Seam Zalo trong dir frozen: MessageInteractionController (react/sticker), ConversationPhoneController, InboxController::resync, connection-banner.tsx route zalo, SeenSyncService pluck `platform_meta.zca_message`.
- Contract test chua assert transport-fail → KHONG meter (mock_b throw case khong check ChannelUsage).
- Paste anh trong composer khong guard canSendMedia (LOW UX).
P07 label = TagService.sync thuan gan-loc ✓; note qua notes.store polymorphic ✓; P08 dedup_key unique partial (workspace_id,dedup_key) ✓; P09 relay_events sach (model xoa, log redacted + rate-limit 1/phut + flood alert 11) ✓; P10 boot-guard production-only, guard nuot Throwable khi DB chua san sang (chap nhan) ✓; P06b enabled() check truoc moi thu, chi 1-1 ✓.
