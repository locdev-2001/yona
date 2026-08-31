import { t } from '../../../i18n';

// Port từ sidebar/SidebarGroupEmptyLeaf.vue
export default function SidebarGroupEmptyLeaf() {
    return (
        <li className="py-1 pl-3 text-n-slate-10 border rounded-lg border-dashed text-center border-n-alpha-2 text-xs h-8 grid place-content-center select-none pointer-events-none">
            {t('SIDEBAR.NO_ITEMS')}
        </li>
    );
}
