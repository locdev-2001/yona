import { usePreference } from './preferences';
import { NotificationsPreview } from './notifications-preview';
import { NavigationSidebar, type SidebarGroup } from './navigation-sidebar';
import { previewCopy, previewText } from './copy';
import {
    Activity,
    ArrowDownToLine,
    ArrowRight,
    BookOpen,
    Check,
    ChevronRight,
    Command,
    Grid2X2,
    Inbox,
    Layers3,
    Mail,
    FileText,
    Table2,
    LayoutDashboard,
    Menu,
    MessageSquare,
    Moon,
    Palette,
    Search,
    Settings2,
    ShieldCheck,
    SlidersHorizontal,
    Sun,
    Users,
    X,
    Zap,
} from '@admin/components/icons';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
    MetricCard,
    SearchField,
    Panel,
    PreviewButton,
    SegmentedControl,
    SkeletonBlock,
    Sparkline,
    StatusBadge,
    TaskRow,
} from './components';
import type { Tone } from './components';
import { channels, initialTasks, metricsByPeriod, periodLabels, periodOptions } from './fixtures';
import type { Period } from './fixtures';
import { colorTokens, dimensionTokens, spacingTokens, themeStyle } from './tokens';
import type { PreviewTheme } from './tokens';
import './preview.css';
import './field-controls.css';
import './scrollbars.css';

const sidebarGroups: SidebarGroup[] = [
    {
        id: 'workspace',
        label: previewCopy.khong_gian_lam_viec_2,
        items: [
            { id: 'overview', label: previewCopy.tong_quan, Icon: LayoutDashboard },
            { id: 'users', label: previewCopy.nguoi_dung, Icon: Users, count: '2,8k' },
            { id: 'inbox', label: previewCopy.hop_thu_ca_nhan, Icon: Inbox },
            {
                id: 'connections',
                label: previewCopy.ket_noi_kenh,
                Icon: Zap,
                notificationCount: 3,
                children: [
                    { id: 'connection-yona', label: 'Yona', Icon: MessageSquare },
                    { id: 'connection-zalo', label: previewCopy.zalo_ca_nhan, Icon: Zap },
                    { id: 'connection-email', label: 'Email', Icon: Mail },
                ],
            },
            { id: 'activity', label: previewCopy.hoat_dong_he_thong, Icon: Activity },
        ],
    },
    {
        id: 'design',
        label: previewCopy.sidebar_design_group,
        items: [
            {
                id: 'components',
                label: previewCopy.bo_component,
                Icon: Grid2X2,
                children: [
                    { id: 'components-all', label: previewCopy.sidebar_components_all, Icon: Grid2X2 },
                    { id: 'components-form', label: previewCopy.sidebar_components_form, Icon: FileText },
                    { id: 'components-table', label: previewCopy.sidebar_components_table, Icon: Table2 },
                ],
            },
            { id: 'tokens', label: previewCopy.design_token, Icon: Palette },
            { id: 'customize', label: previewCopy.tuy_chinh_giao_dien, Icon: Settings2 },
        ],
    },
];

const viewOptions = ['overview', 'components', 'tokens'] as const;
const viewLabels = {
    overview: previewCopy.tong_quan,
    components: previewCopy.bo_component,
    tokens: previewCopy.design_token,
};
type PreviewView = (typeof viewOptions)[number];

const sidebarDestinations: Record<
    string,
    { view: PreviewView; section?: string; channelQuery?: string; componentQuery?: string }
> = {
    overview: { view: 'overview' },
    users: { view: 'overview', section: 'channels' },
    inbox: { view: 'overview', section: 'channels' },
    activity: { view: 'overview', section: 'tasks' },
    'connection-yona': { view: 'overview', section: 'channels', channelQuery: 'Yona' },
    'connection-zalo': { view: 'overview', section: 'channels', channelQuery: previewCopy.zalo_ca_nhan },
    'connection-email': { view: 'overview', section: 'channels', channelQuery: 'Email' },
    'components-all': { view: 'components', componentQuery: '' },
    'components-form': { view: 'components', componentQuery: 'Form' },
    'components-table': { view: 'components', componentQuery: 'Data table' },
    tokens: { view: 'tokens' },
};
const defaultNavigation: Record<PreviewView, string> = {
    overview: 'overview',
    components: 'components-all',
    tokens: 'tokens',
};

