{{-- Port từ categories/show.html.erb (+ show.html+plain.erb) --}}
@extends('public.portal.layout')

@section('head')
  @include('public.portal.categories.meta-head')
@endsection

@section('content')
@if ($isPlainLayout)
  @include('public.portal.categories.category-hero')
@else
  <div id="portal-bg" class="bg-white">
    <div id="portal-bg-gradient" class="pt-8 pb-8 md:pt-14 md:pb-6">
      @include('public.portal.categories.category-hero')
    </div>
  </div>
@endif
@include('public.portal.categories.article-list')
@endsection
