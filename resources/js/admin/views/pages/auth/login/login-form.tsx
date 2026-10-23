import { useState } from 'react';
import { EyeIcon, EyeOffIcon, LockIcon, MailIcon } from '@admin/components/icons';
import { Alert, AlertDescription } from '@admin/components/ui/alert';
import { Field, FieldError, FieldGroup, FieldLabel } from '@admin/components/ui/field';
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@admin/components/ui/input-group';
import { PreviewButton } from '../../../../../superadmin/design-preview/components';

type Props = {
    id?: string;
    autoFocus?: boolean;
    email: string;
    password: string;
    error?: string | null;
    processing?: boolean;
    fieldErrors?: { email?: string; password?: string; };
    labels: { email: string; emailPlaceholder: string; password: string; submit: string; showPassword: string; hidePassword: string; };
    onEmailChange: (value: string) => void;
    onPasswordChange: (value: string) => void;
    onSubmit: () => void;
};
export default function LoginForm({ id, autoFocus = true, email, password, error, processing, fieldErrors = {}, labels, onEmailChange, onPasswordChange, onSubmit }: Props) {
    const [isVisible, setIsVisible] = useState(false);
    return <form id={id} onSubmit={event => { event.preventDefault(); onSubmit(); }}>
        <FieldGroup>
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <Field data-invalid={fieldErrors.email ? true : undefined}>
                <FieldLabel htmlFor="super_admin_email" className="sr-only">{labels.email}</FieldLabel>
                <InputGroup><InputGroupAddon><MailIcon /></InputGroupAddon><InputGroupInput autoFocus={autoFocus} autoComplete="email" type="email" id="super_admin_email" aria-invalid={!!fieldErrors.email} aria-describedby={fieldErrors.email ? "super_admin_email_error" : undefined} placeholder={labels.emailPlaceholder} value={email} onChange={event => onEmailChange(event.target.value)} /></InputGroup>
                {fieldErrors.email && <FieldError id="super_admin_email_error">{fieldErrors.email}</FieldError>}
            </Field>
            <Field data-invalid={fieldErrors.password ? true : undefined}>
                <FieldLabel htmlFor="super_admin_password" className="sr-only">{labels.password}</FieldLabel>
                <InputGroup><InputGroupAddon><LockIcon /></InputGroupAddon><InputGroupInput id="super_admin_password" aria-invalid={!!fieldErrors.password} aria-describedby={fieldErrors.password ? "super_admin_password_error" : undefined} autoComplete="current-password" type={isVisible ? 'text' : 'password'} placeholder={labels.password} value={password} onChange={event => onPasswordChange(event.target.value)} /><InputGroupAddon align="inline-end"><InputGroupButton type="button" onClick={() => setIsVisible(previous => !previous)} aria-label={isVisible ? labels.hidePassword : labels.showPassword}>{isVisible ? <EyeOffIcon /> : <EyeIcon />}</InputGroupButton></InputGroupAddon></InputGroup>
                {fieldErrors.password && <FieldError id="super_admin_password_error">{fieldErrors.password}</FieldError>}
            </Field>
            <Field><PreviewButton appearance="primary" className="w-full" type="submit" disabled={processing}>{labels.submit}</PreviewButton></Field>
        </FieldGroup>
    </form>;
}
