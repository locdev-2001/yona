import Button from 'dashboard/components-next/button/Button';
import Modal from 'dashboard/components/Modal';
import ModalHeader from 'dashboard/components/ModalHeader';

// Port từ dashboard/components/widgets/modal/DeleteModal.vue
interface DeleteModalProps {
    show: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message?: string;
    messageValue?: string;
    confirmText?: string;
    rejectText?: string;
}

export default function DeleteModal({
    show,
    onClose,
    onConfirm,
    title = '',
    message = '',
    messageValue = '',
    confirmText = '',
    rejectText = '',
}: DeleteModalProps) {
    return (
        <Modal show={show} onClose={onClose}>
            <ModalHeader headerTitle={title} headerContent={message} headerContentValue={messageValue} />
            <div className="flex items-center justify-end gap-2 p-8">
                <Button faded slate type="reset" label={rejectText} onClick={onClose} />
                <Button ruby type="submit" label={confirmText} onClick={onConfirm} />
            </div>
        </Modal>
    );
}
