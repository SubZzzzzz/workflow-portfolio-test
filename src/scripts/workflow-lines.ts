import { NODE_POSITIONS, getAdjacentConnections } from './node-positions';

const COLOR_BASE = '#1E3050';
const COLOR_DONE = '#22C55E';

let svgElement: SVGSVGElement | null = null;
let portPositions: Map<string, { x: number; y: number }> = new Map();

function getPageOrder(): string[] {
  return ['/', '/services/', '/projects/', '/contact/'];
}

function getCurrentPageIndex(): number {
  return getPageOrder().indexOf(window.location.pathname);
}

function measurePorts(): void {
  portPositions.clear();
  const ports = document.querySelectorAll('a[data-nav]');
  ports.forEach((port) => {
    const href = port.getAttribute('href');
    if (!href) return;
    const rect = port.getBoundingClientRect();
    portPositions.set(href, {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
  });
}

function drawLines(): void {
  if (!svgElement) return;

  const w = window.innerWidth;
  const h = window.innerHeight;
  svgElement.setAttribute('viewBox', `0 0 ${w} ${h}`);
  svgElement.innerHTML = '';

  const currentIdx = getCurrentPageIndex();
  const currentPath = getPageOrder()[currentIdx];
  const adjacentConns = getAdjacentConnections(currentPath);

  adjacentConns.forEach((conn) => {
    const from = NODE_POSITIONS[conn.from];
    const to = NODE_POSITIONS[conn.to];
    if (!from || !to) return;

    const order = getPageOrder();
    const isDone = order.indexOf(conn.from) < currentIdx;

    const x1 = (from.x / 100) * w;
    const y1 = (from.y / 100) * h;
    const x2 = (to.x / 100) * w;
    const y2 = (to.y / 100) * h;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', `${x1}`);
    line.setAttribute('y1', `${y1}`);
    line.setAttribute('x2', `${x2}`);
    line.setAttribute('y2', `${y2}`);
    line.setAttribute('stroke', isDone ? COLOR_DONE : COLOR_BASE);
    line.setAttribute('stroke-width', '2');
    line.setAttribute('opacity', isDone ? '0.5' : '0.25');
    line.setAttribute('stroke-dasharray', '6 4');
    svgElement!.appendChild(line);
  });
}

export function initWorkflowLines(): void {
  if (svgElement) return;
  svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgElement.id = 'workflow-lines';
  svgElement.style.cssText = 'position:fixed;inset:0;z-index:1;pointer-events:none;width:100vw;height:100vh;';
  document.body.insertBefore(svgElement, document.body.firstChild);

  measurePorts();
  drawLines();
  window.addEventListener('resize', () => {
    measurePorts();
    drawLines();
  });
}

export function getPortPosition(href: string): { x: number; y: number } | null {
  return portPositions.get(href) || null;
}

export function getNodePositionPx(path: string): { x: number; y: number } | null {
  const pos = NODE_POSITIONS[path];
  if (!pos) return null;
  return {
    x: (pos.x / 100) * window.innerWidth,
    y: (pos.y / 100) * window.innerHeight,
  };
}

export function refreshLines(): void {
  measurePorts();
  drawLines();
}
