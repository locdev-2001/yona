// Port từ app/javascript/entrypoints/portal.js + portal/portalHelpers.js.
// Điều hướng trang thường + React.
import { createRoot } from 'react-dom/client';
import { createElement } from 'react';

import PublicArticleSearch from './components/PublicArticleSearch';
import TableOfContents from './components/TableOfContents';
import type { TocRow } from './components/TableOfContents';
import { initializeTheme } from './portalThemeHelper';
import './types';

const HEADING_SELECTOR = 'h1, h2, h3';

function slugify(text: string, taken: Set<string>): string {
    const base =
        text
            .toLowerCase()
            .normalize('NFKD')
            .replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || 'section';

    let slug = base;
    let counter = 1;
    while (taken.has(slug)) {
        counter += 1;
        slug = `${base}-${counter}`;
    }
    taken.add(slug);

    return slug;
}

function getHeadingsFromTheArticle(): TocRow[] {
    const articleElement = document.getElementById('cw-article-content');
    if (!articleElement) return [];

    const taken = new Set<string>();
    const rows: TocRow[] = [];

    articleElement.querySelectorAll<HTMLElement>(HEADING_SELECTOR).forEach(element => {
        const headingText = element.innerText;
        const slug = slugify(headingText, taken);
        element.id = slug;
        element.className = 'scroll-mt-24 heading';

        const permalink = document.createElement('a');
        permalink.className = 'permalink text-slate-600 ml-3';
        permalink.href = `#${slug}`;
        permalink.title = headingText;
        permalink.textContent = '#';
        element.appendChild(permalink);

        rows.push({ slug, title: headingText, tag: element.tagName.toLowerCase() });
    });

    return rows;
}

function isSameHost(a: string, b: string): boolean {
    try {
        return new URL(a, window.location.href).host === new URL(b, window.location.href).host;
    } catch {
        return false;
    }
}

function openExternalLinksInNewTab(): void {
    const { customDomain, hostURL } = window.portalConfig;
    const isOnArticlePage = document.querySelector('#cw-article-content') !== null;

    document.addEventListener('click', event => {
        if (!isOnArticlePage) return;

        const link = (event.target as HTMLElement)?.closest('a');
        if (!link) return;

        const isInternalLink =
            isSameHost(link.href, window.location.href) ||
            (customDomain && isSameHost(link.href, customDomain)) ||
            (hostURL && isSameHost(link.href, hostURL));

        if (!isInternalLink) {
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            event.stopPropagation();
        }
    });
}

function navigateToLocalePage(): void {
    document.addEventListener('change', event => {
        const localeSwitcher = (event.target as HTMLElement)?.closest<HTMLSelectElement>('.locale-switcher');
        if (!localeSwitcher) return;

        const { portalSlug } = localeSwitcher.dataset;
        window.location.href = `/hc/${encodeURIComponent(portalSlug ?? '')}/${encodeURIComponent(localeSwitcher.value)}/`;
    });
}

function initializeSearch(): void {
    ['#search-wrap', '#search-wrap-hero'].forEach(selector => {
        const mountPoint = document.querySelector<HTMLElement>(selector);
        if (!mountPoint) return;

        const size = (mountPoint.dataset.size as 'small' | 'default') || 'default';
        const showKbd = Boolean(mountPoint.dataset.kbd);
        createRoot(mountPoint).render(createElement(PublicArticleSearch, { size, showKbd }));
    });
}

function initializeTableOfContents(): void {
    const mountPoint = document.querySelector('#cw-hc-toc');
    if (!mountPoint) return;

    createRoot(mountPoint).render(createElement(TableOfContents, { rows: getHeadingsFromTheArticle() }));
}

// Biến thể nhúng iframe: mọi liên kết trong trang phải giữ ?show_plain_layout.
function appendPlainParamToURLs(): void {
    Array.from(document.getElementsByTagName('a')).forEach(anchor => {
        if (anchor.href && anchor.href.includes('/hc/')) {
            const url = new URL(anchor.href);
            url.searchParams.set('show_plain_layout', 'true');
            anchor.setAttribute('href', url.toString());
        }
    });
}

function initialize(): void {
    openExternalLinksInNewTab();

    if (window.portalConfig.isPlainLayoutEnabled === 'true') {
        appendPlainParamToURLs();

        return;
    }

    initializeTheme();
    navigateToLocalePage();
    initializeSearch();
    initializeTableOfContents();
}

document.addEventListener('DOMContentLoaded', initialize);
