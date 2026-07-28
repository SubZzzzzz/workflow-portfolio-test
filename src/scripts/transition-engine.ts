// Transition Engine — Signal animé + glissement synchronisé des pages
// Workflow zigzag : Start ↓ Services → Projects ↓ Contact

interface TransitionConfig {
  slideDirection: 'up' | 'down' | 'left' | 'right';
  signalAxis: 'vertical' | 'horizontal';
  signalStart: number; // 0-1, position de départ du signal
  signalEnd: number;   // 0-1, position d'arrivée du signal
}

// Configuration des transitions selon la page source et la direction
const TRANSITIONS: Record<string, { forward: TransitionConfig; backward: TransitionConfig }> = {
  '/': {
    forward:  { slideDirection: 'up',    signalAxis: 'vertical',   signalStart: 0, signalEnd: 1 },
    backward: { slideDirection: 'down',  signalAxis: 'vertical',   signalStart: 1, signalEnd: 0 },
  },
  '/services/': {
    forward:  { slideDirection: 'left',  signalAxis: 'horizontal', signalStart: 0, signalEnd: 1 },
    backward: { slideDirection: 'right', signalAxis: 'horizontal', signalStart: 1, signalEnd: 0 },
  },
  '/projects/': {
    forward:  { slideDirection: 'up',    signalAxis: 'vertical',   signalStart: 0, signalEnd: 1 },
    backward: { slideDirection: 'down',  signalAxis: 'vertical',   signalStart: 1, signalEnd: 0 },
  },
  '/contact/': {
    forward:  { slideDirection: 'up',    signalAxis: 'vertical',   signalStart: 0, signalEnd: 1 },
    backward: { slideDirection: 'down',  signalAxis: 'vertical',   signalStart: 1, signalEnd: 0 },
  },
};

const COLOR_ACTIVE = '#F97316'; // orange
const COLOR_DONE = '#22C55E';   // vert
const TRANSITION_DURATION = 900; // ms

let isTransitioning = false;
let transitionAbortController: AbortController | null = null;

// Easing: ease-in-out cubic
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Récupérer la page courante
function getCurrentPath(): string {
  return window.location.pathname;
}

// Déterminer si on va en avant ou en arrière
function isForwardNavigation(from: string, to: string): boolean {
  const order = ['/', '/services/', '/projects/', '/contact/'];
  return order.indexOf(to) > order.indexOf(from);
}

