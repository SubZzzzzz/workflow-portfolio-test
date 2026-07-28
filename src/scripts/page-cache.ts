// Page Cache — Pré-chargement des pages adjacentes pour transitions instantanées

interface CachedPage {
  html: string;
  timestamp: number;
}

const pageCache = new Map<string, CachedPage>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const PAGE_ORDER = ['/', '/services/', '/projects/', '/contact/'];

export async function preloadPage(url: string): Promise<void> {
  if (pageCache.has(url)) {
    const cached = pageCache.get(url)!;
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      return;
    }
  }

  try {
    const response = await fetch(url);
    if (!response.ok) return;
    const html = await response.text();
    pageCache.set(url, { html, timestamp: Date.now() });
  } catch (err) {
    console.warn('Failed to preload page:', url, err);
  }
}

export function getCachedPage(url: string): string | null {
  const cached = pageCache.get(url);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_DURATION) {
    pageCache.delete(url);
    return null;
  }
  return cached.html;
}

export function preloadAdjacentPages(currentPath: string): void {
  const currentIndex = PAGE_ORDER.indexOf(currentPath);
  if (currentIndex === -1) return;

  const prevIndex = currentIndex - 1;
  const nextIndex = currentIndex + 1;

  if (prevIndex >= 0) {
    preloadPage(PAGE_ORDER[prevIndex]);
  }
  if (nextIndex < PAGE_ORDER.length) {
    preloadPage(PAGE_ORDER[nextIndex]);
  }
}

export function clearCache(): void {
  pageCache.clear();
}
