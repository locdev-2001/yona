import { useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

import Button from 'dashboard/components-next/button/Button';
import WithLabel from './WithLabel';

// Port từ v3/components/Form/Input.vue
interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    name: string;
    hasError?: boolean;
    errorMessage?: string;
    spacing?: 'base' | 'compact';
    rightOfLabel?: ReactNode;
}

export default function FormInput({
    label,
    type = 'text',
    name,
    hasError = false,
    errorMessage = '',
    spacing = 'base',
    rightOfLabel,
    className,
    ...attrs
}: FormInputProps) {
    const [isPasswordVisible, setPasswordVisible] = useState(false);

    const isPasswordField = type === 'password';
    const currentInputType = isPasswordField ? (isPasswordVisible ? 'text' : 'password') : type;

    const inputClasses = [
        'block w-full border-none rounded-md shadow-sm bg-n-alpha-black2 appearance-none outline outline-1 focus:outline focus:outline-1 text-n-slate-12 placeholder:text-n-slate-10 sm:text-sm sm:leading-6',
        hasError
            ? 'error outline-n-ruby-8 hover:outline-n-ruby-9 disabled:outline-n-ruby-8'
            : 'outline-n-weak hover:outline-n-slate-6 focus:outline-n-brand',
        spacing === 'base' ? 'px-3 py-3' : 'px-3 py-2 mb-0',
        isPasswordField ? 'pr-10' : '',
        className ?? '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <WithLabel
            label={label}
            name={name}
            hasError={hasError}
            errorMessage={errorMessage}
            rightOfLabel={rightOfLabel}
        >
            <input name={name} type={currentInputType} className={inputClasses} {...attrs} />
            {isPasswordField ? (
                <Button
                    type="button"
                    slate
                    sm
                    link
                    icon={isPasswordVisible ? 'i-lucide-eye-off' : 'i-lucide-eye'}
                    className="absolute inset-y-0 right-0 pr-3"
                    aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                    aria-pressed={isPasswordVisible}
                    onClick={() => setPasswordVisible(visible => !visible)}
                />
            ) : null}
        </WithLabel>
    );
}
