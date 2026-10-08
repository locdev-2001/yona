import { Link } from '@inertiajs/react';

import { t } from '../../../i18n';
import { frontendURL } from 'dashboard/helper/URLHelper';
import { dynamicTime } from 'shared/helpers/timeHelper';
import countries from 'shared/constants/countries';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import { avatarSeed } from 'shared/avatar/avatarSeed';
import CardLayout from 'dashboard/components-next/CardLayout';
import Flag from 'dashboard/components-next/flag/Flag';
import HighlightedText from './HighlightedText';

// Port từ dashboard/modules/search/components/SearchResultContactItem.vue.
interface SearchResultContactItemProps {
    id: number;
    name: string;
    email?: string | null;
    phone?: string | null;
    thumbnail?: string;
    accountId: number;
    additionalAttributes?: Record<string, unknown> | null;
    updatedAt?: number | null;
    query?: string;
}

const countriesMap = countries.reduce<Record<string, { id: string; name: string }>>((acc, country) => {
    acc[country.id] = country;

    return acc;
}, {});

export default function SearchResultContactItem({
    id,
    name,
    email,
    phone,
    thumbnail,
    accountId,
    additionalAttributes,
    updatedAt,
    query = '',
}: SearchResultContactItemProps) {
    const attributes = (additionalAttributes ?? {}) as { country?: string; country_code?: string; city?: string };
    const activeCountry =
        attributes.country || attributes.country_code
            ? (countriesMap[attributes.country ?? ''] ?? countriesMap[attributes.country_code ?? ''])
            : undefined;

    const countryDetails = activeCountry
        ? {
              countryCode: activeCountry.id,
              city: attributes.city ? `${attributes.city},` : null,
              name: activeCountry.name,
          }
        : null;

    const formattedLocation = countryDetails
        ? [countryDetails.city, countryDetails.name].filter(Boolean).join(' ')
        : '';
    const updatedAtTime = updatedAt ? dynamicTime(updatedAt) : '';

    return (
        <Link href={frontendURL(`accounts/${accountId}/contacts/${id}`)}>
            <CardLayout
                layout="row"
                className="[&>div]:justify-start [&>div]:px-4 [&>div]:py-3 [&>div]:items-start hover:bg-n-slate-2"
            >
                <Avatar seed={avatarSeed('contact', id)} name={name} src={thumbnail} size={24} roundedFull className="mt-1 flex-shrink-0" />
                <div className="min-w-0 flex flex-col items-start gap-1.5 w-full">
                    <div className="flex items-center min-w-0 justify-between gap-2 w-full">
                        <h5 className="text-sm font-medium truncate min-w-0 text-n-slate-12 py-1">
                            <HighlightedText text={name} query={query} />
                        </h5>
                        {updatedAtTime ? (
                            <span className="text-sm font-normal min-w-0 truncate text-n-slate-11">
                                {t('SEARCH.UPDATED_AT', { time: updatedAtTime })}
                            </span>
                        ) : null}
                    </div>
                    <div className="grid items-center gap-3 m-0 text-sm overflow-hidden min-w-0 grid-cols-[minmax(0,max-content)_auto_minmax(0,max-content)_auto_minmax(0,max-content)]">
                        {email ? (
                            <span className="truncate text-n-slate-11 min-w-0" title={email}>
                                <HighlightedText text={email} query={query} />
                            </span>
                        ) : null}
                        {email && phone ? <div className="w-px h-3 bg-n-slate-6 rounded" /> : null}
                        {phone ? (
                            <span className="truncate text-n-slate-11 min-w-0" title={phone}>
                                <HighlightedText text={phone} query={query} />
                            </span>
                        ) : null}
                        {(email || phone) && countryDetails ? <div className="w-px h-3 bg-n-slate-6 rounded" /> : null}
                        {countryDetails ? (
                            <span className="truncate text-n-slate-11 flex items-center gap-1 min-w-0">
                                <Flag country={countryDetails.countryCode} className="size-3 shrink-0" />
                                <span className="truncate min-w-0">{formattedLocation}</span>
                            </span>
                        ) : null}
                    </div>
                </div>
            </CardLayout>
        </Link>
    );
}
