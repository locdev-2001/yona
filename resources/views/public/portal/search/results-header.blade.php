{{-- Port từ search/_results_header.html.erb --}}
<div class="flex flex-row items-center gap-px mb-6">
  <a class="text-slate-500 text-sm gap-1 hover:cursor-pointer hover:underline leading-8 font-semibold"
     href="{{ $links::home($portal->slug, $locale, $isPlainLayout) }}">
    {{ __('public_portal.common.home') }}
  </a>
  <span class="w-4 h-4 [&>svg]:w-3 [&>svg]:h-3 flex items-center justify-center text-xs text-slate-500">
    @include('public.portal.icons.chevron-right')
  </span>
  <span class="text-sm font-semibold text-slate-800">
    {{ __('public_portal.search.results') }}
  </span>
</div>

<h1 class="text-3xl font-semibold leading-normal md:tracking-normal md:text-4xl text-slate-900">
  {{ __('public_portal.search.results_for', ['query' => $query]) }}
</h1>

@include('public.portal.search.form')
