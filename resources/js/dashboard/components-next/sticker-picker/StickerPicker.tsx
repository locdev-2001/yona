import { useCallback, useEffect, useRef, useState } from 'react';

import Button from 'dashboard/components-next/button/Button';
import Icon from 'dashboard/components-next/icon/Icon';
import Input from 'dashboard/components-next/input/Input';
import Spinner from 'dashboard/components-next/spinner/Spinner';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { isTouchOnlyDevice } from 'shared/helpers/kbd';
import StickerImage from 'shared/sticker/StickerImage';
import type { StickerBrowseParams, StickerBrowseResult, StickerItem } from 'dashboard/conversation/stickerApi';
import { t } from '../../../i18n';

// Bảng chọn sticker trung tính: không biết kênh nào, chỉ gọi `loadStickers` mà
// khung soạn truyền vào (mặc định = gần đây, `q` = tìm, `pack` = cả một bộ).

const SEARCH_DEBOUNCE_MS = 400;
const SEARCH_MIN_LENGTH = 2;

const FOCUS_RING = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-n-brand';

type LoadStatus = 'loading' | 'ready' | 'error';

interface StickerPickerProps {
    loadStickers: (params: StickerBrowseParams) => Promise<StickerBrowseResult>;
    onSelect: (sticker: StickerItem) => void;
}

function suggestedKeywords(): string[] {
    return t('CONVERSATION.STICKER_PICKER.SUGGESTED_KEYWORDS')
        .split(',')
        .map(keyword => keyword.trim())
        .filter(Boolean);
}

