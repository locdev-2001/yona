# Yona

## ▶ BẮT ĐẦU Ở ĐÂY — khi được bảo "tiếp tục rewrite"

1. Đọc **`plans/260831-rewrite-chatwoot-laravel/HANDOFF.md`** — tài liệu tự chứa: môi trường, chuẩn nghiệm thu 5 cửa, kiến trúc đã dựng, bẫy đã trả giá, việc tiếp theo.
2. Đọc mục **Trạng thái** ở đầu `plans/260831-rewrite-chatwoot-laravel/plan.md` để biết đang đứng ở tính năng nào.
3. Mở mục tương ứng trong `plans/260831-rewrite-chatwoot-laravel/feature-roadmap.md`, và đọc `reports/trace-*.md` của các tính năng liên quan (nhất là phần "bẫy đã trả giá").
4. `cd ~/www/yona && make up` rồi làm tiếp đúng tính năng kế tiếp.

**Vị trí lúc bàn giao (06/09/2026): 24/40** — nhóm A 6/6, B 11/11, C 5/5, D 2/6. Commit `e61761b`. Backend 1186 test xanh, giao diện 404 test xanh.
**Việc kế tiếp: D1 Automation rules → D3 Macros (dùng chung bộ thực thi hành động) → D2 Reports → D4 Webhooks + Agent Bots.**

Trang tiến độ dạng xem được: `plans/260831-rewrite-chatwoot-laravel/progress.html` (mở bằng trình duyệt; bản trực tuyến ở link artifact bên dưới chỉ founder mở được).

---


> ## ⚠️ NHÁNH `rewrite/chatwoot-laravel` — ĐỌC TRƯỚC MỌI THỨ KHÁC
> **Lệnh founder 31/08/2026:** viết lại 100% Chatwoot v4.17.1 (`refs/chatwoot`, TRỪ `enterprise/` — cấm mở) sang Laravel + Inertia/React, UI giống 100% Chatwoot. Fresh start — mô tả sản phẩm/kiến trúc cũ bên dưới KHÔNG áp dụng trên nhánh này (chỉ còn đúng trên `main` tới khi swap). Zalo cá nhân + automation trích từ main cắm lại SAU (nhóm G).
> - **Nguồn chuẩn duy nhất:** `plans/260831-rewrite-chatwoot-laravel/` — `plan.md` (13 quyết định kiến trúc + Giao thức kiểm chứng 6 điểm + Trạng thái hiện tại) và `feature-roadmap.md` (40 tính năng A→G, thứ tự thi công).
> - **Cách giao hàng:** port TỪNG TÍNH NĂNG — đủ migration → backend → UI, xong là test được ngay trên UI. Không big-bang.
> - **DoD mỗi tính năng:** Pest port từ RSpec xanh + bảng trace Ruby↔PHP + pixel-diff đạt + founder bấm kịch bản "Test ngay". Thiếu 1 = chưa done.
> - **Artifact tiến độ (cập nhật khi xong mỗi tính năng):** https://claude.ai/code/artifact/d740e226-5b81-4f5c-8910-12ecf84a999c
> - DB dev nhánh này = `yona_rw` (main vẫn dùng `yona`, không đụng). Chỉ 1 phiên code trên nhánh tại một thời điểm.
> - Bắt đầu phiên: đọc mục **Trạng thái** trong `plan.md` để biết đang ở tính năng nào, làm tiếp đúng mục đó.

**Codename / repo:** yona (github.com/locflamedia/yona)
**Tên sản phẩm:** Yona — domain **yona.vn** (rebrand 22/07/2026; tên cũ "Chó rách CRM" / repo cho-rach-management)
**Định vị:** **Conversational CRM & Automation** (chốt 22/07/2026) — CRM lấy hội thoại làm cửa vào: gom tin nhắn khách từ mọi kênh chat về một inbox (Zalo trước, thêm kênh = thêm driver), biến hội thoại thành khách hàng, tự động hóa chăm sóc. Nội dung định vị/marketing KHÔNG giới hạn theo kênh cụ thể — hướng đa kênh tương lai
**Status:** Đang phát triển, bootstrapped, team 3 dev

