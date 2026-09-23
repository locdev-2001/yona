import { fillPlaceholders, type LandingStrings } from '../../config';
import { Eyebrow, Section } from '../Section';

// Khoá kênh trùng khoá của bước chọn kênh khi tạo hộp thư (`ChannelItem.tsx`):
// trang công khai chỉ được bày kênh mà người dùng bấm vào là tạo được ngay,
// kênh còn "Sắp có" ở đó thì ở đây cũng chỉ là "sắp có". Test của section so
// thẳng hai bên để không lệch lại.
//
// Icon để ĐƠN SẮC, không giữ màu thương hiệu: mỗi logo một màu biến dải này
// thành một dãy đốm màu rời rạc, trong khi vai trò của nó là một mảng đặc
// chứng minh độ phủ.
export const LIVE_CHANNELS = [
    { key: 'zalo', icon: 'i-simple-icons-zalo', label: 'Zalo' },
    { key: 'website', icon: 'i-lucide-globe', label: 'Website' },
    { key: 'email', icon: 'i-lucide-mail', label: 'Email' },
    { key: 'telegram', icon: 'i-simple-icons-telegram', label: 'Telegram' },
    { key: 'whatsapp', icon: 'i-simple-icons-whatsapp', label: 'WhatsApp' },
    { key: 'line', icon: 'i-simple-icons-line', label: 'LINE' },
    { key: 'sms', icon: 'i-lucide-message-square', label: 'SMS' },
    { key: 'api', icon: 'i-lucide-code-xml', label: 'API' },
] as const;

// Chỉ tên, không icon: đặt chung lưới với kênh đang chạy thì mắt đọc ra là
// kênh đang chạy, dù có kèm nhãn nhỏ.
export const UPCOMING_CHANNELS = [
    { key: 'facebook', label: 'Messenger' },
    { key: 'instagram', label: 'Instagram' },
] as const;

export function Channels({ strings }: { strings: LandingStrings['channels'] }) {
    const upcoming = UPCOMING_CHANNELS.map(({ label }) => label).join(', ');

    return (
        <Section surface="base" rhythm="sm" accent="primary">
            {/* Eyebrow đứng ở mép container, không căn giữa: nó là dòng mở đầu của
                khối, đọc ngang hàng với phần còn lại thay vì tách riêng thành một
                nhãn nổi ở giữa trang. */}
            <Eyebrow>{strings.eyebrow}</Eyebrow>

            {/* Tám kênh chia đều 4×2 từ `sm`: ba cột sẽ để hàng cuối lẻ hai ô. */}
            <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-4">
                {LIVE_CHANNELS.map(({ key, icon, label }) => (
                    <li key={key} className="flex items-center justify-center gap-2.5 text-neutral-500">
                        <span className={`${icon} size-5 shrink-0`} aria-hidden="true" />
                        <span className="text-sm">{label}</span>
                    </li>
                ))}
            </ul>

            <p className="mt-10 text-caption text-neutral-500">
                {upcoming && `${fillPlaceholders(strings.coming_soon, { channels: upcoming })} `}
                {strings.note}
            </p>
        </Section>
    );
}
