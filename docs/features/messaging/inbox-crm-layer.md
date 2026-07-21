# Inbox CRM Layer — Gán phụ trách · Label · Note · Canned replies

Module: messaging · Status: **LIVE (P01b+P07 — inbox-full-messaging-framework)** · Updated: 2026-07-04

## Purpose
4 tính năng vận hành inbox làm MỘT LẦN dùng cho MỌI kênh (Rule 16 — grep gate `zalo` = 0 hit trong code phase này). Tái dùng tối đa hạ tầng polymorphic sẵn có: **KHÔNG bảng label/note mới.**

## Kiến trúc (DRY — tái dùng)
```mermaid
flowchart LR
    C[(conversations)] -->|assigned_user_id FK users| A[PATCH /inbox/.../assign<br/>+ activity 'conversation.assigned']
    C -->|HasTags morph| T[(tags/taggables sẵn có)<br/>tags.sync endpoint sẵn có]
    C -->|HasNotes morph| N[(notes sẵn có)<br/>notes.store endpoint sẵn có]
    QR[(quick_replies MỚI<br/>RLS + coverage test)] --> P["Composer gõ '/' → search title<br/>chèn body, thay {ten_khach}"]
    PANEL[GET /inbox/.../panel] -->|assigned_user + tags + notes + members| FE[conversation-panel.tsx]
```
- **Filter list:** `?assigned=me|unassigned|{userId}` + `?tag={tagId}` (index).
- **Label thuần gắn-lọc** — KHÔNG side effect routing (bài học EasyChatGPT: đừng phát minh routing-label semantics).
- **Note** panel phải (nền vàng) — KHÔNG vào stream tin, KHÔNG gửi ra kênh (có test).
- **Gán:** chỉ member ACTIVE workspace; null = bỏ gán; mỗi lần gán ghi Activity.
- Quick replies: mọi member active CRUD (SME nhỏ — YAGNI permission riêng; RLS scope đủ).

## Files
- BE: `ConversationAssignController`, `ConversationPanelController`, `QuickReplyController`, `QuickReply` model, migrations `500007-500009`, `Conversation` (+HasTags/HasNotes/assignedUser), `InboxController` (filters)
- FE: `conversation-panel.tsx` (gán/label/note), `message-composer.tsx` (picker "/"), `pages/inbox/index.tsx` (filter chips)
- Tests: `tests/Feature/Inbox/CrmLayerTest.php` (5) + RLS coverage `quick_replies`
