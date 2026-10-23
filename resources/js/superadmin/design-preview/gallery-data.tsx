import { previewCopy, previewText } from './copy';
import {
    Check,
    CheckCircle2,
    ChevronDown,
    CircleAlert,
    FileText,
    Inbox,
    LoaderCircle,
    Plus,
    RefreshCw,
    Settings2,
    Trash2,
    X,
} from '@admin/components/icons';
import { lazy, Suspense, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarGroup } from '@admin/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@admin/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@admin/components/ui/alert';
import { Progress, ProgressLabel, ProgressValue } from '@admin/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@admin/components/ui/collapsible';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@admin/components/ui/breadcrumb';
import { MetricCard, PreviewButton, SegmentedControl, SkeletonBlock, StatusBadge } from './components';
import type { MetricPurpose, MetricTrend, Tone } from './components';
import { metricsByPeriod, periodLabels, periodOptions } from './fixtures';
import type { Period } from './fixtures';

export function ActionsDemo() {
    const [saving, setSaving] = useState(false);
    useEffect(() => {
        if (!saving) return;
        const timeout = window.setTimeout(() => {
            setSaving(false);
            toast.success(previewCopy.da_hoan_tat_thao_tac_minh_hoa);
        }, 900);
        return () => window.clearTimeout(timeout);
    }, [saving]);
    return (
        <div className="catalogue-form">
            <div className="catalogue-inline">
                <PreviewButton appearance="primary" onClick={() => setSaving(true)} disabled={saving}>
                    {saving ? <LoaderCircle className="catalogue-spin" /> : <Plus />}
                    {saving ? previewCopy.dang_luu : previewCopy.thao_tac_chinh}
                </PreviewButton>
                <PreviewButton onClick={() => toast(previewCopy.da_chon_thao_tac_phu)}>
                    {previewCopy.thao_tac_phu}
                </PreviewButton>
                <PreviewButton appearance="ghost" onClick={() => toast(previewCopy.da_chon_nut_nhe)}>
                    {previewCopy.nut_nhe}
                </PreviewButton>
            </div>
            <div className="catalogue-inline">
                <PreviewButton
                    className="catalogue-danger-button"
                    onClick={() => toast.warning(previewCopy.thao_tac_nguy_hiem_minh_hoa)}
                >
                    <Trash2 />
                    {previewCopy.nguy_hiem}
                </PreviewButton>
                <PreviewButton disabled>{previewCopy.khong_kha_dung}</PreviewButton>
                <PreviewButton
                    aria-label={previewCopy.cai_dat_minh_hoa}
                    onClick={() => toast(previewCopy.da_mo_cai_dat_minh_hoa)}
                >
                    <Settings2 />
                </PreviewButton>
                <PreviewButton
                    aria-label={previewCopy.lam_moi_minh_hoa}
                    onClick={() => toast.success(previewCopy.da_lam_moi_du_lieu_minh_hoa)}
                >
                    <RefreshCw />
                </PreviewButton>
            </div>
            <p className="catalogue-hint">{previewCopy.cung_chieu_cao_control_co_loading_va_disabled}</p>
        </div>
    );
}

export function BadgesDemo() {
    const [tags, setTags] = useState([previewCopy.nguoi_dung_moi, previewCopy.ket_noi, previewCopy.theo_doi]);
    return (
        <div className="catalogue-form">
            <div className="catalogue-inline">
                <StatusBadge>{previewCopy.hoat_dong}</StatusBadge>
                <StatusBadge tone="warning">{previewCopy.can_chu_y}</StatusBadge>
                <StatusBadge tone="danger">{previewCopy.gian_doan}</StatusBadge>
                <StatusBadge tone="system">{previewCopy.he_thong}</StatusBadge>
            </div>
            <div className="catalogue-inline">
                {tags.map((tag) => (
                    <button
                        className="catalogue-tag"
                        key={tag}
                        aria-label={previewText('bo_nhan_0', tag)}
                        onClick={() => setTags((current) => current.filter((item) => item !== tag))}
                    >
                        {tag}
                        <X />
                    </button>
                ))}
                {tags.length === 0 && (
                    <PreviewButton
                        onClick={() => setTags([previewCopy.nguoi_dung_moi, previewCopy.ket_noi, previewCopy.theo_doi])}
                    >
                        {previewCopy.khoi_phuc_nhan}
                    </PreviewButton>
                )}
            </div>
        </div>
    );
}

