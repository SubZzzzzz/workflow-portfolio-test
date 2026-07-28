// Transition Engine — Scroll continu sans démarcation + signal synchronisé

import { preloadAdjacentPages, getCachedPage } from './page-cache';
import { NODE_POSITIONS, getSlideDirection, type SlideDirection } from './node-positions';
import { getNodePositionPx, refreshLines } from './workflow-lines';

const COLOR_SIGNAL = '#F97316';
const COLOR_SIGNAL_END = '#22C55E';
const TRANSITION_DURATION = 1000;
const PAGE_ORDER = ['/', '/services/', '/projects/', '/contact/'];

let isTransitioning = false;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function getCurrentPath(): string {
  return window.location.pathname;
}

function extractMain(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const main = doc.querySelector('main');
  return main ? main.innerHTML : '';
}

interface SignalElements {
  svg: SVGSVGElement;
  signalLine: SVGLineElement;
  signalHead: SVGCircleElement;
  pathLength: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

function createSignalOverlay(fromPath: string, toPath: string): SignalElements | null {
  const fromIdx = PAGE_ORDER.indexOf(fromPath);
  const toIdx = PAGE_ORDER.indexOf(toPath);
  const navType = toIdx > fromIdx ? 'next' : 'prev';
  const portEl = document.querySelector(`a[data-nav="${navType}"]`);

  let startX: number, startY: number;
  if (portEl) {
    const rect = portEl.getBoundingClientRect();
    startX = rect.left + rect.width / 2;
    startY = rect.top + rect.height / 2;
  } else {
    const fromPos = getNodePositionPx(fromPath);
    if (!fromPos) return null;
    startX = fromPos.x;
    startY = fromPos.y;
  }

  const toPos = getNodePositionPx(toPath);
  if (!toPos) return null;
  const endX = toPos.x;
  const endY = toPos.y;

  const w = window.innerWidth;
  const h = window.innerHeight;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svg.style.cssText = 'position:fixed;inset:0;z-index:300;pointer-events:none;width:100vw;height:100vh;';

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <filter id="sg" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feFlood flood-color="${COLOR_SIGNAL}" flood-opacity="0.8" result="color" />
      <feComposite in="color" in2="blur" operator="in" result="g" />
      <feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
    <filter id="sgg" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="4" result="blur" />
      <feFlood flood-color="${COLOR_SIGNAL_END}" flood-opacity="0.8" result="color" />
      <feComposite in="color" in2="blur" operator="in" result="g" />
      <feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge>
    </filter>
  `;
  svg.appendChild(defs);

  const dx = endX - startX;
  const dy = endY - startY;
  const pathLength = Math.sqrt(dx * dx + dy * dy);

  const signalLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  signalLine.setAttribute('x1', `${startX}`);
  signalLine.setAttribute('y1', `${startY}`);
  signalLine.setAttribute('x2', `${endX}`);
  signalLine.setAttribute('y2', `${endY}`);
  signalLine.setAttribute('stroke', COLOR_SIGNAL);
  signalLine.setAttribute('stroke-width', '3');
  signalLine.setAttribute('stroke-dasharray', `${pathLength}`);
  signalLine.setAttribute('stroke-dashoffset', `${pathLength}`);
  signalLine.setAttribute('filter', 'url(#sg)');
  signalLine.setAttribute('stroke-linecap', 'round');
  svg.appendChild(signalLine);

  const signalHead = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  signalHead.setAttribute('cx', `${startX}`);
  signalHead.setAttribute('cy', `${startY}`);
  signalHead.setAttribute('r', '8');
  signalHead.setAttribute('fill', COLOR_SIGNAL);
  signalHead.setAttribute('filter', 'url(#sg)');
  signalHead.setAttribute('opacity', '0');
  svg.appendChild(signalHead);

  return { svg, signalLine, signalHead, pathLength, fromX: startX, fromY: startY, toX: endX, toY: endY };
}

function updateSignal(el: SignalElements, progress: number): void {
  el.signalLine.setAttribute('stroke-dashoffset', `${el.pathLength * (1 - progress)}`);

  const isGreen = progress > 0.85;
  const color = isGreen ? COLOR_SIGNAL_END : COLOR_SIGNAL;
  const filter = isGreen ? 'url(#sgg)' : 'url(#sg)';
  el.signalLine.setAttribute('stroke', color);
  el.signalLine.setAttribute('filter', filter);

  const cx = el.fromX + (el.toX - el.fromX) * progress;
  const cy = el.fromY + (el.toY - el.fromY) * progress;
  el.signalHead.setAttribute('cx', `${cx}`);
  el.signalHead.setAttribute('cy', `${cy}`);
  el.signalHead.setAttribute('fill', color);
  el.signalHead.setAttribute('filter', filter);

  if (progress < 0.05) {
    el.signalHead.setAttribute('opacity', `${progress * 20}`);
  } else if (progress > 0.95) {
    el.signalHead.setAttribute('opacity', `${(1 - progress) * 20}`);
  } else {
    el.signalHead.setAttribute('opacity', '1');
  }
}

async function navigateTo(url: string): Promise<void> {
  if (isTransitioning) return;
  const currentPath = getCurrentPath();
  if (currentPath === url) return;

  isTransitioning = true;

  const currentMain = document.querySelector('main') as HTMLElement;
  if (!currentMain) { isTransitioning = false; return; }

  const originalStyles = currentMain.style.cssText;
  let wrapper: HTMLElement | null = null;
  let signal: SignalElements | null = null;

  try {
    let html = getCachedPage(url);
    if (!html) {
      const response = await fetch(url);
      html = await response.text();
    }

    const newMainHTML = extractMain(html);
    const slideDirection = getSlideDirection(currentPath, url);
    const isVertical = slideDirection === 'up' || slideDirection === 'down';

    // Wrapper fixed avec overflow hidden
    wrapper = document.createElement('div');
    wrapper.style.cssText = 'position:fixed;inset:0;z-index:100;overflow:hidden;';

    // Container interne
    const inner = document.createElement('div');
    if (isVertical) {
      inner.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:200vh;will-change:transform;';
    } else {
      inner.style.cssText = 'position:absolute;top:0;left:0;width:200vw;height:100%;will-change:transform;';
    }

    // DÉPLACER le main original dans le inner (pas de clone !)
    currentMain.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100vh;overflow:hidden;';
    inner.appendChild(currentMain);

    // Page suivante positionnée juste après
    const nextMain = document.createElement('main');
    nextMain.className = 'relative z-10';
    nextMain.innerHTML = newMainHTML;
    if (isVertical) {
      const topPos = slideDirection === 'up' ? '100vh' : '-100vh';
      nextMain.style.cssText = `position:absolute;top:${topPos};left:0;width:100%;height:100vh;overflow:hidden;`;
    } else {
      const leftPos = slideDirection === 'left' ? '100vw' : '-100vw';
      nextMain.style.cssText = `position:absolute;top:0;left:${leftPos};width:100vw;height:100%;overflow:hidden;`;
    }
    inner.appendChild(nextMain);

    wrapper.appendChild(inner);

    // Signal overlay
    signal = createSignalOverlay(currentPath, url);

    // Ajouter au DOM
    document.body.appendChild(wrapper);
    if (signal) document.body.appendChild(signal.svg);

    // Animation : scroll continu + signal synchronisé
    const startTime = performance.now();

    await new Promise<void>((resolve) => {
      function frame(now: number) {
        const elapsed = now - startTime;
        const raw = Math.min(elapsed / TRANSITION_DURATION, 1);
        const eased = easeInOutCubic(raw);

        if (isVertical) {
          const offset = eased * window.innerHeight;
          inner.style.transform = `translateY(${slideDirection === 'up' ? -offset : offset}px)`;
        } else {
          const offset = eased * window.innerWidth;
          inner.style.transform = `translateX(${slideDirection === 'left' ? -offset : offset}px)`;
        }

        if (signal) updateSignal(signal, eased);

        if (raw < 1) {
          requestAnimationFrame(frame);
        } else {
          resolve();
        }
      }
      requestAnimationFrame(frame);
    });

    // Finaliser : extraire nextMain du wrapper et le mettre dans le body
    nextMain.style.cssText = 'position:relative;z-index:10;';
    document.body.insertBefore(nextMain, wrapper);
    wrapper.remove();
    wrapper = null;
    if (signal) { signal.svg.remove(); signal = null; }

    // URL
    history.pushState({ path: url }, '', url);

    // Ré-exécuter les scripts
    nextMain.querySelectorAll('script').forEach((oldScript) => {
      const newScript = document.createElement('script');
      if (oldScript instanceof HTMLScriptElement && oldScript.src) {
        newScript.src = oldScript.src;
      } else {
        newScript.textContent = oldScript.textContent;
      }
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });

    refreshLines();
    preloadAdjacentPages(url);

  } catch (err) {
    console.error('Transition error:', err);
    // En cas d'erreur, remettre le main original dans le body
    if (wrapper) {
      if (currentMain.parentNode && currentMain.parentNode !== document.body) {
        currentMain.style.cssText = originalStyles;
        document.body.insertBefore(currentMain, wrapper);
      }
      wrapper.remove();
    }
    if (signal) signal.svg.remove();
    window.location.href = url;
  } finally {
    isTransitioning = false;
  }
}

function setupNavigationInterception(): void {
  document.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const link = target.closest('a[href]') as HTMLAnchorElement | null;
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    if (href.startsWith('/') || href.startsWith(window.location.origin)) {
      const url = href.startsWith('/') ? href : new URL(href).pathname;
      if (link.hasAttribute('target') || link.hasAttribute('download')) return;
      e.preventDefault();
      navigateTo(url);
    }
  });

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      const prevLink = document.querySelector('a[data-nav="prev"]') as HTMLAnchorElement | null;
      if (prevLink) {
        e.preventDefault();
        prevLink.click();
      }
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      const nextLink = document.querySelector('a[data-nav="next"]') as HTMLAnchorElement | null;
      if (nextLink) {
        e.preventDefault();
        nextLink.click();
      }
    }
  });

  window.addEventListener('popstate', (e) => {
    if (e.state?.path) {
      navigateTo(e.state.path);
    } else {
      window.location.reload();
    }
  });

  if (!history.state?.path) {
    history.replaceState({ path: getCurrentPath() }, '');
  }

  preloadAdjacentPages(getCurrentPath());
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupNavigationInterception);
} else {
  setupNavigationInterception();
}
