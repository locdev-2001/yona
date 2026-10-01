import { useEffect, useMemo } from 'react';
import { Link, usePage } from '@inertiajs/react';
import DOMPurify from 'dompurify';
import { picoSearch } from '@ext/pico-search';
import type { Schema } from 'prosemirror-model';

import CaretAnchoredPicker from 'dashboard/components/widgets/WootWriter/CaretAnchoredPicker';
import type { CaretPosition, PickerCloseReason } from 'dashboard/components/widgets/WootWriter/CaretAnchoredPicker';
import { fetchCannedResponses, markCannedResponseUsed, useCannedResponses } from 'dashboard/composables/useCannedResponses';
import { stripUnsupportedFormatting } from 'dashboard/helper/editorHelper';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import MessageFormatter, { getPlainText } from 'shared/helpers/MessageFormatter';
import { t } from '../../../../i18n';
import type { DashboardPageProps } from '../../../types';

// Port từ dashboard/components/widgets/conversation/CannedResponse.vue.
// Bỏ `variables` (biến {{...}} thuộc D1) → nội dung xem trước = nội dung chèn.
//
// Lệch có chủ đích so với v4.17.1 (reports/ux-deviations.md, mục "Bảng câu trả
// lời mẫu"): bảng KHÔNG dựng ô tìm kiếm riêng và không cướp focus — từ khoá là
// phần chữ gõ ngay sau `/` trong ô soạn. Nhờ vậy Escape đóng, xoá `/` đóng, và
// ký tự `/` không còn kẹt lại khi người dùng gõ nhầm.

const SNIPPET_LEAD = 24;
const HIGHLIGHT_CLASS = 'text-n-blue-text';

// highlightContent của shared/composables/useMessageFormatter.js.
function highlightContent(content: string, searchTerm: string, highlightClass: string): string {
    const plainTextContent = getPlainText(content);
    const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    return plainTextContent.replace(new RegExp(`(${escapedSearchTerm})`, 'ig'), `<span class="${highlightClass}">$1</span>`);
}

export interface CannedCardSelection {
    contentType: string;
    content: string | null;
    contentAttributes: Record<string, unknown>;
}

interface CannedResponseProps {
    caretPosition: CaretPosition | null;
    searchKey: string;
    schema: Schema | null;
    boundaryElement?: HTMLElement | null;
    onReplace: (content: string) => void;
    // Câu trả lời mẫu mang thẻ (content_type khác rỗng): chọn là gửi thẻ, không
    // chèn chữ vào ô soạn — xem Editor.tsx.
    onSelectCard: (selection: CannedCardSelection) => void;
    onClose: (reason: PickerCloseReason) => void;
    onRemoveTrigger: () => void;
}

interface CannedPickerItem {
    id: number;
    content: string;
    resolved: string;
    label: string;
    title: string;
    subtitle: string;
    contentType: string | null;
    contentAttributes: Record<string, unknown> | null;
}

export default function CannedResponse({
    caretPosition,
    searchKey,
    schema,
    boundaryElement = null,
    onReplace,
    onSelectCard,
    onClose,
    onRemoveTrigger,
}: CannedResponseProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const { records, isFetching } = useCannedResponses(accountId);

    useEffect(() => {
        fetchCannedResponses(accountId, { force: true });
    }, [accountId]);

    // Từ khoá = chữ gõ sau `/` trong ô soạn (plugin gợi ý cập nhật theo từng phím).
    const searchTerm = searchKey.trim();

    const preparedRecords = useMemo(
        () =>
            records.map(({ id, short_code: shortCode, content, content_type: contentType, content_attributes: contentAttributes }) => {
                const resolved = schema ? stripUnsupportedFormatting(content, schema) : content;
                return {
                    id,
                    content,
                    resolved,
                    shortCode,
                    contentType: contentType ?? null,
                    contentAttributes: contentAttributes ?? null,
                    plainText: getPlainText(resolved).replace(/\s+/g, ' ').trim(),
                };
            }),
        [records, schema],
    );

    const items = useMemo<CannedPickerItem[]>(() => {
        const filtered = searchTerm
            ? picoSearch(preparedRecords, searchTerm, [{ name: 'shortCode', weight: 1 }, 'plainText'])
            : preparedRecords;

        // Khoảng trắng rỗng làm regex của highlightContent khớp ở mọi vị trí.
        const highlight = (text: string) => (searchTerm ? highlightContent(text, searchTerm, HIGHLIGHT_CLASS) : text);
        const buildSnippet = (text: string) => {
            if (!searchTerm) return text;
            const index = text.toLowerCase().indexOf(searchTerm.toLowerCase());
            return index <= SNIPPET_LEAD ? text : `…${text.slice(index - SNIPPET_LEAD)}`;
        };

        return filtered.map(record => ({
            id: record.id,
            content: record.content,
            resolved: record.resolved,
            label: `/${record.shortCode}`,
            title: highlight(`/${record.shortCode}`),
            subtitle: highlight(buildSnippet(record.plainText)),
            contentType: record.contentType,
            contentAttributes: record.contentAttributes,
        }));
    }, [preparedRecords, searchTerm]);

    // Chưa có câu trả lời mẫu nào thì dẫn thẳng tới chỗ tạo, đừng chỉ báo "không
    // tìm thấy" (finding UX #3 — cùng câu chữ với empty state trang Cài đặt).
    const renderEmpty = () => (
        <span className="flex flex-wrap items-center gap-1">
            <span>{t('CANNED_MGMT.LIST.404')}</span>
            <Link
                href={accountScopedUrl(accountId, 'settings/canned-response/list')}
                className="font-medium underline text-n-blue-text"
            >
                {t('CANNED_MGMT.HEADER_BTN_TXT')}
            </Link>
        </span>
    );

    return (
        <CaretAnchoredPicker<CannedPickerItem>
            caretPosition={caretPosition}
            items={items}
            search={searchKey}
            onSearchChange={() => undefined}
            searchPlaceholder={t('COMBOBOX.SEARCH_PLACEHOLDER')}
            isLoading={isFetching}
            keepFocusInEditor
            boundaryElement={boundaryElement}
            emptyLabel={
                searchTerm ? t('COMBOBOX.EMPTY_SEARCH_RESULTS', { searchTerm }) : t('COMBOBOX.EMPTY_STATE')
            }
            renderEmpty={records.length ? undefined : renderEmpty}
            onSelect={item => {
                markCannedResponseUsed(accountId, item.id);
                if (item.contentType) {
                    onSelectCard({ contentType: item.contentType, content: item.content || null, contentAttributes: item.contentAttributes ?? {} });
                } else {
                    onReplace(item.content);
                }
            }}
            onClose={onClose}
            onRemoveTrigger={onRemoveTrigger}
            renderPreview={item => (
                <div
                    className="px-4 py-3 prose prose-bubble !max-w-none prose-a:text-n-brand"
                    dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(new MessageFormatter(item?.resolved || '').formattedMessage),
                    }}
                />
            )}
        />
    );
}
