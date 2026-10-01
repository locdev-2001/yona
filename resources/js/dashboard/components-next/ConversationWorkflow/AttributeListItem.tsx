import Button from 'dashboard/components-next/button/Button';
import Icon from 'dashboard/components-next/icon/Icon';
import Label from 'dashboard/components-next/label/Label';
import AttributeBadge from 'dashboard/components-next/CustomAttributes/AttributeBadge';
import type { AttributeBadgeType } from 'dashboard/components-next/CustomAttributes/AttributeBadge';
import { ICONS } from 'dashboard/icons';

// Port từ dashboard/components-next/ConversationWorkflow/AttributeListItem.vue
export interface AttributeListEntry {
    id: number;
    label: string;
    type: string;
    description?: string | null;
    attribute_description?: string | null;
}

const ICON_BY_TYPE: Record<string, string> = {
    text: 'i-lucide-menu',
    checkbox: 'i-lucide-circle-check-big',
    list: 'i-lucide-list',
    date: 'i-lucide-calendar',
    link: 'i-lucide-link',
    number: 'i-lucide-hash',
};

interface AttributeListItemProps {
    attribute: AttributeListEntry;
    badges?: { type: AttributeBadgeType }[];
    onEdit: (attribute: AttributeListEntry) => void;
    onDelete: (attribute: AttributeListEntry) => void;
}

export default function AttributeListItem({ attribute, badges = [], onEdit, onDelete }: AttributeListItemProps) {
    const attributeIcon = ICON_BY_TYPE[attribute.type?.toLowerCase()] || 'i-lucide-menu';
    const description = attribute.attribute_description || attribute.description;

    return (
        <div className="flex flex-col py-4 min-w-0">
            <div className="flex justify-between flex-row items-center gap-4 min-w-0">
                <div className="flex items-center gap-4 min-w-0">
                    <div className="flex items-center flex-shrink-0 size-10 justify-center rounded-xl outline outline-1 outline-n-weak -outline-offset-1">
                        <Icon icon={attributeIcon} className="size-4 text-n-slate-11" />
                    </div>
                    <div className="flex flex-col gap-1.5 items-start min-w-0 overflow-hidden">
                        <div className="flex items-center gap-2 min-w-0">
                            <h4 className="text-heading-3 truncate text-n-slate-12 min-w-0">{attribute.label}</h4>
                            <div className="flex items-center gap-1.5">
                                <Label label={attribute.type} compact />
                                {badges.map(badge => (
                                    <AttributeBadge key={badge.type} type={badge.type} />
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-[auto_1fr] items-center gap-1.5">
                            <Icon icon="i-lucide-align-left" className="size-3.5 text-n-slate-11" />
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-body-main text-n-slate-11 truncate">{description}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex gap-3 justify-end flex-shrink-0">
                    <Button icon={ICONS.edit} slate sm onClick={() => onEdit(attribute)} />
                    <Button
                        icon={ICONS.delete}
                        slate
                        sm
                        className="hover:enabled:text-n-ruby-11 hover:enabled:bg-n-ruby-2"
                        onClick={() => onDelete(attribute)}
                    />
                </div>
            </div>
        </div>
    );
}
