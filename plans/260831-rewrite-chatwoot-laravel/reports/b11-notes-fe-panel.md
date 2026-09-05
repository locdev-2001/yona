# B11 — note FE panel contact (agent `b11-fe-panel`)

Điền thân 6 accordion còn rỗng của `ContactPanel` (B3 mới dựng vỏ) + nối nút Merge
vào endpoint thật. Vùng sửa: `conversationbox/ContactPanel.tsx`,
`conversationbox/contact/**`, `conversation/panelApi.ts`,
`components-next/{SharedAttachments,avatar/ThumbnailGroup}` (file mới).

## Bảng trace Vue ↔ React

| Chatwoot v4.17.1 | Yona | Ghi chú |
|---|---|---|
| `conversation/ContactPanel.vue` | `conversationbox/ContactPanel.tsx` | 6 accordion có thân; Macros vẫn rỗng (D3); linear/shopify bỏ; kéo thả bỏ |
| `conversation/ConversationInfo.vue` | `contact/ConversationInfo.tsx` + `contact/conversationInfoAttributes.ts` | phần thuần (6 thuộc tính tĩnh, lọc rỗng) tách ra để test |
| `conversation/customAttributes/CustomAttributes.vue` | `contact/CustomAttributes.tsx` | thứ tự lưu ui_settings + nút Show all/less; thân từng thuộc tính chờ E1 |
| store `attributes` (`GET /custom_attribute_definitions`) | `contact/customAttributeDefinitions.ts` | trả `[]` — **cửa duy nhất**, E1 xong chỉ đổi tệp này |
| `conversation/ContactDetailsItem.vue` | `contact/ContactDetailsItem.tsx` (đã có từ B3) | dùng lại nguyên |
| `conversation/contact/ContactNotes.vue` | `contact/ContactNotes.tsx` | **chỉ đường đọc** — xem "Nợ" #1 |
| `next/Contacts/ContactsSidebar/components/ContactNoteItem.vue` | `contact/ContactNoteItem.tsx` | gập 4 dòng, xóa, `dynamicTime`, DOMPurify + MessageFormatter |
| `conversation/SharedFiles.vue` | `contact/SharedFiles.tsx` + `contact/sharedAttachments.ts` | spinner → câu rỗng → Media+Files; GalleryView dùng lại của B9 |
| `components-next/SharedAttachments/Media.vue` | `components-next/SharedAttachments/Media.tsx` | lưới 3 cột, ô "+N", thumb lỗi → ảnh đầy → icon, thời lượng, tải |
| `components-next/SharedAttachments/Files.vue` | `components-next/SharedAttachments/Files.tsx` | FileIcon + kích thước + thời điểm + tải |
| `conversation/ContactConversations.vue` | `contact/ContactConversations.tsx` + `contact/previousConversations.ts` | ConversationCard `compact hideThumbnail`; menu chuột phải chưa port |
| `conversation/ConversationParticipant.vue` | `contact/ConversationParticipant.tsx` + `contact/participantSelection.ts` | store `conversationWatchers` → state cục bộ + `panelApi` |
| `components/widgets/ThumbnailGroup.vue` | `components-next/avatar/ThumbnailGroup.tsx` | đặt cạnh Avatar vì `components/widgets/` ngoài vùng sửa B11 |
| `api/inbox/conversation.js` (participants, attachments) + `api/contactNotes.js` + `api/contacts.js#getConversations` + `api/accountActions.js#merge` | `conversation/panelApi.ts` | một mặt tiền cho cả panel |
| `modules/contact/ContactMergeModal.vue` (`contacts/merge`) | `contact/ContactMergeModal.tsx` | `POST /actions/contact_merge` thật, `isLoading` khi đang gộp |
| `ContactPanel.vue#getContactDetails` | `contact/useContactDetails.ts` | nạp một lần cho cả panel (ContactInfo nhận qua prop thay vì tự gọi) |

## Khác biệt cố ý

1. **Kéo thả sắp xếp** (`vuedraggable`) bỏ ở cả ContactPanel và CustomAttributes —
   như quyết định B3. Class `drag-handle` / `cursor-grab` vẫn giữ để markup trùng.
2. **Thuộc tính tùy biến** (`CustomAttribute.vue`) chưa render: chưa có bảng định
   nghĩa (E1). Danh sách định nghĩa rỗng ⇒ Contact Attributes hiện đúng câu
   "No attributes found" và Conversation Information hiện đúng khối trống của oracle.
3. **Menu chuột phải trong Previous Conversations** (`open-new-tab` / `copy-link`)
   chưa port: `ConversationContextMenu` của yona mới có nhánh đã đọc/chưa đọc (B8)
   và nằm ngoài vùng sửa của agent này.
4. **Tooltip avatar** trong ThumbnailGroup (v-tooltip) chưa port — `Avatar` của yona
   chưa nhận `title`. Nút ⚙ dùng `title` như quy ước tooltip hiện hành của yona.
5. **SCSS scoped** `.no-label-message` (ContactConversations) trải thẳng thành
   `text-n-slate-11 mb-4`.
6. `NON_FILE_TYPES` và `formatDuration` đặt tạm trong `contact/sharedAttachments.ts`
   vì `components-next/message/constants.ts` (B9) và `shared/helpers/timeHelper.ts`
   ngoài vùng sửa — nợ dời về đúng chỗ.

