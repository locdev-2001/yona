{{-- Port từ public/api/v1/portals/error/404.html.erb --}}
@extends('public.portal.layout')

@section('content')
<div class="max-w-6xl h-full w-full flex-grow flex flex-col items-center justify-center mx-auto py-16 px-4 relative">
    <div class="text-center mb-12">
        <span class="text-8xl">🔍</span>
    </div>
    <h1 class="text-6xl text-center font-semibold text-slate-800 leading-relaxed">{{ __('public_portal.404.title') }}</h1>
    <p class="text-center text-slate-700 my-1">{{ __('public_portal.404.description') }}</p>
    <div class="text-center my-8">
        <a href="{{ $links::home($portal->slug, $portal->defaultLocale() ?: $locale, $isPlainLayout) }}" class="text-woot-500 font-semibold underline">
            {{ __('public_portal.404.back_to_home') }}
        </a>
    </div>
</div>
@endsection