## Là gì
SaaS B2B: CRM + quản lý dự án (kiểu Perfex), nhắm SME Việt đang quản khách bằng **Zalo + Excel**.
Khác biệt cốt lõi: **inbox đa kênh** (Zalo, Messenger, TikTok) đưa hội thoại về → chuyển thành Lead/Client.

## Đối tượng
SME Việt Nam, mảng kinh doanh online — kể cả hộ kinh doanh, nhà phân phối nhỏ, kinh doanh phi chính thức. Không giới hạn ở agency dịch vụ.

## Mô hình kinh doanh
SaaS freemium: free core → add-on trả phí. Tính phí theo **conversation metering** (đếm per-channel).
**Trạng thái 25/07/2026:** CHƯA áp hạn mức — dùng không giới hạn, chỉ thống kê. Số liệu tích lũy để xây chính sách gói cước sau; áp hạn mức ngay từ đầu gây phản ứng ngược.
Gói: Free / Team / Business. Thanh toán: VNPay / MoMo.

## Tech Stack
- Backend: PHP / Laravel
- Frontend: Inertia + React (TypeScript), Tailwind + Radix — KHÔNG phải Vue/Next.js
- DB: PostgreSQL + Row-Level Security (multi-tenant isolation)
- Auth/Perm: RBAC

## Kiến trúc trọng tâm
**Quy ước kiến trúc xuyên suốt: `docs/code-standards.md` §0 — ĐỌC TRƯỚC KHI VIẾT CODE.** Tóm tắt: module chia theo **chức năng** (không có module "Integration" gom đồ bên ngoài); `app/Http/` + `app/Models/` ở gốc, module chỉ chứa nghiệp vụ; ba mặt tiền route `web.php` / `web_api.php` / `api.php` cùng gọi một lõi — mọi tính năng phải mở ra API được mà không viết lại; UI gom theo chức năng.

**CDP làm trục trung tâm** — mọi nguồn (inbox, import, tích hợp) đổ vào; mọi hành động (automation, báo cáo) đọc ra.
**Addons/Entitlements framework** = nền monetization, dựng ngay Phase 1.

## 4 quy tắc xuyên suốt
1. **Chống trùng:** gộp 1 người từ nhiều nguồn thành 1 hồ sơ — khóa chính = số điện thoại.
2. **Phân biệt rõ:** người lạ = "Liên hệ nháp"; chỉ thành "Lead" khi xác nhận có nhu cầu.
3. **Ghi nguồn:** mỗi khách lưu rõ đến từ kênh nào.
4. **Tôn trọng luật & nền tảng:** chỉ gửi 7h–22h, ≤3 tin QC/số/ngày, luôn có opt-out, chỉ chủ động gửi khi còn trong cửa sổ cho phép của kênh.

## Roadmap
- **Phase 0 (đã có):** multi-tenant, RBAC, Client/Contact/Lead/Pipeline, Projects/Milestones/Tasks/Timers, custom fields, audit log, attachments, notes, reminders, email templates, notifications, admin area, support login-as, product announcements board.
- **Phase 1 (ra mắt + thu tiền + cửa vào Zalo):** import Excel/CSV (map cột, loại trùng); **Inbox Zalo CÁ NHÂN** (1 màn hình chat, bộ lọc riêng tư trước khi vào hệ thống) — KHÔNG dùng Zalo OA ở giai đoạn này; hội thoại → Liên hệ nháp → Lead; gói cước + VNPay/MoMo + Entitlements; onboarding. *Xong khi: ≥10 khách trả phí, inbox Zalo ổn định, người mới tự kết nối được.*

  > **Quyết định Zalo (26/06):** Phase 1 tích hợp **Zalo cá nhân**, không phải Zalo OA. Lý do: OA phức tạp và **chưa có tài khoản test**. Lưu ý kỹ thuật: Zalo cá nhân **không có API chính thức** — phải dùng giải pháp không chính thức (QR login / web automation / thư viện reverse-engineer như zca-js). Rủi ro: vi phạm ToS, nguy cơ khóa tài khoản, API có thể đổi bất ngờ. Cần đánh giá rủi ro này trong brief. OA để dành cho giai đoạn sau khi có tài khoản test.
