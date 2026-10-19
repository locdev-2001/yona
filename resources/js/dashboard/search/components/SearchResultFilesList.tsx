import { t } from '../../../i18n';
import SearchResultFileItem from './SearchResultFileItem';
import SearchResultSection from './SearchResultSection';
import type { SearchFile } from '../types';

interface SearchResultFilesListProps {
    files: SearchFile[];
    accountId: number;
    query?: string;
    isFetching?: boolean;
    showTitle?: boolean;
    className?: string;
}

export default function SearchResultFilesList({
    files,
    accountId,
    query = '',
    isFetching = false,
    showTitle = true,
    className = '',
}: SearchResultFilesListProps) {
    return (
        <SearchResultSection
            title={t('SEARCH.SECTION.FILES')}
            empty={!files.length}
            query={query}
            showTitle={showTitle}
            isFetching={isFetching}
            className={className}
        >
            {files.length ? (
                <ul className="space-y-3 list-none">
                    {files.map(file => (
                        <li key={file.id}>
                            <SearchResultFileItem file={file} accountId={accountId} query={query} />
                        </li>
                    ))}
                </ul>
            ) : null}
        </SearchResultSection>
    );
}
