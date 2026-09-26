import { t } from '../../../../../i18n';
import Icon from 'dashboard/components-next/icon/Icon';
import SectionCard from '../components/SectionCard';

// Bộ não AI CHƯA có trong sản phẩm — màn này chỉ nói thật điều đó và minh hoạ
// tĩnh chuyện nó sẽ làm gì. Không có công tắc hay nút lưu nào ở đây: một công
// tắc không làm gì là giao diện nói dối người dùng.
export default function AiSection() {
    return (
        <SectionCard id="ai" title={t('WIDGET_BUILDER.AI.TITLE')} description={t('WIDGET_BUILDER.AI.DESCRIPTION')}>
            <div className="rounded-full self-start bg-n-amber-3 text-n-amber-11 text-label-small font-medium px-3 py-1">
                {t('WIDGET_BUILDER.COMING_SOON')}
            </div>

            <ul className="flex flex-col gap-2 text-body-main text-n-slate-11">
                <li className="flex items-start gap-2">
                    <Icon icon="i-lucide-book-open" className="size-4 mt-0.5 shrink-0 text-n-slate-9" />
                    {t('WIDGET_BUILDER.AI.FEATURE_KNOWLEDGE')}
                </li>
                <li className="flex items-start gap-2">
                    <Icon icon="i-lucide-message-circle-reply" className="size-4 mt-0.5 shrink-0 text-n-slate-9" />
                    {t('WIDGET_BUILDER.AI.FEATURE_AUTO_REPLY')}
                </li>
                <li className="flex items-start gap-2">
                    <Icon icon="i-lucide-user-round" className="size-4 mt-0.5 shrink-0 text-n-slate-9" />
                    {t('WIDGET_BUILDER.AI.FEATURE_HANDOFF')}
                </li>
            </ul>

            {/* Minh hoạ tĩnh — không phải khung chat thật, chỉ dựng lại đúng bố cục bản thiết kế. */}
            <div aria-hidden="true" className="rounded-xl bg-n-surface-2 p-4 flex flex-col gap-2 max-w-sm">
                <div className="self-start max-w-[80%] rounded-2xl rounded-bl-sm bg-n-solid-1 px-3 py-2 text-label-small text-n-slate-11">
                    {t('WIDGET_BUILDER.AI.MOCK_CUSTOMER_MESSAGE')}
                </div>
                <div className="self-end max-w-[85%] rounded-2xl rounded-br-sm bg-n-brand/10 px-3 py-2 text-label-small text-n-slate-12">
                    {t('WIDGET_BUILDER.AI.MOCK_AI_REPLY')}
                    <div className="mt-1.5 flex items-center gap-1 text-n-blue-11">
                        <Icon icon="i-lucide-file-text" className="size-3" />
                        <span className="text-label-small">{t('WIDGET_BUILDER.AI.MOCK_SOURCE')}</span>
                    </div>
                </div>
            </div>
        </SectionCard>
    );
}
