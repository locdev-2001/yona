import Dashboard from '../../Dashboard';
import LocalesPage from '../components/LocalesPage';
import { useHelpCenterPage } from './usePortalPage';

// Port từ routes/dashboard/helpcenter/pages/PortalsLocalesIndexPage.vue.
export default function PortalsLocalesIndex({ portalSlug }: { portalSlug: string }) {
    const { portal, allowedLocales } = useHelpCenterPage(portalSlug);

    return (
        <Dashboard>
            <LocalesPage locales={allowedLocales} portal={portal ?? null} portalSlug={portalSlug} />
        </Dashboard>
    );
}
