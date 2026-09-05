import { useEffect, useMemo, useState } from 'react';
import { usePage } from '@inertiajs/react';
import DOMPurify from 'dompurify';
import { picoSearch } from '@chatwoot/pico-search';
import type { Schema } from 'prosemirror-model';

import CaretAnchoredPicker from 'dashboard/components/widgets/WootWriter/CaretAnchoredPicker';
import type { CaretPosition } from 'dashboard/components/widgets/WootWriter/CaretAnchoredPicker';
import { fetchCannedResponses, useCannedResponses } from 'dashboard/composables/useCannedResponses';
import { stripUnsupportedFormatting } from 'dashboard/helper/editorHelper';
import MessageFormatter, { getPlainText } from 'shared/helpers/MessageFormatter';
import { t } from '../../../../i18n';
import type { DashboardPageProps } from '../../../types';

// Port từ dashboard/components/widgets/conversation/CannedResponse.vue.
// Bỏ `variables` (biến {{...}} thuộc D1) → nội dung xem trước = nội dung chèn.

const SNIPPET_LEAD = 24;
const HIGHLIGHT_CLASS = 'text-n-blue-text';

// highlightContent của shared/composables/useMessageFormatter.js.
function highlightContent(content: string, searchTerm: string, highlightClass: string): string {
    const plainTextContent = getPlainText(content);
    const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    return plainTextContent.replace(new RegExp(`(${escapedSearchTerm})`, 'ig'), `<span class="${highlightClass}">$1</span>`);
}

interface CannedResponseProps {
    caretPosition: CaretPosition | null;
    searchKey: string;
    schema: Schema | null;
    onReplace: (content: string) => void;
    onClose: () => void;
    onRemoveTrigger: () => void;
}

interface CannedPickerItem {
    id: number;
    content: string;
    resolved: string;
    label: string;
    title: string;
    subtitle: string;
}

export default function CannedResponse({
    caretPosition,
    searchKey,
    schema,
    onReplace,
    onClose,
    onRemoveTrigger,
}: CannedResponseProps) {
    const { currentAccount } = usePage<DashboardPageProps>().props;
    const accountId = currentAccount.id;
    const { records, isFetching } = useCannedResponses(accountId);
    // Ký tự kích hoạt có thể đã kèm chữ sẵn (draft, hoặc con trỏ lùi lại vào nó).
    const [searchQuery, setSearchQuery] = useState(searchKey);

    useEffect(() => {
        fetchCannedResponses(accountId, { force: true });
    }, [accountId]);

    const searchTerm = searchQuery.trim();

    const preparedRecords = useMemo(
        () =>
            records.map(({ id, short_code: shortCode, content }) => {
                const resolved = schema ? stripUnsupportedFormatting(content, schema) : content;
                return {
                    id,
                    content,
                    resolved,
                    shortCode,
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
        }));
    }, [preparedRecords, searchTerm]);

    return (
        <CaretAnchoredPicker<CannedPickerItem>
            caretPosition={caretPosition}
            items={items}
            search={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder={t('COMBOBOX.SEARCH_PLACEHOLDER')}
            isLoading={isFetching}
            emptyLabel={
                searchTerm ? t('COMBOBOX.EMPTY_SEARCH_RESULTS', { searchTerm }) : t('COMBOBOX.EMPTY_STATE')
            }
            onSelect={item => onReplace(item.content)}
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
