import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslator } from '@/lib/i18n';
import { Link } from '@inertiajs/react';
import { MessageSquare } from 'lucide-react';

export interface IntegrationCard {
    /** Đường tới trang kết nối, `null` = kênh không có trang riêng. */
    href?: string | null;
    key: string;
    name: string;
    category: string;
    logo?: string | null;
    enabled: boolean;
    connected: boolean;
}

interface Props {
    card: IntegrationCard;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
    // ponytail: only 'chat' exists now; add entries as new categories arrive
    chat: <MessageSquare className="h-6 w-6" />,
};

export function IntegrationCardItem({ card }: Props) {
    const t = useTranslator();

    return (
        <Card className={!card.enabled ? 'opacity-60' : ''}>
            <CardHeader className="flex flex-row items-center gap-3 pb-2">
                {card.logo ? (
                    <img src={card.logo} alt={card.name} className="h-6 w-6 shrink-0 rounded object-contain" />
                ) : (
                    <div className="text-muted-foreground">{CATEGORY_ICONS[card.category] ?? <MessageSquare className="h-6 w-6" />}</div>
                )}
                <CardTitle className="text-base">{card.name}</CardTitle>
                <Badge variant="secondary" className="ml-auto text-xs capitalize">
                    {t(`platform.integrations.category.${card.category}`)}
                </Badge>
            </CardHeader>

            <CardContent className="pb-2">
                {card.connected ? (
                    <Badge variant="default" className="text-xs">
                        {t('platform.integrations.connected')}
                    </Badge>
                ) : (
                    <span className="text-muted-foreground text-xs">{t('platform.integrations.not_connected')}</span>
                )}
            </CardContent>

            <CardFooter>
                {!card.href ? (
                    <Button size="sm" variant="secondary" disabled>
                        {t('platform.integrations.coming_soon')}
                    </Button>
                ) : card.enabled ? (
                    <Button asChild size="sm" variant={card.connected ? 'outline' : 'default'}>
                        <Link href={card.href}>{card.connected ? t('platform.integrations.manage') : t('platform.integrations.connect')}</Link>
                    </Button>
                ) : (
                    <Button size="sm" disabled>
                        {t('platform.integrations.connect')}
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
