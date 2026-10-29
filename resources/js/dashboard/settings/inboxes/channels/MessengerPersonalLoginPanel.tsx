import { useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { t } from '../../../../i18n';
import { postJson } from 'dashboard/helper/apiClient';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import Button from 'dashboard/components-next/button/Button';
import Loader from 'shared/components/loader/Loader';

// Đăng nhập Facebook cho kênh Messenger cá nhân: cảnh báo rủi ro bắt buộc → các bước do
// Meta quyết định (sidecar trả `step`: ô nhập hoặc chờ duyệt trên thiết bị khác) → thẻ
// tài khoản. Mật khẩu chỉ nằm trong state của form tới lúc gửi, không lưu ở đâu khác.

type FieldType = 'text' | 'email' | 'phone' | 'password' | 'code' | 'captcha';

interface StepField {
    id: string;
    name: string;
    type: FieldType;
    description: string | null;
}

interface LoginStep {
    type: 'user_input' | 'display_and_wait';
    step_id: string;
    instructions: string | null;
    fields: StepField[];
    attachments?: StepAttachment[];
}

interface StepAttachment {
    kind: 'image' | 'audio' | 'file';
    mime_type: string;
    data_base64: string;
}

interface LoginResponse {
    ok?: boolean;
    step?: LoginStep;
    done?: boolean;
    account?: { facebook_user_id: string | null; display_name: string | null; avatar_url: string | null };
}

interface LoginErrorBody {
    error_code?: string;
    message?: string;
}

type Phase = 'risk' | 'starting' | 'step' | 'submitting' | 'done' | 'error';

// Lỗi mà lượt đăng nhập ở sidecar vẫn còn: sửa ô nhập rồi gửi lại được.
const RETRYABLE_ERRORS = ['invalid_credentials', 'two_factor_failed', 'bad_request', 'rate_limited'];

interface MessengerPersonalLoginPanelProps {
    accountId: number;
    inboxId: number;
    onConnected: () => void;
    onCancel?: () => void;
}

function errorMessageOf(error: unknown): { code: string | null; message: string } {
    const body = (error as { body?: LoginErrorBody } | null)?.body;
    const code = body?.error_code ?? null;
    const key = code ? `INBOX_MGMT.MESSENGER_PERSONAL.ERRORS.${code.toUpperCase()}` : null;
    const translated = key ? t(key) : null;

    return {
        code,
        message: body?.message || (translated && translated !== key ? translated : t('INBOX_MGMT.MESSENGER_PERSONAL.ERRORS.BRIDGE_UNREACHABLE')),
    };
}

function hasField(step: LoginStep, type: FieldType): boolean {
    return step.fields.some(field => field.type === type);
}

function fieldLabel(step: LoginStep, field: StepField): string {
    if (field.type === 'password') return t('INBOX_MGMT.MESSENGER_PERSONAL.FIELDS.PASSWORD');
    if (field.type === 'code') return t('INBOX_MGMT.MESSENGER_PERSONAL.FIELDS.CODE');
    if (field.type === 'captcha') return t('INBOX_MGMT.MESSENGER_PERSONAL.FIELDS.CAPTCHA');
    if (hasField(step, 'password')) return t('INBOX_MGMT.MESSENGER_PERSONAL.FIELDS.IDENTIFIER');

    return field.name;
}

const INPUT_ATTRIBUTES: Record<FieldType, { type: string; autoComplete: string; inputMode?: 'numeric' | 'email' | 'tel' }> = {
    text: { type: 'text', autoComplete: 'username' },
    email: { type: 'text', autoComplete: 'username', inputMode: 'email' },
    phone: { type: 'text', autoComplete: 'username', inputMode: 'tel' },
    password: { type: 'password', autoComplete: 'current-password' },
    code: { type: 'text', autoComplete: 'one-time-code', inputMode: 'numeric' },
    captcha: { type: 'text', autoComplete: 'off' },
};

// Mã gửi qua đâu tuỳ bước Meta chọn; bước khác (thường là email) dựa vào lời dặn của Meta.
const CODE_DESCRIPTION_KEYS: Record<string, string> = {
    totp: 'CODE_DESC_TOTP',
    sms: 'CODE_DESC_SMS',
    whatsapp: 'CODE_DESC_WHATSAPP',
    backup_code: 'CODE_DESC_BACKUP',
};

// Tiêu đề, mô tả, nhãn nút theo loại bước; bước lạ hiện nguyên lời dặn của sidecar.
function stepCopy(step: LoginStep): { title: string | null; description: string | null; submit: string } {
    if (step.type === 'display_and_wait') {
        return {
            title: t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.APPROVE_TITLE'),
            description: t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.APPROVE_DESC'),
            submit: t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.CONTINUE'),
        };
    }

    if (hasField(step, 'password')) {
        return { title: null, description: null, submit: t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.LOGIN') };
    }

    if (hasField(step, 'captcha')) {
        return {
            title: t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.CAPTCHA_TITLE'),
            description: t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.CAPTCHA_DESC'),
            submit: t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.CODE_SUBMIT'),
        };
    }

    if (hasField(step, 'code')) {
        return {
            title: t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.CODE_TITLE'),
            description: t(`INBOX_MGMT.MESSENGER_PERSONAL.STEP.${CODE_DESCRIPTION_KEYS[step.step_id] ?? 'CODE_DESC_OTHER'}`),
            submit: t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.CODE_SUBMIT'),
        };
    }

    return {
        title: t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.OTHER_TITLE'),
        description: step.instructions,
        submit: t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.CONTINUE'),
    };
}

export default function MessengerPersonalLoginPanel({ accountId, inboxId, onConnected, onCancel }: MessengerPersonalLoginPanelProps) {
    const [phase, setPhase] = useState<Phase>('risk');
    const [step, setStep] = useState<LoginStep | null>(null);
    const [values, setValues] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [account, setAccount] = useState<LoginResponse['account'] | null>(null);
    const loginOpenRef = useRef(false);

    const basePath = `/api/v1/accounts/${accountId}/inboxes/${inboxId}/messenger_personal`;

    const showStep = (next: LoginStep | undefined) => {
        if (!next) {
            setPhase('error');
            setErrorMessage(t('INBOX_MGMT.MESSENGER_PERSONAL.ERRORS.BRIDGE_REJECTED'));
            return;
        }
        setStep(next);
        setValues({});
        setTouched(false);
        setPhase('step');
    };

    const fail = (error: unknown, keepStep: boolean) => {
        const { code, message } = errorMessageOf(error);
        setErrorMessage(message);
        if (keepStep && code && RETRYABLE_ERRORS.includes(code)) {
            setPhase('step');
            return;
        }
        loginOpenRef.current = false;
        setPhase('error');
    };

    const start = async () => {
        setPhase('starting');
        setErrorMessage(null);
        try {
            const result = await postJson<LoginResponse>(`${basePath}/login/start`, {});
            loginOpenRef.current = true;
            showStep(result.step);
        } catch (error) {
            fail(error, false);
        }
    };

    const missingRequired = (current: LoginStep) =>
        current.type === 'user_input' && current.fields.some(field => !(values[field.id] ?? '').trim());

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (!step) return;
        setTouched(true);
        if (missingRequired(step)) return;

        setPhase('submitting');
        setErrorMessage(null);
        try {
            const input = step.type === 'user_input' ? values : {};
            const result = await postJson<LoginResponse>(`${basePath}/login/submit`, { input });
            if (result.done) {
                loginOpenRef.current = false;
                setAccount(result.account ?? null);
                setValues({});
                setPhase('done');
                return;
            }
            showStep(result.step);
        } catch (error) {
            fail(error, true);
        }
    };

    const cancel = () => {
        if (loginOpenRef.current) {
            loginOpenRef.current = false;
            postJson(`${basePath}/login/cancel`, {}).catch(() => undefined);
        }
        setValues({});
        setStep(null);
        setPhase('risk');
        onCancel?.();
    };

    if (phase === 'risk') {
        return (
            <div className="panel-surface flex flex-col gap-3 rounded-xl p-4" data-testid="messenger-personal-risk">
                <p className="text-n-slate-12 text-sm font-medium">{t('INBOX_MGMT.MESSENGER_PERSONAL.RISK.TITLE')}</p>
                <ul className="flex flex-col gap-2 text-n-slate-11 text-sm leading-[1.65] list-disc ps-5 m-0">
                    <li>{t('INBOX_MGMT.MESSENGER_PERSONAL.RISK.UNOFFICIAL')}</li>
                    <li>{t('INBOX_MGMT.MESSENGER_PERSONAL.RISK.PASSWORD')}</li>
                    <li>{t('INBOX_MGMT.MESSENGER_PERSONAL.RISK.TWO_FACTOR')}</li>
                </ul>
                <div>
                    <Button type="button" solid blue label={t('INBOX_MGMT.MESSENGER_PERSONAL.RISK.ACCEPT')} onClick={() => void start()} />
                </div>
            </div>
        );
    }

    if (phase === 'starting') {
        return (
            <div className="text-n-slate-11 text-sm flex items-center gap-2">
                <Loader size={16} />
                <span>{t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.STARTING')}</span>
            </div>
        );
    }

    if (phase === 'done') {
        const name = account?.display_name ?? '';
        return (
            <div className="panel-surface flex flex-col gap-4 rounded-xl p-4" data-testid="messenger-personal-success">
                <div className="flex items-center gap-3 min-w-0">
                    <Avatar src={account?.avatar_url ?? undefined} name={name} size={40} roundedFull />
                    <div className="min-w-0">
                        <p className="text-n-slate-12 text-sm font-medium truncate">
                            {name || t('INBOX_MGMT.MESSENGER_PERSONAL.SUCCESS.TITLE')}
                        </p>
                        <p className="text-n-slate-11 text-xs">{t('INBOX_MGMT.MESSENGER_PERSONAL.SUCCESS.DESC')}</p>
                    </div>
                </div>
                <div>
                    <Button type="button" solid blue label={t('INBOX_MGMT.MESSENGER_PERSONAL.SUCCESS.CONTINUE')} onClick={onConnected} />
                </div>
            </div>
        );
    }

    if (phase === 'error' || !step) {
        return (
            <div className="flex flex-col gap-3">
                <p className="text-n-ruby-11 text-sm leading-[1.65]">{errorMessage}</p>
                <div className="flex flex-wrap gap-2">
                    <Button type="button" solid blue label={t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.RESTART')} onClick={() => void start()} />
                    {onCancel ? (
                        <Button type="button" faded slate label={t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.CANCEL')} onClick={cancel} />
                    ) : null}
                </div>
            </div>
        );
    }

    const copy = stepCopy(step);
    const isSubmitting = phase === 'submitting';

    return (
        <form className="flex flex-col gap-3 w-full max-w-md" onSubmit={event => void submit(event)} data-testid="messenger-personal-step">
            {copy.title ? <p className="text-n-slate-12 text-sm font-medium">{copy.title}</p> : null}
            {copy.description ? <p className="text-n-slate-11 text-sm leading-[1.65]">{copy.description}</p> : null}
            {(step.attachments ?? []).map(attachment => {
                const source = `data:${attachment.mime_type};base64,${attachment.data_base64}`;
                if (attachment.kind === 'image') {
                    return (
                        <img
                            key={source.slice(-32)}
                            src={source}
                            alt={t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.CAPTCHA_IMAGE_ALT')}
                            className="max-w-full rounded-lg border border-n-weak bg-white"
                        />
                    );
                }
                return attachment.kind === 'audio' ? <audio key={source.slice(-32)} controls src={source} className="w-full" /> : null;
            })}
            {step.instructions && copy.description !== step.instructions ? (
                <p className="text-n-slate-11 text-xs leading-[1.65]">
                    {t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.META_SAYS', { message: step.instructions })}
                </p>
            ) : null}

            {step.type === 'user_input'
                ? step.fields.map((field, index) => {
                      const attributes = INPUT_ATTRIBUTES[field.type] ?? INPUT_ATTRIBUTES.text;
                      const invalid = touched && !(values[field.id] ?? '').trim();
                      return (
                          <label key={field.id} className={`w-full ${invalid ? 'error' : ''}`}>
                              {fieldLabel(step, field)}
                              <input
                                  className="w-full"
                                  type={attributes.type}
                                  autoComplete={attributes.autoComplete}
                                  inputMode={attributes.inputMode}
                                  autoFocus={index === 0}
                                  value={values[field.id] ?? ''}
                                  placeholder={field.type === 'code' ? t('INBOX_MGMT.MESSENGER_PERSONAL.FIELDS.CODE_PLACEHOLDER') : undefined}
                                  disabled={isSubmitting}
                                  onChange={event => setValues(current => ({ ...current, [field.id]: event.target.value }))}
                              />
                              {invalid ? <span className="message">{t('INBOX_MGMT.MESSENGER_PERSONAL.FIELDS.REQUIRED')}</span> : null}
                          </label>
                      );
                  })
                : null}

            {errorMessage ? <p className="text-n-ruby-11 text-sm leading-[1.65]">{errorMessage}</p> : null}

            {isSubmitting ? (
                <div className="text-n-slate-11 text-sm flex items-center gap-2">
                    <Loader size={16} />
                    <span>{t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.SUBMITTING')}</span>
                </div>
            ) : null}

            <div className="sticky bottom-0 flex flex-wrap gap-2 bg-n-surface-app py-3 sm:static sm:bg-transparent sm:py-0">
                <Button type="submit" solid blue isLoading={isSubmitting} label={copy.submit} className="flex-1 sm:flex-none" />
                <Button type="button" faded slate label={t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.CANCEL')} disabled={isSubmitting} onClick={cancel} />
            </div>
        </form>
    );
}
