import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslator } from '@/lib/i18n';
import type { ClientVaultEntry } from '@/types';
import { router, useForm } from '@inertiajs/react';
import { Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface Props {
    clientId: string;
    entries: ClientVaultEntry[];
    canEdit: boolean;
}

interface VaultFormData {
    name: string;
    server_address: string;
    port: string;
    username: string;
    password: string;
    description: string;
    share_in_projects: boolean;
    visibility: 'private' | 'shared';
    [key: string]: unknown;
}

const defaultFormData: VaultFormData = {
    name: '',
    server_address: '',
    port: '',
    username: '',
    password: '',
    description: '',
    share_in_projects: false,
    visibility: 'private',
};

/**
 * Vault entry list + add/edit dialog (should).
 * Password is write-only from client: sent to server, never returned in response.
 */
export default function VaultList({ clientId, entries, canEdit }: Props) {
    const t = useTranslator();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<ClientVaultEntry | null>(null);

    const { data, setData, post, put, processing, errors, reset } = useForm<VaultFormData>(defaultFormData);

    function openAdd() {
        reset();
        setEditing(null);
        setOpen(true);
    }

    function openEdit(entry: ClientVaultEntry) {
        setData({
            name: entry.name,
            server_address: entry.server_address ?? '',
            port: entry.port ?? '',
            username: entry.username ?? '',
            password: '', // never pre-fill password
            description: entry.description ?? '',
            share_in_projects: entry.share_in_projects,
            visibility: entry.visibility,
        });
        setEditing(entry);
        setOpen(true);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (editing) {
            put(route('clients.vault.update', { client: clientId, vaultEntry: editing.id }), {
                onSuccess: () => setOpen(false),
            });
        } else {
            post(route('clients.vault.store', { client: clientId }), {
                onSuccess: () => setOpen(false),
            });
        }
    }

    function handleDelete(entry: ClientVaultEntry) {
        if (!confirm(t('clients.vault.delete_confirm') ?? 'Delete this vault entry?')) return;
        router.delete(route('clients.vault.destroy', { client: clientId, vaultEntry: entry.id }), { preserveScroll: true });
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{t('clients.vault.title') ?? 'Vault'}</h3>
                {canEdit && (
                    <Button type="button" variant="outline" size="sm" onClick={openAdd} className="h-7 gap-1 text-xs">
                        <Plus className="h-3 w-3" />
                        {t('clients.vault.add') ?? 'Add Entry'}
                    </Button>
                )}
            </div>

            {entries.length === 0 ? (
                <p className="text-muted-foreground py-4 text-center text-sm">{t('clients.vault.empty') ?? 'No vault entries'}</p>
            ) : (
                <ul className="divide-border divide-y rounded-md border">
                    {entries.map((entry) => (
                        <li key={entry.id} className="flex items-center justify-between px-4 py-3">
                            <div className="flex items-center gap-2">
                                <Lock className="text-muted-foreground h-4 w-4 shrink-0" />
                                <div>
                                    <p className="text-sm font-medium">{entry.name}</p>
                                    {entry.server_address && (
                                        <p className="text-muted-foreground text-xs">
                                            {entry.server_address}
                                            {entry.port ? `:${entry.port}` : ''}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {canEdit && (
                                <div className="flex items-center gap-1">
                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(entry)}>
                                        <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive h-7 w-7"
                                        onClick={() => handleDelete(entry)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editing ? (t('clients.vault.edit') ?? 'Edit Entry') : t('clients.vault.add')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div>
                            <Label htmlFor="vault_name">{t('clients.vault.name')} *</Label>
                            <Input id="vault_name" value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                            {errors.name && <p className="text-destructive mt-1 text-xs">{errors.name}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <Label htmlFor="vault_server">{t('clients.vault.server_address')}</Label>
                                <Input id="vault_server" value={data.server_address} onChange={(e) => setData('server_address', e.target.value)} />
                            </div>
                            <div>
                                <Label htmlFor="vault_port">{t('clients.vault.port')}</Label>
                                <Input id="vault_port" value={data.port} onChange={(e) => setData('port', e.target.value)} />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="vault_username">{t('clients.vault.username')}</Label>
                            <Input id="vault_username" value={data.username} onChange={(e) => setData('username', e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="vault_password">{t('clients.vault.password')}</Label>
                            <Input
                                id="vault_password"
                                type="password"
                                autoComplete="new-password"
                                value={data.password}
                                onChange={(e) => setData('password', e.target.value)}
                                placeholder={editing ? '(unchanged)' : ''}
                            />
                        </div>
                        <div>
                            <Label htmlFor="vault_visibility">{t('clients.vault.visibility')}</Label>
                            <Select value={data.visibility} onValueChange={(v) => setData('visibility', v as 'private' | 'shared')}>
                                <SelectTrigger id="vault_visibility">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="private">{t('clients.vault.visibility_private')}</SelectItem>
                                    <SelectItem value="shared">{t('clients.vault.visibility_shared')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                                {t('clients.actions.cancel')}
                            </Button>
                            <Button type="submit" disabled={processing}>
                                {t('clients.actions.save')}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
