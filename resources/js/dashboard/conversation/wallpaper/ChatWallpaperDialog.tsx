import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, CSSProperties, ReactNode } from 'react';

import Button from 'dashboard/components-next/button/Button';
import Dialog from 'dashboard/components-next/dialog/Dialog';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import Icon from 'dashboard/components-next/icon/Icon';
import Segmented from 'dashboard/components-next/segmented/Segmented';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { t } from '../../../i18n';
import {
    WALLPAPER_UPLOAD_ACCEPT,
    WALLPAPER_UPLOAD_MAX_BYTES,
    saveChatWallpaperSettings,
    uploadWallpaperImage,
    useChatWallpaperSettings,
    wallpaperForScope,
    wallpaperStyle,
    withWallpaper,
} from './chatWallpaper';
import type { Wallpaper, WallpaperScope } from './chatWallpaper';
import { WALLPAPER_PRESETS } from './presets';

function WallpaperTile({
    label,
    style,
    isSelected,
    onSelect,
    children,
}: {
    label: string;
    style?: CSSProperties;
    isSelected: boolean;
    onSelect: () => void;
    children?: ReactNode;
}) {
    return (
        <button
            type="button"
            aria-pressed={isSelected}
            title={label}
            className="flex flex-col items-center gap-1 min-w-0 p-0 bg-transparent border-0 cursor-pointer group"
            onClick={onSelect}
        >
            <span
                className={`relative flex items-center justify-center w-full aspect-square sm:aspect-[4/5] min-h-11 rounded-lg border border-solid border-n-weak overflow-hidden transition-shadow ${
                    isSelected ? 'outline outline-2 outline-offset-2 outline-n-brand' : 'group-hover:shadow-md'
                }`}
                style={style}
            >
                {children}
                {isSelected ? (
                    <span className="absolute top-1 ltr:right-1 rtl:left-1 flex items-center justify-center rounded-full size-5 bg-n-brand text-white">
                        <Icon icon="i-lucide-check" className="size-3.5" />
                    </span>
                ) : null}
            </span>
            <span className="w-full text-xs text-center truncate text-n-slate-11">{label}</span>
        </button>
    );
}

// Chọn nền thì áp ngay (như Zalo), nút Xong chỉ đóng hộp.
export default function ChatWallpaperDialog({ conversationId, onClose }: { conversationId: number; onClose: () => void }) {
    const dialogRef = useRef<DialogHandle>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const settings = useChatWallpaperSettings();
    const [scope, setScope] = useState<WallpaperScope>(() =>
        settings.conversations[String(conversationId)] || !settings.default ? 'conversation' : 'all',
    );
    const [isUploading, setUploading] = useState(false);
    const selected = wallpaperForScope(settings, scope, conversationId);

    useEffect(() => {
        dialogRef.current?.open();
    }, []);

    const apply = (wallpaper: Wallpaper | null) => {
        saveChatWallpaperSettings(withWallpaper(settings, scope, conversationId, wallpaper)).catch(error =>
            useAlert(parseApiErrorMessage(error) ?? t('CHAT_WALLPAPER.SAVE_FAILED')),
        );
    };

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        if (file.size > WALLPAPER_UPLOAD_MAX_BYTES) {
            useAlert(t('CHAT_WALLPAPER.UPLOAD_TOO_LARGE'));
            return;
        }

        setUploading(true);
        try {
            apply({ kind: 'image', url: await uploadWallpaperImage(file) });
        } catch (error) {
            useAlert(parseApiErrorMessage(error) ?? t('CHAT_WALLPAPER.UPLOAD_UNREADABLE'));
        } finally {
            setUploading(false);
        }
    };

    const footer = (
        <div className="flex flex-col gap-3">
            {scope === 'conversation' && selected && settings.default ? (
                <p className="mb-0 text-xs text-n-slate-11">{t('CHAT_WALLPAPER.REMOVE_HINT_CONVERSATION')}</p>
            ) : null}
            <div className="flex items-center w-full gap-3">
                <Button
                    type="button"
                    variant="faded"
                    color="slate"
                    icon="i-lucide-eraser"
                    label={t('CHAT_WALLPAPER.REMOVE')}
                    className="w-full max-md:!h-11"
                    disabled={!selected}
                    onClick={() => apply(null)}
                />
                <Button
                    type="button"
                    color="blue"
                    label={t('CHAT_WALLPAPER.DONE')}
                    className="w-full max-md:!h-11"
                    onClick={() => dialogRef.current?.close()}
                />
            </div>
        </div>
    );

    return (
        <Dialog
            ref={dialogRef}
            title={t('CHAT_WALLPAPER.TITLE')}
            description={t('CHAT_WALLPAPER.DESCRIPTION')}
            width="lg"
            overflowYAuto
            footer={footer}
            onClose={onClose}
        >
            <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium text-n-slate-12">{t('CHAT_WALLPAPER.SCOPE_LABEL')}</span>
                    <Segmented
                        ariaLabel={t('CHAT_WALLPAPER.SCOPE_LABEL')}
                        className="w-full max-md:[&>button]:min-h-11"
                        value={scope}
                        onChange={value => setScope(value as WallpaperScope)}
                        options={[
                            { value: 'conversation', label: t('CHAT_WALLPAPER.SCOPE_CONVERSATION') },
                            { value: 'all', label: t('CHAT_WALLPAPER.SCOPE_ALL') },
                        ]}
                    />
                </div>
                <div className="grid grid-cols-4 gap-2 sm:gap-3">
                    <WallpaperTile
                        label={isUploading ? t('CHAT_WALLPAPER.UPLOADING') : t('CHAT_WALLPAPER.UPLOAD')}
                        isSelected={false}
                        onSelect={() => fileInputRef.current?.click()}
                    >
                        <span className="flex flex-col items-center justify-center w-full h-full border border-dashed rounded-lg border-n-slate-7 text-n-slate-11 bg-n-surface-panel">
                            <Icon icon={isUploading ? 'i-lucide-loader-circle' : 'i-lucide-image-plus'} className={`size-5 ${isUploading ? 'animate-spin' : ''}`} />
                        </span>
                    </WallpaperTile>
                    {selected?.kind === 'image' ? (
                        <WallpaperTile label={t('CHAT_WALLPAPER.YOUR_IMAGE')} style={wallpaperStyle(selected)} isSelected onSelect={() => undefined} />
                    ) : null}
                    {WALLPAPER_PRESETS.map(preset => (
                        <WallpaperTile
                            key={preset.key}
                            label={t(preset.labelKey)}
                            style={preset.style}
                            isSelected={selected?.kind === 'preset' && selected.key === preset.key}
                            onSelect={() => apply({ kind: 'preset', key: preset.key })}
                        />
                    ))}
                </div>
                <p className="mb-0 text-xs text-n-slate-11">{t('CHAT_WALLPAPER.UPLOAD_HINT')}</p>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept={WALLPAPER_UPLOAD_ACCEPT}
                    className="hidden"
                    disabled={isUploading}
                    onChange={handleFileChange}
                />
            </div>
        </Dialog>
    );
}
