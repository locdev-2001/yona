import type { LandingCopy } from '../../copy';
import { Eyebrow, Section } from '../Section';

// Các bước nối tiếp. Không phải các thẻ đều nhau: các bước có thứ tự, và một
// thanh accent NGẮN ở góc trên-trái mỗi ô đánh dấu từng bước riêng. Đường kẻ
// suốt sẽ nối các ô thành một dải liền, làm mất cảm giác "từng bước".
//
// Section này cố tình KHÔNG có ảnh: một nhịp chỉ-chữ giữa các khối là quãng nghỉ.
export function Flow({ id, copy }: { id?: string; copy: LandingCopy['flow'] }) {
    return (
        <Section id={id} surface="base" rhythm="md" accent="primary">
            <Eyebrow>{copy.eyebrow}</Eyebrow>
            <h2 className="mt-5 max-w-2xl text-h1">{copy.title}</h2>
            <p className="mt-5 max-w-reading text-base font-light text-neutral-700">{copy.subtitle}</p>

            <ol className="mt-12 grid gap-8 md:grid-cols-4 md:gap-6">
                {copy.steps.map((step, index) => (
                    <li key={step.title} className="relative pt-5">
                        <span aria-hidden className="absolute left-0 top-0 h-0.5 w-1/5 bg-primary-600" />
                        {/* Nhãn mono ở màu MỰC, không phải xám nhạt: số thứ tự đọc
                            ngang hàng nội dung chứ không phải chú thích phụ. */}
                        <span className="font-mono text-caption text-neutral-900">{String(index + 1).padStart(2, '0')}</span>
                        <h3 className="mt-3 text-h3">{step.title}</h3>
                        <p className="mt-2.5 text-sm font-light text-neutral-600">{step.body}</p>
                    </li>
                ))}
            </ol>
        </Section>
    );
}
