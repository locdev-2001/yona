import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@inertiajs/react', () => ({ usePage: () => ({ props: { currentAccount: { id: 2 }, contactId: 3 } }), router: { visit: vi.fn() } }));
vi.mock('../Dashboard', () => ({ default: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('dashboard/contacts/api', () => ({ fetchContact: () => Promise.resolve({ id: 3, name: 'Lan', customAttributes: { tier: 'vip' } }), updateContact: vi.fn() }));
vi.mock('dashboard/contacts/contactUpdates', () => ({ useContactUpdates: vi.fn(), mergeContactUpdate: vi.fn() }));
vi.mock('dashboard/components-next/Contacts/ContactsDetailsLayout', () => ({ default: ({ children, sidebarHeader, sidebar }: { children: ReactNode; sidebarHeader: ReactNode; sidebar: ReactNode }) => <>{children}{sidebarHeader}{sidebar}</> }));
vi.mock('dashboard/components-next/Contacts/Pages/ContactDetails', () => ({ default: () => <div>Lan</div> }));
vi.mock('dashboard/components-next/tabbar/TabBar', () => ({ default: ({ tabs, onTabChanged }: { tabs: { label: string; value: string }[]; onTabChanged: (tab: { value: string }) => void }) => <>{tabs.map(tab => <button key={tab.value} onClick={() => onTabChanged(tab)}>{tab.value}</button>)}</> }));
vi.mock('dashboard/components-next/Contacts/ContactsSidebar/ContactCustomAttributes', () => ({ default: () => <div>Thuộc tính tùy biến</div> }));
vi.mock('dashboard/components-next/Contacts/ContactsSidebar/ContactHistory', () => ({ default: () => <div>Lịch sử khách</div> }));
vi.mock('dashboard/components-next/Contacts/ContactsSidebar/ContactNotes', () => ({ default: () => <div>Ghi chú khách</div> }));
vi.mock('dashboard/components-next/Contacts/ContactsSidebar/ContactMedia', () => ({ default: () => <div>Tệp khách</div> }));
vi.mock('dashboard/components-next/Contacts/ContactsSidebar/ContactMerge', () => ({ default: ({ onResetTab }: { onResetTab: () => void }) => <button onClick={onResetTab}>Gộp hoàn tất</button> }));

import ContactShow from './Show';

describe('Hồ sơ khách tinh gọn', () => {
    it('mở lịch sử, giữ ghi chú/tệp/gộp và không trở về tab thuộc tính bị ẩn sau gộp', async () => {
        render(<ContactShow />);
        expect(await screen.findByText('Lịch sử khách')).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'attributes' })).toBeNull();
        expect(screen.queryByText('Thuộc tính tùy biến')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'notes' }));
        expect(screen.getByText('Ghi chú khách')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'media' }));
        expect(screen.getByText('Tệp khách')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'merge' }));
        fireEvent.click(screen.getByText('Gộp hoàn tất'));
        expect(screen.getByText('Lịch sử khách')).toBeTruthy();
    });
});
