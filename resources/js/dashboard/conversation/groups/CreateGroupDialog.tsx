import { forwardRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';

import Input from 'dashboard/components-next/input/Input';
import type { DialogHandle } from 'dashboard/components-next/dialog/Dialog';
import { useAlert } from 'dashboard/composables/useAlert';
import { parseApiErrorMessage } from 'dashboard/helper/apiClient';
import { conversationUrl } from 'dashboard/helper/URLHelper';
import PickPeopleDialog from 'shared/people/PickPeopleDialog';
import { t } from '../../../i18n';
import type { DashboardPageProps } from '../../types';
import { createGroup } from '../groupsApi';

const NAME_MAX_LENGTH = 100;

// Tạo nhóm: đặt tên, chọn bạn bè (chỉ thêm trực tiếp được bạn bè), tạo xong mở ngay hội thoại nhóm.
const CreateGroupDialog = forwardRef<DialogHandle>(function CreateGroupDialog(_props, ref) {
    const accountId = usePage<DashboardPageProps>().props.currentAccount.id;
    const [name, setName] = useState('');

    return (
        <PickPeopleDialog
            ref={ref}
            title={t('CHAT.GROUP.NEW')}
            description={t('CHAT.GROUP.NEW_DESCRIPTION')}
            confirmLabel={t('CHAT.GROUP.CREATE')}
            friendsOnly
            allowEmpty
            canConfirm={name.trim() !== ''}
            onClose={() => setName('')}
            header={
                <Input
                    label={t('CHAT.GROUP.NAME')}
                    value={name}
                    maxLength={NAME_MAX_LENGTH}
                    placeholder={t('CHAT.GROUP.NAME_PLACEHOLDER')}
                    autoFocus
                    onChange={event => setName(event.target.value)}
                />
            }
            onConfirm={async people => {
                try {
                    const group = await createGroup(accountId, name.trim(), people.map(person => person.id));
                    router.visit(conversationUrl({ accountId, id: group.conversation_id }));
                    return true;
                } catch (error) {
                    useAlert(parseApiErrorMessage(error) || t('CHAT.GROUP.ERROR'));
                    return false;
                }
            }}
        />
    );
});

export default CreateGroupDialog;
