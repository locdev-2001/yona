import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AdminLayout from '@/layouts/admin/layout';
import { useTranslator } from '@/lib/i18n';
import { Head, Link, useForm } from '@inertiajs/react';

// ---- Types -----------------------------------------------------------------

interface CreateProps {
    categories: string[];
}

// ---- Component -------------------------------------------------------------

export default function AdminAnnouncementsCreate({ categories }: CreateProps) {
    const t = useTranslator();

    const { data, setData, post, processing, errors } = useForm({
        title: '',
        slug: '',
        body: '',
        category: '',
        cover_image: '',
        audience: { type: 'all' },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/admin/announcements');
    };

    const bodyLength = data.body.length;

    return (
        <AdminLayout
            breadcrumbs={[
                { title: t('platform.announcements.admin.nav'), href: '/admin/announcements' },
                { title: t('platform.announcements.admin.form.create_title'), href: '/admin/announcements/create' },
            ]}
        >
            <Head title={t('platform.announcements.admin.form.create_title')} />

            <div className="flex flex-1 flex-col gap-6 p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold">{t('platform.announcements.admin.form.create_title')}</h1>
                    <Button variant="outline" asChild>
                        <Link href="/admin/announcements">{t('platform.announcements.admin.form.back')}</Link>
                    </Button>
                </div>

                <form onSubmit={handleSubmit} className="bg-card max-w-2xl rounded-xl border p-6 shadow-sm">
                    <div className="flex flex-col gap-5">
                        {/* Title */}
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="title">{t('platform.announcements.admin.form.title')}</Label>
                            <Input
                                id="title"
                                value={data.title}
                                onChange={(e) => setData('title', e.target.value)}
                                placeholder={t('platform.announcements.admin.form.title_hint')}
                                maxLength={255}
                            />
                            {errors.title && <p className="text-destructive text-xs">{errors.title}</p>}
                            <p className="text-muted-foreground text-xs">{t('platform.announcements.admin.form.title_hint')}</p>
                        </div>

                        {/* Slug */}
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="slug">{t('platform.announcements.admin.form.slug')}</Label>
                            <Input id="slug" value={data.slug} onChange={(e) => setData('slug', e.target.value)} maxLength={255} />
                            {errors.slug && <p className="text-destructive text-xs">{errors.slug}</p>}
                        </div>

                        {/* Category */}
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="category">{t('platform.announcements.admin.form.category')}</Label>
                            <Select value={data.category} onValueChange={(v) => setData('category', v)}>
                                <SelectTrigger id="category">
                                    <SelectValue placeholder={t('platform.announcements.admin.form.category')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat} value={cat}>
                                            {t(`platform.announcements.category.${cat}`)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.category && <p className="text-destructive text-xs">{errors.category}</p>}
                        </div>

                        {/* Body */}
                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="body">{t('platform.announcements.admin.form.body')}</Label>
                                <span className="text-muted-foreground text-xs">
                                    {t('platform.announcements.admin.form.body_counter', { count: bodyLength })}
                                </span>
                            </div>
                            <textarea
                                id="body"
                                value={data.body}
                                onChange={(e) => setData('body', e.target.value)}
                                rows={12}
                                maxLength={20000}
                                className="border-input bg-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-[200px] w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            {errors.body && <p className="text-destructive text-xs">{errors.body}</p>}
                        </div>

                        {/* Cover image */}
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="cover_image">{t('platform.announcements.admin.form.cover_image')}</Label>
                            <Input
                                id="cover_image"
                                type="url"
                                value={data.cover_image}
                                onChange={(e) => setData('cover_image', e.target.value)}
                                placeholder="https://"
                            />
                            {errors.cover_image && <p className="text-destructive text-xs">{errors.cover_image}</p>}
                        </div>

                        {/* Audience (read-only v1) */}
                        <div className="flex flex-col gap-1.5">
                            <Label>{t('platform.announcements.admin.form.audience')}</Label>
                            <p className="text-muted-foreground rounded-md border px-3 py-2 text-sm">
                                {t('platform.announcements.admin.form.audience_value')}
                            </p>
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={processing}>
                                {t('platform.announcements.admin.form.save')}
                            </Button>
                        </div>
                    </div>
                </form>
            </div>
        </AdminLayout>
    );
}