export function AvatarsDemo() {
    return (
        <div className="catalogue-form">
            <div className="catalogue-inline">
                <Avatar className="catalogue-avatar">
                    <AvatarFallback>NA</AvatarFallback>
                </Avatar>
                <div>
                    <strong>{previewCopy.ngoc_anh}</strong>
                    <p className="catalogue-hint">{previewCopy.anh_dai_dien_du_phong_khi_chua_co_hinh}</p>
                </div>
                <StatusBadge>{previewCopy.truc_tuyen}</StatusBadge>
            </div>
            <AvatarGroup>
                {['NA', 'TM', 'HL', '+4'].map((initials, index) => (
                    <Avatar key={initials} className={`catalogue-avatar catalogue-avatar--${index}`}>
                        <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                ))}
            </AvatarGroup>
        </div>
    );
}

export function NavigationDemo() {
    return (
        <div className="catalogue-form">
            <Breadcrumb aria-label={previewCopy.duong_dan_minh_hoa}>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink
                            href="#preview-main"
                            onClick={(event) => {
                                event.preventDefault();
                                toast(previewCopy.da_chon_trang_tong_quan_minh_hoa);
                            }}
                        >
                            {previewCopy.tong_quan}
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbLink
                            href="#preview-main"
                            onClick={(event) => {
                                event.preventDefault();
                                toast(previewCopy.da_chon_danh_sach_nguoi_dung_minh_hoa);
                            }}
                        >
                            {previewCopy.nguoi_dung}
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>{previewCopy.chi_tiet}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            <Tabs defaultValue="overview">
                <TabsList aria-label={previewCopy.tabs_component_minh_hoa}>
                    <TabsTrigger value="overview">{previewCopy.tong_quan}</TabsTrigger>
                    <TabsTrigger value="activity">{previewCopy.hoat_dong}</TabsTrigger>
                    <TabsTrigger value="settings">{previewCopy.cai_dat}</TabsTrigger>
                </TabsList>
                <TabsContent value="overview">
                    <p className="catalogue-tab-copy">{previewCopy.noi_dung_tong_quan_cua_doi_tuong_dang_xem}</p>
                </TabsContent>
                <TabsContent value="activity">
                    <p className="catalogue-tab-copy">{previewCopy.lich_su_hoat_dong_va_cac_su_kien_gan_day}</p>
                </TabsContent>
                <TabsContent value="settings">
                    <p className="catalogue-tab-copy">{previewCopy.cac_tuy_chon_va_thiet_lap_cua_doi_tuong}</p>
                </TabsContent>
            </Tabs>
        </div>
    );
}

export function AccordionDemo() {
    return (
        <div className="catalogue-accordion">
            {[
                {
                    title: previewCopy.thong_tin_chung,
                    description: previewCopy.nhom_truong_ve_ten_trang_thai_va_thong_tin_hien_thi,
                },
                {
                    title: previewCopy.tuy_chon_nang_cao,
                    description: previewCopy.cac_thiet_lap_bo_sung_chi_hien_khi_nguoi_dung_can,
                },
                {
                    title: previewCopy.lich_su_thay_doi,
                    description: previewCopy.theo_doi_cac_lan_cap_nhat_de_giu_ngu_canh_cong_viec,
                },
            ].map((section, index) => (
                <Collapsible key={section.title} defaultOpen={index === 0}>
                    <CollapsibleTrigger className="catalogue-accordion-trigger">
                        {section.title}
                        <ChevronDown />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="catalogue-accordion-content">
                        {section.description}
                    </CollapsibleContent>
                </Collapsible>
            ))}
        </div>
    );
}

