import ShowMore from 'dashboard/components/widgets/ShowMore';
import UserAvatarWithName from 'dashboard/components/widgets/UserAvatarWithName';
import Pagination from 'dashboard/components/table/Pagination';
import { useTableModel } from 'dashboard/components/table/useTableModel';
import { dynamicTime, messageStamp } from 'shared/helpers/timeHelper';
import { CSAT_RATINGS } from 'shared/constants/messages';
import { t } from '../../../i18n';
import { csatSelectors, useCsatState } from '../csatStore';
import CsatContactCell from './CsatContactCell';
import CsatEmptyState from './CsatEmptyState';
import CsatTableLoader from './CsatTableLoader';

// Port từ reports/components/CsatTable.vue.
// Cột "mở rộng" (ghi chú đánh giá) là tính năng cloud/EE — không port; bản
// tự host cũng không hiện cột đó.

const PAGE_SIZE = 25;

// @tanstack/table đặt bề rộng mặc định 150px cho cột không khai size.
const COLUMN_WIDTHS = [150, 120, 500, 160];

interface CsatTableProps {
    pageIndex: number;
    onPageChange: (pageIndex: number) => void;
}

const getRatingData = (rating: number) => CSAT_RATINGS.find(item => item.value === rating);

export default function CsatTable({ pageIndex, onPageChange }: CsatTableProps) {
    const responses = useCsatState(csatSelectors.responses);
    const metrics = useCsatState(csatSelectors.metrics);
    const uiFlags = useCsatState(csatSelectors.uiFlags);

    const table = useTableModel(responses, PAGE_SIZE, {
        rowCount: metrics.totalResponseCount,
        pageIndex,
        onPageIndexChange: onPageChange,
    });

    const headers = [
        t('CSAT_REPORTS.TABLE.HEADER.CONTACT_NAME'),
        t('CSAT_REPORTS.TABLE.HEADER.RATING'),
        t('CSAT_REPORTS.TABLE.HEADER.FEEDBACK_TEXT'),
        t('CSAT_REPORTS.TABLE.HEADER.HANDLED_BY'),
    ];

    return (
        <div className="panel-surface rounded-xl overflow-hidden">
            {uiFlags.isFetching ? (
                <CsatTableLoader />
            ) : responses.length ? (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="border-b border-n-weak">
                            <tr>
                                {headers.map((header, index) => (
                                    <th
                                        key={header}
                                        style={{ width: `${COLUMN_WIDTHS[index]}px` }}
                                        className="text-left py-3 px-5 font-medium text-sm text-n-slate-12"
                                    >
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-n-weak">
                            {responses.map(response => {
                                const rating = getRatingData(response.rating);
                                return (
                                    <tr
                                        key={response.id}
                                        className="group hover:bg-n-slate-2 transition-colors"
                                    >
                                        <td className="py-4 px-5">
                                            <CsatContactCell
                                                contact={response.contact}
                                                conversationId={response.conversation_id}
                                                createdAgo={dynamicTime(response.created_at)}
                                                createdAt={messageStamp(response.created_at, 'LLL d yyyy, h:mm a')}
                                            />
                                        </td>
                                        <td className="py-4 px-5">
                                            <div
                                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg"
                                                style={{ backgroundColor: `${rating?.color}20` }}
                                            >
                                                <span className="text-sm font-medium text-n-slate-12 truncate">
                                                    {rating ? t(rating.translationKey) : ''}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-5">
                                            {!response.feedback_message ? (
                                                <span className="text-n-slate-10 italic text-sm">
                                                    {t('CSAT_REPORTS.NO_FEEDBACK')}
                                                </span>
                                            ) : (
                                                <div className="text-sm text-n-slate-12">
                                                    <ShowMore text={response.feedback_message} limit={100} />
                                                </div>
                                            )}
                                        </td>
                                        <td className="py-4 px-5">
                                            {response.assigned_agent ? (
                                                <UserAvatarWithName user={response.assigned_agent} size={28} />
                                            ) : (
                                                <span className="text-n-slate-10 text-sm italic">
                                                    {t('CSAT_REPORTS.NO_AGENT')}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                <CsatEmptyState
                    title={t('CSAT_REPORTS.NO_RECORDS')}
                    description={t('CSAT_REPORTS.NO_RECORDS_DESCRIPTION')}
                />
            )}

            {Boolean(metrics.totalResponseCount) && (
                <div className="px-6 py-4">
                    <Pagination table={table} />
                </div>
            )}
        </div>
    );
}
