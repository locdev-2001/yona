{{-- Port từ categories/_category-hero.html.erb --}}
@php($plain = $isPlainLayout)
@php($publishedCount = $category->articles->filter(fn ($article) => $article->isPublished())->count())
<div class="flex flex-col px-4 md:px-8 max-w-5xl w-full mx-auto gap-6 {{ $plain ? 'py-4' : '' }}">
  <div class="flex items-center flex-row">
    <a
      class="text-slate-500 dark:text-slate-200 text-sm gap-1 {{ $plain ? 'hover:underline' : '' }} hover:cursor-pointer leading-8 font-semibold"
      href="{{ $links::home($portal->slug, $category->locale, $theme, $plain) }}"
    >
      {{ __('public_portal.common.home') }}
    </a>
    <span class="w-4 h-4 [&>svg]:w-3 [&>svg]:h-3 flex items-center justify-center text-xs text-slate-500 dark:text-slate-300">@include('public.portal.icons.chevron-right')</span>
    <span class="text-sm text-slate-800 dark:text-slate-100 font-semibold">{{ $category->name }}</span>
  </div>
  <div class="flex justify-start flex-col items-start w-full gap-2">
    <div class="flex flex-col gap-2">
      @if (filled($category->icon))
      <span class="text-4xl">{!! $links::emojiOrIcon($category->icon, $category->icon_color) !!}</span>
      @endif
      <h1 class="text-3xl font-bold tracking-wide leading-[52.5px] text-slate-900 dark:text-white">
        {{ $category->name }}
      </h1>
      @if (filled($category->description))
      <span class="font-medium text-slate-700 dark:text-slate-200 text-base leading-5">{{ $category->description }}</span>
      @endif
    </div>
    <div class="flex flex-row items-center gap-1">
      @include('public.portal.partials.authors', ['category' => $category, 'showExpanded' => true])
      <span class="text-slate-600 dark:text-slate-400">•</span>
      <span class="flex items-center text-base text-slate-600 dark:text-slate-400 font-medium">@include('public.portal.partials.article-count', ['articleCount' => $publishedCount])</span>
    </div>
  </div>
</div>
