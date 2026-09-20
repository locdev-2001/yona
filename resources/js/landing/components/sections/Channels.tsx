import type { LandingStrings } from '../../config';
import { Eyebrow, Section } from '../Section';

// Kênh đã có driver trong sản phẩm, không phải lộ trình.
//
// Icon để ĐƠN SẮC, không giữ màu thương hiệu: tám logo mỗi cái một màu biến dải
// này thành một dãy đốm màu rời rạc, trong khi vai trò của nó là một mảng đặc
// chứng minh độ phủ.
const CHANNELS = [
    { key: 'zalo', icon: 'i-simple-icons-zalo', label: 'Zalo' },
    { key: 'messenger', icon: 'i-simple-icons-messenger', label: 'Messenger' },
    { key: 'instagram', icon: 'i-simple-icons-instagram', label: 'Instagram' },
    { key: 'telegram', icon: 'i-simple-icons-telegram', label: 'Telegram' },
    { key: 'whatsapp', icon: 'i-simple-icons-whatsapp', label: 'WhatsApp' },
    { key: 'line', icon: 'i-simple-icons-line', label: 'LINE' },
    { key: 'tiktok', icon: 'i-simple-icons-tiktok', label: 'TikTok' },
    { key: 'web', icon: 'i-lucide-globe', label: 'Website' },
    { key: 'sms', icon: 'i-lucide-message-square', label: 'SMS' },
    { key: 'email', icon: 'i-lucide-mail', label: 'Email' },
    { key: 'api', icon: 'i-lucide-code-xml', label: 'API' },
    { key: 'widget', icon: 'i-lucide-message-circle', label: 'Widget web' },
];

export function Channels({ strings }: { strings: LandingStrings['channels'] }) {
    return (
        <Section surface="base" rhythm="sm" accent="primary">
            {/* Eyebrow đứng ở mép container, không căn giữa: nó là dòng mở đầu của
                khối, đọc ngang hàng với phần còn lại thay vì tách riêng thành một
                nhãn nổi ở giữa trang. */}
            <Eyebrow>{strings.eyebrow}</Eyebrow>

            <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-3 md:grid-cols-4">
                {CHANNELS.map(({ key, icon, label }) => (
                    <li key={key} className="flex items-center justify-center gap-2.5 text-neutral-500">
                        <span className={`${icon} size-5 shrink-0`} aria-hidden="true" />
                        <span className="text-sm">{label}</span>
                    </li>
                ))}
            </ul>

            <p className="mt-10 text-caption text-neutral-500">{strings.note}</p>
        </Section>
    );
}
