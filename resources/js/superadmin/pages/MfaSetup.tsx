import ConsoleAuthLayout from '../components/ConsoleAuthLayout';
import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { ChevronRightIcon, ClipboardIcon, CopyIcon, DownloadIcon, TriangleAlertIcon } from '@admin/components/icons';
import QRCode from 'qrcode';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@admin/components/ui/alert';
import { Button } from '@admin/components/ui/button';
import { Checkbox } from '@admin/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@admin/components/ui/collapsible';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@admin/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@admin/components/ui/input-group';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@admin/components/ui/input-otp';
import { Skeleton } from '@admin/components/ui/skeleton';
import { Toaster } from '@admin/components/ui/sonner';
import TwoSteps from '@admin/views/pages/auth/two-steps';
import { copyBackupCodes, downloadBackupCodes } from 'dashboard/settings/profile/mfa/backupCodesFile';
import { createMfaApi } from 'dashboard/settings/profile/mfa/mfaApi';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { copyTextToClipboard } from 'shared/helpers/clipboard';

import { t } from '../../i18n';
import type { SuperAdminPageProps } from '../types';

const superAdminMfaApi = createMfaApi('/admin/mfa');
const OTP_LENGTH = 6;

// Super admin chưa bật 2FA bị EnsureSuperAdminMfaEnrolled đưa thẳng vào đây —
// bắt buộc quét QR + xác nhận mã trước khi dùng phần còn lại của console.
// Backend (MfaController::setupPage) đã tự điều hướng về /admin nếu 2FA
// đã bật, nên trang này chỉ còn nhánh "chưa bật".
export default function SuperAdminMfaSetup() {
    const { superAdmin } = usePage<SuperAdminPageProps>().props;

    const [step, setStep] = useState<'qr' | 'backup'>('qr');
    const [provisioningUri, setProvisioningUri] = useState('');
    const [secretKey, setSecretKey] = useState('');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [backupCodes, setBackupCodes] = useState<string[]>([]);
    const [backupCodesConfirmed, setBackupCodesConfirmed] = useState(false);
    const [verificationError, setVerificationError] = useState('');
    const [startError, setStartError] = useState('');

    useEffect(() => {
        superAdminMfaApi
            .enable()
            .then(payload => {
                setProvisioningUri(payload.provisioning_url);
                setSecretKey(payload.secret);
            })
            .catch(error => setStartError(parseApiErrorMessage(error) || t('MFA_SETTINGS.SETUP.ERROR_STARTING')));
    }, []);

    useEffect(() => {
        if (!provisioningUri) return;
        QRCode.toDataURL(provisioningUri, { width: 256, margin: 2, color: { dark: '#000000', light: '#FFFFFF' } })
            .then(setQrCodeUrl)
            .catch(() => setQrCodeUrl(''));
    }, [provisioningUri]);

    const verifyCode = async (code = verificationCode) => {
        if (code.length !== OTP_LENGTH || verifying) return;
        setVerifying(true);
        try {
            const payload = await superAdminMfaApi.verify(code);
            setBackupCodes(payload.backup_codes ?? []);
            setVerificationError('');
            setStep('backup');
        } catch (error) {
            setVerificationError(parseApiErrorMessage(error) || t('MFA_SETTINGS.SETUP.INVALID_CODE'));
        } finally {
            setVerificationCode('');
            setVerifying(false);
        }
    };

    const copySecret = async () => {
        await copyTextToClipboard(secretKey);
        toast.success(t('MFA_SETTINGS.SETUP.SECRET_COPIED'));
    };

    const copyCodes = async () => {
        await copyBackupCodes(backupCodes);
        toast.success(t('MFA_SETTINGS.BACKUP.CODES_COPIED'));
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        void verifyCode();
    };

    const title = t('SUPER_ADMIN_MFA.REQUIRED_TITLE');

    if (step === 'backup') {
        return (
            <>
                <Head title={title} />
                <TwoSteps title={t('MFA_SETTINGS.BACKUP.TITLE')} description={t('MFA_SETTINGS.BACKUP.DESCRIPTION')} className="sm:max-w-lg">
                    <FieldGroup className="gap-4">
                        <Alert>
                            <TriangleAlertIcon />
                            <AlertDescription>
                                <p>
                                    <strong>{t('MFA_SETTINGS.BACKUP.IMPORTANT')}</strong>
                                    {t('MFA_SETTINGS.BACKUP.IMPORTANT_NOTE')}
                                </p>
                            </AlertDescription>
                        </Alert>

                        <div className="grid grid-cols-2 gap-3 rounded-lg border p-4">
                            {backupCodes.map((code, index) => (
                                <span key={`${code}-${index}`} className="text-center font-mono text-sm">
                                    {code}
                                </span>
                            ))}
                        </div>

                        <div className="flex flex-wrap justify-center gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => downloadBackupCodes(backupCodes, superAdmin.installationName)}
                            >
                                <DownloadIcon />
                                {t('MFA_SETTINGS.BACKUP.DOWNLOAD')}
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => void copyCodes()}>
                                <ClipboardIcon />
                                {t('MFA_SETTINGS.BACKUP.COPY_ALL')}
                            </Button>
                        </div>

                        <Field orientation="horizontal" className="items-start gap-2">
                            <Checkbox
                                id="backupCodesConfirmed"
                                checked={backupCodesConfirmed}
                                onCheckedChange={checked => setBackupCodesConfirmed(checked === true)}
                            />
                            <FieldLabel htmlFor="backupCodesConfirmed" className="text-muted-foreground font-normal">
                                {t('MFA_SETTINGS.BACKUP.CONFIRM')}
                            </FieldLabel>
                        </Field>

                        <Field>
                            <Button size="lg" className="w-full" disabled={!backupCodesConfirmed} onClick={() => router.visit('/admin')}>
                                {t('MFA_SETTINGS.BACKUP.COMPLETE_SETUP')}
                            </Button>
                        </Field>
                    </FieldGroup>
                </TwoSteps>
                <Toaster />
            </>
        );
    }

    return (
        <>
            <Head title={title} />
            <TwoSteps
                title={title}
                description={t('SUPER_ADMIN_MFA.REQUIRED_DESCRIPTION', { installationName: superAdmin.installationName })}
                className="sm:max-w-lg"
            >
                {startError ? (
                    <Alert variant="destructive">
                        <AlertDescription>{startError}</AlertDescription>
                    </Alert>
                ) : null}

                <form onSubmit={handleSubmit}>
                    <FieldGroup className="gap-4">
                        <Field className="gap-2">
                            <FieldLabel className="text-base">{t('MFA_SETTINGS.SETUP.STEP1_TITLE')}</FieldLabel>
                            <FieldDescription>{t('MFA_SETTINGS.SETUP.STEP1_DESCRIPTION')}</FieldDescription>
                            <div className="flex justify-center pt-2">
                                {qrCodeUrl ? (
                                    <img src={qrCodeUrl} alt="MFA QR Code" className="size-48 rounded-lg border" />
                                ) : (
                                    <Skeleton className="size-48" />
                                )}
                            </div>
                        </Field>

                        <Collapsible className="group/collapsible">
                            <CollapsibleTrigger render={<Button type="button" variant="link" className="h-auto p-0" />}>
                                <ChevronRightIcon className="transition-transform duration-200 group-data-open/collapsible:rotate-90" />
                                {t('MFA_SETTINGS.SETUP.MANUAL_ENTRY')}
                            </CollapsibleTrigger>
                            <CollapsibleContent keepMounted className="pt-3 data-closed:hidden">
                                <Field className="gap-2">
                                    <FieldLabel htmlFor="mfaSecret">{t('MFA_SETTINGS.SETUP.SECRET_KEY')}</FieldLabel>
                                    <InputGroup>
                                        <InputGroupInput id="mfaSecret" readOnly value={secretKey} className="font-mono" />
                                        <InputGroupAddon align="inline-end">
                                            <InputGroupButton onClick={() => void copySecret()}>
                                                <CopyIcon />
                                                {t('MFA_SETTINGS.SETUP.COPY')}
                                            </InputGroupButton>
                                        </InputGroupAddon>
                                    </InputGroup>
                                </Field>
                            </CollapsibleContent>
                        </Collapsible>

                        <Field className="gap-4">
                            <FieldLabel htmlFor="mfaCode" className="text-base">
                                {t('MFA_SETTINGS.SETUP.ENTER_CODE')}
                            </FieldLabel>
                            <InputOTP pushPasswordManagerStrategy="none"
                                id="mfaCode"
                                maxLength={OTP_LENGTH}
                                pattern="^[0-9]+$"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                value={verificationCode}
                                onChange={setVerificationCode}
                                onComplete={(code: string) => void verifyCode(code)}
                            >
                                <InputOTPGroup className="w-full justify-center gap-4 *:data-[slot=input-otp-slot]:rounded-lg *:data-[slot=input-otp-slot]:border">
                                    <InputOTPSlot index={0} className="input-size-lg" />
                                    <InputOTPSlot index={1} className="input-size-lg" />
                                    <InputOTPSlot index={2} className="input-size-lg" />
                                    <InputOTPSlot index={3} className="input-size-lg" />
                                    <InputOTPSlot index={4} className="input-size-lg" />
                                    <InputOTPSlot index={5} className="input-size-lg" />
                                </InputOTPGroup>
                            </InputOTP>
                        </Field>

                        {verificationError ? (
                            <Alert variant="destructive">
                                <AlertDescription>{verificationError}</AlertDescription>
                            </Alert>
                        ) : null}

                        <Field orientation="horizontal" className="gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                size="lg"
                                className="flex-1"
                                onClick={() => {
                                    window.location.href = '/admin/logout';
                                }}
                            >
                                {t('MFA_SETTINGS.SETUP.CANCEL')}
                            </Button>
                            <Button
                                type="submit"
                                size="lg"
                                className="flex-1"
                                disabled={verificationCode.length !== OTP_LENGTH || verifying}
                            >
                                {t('MFA_SETTINGS.SETUP.VERIFY_BUTTON')}
                            </Button>
                        </Field>
                    </FieldGroup>
                </form>
            </TwoSteps>
            <Toaster />
        </>
    );
}

SuperAdminMfaSetup.layout = (page: ReactNode) => <ConsoleAuthLayout>{page}</ConsoleAuthLayout>;
