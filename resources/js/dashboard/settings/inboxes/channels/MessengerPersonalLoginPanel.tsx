import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';

import { t } from '../../../../i18n';
import { postJson } from 'dashboard/helper/apiClient';
import Avatar from 'dashboard/components-next/avatar/Avatar';
import Button from 'dashboard/components-next/button/Button';
import Loader from 'shared/components/loader/Loader';

// Đăng nhập Facebook cho kênh Messenger cá nhân: cảnh báo rủi ro bắt buộc → các bước do
// Meta quyết định (sidecar trả `step`: ô nhập hoặc chờ duyệt trên thiết bị khác) → thẻ
// tài khoản. Mật khẩu chỉ nằm trong state của form tới lúc gửi, không lưu ở đâu khác.

type FieldType = 'text' | 'email' | 'phone' | 'password' | 'code' | 'captcha' | 'select';

interface StepField {
    id: string;
    name: string;
    type: FieldType;
    description: string | null;
    options?: string[];
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
    waiting?: boolean;
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
    select: { type: 'text', autoComplete: 'off' },
};

// Mã gửi qua đâu tuỳ bước Meta chọn; bước khác (thường là email) dựa vào lời dặn của Meta.
const CODE_DESCRIPTION_KEYS: Record<string, string> = {
    totp: 'CODE_DESC_TOTP',
    sms: 'CODE_DESC_SMS',
    whatsapp: 'CODE_DESC_WHATSAPP',
    backup_code: 'CODE_DESC_BACKUP',
};

// Tên cách xác minh Meta trả về → khoá dịch. Cách nhận mã xếp trước vì không phụ thuộc
// việc có sẵn một thiết bị khác đang đăng nhập Facebook.
const VERIFICATION_METHOD_KEYS: Record<string, string> = {
    'Authentication app': 'APP',
    'Text message': 'SMS',
    WhatsApp: 'WHATSAPP',
    Email: 'EMAIL',
    'Backup code': 'BACKUP',
    'Notification on another device': 'DEVICE',
};
const METHOD_LAST = 'Notification on another device';

function orderedOptions(options: string[]): string[] {
    return [...options].sort((a, b) => Number(a === METHOD_LAST) - Number(b === METHOD_LAST));
}

function optionLabel(option: string): { label: string; hint: string | null } {
    const key = VERIFICATION_METHOD_KEYS[option];
    if (!key) return { label: option, hint: null };
    return {
        label: t(`INBOX_MGMT.MESSENGER_PERSONAL.METHODS.${key}`),
        hint: t(`INBOX_MGMT.MESSENGER_PERSONAL.METHODS.${key}_HINT`),
    };
}

// Giữ khoảng cách giữa hai lần hỏi lại để không chạm giới hạn 20 lần mỗi phút của route.
const MIN_POLL_GAP_MS = 4000;

// Meta ghi con số phải bấm ngay trong lời dặn ("...then tap 86 to verify..."); không có số thì là duyệt thường.
function approvalNumberOf(step: LoginStep): string | null {
    return step.instructions?.match(/\btap\s+(\d{1,3})\b/i)?.[1] ?? null;
}

// Tiêu đề, mô tả, nhãn nút theo loại bước; bước lạ hiện nguyên lời dặn của sidecar.
interface StepCopy {
    title: string;
    description: string | null;
    note: string | null;
    submit: string;
    showMetaNote: boolean;
}

