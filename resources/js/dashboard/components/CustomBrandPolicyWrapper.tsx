import type { ReactNode } from 'react';

import { useBranding } from 'shared/composables/useBranding';

// Port từ dashboard/components/CustomBrandPolicyWrapper.vue: nội dung bọc bên
// trong chỉ hiện khi bản cài đặt còn mang tên Chatwoot (getter
// globalConfig/isACustomBrandedInstance). Giữ cả <div> bao ngoài như bản gốc.
interface CustomBrandPolicyWrapperProps {
    showOnCustomBrandedInstance?: boolean;
    children: ReactNode;
}

export default function CustomBrandPolicyWrapper({
    showOnCustomBrandedInstance = true,
    children,
}: CustomBrandPolicyWrapperProps) {
    const { isCustomBrandedInstance } = useBranding();

    if (!showOnCustomBrandedInstance && isCustomBrandedInstance) return null;

    return <div>{children}</div>;
}
