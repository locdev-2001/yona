import { useEffect, useState } from 'react';

// Port từ portal/components/TableOfContents.vue.
export interface TocRow {
    slug: string;
    title: string;
    tag: string;
}

interface TableOfContentsProps {
    rows: TocRow[];
}

export default function TableOfContents({ rows }: TableOfContentsProps) {
    const [currentSlug, setCurrentSlug] = useState(window.location?.hash?.substring(1) || '');

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                const currentSection = entries.find(entry => entry.isIntersecting);
                if (currentSection) setCurrentSlug(currentSection.target.id);
            },
            { threshold: 0.25, rootMargin: '0px 0px -20% 0px' },
        );

        rows.forEach(row => {
            const element = document.getElementById(row.slug);
            if (element) observer.observe(element);
        });

        const onHashChange = () => setCurrentSlug(window.location?.hash?.substring(1) || '');
        window.addEventListener('hashchange', onHashChange);

        return () => {
            observer.disconnect();
            window.removeEventListener('hashchange', onHashChange);
        };
    }, [rows]);

    const h1Count = rows.filter(row => row.tag === 'h1').length;
    const h2Count = rows.filter(row => row.tag === 'h2').length;

    const indentClass = (row: TocRow) => {
        if (row.tag === 'h2') return h1Count > 0 ? 'ltr:ml-2 rtl:mr-2' : '';
        if (row.tag === 'h3') return !h1Count && !h2Count ? '' : 'ltr:ml-5 rtl:mr-5';

        return '';
    };

    return (
        <div className="hidden lg:block flex-1 py-6 scroll-mt-24 ltr:pl-4 rtl:pr-4 sticky top-24">
            {rows.length > 0 ? (
                <div className="py-2 overflow-auto">
                    <nav className="max-w-2xl">
                        <ol
                            role="list"
                            className="flex flex-col gap-2 text-base ltr:border-l-2 rtl:border-r-2 border-solid border-slate-100"
                        >
                            {rows.map(row => (
                                <li
                                    key={row.slug}
                                    className={`leading-6 ltr:border-l-2 rtl:border-r-2 relative ltr:-left-0.5 rtl:-right-0.5 border-solid ${
                                        currentSlug === row.slug
                                            ? 'border-n-portal transition-colors duration-200'
                                            : 'border-slate-100'
                                    }`}
                                >
                                    <p className={`py-1 px-3 ${indentClass(row)}`}>
                                        <a
                                            href={`#${row.slug}`}
                                            className={`font-medium text-sm tracking-[0.28px] cursor-pointer ${
                                                currentSlug === row.slug
                                                    ? 'text-n-portal transition-colors duration-200'
                                                    : 'text-slate-700'
                                            }`}
                                        >
                                            {row.title}
                                        </a>
                                    </p>
                                </li>
                            ))}
                        </ol>
                    </nav>
                </div>
            ) : null}
        </div>
    );
}
