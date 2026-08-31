import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, MouseEvent } from 'react';

import Icon from 'dashboard/components-next/icon/Icon';

// Port từ dashboard/components-next/avatar/Avatar.vue
// (prop `inbox`/ChannelIcon chưa port — vào ở B1).
interface AvatarProps {
    src?: string;
    name: string;
    size?: number;
    allowUpload?: boolean;
    roundedFull?: boolean;
    status?: 'online' | 'busy' | 'offline' | null;
    iconName?: string | null;
    hideOfflineStatus?: boolean;
    className?: string;
    onUpload?: (payload: { file: File; url: string | null }) => void;
    onDelete?: () => void;
}

const AVATAR_COLORS = {
    dark: [
        ['#4B143D', '#FF8DCC'],
        ['#3F220D', '#FFA366'],
        ['#2A2A2A', '#ADB1B8'],
        ['#023B37', '#0BD8B6'],
        ['#27264D', '#A19EFF'],
        ['#1D2E62', '#9EB1FF'],
    ],
    light: [
        ['#FBDCEF', '#C2298A'],
        ['#FFE0BB', '#99543A'],
        ['#E8E8E8', '#60646C'],
        ['#CCF3EA', '#008573'],
        ['#EBEBFE', '#4747C2'],
        ['#E1E9FF', '#3A5BC7'],
    ],
    default: { bg: '#E8E8E8', text: '#60646C' },
};

const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu;

function getInitials(name: string): string {
    if (!name) return '';
    const words = name.replace(EMOJI_REGEX, '').trim().split(/\s+/);
    return words.length === 1
        ? words[0].charAt(0).toUpperCase()
        : words
              .slice(0, 2)
              .map(word => word.charAt(0))
              .join('')
              .toUpperCase();
}

function getBorderRadiusClass(size: number, roundedFull: boolean): string {
    if (roundedFull) return 'rounded-full';
    if (size <= 16) return 'rounded';
    if (size <= 24) return 'rounded-md';
    if (size <= 32) return 'rounded-lg';
    if (size <= 48) return 'rounded-xl';
    return 'rounded-2xl';
}

export default function Avatar({
    src = '',
    name,
    size = 32,
    allowUpload = false,
    roundedFull = false,
    status = null,
    iconName = null,
    hideOfflineStatus = false,
    className = '',
    onUpload,
    onDelete,
}: AvatarProps) {
    const [isImageValid, setImageValid] = useState(true);
    const fileInput = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setImageValid(true);
    }, [src]);

    const statusClasses: Record<string, string> = {
        online: 'bg-n-teal-10',
        busy: 'bg-n-amber-10',
        ...(hideOfflineStatus ? {} : { offline: 'bg-n-slate-10' }),
    };

    const showDefaultAvatar = !src && !name;
    const showColors = !showDefaultAvatar && (!src || !isImageValid);

    const colorIndex = name ? name.length % AVATAR_COLORS.light.length : -1;
    const colors =
        colorIndex >= 0
            ? {
                  bg: AVATAR_COLORS.light[colorIndex][0],
                  darkBg: AVATAR_COLORS.dark[colorIndex][0],
                  text: AVATAR_COLORS.light[colorIndex][1],
                  darkText: AVATAR_COLORS.dark[colorIndex][1],
              }
            : { ...AVATAR_COLORS.default, darkBg: AVATAR_COLORS.default.bg, darkText: AVATAR_COLORS.default.text };

    const badgeSize = Math.max(size * 0.35, 8);
    const borderRadiusClass = getBorderRadiusClass(size, roundedFull);

    const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onUpload?.({ file, url: URL.createObjectURL(file) });
        }
    };

    const handleDismiss = (event: MouseEvent) => {
        event.stopPropagation();
        if (fileInput.current) fileInput.current.value = '';
        onDelete?.();
    };

    return (
        <span
            className={`relative inline-flex group/avatar z-0 flex-shrink-0 align-middle ${className}`.trim()}
            style={{ width: size, height: size }}
        >
            {status && statusClasses[status] ? (
                <div
                    className={`absolute z-20 border rounded-full border-n-slate-3 ${statusClasses[status]}`}
                    style={{
                        width: badgeSize,
                        height: badgeSize,
                        top: size - badgeSize / 1.1,
                        left: size - badgeSize / 1.1,
                    }}
                />
            ) : null}

            {src && allowUpload ? (
                <div
                    className="absolute z-20 flex items-center justify-center invisible w-6 h-6 transition-all duration-300 ease-in-out opacity-0 cursor-pointer outline outline-1 outline-n-container -top-2 ltr:-right-2 rtl:-left-2 rounded-xl bg-n-solid-3 group-hover/avatar:visible group-hover/avatar:opacity-100"
                    onClick={handleDismiss}
                >
                    <Icon icon="i-lucide-x" className="text-n-slate-11 size-4" />
                </div>
            ) : null}

            <span
                role="img"
                className={[
                    'relative inline-flex items-center justify-center object-cover overflow-hidden font-medium outline outline-1 -outline-offset-1 outline-[rgb(0_0_0_/_0.03)] dark:outline-[rgb(255_255_255_/_0.04)]',
                    borderRadiusClass,
                    showColors ? 'dark:!bg-[var(--dark-bg)] dark:!text-[var(--dark-text)]' : '',
                    showDefaultAvatar ? 'bg-n-slate-3 dark:bg-n-slate-4' : '',
                ]
                    .filter(Boolean)
                    .join(' ')}
                style={{
                    width: size,
                    height: size,
                    backgroundColor: showColors ? colors.bg : undefined,
                    color: showColors ? colors.text : undefined,
                    ['--dark-bg' as string]: colors.darkBg,
                    ['--dark-text' as string]: colors.darkText,
                }}
            >
                {src && isImageValid ? (
                    <img src={src} alt={name} onError={() => setImageValid(false)} />
                ) : iconName ? (
                    <Icon icon={iconName} className="" />
                ) : !showDefaultAvatar ? (
                    <span className="select-none" style={{ fontSize: Math.min(size / 2.5, 24) }}>
                        {getInitials(name)}
                    </span>
                ) : (
                    <Icon icon="i-lucide-user" className="" />
                )}

                {allowUpload ? (
                    <div
                        className={`absolute inset-0 z-10 flex items-center justify-center invisible w-full h-full transition-all duration-300 ease-in-out opacity-0 bg-n-alpha-black1 group-hover/avatar:visible group-hover/avatar:opacity-100 ${borderRadiusClass}`}
                        onClick={() => fileInput.current?.click()}
                    >
                        <Icon icon="i-lucide-upload" className="text-white" />
                        <input
                            ref={fileInput}
                            type="file"
                            accept="image/png, image/jpeg, image/jpg, image/gif, image/webp"
                            className="hidden"
                            onChange={handleImageUpload}
                        />
                    </div>
                ) : null}
            </span>
        </span>
    );
}
