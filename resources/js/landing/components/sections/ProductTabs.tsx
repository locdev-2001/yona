import { useState } from 'react';

import type { LandingStrings } from '../../config';
import { MediaWell, ProductShot } from '../ProductShot';
import { Section } from '../Section';

// Hai mặt của cùng một dữ liệu. Tab bấm được thật — nhãn tab không bấm được là
// một lời hứa suông với người đọc.
const TABS = [
    {
        key: 'inbox' as const,
        shot: {
            src: '/landing/inbox.png',
            alt: 'Hộp thư Yona: danh sách hội thoại từ Zalo và website, đang mở một cuộc trò chuyện',
            width: 1440,
            height: 900,
        },
    },
    {
        key: 'records' as const,
        shot: {
            src: '/landing/feature-contacts.png',
            alt: 'Danh sách liên hệ của Yona với tên và số điện thoại khách Việt',
            width: 1240,
            height: 700,
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

            {/* Segmented control chia đôi cả bề rộng: hai tab gạch chân nhỏ ở góc
                trái không đọc ra là một lựa chọn ngang hàng giữa hai sản phẩm. */}
            <div role="tablist" aria-label={strings.title_focus} className="mt-8 grid grid-cols-2 border border-neutral-300">
                {TABS.map((tab, i) => {
                    const on = tab.key === active;

                    return (
                        <button
                            key={tab.key}
                            type="button"
                            role="tab"
                            aria-selected={on}
                            onClick={() => setActive(tab.key)}
                            className={`min-h-11 px-4 py-3 text-sm transition-colors duration-fast focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-600 ${
                                i === 1 ? 'border-l border-neutral-300' : ''
                            } ${on ? 'bg-neutral-0 text-neutral-900' : 'text-neutral-500 hover:text-neutral-900'}`}
                        >
                            {strings.tabs[tab.key]}
                        </button>
                    );
                })}
            </div>

            {/* Ảnh nhỏ hơn khối và có lề rộng: mảng màu quanh ảnh mới là thứ cho
                khối media sức nặng, ảnh phủ kín thì khối chỉ còn là cái khung. */}
            <MediaWell tone="sand" className="border border-t-0 border-neutral-300">
                <div className="mx-auto max-w-4xl">
                    <ProductShot {...current.shot} priority={active === 'inbox'} />
                </div>
            </MediaWell>
        </Section>
    );
}
