import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

// ux-brief.md cấm Title Case máy móc: CSS `capitalize` biến "Gấu nâu ẩn danh"
// thành "Gấu Nâu Ẩn Danh" ở danh sách hội thoại và panel phải, trong khi tiêu đề
// khung chat vẫn viết đúng — lệch nhau ngay trong một khung hình. Tên người do
// người/kênh đặt, giao diện không được viết hoa lại.
const ROOT = process.cwd();

const FILES_RENDERING_CONTACT_NAME = [
    'resources/js/dashboard/conversation/conversationbox/contact/ContactInfo.tsx',
    'resources/js/dashboard/components/widgets/conversation/ConversationCard.tsx',
    'resources/js/dashboard/reports/components/CsatContactCell.tsx',
];

describe('tên liên hệ không bị viết hoa lại bằng CSS', () => {
    it.each(FILES_RENDERING_CONTACT_NAME)('%s không dùng class capitalize', file => {
        const source = readFileSync(resolve(ROOT, file), 'utf8');

        expect(source).not.toMatch(/\bcapitalize\b/);
    });
});
