import { useState } from 'react';
import { usePage } from '@inertiajs/react';

import { t } from '../../../i18n';
import { postJson } from 'dashboard/helper/apiClient';
import { AVAILABILITY_STATUS_KEYS } from 'dashboard/constants/globals';
import Button from 'dashboard/components-next/button/Button';
import Icon from 'dashboard/components-next/icon/Icon';
import Switch from 'dashboard/components-next/switch/Switch';
import {
    DropdownBody,
    DropdownContainer,
    DropdownItem,
    DropdownSection,
} from 'dashboard/components-next/dropdown-menu/base';
import type { DashboardPageProps } from '../../types';

// Port từ sidebar/SidebarProfileMenuStatus.vue
const STATUS_COLORS = ['bg-n-teal-9', 'bg-n-amber-9', 'bg-n-slate-9'];

export default function SidebarProfileMenuStatus() {
    const { currentAccount, currentAccountUser } = usePage<DashboardPageProps>().props;

    const [availability, setAvailability] = useState(currentAccountUser.availability);
    const [autoOffline, setAutoOffline] = useState(currentAccountUser.auto_offline);

    const statusLabels = [
        t('PROFILE_SETTINGS.FORM.AVAILABILITY.STATUS.ONLINE'),
        t('PROFILE_SETTINGS.FORM.AVAILABILITY.STATUS.BUSY'),
        t('PROFILE_SETTINGS.FORM.AVAILABILITY.STATUS.OFFLINE'),
    ];

    const availabilityStatuses = statusLabels.map((statusLabel, index) => ({
        label: statusLabel,
        value: AVAILABILITY_STATUS_KEYS[index],
        color: STATUS_COLORS[index],
        active: availability === AVAILABILITY_STATUS_KEYS[index],
    }));

    const activeStatus = availabilityStatuses.find(status => status.active) ?? availabilityStatuses[0];

    const changeAvailabilityStatus = (statusValue: (typeof AVAILABILITY_STATUS_KEYS)[number]) => {
        setAvailability(statusValue);
        void postJson(`/api/v1/accounts/${currentAccount.id}/profile/availability`, {
            availability: statusValue,
        });
    };

    const changeAutoOffline = (value: boolean) => {
        setAutoOffline(value);
        void postJson(`/api/v1/accounts/${currentAccount.id}/profile/auto_offline`, {
            auto_offline: value,
        });
    };

    return (
        <DropdownSection className="[&>ul]:overflow-visible">
            <div className="grid gap-0">
                <DropdownItem preserveOpen className="gap-1">
                    <div className="flex-grow flex items-center gap-1 min-w-0">
                        {t('SIDEBAR.SET_YOUR_AVAILABILITY')}
                    </div>
                    <DropdownContainer
                        className="shrink-0"
                        menu={
                            <DropdownBody className="min-w-32 z-20">
                                {availabilityStatuses.map(status => (
                                    <DropdownItem
                                        key={status.value}
                                        label={status.label}
                                        icon={<span className={`${status.color} size-[12px] rounded`} />}
                                        className="cursor-pointer"
                                        onClick={() => changeAvailabilityStatus(status.value)}
                                    />
                                ))}
                            </DropdownBody>
                        }
                    >
                        {({ toggle }) => (
                            <Button
                                size="sm"
                                color="slate"
                                variant="faded"
                                icon="i-lucide-chevron-down"
                                trailingIcon
                                type="button"
                                onClick={toggle}
                            >
                                <div className="flex gap-1 items-center min-w-0 text-sm">
                                    <div className="p-1 flex-shrink-0">
                                        <div className={`size-2 rounded-sm ${activeStatus.color}`} />
                                    </div>
                                    <span className="truncate max-w-[7rem]">{activeStatus.label}</span>
                                </div>
                            </Button>
                        )}
                    </DropdownContainer>
                </DropdownItem>
                <DropdownItem preserveOpen>
                    <div className="flex-grow min-w-0">
                        {t('SIDEBAR.SET_AUTO_OFFLINE.TEXT')}
                        <Icon
                            icon="i-lucide-info"
                            className="inline-block align-middle ms-1 size-4 text-n-slate-10"
                        />
                    </div>
                    <Switch value={autoOffline} onChange={changeAutoOffline} />
                </DropdownItem>
            </div>
        </DropdownSection>
    );
}
