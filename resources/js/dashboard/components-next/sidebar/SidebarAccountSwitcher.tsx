import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import Icon from 'dashboard/components-next/icon/Icon';
import Logo from 'dashboard/components-next/icon/Logo';
import { DropdownBody, DropdownContainer, DropdownItem, DropdownSection } from 'dashboard/components-next/dropdown-menu/base';
import type { DashboardPageProps } from '../../types';

// Port từ sidebar/SidebarAccountSwitcher.vue
// (nút "New account" theo CREATE_NEW_ACCOUNT_FROM_DASHBOARD — mặc định tắt, vào sau)
export default function SidebarAccountSwitcher({ isCollapsed = false }: { isCollapsed?: boolean }) {
    const { currentAccount, userAccounts } = usePage<DashboardPageProps>().props;

    const showAccountSwitcher = userAccounts.length > 1 && Boolean(currentAccount.name);

    const sortedAccounts = [...userAccounts].sort((a, b) => a.name.localeCompare(b.name));

    const onChangeAccount = (newId: number) => {
        window.location.href = `/app/accounts/${newId}/dashboard`;
    };

    const menu =
        showAccountSwitcher || isCollapsed ? (
            <DropdownBody className="min-w-80 z-50">
                <DropdownSection title={t('SIDEBAR_ITEMS.SWITCH_ACCOUNT')}>
                    {sortedAccounts.map(account => (
                        <DropdownItem
                            key={account.id}
                            className="cursor-pointer"
                            onClick={() => onChangeAccount(account.id)}
                        >
                            <div className="flex justify-between items-center w-full gap-2">
                                <div className="text-left rtl:text-right flex gap-2 items-center min-w-0">
                                    <span className="text-n-slate-12 max-w-36 truncate min-w-0" title={account.name}>
                                        {account.name}
                                    </span>
                                    <div className="flex-shrink-0 w-px h-3 bg-n-strong" />
                                    <span className="text-n-slate-11 max-w-24 truncate capitalize">{account.role}</span>
                                </div>
                                {account.id === currentAccount.id ? (
                                    <Icon icon="i-lucide-check" className="text-n-teal-11 size-5" />
                                ) : null}
                            </div>
                        </DropdownItem>
                    ))}
                </DropdownSection>
            </DropdownBody>
        ) : null;

    return (
        <DropdownContainer className={isCollapsed ? '' : 'flex-grow -mx-1 min-w-0'} menu={menu}>
            {({ toggle, isOpen }) =>
                isCollapsed ? (
                    <button
                        className={`grid flex-shrink-0 place-content-center p-2 rounded-lg cursor-pointer hover:bg-n-alpha-1 ${isOpen ? 'bg-n-alpha-1' : ''}`}
                        title={currentAccount.name}
                        onClick={toggle}
                    >
                        <Logo className="size-7" />
                    </button>
                ) : (
                    <button
                        id="sidebar-account-switcher"
                        data-account-id={currentAccount.id}
                        aria-haspopup="listbox"
                        className={`flex items-center gap-2 justify-between w-full rounded-lg px-2 ${isOpen ? 'bg-n-alpha-1' : ''} ${
                            showAccountSwitcher ? 'hover:bg-n-alpha-1 cursor-pointer' : 'cursor-default'
                        }`}
                        onClick={() => showAccountSwitcher && toggle()}
                    >
                        <span className="text-sm font-medium leading-5 text-n-slate-12 truncate" aria-live="polite">
                            {currentAccount.name}
                        </span>
                        {showAccountSwitcher ? (
                            <span
                                aria-hidden="true"
                                className="i-lucide-chevron-down size-4 text-n-slate-10 flex-shrink-0"
                            />
                        ) : null}
                    </button>
                )
            }
        </DropdownContainer>
    );
}
