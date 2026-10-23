import { ChartInsightsDemo } from './chart-insights';
import { FontTrial } from './font-trial';
import { CohortDemo } from './cohort-demo';
import { NotificationGalleryDemo } from './notifications-preview';
import { MultiSelectDemo } from './multi-select';
import { AppointmentFormDemo } from './form-preview';
import { WidgetCard, cardCutout } from './widget-card';
import { previewCopy, previewText } from './copy';
import { Grid2X2, ArrowUpRight, CircleCheck, Search } from '@admin/components/icons';
import { useEffect, useState } from 'react';
import { Input } from '@admin/components/ui/input';
import { ChannelDistribution, TrafficChart } from './charts';
import { Panel, PreviewButton, SearchField, SkeletonBlock, StatusBadge } from './components';
import {
    ComboboxDemo,
    DateTimeDemo,
    RangeDemo,
    SelectionDemo,
    SelectDemo,
    SwitchDemo,
    TextareaDemo,
    TextFieldDemo,
    UploadDemo,
} from './gallery-forms';
import {
    CommandDemo,
    ConfirmationDemo,
    DialogDemo,
    DropdownDemo,
    GalleryToaster,
    PopoverDemo,
    SheetDemo,
    ToastDemo,
    TooltipDemo,
} from './gallery-overlays';
import {
    AccordionDemo,
    ActionsDemo,
    AlertsDemo,
    AvatarsDemo,
    BadgesDemo,
    MetricsDemo,
    NavigationDemo,
    ProgressDemo,
    StatesDemo,
    TableDemo,
    TimelineDemo,
} from './gallery-data';
import { dimensionTokens, spacingTokens } from './tokens';
import type { PreviewTheme } from './tokens';

const componentGroups = [
    { id: 'all', label: previewCopy.tat_ca },
    { id: 'actions', label: previewCopy.hanh_dong },
    { id: 'forms', label: previewCopy.nhap_lieu },
    { id: 'data', label: previewCopy.du_lieu },
    { id: 'navigation', label: previewCopy.dieu_huong },
    { id: 'overlays', label: previewCopy.lop_noi },
    { id: 'feedback', label: previewCopy.phan_hoi },
] as const;

function StructureDemo() {
    const [shapeIndex, setShapeIndex] = useState(() => {
        try {
            return Number(localStorage.getItem('yona-admin-preview:card-cutout')) || 0;
        } catch {
            return 0;
        }
    });
    useEffect(() => {
        try {
            localStorage.setItem('yona-admin-preview:card-cutout', String(shapeIndex));
        } catch {
            /* Bản mẫu vẫn hoạt động khi trình duyệt chặn lưu trữ. */
        }
    }, [shapeIndex]);
    const seed = `widget-preview-${shapeIndex}`;
    const cornerLabels = {
        'top-right': previewCopy.card_cutout_top_right,
        'top-left': previewCopy.card_cutout_top_left,
        'bottom-right': previewCopy.card_cutout_bottom_right,
        'bottom-left': previewCopy.card_cutout_bottom_left,
    };
    return (
        <div className="card-shape-review">
            <WidgetCard
                seed={seed}
                appearance="highlight"
                title={previewCopy.card_review_title}
                description={previewCopy.card_review_description}
                action={
                    <PreviewButton
                        className="card-shape-cycle"
                        aria-label={previewCopy.card_change_cutout}
                        onClick={() => setShapeIndex((current) => current + 1)}
                    >
                        <ArrowUpRight />
                    </PreviewButton>
                }
                footer={
                    <>
                        <CircleCheck />
                        <span>{previewCopy.card_review_footer}</span>
                    </>
                }
            >
                <p className="card-review-statement">{previewCopy.card_review_statement}</p>
                <p>{previewCopy.card_review_content}</p>
            </WidgetCard>
            <div className="card-shape-review-caption">
                <span>
                    {previewText(
                        'widget_card_shape_insets',
                        spacingTokens['widget-padding'],
                        spacingTokens['widget-padding-mobile'],
                        dimensionTokens['panel-radius'],
                    )}
                </span>
                <span aria-live="polite">{cornerLabels[cardCutout(seed)]}</span>
            </div>
            <PreviewButton onClick={() => setShapeIndex((current) => current + 1)}>
                {previewCopy.card_change_cutout}
            </PreviewButton>
        </div>
    );
}

