// Tương đương next/icon/Logo.vue — logo mark Yona (thay logo woot, gỡ nhãn Chatwoot)
export default function Logo({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <rect width="24" height="24" rx="7" fill="#2781F6" />
            <path
                d="M6.5 7 L12 13 L17.5 7 M12 13 L12 18.5"
                stroke="#fff"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
            />
        </svg>
    );
}
