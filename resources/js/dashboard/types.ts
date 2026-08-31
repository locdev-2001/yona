import type { SharedPageProps } from '../types';
import type { AvailabilityStatus } from './constants/globals';

export interface CurrentAccount {
    id: number;
    name: string;
    locale: string;
    status: number;
}

export interface CurrentAccountUser {
    role: 'agent' | 'administrator';
    availability: AvailabilityStatus;
    auto_offline: boolean;
}

export interface UserAccount {
    id: number;
    name: string;
    role: string;
}

export interface DashboardPageProps extends SharedPageProps {
    currentAccount: CurrentAccount;
    currentAccountUser: CurrentAccountUser;
    userAccounts: UserAccount[];
}

export type { AvailabilityStatus };
