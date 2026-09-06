{{-- Port từ articles/_article_body.html.erb --}}
<div class="flex max-w-5xl w-full px-4 md:px-8 mx-auto {{ $contentPadding ?? 'pt-8 pb-12' }}">
  <div class="flex-grow flex-2 max-w-3xl mx-auto w-full min-w-0 font-inter tracking-normal">
    @include('public.portal.articles.content')
  </div>
  <div class="flex-1" id="cw-hc-toc"></div>
</div>
