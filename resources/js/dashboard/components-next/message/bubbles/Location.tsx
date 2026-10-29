import Icon from 'dashboard/components-next/icon/Icon';
import { EXTERNAL_LINK_PROPS } from 'shared/helpers/externalLinks';

import { t } from '../../../../i18n';
import BaseBubble from './Base';
import { useMessageContext } from '../provider';
import type { MessageAttachment } from '../helpers/attachments';

// Thẻ một địa điểm, chung mọi kênh: tên (nếu kênh có), toạ độ và nút mở bản đồ. Kênh có link
// bản đồ riêng (data_url) thì mở link đó, không có thì dựng link bản đồ từ toạ độ.

const MAP_SEARCH_URL = 'https://www.google.com/maps/search/?api=1&query=';
const COORDINATE_DECIMALS = 6;

type LocationAttachment = MessageAttachment & {
    coordinates_lat?: number | null;
    coordinates_long?: number | null;
};

function formatCoordinates(lat: unknown, lng: unknown): string {
    const isUsable = typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);

    return isUsable ? `${lat.toFixed(COORDINATE_DECIMALS)}, ${lng.toFixed(COORDINATE_DECIMALS)}` : '';
}

export default function LocationBubble() {
    const { attachments } = useMessageContext();
    const location = (attachments[0] ?? {}) as LocationAttachment;
    const coordinates = formatCoordinates(location.coordinates_lat, location.coordinates_long);
    const mapUrl = location.data_url || (coordinates ? `${MAP_SEARCH_URL}${encodeURIComponent(coordinates.replace(' ', ''))}` : '');
    const title = location.fallback_title?.trim() || t('CONTACT_PANEL.LOCATION');

    return (
        <BaseBubble className="w-[280px] !max-w-full p-3" dataBubbleName="location">
            <div className="flex flex-col gap-3">
                <div className="flex items-start gap-2.5 min-w-0">
                    <span className="flex flex-shrink-0 items-center justify-center size-9 rounded-full bg-n-ruby-3 text-n-ruby-11">
                        <Icon icon="i-lucide-map-pin" className="size-[1.125rem]" />
                    </span>
                    <span className="flex flex-col flex-1 min-w-0 gap-0.5 pt-0.5">
                        <span className="text-sm font-medium leading-5 text-n-slate-12 line-clamp-2 break-words">{title}</span>
                        {coordinates ? <span className="text-xs leading-4 text-n-slate-11 tabular-nums">{coordinates}</span> : null}
                    </span>
                </div>
                {mapUrl ? (
                    <a
                        href={mapUrl}
                        {...EXTERNAL_LINK_PROPS}
                        className="flex items-center justify-center gap-1.5 h-8 rounded-lg bg-n-solid-3 border border-n-container text-xs font-medium text-n-slate-12 hover:bg-n-solid-2"
                    >
                        <Icon icon="i-lucide-map" className="size-3.5" />
                        {t('COMPONENTS.LOCATION_BUBBLE.SEE_ON_MAP')}
                    </a>
                ) : null}
            </div>
        </BaseBubble>
    );
}
