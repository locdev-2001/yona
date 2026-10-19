import { router, usePage } from '@inertiajs/react';

import Dashboard from '../Dashboard';
import ContactProfile from './profile/ContactProfile';
import type { DashboardPageProps } from '../types';

interface ContactShowPageProps extends DashboardPageProps {
    contactId: number;
}

// Mở thẳng /contacts/{id} (link chia sẻ, tải lại trang): hồ sơ nổi trên nền Dashboard.
// Từ trong app thì hồ sơ mở bằng openProfile, không chuyển trang.
export default function ContactShow() {
    const { currentAccount, contactId } = usePage<ContactShowPageProps>().props;

    const close = () => {
        if (window.history.length > 1) window.history.back();
        else router.visit(`/app/accounts/${currentAccount.id}/contacts`);
    };

    return (
        <Dashboard>
            <ContactProfile contactId={contactId} onClose={close} />
        </Dashboard>
    );
}
