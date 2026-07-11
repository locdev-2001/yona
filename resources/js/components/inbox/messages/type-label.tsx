/** Fallback khi media không có URL/meta để render — nhãn mờ trong bubble. */
export function TypeLabel({ text }: { text: string }) {
    return <span className="text-xs opacity-70">{text}</span>;
}
