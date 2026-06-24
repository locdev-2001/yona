import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslator } from '@/lib/i18n';
import { Copy } from 'lucide-react';

interface AddressData {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
}

interface Props {
    prefix: 'billing' | 'shipping';
    data: AddressData;
    errors?: Partial<Record<keyof AddressData, string>>;
    onChange: (field: string, value: string) => void;
    onCopyFromBilling?: () => void;
}

/**
 * Reusable address field group (billing or shipping).
 * When prefix=shipping, shows a "copy from billing" button.
 */
export default function AddressFields({ prefix, data, errors = {}, onChange, onCopyFromBilling }: Props) {
    const t = useTranslator();

    const label = (field: string) => t(`clients.address.${field}`) ?? field;

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">{t(`clients.address.${prefix}`) ?? prefix}</h4>
                {prefix === 'shipping' && onCopyFromBilling && (
                    <Button type="button" variant="ghost" size="sm" onClick={onCopyFromBilling} className="h-7 gap-1 text-xs">
                        <Copy className="h-3 w-3" />
                        {t('clients.address.copy_from_billing') ?? 'Copy from billing'}
                    </Button>
                )}
            </div>

            <div className="grid gap-2">
                <div>
                    <Label htmlFor={`${prefix}_street`}>{label('street')}</Label>
                    <Input
                        id={`${prefix}_street`}
                        value={data.street}
                        onChange={(e) => onChange(`${prefix}_street`, e.target.value)}
                        placeholder={label('street')}
                    />
                    {errors.street && <p className="text-destructive mt-1 text-xs">{errors.street}</p>}
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <Label htmlFor={`${prefix}_city`}>{label('city')}</Label>
                        <Input id={`${prefix}_city`} value={data.city} onChange={(e) => onChange(`${prefix}_city`, e.target.value)} />
                    </div>
                    <div>
                        <Label htmlFor={`${prefix}_state`}>{label('state')}</Label>
                        <Input id={`${prefix}_state`} value={data.state} onChange={(e) => onChange(`${prefix}_state`, e.target.value)} />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <Label htmlFor={`${prefix}_zip`}>{label('zip')}</Label>
                        <Input id={`${prefix}_zip`} value={data.zip} onChange={(e) => onChange(`${prefix}_zip`, e.target.value)} />
                    </div>
                    <div>
                        <Label htmlFor={`${prefix}_country`}>{label('country')}</Label>
                        <Input id={`${prefix}_country`} value={data.country} onChange={(e) => onChange(`${prefix}_country`, e.target.value)} />
                    </div>
                </div>
            </div>
        </div>
    );
}
