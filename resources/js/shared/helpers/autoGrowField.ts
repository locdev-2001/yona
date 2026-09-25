// Luật chung của ô soạn tự giãn (ô nhập widget, ô soạn trả lời của hộp thư):
// cao theo nội dung tới trần, và CHỈ cho cuộn khi nội dung vượt chiều cao đang
// áp. Nhờ vậy ô rỗng hay một dòng không bao giờ hiện thanh cuộn.

// Phần lẻ dưới 1px do làm tròn toạ độ không được tính là tràn.
const SUBPIXEL_TOLERANCE_PX = 1;

export type AutoGrowOverflow = 'auto' | 'hidden';

export const autoGrowOverflow = (contentHeight: number, appliedHeight: number): AutoGrowOverflow =>
    contentHeight > appliedHeight + SUBPIXEL_TOLERANCE_PX ? 'auto' : 'hidden';

export function fitAutoGrowHeight(contentHeight: number, maxHeight: number): { height: number; overflowY: AutoGrowOverflow } {
    const height = Math.min(contentHeight, maxHeight);

    return { height, overflowY: autoGrowOverflow(contentHeight, height) };
}
