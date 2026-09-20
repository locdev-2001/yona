/**
 * Một ô nhập của form công khai.
 *
 * Số đo: cao 40px, viền 1px, padding ngang 12px *(đo 20/09 · 1440px)*. Dưới
 * 768px cao 44px cho đủ đích chạm như nút, chứ không giữ 40 rồi nới vùng chạm
 * bằng khoảng đệm.
 *
 * Nền TRẮNG trên panel `neutral-100`: viền là thứ mang affordance, không phải
 * nền. Bề mặt tham chiếu làm ngược lại (trang trắng, ô hơi sẫm) nhưng quan hệ
 * sáng/tối giữa ô và nền vẫn giữ một bậc, chỉ đảo chiều theo bề mặt chứa nó.
 *
 * Bo `4px` theo luật §3 thay vì 2px của bề mặt tham chiếu: 2px không có trong
 * thang bo của mình, và một bậc bo riêng cho input là một bậc nữa phải nhớ.
 */
interface FieldProps {
    name: string;
    label: string;
    value: string;
    error?: string;
    hint?: string;
    type?: 'text' | 'tel';
    rows?: number;
    required?: boolean;
    autoComplete?: string;
    inputMode?: 'text' | 'tel';
    placeholder?: string;
}

const CONTROL =
    'mt-2 block w-full rounded border bg-neutral-0 px-3 text-base text-neutral-900 ' +
    'placeholder:text-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600';

export function Field({
    name,
    label,
    value,
    error,
    hint,
    type = 'text',
    rows,
    required = false,
    autoComplete,
    inputMode,
    placeholder,
}: FieldProps) {
    const describedBy = [hint ? `${name}-hint` : null, error ? `${name}-error` : null].filter(Boolean).join(' ');
    const border = error ? 'border-danger' : 'border-neutral-300';

    return (
        <div>
            <label htmlFor={name} className="block text-sm text-neutral-700">
                {label}
                {required && (
                    <span aria-hidden className="ml-1 text-danger">
                        *
                    </span>
                )}
            </label>

            {rows ? (
                <textarea
                    id={name}
                    name={name}
                    rows={rows}
                    defaultValue={value}
                    required={required}
                    placeholder={placeholder}
                    aria-describedby={describedBy || undefined}
                    aria-invalid={error ? true : undefined}
                    className={`${CONTROL} ${border} py-2.5`}
                />
            ) : (
                <input
                    id={name}
                    name={name}
                    type={type}
                    defaultValue={value}
                    required={required}
                    autoComplete={autoComplete}
                    inputMode={inputMode}
                    placeholder={placeholder}
                    aria-describedby={describedBy || undefined}
                    aria-invalid={error ? true : undefined}
                    className={`${CONTROL} ${border} h-11 md:h-10`}
                />
            )}

            {hint && !error && (
                <p id={`${name}-hint`} className="mt-1.5 text-sm text-neutral-500">
                    {hint}
                </p>
            )}

            {error && (
                <p id={`${name}-error`} className="mt-1.5 text-sm text-danger">
                    {error}
                </p>
            )}
        </div>
    );
}

/**
 * Bẫy bot. Ẩn khỏi mắt, khỏi trình đọc màn hình và khỏi thứ tự tab — người thật
 * không có đường nào điền vào đây, nên hễ có chữ là bot.
 *
 * Không dùng `display:none`: một số bot bỏ qua ô ẩn kiểu đó, còn ô vẫn "hiện"
 * nhưng bị đẩy ra khỏi khung nhìn thì chúng điền như thường.
 */
export function Honeypot({ label }: { label: string }) {
    return (
        <div aria-hidden className="pointer-events-none absolute -left-96 size-0 overflow-hidden opacity-0">
            <label htmlFor="website">{label}</label>
            <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
        </div>
    );
}
