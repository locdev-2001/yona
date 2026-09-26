{{-- Port từ search/_results.html.erb --}}
@include('public.portal.search.search-handler')

<section class="max-w-5xl w-full mx-auto px-4 md:px-8 py-6 flex flex-col items-center justify-center flex-grow">
  <div class="w-full flex flex-col gap-6 flex-grow">
    @if ($articles->isEmpty())
      <div class="h-full flex items-center justify-center bg-slate-50 rounded-xl py-6">
        <p class="text-sm text-slate-500">{{ __('public_portal.search.no_results', ['query' => $query]) }}</p>
      </div>
    @else
      <p class="text-sm text-slate-600">
        {{ trans_choice('public_portal.search.found_results', $totalCount, ['count' => $totalCount]) }}
      </p>

      @foreach ($articles as $article)
        <div class="border border-solid border-slate-100 rounded-lg">
          <a class="p-4 text-slate-800 flex justify-between content-center hover:cursor-pointer"
             href="{{ $links::article($portal->slug, $article->slug, $isPlainLayout) }}">
            <div class="flex flex-col gap-5">
              <div class="flex flex-col gap-1">
                <h3 class="text-lg text-slate-900 tracking-[0.28px] font-semibold">
                  {{ $article->title }}
                </h3>
                <p class="text-base font-normal text-slate-600 line-clamp-2 break-all">
                  {{ \App\Support\HelpCenter\ArticleMarkdown::toPlainText($article->content) }}
                </p>
              </div>
              <div class="flex flex-row items-center gap-2">
                @if ($article->category)
                  <span class="text-sm text-slate-600 font-medium">
                    {{ $article->category->name }}
                  </span>
                  <span class="text-slate-600">•</span>
                @endif
                <span class="text-sm text-slate-600 font-medium">
                  {{ __('public_portal.common.last_updated_on', ['last_updated_on' => $article->updated_at->format('M d, Y')]) }}
                </span>
              </div>
            </div>
          </a>
        </div>
      @endforeach

      @if ($totalPages > 1)
        <div class="flex justify-center mt-6">
          <nav class="inline-flex">
            @if ($currentPage > 1)
              <a href="{{ request()->fullUrlWithQuery(['page' => $currentPage - 1]) }}" class="px-3 py-2 border border-slate-200 rounded-l-md text-sm font-medium text-slate-700 hover:bg-slate-50">
                {{ __('public_portal.common.previous') }}
              </a>
            @endif

            @if ($currentPage < $totalPages)
              <a href="{{ request()->fullUrlWithQuery(['page' => $currentPage + 1]) }}" class="px-3 py-2 border border-slate-200 rounded-r-md text-sm font-medium text-slate-700 hover:bg-slate-50">
                {{ __('public_portal.common.next') }}
              </a>
            @endif
          </nav>
        </div>
      @endif
    @endif
  </div>
</section>