function stepCopy(step: LoginStep): StepCopy {
    if (step.type === 'display_and_wait') {
        const approvalNumber = approvalNumberOf(step);
        return {
            title: t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.APPROVE_TITLE'),
            description: approvalNumber
                ? t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.APPROVE_NUMBER_DESC', { number: approvalNumber })
                : t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.APPROVE_DESC'),
            note: null,
            submit: t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.APPROVE_SUBMIT'),
            showMetaNote: approvalNumber === null,
        };
    }

    if (hasField(step, 'password')) {
        return {
            title: t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.CREDENTIALS_TITLE'),
            description: t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.CREDENTIALS_DESC'),
            note: null,
            submit: t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.LOGIN'),
            showMetaNote: false,
        };
    }

    if (hasField(step, 'select')) {
        return {
            title: t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.METHOD_TITLE'),
            description: t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.METHOD_DESC'),
            note: null,
            submit: t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.CONTINUE'),
            showMetaNote: false,
        };
    }

    if (hasField(step, 'captcha')) {
        return {
            title: t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.CAPTCHA_TITLE'),
            description: t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.CAPTCHA_DESC'),
            note: null,
            submit: t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.CODE_SUBMIT'),
            showMetaNote: false,
        };
    }

    if (hasField(step, 'code')) {
        return {
            title: t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.CODE_TITLE'),
            description: t(`INBOX_MGMT.MESSENGER_PERSONAL.STEP.${CODE_DESCRIPTION_KEYS[step.step_id] ?? 'CODE_DESC_OTHER'}`),
            note: null,
            submit: t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.CODE_SUBMIT'),
            showMetaNote: true,
        };
    }

    return {
        title: t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.OTHER_TITLE'),
        description: step.instructions,
        note: null,
        submit: t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.CONTINUE'),
        showMetaNote: false,
    };
}

