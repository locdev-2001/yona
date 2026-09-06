import type { ReactNode } from 'react';

import Icon from 'dashboard/components-next/icon/Icon';
import Input from 'dashboard/components-next/input/Input';
import CustomBrandPolicyWrapper from 'dashboard/components/CustomBrandPolicyWrapper';
import { getHelpUrlForFeature } from 'dashboard/helper/featureHelper';

// Port từ dashboard/routes/dashboard/settings/components/BaseSettingsHeader.vue
// (back button vào cùng các màn settings dùng nó ở nhóm sau).
interface BaseSettingsHeaderProps {
    title: string;
    description?: ReactNode;
    linkText?: string;
    featureName?: string;
    searchPlaceholder?: string;
    searchQuery?: string;
    onSearchQueryChange?: (query: string) => void;
    tabs?: ReactNode;
    count?: ReactNode;
    actions?: ReactNode;
}

export default function BaseSettingsHeader({
    title,
    description = '',
    linkText = '',
    featureName = '',
    searchPlaceholder = '',
    searchQuery = '',
    onSearchQueryChange,
    tabs,
    count,
    actions,
}: BaseSettingsHeaderProps) {
    const helpURL = getHelpUrlForFeature(featureName);

    return (
        <>
            <div className="flex flex-col items-start w-full">
                {title ? (
                    <div className="flex items-center justify-between w-full gap-4 min-h-8 mb-2">
                        <h1 className="text-heading-1 text-n-slate-12">{title}</h1>
                    </div>
                ) : null}
                {description || (helpURL && linkText) ? (
                    <div className="flex flex-col w-full gap-1.5 text-n-slate-11">
                        {description ? (
                            <p className="mb-0 line-clamp-5 sm:line-clamp-none max-w-3xl text-body-main">
                                {description}
                            </p>
                        ) : null}
                        <CustomBrandPolicyWrapper showOnCustomBrandedInstance={false}>
                            {helpURL && linkText ? (
                                <a
                                    href={helpURL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="items-center hidden gap-1 text-sm font-medium sm:inline-flex w-fit text-n-blue-11 hover:underline mb-2"
                                >
                                    {linkText}
                                    <Icon
                                        icon="i-lucide-chevron-right"
                                        className="flex-shrink-0 text-n-blue-11 size-4"
                                    />
                                </a>
                            ) : null}
                        </CustomBrandPolicyWrapper>
                    </div>
                ) : null}
            </div>
            {searchPlaceholder || actions || tabs ? (
                <div className="gap-3 flex flex-wrap sm:flex-nowrap justify-between sm:mt-4 min-w-0">
                    {tabs || searchPlaceholder ? (
                        <div className={`flex items-center gap-3 min-w-0 ${tabs ? '' : 'hidden sm:flex'}`}>
                            {tabs}
                            {searchPlaceholder ? (
                            <Input
                                type="search"
                                size="sm"
                                value={searchQuery}
                                placeholder={searchPlaceholder}
                                className="group w-56 min-w-0 hidden sm:flex [&>input]:ltr:!pl-8 [&>input]:rtl:!pr-8 [&>input]:!rounded-[0.625rem]"
                                onChange={event => onSearchQueryChange?.(event.target.value)}
                                prefix={
                                    <Icon
                                        icon="i-lucide-search"
                                        className="absolute top-1/2 -translate-y-1/2 text-n-slate-11 group-focus-within:text-n-brand size-3.5 ltr:left-2.5 rtl:right-2.5"
                                    />
                                }
                            />
                            ) : null}
                        </div>
                    ) : null}
                    <div className={`flex items-center gap-3 shrink-0 ${tabs ? '' : 'flex-row-reverse sm:flex-row'}`}>
                        {count}
                        {count && actions ? (
                            <div className="w-px h-3 rounded-lg bg-n-weak ltr:ml-1 ltr:mr-2 rtl:ml-2 rtl:mr-1 flex-shrink-0" />
                        ) : null}
                        {actions}
                    </div>
                </div>
            ) : null}
        </>
    );
}