const DirectoryTable = lazy(() =>
    import('./directory-table').then((module) => ({ default: module.DirectoryTableDemo })),
);

export function TableDemo() {
    return (
        <Suspense fallback={<SkeletonBlock className="skeleton-chart" />}>
            <DirectoryTable />
        </Suspense>
    );
}

export function ProgressDemo() {
    const [value, setValue] = useState(68);
    return (
        <div className="catalogue-form">
            <Progress value={value}>
                <ProgressLabel>{previewCopy.dong_bo_du_lieu}</ProgressLabel>
                <ProgressValue />
            </Progress>
            <PreviewButton onClick={() => setValue((current) => (current >= 100 ? 0 : Math.min(100, current + 16)))}>
                <RefreshCw />
                {value === 100 ? previewCopy.bat_dau_lai : previewCopy.tiep_tuc_dong_bo_minh_hoa}
            </PreviewButton>
            <p className="catalogue-hint">{previewCopy.hien_thi_tien_do_gia_tri_va_hanh_dong_tiep_theo}</p>
        </div>
    );
}

export function AlertsDemo() {
    return (
        <div className="catalogue-form">
            <Alert className="catalogue-alert-positive">
                <CheckCircle2 />
                <AlertTitle>{previewCopy.da_luu_thay_doi}</AlertTitle>
                <AlertDescription>{previewCopy.thong_tin_minh_hoa_da_duoc_cap_nhat}</AlertDescription>
            </Alert>
            <Alert className="catalogue-alert-warning">
                <CircleAlert />
                <AlertTitle>{previewCopy.can_kiem_tra_ket_noi}</AlertTitle>
                <AlertDescription>{previewCopy.mot_so_ket_noi_can_duoc_dang_nhap_lai}</AlertDescription>
            </Alert>
            <Alert variant="destructive" className="catalogue-alert-danger">
                <CircleAlert />
                <AlertTitle>{previewCopy.chua_the_hoan_tat}</AlertTitle>
                <AlertDescription>{previewCopy.thu_lai_thao_tac_hoac_kiem_tra_thong_tin_da_nhap}</AlertDescription>
            </Alert>
        </div>
    );
}

export function StatesDemo() {
    const [state, setState] = useState('empty');
    return (
        <Tabs value={state} onValueChange={(value) => setState(String(value))}>
            <TabsList aria-label={previewCopy.trang_thai_du_lieu_minh_hoa}>
                <TabsTrigger value="empty">{previewCopy.rong}</TabsTrigger>
                <TabsTrigger value="loading">{previewCopy.dang_tai}</TabsTrigger>
                <TabsTrigger value="error">{previewCopy.loi}</TabsTrigger>
            </TabsList>
            <TabsContent value="empty">
                <div className="catalogue-empty">
                    <Inbox />
                    <strong>{previewCopy.chua_co_ket_noi}</strong>
                    <p>{previewCopy.them_ket_noi_dau_tien_de_bat_dau}</p>
                    <PreviewButton
                        appearance="primary"
                        onClick={() => toast(previewCopy.da_chon_them_ket_noi_minh_hoa)}
                    >
                        <Plus />
                        {previewCopy.them_ket_noi}
                    </PreviewButton>
                </div>
            </TabsContent>
            <TabsContent value="loading">
                <div className="catalogue-loading" role="status" aria-label={previewCopy.dang_tai_du_lieu_minh_hoa}>
                    <SkeletonBlock className="skeleton-caption" />
                    <SkeletonBlock className="skeleton-value" />
                    <SkeletonBlock className="skeleton-chart" />
                </div>
            </TabsContent>
            <TabsContent value="error">
                <div className="catalogue-empty">
                    <CircleAlert />
                    <strong>{previewCopy.khong_tai_duoc_du_lieu}</strong>
                    <p>{previewCopy.thu_lai_de_tiep_tuc_xem_noi_dung}</p>
                    <PreviewButton
                        onClick={() => {
                            setState('empty');
                            toast.success(previewCopy.da_tai_lai_trang_thai_minh_hoa);
                        }}
                    >
                        <RefreshCw />
                        {previewCopy.thu_lai}
                    </PreviewButton>
                </div>
            </TabsContent>
        </Tabs>
    );
}

