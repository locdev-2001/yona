import type { ReactNode } from 'react';
import { cn } from '@admin/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@admin/components/ui/card';
export default function AuthPanel({ title, description, branding, children, className, embedded = false }: { title: string; description: ReactNode; branding: ReactNode; children: ReactNode; className?: string; embedded?: boolean }) {
    return <div className={cn('console-auth-page', embedded && 'console-auth-page--embedded')}>
        <Card className={cn('console-auth-panel', className)}>
            <CardHeader>{branding}<div><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></div></CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    </div>;
}
