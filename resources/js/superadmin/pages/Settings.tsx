import { Head } from '@inertiajs/react';

// Port từ app/views/super_admin/settings/show.html.erb — bản CE chỉ còn danh
// sách mục cấu hình (khối gói cước/billing là enterprise, không port).
export default function SuperAdminSettings({
    sections,
}: {
    sections: { key: string; label: string; url: string }[];
}) {
    return (
        <>
            <Head title="Settings" />
            <header className="flex px-8 py-4 items-center border-b border-n-weak" role="banner">
                <div className="border border-n-weak mr-4 p-2 rounded-full">
                    <svg width="24" height="24">
                        <use xlinkHref="#icon-settings-2-line" />
                    </svg>
                </div>
                <div className="flex flex-col h-14 justify-center">
                    <h1 className="text-base font-medium leading-6 text-n-slate-12" id="page-title">
                        Settings
                    </h1>
                    <p className="text-sm font-normal leading-5 text-slate-500 m-0">
                        Update your instance settings
                    </p>
                </div>
            </header>
            <section className="main-content__body px-8">
                <ul className="list-none p-0 m-0">
                    {sections.map(section => (
                        <li className="py-2" key={section.key}>
                            <a className="text-woot-500 text-sm" href={section.url}>
                                {section.label}
                            </a>
                        </li>
                    ))}
                </ul>
            </section>
        </>
    );
}