function SkeletonDemo() {
    return (
        <div className="catalogue-loading" role="status" aria-label={previewCopy.trang_thai_tai_skeleton}>
            <SkeletonBlock className="skeleton-caption" />
            <SkeletonBlock className="skeleton-value" />
            <SkeletonBlock className="skeleton-chart" />
            <p className="catalogue-hint">{previewCopy.giu_cho_theo_cau_truc_noi_dung_khong_nhap_nhay}</p>
        </div>
    );
}

const catalogue = [
    {id:'chart-insights',group:'data',title:'Chart insights · Thống kê phụ',description:'Mẫu đã duyệt cho tỉ lệ tin ra / tin vào và ngày nhiều tin nhất.',families:1,wide:true,content:ChartInsightsDemo},
    { id: 'cohort', group: 'data', title: 'Cohort · Ma trận giữ chân', description: 'Bản đề xuất: phần trăm, thanh tiến độ và cột tuần đăng ký được ghim. Chưa áp dụng vào admin.', families: 1, wide: true, content: CohortDemo },
    {
        id: 'actions',
        group: 'actions',
        title: 'Button & Icon button',
        description: previewCopy.primary_secondary_ghost_destructive_loading_va_disabled,
        families: 2,
        content: ActionsDemo,
    },
    {
        id: 'input',
        group: 'forms',
        title: 'Input & Password',
        description: previewCopy.nhan_icon_goi_y_hien_mat_khau_va_xac_thuc_bieu_mau,
        families: 2,
        content: TextFieldDemo,
    },
    {
        id: 'form',
        group: 'forms',
        title: 'Form',
        description: previewCopy.form_catalog_description,
        families: 1,
        content: AppointmentFormDemo,
    },
    {
        id: 'textarea',
        group: 'forms',
        title: previewCopy.textarea_trang_thai_field,
        description: previewCopy.bo_dem_ky_tu_read_only_disabled_va_noi_dung_dai,
        families: 2,
        content: TextareaDemo,
    },
    {
        id: 'select',
        group: 'forms',
        title: 'Select',
        description: previewCopy.chon_mot_gia_tri_voi_popup_focus_va_ban_phim,
        families: 1,
        content: SelectDemo,
    },
    {
        id: 'combobox',
        group: 'forms',
        title: 'Combobox',
        description: previewCopy.tim_kiem_trong_danh_sach_chon_va_xoa_gia_tri,
        families: 1,
        content: ComboboxDemo,
    },
    {
        id: 'multi-select',
        group: 'forms',
        title: 'Multi select',
        description: previewCopy.multi_description,
        families: 1,
        content: MultiSelectDemo,
    },
    {
        id: 'selection',
        group: 'forms',
        title: 'Checkbox & Radio',
        description: previewCopy.lua_chon_doc_lap_hoac_loai_tru_nhau_co_disabled,
        families: 2,
        content: SelectionDemo,
    },
    {
        id: 'switch',
        group: 'forms',
        title: 'Switch',
        description: previewCopy.thiet_lap_bat_tat_mo_ta_va_trang_thai_bi_khoa,
        families: 1,
        content: SwitchDemo,
    },
    {
        id: 'range',
        group: 'forms',
        title: 'Range & Number input',
        description: previewCopy.range_preview_description,
        families: 2,
        content: RangeDemo,
    },
    {
        id: 'date',
        group: 'forms',
        title: 'Date & Time input',
        description: previewCopy.chon_ngay_va_gio_voi_dieu_khien_cua_trinh_duyet,
        families: 2,
        content: DateTimeDemo,
    },
    {
        id: 'upload',
        group: 'forms',
        title: 'File input',
        description: previewCopy.upload_preview_description,
        families: 1,
        content: UploadDemo,
    },
    {
        id: 'badge',
        group: 'data',
        title: 'Badge & Tag',
        description: previewCopy.trang_thai_solid_phan_loai_va_nhan_co_the_bo_chon,
        families: 2,
        content: BadgesDemo,
    },
    {
        id: 'avatar',
        group: 'data',
        title: 'Avatar & Avatar group',
        description: previewCopy.danh_tinh_anh_du_phong_va_nhom_nguoi_lien_quan,
        families: 2,
        content: AvatarsDemo,
    },
    {
        id: 'metric',
        group: 'data',
        title: 'Metric card & Sparkline',
        description: previewCopy.mang_mau_tuoi_theo_chuc_nang_so_lieu_va_xu_huong,
        families: 2,
        content: MetricsDemo,
        wide: true,
    },
    {
        id: 'table',
        group: 'data',
        title: 'Data table & Pagination',
        description: previewCopy.datatable_preview_description,
        families: 2,
        content: TableDemo,
        wide: true,
    },
    {
        id: 'navigation',
        group: 'navigation',
        title: 'Breadcrumb & Tabs',
        description: previewCopy.dinh_vi_trang_va_chuyen_noi_dung_theo_ngu_canh,
        families: 2,
        content: NavigationDemo,
    },
    {
        id: 'accordion',
        group: 'navigation',
        title: 'Accordion / Collapsible',
        description: previewCopy.mo_dan_thong_tin_de_giu_trang_gon_va_de_doc,
        families: 1,
        content: AccordionDemo,
    },
    {
        id: 'dropdown',
        group: 'overlays',
        title: 'Dropdown menu',
        description: previewCopy.hanh_dong_theo_ngu_canh_co_phan_cach_va_muc_nguy_hiem,
        families: 1,
        content: DropdownDemo,
    },
    {
        id: 'notifications',
        group: 'feedback',
        title: previewCopy.notification_title,
        description: previewCopy.notification_gallery_description,
        families: 1,
        content: NotificationGalleryDemo,
    },
    {
        id: 'popover',
        group: 'overlays',
        title: 'Popover',
        description: previewCopy.bo_loc_hoac_thao_tac_nho_ngay_tai_noi_lam_viec,
        families: 1,
        content: PopoverDemo,
    },
    {
        id: 'tooltip',
        group: 'overlays',
        title: 'Tooltip',
        description: previewCopy.giai_thich_bo_tro_ho_tro_ca_hover_va_focus,
        families: 1,
        content: TooltipDemo,
    },
    {
        id: 'dialog',
        group: 'overlays',
        title: 'Modal & Form',
        description: previewCopy.bieu_mau_va_thao_tac_tap_trung_thu_vien_quan_ly_focus,
        families: 1,
        content: DialogDemo,
    },
    {
        id: 'confirmation',
        group: 'overlays',
        title: 'Confirmation dialog',
        description: previewCopy.xac_nhan_ro_rang_truoc_thao_tac_can_can_nhac,
        families: 1,
        content: ConfirmationDemo,
    },
    {
        id: 'sheet',
        group: 'overlays',
        title: 'Sheet / Drawer',
        description: previewCopy.chi_tiet_phu_mo_ben_canh_trang_khong_mat_ngu_canh,
        families: 1,
        content: SheetDemo,
    },
    {
        id: 'command',
        group: 'navigation',
        title: 'Command menu',
        description: previewCopy.tim_nhanh_hanh_dong_va_dieu_huong_bang_ban_phim,
        families: 1,
        content: CommandDemo,
    },
    {
        id: 'progress',
        group: 'feedback',
        title: 'Progress',
        description: previewCopy.tien_do_gia_tri_hien_tai_va_hanh_dong_tiep_theo,
        families: 1,
        content: ProgressDemo,
    },
    {
        id: 'alert',
        group: 'feedback',
        title: 'Alert',
        description: previewCopy.thanh_cong_canh_bao_va_loi_co_mo_ta_cu_the,
        families: 1,
        content: AlertsDemo,
    },
    {
        id: 'toast',
        group: 'feedback',
        title: 'Toast',
        description: previewCopy.thong_bao_tuc_thoi_hanh_dong_thu_lai_va_dong,
        families: 1,
        content: ToastDemo,
    },
    {
        id: 'states',
        group: 'feedback',
        title: 'Empty / Loading / Error',
        description: previewCopy.trang_thai_rong_dang_tai_va_khoi_phuc_sau_loi,
        families: 3,
        content: StatesDemo,
    },
    {
        id: 'skeleton',
        group: 'feedback',
        title: 'Skeleton',
        description: previewCopy.giu_vung_trong_theo_kich_thuoc_cua_noi_dung,
        families: 1,
        content: SkeletonDemo,
    },
    {
        id: 'timeline',
        group: 'data',
        title: 'Activity timeline',
        description: previewCopy.su_kien_trang_thai_mo_ta_va_thoi_gian,
        families: 1,
        content: TimelineDemo,
    },
    {
        id: 'structure',
        group: 'data',
        title: 'Card & Panel',
        description: previewCopy.cau_truc_noi_dung_co_cung_typography_va_khoang_cach,
        families: 2,
        content: StructureDemo,
    },
];

