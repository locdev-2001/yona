import { useState } from 'react';
import type { FormEvent } from 'react';

import Button from 'dashboard/components-next/button/Button';
import Modal from 'dashboard/components/Modal';
import ModalHeader from 'dashboard/components/ModalHeader';

// Port từ dashboard/components/widgets/modal/ConfirmDeleteModal.vue —
// nút xác nhận chỉ bật khi gõ đúng giá trị (so sau khi trim).
interface ConfirmDeleteModalProps {
    show: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message?: string;
    confirmText?: string;
    rejectText?: string;
    confirmValue?: string;
    confirmPlaceHolderText?: string;
}

export default function ConfirmDeleteModal({
    show,
    onClose,
    onConfirm,
    title = '',
    message = '',
    confirmText = '',
    rejectText = '',
    confirmValue = '',
    confirmPlaceHolderText = '',
}: ConfirmDeleteModalProps) {
    const [value, setValue] = useState('');

    const isInvalid = value.trim() === '' || value.trim() !== confirmValue.trim();

    const closeModal = () => {
        setValue('');
        onClose();
    };

    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        onConfirm();
    };

    return (
        <Modal show={show} onClose={closeModal}>
            <ModalHeader headerTitle={title} headerContent={message} />
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={value}
                    placeholder={confirmPlaceHolderText}
                    onChange={event => setValue(event.target.value)}
                />
                <div className="flex items-center justify-end gap-2">
                    <Button faded slate type="reset" label={rejectText} onClick={closeModal} />
                    <Button ruby type="submit" label={confirmText} disabled={isInvalid} />
                </div>
            </form>
        </Modal>
    );
}
