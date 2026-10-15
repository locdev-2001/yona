<?php

namespace App\Agent\Boundary\Readers;

use App\Agent\Contracts\Ports\KnowledgeReader;
use App\Agent\ValueObjects\KnowledgeHit;
use App\Agent\ValueObjects\Provenance;
use App\Models\Article;
use App\Models\CannedResponse;
use Illuminate\Support\Str;

// Tri thức bản mỏng: bài Help Center đã xuất bản (tìm toàn văn) và câu trả lời mẫu của
// account. Câu hỏi của khách thường dài, nên bài khớp BẤT KỲ từ nào rồi xếp theo hạng;
// câu trả lời mẫu khớp cả cụm trước, thiếu thì khớp từng từ.
final class CoreKnowledgeReader implements KnowledgeReader
{
    private const EXCERPT_CHARACTERS = 600;

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

        return array_slice($this->interleave($articles, $cannedResponses), 0, $limit);
    }

    /** @return list<KnowledgeHit> */
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
            ->map(fn (Article $article) => new KnowledgeHit(
                ref: "article:{$article->id}",
                kind: 'article',
                title: (string) $article->title,
                excerpt: $this->excerpt(trim($article->description."\n".$article->content)),
                provenance: Provenance::Business,
            ))
            ->all();
    }

    /** @return list<KnowledgeHit> */
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
            ->map(fn (CannedResponse $response) => new KnowledgeHit(
                ref: "canned_response:{$response->id}",
                kind: 'canned_response',
                title: (string) $response->short_code,
                excerpt: $this->excerpt((string) $response->content),
                provenance: Provenance::Business,
            ))
            ->values()
            ->all();
    }

    /**
     * @param  list<KnowledgeHit>  $first
     * @param  list<KnowledgeHit>  $second
     * @return list<KnowledgeHit>
     */
    private function interleave(array $first, array $second): array
    {
        $merged = [];

        for ($index = 0; $index < max(count($first), count($second)); $index++) {
            array_push($merged, ...array_filter([$first[$index] ?? null, $second[$index] ?? null]));
        }

        return $merged;
    }

    private function excerpt(string $text): string
    {
        $plain = trim((string) preg_replace('/\s+/u', ' ', strip_tags($text)));

        return Str::limit($plain, self::EXCERPT_CHARACTERS, '…');
    }
}
