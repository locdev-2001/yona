# Lô 4 — SỰ KIỆN & TRẠNG THÁI TIN + hành động trên kênh (07/09/2026)

Agent `zalo-lo4-finish`, tiếp nối `zalo-lo4-events` (bị treo ở bước "thêm `capabilities` vào prop
Inertia `inboxes`"). Không commit, không `git add`. DB test riêng `yona_rw_test_lo4b` (đã `dropdb`).
Bridge :3710 KHÔNG gọi, KHÔNG restart.

## 1. Trạng thái tiếp nhận và phần tôi làm thêm

Phần lớn lô 4 đã xong trong worktree bàn giao. Tôi rà `git diff` toàn bộ rồi bổ sung 6 chỗ:

| # | Việc | Trạng thái nhận | Tôi làm gì |
|---|---|---|---|
| 1 | Prop Inertia `inboxes` có `capabilities` | ĐÃ CÓ trong `SetCurrentAccount.php` | thêm **test khoá** hai mặt tiền không lệch nhau |
| 2 | `ZaloOutboundActions` gửi `thread_type` | **CHƯA** (nợ lô 1b) | thêm `Zalo::threadTypeOf(Conversation)` + gửi trên cả 3 route + 2 test |
| 3 | `MessageMeta` gate theo capability | ĐÃ CÓ nhưng **test đỏ** | sửa quy tắc lùi bậc trạng thái (dưới) |
| 4 | Bundle i18n | **lệch** `lang/` | `php artisan i18n:generate` |
| 5 | Hai bảng emoji↔mã (PHP ↔ bridge) | không có chốt chặn | thêm test soi gương hai bảng |
| 6 | `docs/channel-capabilities.md` §4.1 | còn ghi Zalo "chưa có route ghi" | cập nhật 5 dòng nợ đã đóng |

### 1.1 `thread_type` — nợ lô 1b, mục 2 (sửa)

`reports/zalo-lo1b-notes.md` §"Việc cho phiên/lô khác" mục 1: zca gọi **endpoint khác hẳn** cho nhóm
(`group/reaction`, `group/undomsg`, `group/typing`). Thiếu trường này thì mọi thao tác trong nhóm đi
sai chỗ mà bridge vẫn trả `ok`.

`Zalo::threadType(Message)` đã có nhưng chỉ nhận `Message`; ba hành động của lô 4 chỉ có
`Conversation` trong tay. Đã tách như `threadIdOf` đã tách trước đó:

```php
public function threadType(Message $message): int { return $this->threadTypeOf($message->conversation); }
public function threadTypeOf(Conversation $conversation): int
{ return (int) ($conversation->additional_attributes['thread_type'] ?? 0); }
```

Cả `reaction` / `undo` / `typing` trong `ZaloOutboundActions` giờ mang `thread_type`. Gửi **tường
minh cả giá trị 0** thay vì dựa vào mặc định của bridge — mặc định là hành vi của bên kia, đổi lúc
nào không ai biết.

### 1.2 `MessageMeta` — quy tắc lùi bậc (sửa code, giữ test)

Bản nhận về trả tick "đã gửi" chỉ khi `status === sent`, nên case *kênh chỉ khai `event_delivered`
mà tin mang status `read`* rơi về đồng hồ xoay và test của chính lô 4 đỏ. Quy tắc đã chốt:

> Không bao giờ hiện dấu mà kênh **không chứng thực được**. Trạng thái cao hơn mức kênh khai lùi về
> **một tick** ("đã rời khỏi Yona" — điều duy nhất Yona tự biết chắc). Kênh không khai biên nhận nào
> thì luôn là đồng hồ xoay, đúng như trước khi chuyển sang gate theo năng lực.

Chọn lùi về `sent` chứ không lùi về `delivered`: status `read` trên kênh không khai `event_seen` là
dữ liệu **không có nguồn chứng thực**, tin nó một nửa (hiện hai tick xám) cũng là claim sai.

## 2. Hợp đồng cho lô 5 (UI)

### 2.1 Ba endpoint mới (`routes/web_api.php`, prefix `/api/v1/accounts/{account}`)

| Hành động | Route | Body | 200 | 422 |
|---|---|---|---|---|
| Thả biểu cảm | `POST /conversations/{cid}/messages/{mid}/reactions` | `{emoji: "👍"}` | `MessageResource` (đã có `content_attributes.reactions`) | `{error, code}` |
| Gỡ biểu cảm | `DELETE /conversations/{cid}/messages/{mid}/reactions` | — | như trên | như trên |
| Xoá / thu hồi tin | `DELETE /conversations/{cid}/messages/{mid}` | — | `MessageResource` đã `deleted` | `{error, code}` |
| Agent đang gõ | `POST /conversations/{cid}/toggle_typing_status` (**route cũ**) | `{typing_status: 'on'\|'off', is_private?}` | 200 no content | — |

`{cid}` là `display_id` của hội thoại (như mọi route messages sẵn có), `{mid}` là `messages.id`.

**`toggle_typing_status` không đổi contract** — FE không phải sửa gì. Lõi tự đẩy tiếp ra kênh khi
inbox khai `outbound_typing`; `is_private` (ghi chú riêng tư) và `typing_status: off` **không** đẩy
ra kênh. Driver tự chặn nhịp 5s nên FE cứ bắn theo nhịp gõ như cũ.

### 2.2 Mã lỗi 422 (`code` trong body)

Bốn mã đầu là mã **nguyên văn của bridge** (`reports/zalo-lo1b-notes.md` §4), phần còn lại sinh ở
driver Laravel. `error` đã là câu tiếng Việt theo `locale` của account (`lang/{en,vi}/errors.php` →
`errors.zalo.action.*`) — FE **hiện thẳng**, đừng dịch lại.

| `code` | Nghĩa | FE nên làm |
|---|---|---|
| `session_lost` | phiên Zalo đã mất | hiện lỗi + gợi ý banner kết nối lại |
| `zalo_rejected` | Zalo nhận rồi từ chối (tin quá cũ, đã thu hồi…) | hiện lỗi, **không** retry tự động |
| `bad_request` | Zalo không còn nhận ra tin này | hiện lỗi |
| `unknown` | lỗi lạ (đã log ở bridge) | hiện lỗi + cho thử lại |
| `bridge_unreachable` | không gọi được bridge | cho thử lại |
| `secret_mismatch` | sai cấu hình send secret (bridge trả 403/503) | hiện lỗi, thử lại vô ích |
| `missing_source_id` | tin chưa sang tới Zalo | ẩn/mờ nút thay vì để bấm |
| `emoji_not_supported` | Zalo không có emoji này | giới hạn bộ chọn emoji theo bảng dưới |
| `capability_not_supported` | kênh không khai năng lực (trả qua `abort_unless`, `error` là chuỗi này) | **không được xảy ra** — gate ở FE trước |
| `emoji_required` | POST reactions thiếu `emoji` | lỗi lập trình |

### 2.3 Gate ở FE

Đọc `inbox.capabilities` (đã có ở **cả hai** mặt tiền: `InboxResource` và prop Inertia `inboxes`),
qua `useInboxCapabilities` / `inboxSupports` — **cấm** `channel_type === 'Channel::Zalo'`:

- nút thả biểu cảm → `outbound_reaction`
- mục "Thu hồi" trong context menu → `outbound_recall`; kênh không khai vẫn có "Xoá" (một chiều,
  đúng bản gốc — endpoint `DELETE` là **một**, lõi tự quyết theo năng lực)
- đẩy typing ra kênh → `outbound_typing` (đã gate ở BE, FE không phải làm gì)
- bong bóng "đang nhập…" của khách → `event_typing`
- dấu tick → `event_delivered` / `event_seen` (`MessageMeta` đã làm, dùng làm mẫu)

### 2.4 Hình dạng `content_attributes.reactions`

```json
"reactions": [
  { "emoji": "👍", "by": "agent:12", "at": 1757203200 },
  { "emoji": "❤️", "by": "9876543210", "at": 1757203260 }
]
```

- `by`: `agent:<user_id>` khi agent Yona thả, `agent:self` khi chính tài khoản Zalo của tenant thả
  (dội về qua `selfListen`), `external_id` của khách với mọi trường hợp còn lại, `unknown` cho bản
  ghi cũ (mảng emoji phẳng — `Message::reactionList()` nâng cấp ngay lúc đọc, **không** migration).
- **Một người giữ đúng một emoji**: thả cái mới thay cái cũ của chính người đó; A gỡ không đụng của B.
- Mọi biểu cảm phía tenant dùng chung một ô `agent` — nếu không, agent bấm trong Yona rồi Zalo dội
  lại sẽ hiện thành hai người thả.
- FE gom theo `emoji` + đếm; `at` là unix giây.

### 2.5 Bộ emoji hợp lệ

`app/Services/Zalo/ReactionIcons.php` (54 mã → 48 emoji, soi gương với `services/zalo-bridge/src/reaction-icons.mjs`
— đã có test khoá hai bảng bằng nhau). Emoji ngoài bảng → 422 `emoji_not_supported`. Đề xuất lô 5:
bộ chọn nhanh 6 emoji đầu (❤️ 👍 😆 😮 😢 😡) đúng như Zalo, "thêm" mở bảng đầy đủ.

## 3. Kiểm chứng

| Gate | Kết quả |
|---|---|
| `DB_DATABASE=yona_rw_test_lo4b php artisan test tests/Feature/Channels tests/Contracts tests/Feature/Services` | **368 pass**, 1015 assertions |
| `… tests/Feature/WebApi tests/Feature/Models tests/Feature/Jobs` (hồi quy `markDeleted`, typing, routes) | **1026 pass**, 2391 assertions |
| `vendor/bin/pint --test` | passed |
| `npx tsc --noEmit` | 0 lỗi |
| `npx vitest run resources/js/dashboard/components-next/message` | 7 file / 61 test pass |
| `flock /tmp/yona-build.lock npm run build` | ✓ 3060 modules + ✓ 17 modules |
| `php artisan i18n:generate --check` | "Bundle i18n khớp lang/" |

Test mới tôi thêm (5):

- `ZaloActionsTest` — `mọi lời gọi bridge mang thread_type của luồng — nhóm ra 1, chat 1-1 ra 0`
  (một hội thoại `thread_type: 1`, ba lời gọi reaction/typing/undo, khẳng định `['reaction'=>1,
  'typing'=>1, 'undo'=>1]`).
- `ZaloActionsTest` — `chat 1-1 vẫn gửi thread_type 0 tường minh, không bỏ trống`.
- `ZaloActionsTest` — `bảng cảm xúc của driver PHP và của bridge là một` (parse cả hai file bằng
  cùng một regex rồi so map; đóng concern #3 của lô 1b).
- `CapabilityDeclarationTest` — `prop Inertia inboxes lộ đúng bộ năng lực mà InboxResource lộ`.
- `MessageMeta.test.tsx` — case `kênh chỉ khai event_delivered` giờ xanh sau khi sửa quy tắc lùi bậc.

Kiểm cơ học theo yêu cầu: `grep -rn zalo_source_ids app/ tests/ resources/ services/` = **0**
(chỉ còn trong `plans/**/reports/*.md` là ghi chép lịch sử của lô 2/lô 3, không phải mã).

## 4. Chưa làm (nợ có tên)

1. **4.4 — `requestOldReactions` khi backfill.** Cảm xúc thả lúc bridge chết vẫn mất vĩnh viễn. Phải
   sửa ở `services/zalo-bridge` (lô 1), ngoài phạm vi.
2. **4.6 — `deleteMsg` trong undo chưa diễn giải.** Audit ghi confidence 0.35 và yêu cầu **đo trước
   khi sửa** — đúng chỉ dẫn, KHÔNG sửa. Cách đo: bật `ZALO_BRIDGE_LOG_QUOTE=1` một lát, trên điện
   thoại chọn "Xoá chỉ ở phía tôi" một tin, xem frame `chat.undo` có `content.deleteMsg` khác giá
   trị của "Thu hồi" hay không; khác thì bỏ nhánh đó ở `RelayEventParser::recallSourceId`.
3. **Q3 tin nhóm / Q7 lời mời kết bạn** — bridge đã phát `thread`/`sender`/`mentions` và
   `friend_request` (lô 1b) nhưng driver Laravel **chưa đọc**; `group_threads`/`friend_request`
   **cố ý không khai** trong `Channel\Zalo::capabilities()`.
4. **`outbound_edit`, `outbound_location`, `outbound_contact_card`, `outbound_mention`,
   `outbound_read_receipt`, `session_disconnect`** — không có đường thực thi, không khai.
5. **Nghiệm thu trình duyệt chưa làm** — cần founder restart bridge :3710 trước (mọi thay đổi lô 1b
   chưa có hiệu lực), rồi bấm thật: thả/gỡ biểu cảm, thu hồi tin có ảnh, gõ ở hai đầu.

## 5. Ngoài phạm vi — báo, không tự sửa

1. **`resources/js/i18n/generated/{en,vi}.ts` tôi đã regenerate.** Bundle đang lệch `lang/` vì **cả
   hai** phía: khoá `errors.zalo.action.*` của tôi **và** khoá `contact_panel` / `MESSAGE_FAILURE` /
   `MESSAGE_SENDER` của agent `zalo-lo5-ui`. Đây là artifact sinh ra, không sửa tay được, và
   `--check` không cho lọc theo agent — nên diff bundle có cả khoá của lô 5. Không mất gì của họ.
2. **`resources/js/dashboard/components-next/message/MessageError.test.tsx` (file mới của lô 5) từng
   làm `tsc` đỏ** vì `@testing-library/user-event` chưa có trong `node_modules`/`package.json`. Lúc
   chạy gate cuối thì `tsc` đã sạch — họ đã xử lý. Ghi lại để không lẫn lộn nếu tái diễn.
3. **`ContactInfo.tsx` (lô 5) từng có 2 lỗi TS2783 `'key' is specified more than once`** (dòng 210,
   235) ở lần đo đầu; lần đo cuối đã hết.
4. **`app/Services/MessageTemplates/Template/BaseTemplate.php` đang `M` trong worktree** — không
   phải của tôi, không đụng.
5. **Đề xuất dài hạn (lô sau):** `messages.content_attributes` là cột `json` chứ không phải `jsonb`
   nên `jsonb_exists(... 'external_source_ids', ?)` không đặt index được (đã ghi ở lô 2). Đổi cột
   sang `jsonb` + GIN là việc một migration, càng để lâu bảng càng to.

## 6. Dọn dẹp

- `dropdb yona_rw_test_lo4b` — xong.
- Không commit, không `git add`, không `stash`, không `checkout` file của ai.
- Không gọi bridge :3710, không đụng oracle :3000, không đụng account 2, không đụng inbox 58/59 hay
  hội thoại 132 của account 3.
- Không sửa file trong `resources/js/dashboard/{conversation,components-next/Conversation}/**` và
  `components-next/message/**` (trừ `MessageMeta.tsx` + `MessageMeta.test.tsx` được giao).

```
Status: DONE_WITH_CONCERNS
Summary: Hoàn tất lô 4 — bổ sung `thread_type` cho cả 3 route bridge (nợ lô 1b, thiếu là thao tác trong nhóm đi sai endpoint Zalo), sửa quy tắc lùi bậc tick của MessageMeta cho test xanh, khoá hai mặt tiền `capabilities` (InboxResource ↔ prop Inertia) và hai bảng emoji (PHP ↔ bridge) bằng test, regenerate bundle i18n, cập nhật docs §4.1. Toàn bộ gate xanh: 368 + 1026 Pest, pint, tsc 0 lỗi, 61 vitest, build 2 environment, i18n --check.
Concerns/Blockers:
  1. Chưa nghiệm thu trình duyệt — phải chờ founder restart bridge :3710 (thay đổi lô 1b chưa có hiệu lực); reaction/recall/typing mới chỉ chứng minh bằng Http::fake theo hợp đồng lô 1b, chưa chạm Zalo thật.
  2. Bundle i18n tôi regenerate mang theo cả khoá của agent `zalo-lo5-ui` (contact_panel, MESSAGE_FAILURE) — không tránh được vì đây là artifact sinh từ toàn bộ `lang/`.
  3. 4.4 (`requestOldReactions` khi backfill) và Q3/Q7 (driver Laravel chưa đọc `thread`/`sender`/`friend_request` bridge đã phát) vẫn mở; 4.6 cố ý không sửa, đã ghi cách đo.
```