const ComponentGallery = lazy(() => import('./gallery'));
const TrafficChart = lazy(() => import('./charts').then((module) => ({ default: module.TrafficChart })));
const ChannelDistribution = lazy(() => import('./charts').then((module) => ({ default: module.ChannelDistribution })));
const ActivityCharts = lazy(() => import('./charts').then((module) => ({ default: module.ActivityCharts })));

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        dialogRef.current?.showModal();
    }, []);
    return (
        <dialog
            ref={dialogRef}
            className="preview-dialog"
            aria-labelledby="preview-dialog-heading"
            onClose={onClose}
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <header>
                <h2 id="preview-dialog-heading">{title}</h2>
                <PreviewButton appearance="ghost" aria-label={previewCopy.dong_hop_thoai} onClick={onClose}>
                    <X />
                </PreviewButton>
            </header>
            {children}
        </dialog>
    );
}

function TokenGallery({ theme }: { theme: PreviewTheme }) {
    return (
        <>
            <div className="token-note">
                <Palette />
                <p>{previewCopy.token_source_note}</p>
            </div>
            <Panel
                className="token-spacing-panel"
                title={previewCopy.spacing_tokens_title}
                description={previewCopy.spacing_tokens_description}
            >
                <dl className="token-dimensions token-spacing">
                    {Object.entries(spacingTokens).map(([name, value]) => (
                        <div key={name}>
                            <dt>{name}</dt>
                            <dd>{value}</dd>
                        </div>
                    ))}
                </dl>
            </Panel>
            <Panel
                title={previewCopy.mau_sac}
                description={previewCopy.gia_tri_dang_hien_thi_lay_truc_tiep_tu_nguon_token_cua_ban_thu_nghiem}
            >
                <div className="color-grid">
                    {colorTokens.map((token) => (
                        <article key={token.name}>
                            <div className="color-swatch" style={{ background: token[theme] }} />
                            <div>
                                <strong>{token.label}</strong>
                                <code>--preview-{token.name}</code>
                                <span>{token[theme].toUpperCase()}</span>
                            </div>
                        </article>
                    ))}
                </div>
            </Panel>
            <div className="token-detail-grid">
                <Panel title={previewCopy.kich_thuoc_khoang_cach}>
                    <dl className="token-dimensions">
                        {Object.entries(dimensionTokens).map(([name, value]) => (
                            <div key={name}>
                                <dt>{name}</dt>
                                <dd>{value}</dd>
                            </div>
                        ))}
                    </dl>
                </Panel>
                <Panel title="Typography" description={previewCopy.typography_specification}>
                    <div className="type-specimen">
                        <h1>{previewCopy.tong_quan_he_thong}</h1>
                        <p className="type-section">{previewCopy.hoat_dong_theo_kenh}</p>
                        <p>{previewCopy.noi_dung_de_doc_gon_va_co_phan_cap_ro_rang}</p>
                        <span>{previewCopy.thong_tin_bo_tro_cap_nhat_gan_day}</span>
                        <strong>148.392</strong>
                    </div>
                    <div className="token-note">
                        <p>
                            {
                                previewCopy.spacing_theo_thang_4px_icon_16_20px_vien_1px_be_mat_phan_cap_bang_sac_do_khong_dung_bong_lon_tren_tu
                            }
                        </p>
                    </div>
                </Panel>
            </div>
        </>
    );
}

