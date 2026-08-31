import Icon from 'dashboard/components-next/icon/Icon';
import { iconClassFor, isIconValue } from './constants';

// Port từ dashboard/components-next/emoji-icon-picker/EmojiIcon.vue —
// hiển thị giá trị đã lưu: icon nhuộm màu hoặc emoji.
interface EmojiIconProps {
    value?: string;
    color?: string;
    className?: string;
}

export default function EmojiIcon({ value = '', color = '', className = '' }: EmojiIconProps) {
    return (
        <span className={`inline-flex items-center justify-center leading-none ${className}`}>
            {isIconValue(value) ? (
                <Icon
                    icon={iconClassFor(value)}
                    className="size-full"
                    style={color ? { color } : undefined}
                />
            ) : (
                <span>{value}</span>
            )}
        </span>
    );
}
