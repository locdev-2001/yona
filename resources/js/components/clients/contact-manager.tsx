import CustomFieldsSection from '@/components/custom-fields/custom-fields-section';
import type { CustomFieldDefinition } from '@/components/custom-fields/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTranslator } from '@/lib/i18n';
import type { Contact, CustomFieldValue } from '@/types';
import { router, useForm } from '@inertiajs/react';
import { Pencil, Star, Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';

interface Props {
    clientId: string;
    contacts: Contact[];
    contactFieldDefs: CustomFieldDefinition[];
    canEdit: boolean;
}

interface ContactFormData {
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    title: string;
    language: string;
    make_primary: boolean;
    custom_fields: Record<string, CustomFieldValue>;
}

/**
 * Manages the contact list for a client. Shows contacts, primary badge,
 * set-primary action, add/edit dialog with custom fields.
 */
export default function ContactManager({ clientId, contacts, contactFieldDefs, canEdit }: Props) {
    const t = useTranslator();
    const [open, setOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);

    const { data, setData, post, put, processing, errors, reset } = useForm<ContactFormData>({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        title: '',
        language: '',
        make_primary: false,
        custom_fields: {},
    });

    function openAdd() {
        reset();
        setEditingContact(null);
        setOpen(true);
    }

    function openEdit(contact: Contact) {
        setData({
            first_name: contact.first_name,
            last_name: contact.last_name ?? '',
            email: contact.email ?? '',
            phone: contact.phone ?? '',
            title: contact.title ?? '',
            language: contact.language ?? '',
            make_primary: contact.is_primary,
            custom_fields: contact.custom_fields ?? {},
        });
        setEditingContact(contact);
        setOpen(true);
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();

        if (editingContact) {
            put(route('contacts.update', { contact: editingContact.id }), {
                onSuccess: () => setOpen(false),
            });
        } else {
            post(route('clients.contacts.store', { client: clientId }), {
                onSuccess: () => setOpen(false),
            });
        }
    }

    function handleSetPrimary(contact: Contact) {
        router.post(route('contacts.primary', { contact: contact.id }), {}, { preserveScroll: true });
    }

    function handleDelete(contact: Contact) {
        if (!confirm(t('clients.contact.delete_confirm') ?? 'Delete this contact?')) return;
        router.delete(route('contacts.destroy', { contact: contact.id }), { preserveScroll: true });
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">{t('clients.contact.title') ?? 'Contacts'}</h3>
                {canEdit && (
                    <Button type="button" variant="outline" size="sm" onClick={openAdd} className="h-7 gap-1 text-xs">
                        <UserPlus className="h-3 w-3" />
                        {t('clients.contact.add') ?? 'Add Contact'}
                    </Button>
                )}
            </div>

            {contacts.length === 0 ? (
                <p className="text-muted-foreground py-4 text-center text-sm">{t('clients.contact.none') ?? 'No contacts yet'}</p>
            ) : (
                <ul className="divide-border divide-y rounded-md border">
                    {contacts.map((contact) => (
                        <li key={contact.id} className="flex items-center justify-between px-4 py-3">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="truncate text-sm font-medium">
                                        {contact.first_name} {contact.last_name}
                                    </span>
                                    {contact.is_primary && (
                                        <Badge variant="default" className="h-5 text-xs">
                                            {t('clients.contact.is_primary') ?? 'Primary'}
                                        </Badge>
                                    )}
                                </div>
                                {contact.email && <p className="text-muted-foreground truncate text-xs">{contact.email}</p>}
                                {contact.title && <p className="text-muted-foreground text-xs">{contact.title}</p>}
                            </div>

                            {canEdit && (
                                <div className="ml-2 flex shrink-0 items-center gap-1">
                                    {!contact.is_primary && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            title={t('clients.contact.set_primary') ?? 'Set Primary'}
                                            onClick={() => handleSetPrimary(contact)}
                                        >
                                            <Star className="h-3.5 w-3.5" />
                                        </Button>
                                    )}
                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(contact)}>
                                        <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive hover:text-destructive h-7 w-7"
                                        onClick={() => handleDelete(contact)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            )}

            {/* Add / Edit dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingContact ? t('clients.contact.edit') : t('clients.contact.add')}</DialogTitle>
                        <DialogDescription>{t('clients.contact.dialog_description') ?? 'Fill in the contact details below.'}</DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="contact_first_name">{t('clients.contact.first_name')} *</Label>
                                <Input
                                    id="contact_first_name"
                                    value={data.first_name}
                                    onChange={(e) => setData('first_name', e.target.value)}
                                    required
                                />
                                {errors.first_name && <p className="text-destructive mt-1 text-xs">{errors.first_name}</p>}
                            </div>
                            <div>
                                <Label htmlFor="contact_last_name">{t('clients.contact.last_name')}</Label>
                                <Input id="contact_last_name" value={data.last_name} onChange={(e) => setData('last_name', e.target.value)} />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="contact_email">{t('clients.contact.email')}</Label>
                            <Input id="contact_email" type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} />
                            {errors.email && <p className="text-destructive mt-1 text-xs">{errors.email}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <Label htmlFor="contact_phone">{t('clients.contact.phone')}</Label>
                                <Input id="contact_phone" value={data.phone} onChange={(e) => setData('phone', e.target.value)} />
                            </div>
                            <div>
                                <Label htmlFor="contact_title">{t('clients.contact.job_title')}</Label>
                                <Input id="contact_title" value={data.title} onChange={(e) => setData('title', e.target.value)} />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="contact_language">{t('clients.contact.language')}</Label>
                            <Select value={data.language} onValueChange={(v) => setData('language', v)}>
                                <SelectTrigger id="contact_language">
                                    <SelectValue placeholder="-" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="vi">Tiếng Việt</SelectItem>
                                    <SelectItem value="en">English</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {contactFieldDefs.length > 0 && (
                            <CustomFieldsSection
                                definitions={contactFieldDefs}
                                values={data.custom_fields}
                                errors={errors as Record<string, string>}
                                onChange={(slug, value) => setData('custom_fields', { ...data.custom_fields, [slug]: value })}
                            />
                        )}

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
