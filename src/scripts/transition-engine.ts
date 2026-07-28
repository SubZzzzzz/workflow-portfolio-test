// Transition Engine — Signal animé + glissement synchronisé
// Le signal vert se propage le long du lien pendant que la page glisse

import { preloadAdjacentPages, getCachedPage } from './page-cache';
import { NODE_POSITIONS, getSlideDirection, type SlideDirection } from './node-positions';

const COLOR_SIGNAL = '#F97316';
const COLOR_SIGNAL_END = '#22C55E';
const COLOR_CABLE = '#1E3050';
const TRANSITION_DURATION = 1200;

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

interface SignalOverlayElements {
  svg: SVGSVGElement;
  cable: SVGLineElement;
  signalLine: SVGLineElement;
  signalHead: SVGCircleElement;
  pathLength: number;
}

function createSignalOverlay(fromPath: string, toPath: string): SignalOverlayElements {
  const from = NODE_POSITIONS[fromPath];
  const to = NODE_POSITIONS[toPath];

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.style.cssText = 'position:fixed;inset:0;z-index:200;pointer-events:none;width:100vw;height:100vh;';

  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <filter id="sigGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="1.5" result="blur" />
      <feFlood flood-color="${COLOR_SIGNAL}" flood-opacity="0.7" result="color" />
      <feComposite in="color" in2="blur" operator="in" result="glowColor" />
      <feMerge>
        <feMergeNode in="glowColor" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id="sigGlowGreen" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="1.5" result="blur" />
      <feFlood flood-color="${COLOR_SIGNAL_END}" flood-opacity="0.7" result="color" />
      <feComposite in="color" in2="blur" operator="in" result="glowColor" />
      <feMerge>
        <feMergeNode in="glowColor" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  `;
  svg.appendChild(defs);

  const cable = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  cable.setAttribute('x1', `${from.x}`);
  cable.setAttribute('y1', `${from.y}`);
  cable.setAttribute('x2', `${to.x}`);
  cable.setAttribute('y2', `${to.y}`);
  cable.setAttribute('stroke', COLOR_CABLE);
  cable.setAttribute('stroke-width', '0.15');
  cable.setAttribute('opacity', '0.5');
  svg.appendChild(cable);

  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const pathLength = Math.sqrt(dx * dx + dy * dy);

  const signalLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  signalLine.setAttribute('x1', `${from.x}`);
  signalLine.setAttribute('y1', `${from.y}`);
  signalLine.setAttribute('x2', `${to.x}`);
  signalLine.setAttribute('y2', `${to.y}`);
  signalLine.setAttribute('stroke', COLOR_SIGNAL);
  signalLine.setAttribute('stroke-width', '0.35');
  signalLine.setAttribute('stroke-dasharray', `${pathLength}`);
  signalLine.setAttribute('stroke-dashoffset', `${pathLength}`);
  signalLine.setAttribute('filter', 'url(#sigGlow)');
  svg.appendChild(signalLine);

  const signalHead = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  signalHead.setAttribute('cx', `${from.x}`);
  signalHead.setAttribute('cy', `${from.y}`);
  signalHead.setAttribute('r', '0.8');
  signalHead.setAttribute('fill', COLOR_SIGNAL);
  signalHead.setAttribute('filter', 'url(#sigGlow)');
  signalHead.setAttribute('opacity', '0');
  svg.appendChild(signalHead);

  return { svg, cable, signalLine, signalHead, pathLength };
}

function updateSignal(elements: SignalOverlayElements, progress: number, fromPath: string, toPath: string): void {
  const { signalLine, signalHead, pathLength } = elements;
  const from = NODE_POSITIONS[fromPath];
  const to = NODE_POSITIONS[toPath];

  signalLine.setAttribute('stroke-dashoffset', `${pathLength * (1 - progress)}`);

  const isGreen = progress > 0.85;
  const color = isGreen ? COLOR_SIGNAL_END : COLOR_SIGNAL;
  const filter = isGreen ? 'url(#sigGlowGreen)' : 'url(#sigGlow)';
  signalLine.setAttribute('stroke', color);
  signalLine.setAttribute('filter', filter);

  const cx = from.x + (to.x - from.x) * progress;
  const cy = from.y + (to.y - from.y) * progress;
  signalHead.setAttribute('cx', `${cx}`);
  signalHead.setAttribute('cy', `${cy}`);
  signalHead.setAttribute('fill', color);
  signalHead.setAttribute('filter', filter);

  if (progress < 0.05) {
    signalHead.setAttribute('opacity', `${progress * 20}`);
  } else if (progress > 0.95) {
    signalHead.setAttribute('opacity', `${(1 - progress) * 20}`);
  } else {
    signalHead.setAttribute('opacity', '1');
  }
}

function positionPage(el: HTMLElement, direction: SlideDirection | 'none', progress: number): void {
  const p = progress * 100;
  switch (direction) {
    case 'up':    el.style.transform = `translateY(${-p}%)`; break;
    case 'down':  el.style.transform = `translateY(${p}%)`; break;
    case 'left':  el.style.transform = `translateX(${-p}%)`; break;
    case 'right': el.style.transform = `translateX(${p}%)`; break;
    case 'none':  el.style.transform = 'none'; break;
  }
}

function getOppositeDirection(dir: SlideDirection): SlideDirection {
  switch (dir) {
    case 'up': return 'down';
    case 'down': return 'up';
    case 'left': return 'right';
    case 'right': return 'left';
  }
}

async function navigateTo(url: string): Promise<void> {
  if (isTransitioning) return;
  const currentPath = getCurrentPath();
  if (currentPath === url) return;

  isTransitioning = true;

  try {
    let html = getCachedPage(url);
    if (!html) {
      const response = await fetch(url);
      html = await response.text();
    }

    const newMainHTML = extractMain(html);
    const slideDirection = getSlideDirection(currentPath, url);
    const nextSlideDir = getOppositeDirection(slideDirection);

    const signalOverlay = createSignalOverlay(currentPath, url);
    document.body.appendChild(signalOverlay.svg);

    const currentMain = document.querySelector('main') as HTMLElement;
    if (!currentMain) return;

    const nextMain = document.createElement('main');
    nextMain.className = currentMain.className;
    nextMain.innerHTML = newMainHTML;
    nextMain.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 50;
      overflow-y: auto;
      will-change: transform;
    `;

    positionPage(nextMain, nextSlideDir, 1);
    document.body.appendChild(nextMain);

    currentMain.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 40;
      overflow-y: auto;
      will-change: transform;
    `;
    positionPage(currentMain, 'none', 0);

    const startTime = performance.now();

    await new Promise<void>((resolve) => {
      function animate(currentTime: number) {
        const elapsed = currentTime - startTime;
        const rawProgress = Math.min(elapsed / TRANSITION_DURATION, 1);
        const easedProgress = easeInOutCubic(rawProgress);

        positionPage(currentMain, slideDirection, easedProgress);
        positionPage(nextMain, nextSlideDir, 1 - easedProgress);
        updateSignal(signalOverlay, easedProgress, currentPath, url);

        if (rawProgress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      }
      requestAnimationFrame(animate);
    });

    currentMain.remove();
    signalOverlay.svg.remove();
    nextMain.style.cssText = 'position: relative; z-index: 10;';

    history.pushState({ path: url }, '', url);

    nextMain.querySelectorAll('script').forEach((oldScript) => {
      const newScript = document.createElement('script');
      if (oldScript instanceof HTMLScriptElement && oldScript.src) {
        newScript.src = oldScript.src;
      } else {
        newScript.textContent = oldScript.textContent;
      }
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });

    preloadAdjacentPages(url);

  } catch (err) {
    console.error('Transition error:', err);
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