export default function ComponentGallery({ theme, initialQuery = '' }: { theme: PreviewTheme; initialQuery?: string }) {
    const [group, setGroup] = useState('all');
    const [query, setQuery] = useState(initialQuery);
    const matching = catalogue.filter(
        (component) =>
            (group === 'all' || component.group === group) &&
            `${component.title} ${component.description}`
                .toLocaleLowerCase('vi')
                .includes(query.toLocaleLowerCase('vi')),
    );
    const families = catalogue.reduce((count, component) => count + component.families, 0);
    return (
        <div className="catalogue-root">
            <GalleryToaster theme={theme} />
            <div className="catalogue-intro">
                <div>
                    <span className="catalogue-kicker">{previewCopy.thu_vien_dung_chung}</span>
                    <h2>{previewCopy.tu_mot_nut_bam_den_ca_dashboard}</h2>
                    <p>{previewCopy.component_tuong_tac_tu_shadcn_base_ui_recharts_va_sonner_cung_he_token_cua_yona}</p>
                </div>
                <div className="catalogue-count">
                    <strong>{families + 4}</strong>
                    <span>{previewCopy.thanh_phan_trang_thai}</span>
                </div>
            </div>
            <FontTrial />
            <div className="catalogue-filters">
                <div className="catalogue-categories" role="group" aria-label={previewCopy.nhom_component}>
                    {componentGroups.map((option) => (
                        <button key={option.id} aria-pressed={group === option.id} onClick={() => setGroup(option.id)}>
                            {option.label}
                            {option.id === 'all' && <span>{catalogue.length + 1}</span>}
                        </button>
                    ))}
                </div>
                <SearchField
                    label={previewCopy.tim_component}
                    placeholder={previewCopy.tim_component_2}
                    clearLabel={previewCopy.xoa_tim_component}
                    value={query}
                    onChange={setQuery}
                />
            </div>
            <div className="catalogue-grid">
                {matching.map((component) => (
                    <Panel
                        key={component.id}
                        title={component.title}
                        description={component.description}
                        className={`catalogue-card ${component.wide ? 'catalogue-card--wide' : ''}`}
                        action={
                            <span className="catalogue-family-count">
                                {component.families.toString().padStart(2, '0')}
                            </span>
                        }
                    >
                        <div className="catalogue-demo">
                            <component.content />
                        </div>
                    </Panel>
                ))}
            </div>
            {matching.length === 0 && (
                <div className="catalogue-empty">
                    <Grid2X2 />
                    <p>{previewCopy.khong_tim_thay_component_phu_hop}</p>
                    <PreviewButton
                        onClick={() => {
                            setQuery('');
                            setGroup('all');
                        }}
                    >
                        {previewCopy.hien_tat_ca_component}
                    </PreviewButton>
                </div>
            )}
            {(group === 'all' || group === 'data') && !query && (
                <Panel
                    className="catalogue-chart-panel"
                    title="Line / Donut / Bar / Heatmap"
                    description={previewCopy.bo_bieu_do_ho_tro_tooltip_chu_giai_va_nhieu_chuoi_du_lieu}
                    action={<StatusBadge tone="activity">Recharts</StatusBadge>}
                >
                    <div className="catalogue-chart-grid">
                        <div>
                            <TrafficChart period="week" />
                        </div>
                        <div>
                            <ChannelDistribution />
                        </div>
                    </div>
                </Panel>
            )}
        </div>
    );
}
