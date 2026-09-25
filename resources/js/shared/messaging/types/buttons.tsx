import type { StructuredAction, StructuredMessage } from '../model';
import { actions } from '../parse';
import { defineMessageType } from '../registry';
import { ActionBar, KitRoot, kt } from '../kit/primitives';
import { useSubmission } from '../kit/useSubmission';

// Thẻ văn bản kèm 1–3 nút. Thẻ tự vẽ cả chữ để nút nằm cùng một khối với câu hỏi.

function ButtonsView({ model, message }: { model: StructuredAction[]; message: StructuredMessage }) {
    const { values, failed, submit, interactive } = useSubmission(message);
    const onReply = (action: StructuredAction) => submit([{ title: action.label, value: action.value ?? action.label }]);

    return (
        <KitRoot>
            <div className="mk-card mk-pad">
                <p className="mk-body">{message.content}</p>
                <ActionBar actions={model} message={message} onReply={values ? undefined : onReply} />
                {values && !interactive ? <span className="mk-selected">{kt('selected', { value: values[0]?.title ?? '' })}</span> : null}
                {failed ? <p className="mk-error">{kt('send_failed')}</p> : null}
            </div>
        </KitRoot>
    );
}

export default defineMessageType<StructuredAction[]>({
    contentType: 'buttons',
    content: 'view',
    side: 'agent',
    parse: attributes => {
        const list = actions(attributes.actions);

        return list.length > 0 ? list : null;
    },
    View: ButtonsView,
});
