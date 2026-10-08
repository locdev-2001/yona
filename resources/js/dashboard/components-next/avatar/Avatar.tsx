import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent, MouseEvent, ReactNode } from 'react';

import Icon from 'dashboard/components-next/icon/Icon';
import PlatformLogo from 'dashboard/components-next/icon/PlatformLogo';
import GeneratedAvatar from 'shared/avatar/GeneratedAvatar';
import { resolveAvatarIdentity } from 'shared/avatar/avatarSeed';
import { generatedAvatarUri } from 'shared/avatar/generatedAvatarUri';
import type { ChannelPlatform } from 'shared/constants/channelPlatform';

import { t } from '../../../i18n';

// Trình xem ảnh chỉ nạp khi có người bấm, avatar ở danh sách dài không phải kéo theo.
const AvatarPreview = lazy(() => import('./AvatarPreview'));

const GENERATED_AVATAR_PREVIEW_SIZE = 480;

// Badge nền tảng: 24px→12, 32px→14, 40px→18; avatar nhỏ hơn 20px thì badge không đọc được nên bỏ.
const PLATFORM_BADGE_RATIO = 0.45;
const PLATFORM_BADGE_MIN = 12;
const PLATFORM_BADGE_MAX = 20;
const PLATFORM_BADGE_MIN_AVATAR = 20;

// Port từ dashboard/components-next/avatar/Avatar.vue.
interface AvatarProps {
    src?: string;
    name: string;
    // Định danh bền (avatarSeed) cho avatar hình khối khi không có ảnh; thiếu thì dựng theo tên.
    seed?: string;
    size?: number;
    allowUpload?: boolean;
    roundedFull?: boolean;
    status?: 'online' | 'busy' | 'offline' | null;
    iconName?: string | null;
    hideOfflineStatus?: boolean;
    // Nền tảng tin/khách đến từ (hoặc chính bản cài đặt) — badge tròn ở góc dưới cuối avatar.
    platform?: ChannelPlatform | null;
    className?: string;
    // Bấm (hoặc Enter/Space) vào avatar có ảnh thật thì mở ảnh cỡ lớn; avatar hình khối không bấm được.
    previewable?: boolean;
    // Slot overlay của bản gốc: thay thế lớp upload phủ trên avatar
    // (ContactsCard dùng để hiện checkbox chọn khi hover).
    overlay?: (args: { size: number }) => ReactNode;
    onUpload?: (payload: { file: File; url: string | null }) => void;
    onDelete?: () => void;
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
    seed,
    size = 32,
    allowUpload = false,
    roundedFull = false,
    status = null,
    iconName = null,
    hideOfflineStatus = false,
    platform = null,
    className = '',
    previewable = false,
    overlay,
    onUpload,
    onDelete,
}: AvatarProps) {
    const [isImageValid, setImageValid] = useState(true);
    const [isPreviewOpen, setPreviewOpen] = useState(false);
    const fileInput = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setImageValid(true);
    }, [src]);

    const statusClasses: Record<string, string> = {
        online: 'bg-n-teal-10',
        busy: 'bg-n-amber-10',
        ...(hideOfflineStatus ? {} : { offline: 'bg-n-slate-10' }),
    };

    const showImage = Boolean(src) && isImageValid;
    const generatedIdentity = resolveAvatarIdentity(seed, name);
    const hasGeneratedIdentity = Boolean(generatedIdentity);
    const showIcon = !showImage && (Boolean(iconName) || !hasGeneratedIdentity);

    const badgeSize = Math.max(size * 0.35, 8);
    const showPlatformBadge = Boolean(platform) && size >= PLATFORM_BADGE_MIN_AVATAR;
    const platformBadgeSize = Math.min(
        Math.max(Math.round(size * PLATFORM_BADGE_RATIO), PLATFORM_BADGE_MIN),
        PLATFORM_BADGE_MAX,
    );
    const borderRadiusClass = getBorderRadiusClass(size, roundedFull);
    const canPreview = previewable && !showIcon;

    const openPreview = (event: MouseEvent | KeyboardEvent) => {
        event.stopPropagation();
        setPreviewOpen(true);
    };

    const previewTriggerProps = canPreview
        ? {
              role: 'button',
              tabIndex: 0,
              'aria-label': t('GALLERY_VIEW.VIEW_AVATAR', { name }).trim(),
              'aria-haspopup': 'dialog' as const,
              onClick: openPreview,
              onKeyDown: (event: KeyboardEvent) => {
                  if (event.key !== 'Enter' && event.key !== ' ') return;
                  event.preventDefault();
                  openPreview(event);
              },
          }
        : { role: 'img' };

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
                        // Badge nền tảng giữ góc dưới, chấm trạng thái nhường lên góc trên.
                        top: showPlatformBadge ? 0 : size - badgeSize / 1.1,
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
                {...previewTriggerProps}
                className={[
                    'relative inline-flex items-center justify-center object-cover overflow-hidden outline outline-1 -outline-offset-1 outline-[rgb(0_0_0_/_0.03)]',
                    borderRadiusClass,
                    canPreview
                        ? 'cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-n-brand'
                        : '',
                    showIcon ? 'bg-n-slate-3 text-n-slate-11' : '',
                ]
                    .filter(Boolean)
                    .join(' ')}
                style={{ width: size, height: size }}
            >
                {showImage ? (
                    <img src={src} alt={name} onError={() => setImageValid(false)} />
                ) : showIcon ? (
                    // Glyph to theo cỡ avatar; không có icon riêng và không có danh tính thì là người vô danh.
                    <Icon icon={iconName || 'i-lucide-user'} className="" style={{ fontSize: size / 1.6 }} />
                ) : (
                    <GeneratedAvatar seed={seed} name={name} size={size} alt={name} />
                )}

                {overlay ? (
                    overlay({ size })
                ) : allowUpload ? (
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

            {/* Nền trắng cố định ở cả giao diện tối: logo thương hiệu (và logo bản cài đặt nền trong suốt) vẽ cho nền sáng. */}
            {showPlatformBadge && platform ? (
                <span
                    data-testid="avatar-platform-badge"
                    title={platform.name}
                    className="absolute z-20 -bottom-0.5 -end-0.5 grid place-items-center overflow-hidden rounded-full bg-white ring-1 ring-n-surface-1"
                    style={{ width: platformBadgeSize, height: platformBadgeSize }}
                >
                    <PlatformLogo platform={platform} className="size-full" />
                </span>
            ) : null}

            {canPreview && isPreviewOpen ? (
                <Suspense fallback={null}>
                    <AvatarPreview
                        src={showImage ? src : generatedAvatarUri(generatedIdentity, GENERATED_AVATAR_PREVIEW_SIZE)}
                        name={name}
                        onClose={() => setPreviewOpen(false)}
                    />
                </Suspense>
            ) : null}
        </span>
    );
}
