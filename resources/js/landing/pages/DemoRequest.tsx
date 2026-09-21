import type { LandingConfig } from '../config';
import { ButtonLink, buttonClass } from '../components/Button';
import { Field, Honeypot } from '../components/Field';
import { ACCENT, Eyebrow, Section } from '../components/Section';

/**
 * Trang đặt lịch demo.
 *
 * Bố cục lấy từ bề mặt tham chiếu *(đo 20/09 · 1440px)*: trang thu lead của họ
 * cao 967px, nghĩa là ĐÚNG MỘT MÀN HÌNH, không có section marketing nào phía
 * dưới. Chữ chia đôi bề ngang với form, form nằm trong cột 592px, hai ô ngắn
 * chia đôi cột thành 284px mỗi ô.
 *
 * Vì sao một màn hình: người vào đây đã quyết định để lại số. Thêm section kể
 * chuyện là thêm chỗ để họ cuộn đi rồi quên mất cái form.
 *
 * KHÔNG dùng `fill`: ở desktop nội dung đã vừa một màn hình mà không cần ép
 * `min-h`, còn ở 390px hai cột xếp chồng thành 1349px nên `fill` chỉ hứa một
 * thứ không giữ được (C3 bắt đúng).
 *
 * KHÔNG có tranh trang trí: trang này chỉ có một việc, và tranh cạnh form là
 * thứ đầu tiên hút mắt khỏi ô đang cần điền.
 */
export function DemoRequest({ config }: { config: LandingConfig }) {
    const { strings, form } = config;
    const demo = strings.demo;
    const errors = form?.errors ?? {};

    return (
        <Section surface="base" rhythm="md" accent="primary">
            <div className="grid gap-12 md:grid-cols-2 md:gap-16">
                <div>
                    <Eyebrow accent="primary">{demo.eyebrow}</Eyebrow>

                    <h1 className="mt-5 text-balance text-h1">{demo.title}</h1>

                    <p className="mt-5 max-w-reading text-lead font-light text-neutral-700">{demo.lead}</p>

                    <ul className="mt-8 flex flex-col gap-4">
                        {Object.entries(demo.promise).map(([key, line]) => (
                            <li key={key} className="flex gap-4">
                                <span aria-hidden className={`mt-3 h-0.5 w-2 shrink-0 ${ACCENT.primary}`} />
                                <span className="text-base font-light text-neutral-700">{line}</span>
                            </li>
                        ))}
                    </ul>

                    <AltContact config={config} />
                </div>

                <div className="w-full max-w-form bg-neutral-100 p-6 md:p-10">
                    <form
                        method="post"
                        action={form?.action}
                        aria-labelledby="form-demo-ten"
                        className="relative flex flex-col gap-5"
                    >
                        {/* Form không có tiêu đề nhìn thấy được vì cột chữ bên trái đã nói
                            hết. Trình đọc màn hình thì không có "bên trái", nó cần một tên
                            cho vùng này. */}
                        <h2 id="form-demo-ten" className="sr-only">
                            {demo.form.legend}
                        </h2>
                        <input type="hidden" name="_token" value={form?.csrf ?? ''} />
                        <Honeypot label={demo.form.honeypot_label} />

                        {form?.failed && (
                            <p role="alert" className="border border-danger bg-danger-tint p-4 text-base text-neutral-900">
                                {demo.form.failed}
                            </p>
                        )}

                        {/* Chú thích bắt buộc đặt TRƯỚC ô đầu tiên: đọc sau khi đã bấm gửi
                            thì nó không còn là chú thích nữa. */}
                        <p className="text-sm text-neutral-500">{demo.form.required_note}</p>

                        {/* Tên và số chia đôi cột form: đo được 284px mỗi ô trên cột 592px. */}
                        <div className="grid gap-5 sm:grid-cols-2">
                            <Field
                                name="name"
                                label={demo.form.name_label}
                                placeholder={demo.form.name_placeholder}
                                value={form?.old.name ?? ''}
                                error={errors.name?.[0]}
                                autoComplete="name"
                                required
                            />
                            <Field
                                name="phone"
                                label={demo.form.phone_label}
                                placeholder={demo.form.phone_placeholder}
                                hint={demo.form.phone_hint}
                                value={form?.old.phone ?? ''}
                                error={errors.phone?.[0]}
                                type="tel"
                                inputMode="tel"
                                autoComplete="tel"
                                required
                            />
                        </div>

                        <Field
                            name="note"
                            label={demo.form.note_label}
                            placeholder={demo.form.note_placeholder}
                            value={form?.old.note ?? ''}
                            error={errors.note?.[0]}
                            rows={4}
                        />

                        <button type="submit" className={buttonClass('primary', 'md', 'w-full')}>
                            {demo.form.submit}
                        </button>

                        <p className="text-sm text-neutral-500">{demo.form.privacy}</p>
                    </form>
                </div>
            </div>
        </Section>
    );
}

/**
 * Đường đi khác cho người không muốn chờ gọi lại.
 *
 * Ẩn hẳn khi chưa cấu hình số thật: một hotline không ai bắt máy tệ hơn là không
 * có hotline.
 *
 * Ghi chú về bong bóng chat chỉ hiện từ `md` trở lên: dưới 768px trang này ẩn
 * widget (xem `landing.css`) vì nó chồng lên ô nhập, nên câu "bấm bong bóng chat
 * ở góc phải" sẽ trỏ vào chỗ không có gì.
 */
function AltContact({ config }: { config: LandingConfig }) {
    const { contact, strings } = config;
    const alt = strings.demo.alt;
    const hasChannel = Boolean(contact.hotline || contact.zaloUrl);

    // Không kênh nào VÀ ghi chú đã ẩn ở mobile → cả khối rỗng, chỉ còn một đường
    // kẻ không dẫn tới gì (đo 21/09 · 390px: cao 25px, không con nào hiện).
    return (
        <div className={`mt-10 border-t border-neutral-300 pt-6 ${hasChannel ? '' : 'hidden md:block'}`}>
            {hasChannel && <h2 className="text-h3">{alt.title}</h2>}

            {hasChannel && (
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    {contact.hotline && (
                        <ButtonLink href={`tel:${contact.hotline.replace(/\s+/g, '')}`} variant="secondary">
                            {`${alt.hotline} ${contact.hotline}`}
                        </ButtonLink>
                    )}
                    {contact.zaloUrl && (
                        <ButtonLink href={contact.zaloUrl} variant="secondary">
                            {alt.zalo}
                        </ButtonLink>
                    )}
                </div>
            )}

            <p className={`hidden text-sm text-neutral-500 md:block ${hasChannel ? 'mt-4' : ''}`}>{alt.note}</p>
        </div>
    );
}
