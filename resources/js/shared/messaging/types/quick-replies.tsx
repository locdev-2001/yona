import type { ChoiceItem, StructuredMessage } from '../model';
import { records, text } from '../parse';
import { defineMessageType } from '../registry';
import { KitRoot, kt } from '../kit/primitives';
import { useSubmission } from '../kit/useSubmission';

// Câu hỏi (host vẽ thành bong bóng) + chip trả lời nhanh căn phải, phía khách.
// Khách chọn xong thì chip biến mất: câu trả lời hiện thành tin của khách.

function QuickRepliesView({ model, message }: { model: ChoiceItem[]; message: StructuredMessage }) {
    const { values, answered, saved, failed, submit, interactive } = useSubmission(message);
    const chosen = values?.[0]?.value;

    if (answered && !interactive) {
        return (
            <KitRoot>
                <span className="mk-selected">{kt('selected', { value: values?.[0]?.title ?? chosen ?? '' })}</span>
            </KitRoot>
        );
    }

    // Khách đã chọn (đang gửi hoặc đã ghi): hàng chip biến mất, câu chọn hiện thành tin của
    // khách trong luồng. Gửi lỗi thì chip quay lại kèm dòng báo lỗi.
    if (saved || (answered && interactive)) return null;

    return (
        <KitRoot>
            <div className="mk-chips" role="group">
                {model.map(item => (
                    <button
                        key={item.value}
                        type="button"
                        className="mk-chip"
                        aria-pressed={chosen === item.value}
                        disabled={!interactive || answered}
                        onClick={() => submit([{ title: item.title, value: item.value }])}
                    >
                        {item.title}
                    </button>
                ))}
            </div>
            {failed ? <p className="mk-error">{kt('send_failed')}</p> : null}
        </KitRoot>
    );
}

export default defineMessageType<ChoiceItem[]>({
    contentType: 'input_select',
    content: 'host',
    side: 'agent',
    parse: attributes => {
        const items = records(attributes.items)?.flatMap(item => {
            const title = text(item.title);

            return title ? [{ title, value: text(item.value) ?? title }] : [];
        });

        return items && items.length > 0 ? items : null;
    },
    View: QuickRepliesView,
});
