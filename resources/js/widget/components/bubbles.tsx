import FluentIcon from 'shared/components/FluentIcon/FluentIcon';

import { getContrastingTextColor } from '../helpers/colorHelper';
import { t } from '../i18n';

// Port từ widget/components/{ImageBubble,VideoBubble,FileBubble}.vue —
// ba bong bóng đính kèm, cùng markup/class của bản gốc.

interface ImageBubbleProps {
    url: string;
    thumb: string;
    readableTime: string;
    onError: () => void;
}

export function ImageBubble({ url, thumb, readableTime, onError }: ImageBubbleProps) {
    return (
        <a href={url} target="_blank" rel="noreferrer noopener nofollow" className="image">
            <div className="wrap">
                <img src={thumb} alt="Picture message" onError={onError} />
                <span className="time">{readableTime}</span>
            </div>
        </a>
    );
}

interface VideoBubbleProps {
    url: string;
    readableTime: string;
    onError: () => void;
}

export function VideoBubble({ url, readableTime, onError }: VideoBubbleProps) {
    return (
        <div className="relative block max-w-full">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video className="w-full max-w-[250px] h-auto" src={url} controls onError={onError} />
            <span className="absolute text-xs text-white dark:text-white right-3 bottom-1 whitespace-nowrap">
                {readableTime}
            </span>
        </div>
    );
}

interface FileBubbleProps {
    url: string;
    isInProgress?: boolean;
    widgetColor?: string;
    isUserBubble?: boolean;
}

export function FileBubble({ url, isInProgress = false, widgetColor = '', isUserBubble = false }: FileBubbleProps) {
    const fileName = url.substring(url.lastIndexOf('/') + 1);
    const title = isInProgress ? t('COMPONENTS.FILE_BUBBLE.UPLOADING') : decodeURI(fileName);
    const textColor = isUserBubble && widgetColor ? getContrastingTextColor(widgetColor) : undefined;

    return (
        <div className="file flex flex-row items-center p-3 cursor-pointer">
            <div className="icon-wrap" style={{ color: textColor }}>
                <FluentIcon icon="document" size="28" />
            </div>
            <div className="ltr:pr-1 rtl:pl-1">
                <div
                    className={`m-0 font-medium text-sm ${isUserBubble ? '' : 'text-n-slate-12'}`}
                    style={{ color: textColor }}
                >
                    {title}
                </div>
                <div className="leading-none mb-1">
                    <a
                        className="download"
                        rel="noreferrer noopener nofollow"
                        target="_blank"
                        style={{ color: textColor }}
                        href={url}
                    >
                        {t('COMPONENTS.FILE_BUBBLE.DOWNLOAD')}
                    </a>
                </div>
            </div>
        </div>
    );
}
