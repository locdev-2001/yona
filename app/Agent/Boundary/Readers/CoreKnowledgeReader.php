<?php

namespace App\Agent\Boundary\Readers;

use App\Agent\Boundary\CoreProducts;
use App\Agent\Boundary\TextMatch;
use App\Agent\Contracts\Ports\KnowledgeReader;
use App\Agent\ValueObjects\KnowledgeHit;
use App\Agent\ValueObjects\Provenance;
use App\Models\Article;
use App\Models\CannedResponse;

// Tri thức bản mỏng: bài Help Center đã xuất bản và câu trả lời mẫu của account, xếp hạng
// chung bằng TextMatch (không phân biệt dấu, từ hiếm nặng hơn, tên nặng hơn nội dung) để
// câu trả lời mẫu đúng ý không bị đẩy ra ngoài vì thứ tự tạo. Câu trả lời mẫu dạng thẻ sản
// phẩm mang theo chữ tả từng thẻ (giá, biến thể, id để gửi thẻ), không đem JSON của thẻ đi
// so khớp. Trích đoạn quanh từ khoá; cả lần tra nằm trong một trần ký tự (khoảng 2k token)
// chia đều cho các kết quả.
/** @phpstan-type KnowledgeSource array{ref: string, kind: string, title: string, text: string} */
final class CoreKnowledgeReader implements KnowledgeReader
{
    private const EXCERPT_CHARACTERS = 1_200;

    private const RESULT_CHARACTERS = 6_000;

    // Help Center và câu trả lời mẫu cỡ SME; quá trần thì xếp hạng trên phần mới nhất.
    private const MAX_ARTICLES = 200;

    private const MAX_CANNED_RESPONSES = 500;

    private const TITLE_WEIGHT = 2.0;

    public function search(int $accountId, string $query, int $limit): array
    {
        $query = trim($query);

        if ($query === '' || $limit <= 0) {
            return [];
        }

        $sources = [...$this->articles($accountId), ...$this->cannedResponses($accountId)];
        $documents = array_map(fn (array $source) => [[$source['title'], self::TITLE_WEIGHT], [$source['text'], 1.0]], $sources);
        $ranked = array_map(fn (int $index) => $sources[$index], array_slice(TextMatch::rank($query, $documents), 0, $limit));
        $perSource = $ranked === [] ? 0 : min(self::EXCERPT_CHARACTERS, intdiv(self::RESULT_CHARACTERS, count($ranked)));

        return array_map(fn (array $source) => new KnowledgeHit(
            ref: $source['ref'],
            kind: $source['kind'],
            title: $source['title'],
            excerpt: KnowledgeExcerpt::of($source['text'], $query, $perSource),
            provenance: Provenance::Business,
        ), $ranked);
    }

    /** @return list<KnowledgeSource> */
    private function articles(int $accountId): array
    {
        return Article::query()
            ->where('articles.account_id', $accountId)
            ->published()
            ->orderByDesc('articles.id')
            ->limit(self::MAX_ARTICLES)
            ->get(['articles.id', 'articles.title', 'articles.description', 'articles.content'])
            ->map(fn (Article $article) => [
                'ref' => "article:{$article->id}",
                'kind' => 'article',
                'title' => (string) $article->title,
                'text' => trim($article->description."\n".$article->content),
            ])
            ->all();
    }

    /** @return list<KnowledgeSource> */
    private function cannedResponses(int $accountId): array
    {
        return CannedResponse::query()
            ->where('account_id', $accountId)
            ->orderByDesc('id')
            ->limit(self::MAX_CANNED_RESPONSES)
            ->get()
            ->map(fn (CannedResponse $response) => [
                'ref' => "canned_response:{$response->id}",
                'kind' => 'canned_response',
                'title' => (string) $response->short_code,
                'text' => $this->cannedText($response),
            ])
            ->all();
    }

    private function cannedText(CannedResponse $response): string
    {
        if ($response->content_type !== CoreProducts::CARDS_CONTENT_TYPE) {
            return (string) $response->content;
        }

        $cards = array_map(
            fn (array $item) => CoreProducts::describe(CoreProducts::product($response, $item)),
            CoreProducts::itemsOf($response),
        );

        return trim($response->content."\n".implode("\n", $cards));
    }
}