// Créer l'overlay SVG pour le signal
function createSignalOverlay(config: TransitionConfig): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.style.cssText = 'position:fixed;inset:0;z-index:200;pointer-events:none;width:100vw;height:100vh;';

  // Définitions (glow filter)
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <filter id="signalGlow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2" result="blur" />
      <feFlood flood-color="${COLOR_ACTIVE}" flood-opacity="0.6" result="color" />
      <feComposite in="color" in2="blur" operator="in" result="glowColor" />
      <feMerge>
        <feMergeNode in="glowColor" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
    <filter id="signalGlowGreen" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="2" result="blur" />
      <feFlood flood-color="${COLOR_DONE}" flood-opacity="0.6" result="color" />
      <feComposite in="color" in2="blur" operator="in" result="glowColor" />
      <feMerge>
        <feMergeNode in="glowColor" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  `;
  svg.appendChild(defs);

  // Ligne de fond (le "câble")
  const cable = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  if (config.signalAxis === 'vertical') {
    cable.setAttribute('x1', '50');
    cable.setAttribute('y1', '0');
    cable.setAttribute('x2', '50');
    cable.setAttribute('y2', '100');
  } else {
    cable.setAttribute('x1', '0');
    cable.setAttribute('y1', '50');
    cable.setAttribute('x2', '100');
    cable.setAttribute('y2', '50');
  }
  cable.setAttribute('stroke', '#1E3050');
  cable.setAttribute('stroke-width', '0.3');
  cable.setAttribute('opacity', '0.4');
  svg.appendChild(cable);

  // Ligne de signal (se remplit progressivement)
  const signalLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  const len = 100;
  signalLine.setAttribute('stroke-dasharray', `${len}`);
  signalLine.setAttribute('stroke-dashoffset', `${len}`);
  signalLine.setAttribute('stroke-width', '0.5');
  signalLine.setAttribute('filter', 'url(#signalGlow)');

  if (config.signalAxis === 'vertical') {
    signalLine.setAttribute('x1', '50');
    signalLine.setAttribute('x2', '50');
    if (config.signalStart < config.signalEnd) {
      signalLine.setAttribute('y1', '0');
      signalLine.setAttribute('y2', '100');
    } else {
      signalLine.setAttribute('y1', '100');
      signalLine.setAttribute('y2', '0');
    }
  } else {
    signalLine.setAttribute('y1', '50');
    signalLine.setAttribute('y2', '50');
    if (config.signalStart < config.signalEnd) {
      signalLine.setAttribute('x1', '0');
      signalLine.setAttribute('x2', '100');
    } else {
      signalLine.setAttribute('x1', '100');
      signalLine.setAttribute('x2', '0');
    }
  }

  svg.appendChild(signalLine);

  // Tête du signal (point lumineux)
  const signalHead = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  signalHead.setAttribute('r', '1.2');
  signalHead.setAttribute('fill', COLOR_ACTIVE);
  signalHead.setAttribute('filter', 'url(#signalGlow)');
  signalHead.setAttribute('opacity', '0');
  svg.appendChild(signalHead);

  return svg;
}

// Mettre à jour le signal pendant l'animation
function updateSignal(
  svg: SVGSVGElement,
  progress: number,
  config: TransitionConfig
) {
  const signalLine = svg.querySelector('line:nth-child(3)') as SVGLineElement;
  const signalHead = svg.querySelector('circle') as SVGCircleElement;

  if (!signalLine || !signalHead) return;

  const len = 100;
  const dashOffset = len * (1 - progress);
  signalLine.setAttribute('stroke-dashoffset', `${dashOffset}`);

  // Couleur : orange → vert quand on approche de la fin
  const isGreen = progress > 0.85;
  const color = isGreen ? COLOR_DONE : COLOR_ACTIVE;
  signalLine.setAttribute('stroke', color);
  signalLine.setAttribute('filter', isGreen ? 'url(#signalGlowGreen)' : 'url(#signalGlow)');

  // Position de la tête du signal
  const t = config.signalStart + (config.signalEnd - config.signalStart) * progress;
  if (config.signalAxis === 'vertical') {
    signalHead.setAttribute('cx', '50');
    signalHead.setAttribute('cy', `${t * 100}`);
  } else {
    signalHead.setAttribute('cx', `${t * 100}`);
    signalHead.setAttribute('cy', '50');
  }
  signalHead.setAttribute('fill', color);
  signalHead.setAttribute('filter', isGreen ? 'url(#signalGlowGreen)' : 'url(#signalGlow)');
  signalHead.setAttribute('opacity', progress < 0.05 ? `${progress * 20}` : progress > 0.95 ? `${(1 - progress) * 20}` : '1');
}

// Positionner une page selon la direction et le progrès
function positionPage(
  el: HTMLElement,
  direction: 'up' | 'down' | 'left' | 'right' | 'none',
  progress: number
) {
  const p = progress * 100;
  switch (direction) {
    case 'up':    el.style.transform = `translateY(${-p}%)`; break;
    case 'down':  el.style.transform = `translateY(${p}%)`; break;
    case 'left':  el.style.transform = `translateX(${-p}%)`; break;
    case 'right': el.style.transform = `translateX(${p}%)`; break;
    case 'none':  el.style.transform = 'none'; break;
  }
}

// Extraire le contenu <main> d'un document HTML
function extractMain(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const main = doc.querySelector('main');
  return main ? main.innerHTML : '';
}

// Navigation principale avec transition animée
async function navigateTo(url: string) {
  if (isTransitioning) return;

  const currentPath = getCurrentPath();
  if (currentPath === url) return;

  isTransitioning = true;
  transitionAbortController = new AbortController();

  const forward = isForwardNavigation(currentPath, url);
  const pageConfig = TRANSITIONS[currentPath];
  const config = forward ? pageConfig?.forward : pageConfig?.backward;

  if (!config) {
    // Fallback: navigation classique
    window.location.href = url;
    return;
  }

  // Direction de glissement de la page courante et de la page suivante
  const currentSlideDir = config.slideDirection;
  const nextSlideDir = config.slideDirection; // Même direction mais sens opposé

  try {
    // 1. Fetch la page cible
    const response = await fetch(url, { signal: transitionAbortController.signal });
    const html = await response.text();
    const newMainHTML = extractMain(html);

    // 2. Créer l'overlay signal
    const overlay = createSignalOverlay(config);
    document.body.appendChild(overlay);

    // 3. Préparer la page suivante
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

    // Position de départ de la page suivante (hors écran)
    const startDir = currentSlideDir === 'up' ? 'down' :
                     currentSlideDir === 'down' ? 'up' :
                     currentSlideDir === 'left' ? 'right' :
                     currentSlideDir === 'right' ? 'left' : 'none';
    positionPage(nextMain, startDir, 1);
    document.body.appendChild(nextMain);

    // Position de départ de la page courante
    currentMain.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 40;
      overflow-y: auto;
      will-change: transform;
    `;
    positionPage(currentMain, 'none', 0);

    // 4. Animer
    const startTime = performance.now();

    await new Promise<void>((resolve) => {
      function animate(currentTime: number) {
        const elapsed = currentTime - startTime;
        const rawProgress = Math.min(elapsed / TRANSITION_DURATION, 1);
        const easedProgress = easeInOutCubic(rawProgress);

        // Glissement des pages
        positionPage(currentMain, currentSlideDir, easedProgress);
        positionPage(nextMain, startDir, 1 - easedProgress);

        // Signal
        updateSignal(overlay, easedProgress, config);

        if (rawProgress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      }
      requestAnimationFrame(animate);
    });

    // 5. Finaliser
    currentMain.remove();
    overlay.remove();

    // Remettre la page suivante en position normale (static)
    nextMain.style.cssText = 'position: relative; z-index: 10;';

    // Mettre à jour l'URL
    history.pushState({ path: url }, '', url);

    // Réexécuter les scripts de la nouvelle page
    nextMain.querySelectorAll('script').forEach(oldScript => {
      const newScript = document.createElement('script');
      if (oldScript.src) {
        newScript.src = oldScript.src;
      } else {
        newScript.textContent = oldScript.textContent;
      }
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });

  } catch (err: any) {
    if (err.name === 'AbortError') return;
    console.error('Transition error:', err);
    window.location.href = url;
  } finally {
    isTransitioning = false;
    transitionAbortController = null;
  }
}

// Intercepter les clics sur les liens de navigation
function setupNavigationInterception() {
  document.addEventListener('click', (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    const link = target.closest('a[href]') as HTMLAnchorElement | null;
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;

    // Navigation interne uniquement
    if (href.startsWith('/') || href.startsWith(window.location.origin)) {
      const url = href.startsWith('/') ? href : new URL(href).pathname;
      // Ne pas intercepter si c'est un lien externe ou un téléchargement
      if (link.hasAttribute('target') || link.hasAttribute('download')) return;
      e.preventDefault();
      navigateTo(url);
    }
  });

  // Gérer le bouton retour du navigateur
  window.addEventListener('popstate', (e) => {
    if (e.state?.path) {
      navigateTo(e.state.path);
    } else {
      window.location.reload();
    }
  });

  // Initialiser l'état history
  if (!history.state?.path) {
    history.replaceState({ path: getCurrentPath() }, '');
  }
}

// Démarrer
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupNavigationInterception);
} else {
  setupNavigationInterception();
}
