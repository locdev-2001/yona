{{-- Port từ articles/_article_header.html.erb --}}
@php($plain = $isPlainLayout)
<div class="flex flex-row items-center gap-px mb-6">
  <a
    class="text-slate-500 dark:text-slate-200 text-sm gap-1 hover:cursor-pointer {{ $plain ? 'hover:underline' : '' }} leading-8 font-semibold"
    href="{{ $links::home($portal->slug, $locale, $theme, $plain) }}"
  >
    {{ __('public_portal.common.home') }}
  </a>
  <span class="w-4 h-4 [&>svg]:w-3 [&>svg]:h-3 flex items-center justify-center text-xs text-slate-500 dark:text-slate-300">@include('public.portal.icons.chevron-right')</span>
  @if ($article->category)
    <a class="text-slate-500 dark:text-slate-200 text-sm gap-1 whitespace-nowrap hover:cursor-pointer {{ $plain ? 'hover:underline' : '' }} leading-8 font-semibold" href="{{ $links::category($portal->slug, $article->category->locale, $article->category->slug, $theme, $plain) }}">
    {{ $article->category->name }}
    </a>
    <span class="w-4 h-4 [&>svg]:w-3 [&>svg]:h-3 flex items-center justify-center text-xs text-slate-500 dark:text-slate-300">@include('public.portal.icons.chevron-right')</span>
    <span class="min-w-0 overflow-hidden text-sm font-semibold text-slate-800 dark:text-slate-100 text-ellipsis whitespace-nowrap">{{ $article->title }}</span>
  @else
    <span class="text-sm font-semibold leading-8 text-slate-700 dark:text-slate-100">{{ __('public_portal.header.uncategorized') }}</span>
  @endif
</div>
<h1 class="text-3xl font-semibold leading-normal md:tracking-normal md:text-4xl text-slate-900 dark:text-white">
  {{ $article->title }}
</h1>
<div class="flex flex-col items-start justify-between w-full pt-6 md:flex-row md:items-center">
  <div class="flex items-start space-x-1">
    <span class="flex items-center text-base font-medium text-slate-600 dark:text-slate-400">
     {{ __('public_portal.common.last_updated_on', ['last_updated_on' => $article->updated_at->format('M d, Y')]) }}
    </span>
  </div>
</div>
