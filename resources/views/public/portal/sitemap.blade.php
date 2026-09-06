{{-- Port từ public/api/v1/portals/sitemap.xml.erb --}}
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
@foreach ($articles as $article)
    <url>
      <loc>{{ $helpCenterUrl.'/hc/'.$portal->slug.'/articles/'.$article->slug }}</loc>
      <lastmod>{{ $article->updated_at->toDateString() }}</lastmod>
    </url>
@endforeach
</urlset>
