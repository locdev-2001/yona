import { useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { CalendarDays, Check, Mail, Pencil, X } from '@admin/components/icons';
import { toast } from 'sonner';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@admin/components/ui/dialog';
import { Input } from '@admin/components/ui/input';
import { Textarea } from '@admin/components/ui/textarea';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@admin/components/ui/input-group';
import { PreviewButton } from './components';
import { previewCopy } from './copy';
import './form-preview.css';

type AppointmentValues = {
    firstName: string;
    lastName: string;
    email: string;
    date: string;
    phone: string;
    notes: string;
};
type FieldErrors = Partial<Record<keyof AppointmentValues, string>>;
const emptyValues: AppointmentValues = { firstName: '', lastName: '', email: '', date: '', phone: '', notes: '' };
const storageKey = 'yona-admin-preview:appointment';
function readAppointment(): AppointmentValues {
    try {
        const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
        if (saved && typeof saved === 'object') {
            const stored = saved as Record<string, unknown>;
            return Object.fromEntries(
                Object.keys(emptyValues).map((key) => [key, typeof stored[key] === 'string' ? stored[key] : '']),
            ) as AppointmentValues;
        }
    } catch {
        /* Form vẫn dùng được khi trình duyệt chặn lưu. */
    }
    return { ...emptyValues };
}
function validateAppointment(values: AppointmentValues): FieldErrors {
    const errors: FieldErrors = {};
    if (!values.firstName.trim()) errors.firstName = previewCopy.form_required;
    if (!values.lastName.trim()) errors.lastName = previewCopy.form_required;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = previewCopy.form_email_invalid;
    if (values.phone && !/^\d{9,10}$/.test(values.phone.replaceAll(' ', '')))
        errors.phone = previewCopy.form_phone_invalid;
    return errors;
}
function appointmentDateLabel(value: string): string {
    const date = new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime()) ? previewCopy.form_choose_date : new Intl.DateTimeFormat('vi-VN').format(date);
}
function saveAppointment(values: AppointmentValues): void {
    localStorage.setItem(storageKey, JSON.stringify(values));
}

function FormField({
    id,
    label,
    error,
    required = false,
    children,
}: {
    id: string;
    label: string;
    error?: string;
    required?: boolean;
    children: ReactNode;
}) {
    return (
        <div className="appointment-field">
            <label htmlFor={id}>
                {label}
                {required && <span aria-hidden="true"> *</span>}
            </label>
            {children}
            {error && (
                <small id={`${id}-error`} className="appointment-field-error">
                    {error}
                </small>
            )}
        </div>
    );
}

