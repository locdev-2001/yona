import HeadingSmall from '@/components/heading-small';
import CustomFieldForm from '@/components/settings/custom-field-form';
import type { CustomFieldDefinition } from '@/components/shared/custom-fields/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { useTranslator } from '@/lib/i18n';
import type { BreadcrumbItem } from '@/types';
import { Head, router } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface PaginatedDefinitions {
    data: CustomFieldDefinition[];
    current_page: number;
    last_page: number;
}

interface Props {
    definitions: PaginatedDefinitions;
    entityTypes: string[];
    fieldTypes: string[];
    optionTypes: string[];
    activeEntity: string;
}

/**
 * Admin page — list + filter + CRUD for custom-field definitions.
 * Filter by entity_type triggers a partial Inertia reload.
 */
export default function CustomFieldsIndex({ definitions, entityTypes, fieldTypes, optionTypes, activeEntity }: Props) {
    const t = useTranslator();
    const [formOpen, setFormOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<CustomFieldDefinition | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<CustomFieldDefinition | null>(null);

    const breadcrumbs: BreadcrumbItem[] = [{ title: t('custom_fields.title'), href: '/settings/custom-fields' }];

    const changeEntity = (entityType: string) => {
        router.get(route('custom-fields.index'), { entity_type: entityType }, { preserveScroll: true, replace: true });
    };

    const openCreate = () => {
        setEditTarget(null);
        setFormOpen(true);
    };

    const openEdit = (definition: CustomFieldDefinition) => {
        setEditTarget(definition);
        setFormOpen(true);
    };

    const confirmDelete = () => {
        if (!deleteTarget) return;
        router.delete(route('custom-fields.destroy', deleteTarget.id), {
            preserveScroll: true,
            onSuccess: () => setDeleteTarget(null),
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={t('custom_fields.title')} />

            <SettingsLayout>
                <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <HeadingSmall title={t('custom_fields.title')} description={t('custom_fields.subtitle')} />
                        <Button size="sm" onClick={openCreate}>
                            <Plus className="mr-2 size-4" />
                            {t('custom_fields.actions.add')}
                        </Button>
                    </div>

                    {/* Entity type filter */}
                    <div className="flex items-center gap-3">
                        <span className="text-muted-foreground text-sm">{t('custom_fields.fields.entity_type')}:</span>
                        <Select value={activeEntity} onValueChange={changeEntity}>
                            <SelectTrigger className="w-52">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {entityTypes.map((et) => (
                                    <SelectItem key={et} value={et}>
                                        {t(`custom_fields.entity_types.${et}`)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Definitions table */}
                    {definitions.data.length === 0 ? (
                        <p className="text-muted-foreground text-sm">{t('custom_fields.empty')}</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('custom_fields.fields.name')}</TableHead>
                                    <TableHead>{t('custom_fields.fields.field_type')}</TableHead>
                                    <TableHead>{t('custom_fields.fields.slug')}</TableHead>
                                    <TableHead>{t('custom_fields.fields.required')}</TableHead>
                                    <TableHead>{t('custom_fields.fields.active')}</TableHead>
                                    <TableHead>{t('custom_fields.fields.order')}</TableHead>
                                    <TableHead />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {definitions.data.map((definition) => (
                                    <TableRow key={definition.id}>
                                        <TableCell className="font-medium">{definition.name}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {t(`custom_fields.field_types.${definition.field_type}`)}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground font-mono text-xs">{definition.slug}</TableCell>
                                        <TableCell>
                                            {definition.required ? (
                                                <span className="text-xs font-medium text-green-600">✓</span>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {definition.active ? (
                                                <span className="text-xs font-medium text-green-600">✓</span>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">{definition.field_order}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => openEdit(definition)} className="h-8 w-8 p-0">
                                                    <Pencil className="size-3.5" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(definition)} className="h-8 w-8 p-0">
                                                    <Trash2 className="text-destructive size-3.5" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </SettingsLayout>

            {/* Create / Edit dialog */}
            <CustomFieldForm
                open={formOpen}
                onClose={() => setFormOpen(false)}
                entityTypes={entityTypes}
                fieldTypes={fieldTypes}
                definition={editTarget}
                storeRoute={route('custom-fields.store')}
                updateRoute={editTarget ? route('custom-fields.update', editTarget.id) : undefined}
            />

            {/* Delete confirmation dialog */}
            <Dialog open={deleteTarget !== null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('custom_fields.actions.delete')}</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm">{t('custom_fields.actions.delete_confirm')}</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                            {t('custom_fields.actions.cancel')}
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete}>
                            {t('custom_fields.actions.delete')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
