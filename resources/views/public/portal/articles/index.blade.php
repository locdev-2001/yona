{{-- Port từ articles/index.html.erb (bản gốc chỉ liệt kê tiêu đề + tác giả). --}}
@extends('public.portal.layout')

@section('content')
<div class="bg-slate-50 dark:bg-slate-800">
  <div class="w-full max-w-4xl px-6 py-16 mx-auto space-y-12">
    <div class="space-y-4">
    <div>
      <a
        class="leading-8 text-slate-800 hover:underline"
          href="{{ $links::home($portal->slug, $category?->slug ?? '', $theme, $isPlainLayout) }}"
      >
        {{ $portal->localizedValue('name', $locale) }} {{ __('public_portal.common.home') }}
      </a>
    <span>/</span>
    <span>/</span>
    </div>
      @foreach ($articles as $article)
        <h1 class="text-4xl font-semibold leading-snug md:tracking-normal md:text-5xl text-slate-900 dark:text-white">
        {{ $article->title }}</h1>
        <div class="flex flex-col items-start justify-between w-full pt-2 md:flex-row md:items-center">
          <div class="flex items-center space-x-2">
            <img src="{{ $article->author?->avatarUrl() }}" alt="" class="w-12 border rounded-full h-812">
            <div>
              <h5 class="mb-2 text-base font-medium text-slate-900 dark:text-white">{{ $article->author?->name }}</h5>
              <p class="text-sm font-normal text-slate-700 dark:text-slate-100">
                {{ $article->author?->updated_at?->format('F d Y') }}</p>
            </div>
          </div>
        </div>
      @endforeach
    </div>
  </div>
</div>
<div class="flex-grow w-full max-w-4xl px-8 py-16 mx-auto space-y-12">
  <article class="space-y-8">
    <div class="max-w-3xl font-sans text-lg leading-8 text-slate-800 dark:text-slate-50 blog-content">
    </div>
  </article>
</div>
@endsection
