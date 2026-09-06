{{-- Port từ articles/show.html.erb (+ show.html+plain.erb) --}}
@extends('public.portal.layout')

@section('head')
  @include('public.portal.articles.meta-head')
@endsection

@section('content')
@if ($isPlainLayout)
  <div class="max-w-5xl mx-auto space-y-4 w-full px-4 md:px-8 py-4">
    @include('public.portal.articles.article-header')
  </div>
  @include('public.portal.articles.article-body', ['contentPadding' => 'py-4'])
@else
  <div id="portal-bg" class="bg-white dark:bg-slate-900 shadow-inner">
    <div id="portal-bg-gradient" class="pt-8 pb-8 md:pt-14 md:pb-6">
      <div class="max-w-5xl px-4 md:px-8 mx-auto flex flex-col">
        @include('public.portal.articles.article-header')
      </div>
    </div>
  </div>
  @include('public.portal.articles.article-body')
@endif
@endsection
