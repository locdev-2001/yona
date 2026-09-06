# Webhook Contract — Zalo Personal Bridge → Laravel

## Endpoint

```
POST /webhooks/zalo
Header: X-Zalo-Personal-Bridge-Secret: <ZALO_BRIDGE_WEBHOOK_SECRET>
Content-Type: application/json
```

## Event Types

### 1. `inbound` — Tin nhắn từ Zalo

```json
{
  "type": "inbound",
  "connection_id": 1,
  "bot_id": 1,
  "personal_uid": "1234567890",
  "peer_uid": "9876543210",
  "thread_id": "9876543210",
  "thread_type": 0,
  "source_id": "msgId_from_zalo",
  "is_self": false,
  "direction": "in",
  "user": { "name": "Nguyễn Văn A", "avatar": "https://..." },
  "platform_sent_at": 1719500000000,
  "inbound_kind": "text",
  "content": "Xin chào",
  "msg_type": "chat.text"
}
```

**direction field (F14)**:
- `"in"` = contact gửi đến (không meter)
- `"out"` = tenant gửi từ phone cá nhân (meter)
- `"echo"` = bridge dội lại tin CRM vừa gửi (không meter — tránh double-count)
- Thiếu field → fail-safe `"in"`

**inbound_kind values**: text | image | gif | video | audio | file | sticker | business_card | call

### 2. `bridge_session` — Trạng thái kết nối

```json
{
  "type": "bridge_session",
  "connection_id": 1,
  "bot_id": 1,
  "state": "session_ok",
  "detail": null
}
```

**state values**:
- `"session_ok"` → model state: `connected`
- `"session_lost"` → model state: `session_lost` (+ detail = lý do)

### 3. `social_event` — Group/friend events (no-op D-1)

```json
{
  "type": "social_event",
  "social_kind": "group_event",
  "connection_id": 1,
  "bot_id": 1,
  "personal_uid": "...",
  "act": "...",
  "thread_id": "...",
  "event": {}
}
```

## Định tuyến sự kiện (nhánh `rewrite/chatwoot-laravel`)

Bản rewrite phân tách dữ liệu theo `account_id` như Chatwoot, KHÔNG dùng RLS nên
không còn bước bind TenantScope:

```
1. Kiểm secret trên header (VerifyZaloBridgeSecret)
2. connection_id > 0? không thì 400
3. Đẩy payload vào hàng đợi (ZaloEventsJob) và trả 200 ngay
4. Job: Channel\Zalo::find(connection_id) → inbox → xử lý theo `type`
   (kênh không tồn tại hoặc account ngưng hoạt động → bỏ qua êm)
```

## Response Codes

| Code | Meaning |
|------|---------|
| 200  | Đã nhận (xử lý bất đồng bộ trong hàng đợi) |
| 400  | missing connection_id |
| 401  | secret không khớp / chưa cấu hình |
