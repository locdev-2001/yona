import { previewCopy } from './copy';
export const periodOptions = ['week', 'month', 'quarter'] as const;
export const periodLabels = {
    week: previewCopy['7_ngay'],
    month: previewCopy['30_ngay'],
    quarter: previewCopy['90_ngay'],
};
export type Period = (typeof periodOptions)[number];

export const metricsByPeriod = {
    week: [
        {
            label: previewCopy.nguoi_dung_hoat_dong,
            purpose: 'users',
            value: '2.846',
            change: '+12,8%',
            tone: 'brand',
            points: [22, 30, 26, 42, 38, 51, 60],
        },
        {
            label: previewCopy.tin_nhan_da_gui,
            purpose: 'messages',
            value: '148.392',
            change: '+18,4%',
            tone: 'system',
            points: [15, 30, 24, 35, 45, 39, 65],
        },
        {
            label: previewCopy.ket_noi_dang_hoat_dong,
            purpose: 'connections',
            value: '1.204',
            change: '+8,2%',
            tone: 'warning',
            points: [28, 25, 34, 31, 46, 43, 55],
        },
        {
            label: previewCopy.ty_le_gui_thanh_cong,
            purpose: 'delivery',
            value: '99,8%',
            change: previewCopy['0_3_diem'],
            tone: 'positive',
            points: [40, 42, 38, 48, 46, 52, 56],
        },
    ],
    month: [
        {
            label: previewCopy.nguoi_dung_hoat_dong,
            purpose: 'users',
            value: '8.912',
            change: '+16,2%',
            tone: 'positive',
            points: [16, 31, 24, 43, 48, 46, 64],
        },
        {
            label: previewCopy.tin_nhan_da_gui,
            purpose: 'messages',
            value: '624.801',
            change: '+22,1%',
            tone: 'system',
            points: [14, 21, 32, 28, 48, 43, 60],
        },
        {
            label: previewCopy.ket_noi_dang_hoat_dong,
            purpose: 'connections',
            value: '3.628',
            change: '+10,6%',
            tone: 'warning',
            points: [20, 27, 23, 39, 34, 51, 62],
        },
        {
            label: previewCopy.ty_le_gui_thanh_cong,
            purpose: 'delivery',
            value: '99,6%',
            change: previewCopy['0_2_diem'],
            tone: 'positive',
            points: [40, 34, 42, 41, 50, 48, 56],
        },
    ],
    quarter: [
        {
            label: previewCopy.nguoi_dung_hoat_dong,
            purpose: 'users',
            value: '21.508',
            change: '+24,6%',
            tone: 'positive',
            points: [12, 22, 20, 36, 31, 52, 66],
        },
        {
            label: previewCopy.tin_nhan_da_gui,
            purpose: 'messages',
            value: '1.824.602',
            change: '+31,5%',
            tone: 'system',
            points: [10, 20, 24, 22, 42, 48, 68],
        },
        {
            label: previewCopy.ket_noi_dang_hoat_dong,
            purpose: 'connections',
            value: '9.842',
            change: '+17,3%',
            tone: 'warning',
            points: [22, 18, 33, 29, 42, 48, 60],
        },
        {
            label: previewCopy.ty_le_gui_thanh_cong,
            purpose: 'delivery',
            value: '99,5%',
            change: previewCopy['0_4_diem'],
            tone: 'positive',
            points: [34, 40, 37, 45, 43, 51, 59],
        },
    ],
} satisfies Record<
    Period,
    {
        purpose: 'users' | 'messages' | 'connections' | 'delivery';
        label: string;
        value: string;
        change: string;
        tone: string;
        points: number[];
    }[]
>;

export const channels = [
    {
        name: 'Yona',
        description: previewCopy.nhan_tin_giua_nguoi_dung,
        initial: 'y',
        tone: 'activity',
        count: 66314,
        status: previewCopy.on_dinh,
    },
    {
        name: previewCopy.zalo_ca_nhan,
        description: previewCopy.ket_noi_tai_khoan_ca_nhan,
        initial: 'Z',
        tone: 'system',
        count: 53421,
        status: previewCopy.can_chu_y,
    },
    {
        name: 'Email',
        description: previewCopy.gmail_va_hop_thu_imap,
        initial: '@',
        tone: 'positive',
        count: 28657,
        status: previewCopy.on_dinh,
    },
];

export const initialTasks = [
    {
        id: 'connection',
        title: previewCopy.kiem_tra_ket_noi_gian_doan,
        description: previewCopy['3_ket_noi_can_dang_nhap_lai'],
        tone: 'warning',
        label: previewCopy.ket_noi,
        done: false,
    },
    {
        id: 'queue',
        title: previewCopy.theo_doi_hang_doi_gui_tin,
        description: previewCopy.thoi_gian_cho_trung_binh_0_4_giay,
        tone: 'system',
        label: previewCopy.he_thong,
        done: false,
    },
    {
        id: 'feedback',
        title: previewCopy.xem_phan_hoi_moi,
        description: previewCopy['5_phan_hoi_trong_tuan_nay'],
        tone: 'positive',
        label: previewCopy.nguoi_dung,
        done: false,
    },
];
