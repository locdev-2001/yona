import { useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { ImageUpIcon, RotateCcwIcon } from '@admin/components/icons';

import { Badge } from '@admin/components/ui/badge';
import { Button } from '@admin/components/ui/button';
import { Card, CardContent } from '@admin/components/ui/card';
import PageHeader from '@admin/views/pages/page-header';
import { ConfirmDialog } from '@admin/views/apps/resources/dialogs/confirm-dialog';

import { useConsoleLabels } from '../labels';

export type BrandAssetSlot = 'logo' | 'logo_dark' | 'logo_thumbnail' | 'favicon';

export type BrandAsset = {
    slot: BrandAssetSlot;
    title: string;
    description: string;
    url: string;
    isCustom: boolean;
    accept: string;
    requirements: string;
};

type BrandingStrings = {
    title: string;
    description: string;
    upload: string;
    replace: string;
    uploading: string;
    reset: string;
    reset_confirm_title: string;
    reset_confirm_description: string;
    using_custom: string;
    using_default: string;
    preview_alt: string;
};

type BrandingProps = {
    assets: BrandAsset[];
    strings: BrandingStrings;
};

const BRANDING_URL = '/admin/branding';

export default function Branding({ assets, strings }: BrandingProps) {
    const label = useConsoleLabels();
    const errors = usePage<{ errors?: Record<string, string> }>().props.errors ?? {};
    const [uploadingSlot, setUploadingSlot] = useState<BrandAssetSlot | null>(null);
    const [failedSlot, setFailedSlot] = useState<BrandAssetSlot | null>(null);
    const [resetSlot, setResetSlot] = useState<BrandAssetSlot | null>(null);
    const fileInputs = useRef<Partial<Record<BrandAssetSlot, HTMLInputElement | null>>>({});

    const upload = (slot: BrandAssetSlot, file: File) => {
        setUploadingSlot(slot);
        setFailedSlot(null);
        router.post(
            `${BRANDING_URL}/${slot}`,
            { file },
            {
                forceFormData: true,
                preserveScroll: true,
                onError: () => setFailedSlot(slot),
                onFinish: () => setUploadingSlot(null),
            },
        );
    };

    const reset = (slot: BrandAssetSlot) => {
        router.delete(`${BRANDING_URL}/${slot}`, {
            preserveScroll: true,
            onFinish: () => setResetSlot(null),
        });
    };

    const assetToReset = assets.find(asset => asset.slot === resetSlot);

    return (
        <div className="console-resource-page">
            <PageHeader className="lg:mb-10" title={strings.title} description={strings.description} />

            <Card className="gap-0 py-0">
                <CardContent className="px-0">
                    <ul className="divide-y">
                        {assets.map(asset => {
                            const isUploading = uploadingSlot === asset.slot;
                            const error = failedSlot === asset.slot ? errors.file : undefined;
                            const inputId = `brand-asset-${asset.slot}`;

                            return (
                                <li
                                    key={asset.slot}
                                    data-slot={asset.slot}
                                    className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center"
                                >
                                    <div
                                        className="console-branding-preview" data-asset={asset.slot}
                                    >
                                        <img
                                            src={asset.url}
                                            alt={strings.preview_alt.replace('{name}', asset.title)}
                                            className="console-branding-image"
                                        />
                                    </div>

                                    <div className="min-w-0 flex-1 space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <label htmlFor={inputId} className="font-medium">
                                                {asset.title}
                                            </label>
                                            <Badge variant={asset.isCustom ? 'default' : 'outline'}>
                                                {asset.isCustom ? strings.using_custom : strings.using_default}
                                            </Badge>
                                        </div>
                                        <p className="text-muted-foreground text-sm">{asset.description}</p>
                                        <p className="text-muted-foreground text-xs">{asset.requirements}</p>
                                        {error ? (
                                            <p role="alert" className="text-destructive text-sm">
                                                {error}
                                            </p>
                                        ) : null}
                                    </div>

                                    <div className="flex shrink-0 flex-wrap gap-2">
                                        <input
                                            ref={element => {
                                                fileInputs.current[asset.slot] = element;
                                            }}
                                            id={inputId}
                                            type="file"
                                            accept={asset.accept}
                                            className="sr-only"
                                            onChange={event => {
                                                const file = event.target.files?.[0];
                                                event.target.value = '';
                                                if (file) upload(asset.slot, file);
                                            }}
                                        />
                                        <Button
                                            variant="outline"
                                            disabled={uploadingSlot !== null}
                                            onClick={() => fileInputs.current[asset.slot]?.click()}
                                        >
                                            <ImageUpIcon className="size-4" />
                                            {isUploading ? strings.uploading : asset.isCustom ? strings.replace : strings.upload}
                                        </Button>
                                        {asset.isCustom ? (
                                            <Button variant="ghost" onClick={() => setResetSlot(asset.slot)}>
                                                <RotateCcwIcon className="size-4" />
                                                {strings.reset}
                                            </Button>
                                        ) : null}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </CardContent>
            </Card>

            <ConfirmDialog
                open={assetToReset !== undefined}
                onOpenChange={open => {
                    if (!open) setResetSlot(null);
                }}
                title={strings.reset_confirm_title}
                description={assetToReset ? `${assetToReset.title}: ${strings.reset_confirm_description}` : undefined}
                cancelLabel={label('cancel')}
                confirmLabel={strings.reset}
                onConfirm={() => {
                    if (assetToReset) reset(assetToReset.slot);
                }}
            />
        </div>
    );
}
