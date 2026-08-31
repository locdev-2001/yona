import { useEffect, useState } from 'react';

import { t } from '../../../i18n';
import NextButton from 'dashboard/components-next/button/Button';

// Port từ dashboard/routes/dashboard/settings/profile/MessageSignature.vue —
// WootMessageEditor (ProseMirror) vào B3; tạm textarea giữ nguyên flow lưu.
interface MessageSignatureProps {
    messageSignature: string;
    onUpdateSignature: (signature: string) => void;
}

export default function MessageSignature({ messageSignature, onUpdateSignature }: MessageSignatureProps) {
    const [signature, setSignature] = useState(messageSignature ?? '');

    useEffect(() => setSignature(messageSignature ?? ''), [messageSignature]);

    return (
        <form
            className="flex flex-col gap-6"
            onSubmit={event => {
                event.preventDefault();
                onUpdateSignature(signature.trim());
            }}
        >
            <textarea
                id="message-signature-input"
                value={signature}
                className="h-[10rem] !px-3 !mb-0"
                placeholder={t('PROFILE_SETTINGS.FORM.MESSAGE_SIGNATURE.PLACEHOLDER')}
                onChange={event => setSignature(event.target.value)}
            />
            <div>
                <NextButton type="submit" label={t('PROFILE_SETTINGS.FORM.MESSAGE_SIGNATURE_SECTION.BTN_TEXT')} />
            </div>
        </form>
    );
}
