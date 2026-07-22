# Glossary

Decoder ring cho dự án Yona — thuật ngữ, viết tắt, codename, tên gọi nội bộ.

> Liên quan: roadmap [development-roadmap.md](development-roadmap.md) · định vị/hiện trạng [project-overview.md](project-overview.md) · domain [crm-domain-definition.md](crm-domain-definition.md) · kiến trúc [system-architecture.md](system-architecture.md). Mục tiêu/north-star: xem CLAUDE.md + bộ nhớ dự án. CDP Layer / Phase ↔ GĐ trong roadmap.

## Acronyms & Terms
| Term | Meaning | Context |
|------|---------|---------|
| Conversational CRM & Automation | Định vị chính thức (chốt 22/07/2026) | CRM lấy hội thoại nhắn tin làm cửa vào (inbox → Liên hệ nháp → Lead) + tự động hóa chăm sóc — category của Kommo/respond.io |
| CDP | Customer Data Platform | Hồ sơ khách hợp nhất; **trục trung tâm** — mọi nguồn đổ vào, mọi hành động đọc ra |
| CDP Layer 1 | Hợp nhất danh tính (identity unification) | **GĐ1** — dedup theo SĐT |
| CDP Layer 2 | Cá nhân hóa hành vi (behavioral personalization) | **GĐ4** |
| Tenant | Một doanh nghiệp dùng SaaS | Mỗi tenant có không gian dữ liệu riêng (multi-tenant) |
| RLS | Row-Level Security (PostgreSQL) | Cô lập dữ liệu giữa các tenant |
| RBAC | Role-Based Access Control | Phân quyền nhân viên |
| Entitlements | Khung bật/tắt tính năng theo gói | Nền monetization (GĐ1); cơ chế gate bật/tắt tính năng theo workspace |
| Addon | Module trả phí mở rộng | Marketplace mở ở **GĐ5** |
| Conversation metering | Tính phí theo số hội thoại | Đếm per-channel, chỉ khi tenant trả lời |
| Zalo cá nhân | Tài khoản Zalo cá nhân (personal) | **Kênh inbox GĐ1** — không có API chính thức, dùng QR login/web automation (zca-js). Rủi ro ToS/khóa acc |
| OA | Zalo Official Account | Hoãn lại — phức tạp, chưa có tài khoản test |
| Personalize engine | Khái niệm cá nhân hóa | Tách thành CDP Layer 1 + Layer 2 |

## Internal Terms (tiếng Việt)
| Term | Meaning |
|------|---------|
| Liên hệ nháp | Người lạ nhắn lần đầu, chưa vào pipeline (kỹ thuật GĐ1: Conversation chưa gắn Contact) |
| Lead | Liên hệ đã xác nhận nhu cầu, đã vào Pipeline |
| Pipeline | Phễu bán hàng kéo-thả |
| Inbox đa kênh | Màn hình chat gộp Zalo + Messenger + TikTok (mỗi kênh = 1 ChannelDriver) |
| Cửa sổ cho phép | Khung thời gian nền tảng cho phép chủ động nhắn khách |
| Ghi nguồn | Lưu rõ khách "đến từ đâu" để báo cáo kênh |

## Tên sản phẩm (đã chốt 22/07/2026)
| Tên | Status |
|-----|--------|
| **Yona** | Tên chính thức — domain **yona.vn**, repo github.com/locflamedia/yona |
| Chó rách CRM / cho-rach-management | Tên cũ trước rebrand 22/07/2026 (còn xuất hiện trong journals/plans lịch sử) |
| Guồng, Mạch | Ứng viên cũ, đã loại |

## Integrations & Tools
| Name | Role |
|------|------|
| KiotViet | Tích hợp làm giàu dữ liệu CDP (không cạnh tranh) |
| Sapo | Tích hợp làm giàu dữ liệu CDP (không cạnh tranh) |
| Zalo cá nhân | **Kênh inbox GĐ1** (không có API chính thức) |
| Zalo OA | Hoãn — dùng sau khi có tài khoản test |
| Messenger | Kênh inbox GĐ2 |
| TikTok | Kênh inbox GĐ2 (nhiều giới hạn nhất, làm sau cùng) |
| VNPay / MoMo | Thanh toán nội địa GĐ1 (driver `payment-*` cắm vào `PaymentProvider`) |
| Figma FigJam | File key YAvnMFXP9hAHb2CSaLy7sB — board trên Figma vẫn mang tên cũ "Chó rách CRM" (PDF export đã gỡ khỏi repo; nội dung mục tiêu/roadmap lưu ở docs + bộ nhớ) |

## Legal / Compliance
| Term | Meaning |
|------|---------|
| Nghị định 70 | Quy định thuế VN (đã nghiên cứu) |
| Nghị định 117 | Quy định thuế VN (đã nghiên cứu) |
| Khung 7h–22h | Chỉ gửi tin trong khung giờ này |
| Max 3 tin QC/số/ngày | Giới hạn tin quảng cáo mỗi số/ngày |
