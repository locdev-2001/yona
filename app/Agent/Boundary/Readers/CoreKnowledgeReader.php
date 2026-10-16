<?php

namespace App\Agent\Boundary\Readers;

use App\Agent\Contracts\Ports\KnowledgeReader;
use App\Agent\ValueObjects\KnowledgeHit;
use App\Agent\ValueObjects\Provenance;
use App\Models\Article;
use App\Models\CannedResponse;

// Tri thức bản mỏng: bài Help Center đã xuất bản (tìm toàn văn) và câu trả lời mẫu của
// account. Câu hỏi của khách thường dài, nên bài khớp BẤT KỲ từ nào rồi xếp theo hạng;
// câu trả lời mẫu khớp cả cụm trước, thiếu thì khớp từng từ. Trích đoạn quanh từ khoá
// của truy vấn; cả lần tra nằm trong một trần ký tự (khoảng 2k token) chia đều cho các kết quả.
/** @phpstan-type KnowledgeSource array{ref: string, kind: string, title: string, text: string} */
final class CoreKnowledgeReader implements KnowledgeReader
{
    private const EXCERPT_CHARACTERS = 1_200;

    private const RESULT_CHARACTERS = 6_000;

    // Từ ngắn hơn chừng này (kể cả dấu) khớp quá rộng khi tìm câu trả lời mẫu theo từng từ.
    private const MIN_WORD_CHARACTERS = 2;

    public function search(int $accountId, string $query, int $limit): array
    {
        $query = trim($query);

        if ($query === '' || $limit <= 0) {
            return [];
        }

        $articles = $this->articles($accountId, $query, $limit);
        $cannedResponses = $this->cannedResponses($accountId, $query, $limit);

        $sources = array_slice($this->interleave($articles, $cannedResponses), 0, $limit);
        $perSource = $sources === [] ? 0 : min(self::EXCERPT_CHARACTERS, intdiv(self::RESULT_CHARACTERS, count($sources)));

        return array_map(fn (array $source) => new KnowledgeHit(
            ref: $source['ref'],
            kind: $source['kind'],
            title: $source['title'],
            excerpt: KnowledgeExcerpt::of($source['text'], $query, $perSource),
            provenance: Provenance::Business,
        ), $sources);
    }

    /** @return list<KnowledgeSource> */
    private function articles(int $accountId, string $query, int $limit): array
    {
        $tsQuery = str_replace(' & ', ' | ', Article::toTsQuery($query));

        if ($tsQuery === '') {
            return [];
        }

        $vector = Article::SEARCH_VECTOR;

        return Article::query()
            ->where('articles.account_id', $accountId)
            ->published()
            ->whereRaw("({$vector}) @@ to_tsquery('simple', ?)", [$tsQuery])
            ->orderByRaw("ts_rank(({$vector}), to_tsquery('simple', ?), 2) DESC", [$tsQuery])
            ->orderBy('articles.id')
            ->limit($limit)
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
    private function cannedResponses(int $accountId, string $query, int $limit): array
    {
        $scoped = fn () => CannedResponse::query()->where('account_id', $accountId);
        $matches = $scoped()->search($query)->limit($limit)->get();

        if ($matches->count() < $limit) {
            $words = array_values(array_filter(
                preg_split('/\s+/u', $query) ?: [],
                fn (string $word) => mb_strlen($word) >= self::MIN_WORD_CHARACTERS,
            ));

            if ($words !== []) {
                $byWord = $scoped()
                    ->whereNotIn('id', $matches->modelKeys())
                    ->where(function ($any) use ($words) {
                        foreach ($words as $word) {
                            $contains = '%'.str_replace(['\\', '%', '_', "\0"], ['\\\\', '\%', '\_', ''], $word).'%';
                            $any->orWhere('short_code', 'ILIKE', $contains)->orWhere('content', 'ILIKE', $contains);
                        }
                    })
                    ->orderBy('id')
                    ->limit($limit - $matches->count())
                    ->get();
                $matches = $matches->concat($byWord);
            }
        }

        return $matches
            ->map(fn (CannedResponse $response) => [
                'ref' => "canned_response:{$response->id}",
                'kind' => 'canned_response',
                'title' => (string) $response->short_code,
                'text' => (string) $response->content,
            ])
            ->values()
            ->all();
    }

    /**
     * @param  list<KnowledgeSource>  $first
     * @param  list<KnowledgeSource>  $second
     * @return list<KnowledgeSource>
     */
    private function interleave(array $first, array $second): array
    {
        $merged = [];

        for ($index = 0; $index < max(count($first), count($second)); $index++) {
            array_push($merged, ...array_filter([$first[$index] ?? null, $second[$index] ?? null]));
        }

        return $merged;
    }
}