export default function MessengerPersonalLoginPanel({ accountId, inboxId, onConnected, onCancel }: MessengerPersonalLoginPanelProps) {
    const [phase, setPhase] = useState<Phase>('risk');
    const [step, setStep] = useState<LoginStep | null>(null);
    const [values, setValues] = useState<Record<string, string>>({});
    const [touched, setTouched] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [account, setAccount] = useState<LoginResponse['account'] | null>(null);
    const [passedSteps, setPassedSteps] = useState<string[]>([]);
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
        setPhase(next.type === 'display_and_wait' ? 'submitting' : 'step');
    };

    // Bước chờ duyệt tự gửi ngay khi hiện; sidecar giữ yêu cầu tới khi có kết quả hoặc hết một lượt chờ.
    useEffect(() => {
        if (step?.type === 'display_and_wait' && phase === 'submitting') {
            void send(step, {});
        }
    }, [step]);

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
        setPassedSteps([]);
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

    const send = async (current: LoginStep, input: Record<string, string>): Promise<void> => {
        setPhase('submitting');
        setErrorMessage(null);
        const sentAt = Date.now();
        try {
            const result = await postJson<LoginResponse>(`${basePath}/login/submit`, { input });
            if (!loginOpenRef.current) return;
            if (result.done) {
                loginOpenRef.current = false;
                setAccount(result.account ?? null);
                setValues({});
                setPhase('done');
                return;
            }
            if (result.waiting) {
                await new Promise(resolve => window.setTimeout(resolve, Math.max(0, MIN_POLL_GAP_MS - (Date.now() - sentAt))));
                if (loginOpenRef.current) await send(current, {});
                return;
            }
            const passedTitle = stepCopy(current).title;
            if (!result.step || stepCopy(result.step).title !== passedTitle) {
                setPassedSteps(steps => [...steps, passedTitle]);
            }
            showStep(result.step);
        } catch (error) {
            if (loginOpenRef.current) fail(error, true);
        }
    };

    const submit = async (event: FormEvent) => {
        event.preventDefault();
        if (!step) return;
        setTouched(true);
        if (missingRequired(step)) return;
        await send(step, step.type === 'user_input' ? values : {});
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
        <form
            className="panel-surface flex flex-col gap-4 rounded-xl p-4 sm:p-5 w-full max-w-lg"
            onSubmit={event => void submit(event)}
            data-testid="messenger-personal-step"
        >
            {passedSteps.length > 0 ? (
                <ol className="flex flex-col gap-1.5 border-b border-n-weak pb-3 m-0 p-0 list-none">
                    {passedSteps.map((title, index) => (
                        <li key={`${index}-${title}`} className="flex items-center gap-2 text-n-slate-11 text-sm">
                            <span className="i-lucide-circle-check size-4 shrink-0 text-n-teal-10" />
                            <span className="truncate">{title}</span>
                        </li>
                    ))}
                </ol>
            ) : null}

            <div className="flex flex-col gap-1">
                <p className="text-n-slate-12 text-base font-medium">{copy.title}</p>
                {copy.description ? <p className="text-n-slate-11 text-sm leading-[1.65]">{copy.description}</p> : null}
            </div>

            {(step.attachments ?? []).map(attachment => {
                const source = `data:${attachment.mime_type};base64,${attachment.data_base64}`;
                if (attachment.kind === 'image') {
                    return (
                        <img
                            key={source.slice(-32)}
                            src={source}
                            alt={t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.CAPTCHA_IMAGE_ALT')}
                            className="max-w-full self-start rounded-lg border border-n-weak bg-white"
                        />
                    );
                }
                return attachment.kind === 'audio' ? <audio key={source.slice(-32)} controls src={source} className="w-full" /> : null;
            })}

            {step.type === 'display_and_wait' && approvalNumberOf(step) ? (
                <div className="flex items-center justify-center rounded-xl bg-n-alpha-1 py-4">
                    <span className="text-n-slate-12 text-5xl font-semibold tabular-nums">{approvalNumberOf(step)}</span>
                </div>
            ) : null}

            {copy.showMetaNote && step.instructions ? (
                <p className="rounded-lg bg-n-alpha-1 px-3 py-2 text-n-slate-11 text-xs leading-[1.65]">
                    {t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.META_SAYS', { message: step.instructions })}
                </p>
            ) : null}

            {step.type === 'user_input'
                ? step.fields.map((field, index) => {
                      const invalid = touched && !(values[field.id] ?? '').trim();
                      if (field.type === 'select') {
                          return (
                              <div key={field.id} role="radiogroup" className="flex flex-col gap-2">
                                  {orderedOptions(field.options ?? []).map(option => {
                                      const { label, hint } = optionLabel(option);
                                      const selected = values[field.id] === option;
                                      return (
                                          <button
                                              key={option}
                                              type="button"
                                              role="radio"
                                              aria-checked={selected}
                                              disabled={isSubmitting}
                                              onClick={() => setValues(current => ({ ...current, [field.id]: option }))}
                                              className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-start transition-colors ${
                                                  selected ? 'border-n-brand bg-n-brand/5' : 'border-n-weak hover:bg-n-alpha-1'
                                              }`}
                                          >
                                              <span
                                                  className={`mt-0.5 size-4 shrink-0 rounded-full border ${
                                                      selected ? 'border-[5px] border-n-brand' : 'border-n-slate-8'
                                                  }`}
                                              />
                                              <span className="flex min-w-0 flex-col gap-0.5">
                                                  <span className="text-n-slate-12 text-sm font-medium">{label}</span>
                                                  {hint ? <span className="text-n-slate-11 text-xs leading-[1.6]">{hint}</span> : null}
                                              </span>
                                          </button>
                                      );
                                  })}
                                  {invalid ? (
                                      <span className="text-n-ruby-11 text-xs">{t('INBOX_MGMT.MESSENGER_PERSONAL.FIELDS.CHOOSE_ONE')}</span>
                                  ) : null}
                              </div>
                          );
                      }
                      const attributes = INPUT_ATTRIBUTES[field.type] ?? INPUT_ATTRIBUTES.text;
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

            {copy.note ? <p className="text-n-amber-11 text-xs leading-[1.65]">{copy.note}</p> : null}

            {errorMessage ? <p className="text-n-ruby-11 text-sm leading-[1.65]">{errorMessage}</p> : null}

            {isSubmitting ? (
                <div className="text-n-slate-11 text-sm flex items-center gap-2">
                    <Loader size={16} />
                    <span>
                        {t(
                            step.type === 'display_and_wait'
                                ? 'INBOX_MGMT.MESSENGER_PERSONAL.STEP.WAITING_APPROVAL'
                                : 'INBOX_MGMT.MESSENGER_PERSONAL.STEP.SUBMITTING',
                        )}
                    </span>
                </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
                {step.type === 'display_and_wait' && isSubmitting ? null : (
                    <Button type="submit" solid blue isLoading={isSubmitting} label={copy.submit} className="flex-1 sm:flex-none" />
                )}
                <Button
                    type="button"
                    faded
                    slate
                    label={t('INBOX_MGMT.MESSENGER_PERSONAL.STEP.CANCEL')}
                    disabled={isSubmitting && step.type !== 'display_and_wait'}
                    onClick={cancel}
                />
            </div>
        </form>
    );
}