- **Phase 2 (khác biệt + giữ chân):** thêm Inbox Messenger, rồi TikTok.
- **Phase 3:** quản lý hợp đồng (contract management).
- **Phase 4:** automation theo trigger (đổi stage, phát hiện keyword, hợp đồng sắp hết hạn); chatbot auto-reply trong inbox; CDP Layer 2 (cá nhân hóa hành vi); kênh gửi Email + SMS + reply-via-same-channel.
- **Phase 5:** marketplace addon mở cho bên thứ ba.

## Quyết định đã chốt (không làm sai lại)
- Hội thoại đếm **per-channel**, không gộp theo người CDP. Cùng người trên Zalo + Mess = 2 hội thoại.
- Bộ đếm chỉ tính khi **tenant trả lời**, không tính inbound.
- **Không chặn gì cả** (chốt 25/07/2026): gate hạn mức đã gỡ khỏi code, bộ đếm giữ nguyên. Gate chỉ dựng lại khi mở gói thu phí.
- **Luôn nhận inbound** — bảo toàn lead capture.
- **Không** xây module e-commerce (order/inventory/shipping). KiotViet/Sapo = nguồn làm giàu CDP.

## Ghi chú công cụ
- Figma FigJam board (file key YAvnMFXP9hAHb2CSaLy7sB) — board trên Figma vẫn mang tên cũ "Chó rách CRM". Lưu ý: mỗi lần tạo diagram là một node mới — cần xóa bản cũ thủ công.



# Memory

## Me
Technical founder & kỹ sư phần mềm. Nền tảng: PHP/Laravel, Vue/Next.js. GitHub: **locflamedia**. Đang dẫn dắt team 3 dev (bootstrapped, tự lực) xây SaaS CRM cho SME Việt. Hiện tự chạy phần lớn việc và là người định hướng sản phẩm.

## Terms
| Term | Meaning |
|------|---------|
| **CDP** | Customer Data Platform — hồ sơ khách hợp nhất, trục trung tâm của sản phẩm |
| **Tenant** | Một khách hàng (doanh nghiệp) dùng SaaS, có không gian dữ liệu riêng |
| **Liên hệ nháp** | Người lạ nhắn lần đầu, chưa vào pipeline |
| **Lead** | Liên hệ đã xác nhận có nhu cầu, đưa vào Pipeline |
| **Entitlements** | Khung bật/tắt tính năng theo gói đã mua (nền monetization) |
| **Conversation metering** | Đếm số hội thoại theo **từng kênh** — hiện chỉ THỐNG KÊ, chưa dùng để chặn hay tính phí |
| **Zalo cá nhân** | Kênh inbox Phase 1 (không phải OA — OA hoãn vì chưa có tài khoản test) |
→ Full glossary: docs/glossary.md

## Projects
| Name | What |
|------|------|
| **Yona** | SaaS CRM + quản lý dự án cho SME Việt. Repo: yona. Định vị: "Quản lý khách hàng tập trung & tự động hóa" |

## Key Decisions (đã chốt — đừng làm sai lại)
- **Inbox Phase 1 = Zalo CÁ NHÂN, KHÔNG phải Zalo OA** (OA phức tạp, chưa có tài khoản test). Zalo cá nhân không có API chính thức → dùng QR login/web automation (zca-js); có rủi ro ToS/khóa acc.
- Hội thoại đếm **theo từng kênh**, KHÔNG gộp theo người CDP (cùng người trên Zalo + Mess = 2 hội thoại).
- Bộ đếm hội thoại chỉ tính khi **tenant trả lời**, không tính tin inbound.
- **Gate hạn mức đã gỡ hoàn toàn** (25/07/2026) — cho dùng không giới hạn, chỉ thống kê. Đừng tự dựng lại gate khi chưa có lệnh.
- **Luôn nhận inbound** — để không mất lead.
- **Không** xây module e-commerce (order/inventory/shipping). KiotViet/Sapo chỉ tích hợp làm giàu dữ liệu cho CDP.

## Preferences
- Tiếng Việt xuyên suốt.
- Trả lời kỹ thuật trực tiếp, súc tích, không vòng vo.
- Luôn tạo artifact để theo dõi tiến độ khi planning.