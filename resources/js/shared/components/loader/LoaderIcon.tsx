import { Bouncy } from 'ldrs/react';
import 'ldrs/react/Bouncy.css';
import './Loader.css';

// Hình tải duy nhất của mọi bề mặt; đổi kiểu loading chỉ sửa tệp này. Không nạp
// bộ i18n để console dùng được: có `label` thì là vùng trạng thái, không có thì
// chỉ trang trí cạnh chữ "đang..." mà nơi gọi đã tự hiện.
const DEFAULT_SIZE_PX = 24;

export interface LoaderIconProps {
    /** Bề ngang hiệu ứng tính bằng px; chiều cao bằng 0.6 lần. */
    size?: number;
    className?: string;
    label?: string;
}

export default function LoaderIcon({ size = DEFAULT_SIZE_PX, className, label }: LoaderIconProps) {
    const accessibility = label ? { role: 'status', 'aria-label': label } : { 'aria-hidden': true };

    return (
        <span {...accessibility} className={['yona-loader', className].filter(Boolean).join(' ')}>
            <Bouncy size={size} color="currentColor" />
        </span>
    );
}
