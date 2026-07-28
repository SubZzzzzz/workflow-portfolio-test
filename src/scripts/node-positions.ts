// Node Positions — Positions des nodes pour dessiner les liens SVG

export interface NodePosition {
  x: number; // en % de la largeur de l'écran
  y: number; // en % de la hauteur de l'écran
}

export interface Connection {
  from: string;
  to: string;
}

// Positions des centres des nodes (layout zigzag)
export const NODE_POSITIONS: Record<string, NodePosition> = {
  '/': { x: 50, y: 30 },           // Start : centre-haut
  '/services/': { x: 25, y: 50 },  // Services : gauche-centre
  '/projects/': { x: 75, y: 50 },  // Projects : droite-centre
  '/contact/': { x: 50, y: 70 },   // Contact : centre-bas
};

// Connexions entre les nodes
export const CONNECTIONS: Connection[] = [
  { from: '/', to: '/services/' },
  { from: '/services/', to: '/projects/' },
  { from: '/projects/', to: '/contact/' },
];

// Obtenir les connexions adjacentes à une page
export function getAdjacentConnections(pagePath: string): Connection[] {
  return CONNECTIONS.filter(
    (conn) => conn.from === pagePath || conn.to === pagePath
  );
}

// Obtenir la page suivante/précédente
export function getAdjacentPages(pagePath: string): { prev: string | null; next: string | null } {
  const order = ['/', '/services/', '/projects/', '/contact/'];
  const index = order.indexOf(pagePath);
  if (index === -1) return { prev: null, next: null };
  return {
    prev: index > 0 ? order[index - 1] : null,
    next: index < order.length - 1 ? order[index + 1] : null,
  };
}

// Obtenir la direction de transition entre deux pages
export type SlideDirection = 'up' | 'down' | 'left' | 'right';

export function getSlideDirection(fromPath: string, toPath: string): SlideDirection {
  const from = NODE_POSITIONS[fromPath];
  const to = NODE_POSITIONS[toPath];
  if (!from || !to) return 'left';

  const dx = to.x - from.x;
  const dy = to.y - from.y;

  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'left' : 'right';
  } else {
    return dy > 0 ? 'up' : 'down';
  }
}
