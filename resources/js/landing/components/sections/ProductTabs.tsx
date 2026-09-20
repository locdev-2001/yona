import { useState } from 'react';

import type { LandingStrings } from '../../config';
import { MediaFrame, ProductShot } from '../ProductShot';
import { ACCENT, Section } from '../Section';

// Hai mặt của cùng một dữ liệu. Tab bấm được thật — nhãn tab không bấm được là
// một lời hứa suông với người đọc.
const TABS = [
    {
        key: 'inbox' as const,
        shot: {
            src: '/landing/inbox.png',
            alt: 'Hộp thư Yona: danh sách hội thoại từ Zalo và website, đang mở một cuộc trò chuyện',
            width: 1600,
            height: 728,
        },
    },
    {
        key: 'records' as const,
        shot: {
            src: '/landing/feature-contacts.png',
            alt: 'Danh sách liên hệ của Yona với tên và số điện thoại khách Việt',
            width: 1600,
            height: 728,
        },
    },
];

export function ProductTabs({ strings }: { strings: LandingStrings['showcase'] }) {
    const [active, setActive] = useState<'inbox' | 'records'>('inbox');
    const current = TABS.find((tab) => tab.key === active) ?? TABS[0];

    return (
        <Section surface="band" rhythm="md">
            {/* Nửa đầu mờ, nửa sau đậm: câu nhãn tự chỉ vào phần mang nghĩa mà
                không cần đổi cỡ chữ hay thêm màu. */}
            <h2 className="text-h2 text-neutral-900/50">
                {strings.title_lead} <span className="text-neutral-900">{strings.title_focus}</span>
            </h2>

            {/* Segmented control chia đôi cả bề rộng. Dấu hiệu "đang chọn" là thanh
                accent + màu chữ, KHÔNG phải mảng nền — tô nền cho ô đang chọn biến
                ô còn lại thành "vùng chết", trong khi cả hai tab vẫn bấm được như
                nhau. */}
            <div role="tablist" aria-label={strings.title_focus} className="mt-8 grid grid-cols-2 border border-neutral-300">
                {TABS.map((tab, i) => {
                    const on = tab.key === active;
                    const accentColor = i === 0 ? ACCENT.primary : ACCENT.navy;

                    return (
                        <button
                            key={tab.key}
                            type="button"
                            role="tab"
                            aria-selected={on}
                            onClick={() => setActive(tab.key)}
                            className={`relative min-h-11 p-4 text-left text-h3 transition-colors duration-fast focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-600 ${
                                i === 1 ? 'border-l border-neutral-300' : ''
                            } ${on ? 'text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'}`}
                        >
                            {/* Thanh accent cố định theo VỊ TRÍ tab, không theo trạng thái
                                chọn: nó là danh tính của sản phẩm đang được nói tới, không
                                phải một dấu "đang xem". */}
                            <span aria-hidden className={`absolute left-0 top-0 h-0.5 w-1/5 ${accentColor}`} />
                            {strings.tabs[tab.key]}
                        </button>
                    );
                })}
            </div>

            {/* Ảnh tràn sát mép, không viền, không giếng màu: khối tính năng có
                viền để phân biệt thẻ, còn ảnh sản phẩm ở đây đọc như một màn hình
                thật đặt lên trang chứ không phải ảnh bồi trong khung. */}
            <div className="mt-8">
                <MediaFrame framed={false}>
                    <ProductShot {...current.shot} priority={active === 'inbox'} />
                </MediaFrame>
            </div>
        </Section>
    );
}