export default function AdminDesignPreview() {
    const [theme, setTheme] = usePreference<PreviewTheme>(
        'theme',
        'dark',
        (candidate): candidate is PreviewTheme => candidate === 'dark' || candidate === 'light',
    );
    useEffect(() => {
        const documentRoot = document.documentElement;
        documentRoot.dataset.adminPreview = 'true';
        documentRoot.dataset.theme = theme;
        documentRoot.classList.toggle('dark', theme === 'dark');
        Object.entries(themeStyle(theme)).forEach(([name, value]) =>
            documentRoot.style.setProperty(name, String(value)),
        );
    }, [theme]);
    const [period, setPeriod] = usePreference<Period>('period', 'week', (candidate): candidate is Period =>
        periodOptions.includes(candidate as Period),
    );
    const [hiddenMetrics, setHiddenMetrics] = usePreference<string[]>(
        'hidden-metrics',
        [],
        (candidate): candidate is string[] =>
            Array.isArray(candidate) && candidate.every((item) => typeof item === 'string'),
    );
    const [completedTasks, setCompletedTasks] = usePreference<string[]>(
        'completed-tasks',
        [],
        (candidate): candidate is string[] =>
            Array.isArray(candidate) && candidate.every((item) => typeof item === 'string'),
    );
    const [view, setView] = useState<PreviewView>('components');
    const [activeNavigation, setActiveNavigation] = useState('components-all');
    const [galleryRequest, setGalleryRequest] = useState({ query: '', revision: 0 });
    const [sidebarCollapsed, setSidebarCollapsed] = usePreference(
        'sidebar-collapsed',
        false,
        (candidate): candidate is boolean => typeof candidate === 'boolean',
    );
    const [skeleton, setSkeleton] = useState(false);
    const [mobileNav, setMobileNav] = useState(false);
    const [modal, setModal] = useState<'customize' | 'help' | null>(null);
    const [search, setSearch] = useState('');
    const [notice, setNotice] = useState('');
    const searchRef = useRef<HTMLInputElement>(null);
    const mainRef = useRef<HTMLElement>(null);
    const metricCards = metricsByPeriod[period];
    const filteredChannels = channels.filter((channel) =>
        `${channel.name} ${channel.description} ${channel.status}`
            .toLocaleLowerCase('vi')
            .includes(search.toLocaleLowerCase('vi')),
    );

    useEffect(() => {
        const listener = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setView('overview');
                searchRef.current?.focus();
            }
            if (event.key === 'Escape') setMobileNav(false);
        };
        window.addEventListener('keydown', listener);
        return () => window.removeEventListener('keydown', listener);
    }, []);
    useEffect(() => {
        if (!notice) return;
        const timeout = window.setTimeout(() => setNotice(''), 4000);
        return () => window.clearTimeout(timeout);
    }, [notice]);

    const visitSection = (id: string) => {
        setView('overview');
        setMobileNav(false);
        window.requestAnimationFrame(() =>
            document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        );
    };
    const exportReport = () => {
        const report =
            '\uFEFF' +
            [
                previewCopy.kenh_tin_nhan_minh_hoa_7_ngay_trang_thai,
                ...channels.map((channel) => `"${channel.name}","${channel.count}","${channel.status}"`),
            ].join('\r\n');
        const downloadUrl = URL.createObjectURL(new Blob([report], { type: 'text/csv;charset=utf-8' }));
        const anchor = document.createElement('a');
        anchor.href = downloadUrl;
        anchor.download = 'yona-du-lieu-minh-hoa.csv';
        anchor.click();
        URL.revokeObjectURL(downloadUrl);
        setNotice(previewCopy.da_xuat_bang_du_lieu_minh_hoa_7_ngay);
    };

    return (
        <div className="admin-preview" data-theme={theme} style={themeStyle(theme)}>
            <a className="skip-link" href="#preview-main">
                {previewCopy.bo_qua_dieu_huong}
            </a>
            <NavigationSidebar
                groups={sidebarGroups}
                activeId={
                    sidebarDestinations[activeNavigation]?.view === view ? activeNavigation : defaultNavigation[view]
                }
                collapsed={sidebarCollapsed}
                onCollapsedChange={setSidebarCollapsed}
                mobileOpen={mobileNav}
                onMobileClose={() => setMobileNav(false)}
                theme={theme}
                onThemeChange={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                onHelp={() => {
                    setMobileNav(false);
                    setModal('help');
                }}
                onCustomize={() => {
                    setMobileNav(false);
                    setModal('customize');
                }}
                onNavigate={(id) => {
                    setMobileNav(false);
                    if (id === 'customize') {
                        setModal('customize');
                        return;
                    }
                    const destination = sidebarDestinations[id];
                    if (!destination) return;
                    setActiveNavigation(id);
                    if (destination.view === 'components')
                        setGalleryRequest((current) => ({
                            query: destination.componentQuery ?? '',
                            revision: current.revision + 1,
                        }));
                    if (destination.channelQuery !== undefined) setSearch(destination.channelQuery);
                    else if (destination.section === 'channels') setSearch('');
                    if (destination.section) visitSection(destination.section);
                    else {
                        setView(destination.view);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                }}
            />
            <div className="preview-workspace">
                <header className="preview-topbar">
                    <div className="topbar-breadcrumb">
                        <PreviewButton
                            className="mobile-menu"
                            appearance="ghost"
                            aria-label={previewCopy.mo_dieu_huong}
                            aria-expanded={mobileNav}
                            onClick={() => setMobileNav((value) => !value)}
                        >
                            <Menu />
                        </PreviewButton>
                        <span>{previewCopy.khong_gian_lam_viec_2}</span>
                        <ChevronRight />
                        <strong>{viewLabels[view]}</strong>
                    </div>
                    <div className="topbar-actions">
                        <SearchField
                            className="global-search"
                            inputRef={searchRef}
                            label={previewCopy.tim_kenh_trong_ban_xem_truoc}
                            placeholder={previewCopy.tim_trong_khong_gian}
                            clearLabel={previewCopy.xoa_tim_kiem_trong_khong_gian}
                            value={search}
                            onChange={(value) => {
                                setSearch(value);
                                setView('overview');
                            }}
                            shortcut
                        />
                        <PreviewButton
                            appearance="ghost"
                            aria-label={
                                theme === 'dark'
                                    ? previewCopy.chuyen_sang_giao_dien_sang
                                    : previewCopy.chuyen_sang_giao_dien_toi
                            }
                            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                        >
                            {theme === 'dark' ? <Sun /> : <Moon />}
                        </PreviewButton>
                        <NotificationsPreview />
                    </div>
                </header>
                <main ref={mainRef} id="preview-main" className="preview-main">
                    <div className="page-intro">
                        <div>
                            <p className="eyebrow">
                                <span /> {previewCopy.khong_gian_quan_tri}
                            </p>
                            <h1>
                                {view === 'overview'
                                    ? previewCopy.moi_thu_trong_tam_mat
                                    : view === 'components'
                                      ? previewCopy.mot_ngon_ngu_nhieu_kha_nang
                                      : previewCopy.nhung_chi_tiet_lam_nen_tong_the}
                            </h1>
                            <p>
                                {view === 'overview'
                                    ? previewCopy.mot_goc_nhin_ro_rang_ve_hoat_dong_va_suc_khoe_cua_yona
                                    : view === 'components'
                                      ? previewCopy.cac_thanh_phan_dung_chung_san_sang_de_ap_dung_nhat_quan
                                      : previewCopy.mau_sac_khoang_cach_va_typography_co_mot_nguon_thong_nhat}
                            </p>
                        </div>
                        <div className="intro-status">
                            <span className="status-orbit">
                                <Check />
                            </span>
                            <div>
                                <strong>{previewCopy.he_thong_on_dinh}</strong>
                                <span>{previewCopy.du_lieu_minh_hoa_22_10_2026}</span>
                            </div>
                        </div>
                    </div>
                    <div className="page-toolbar">
                        <div className="view-tabs" role="group" aria-label={previewCopy.che_do_xem_thiet_ke}>
                            {viewOptions.map((option) => (
                                <button key={option} aria-pressed={view === option} onClick={() => setView(option)}>
                                    {option === 'overview' ? (
                                        <LayoutDashboard />
                                    ) : option === 'components' ? (
                                        <Grid2X2 />
                                    ) : (
                                        <Palette />
                                    )}
                                    {viewLabels[option]}
                                </button>
                            ))}
                        </div>
                        <div className="toolbar-actions">
                            <PreviewButton
                                appearance="ghost"
                                aria-pressed={skeleton}
                                onClick={() => {
                                    setSkeleton((value) => !value);
                                    setView('overview');
                                }}
                            >
                                <Layers3 />
                                {skeleton ? previewCopy.hien_noi_dung : 'Xem skeleton'}
                            </PreviewButton>
                            <PreviewButton
                                onClick={() => setModal('customize')}
                                aria-label={previewCopy.tuy_chinh_cac_the_so_lieu}
                            >
                                <SlidersHorizontal />
                                <span>{previewCopy.tuy_chinh}</span>
                            </PreviewButton>
                        </div>
                    </div>
                    {view === 'components' ? (
                        <Suspense fallback={<SkeletonBlock className="skeleton-chart" />}>
                            <ComponentGallery
                                key={galleryRequest.revision}
                                theme={theme}
                                initialQuery={galleryRequest.query}
                            />
                        </Suspense>
                    ) : view === 'tokens' ? (
                        <TokenGallery theme={theme} />
                    ) : (
                        <>
                            <div className="overview-heading">
                                <div>
                                    <h2>
                                        {previewCopy.tong_quan_hoat_dong} <span>01</span>
                                    </h2>
                                    <p>{previewCopy.nhung_chi_so_dang_quan_tam_trong_ky}</p>
                                </div>
                                <SegmentedControl
                                    options={periodOptions}
                                    value={period}
                                    onChange={setPeriod}
                                    label={previewCopy.khoang_thoi_gian_thong_ke}
                                    getLabel={(option) => periodLabels[option]}
                                />
                            </div>
                            <div
                                className="metrics-grid"
                                aria-label={
                                    skeleton
                                        ? previewCopy.bo_cuc_cac_the_so_lieu_khi_dang_tai
                                        : previewCopy.cac_the_so_lieu_minh_hoa
                                }
                            >
                                {metricCards
                                    .filter((metric) => !hiddenMetrics.includes(metric.label))
                                    .map((metric) =>
                                        skeleton ? (
                                            <div className="metric-card" key={metric.label}>
                                                <SkeletonBlock className="skeleton-caption" />
                                                <SkeletonBlock className="skeleton-value" />
                                                <SkeletonBlock className="skeleton-caption" />
                                            </div>
                                        ) : (
                                            <MetricCard key={metric.label} {...metric} tone={metric.tone as Tone} />
                                        ),
                                    )}
                            </div>
                            {hiddenMetrics.length === 4 && (
                                <div className="empty-state">
                                    <p>{previewCopy.cac_the_so_lieu_dang_duoc_an}</p>
                                    <PreviewButton onClick={() => setHiddenMetrics([])}>
                                        {previewCopy.hien_lai_cac_the}
                                    </PreviewButton>
                                </div>
                            )}
                            <div className="charts-grid">
                                <Panel
                                    title={previewCopy.luu_luong_tin_nhan}
                                    description={previewText(
                                        'tong_so_tin_da_gui_trong_0_qua_tat_ca_cac_kenh',
                                        periodLabels[period],
                                    )}
                                    action={
                                        <span className="panel-kicker">
                                            <Activity />
                                            {previewCopy.hoat_dong}
                                        </span>
                                    }
                                >
                                    {skeleton ? (
                                        <SkeletonBlock className="skeleton-chart" />
                                    ) : (
                                        <>
                                            <div className="chart-summary">
                                                <strong>
                                                    {metricCards[1].value}
                                                    <span>{previewCopy.tin_nhan}</span>
                                                </strong>
                                                <span className="chart-change tone-positive">
                                                    ↗ {metricCards[1].change}
                                                </span>
                                            </div>
                                            <Suspense fallback={<SkeletonBlock className="skeleton-chart" />}>
                                                <TrafficChart period={period} />
                                            </Suspense>
                                        </>
                                    )}
                                </Panel>
                                <Panel
                                    title={previewCopy.phan_bo_theo_kenh}
                                    description={previewCopy.ty_trong_tin_nhan_mau_7_ngay}
                                    action={<MessageSquare className="muted" />}
                                >
                                    {skeleton ? (
                                        <SkeletonBlock className="skeleton-chart" />
                                    ) : (
                                        <Suspense fallback={<SkeletonBlock className="skeleton-chart" />}>
                                            <ChannelDistribution />
                                        </Suspense>
                                    )}
                                </Panel>
                            </div>
                            <Suspense fallback={<SkeletonBlock className="skeleton-chart" />}>
                                <ActivityCharts skeleton={skeleton} />
                            </Suspense>
                            <div className="details-grid">
                                <Panel
                                    id="channels"
                                    title={previewCopy.hieu_suat_ket_noi}
                                    description={previewCopy.moi_kenh_mot_phan_cua_trai_nghiem_lien_mach}
                                    action={
                                        <PreviewButton
                                            appearance="ghost"
                                            onClick={exportReport}
                                            aria-label={previewCopy.xuat_bang_du_lieu_minh_hoa}
                                        >
                                            <ArrowDownToLine />
                                        </PreviewButton>
                                    }
                                >
                                    <div className="table-toolbar">
                                        <SearchField
                                            className="table-search"
                                            label={previewCopy.loc_kenh_ket_noi}
                                            placeholder={previewCopy.tim_kenh_ket_noi}
                                            clearLabel={previewCopy.xoa_bo_loc_kenh}
                                            value={search}
                                            onChange={setSearch}
                                        />
                                        <span>
                                            {filteredChannels.length} {previewCopy.kenh_ket_noi}
                                        </span>
                                    </div>
                                    <div className="table-scroll">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>{previewCopy.kenh_ket_noi_2}</th>
                                                    <th>{previewCopy.tin_nhan_7_ngay}</th>
                                                    <th>{previewCopy.xu_huong}</th>
                                                    <th>{previewCopy.trang_thai}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredChannels.map((channel, index) => (
                                                    <tr key={channel.name}>
                                                        <td>
                                                            <div className="channel-name">
                                                                <span className={`channel-icon tone-${channel.tone}`}>
                                                                    {channel.initial}
                                                                </span>
                                                                <div>
                                                                    <strong>{channel.name}</strong>
                                                                    <span>{channel.description}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            {skeleton ? (
                                                                <SkeletonBlock className="skeleton-caption" />
                                                            ) : (
                                                                new Intl.NumberFormat('vi-VN').format(channel.count)
                                                            )}
                                                        </td>
                                                        <td>
                                                            <Sparkline
                                                                tone={channel.tone as Tone}
                                                                points={metricCards[index].points}
                                                            />
                                                        </td>
                                                        <td>
                                                            <StatusBadge
                                                                tone={
                                                                    channel.status === previewCopy.on_dinh
                                                                        ? 'positive'
                                                                        : 'warning'
                                                                }
                                                            >
                                                                {channel.status}
                                                            </StatusBadge>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {filteredChannels.length === 0 && (
                                        <div className="empty-state">
                                            <Search />
                                            <p>
                                                {previewCopy.khong_tim_thay_kenh_phu_hop_voi}
                                                {search}”.
                                            </p>
                                            <PreviewButton onClick={() => setSearch('')}>
                                                {previewCopy.xoa_bo_loc}
                                            </PreviewButton>
                                        </div>
                                    )}
                                    <footer className="panel-footer">
                                        <span>
                                            <i />
                                            {previewCopy.du_lieu_duoc_dung_de_duyet_thiet_ke}
                                        </span>
                                        <button onClick={() => setModal('help')}>
                                            {previewCopy.tim_hieu_them}
                                            <ArrowRight />
                                        </button>
                                    </footer>
                                </Panel>
                                <Panel
                                    id="tasks"
                                    title={previewCopy.can_chu_y}
                                    description={previewText(
                                        '0_viec_dang_cho_xem_xet',
                                        initialTasks.length - completedTasks.length,
                                    )}
                                    action={
                                        <span className="task-count">
                                            {initialTasks.length - completedTasks.length}
                                        </span>
                                    }
                                >
                                    <div className="task-list">
                                        {initialTasks.map((task) => (
                                            <TaskRow
                                                key={task.id}
                                                {...task}
                                                tone={task.tone as Tone}
                                                done={completedTasks.includes(task.id)}
                                                onToggle={() =>
                                                    setCompletedTasks((current) =>
                                                        current.includes(task.id)
                                                            ? current.filter((id) => id !== task.id)
                                                            : [...current, task.id],
                                                    )
                                                }
                                            />
                                        ))}
                                    </div>
                                    <div className="task-summary">
                                        <span className="tone-positive">
                                            <ShieldCheck />
                                        </span>
                                        <p>
                                            {completedTasks.length === initialTasks.length
                                                ? previewCopy.da_xem_xet_tat_ca_cong_viec
                                                : previewCopy.mot_chut_chu_dong_trai_nghiem_tot_hon}
                                            <span>{previewCopy.cac_lua_chon_duoc_giu_khi_tai_lai}</span>
                                        </p>
                                    </div>
                                </Panel>
                            </div>
                            <div className="bottom-note">
                                <span>
                                    <span className="tiny-logo">y</span>
                                    {previewCopy.duoc_thiet_ke_de_tap_trung_vao_dieu_quan_trong}
                                </span>
                                <span>
                                    {previewCopy.yona_admin_ban_phac_thao_01}
                                    <ChevronRight />
                                </span>
                            </div>
                        </>
                    )}
                </main>
            </div>
            {modal === 'customize' && (
                <Modal title={previewCopy.tuy_chinh_tong_quan} onClose={() => setModal(null)}>
                    <p className="dialog-description">
                        {previewCopy.chon_cac_the_so_lieu_ban_muon_hien_thi_lua_chon_duoc_giu_khi_tai_lai_ban_xem_truoc}
                    </p>
                    <div className="customize-options">
                        {metricCards.map((metric) => (
                            <label key={metric.label}>
                                <input
                                    type="checkbox"
                                    checked={!hiddenMetrics.includes(metric.label)}
                                    onChange={() =>
                                        setHiddenMetrics((current) =>
                                            current.includes(metric.label)
                                                ? current.filter((label) => label !== metric.label)
                                                : [...current, metric.label],
                                        )
                                    }
                                />
                                {metric.label}
                            </label>
                        ))}
                    </div>
                    <footer>
                        <PreviewButton onClick={() => setHiddenMetrics([])}>
                            {previewCopy.khoi_phuc_mac_dinh}
                        </PreviewButton>
                        <PreviewButton appearance="primary" onClick={() => setModal(null)}>
                            <Check />
                            {previewCopy.hoan_tat}
                        </PreviewButton>
                    </footer>
                </Modal>
            )}
            {modal === 'help' && (
                <Modal title={previewCopy.kham_pha_ban_thiet_ke} onClose={() => setModal(null)}>
                    <div className="help-content">
                        <BookOpen />
                        <p>
                            {
                                previewCopy.day_la_ban_phac_thao_giao_dien_admin_voi_du_lieu_minh_hoa_ban_co_the_doi_ky_thong_ke_tim_kenh_danh_d
                            }
                        </p>
                        <p>
                            {previewCopy.mo} <strong>{previewCopy.bo_component}</strong>{' '}
                            {previewCopy.de_thu_thanh_phan_dung_chung_hoac} <strong>{previewCopy.design_token}</strong>{' '}
                            {previewCopy.de_xem_mau_kich_thuoc_va_typography_nut}{' '}
                            <strong>{previewCopy.xem_skeleton}</strong> {previewCopy.hien_thi_bo_cuc_khi_dang_tai}
                        </p>
                        <p>
                            {
                                previewCopy.cac_muc_nguoi_dung_va_hop_thu_hien_dan_den_khu_vuc_du_lieu_minh_hoa_trong_trang_tong_quan
                            }
                        </p>
                    </div>
                    <footer>
                        <PreviewButton appearance="primary" onClick={() => setModal(null)}>
                            {previewCopy.bat_dau_kham_pha}
                            <ArrowRight />
                        </PreviewButton>
                    </footer>
                </Modal>
            )}
            {notice && (
                <div className="preview-toast" role="status">
                    <Check />
                    {notice}
                </div>
            )}
        </div>
    );
}
