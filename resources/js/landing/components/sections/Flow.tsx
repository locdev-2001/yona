import type { LandingStrings } from '../../config';
import { Eyebrow, Section } from '../Section';

// Bốn bước nối tiếp. Không phải bốn thẻ đều nhau: các bước có thứ tự, và một
// thanh accent NGẮN ở góc trên-trái mỗi ô đánh dấu từng bước riêng — số đo thật
// của bề mặt tham chiếu là đoạn ngắn ~50px, không phải đường kẻ suốt bề rộng ô.
// Đường kẻ suốt sẽ nối bốn ô thành một dải liền, làm mất cảm giác "bốn bước".
//
// Section này cố tình KHÔNG có ảnh. Nó nằm giữa hai section đều có hình, nên
// một nhịp chỉ-chữ ở đây là quãng nghỉ; thêm ảnh vào chỉ kéo dài trang.
const ORDER = ['capture', 'assign', 'reply', 'resolve'] as const;

export function Flow({ strings }: { strings: LandingStrings['flow'] }) {
    return (
        <Section surface="base" rhythm="md" accent="primary">
            <Eyebrow>{strings.eyebrow}</Eyebrow>
            <h2 className="mt-5 max-w-2xl text-h1">{strings.title}</h2>
            <p className="mt-5 max-w-reading text-base font-light text-neutral-700">{strings.subtitle}</p>

            <ol className="mt-12 grid gap-8 md:grid-cols-4 md:gap-6">
                {ORDER.map((key, index) => {
                    const step = strings.steps[key];

                    return (
                        <li key={key} className="relative pt-5">
                            <span aria-hidden className="absolute left-0 top-0 h-0.5 w-1/5 bg-primary-600" />
                            {/* Nhãn mono ở màu MỰC, không phải xám nhạt — cách bề mặt
                                tham chiếu đọc số thứ tự ngang hàng nội dung chứ không
                                phải chú thích phụ. */}
                            <span className="font-mono text-caption text-neutral-900">
                                {String(index + 1).padStart(2, '0')}
                            </span>
                            <h3 className="mt-3 text-h3">{step.title}</h3>
                            <p className="mt-2.5 text-sm font-light text-neutral-600">{step.description}</p>
                        </li>
                    );
                })}
            </ol>
        </Section>
    );
}