export default function StickerPicker({ loadStickers, onSelect }: StickerPickerProps) {
    const [searchText, setSearchText] = useState('');
    const [status, setStatus] = useState<LoadStatus>('loading');
    const [result, setResult] = useState<StickerBrowseResult | null>(null);
    const [recentPacks, setRecentPacks] = useState<StickerBrowseResult['packs']>([]);
    const [errorMessage, setErrorMessage] = useState('');
    // Response đến muộn của lượt cũ không được đè lên lượt mới hơn.
    const requestIdRef = useRef(0);
    const lastParamsRef = useRef<StickerBrowseParams>({});
    const debounceRef = useRef<number | undefined>(undefined);

    const load = useCallback(
        (params: StickerBrowseParams) => {
            const requestId = ++requestIdRef.current;
            lastParamsRef.current = params;
            setStatus('loading');

            loadStickers(params).then(
                browsed => {
                    if (requestId !== requestIdRef.current) return;
                    setResult(browsed);
                    if (browsed.source === 'recent') setRecentPacks(browsed.packs);
                    setStatus('ready');
                },
                (error: unknown) => {
                    if (requestId !== requestIdRef.current) return;
                    setErrorMessage(parseApiErrorMessage(error) ?? t('CONVERSATION.STICKER_PICKER.LOAD_FAILED'));
                    setStatus('error');
                },
            );
        },
        [loadStickers],
    );

    useEffect(() => {
        load({});
        return () => window.clearTimeout(debounceRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const changeSearch = (value: string) => {
        setSearchText(value);
        window.clearTimeout(debounceRef.current);
        const query = value.trim();

        if (query === '') {
            load({});
            return;
        }
        if ([...query].length < SEARCH_MIN_LENGTH) return;

        debounceRef.current = window.setTimeout(() => load({ q: query }), SEARCH_DEBOUNCE_MS);
    };

    const searchKeyword = (keyword: string) => {
        window.clearTimeout(debounceRef.current);
        setSearchText(keyword);
        load({ q: keyword });
    };

    const openPack = (packId: string) => {
        window.clearTimeout(debounceRef.current);
        setSearchText('');
        load({ pack: packId });
    };

    const isBrowsing = searchText.trim() === '';
    const activePackId = result?.source === 'pack' ? result.pack_id : null;
    const isRecentActive = result?.source !== 'pack';
    const stickers = result?.stickers ?? [];

    const emptyMessage = (() => {
        if (result?.source === 'search') return t('CONVERSATION.STICKER_PICKER.NO_RESULTS', { query: result.query ?? '' });
        if (result?.source === 'pack') return t('CONVERSATION.STICKER_PICKER.EMPTY_PACK');
        return t('CONVERSATION.STICKER_PICKER.EMPTY_RECENT');
    })();

    return (
        <div data-testid="sticker-picker" className="flex flex-col w-full md:w-[22rem] max-h-[26rem] text-n-slate-12">
            <div className="px-2 pt-2 pb-1.5">
                <Input
                    value={searchText}
                    size="sm"
                    type="search"
                    placeholder={t('CONVERSATION.STICKER_PICKER.SEARCH_PLACEHOLDER')}
                    aria-label={t('CONVERSATION.STICKER_PICKER.SEARCH_PLACEHOLDER')}
                    customInputClass="!ps-8"
                    // Điện thoại: bật bàn phím ngay sẽ che mất lưới "Gần đây".
                    autoFocus={!isTouchOnlyDevice()}
                    onChange={event => changeSearch(event.target.value)}
                    prefix={
                        <Icon
                            icon="i-lucide-search"
                            className="absolute z-10 -translate-y-1/2 size-4 text-n-slate-10 top-1/2 start-2.5"
                        />
                    }
                />
            </div>
            <div className="flex gap-1.5 px-2 pb-2 overflow-x-auto no-scrollbar">
                {suggestedKeywords().map(keyword => (
                    <button
                        key={keyword}
                        type="button"
                        className={`shrink-0 px-2.5 py-1 text-xs rounded-full bg-n-alpha-2 text-n-slate-12 hover:bg-n-alpha-3 transition-colors ${FOCUS_RING}`}
                        onClick={() => searchKeyword(keyword)}
                    >
                        {keyword}
                    </button>
                ))}
            </div>
            {isBrowsing ? (
                <div className="flex gap-1 px-2 pb-1.5 overflow-x-auto no-scrollbar border-b border-n-weak">
                    <button
                        type="button"
                        aria-label={t('CONVERSATION.STICKER_PICKER.RECENT')}
                        title={t('CONVERSATION.STICKER_PICKER.RECENT')}
                        aria-pressed={isRecentActive}
                        className={`flex items-center justify-center shrink-0 size-9 rounded-lg transition-colors hover:bg-n-alpha-2 ${
                            isRecentActive ? 'bg-n-alpha-2 text-n-slate-12' : 'text-n-slate-11'
                        } ${FOCUS_RING}`}
                        onClick={() => {
                            window.clearTimeout(debounceRef.current);
                            load({});
                        }}
                    >
                        <Icon icon="i-lucide-clock" className="size-4" />
                    </button>
                    {recentPacks.map(pack => (
                        <button
                            key={pack.id}
                            type="button"
                            aria-label={t('CONVERSATION.STICKER_PICKER.PACK')}
                            title={t('CONVERSATION.STICKER_PICKER.PACK')}
                            aria-pressed={activePackId === pack.id}
                            className={`flex items-center justify-center shrink-0 size-9 rounded-lg transition-colors hover:bg-n-alpha-2 ${
                                activePackId === pack.id ? 'bg-n-alpha-2' : ''
                            } ${FOCUS_RING}`}
                            onClick={() => openPack(pack.id)}
                        >
                            <img src={pack.cover_url} alt="" loading="lazy" className="size-7 object-contain" />
                        </button>
                    ))}
                </div>
            ) : null}
            <div className="flex-1 min-h-[9rem] overflow-y-auto overscroll-contain p-2">
                {status === 'loading' ? (
                    <div className="flex items-center justify-center h-32 text-n-slate-10">
                        <Spinner size={20} />
                    </div>
                ) : status === 'error' ? (
                    <div className="flex flex-col items-center justify-center gap-2 h-32 px-4 text-center">
                        <p className="m-0 text-sm text-n-slate-11">{errorMessage}</p>
                        <Button
                            label={t('CONVERSATION.STICKER_PICKER.RETRY')}
                            icon="i-lucide-refresh-cw"
                            slate
                            faded
                            xs
                            onClick={() => load(lastParamsRef.current)}
                        />
                    </div>
                ) : stickers.length === 0 ? (
                    <p className="flex items-center justify-center h-32 px-4 m-0 text-sm text-center text-n-slate-11">
                        {emptyMessage}
                    </p>
                ) : (
                    <div className="grid grid-cols-4 gap-1">
                        {stickers.map(sticker => (
                            <button
                                key={sticker.id}
                                type="button"
                                aria-label={sticker.label ?? t('CONVERSATION.STICKER_PICKER.STICKER')}
                                title={sticker.label ?? undefined}
                                className={`flex items-center justify-center w-full p-1 rounded-lg transition-colors hover:bg-n-alpha-2 active:scale-[0.97] ${FOCUS_RING}`}
                                onClick={() => onSelect(sticker)}
                            >
                                <StickerImage src={sticker.image_url} className="pointer-events-none" />
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