export function TimelineDemo() {
    return (
        <ol className="catalogue-timeline">
            {[
                {
                    title: previewCopy.ket_noi_da_san_sang,
                    description: previewCopy.hoan_tat_dong_bo_du_lieu_mau,
                    time: '09:41',
                    tone: 'positive',
                },
                {
                    title: previewCopy.cap_nhat_thong_tin,
                    description: previewCopy.thong_tin_hien_thi_duoc_dieu_chinh,
                    time: '09:28',
                    tone: 'system',
                },
                {
                    title: previewCopy.tao_ket_noi_moi,
                    description: previewCopy.bat_dau_thiet_lap_kenh_trong_khong_gian,
                    time: '09:12',
                    tone: 'activity',
                },
            ].map((event) => (
                <li key={event.title}>
                    <span className={`catalogue-timeline-dot tone-${event.tone}`}>
                        <Check />
                    </span>
                    <div>
                        <strong>{event.title}</strong>
                        <p>{event.description}</p>
                    </div>
                    <time>{event.time}</time>
                </li>
            ))}
        </ol>
    );
}

export function MetricsDemo() {
    const [purpose, setPurpose] = useState<MetricPurpose>('users');
    const [period, setPeriod] = useState<Period>('week');
    const [trend, setTrend] = useState<MetricTrend>('up');
    const metric = metricsByPeriod[period].find((item) => item.purpose === purpose)!;
    const purposes = {
        users: previewCopy.metric_review_users,
        messages: previewCopy.metric_review_messages,
        connections: previewCopy.metric_review_connections,
        delivery: previewCopy.metric_review_delivery,
    };
    const trends = {
        up: previewCopy.metric_review_up,
        down: previewCopy.metric_review_down,
        flat: previewCopy.metric_review_flat,
    };
    const change = trend === 'up' ? metric.change : trend === 'down' ? metric.change.replace(/^\+/, '−') : '0%';
    const points =
        trend === 'up'
            ? metric.points
            : trend === 'down'
              ? metric.points.slice().reverse()
              : metric.points.map(() => 35);
    return (
        <div className="metric-review">
            <div className="metric-review-options" role="group" aria-label={previewCopy.metric_review_purpose}>
                {Object.entries(purposes).map(([value, label]) => (
                    <PreviewButton
                        key={value}
                        appearance={purpose === value ? 'primary' : 'secondary'}
                        aria-pressed={purpose === value}
                        onClick={() => setPurpose(value as MetricPurpose)}
                    >
                        {label}
                    </PreviewButton>
                ))}
            </div>
            <div className="metric-review-controls">
                <SegmentedControl
                    options={periodOptions}
                    value={period}
                    onChange={setPeriod}
                    getLabel={(value) => periodLabels[value]}
                    label={previewCopy.metric_review_period}
                />
                <SegmentedControl
                    options={['up', 'down', 'flat'] as const}
                    value={trend}
                    onChange={setTrend}
                    getLabel={(value) => trends[value]}
                    label={previewCopy.metric_review_trend}
                />
            </div>
            <MetricCard {...metric} change={change} points={points} trend={trend} tone={metric.tone as Tone} />
            <p className="catalogue-hint">{previewCopy.metric_review_hint}</p>
        </div>
    );
}
