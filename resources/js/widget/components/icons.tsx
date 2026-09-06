// Icon fluent widget cần nhưng chưa có trong shared/.../dashboard-icons.json.
// Nguồn: refs/chatwoot/app/javascript/shared/components/FluentIcon/icons.json.
const SIGN_OUT_PATHS = [
    'M8.502 11.5a1.002 1.002 0 1 1 0 2.004 1.002 1.002 0 0 1 0-2.004Z',
    'M12 4.354v6.651l7.442-.001L17.72 9.28a.75.75 0 0 1-.073-.976l.073-.084a.75.75 0 0 1 .976-.073l.084.073 2.997 2.997a.75.75 0 0 1 .073.976l-.073.084-2.996 3.004a.75.75 0 0 1-1.134-.975l.072-.085 1.713-1.717-7.431.001L12 19.25a.75.75 0 0 1-.88.739l-8.5-1.502A.75.75 0 0 1 2 17.75V5.75a.75.75 0 0 1 .628-.74l8.5-1.396a.75.75 0 0 1 .872.74Zm-1.5.883-7 1.15V17.12l7 1.236V5.237Z',
    'M13 18.501h.765l.102-.006a.75.75 0 0 0 .648-.745l-.007-4.25H13v5.001ZM13.002 10 13 8.725V5h.745a.75.75 0 0 1 .743.647l.007.102.007 4.251h-1.5Z',
];

export function SignOutIcon({ size = '22', className = '' }: { size?: string | number; className?: string }) {
    return (
        <svg
            width={size}
            height={size}
            fill="none"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {SIGN_OUT_PATHS.map(path => (
                <path key={path} d={path} fill="currentColor" />
            ))}
        </svg>
    );
}

// chevron-right của shared/.../icons.json (khác bản trong dashboard-icons.json —
// nét 1px thay vì 0.75px), dùng cho nút gửi của bong bóng nhập email.
const CHEVRON_RIGHT_PATH =
    'M8.293 4.293a1 1 0 0 0 0 1.414L14.586 12l-6.293 6.293a1 1 0 1 0 1.414 1.414l7-7a1 1 0 0 0 0-1.414l-7-7a1 1 0 0 0-1.414 0Z';

export function ChevronRightIcon({ size = '20', className = '' }: { size?: string | number; className?: string }) {
    return (
        <svg
            width={size}
            height={size}
            fill="none"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <path d={CHEVRON_RIGHT_PATH} fill="currentColor" />
        </svg>
    );
}
