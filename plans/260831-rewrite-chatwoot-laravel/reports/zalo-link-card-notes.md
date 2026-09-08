# Thẻ liên kết Zalo bị đọc nhầm thành danh thiếp (08/09/2026)

Agent `zalo-link-card-fix`, nhánh `main`. Không commit.

## Lỗi

Zalo dùng CHUNG `msgType: chat.recommended` cho danh thiếp người và thẻ liên kết
chia sẻ; thứ tách hai loại là `content.action`. Bridge gom hết vào
`parseBusinessCardFields` ⇒ mọi link khách gửi ra `inbound_kind: business_card`,
URL thô leo lên làm tên người.

Bằng chứng đo trên `yona_rw` (đọc read-only, tin 951 / hội thoại 138 / account 3):

| Tin | `content.action` | `title` | Trước khi sửa |
|---|---|---|---|
| 951 (link ảnh QR SePay) | `recommened.link` | `null` | `[Danh thiếp]` + `business_card.name` = URL |
| 949, 857 (danh thiếp người) | `recommened.user` | tên người | đúng |

`params.src` của tin 951 = `qr.sepay.vn`, `params.linkType = 5` — Zalo tự bóc sẵn
tên miền nguồn. (Zalo viết thiếu chữ `d`: `recommened`, đúng nguyên văn.)

## Sửa

### 1. Bridge — `services/zalo-bridge/src/`

| Hàm | File | Việc |
|---|---|---|
| `recommendedCardKind(content)` | `inbound-content.mjs` | đọc `content.action` → `contact_card` \| `link` \| `null`; nhận cả `recommened.*` và `recommended.*` |
| `inboundCardKind(content, card)` | `inbound-content.mjs` | chỗ DUY NHẤT quyết định. Action là bằng chứng mạnh nhất; tin không khai action thì xét dấu hiệu định danh người (`phone` / `contact_uid` / `qr_code_url` / URL `zaloapp.com`\|`zalo.me`) — không có ⇒ liên kết |
| `buildLinkPreview(url, content)` | `inbound-content.mjs` | chỗ DUY NHẤT dựng `link_preview {url,title,description,image,source}`; `source` = `content.params.src` |
| `parseInboundLinkPreview` | `inbound-content.mjs` | đổi `thumb` → `image`, thêm `source` (dùng lại `buildLinkPreview`) |
| nhánh `chat.link`/`chat.recommended` | `index.mjs` | sau khi bóc card: `shouldDropZaloLinkBanner` giữ nguyên, rồi rẽ theo `inboundCardKind`; nhánh link trả descriptor NGAY (không thả xuống nhánh text — tin 951 có `title` null nên `extractInboundPlainText` trả null và tin sẽ bị bỏ mất) |
| `applyInboundDescriptorToPayload` | `inbound-content.mjs` | `payload.link` → `payload.link_preview` (cả hai lane live + backfill dùng chung hàm này) |

`parseBusinessCardFields`, `shouldDropZaloLinkBanner`, `tryZaloContactCardFromLinkPlain`
giữ nguyên hành vi: banner CDN `*.zadn.vn` không tiêu đề vẫn bị bỏ trước khi rẽ nhánh,
và link hồ sơ `zaloapp.com`/`zalo.me` vẫn ra danh thiếp (dùng lại đúng dấu hiệu
`tryZaloContactCardFromLinkPlain` đã dùng).

> **BRIDGE CHƯA KHỞI ĐỘNG LẠI — phiên chính làm.** Bridge thật :8612 đang giữ phiên
> Zalo của founder nên agent không restart, không gọi ngoài đọc. Sửa chỉ có hiệu lực
> sau restart. Trong lúc chờ, driver vẫn đọc được khoá `link` + `thumb` cũ (có test khoá).

### 2. Driver Laravel

- `app/Services/Zalo/InboundCardParser.php`: thêm kind `link_preview` —
  `linkPreview()` chuẩn hoá `link_preview` (hoặc khoá cũ `link`, `thumb`→`image`),
  chỉ nhận URL `http(s)`. `label()` đổi từ `if ($kind === 'reminder')` sang bảng
  `LABEL_FROM_DATA` (nhắc hẹn → `title`; liên kết → `title` rồi `url`) — thêm loại
  thẻ tự mang chữ là thêm một dòng bảng.
- `app/Services/Zalo/IncomingMessageService.php`: bỏ `LINK_KIND` + `linkAttachment()`.
  **Lệch có chủ đích với đường cũ:** link không còn ra đính kèm `fallback`. §2.1 nói
  `content` + `content_attributes.link_preview`; giữ cả hai là hai nguồn cho cùng một
  thứ (`fallback_title` vs `link_preview.title`) và sẽ lệch nhau. `content` giữ chú
  thích khách gõ kèm (`inbound_caption`), trống thì lấy tiêu đề, thiếu nữa thì URL.
- `lang/{vi,en}/conversations.php`: `messages.link` = `[Liên kết]` / `[Link]` (nhãn
  dự phòng khi thẻ không có cả tiêu đề lẫn URL).
- **Năng lực `inbound_link_preview` đã được khai sẵn** trong `Channel\Zalo::capabilities()`
  và đã có trong `capability-matrix.snapshot.json` — kiểm cơ học, KHÔNG phải sửa gì.
