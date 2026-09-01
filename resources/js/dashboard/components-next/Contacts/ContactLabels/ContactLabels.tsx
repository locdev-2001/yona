import AddLabel from 'dashboard/components-next/label/AddLabel';

// Port từ dashboard/components-next/Contacts/ContactLabels/ContactLabels.vue —
// shell B2: labels của contact (store labels/contactLabels) thuộc nhóm C nên
// savedLabels luôn rỗng, chỉ còn nút AddLabel "+ tag" như oracle khi contact
// chưa có label nào.
interface ContactLabelsProps {
    contactId?: number | null;
}

export default function ContactLabels(_props: ContactLabelsProps) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <AddLabel />
        </div>
    );
}
