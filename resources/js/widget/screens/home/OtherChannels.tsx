import { t } from '../../i18n';
import type { WidgetSettingsConfig } from '../../types';
import { PLATFORM_LOGOS, type PlatformLogo } from '../../ui/platformLogos';
import Row from '../../ui/Row';

type Channel = WidgetSettingsConfig['other_channels'][number];

const hrefOf = (channel: Channel): string =>
    channel.kind === 'hotline' ? `tel:${channel.value.replace(/[^\d+]/g, '')}` : channel.kind === 'email' ? `mailto:${channel.value}` : channel.value;

function ChannelIcon({ kind }: { kind: Channel['kind'] }) {
    if (kind in PLATFORM_LOGOS) {
        return (
            <span
                className="flex size-9 flex-none items-center justify-center rounded-[10px] border border-[var(--yona-chat-line-card)] bg-white p-[7px] [&>svg]:size-full"
                // Logo thesvg là SVG tĩnh trong mã nguồn, không phải dữ liệu người dùng.
                dangerouslySetInnerHTML={{ __html: PLATFORM_LOGOS[kind as PlatformLogo] }}
            />
        );
    }

    const icon = kind === 'hotline' ? 'i-lucide-phone' : kind === 'email' ? 'i-lucide-mail' : 'i-lucide-link';

    return (
        <span className="flex size-9 flex-none items-center justify-center rounded-[10px] border border-[var(--yona-chat-line-card)] bg-white text-[var(--yona-chat-ink)]">
            <span className={`${icon} size-[18px]`} />
        </span>
    );
}

/** Khối "Nhắn qua kênh khác": danh sách dọc, logo nền tảng thesvg, mở ra ngoài widget. */
export default function OtherChannels({ channels, shopName }: { channels: Channel[]; shopName: string }) {
    const enabled = channels.filter(channel => channel.enabled);
    if (!enabled.length) return null;

    return (
        <section className="flex flex-none flex-col gap-[10px] px-5 pb-2 pt-4">
            <h2 className="m-0 text-[13px] font-semibold text-[var(--yona-chat-ink)]">{t('HOME.OTHER_CHANNELS')}</h2>
            <div className="flex flex-col">
                {enabled.map(channel => {
                    const key = channel.kind.toUpperCase();

                    return (
                        <Row
                            key={`${channel.kind}-${channel.value}`}
                            href={hrefOf(channel)}
                            trailing={<span className="i-lucide-external-link size-4 text-[var(--yona-chat-ink-muted)]" />}
                        >
                            <ChannelIcon kind={channel.kind} />
                            <span className="flex min-w-0 flex-1 flex-col">
                                <span className="font-medium">{channel.label || t(`HOME.CHANNEL_NAME.${key}`)}</span>
                                <span className="truncate text-[12px] text-[var(--yona-chat-ink-soft)]">
                                    {channel.kind === 'hotline' || channel.kind === 'email' ? channel.value : t(`HOME.CHANNEL_HINT.${key}`, { name: shopName })}
                                </span>
                            </span>
                        </Row>
                    );
                })}
            </div>
        </section>
    );
}
