{{-- Port từ categories/_article_list.html.erb (+ biến thể .html+plain.erb) --}}
<section class="max-w-5xl w-full mx-auto px-4 md:px-8 py-6 flex flex-col items-center justify-center flex-grow">
  <div class="w-full flex flex-col gap-6 flex-grow">
    @if ($articles->isEmpty())
    <div class="h-full flex items-center justify-center bg-slate-50 rounded-xl py-6">
      <p class="text-sm text-slate-500">{{ __('public_portal.common.no_articles') }}</p>
    </div>
    @else
    @foreach ($articles as $article)
    <div @if ($isPlainLayout) class="group" @else id="category-block" class="border border-solid border-slate-100 rounded-lg" @endif>
      <a
        class="{{ $isPlainLayout ? 'px-0 py-1' : 'p-4' }} text-slate-800 flex justify-between content-center hover:cursor-pointer"
        href="{{ $links::article($portal->slug, $article->slug, $isPlainLayout) }}"
      >
        <div class="flex flex-col gap-5">
          <div class="flex flex-col gap-1">
            <h3 @if (! $isPlainLayout) id="category-name" @endif class="text-lg text-slate-900 tracking-[0.28px] font-semibold {{ $isPlainLayout ? 'group-hover:underline' : '' }}">{{ $article->title }}</h3>
            <p class="text-base font-normal text-slate-600 line-clamp-1 break-all">{{ \App\Support\HelpCenter\ArticleMarkdown::toPlainText($article->content) }}</p>
          </div>
          <span class="text-sm text-slate-600 font-medium flex items-center">{{ __('public_portal.common.last_updated_on', ['last_updated_on' => $article->updated_at->format('M d, Y')]) }}</span>
        </div>
      </a>
    </div>
    @endforeach
    @endif
  </div>
</section>
