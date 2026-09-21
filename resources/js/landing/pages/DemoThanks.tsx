import type { LandingConfig } from '../config';
import { CtaPair } from '../components/Button';
import { ACCENT, Section } from '../components/Section';

/**
 * Trang cảm ơn sau khi gửi form.
 *
 * Chỉ hiện khi lead ĐÃ nằm trong hộp thư. Nhận không thành công thì controller
 * đẩy về lại form kèm dữ liệu cũ, không hiện trang này — một trang cảm ơn cho
 * một lead đã mất là cách chắc nhất để không bao giờ biết mình mất lead.
 *
 * Nói rõ ba thứ khách đang muốn biết: khi nào được gọi, gọi thế nào, cần chuẩn
 * bị gì. `noindex` đặt trong blade.
 *
 * Cả khối nằm trong một thẻ `neutral-100` rộng `max-w-price`, cùng khuôn với thẻ
 * bảng giá. Hai bản trước đều sai theo hai hướng ngược nhau: cột 660px trên nền
 * trắng thì trang trống hẳn, còn thẻ rộng bằng container thì chính THẺ trống 35%
 * bên phải vì chữ vẫn dừng ở bề ngang đọc được.
 *
 * Không có eyebrow: nhãn lặp nguyên văn tiêu đề thì nó không thêm thông tin nào.
 *
 * CÓ dấu tick `success`: đây là màu duy nhất trên cả bề mặt công khai không phải
 * `primary` — nền thẻ ở đây be y hệt thẻ form trang trước, nên nếu không có tín
 * hiệu thị giác thì khách phải ĐỌC CHỮ mới biết đã gửi xong, và người đang vội
 * dễ tưởng form lỗi rồi gửi lại lần nữa. Đo 21/09: `success` trên `neutral-100`
 * cho 4.68:1, đạt AA. Chữ cạnh tick dùng lại `thanks.eyebrow` — ở dạng nhãn
 * eyebrow nó lặp nguyên văn tiêu đề nên vô nghĩa, còn cạnh dấu tick nó là trạng
 * thái, không phải nhãn phân loại.
 */
export function DemoThanks({ config }: { config: LandingConfig }) {
    const { strings, urls } = config;
    const thanks = strings.demo.thanks;

    return (
        <Section surface="base" rhythm="md" accent="primary" fill>
            <div className="mx-auto max-w-price bg-neutral-100 p-6 md:p-16">
                {/* Tick KHÔNG kèm nhãn chữ: `thanks.eyebrow` là "Đã nhận" mà tiêu
                    đề ngay dưới cũng mở đầu bằng "Đã nhận" — cùng hai chữ cách nhau
                    40px thì bản nhỏ thành thừa. Chữ vẫn còn cho trình đọc màn hình,
                    vì với nó dấu tick là `aria-hidden` nên không tồn tại. */}
                <p className="text-success">
                    <span aria-hidden className="i-lucide-check size-6 shrink-0" />
                    <span className="sr-only">{thanks.eyebrow}</span>
                </p>

                <h1 className="mt-4 max-w-3xl text-balance text-h1">{thanks.title}</h1>

                <p className="mt-5 max-w-reading text-lead font-light text-neutral-700">{thanks.lead}</p>

                <ul className="mt-8 flex max-w-reading flex-col gap-4">
                    {Object.entries(thanks.next).map(([key, line]) => (
                        <li key={key} className="flex gap-4">
                            <span aria-hidden className={`mt-3 h-0.5 w-2 shrink-0 ${ACCENT.primary}`} />
                            <span className="text-base font-light text-neutral-700">{line}</span>
                        </li>
                    ))}
                </ul>

                <div className="mt-10">
                    <CtaPair
                        primary={{ label: thanks.cta_zalo, href: urls.zalo }}
                        secondary={{ label: thanks.cta_home, href: urls.home }}
                    />
                </div>
            </div>
        </Section>
    );
}
