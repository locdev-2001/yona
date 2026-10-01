import { Link } from '@inertiajs/react';
import { ICONS } from 'dashboard/icons';

import Avatar from 'dashboard/components-next/avatar/Avatar';
import Button from 'dashboard/components-next/button/Button';
import BaseTableCell from 'dashboard/components-next/table/BaseTableCell';
import BaseTableRow from 'dashboard/components-next/table/BaseTableRow';
import { accountScopedUrl } from 'dashboard/helper/URLHelper';
import { t } from '../../../i18n';
import type { Macro, MacroAuthor } from './types';

// Port từ settings/macros/MacrosTableRow.vue
interface Props {
    macro: Macro;
    accountId: number;
    canManagePublicMacros?: boolean;
    onDelete: () => void;
}

const authorName = (author?: MacroAuthor | null): string => author?.available_name ?? author?.email ?? '';

function AuthorCell({ author }: { author?: MacroAuthor | null }) {
    if (!author) return <span className="text-body-main text-n-slate-11">--</span>;

    const name = authorName(author);
    return (
        <div className="flex items-center gap-2 min-w-0">
            <Avatar name={name} size={24} roundedFull className="flex-shrink-0" />
            <span className="text-body-main text-n-slate-12 truncate">{name}</span>
        </div>
    );
}

export default function MacrosTableRow({ macro, accountId, canManagePublicMacros = true, onDelete }: Props) {
    const visibilityLabel = t(
        macro.visibility === 'global'
            ? 'MACROS.EDITOR.VISIBILITY.GLOBAL.LABEL'
            : 'MACROS.EDITOR.VISIBILITY.PERSONAL.LABEL',
    );
    const canManageMacro = canManagePublicMacros || macro.visibility !== 'global';
    const editTooltip = canManageMacro ? t('MACROS.EDIT.TOOLTIP') : t('MACROS.VIEW.TOOLTIP');

    return (
        <BaseTableRow>
            <BaseTableCell className="max-w-0 min-w-0">
                <span className="text-body-main text-n-slate-12 truncate block">{macro.name}</span>
            </BaseTableCell>

            <BaseTableCell className="max-w-0">
                <AuthorCell author={macro.created_by} />
            </BaseTableCell>

            <BaseTableCell className="max-w-0">
                <AuthorCell author={macro.updated_by} />
            </BaseTableCell>

            <BaseTableCell className="max-w-0">
                <span className="text-body-main text-n-slate-12 whitespace-nowrap">{visibilityLabel}</span>
            </BaseTableCell>

            <BaseTableCell align="end" className="w-24">
                <div className="flex gap-3 justify-end flex-shrink-0">
                    <Link href={accountScopedUrl(accountId, `settings/macros/${macro.id}/edit`)}>
                        <Button title={editTooltip} icon={ICONS.edit} slate sm />
                    </Link>
                    {canManageMacro ? (
                        <Button
                            title={t('MACROS.DELETE.TOOLTIP')}
                            icon={ICONS.delete}
                            slate
                            sm
                            className="hover:enabled:text-n-ruby-11 hover:enabled:bg-n-ruby-2"
                            onClick={onDelete}
                        />
                    ) : null}
                </div>
            </BaseTableCell>
        </BaseTableRow>
    );
}
