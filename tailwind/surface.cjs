// Mỗi bề mặt (widget, survey, portal, superadmin, v3) dựng utility Tailwind từ
// đúng những file nó thật sự nạp, thay vì quét cả resources/js.
//
// `content` của tailwind.config.js quét toàn bộ cây React, nên mọi entry CSS
// đều nhận cùng ~676 KB utility của dashboard. Widget nhúng trên site khách
// và trang khảo sát công khai không cần số đó.
//
// Danh sách glob phải khớp module graph thật của entry. `npm run check:css`
// dựng lại graph bằng Rollup và fail nếu có import vượt ra ngoài.
const base = require('../tailwind.config.js');

module.exports = content => ({ ...base, content });