- Fixture vàng `tests/Fixtures/channels/zalo/real/link_card.json` (payload tin 951,
  URL/uid/tên thay bằng giá trị giả, host `qr.thanhtoan.test`) + khai hình dạng trong
  `ZaloFixtureShapeTest` (khoá cả `listener_data.content.action` để lần sau không ai
  bỏ mất bằng chứng phân loại).

### 3. FE

- `resources/js/dashboard/components-next/message/bubbles/LinkPreview.tsx` (mới).
  Kiểm trước: `bubbles/` chưa có bong bóng link nào (chỉ `Fallback.tsx` vẽ đính kèm
  fallback) nên không tạo trùng. Bong bóng đọc khoá TRUNG TÍNH
  `content_attributes.link_preview`, không biết kênh — kênh khác chuẩn hoá vào khoá đó
  là dùng lại được. Ảnh xem trước + tiêu đề + mô tả + tên miền + URL rút gọn, cả thẻ
  là `<a target="_blank" rel="noopener noreferrer nofollow">`.
- `Message.tsx`: thêm `link_preview` vào `CHANNEL_CARD_BUBBLES` (rẽ theo KHOÁ, không
  theo kênh — đúng §3).
- `lang/{vi,en}/conversation.php`: `LINK_PREVIEW.FALLBACK_TITLE`.
- Preview thẻ hội thoại tự đúng: `MessagePreview` đọc thẳng `content`, mà `content`
  giờ là tiêu đề/URL chứ không còn `[Danh thiếp]` (có case trong `it.each`).

### 4. Docs

`docs/zalo-bridge/webhook-contract.md` (bảng `inbound_kind` + ghi chú cách tách
`chat.recommended`), `docs/channel-capabilities.md` §2.1 (thêm `source` vào
`link_preview`, nói rõ `content` là gì).

## Backfill tin 951 trên `yona_rw`

Chạy bằng CHÍNH parser vừa viết (bridge JS bóc payload → `InboundCardParser` dựng
`content`/`content_attributes`), không gõ tay giá trị nào:

```bash
psql -h 127.0.0.1 -U postgres -d yona_rw -At \
  -c "select content_attributes->'zca_message'->'content' from messages where id=951;" > /tmp/951.json

node --input-type=module -e "
import fs from 'node:fs';
import { parseInboundLinkPreview } from './services/zalo-bridge/src/inbound-content.mjs';
const c = JSON.parse(fs.readFileSync('/tmp/951.json','utf8'));
fs.writeFileSync('/tmp/preview951.json', JSON.stringify(parseInboundLinkPreview(c, 'chat.recommended')));
"

php artisan tinker --execute="
\$message = App\Models\Message::findOrFail(951);
\$preview = json_decode(file_get_contents('/tmp/preview951.json'), true);
\$card = App\Services\Zalo\InboundCardParser::parse(['link_preview' => \$preview]);
\$attributes = \$message->content_attributes;
unset(\$attributes['business_card']);
\$attributes['link_preview'] = \$card['data'];
\$message->forceFill([
    'content' => App\Services\Zalo\InboundCardParser::label(\$card['kind'], \$card['data'], 'vi'),
    'content_attributes' => \$attributes,
])->saveQuietly();
"
```

Kết quả đọc lại (chỉ tin 951, 857/949 không đụng):

```
content            = https://qr.sepay.vn/img?bank=Vietcombank&acc=104869642387&template=compact&amount=&des=
business_card      = (đã bỏ)
link_preview       = {"url":"https://qr.sepay.vn/img?…","image":"https://photo-link-talk.zadn.vn/photolinkv2/720/…","source":"qr.sepay.vn"}
```

## Gate

| Gate | Lệnh | Kết quả |
|---|---|---|
| Pest | `DB_DATABASE=yona_rw_test_linkcard php artisan test --compact tests/Feature/Channels tests/Contracts` | 257 pass / 1562 assertions |
| Bridge | `node --test services/zalo-bridge/src/*.test.mjs` | 135 pass (trước: 131) |
| vitest | `npx vitest run` | 109 file / 852 test pass |
| tsc | `npx tsc --noEmit` | sạch |
| pint | `vendor/bin/pint --test` | passed |
| build | `flock /tmp/yona-build.lock npm run build` | ✓ |
| i18n | `php artisan i18n:generate --check` | Bundle i18n khớp `lang/` |

DB test `yona_rw_test_linkcard` đã `dropdb` sau khi chạy. `yona_rw` chỉ đụng đúng
`messages.id = 951`.

## Việc còn lại cho phiên chính

1. **Khởi động lại zalo bridge :8612** — không có bước này thì tin link mới vẫn về
   dạng `business_card` (driver đã sửa nhưng payload chưa đổi).
2. Sau restart: nhờ khách/tài khoản test gửi một link bất kỳ + một danh thiếp, kiểm
   trên UI hai bong bóng ra đúng loại.

Status: DONE
Summary: Tách danh thiếp và thẻ liên kết Zalo theo `content.action` ở bridge, driver đưa link vào `content_attributes.link_preview` theo §2.1, thêm bong bóng xem trước liên kết trung tính kênh, backfill tin 951; toàn bộ gate xanh.
Concerns/Blockers: Bridge :8612 CHƯA khởi động lại (cấm tự restart) nên bản sửa phía bridge chưa có hiệu lực; link không còn sinh đính kèm `fallback` — lệch có chủ đích với đường cũ, đã ghi rõ ở mục 2.
