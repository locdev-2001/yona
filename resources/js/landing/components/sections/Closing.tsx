import type { LandingConfig } from '../../config';
import { ArtMark } from '../ArtMark';
import { CtaPair } from '../Button';
import { Section } from '../Section';

// Trang mở bằng tiêu đề 80px giữa những cụm tranh và đóng lại đúng như vậy.
// Nhịp 216px gấp đôi nhịp thường — chỗ này được phép thở rộng nhất.
//
// Khác hero ở chỗ tranh rải KHẮP chiều ngang — từ sát mép trái tới sát mép
// phải — và nằm CẢ TRÊN lẫn DƯỚI dòng chữ, kể cả một tấm gần chính giữa. Dồn
// về hai mép như hero thì giữa trang trống một khoảng lớn; ở đây khoảng trắng
// hai bên h2 một dòng đã hẹp hơn hero nên tranh phải nhỏ lại (100-145px, thay
// vì 140-184px) để không đè lên chữ.
// Tranh chỉ được nằm TRÊN dải chữ hoặc DƯỚI dải chữ — không tấm nào cắt ngang
// nó. Ở 1440 khối chữ chiếm y216-372 (h2 một dòng 80px + nút), nên mọi tấm
// phía trên kết thúc trước y200 và mọi tấm phía dưới bắt đầu sau y390.
//
// Đây là thứ bản trước làm sai: tranh đặt bằng left-1/4 / left-1/2 / right-1/4
// mà không chừa dải chữ, nên ba tấm đè thẳng lên tiêu đề. Toạ độ ở đây tính
// theo TOÀN BỘ section (qua slot `art` của Section), không phải theo div nội
// dung — div nội dung chỉ cao bằng dòng chữ nên không đặt được ra ngoài nó.
const ART = [
    { src: 'end-1', width: 120, height: 79, size: 'w-28 2xl:w-36', className: 'left-4 top-10' },
    { src: 'end-5', width: 132, height: 74, size: 'w-32 2xl:w-40', className: 'left-1/3 top-0' },
    { src: 'end-2', width: 100, height: 67, size: 'w-24 2xl:w-32', className: 'right-1/3 top-2' },
    { src: 'end-ink-1', width: 120, height: 71, size: 'w-28 2xl:w-36', className: 'left-1/4 bottom-10' },
    { src: 'end-3', width: 100, height: 146, size: 'w-24 2xl:w-28', className: 'right-1/4 bottom-8' },
    { src: 'end-4', width: 144, height: 110, size: 'w-32 2xl:w-40', className: 'right-6 bottom-20' },
];

export function Closing({ config }: { config: LandingConfig }) {
    const { strings, urls, isAuthenticated } = config;
    const closing = strings.closing;

    return (
        // accent="neutral": section kết không thuộc mạch hội thoại hay hồ
        // sơ/dữ liệu nào — nó khép trang lại, không tiếp tục một mạch cụ thể.
        <Section
            surface="base"
            rhythm="xl"
            accent="neutral"
            art={ART.map((art) => (
                <ArtMark key={art.src} {...art} />
            ))}
        >

            {/* Không có max-w-3xl như trước: đó là thứ ép h2 xuống hai dòng.
                Số đo thật chỉ có h2 + 2 nút, KHÔNG có đoạn dẫn — bỏ hẳn dòng
                dẫn 16px để h2 vừa một dòng ở 1440px. */}
            <div className="relative mx-auto text-center">
                <h2 className="text-balance text-display">{closing.title}</h2>

                <div className="mt-8">
                    {isAuthenticated ? (
                        <CtaPair align="center" primary={{ label: strings.hero.cta_dashboard, href: urls.dashboard }} />
                    ) : (
                        <CtaPair
                            align="center"
                            primary={{ label: closing.cta_primary, href: urls.register }}
                            secondary={{ label: strings.nav.demo, href: urls.demo }}
                        />
                    )}
                </div>
            </div>
        </Section>
    );
}
