import AddressFields from '@/components/clients/address-fields';
import GroupSelector from '@/components/clients/group-selector';
import CustomFieldsSection from '@/components/custom-fields/custom-fields-section';
import type { CustomFieldDefinition } from '@/components/custom-fields/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useTranslator } from '@/lib/i18n';
import type { Client, ClientGroup } from '@/types';
import { useForm } from '@inertiajs/react';

interface Props {
    client?: Client;
    groups: ClientGroup[];
    clientFieldDefs: CustomFieldDefinition[];
    submitRoute: string;
    method?: 'post' | 'put';
}

interface ClientFormData {
    name: string;
    vat: string;
    phone: string;
    website: string;
    currency: string;
    default_language: string;
    billing_street: string;
    billing_city: string;
    billing_state: string;
    billing_zip: string;
    billing_country: string;
    shipping_street: string;
    shipping_city: string;
    shipping_state: string;
    shipping_zip: string;
    shipping_country: string;
    groups: string[];
    custom_fields: Record<string, unknown>;
    [key: string]: unknown;
}

/**
 * Client create/edit form. Controlled via useForm (Inertia).
 * Includes: company fields, billing/shipping addresses, group selector, custom fields.
 */
export default function ClientForm({ client, groups, clientFieldDefs, submitRoute, method = 'post' }: Props) {
    const t = useTranslator();

    const { data, setData, post, put, processing, errors } = useForm<ClientFormData>({
        name: client?.name ?? '',
        vat: client?.vat ?? '',
        phone: client?.phone ?? '',
        website: client?.website ?? '',
        currency: client?.currency ?? 'VND',
        default_language: client?.default_language ?? 'vi',
        billing_street: client?.billing_street ?? '',
        billing_city: client?.billing_city ?? '',
        billing_state: client?.billing_state ?? '',
        billing_zip: client?.billing_zip ?? '',
        billing_country: client?.billing_country ?? '',
        shipping_street: client?.shipping_street ?? '',
        shipping_city: client?.shipping_city ?? '',
        shipping_state: client?.shipping_state ?? '',
        shipping_zip: client?.shipping_zip ?? '',
        shipping_country: client?.shipping_country ?? '',
        groups: (client?.groups ?? []).map((g) => g.id),
        custom_fields: client?.custom_fields ?? {},
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (method === 'put') {
            put(submitRoute);
        } else {
            post(submitRoute);
        }
    }

    function copyBillingToShipping() {
        setData((prev) => ({
            ...prev,
            shipping_street: prev.billing_street,
            shipping_city: prev.billing_city,
            shipping_state: prev.billing_state,
            shipping_zip: prev.billing_zip,
            shipping_country: prev.billing_country,
        }));
    }

    function setAddressField(field: string, value: string) {
        setData(field as keyof ClientFormData, value);
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Core info */}
            <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                    <Label htmlFor="name">{t('clients.fields.name')} *</Label>
                    <Input id="name" value={data.name} onChange={(e) => setData('name', e.target.value)} required />
                    {errors.name && <p className="text-destructive mt-1 text-xs">{errors.name}</p>}
                </div>

                <div>
                    <Label htmlFor="vat">{t('clients.fields.vat')}</Label>
                    <Input id="vat" value={data.vat} onChange={(e) => setData('vat', e.target.value)} />
                </div>
                <div>
                    <Label htmlFor="phone">{t('clients.fields.phone')}</Label>
                    <Input id="phone" value={data.phone} onChange={(e) => setData('phone', e.target.value)} />
                </div>

                <div className="sm:col-span-2">
                    <Label htmlFor="website">{t('clients.fields.website')}</Label>
                    <Input id="website" type="url" value={data.website} onChange={(e) => setData('website', e.target.value)} placeholder="https://" />
                </div>

                <div>
                    <Label htmlFor="currency">{t('clients.fields.currency')}</Label>
                    <Input
                        id="currency"
                        value={data.currency}
                        onChange={(e) => setData('currency', e.target.value)}
                        placeholder="VND"
                        maxLength={8}
                    />
                </div>
                <div>
                    <Label htmlFor="default_language">{t('clients.fields.default_language')}</Label>
                    <Select value={data.default_language} onValueChange={(v) => setData('default_language', v)}>
                        <SelectTrigger id="default_language">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="vi">Tiếng Việt</SelectItem>
                            <SelectItem value="en">English</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Groups */}
            <div>
                <Label>{t('clients.fields.groups')}</Label>
                <div className="mt-1">
                    <GroupSelector groups={groups} selected={data.groups} onChange={(ids) => setData('groups', ids)} />
                </div>
            </div>

            <Separator />

            {/* Addresses */}
            <div className="grid gap-6 sm:grid-cols-2">
                <AddressFields
                    prefix="billing"
                    data={{
                        street: data.billing_street,
                        city: data.billing_city,
                        state: data.billing_state,
                        zip: data.billing_zip,
                        country: data.billing_country,
                    }}
                    onChange={setAddressField}
                />
                <AddressFields
                    prefix="shipping"
                    data={{
                        street: data.shipping_street,
                        city: data.shipping_city,
                        state: data.shipping_state,
                        zip: data.shipping_zip,
                        country: data.shipping_country,
                    }}
                    onChange={setAddressField}
                    onCopyFromBilling={copyBillingToShipping}
                />
            </div>

            {/* Custom fields */}
            {clientFieldDefs.length > 0 && (
                <>
                    <Separator />
                    <CustomFieldsSection
                        definitions={clientFieldDefs}
                        values={data.custom_fields}
                        errors={errors as Record<string, string>}
                        onChange={(slug, value) => setData('custom_fields', { ...data.custom_fields, [slug]: value })}
                    />
                </>
            )}

            <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => history.back()}>
                    {t('clients.actions.cancel')}
                </Button>
                <Button type="submit" disabled={processing}>
                    {t('clients.actions.save')}
                </Button>
            </div>
        </form>
    );
}
