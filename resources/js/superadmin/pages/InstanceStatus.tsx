import { Head } from '@inertiajs/react';

// Port từ app/views/super_admin/instance_statuses/show.html.erb.
export default function InstanceStatus({ metrics }: { metrics: Record<string, string | null> }) {
    return (
        <>
            <Head title="Instance Health" />
            <header className="main-content__header" role="banner">
                <h1 className="main-content__page-title">Instance Health</h1>
            </header>
            <section className="main-content__body">
                <dl>
                    <fieldset className="">
                        {Object.entries(metrics).map(([label, value]) => (
                            <div key={label}>
                                <dt className="attribute-label">{label}</dt>
                                <dd className="attribute-data attribute-data--string">{value ?? ''}</dd>
                            </div>
                        ))}
                    </fieldset>
                </dl>
            </section>
        </>
    );
}
