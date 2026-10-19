import { t } from '../../../i18n';
import type { WidgetUpdateFormValues } from './types';

// Xem trước trên widget: không tái dùng component thật của widget (chạy trong
// bundle riêng, phụ thuộc CSS variable --yona-chat-* chỉ nạp ở đó) — chỉ mô
// phỏng lại đúng bố cục của widget/screens/UpdateScreen.tsx bằng token n-slate
// của dashboard, đủ để người quản trị hình dung bài sẽ hiện ra sao.
const TAG_LABEL_KEY: Record<WidgetUpdateFormValues['tag'], string> = {
    promo: 'WIDGET.UPDATES.TAG.PROMO',
    new: 'WIDGET.UPDATES.TAG.NEW',
    notice: 'WIDGET.UPDATES.TAG.NOTICE',
};

const TAG_TONE: Record<WidgetUpdateFormValues['tag'], string> = {
    promo: 'bg-n-ruby-9/10 text-n-ruby-11',
    new: 'bg-n-teal-9/10 text-n-teal-11',
    notice: 'bg-n-slate-9/10 text-n-slate-12',
};

const formatToday = () =>
    new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());

export default function WidgetUpdatePreview({ values }: { values: WidgetUpdateFormValues }) {
    const title = values.title.trim() || t('WIDGET_UPDATES_MGMT.FORM.TITLE.PLACEHOLDER');
    const body = values.body.trim();
    const hasCta = Boolean(values.ctaUrl.trim());

    return (
        <div className="flex flex-col w-full gap-2">
            <span className="text-sm font-medium text-n-slate-12">{t('WIDGET_UPDATES_MGMT.FORM.PREVIEW_TITLE')}</span>
            <div className="mx-auto w-full max-w-[360px] overflow-hidden border rounded-2xl border-n-weak bg-n-solid-1">
                {values.coverUrl ? (
                    <img src={values.coverUrl} alt="" className="w-full aspect-[2/1] object-cover" />
                ) : (
                    <div className="flex items-center justify-center w-full aspect-[2/1] bg-n-slate-3 text-n-slate-9">
                        <span className="i-lucide-image size-8" />
                    </div>
                )}
                <div className="flex flex-col gap-3 px-5 pt-4 pb-5">
                    <span className="flex items-center gap-2 text-xs text-n-slate-11">
                        <span className={`rounded-md px-2 py-0.5 font-medium ${TAG_TONE[values.tag]}`}>
                            {t(TAG_LABEL_KEY[values.tag])}
                        </span>
                        {formatToday()}
                    </span>
                    <h3 className="m-0 text-lg font-medium leading-snug text-n-slate-12">{title}</h3>
                    {body ? <p className="m-0 text-sm leading-6 text-n-slate-11 whitespace-pre-line">{body}</p> : null}
                    <div className="flex flex-col gap-2 mt-1">
                        {hasCta ? (
                            <span className="flex items-center justify-center h-10 gap-2 text-sm font-medium rounded-full bg-n-brand text-white">
                                {values.ctaLabel.trim() || values.ctaUrl}
                                <span className="i-lucide-external-link size-4" />
                            </span>
                        ) : null}
                        <span className="flex items-center justify-center h-10 text-sm font-medium border rounded-full border-n-weak text-n-slate-12">
                            {t('WIDGET.UPDATES.ASK')}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
