import { useMessageHost } from '../host';
import type { ArticleItem, StructuredMessage } from '../model';
import { records, safeUrl, text } from '../parse';
import { defineMessageType } from '../registry';
import { BookOpen, ChevronRight } from '../kit/icons';
import { KitRoot, kt } from '../kit/primitives';

// Bài trợ giúp gợi ý: một hàng bấm được mỗi bài. Widget mở bài trong khung Trợ
// giúp nếu đọc được (host quyết), không thì mở tab mới.

function ArticleRow({ item, message }: { item: ArticleItem; message: StructuredMessage }) {
    const host = useMessageHost();
    const body = (
        <>
            <span className="mk-tile">
                <BookOpen />
            </span>
            <span className="mk-stack" style={{ flex: 1 }}>
                <span className="mk-title" style={{ fontSize: 14 }}>
                    {item.title}
                </span>
                <span className="mk-meta">{item.description ?? kt('help_article')}</span>
            </span>
            <span className="mk-round-icon">
                <ChevronRight size={16} />
            </span>
        </>
    );

    if (!host.interactive) return <div className="mk-link-card">{body}</div>;

    return (
        <a
            className="mk-link-card"
            href={item.url}
            target="_blank"
            rel="noopener nofollow noreferrer"
            onClick={event => {
                event.preventDefault();
                host.act({ kind: 'link', label: item.title, url: item.url }, { message });
            }}
        >
            {body}
        </a>
    );
}

function ArticleView({ model, message }: { model: ArticleItem[]; message: StructuredMessage }) {
    return (
        <KitRoot>
            <div className="mk-card">
                {model.map((item, index) => (
                    <div key={item.url} style={index > 0 ? { borderTop: '1px solid var(--mk-line)' } : undefined}>
                        <ArticleRow item={item} message={message} />
                    </div>
                ))}
            </div>
        </KitRoot>
    );
}

export default defineMessageType<ArticleItem[]>({
    contentType: 'article',
    content: 'host',
    side: 'agent',
    parse: attributes => {
        const items = (records(attributes.items) ?? []).flatMap(item => {
            const title = text(item.title);
            const url = safeUrl(item.url ?? item.link);

            return title && url ? [{ title, url, description: text(item.description) }] : [];
        });

        return items.length > 0 ? items : null;
    },
    View: ArticleView,
});
