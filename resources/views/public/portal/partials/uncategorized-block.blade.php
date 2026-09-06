{{-- Port từ _uncategorized-block.html.erb (+ biến thể .html+plain.erb) --}}
<section class="flex flex-col w-full h-full lg:container">
  <div @if (! $isPlainLayout) id="category-block" @endif class="flex flex-col gap-8 h-full {{ $isPlainLayout ? '' : 'border border-solid border-slate-100 dark:border-slate-800 py-5 px-3 rounded-lg' }}">
    <div class="flex justify-between items-center w-full {{ $isPlainLayout ? '' : 'px-1' }}">
      <h3 @if (! $isPlainLayout) id="category-name" @endif class="text-xl text-slate-800 dark:text-slate-50 font-semibold leading-relaxed hover:cursor-pointer {{ $isPlainLayout ? 'hover:underline' : 'pl-1' }}">
        {{ __('public_portal.header.uncategorized') }}
      </h3>
    </div>
    <div class="-mt-4">
      @foreach ($uncategorizedArticles->take(5) as $article)
      <a
        class="leading-7 text-slate-700 dark:text-slate-100"
        href="{{ $links::article($portal->slug, $article->slug, $theme, $isPlainLayout) }}"
      >
        <div @if (! $isPlainLayout) id="category-item" @endif class="flex justify-between hover:cursor-pointer items-center py-1 rounded-lg gap-3 {{ $isPlainLayout ? 'hover:underline' : ' px-2' }}">
          {{ $article->title }}
          <span class="flex items-center font-normal">
            @include('public.portal.icons.chevron-right')
          </span>
        </div>
      </a>
      @endforeach
    </div>
    <div class="flex justify-between flex-row items-center {{ $isPlainLayout ? '' : 'px-2' }}">
      <span class="text-sm font-medium text-slate-600 dark:text-slate-400">@include('public.portal.partials.article-count', ['articleCount' => $uncategorizedArticles->count()])</span>
    </div>
  </div>
</section>