export function AppointmentForm({
    onCancel,
    onSaved,
    modal = false,
    firstInputRef,
}: {
    onCancel?: () => void;
    onSaved?: () => void;
    modal?: boolean;
    firstInputRef?: RefObject<HTMLInputElement | null>;
}) {
    const [initialValues] = useState(readAppointment);
    const [values, setValues] = useState(initialValues);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [saveError, setSaveError] = useState('');
    const [saved, setSaved] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const prefix = useId();
    const id = (field: keyof AppointmentValues) => `${prefix}-${field}`;
    const fieldProps = (field: keyof AppointmentValues) => ({
        id: id(field),
        name: field,
        value: values[field],
        'aria-invalid': Boolean(errors[field]),
        'aria-describedby': errors[field] ? `${id(field)}-error` : undefined,
        onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            setValues((current) => ({ ...current, [field]: event.target.value }));
            setErrors((current) => ({ ...current, [field]: undefined }));
            setSaved(false);
            setSaveError('');
        },
    });
    function resetForm() {
        setValues(initialValues);
        setErrors({});
        setSaveError('');
        setSaved(false);
    }
    return (
        <form
            ref={formRef}
            className={`appointment-form ${modal ? 'appointment-form--modal' : ''}`}
            noValidate
            onSubmit={(event) => {
                event.preventDefault();
                const nextErrors = validateAppointment(values);
                setErrors(nextErrors);
                setSaved(false);
                const first = Object.keys(nextErrors)[0];
                if (first) {
                    formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
                    return;
                }
                try {
                    saveAppointment({
                        ...values,
                        firstName: values.firstName.trim(),
                        lastName: values.lastName.trim(),
                        email: values.email.trim(),
                    });
                    setSaved(true);
                    toast.success(previewCopy.form_saved);
                    onSaved?.();
                } catch {
                    setSaveError(previewCopy.form_save_failed);
                }
            }}
        >
            <div className="appointment-form-body">
                <div className="appointment-field-pair">
                    <FormField
                        id={id('firstName')}
                        label={previewCopy.form_first_name}
                        required
                        error={errors.firstName}
                    >
                        <Input
                            ref={firstInputRef}
                            {...fieldProps('firstName')}
                            required
                            autoComplete="given-name"
                            placeholder={previewCopy.form_first_name_placeholder}
                        />
                    </FormField>
                    <FormField id={id('lastName')} label={previewCopy.form_last_name} required error={errors.lastName}>
                        <Input
                            {...fieldProps('lastName')}
                            required
                            autoComplete="family-name"
                            placeholder={previewCopy.form_last_name_placeholder}
                        />
                    </FormField>
                </div>
                <FormField id={id('email')} label={previewCopy.dia_chi_email} required error={errors.email}>
                    <InputGroup>
                        <InputGroupAddon align="inline-start">
                            <Mail />
                        </InputGroupAddon>
                        <InputGroupInput
                            {...fieldProps('email')}
                            type="email"
                            required
                            autoComplete="email"
                            placeholder="ban@example.test"
                        />
                    </InputGroup>
                </FormField>
                <div className="appointment-field-pair">
                    <FormField id={id('date')} label={previewCopy.form_date}>
                        <InputGroup className="appointment-date-field">
                            <InputGroupAddon align="inline-start">
                                <CalendarDays />
                            </InputGroupAddon>
                            <InputGroupInput {...fieldProps('date')} type="date" className="appointment-date-native" />
                            <span className="appointment-date-display" aria-hidden="true">
                                {values.date ? appointmentDateLabel(values.date) : previewCopy.form_choose_date}
                            </span>
                        </InputGroup>
                    </FormField>
                    <FormField id={id('phone')} label={previewCopy.form_phone} error={errors.phone}>
                        <InputGroup>
                            <InputGroupAddon align="inline-start">
                                <span className="appointment-phone-prefix">+84</span>
                            </InputGroupAddon>
                            <InputGroupInput
                                {...fieldProps('phone')}
                                type="tel"
                                inputMode="tel"
                                autoComplete="tel-national"
                                placeholder="901 234 567"
                            />
                        </InputGroup>
                    </FormField>
                </div>
                <FormField id={id('notes')} label={previewCopy.form_notes}>
                    <Textarea
                        {...fieldProps('notes')}
                        maxLength={500}
                        placeholder={previewCopy.form_notes_placeholder}
                    />
                </FormField>
                {saveError && (
                    <p className="appointment-form-error" role="alert">
                        {saveError}
                    </p>
                )}
                {saved && (
                    <p className="appointment-form-success" role="status">
                        <Check />
                        {previewCopy.form_saved}
                    </p>
                )}
            </div>
            <footer className="appointment-form-footer">
                <PreviewButton appearance="ghost" type="button" onClick={onCancel ?? resetForm}>
                    {onCancel ? previewCopy.huy : previewCopy.dat_lai}
                </PreviewButton>
                <PreviewButton appearance="primary" type="submit">
                    {previewCopy.form_submit}
                </PreviewButton>
            </footer>
        </form>
    );
}

export function AppointmentFormDemo() {
    return (
        <div className="appointment-inline">
            <header className="appointment-inline-heading">
                <h3>{previewCopy.form_title}</h3>
                <p>{previewCopy.form_description}</p>
            </header>
            <AppointmentForm />
        </div>
    );
}
export function AppointmentModalDemo() {
    const [open, setOpen] = useState(false);
    const firstInputRef = useRef<HTMLInputElement>(null);
    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger render={<PreviewButton appearance="primary" />}>
                    <Pencil />
                    {previewCopy.form_open}
                </DialogTrigger>
                <DialogContent
                    className="catalogue-overlay appointment-modal"
                    showCloseButton={false}
                    initialFocus={(interaction) => (interaction === 'touch' ? true : firstInputRef.current)}
                >
                    <DialogHeader className="appointment-modal-header">
                        <div>
                            <DialogTitle>{previewCopy.form_title}</DialogTitle>
                            <DialogClose
                                render={<PreviewButton appearance="ghost" className="appointment-modal-close" />}
                                aria-label={previewCopy.form_close}
                            >
                                <X />
                            </DialogClose>
                        </div>
                        <DialogDescription>{previewCopy.form_description}</DialogDescription>
                    </DialogHeader>
                    <AppointmentForm
                        modal
                        firstInputRef={firstInputRef}
                        onCancel={() => setOpen(false)}
                        onSaved={() => setOpen(false)}
                    />
                </DialogContent>
            </Dialog>
            <p className="catalogue-hint">{previewCopy.form_modal_hint}</p>
        </>
    );
}