## Nợ (chờ backend / nhóm sau)

1. **Nút "Add contact note" + modal soạn note** — backend chưa có model `Note`
   (b11-be ghi rõ: `merge_contact_notes` bỏ vì chưa có model). Theo lệnh "không
   dựng nút giả", `ContactNotes.tsx` chỉ port đường đọc: gọi
   `GET /contacts/{id}/notes`, hỏng thì hiện đúng câu rỗng của oracle.
   **Đây là chênh lệch pixel duy nhất còn lại** (xem bảng đo). Khi có endpoint:
   thêm lại khối `<div class="px-4 pt-3 pb-2">` + NextButton + modal (Editor) và
   `createContactNote` / `deleteContactNote` đã sẵn trong `panelApi.ts`.
2. **`GET /conversations/{id}/attachments`** chưa có → `SharedFiles` quay về đính
   kèm của các tin đã nạp trong khung chat (`attachmentsFromMessages`), nên chỉ phủ
   phần lịch sử đang mở. Có endpoint là tự dùng, không phải sửa component.
3. **`GET /contacts/{id}/conversations`** chưa có → Previous Conversations luôn
   rỗng. Cùng cơ chế: có endpoint là chạy.
4. Ba endpoint trên trả 404 ⇒ console e2e có 3 dòng `404` mỗi lần mở panel.
5. **`custom_attribute_definitions`** (E1) — mục 2 phần Khác biệt.
6. **Realtime `contact.merged`**: sau khi gộp, panel đã đổi sang contact base
   (đúng `SET_CONTACT_ITEM` của gốc) nhưng danh sách hội thoại chỉ theo kịp khi có
   handler realtime cho sự kiện b11-be vừa thêm.

## Đo đạc

Harness mới: `~/www/pixel-diff/b11-panel-diff.mjs` (mở panel → mở đúng MỘT accordion
→ chụp → đóng; chấm **chỉ cột panel 320px bên phải**, `CROP` trong tệp),
`b11-panel-buttons.mjs` (audit nút trong thân accordion hai bên),
`b11-participants-e2e.mjs`, `b11-merge-e2e.mjs`, `b11-oracle-probe.mjs` (dump HTML
từng thân accordion để so markup).

Pixel-diff từng accordion (light + dark, sau `reset-fixture.sh`, participants hai
bên = [John]):

| Accordion | light | dark |
|---|---|---|
| Conversation Information | **0.000%** | **0.000%** |
| Contact Attributes | **0.000%** | **0.000%** |
| Contact Notes | 2.226% ✗ | 2.293% ✗ |
| Attachments | **0.000%** | **0.000%** |
| Previous Conversations | **0.000%** | **0.000%** |
| Conversation participants | **0.000%** | **0.000%** |

Chênh của Contact Notes = đúng hàng nút "+ Add contact note" (dòng 580→844 trong
ảnh cắt) và phần đẩy xuống theo — nợ #1.

Audit nút thân accordion (`b11-panel-buttons.mjs`):
- yona: ⚙ Select participants → OK (dropdown hiện), "Join conversation" → OK.
- oracle: "Add contact note" → OK (yona thiếu, nợ #1); ⚙ báo DEAD là hạn chế của
  harness (dropdown Vue luôn nằm sẵn trong DOM + `v-on-clickaway` đóng ngay khi
  click tổng hợp), không phải khác biệt hành vi.

E2E trình duyệt (yona):
- Participants: mở dropdown → bỏ chọn agent → "Join conversation" → "You are
  participating"; F5 vẫn giữ (PATCH participants ghi thật).
- Merge: tạo contact tạm `B11 Merge Base`/`B11 Merge Mergee` + hội thoại tạm
  (display 16) → panel → nút Merge → tìm → chọn → "Merge contacts" → DB: mergee bị
  xóa, hội thoại chuyển sang base. Đã dọn sạch dữ liệu tạm sau khi đo.

Gate: `npx tsc --noEmit` sạch · `npm run build` xanh · `npm test` 237/237 (thêm 29
case cho 4 module thuần: gom tệp theo loại, rút gọn hội thoại trước đó, tính
participant còn lại, dựng thuộc tính Conversation Information).

## Cảnh báo môi trường đo

Trong phiên này `b11-be` và `b11-fe-mentions` chạy song song và **cùng ghi vào
fixture đo**: thêm/bớt participant ở cả oracle (conversation 1) lẫn yona
(conversation 4), và chèn tin nhắn mới vào conversation 4. Hai lần đo đầu bị nhiễu
(3–7% lệch, toàn bộ do dữ liệu). Cách chốt: (1) chấm **chỉ cột panel bên phải**,
khung chat không tham gia; (2) đồng bộ participant hai bên ngay trước khi chụp.
Trước gate cuối cần đồng bộ lại participant hai bên rồi chạy lại
`b11-panel-diff.mjs`. Sau khi đo đã chạy `reset-fixture.sh`: `ui_settings` của John
hai bên về đúng 7 khóa chuẩn (mọi cờ `is_*_open`, `conversation_elements_order_*`,
`show_all_attributes_*` đã sạch).
