# Plan : Connecteurs comme Navigation + Animation Synchronisée

## Vue d'ensemble

Remplacer les boutons flèches par les connecteurs (NodePort) comme éléments de navigation, ajouter les liens SVG entre les nodes, et synchroniser l'animation du signal avec le glissement des pages.

---

## Architecture Technique

### 1. Pré-chargement des pages (PageCache)

**Objectif :** Avoir les pages adjacentes (précédente + suivante) déjà chargées pour des transitions instantanées.

**Fichier :** `src/scripts/page-cache.ts`

**Fonctionnement :**
- Quand une page se charge, pré-charger automatiquement :
  - La page précédente (si elle existe)
  - La page suivante (si elle existe)
- Stocker le HTML complet dans un Map
- Fournir une API `getPage(url)` qui retourne le HTML depuis le cache ou fetch si absent
- Invalider le cache après un certain temps (ex: 5 minutes)

```typescript
const pageCache = new Map<string, { html: string; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function preloadPage(url: string) {
  if (pageCache.has(url)) {
    const cached = pageCache.get(url)!;
    if (Date.now() - cached.timestamp < CACHE_DURATION) return;
  }
  const response = await fetch(url);
  const html = await response.text();
  pageCache.set(url, { html, timestamp: Date.now() });
}

function getPage(url: string): string | null {
  const cached = pageCache.get(url);
  if (!cached) return null;
  if (Date.now() - cached.timestamp > CACHE_DURATION) return null;
  return cached.html;
}
```

### 2. Positions des Nodes (NodePositions)

**Objectif :** Connaître la position de chaque node pour dessiner les liens SVG.

**Approche :** Positions fixes prédéfinies (comme la minimap) pour simplifier.

**Fichier :** `src/scripts/node-positions.ts`

```typescript
// Positions des centres des nodes (en % de l'écran)
export const NODE_POSITIONS = {
  '/': { x: 50, y: 25 },           // Start : centre-haut
  '/services/': { x: 25, y: 50 },  // Services : gauche-centre
  '/projects/': { x: 75, y: 50 },  // Projects : droite-centre
  '/contact/': { x: 50, y: 75 },   // Contact : centre-bas
};

// Connexions entre les nodes
export const CONNECTIONS = [
  { from: '/', to: '/services/' },
  { from: '/services/', to: '/projects/' },
  { from: '/projects/', to: '/contact/' },
];
```

**Alternative (plus complexe mais plus flexible) :** Mesurer dynamiquement la position des NodePort quand la page se charge et les stocker dans un objet global. Mais plus complexe à implémenter.

### 3. Overlay SVG Global (WorkflowConnections)

**Objectif :** Dessiner les liens entre les nodes et permettre l'animation du signal.

**Fichier :** `src/components/WorkflowConnections.astro`

**Fonctionnement :**
- Composant fixe en position absolute, couvre tout l'écran
- Dessine les liens SVG entre les nodes selon NODE_POSITIONS
- Chaque lien a deux couches :
  - Couche de base (gris, pointillés)
  - Couche de signal (vert, animable via stroke-dashoffset)
- Expose une API pour animer un lien spécifique

**Structure SVG :**
```svg
<svg viewBox="0 0 100 100" preserveAspectRatio="none">
  <!-- Lien Start → Services -->
  <path d="M 50 25 Q 37.5 37.5 25 50" stroke="#1E3050" stroke-width="0.3" />
  <path d="M 50 25 Q 37.5 37.5 25 50" stroke="#22C55E" stroke-width="0.5" 
        stroke-dasharray="100" stroke-dashoffset="100" class="signal-path" />
  
  <!-- Lien Services → Projects -->
  <path d="M 25 50 L 75 50" stroke="#1E3050" stroke-width="0.3" />
  <path d="M 25 50 L 75 50" stroke="#22C55E" stroke-width="0.5" 
        stroke-dasharray="100" stroke-dashoffset="100" class="signal-path" />
  
  <!-- Lien Projects → Contact -->
  <path d="M 75 50 Q 62.5 62.5 50 75" stroke="#1E3050" stroke-width="0.3" />
  <path d="M 75 50 Q 62.5 62.5 50 75" stroke="#22C55E" stroke-width="0.5" 
        stroke-dasharray="100" stroke-dashoffset="100" class="signal-path" />
</svg>
```

### 4. NodePort Amélioré

**Objectif :** Rendre les NodePort cliquables et déclencher les transitions.

**Modifications :** `src/components/NodePort.astro`

**Nouvelles props :**
```typescript
interface Props {
  direction: 'top' | 'bottom' | 'left' | 'right';
  status?: 'active' | 'done' | 'idle';
  size?: 'md' | 'lg';
  href?: string; // URL de la page cible
  dataNav?: 'prev' | 'next'; // Pour la navigation clavier
}
```

**Structure :**
```astro
<a href={href} data-nav={dataNav} class="...">
  <div class="...">
    <div class="..."></div>
  </div>
</a>
```

### 5. Transition Synchronisée

**Objectif :** Le signal se propage ET la page glisse en même temps (même timeline).

**Fichier :** `src/scripts/transition-engine.ts` (refonte)

**Algorithme :**
```typescript
async function navigateTo(url: string) {
  // 1. Récupérer la page depuis le cache
  let html = getPage(url);
  if (!html) {
    // Fallback : fetch si pas en cache
    const response = await fetch(url);
    html = await response.text();
  }

  // 2. Déterminer la direction de la transition
  const currentPath = getCurrentPath();
  const direction = getTransitionDirection(currentPath, url);

  // 3. Créer l'overlay SVG avec le lien à animer
  const overlay = createConnectionOverlay(currentPath, url);
  document.body.appendChild(overlay);

  // 4. Préparer les deux pages (actuelle et suivante)
  const currentMain = document.querySelector('main');
  const nextMain = createNextMain(html);
  
  // Positionner la page suivante hors écran
  positionPage(nextMain, direction, 1);
  document.body.appendChild(nextMain);

  // 5. Animer : signal + glissement synchronisés
  const startTime = performance.now();
  const duration = 1200; // ms

  await new Promise<void>((resolve) => {
    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeInOutCubic(progress);

      // Animer le signal le long du lien
      updateSignal(overlay, easedProgress);

      // Animer le glissement des pages
      positionPage(currentMain, direction, easedProgress);
      positionPage(nextMain, direction, 1 - easedProgress);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(animate);
  });

  // 6. Finaliser
  currentMain.remove();
  overlay.remove();
  nextMain.style.cssText = 'position: relative;';
  history.pushState({ path: url }, '', url);

  // 7. Pré-charger les pages adjacentes de la nouvelle page
  preloadAdjacentPages(url);
}
```

### 6. Mise à jour des Pages

**Modifications nécessaires :**

**index.astro :**
- Ajouter `href="/services/"` au NodePort bottom
- Retirer le lien CTA "Découvrir mes services" (remplacé par le connecteur)

**services.astro :**
- Ajouter `href="/"` au NodePort top
- Ajouter `href="/projects/"` au NodePort right
- Retirer les liens de navigation "Retour" et "Voir les projets"

**projects.astro :**
- Ajouter `href="/services/"` au NodePort left
- Ajouter `href="/contact/"` au NodePort bottom
- Retirer les liens de navigation

**contact.astro :**
- Ajouter `href="/projects/"` au NodePort top
- Retirer le lien de navigation "Projets"

### 7. WorkflowLayout Simplifié

**Modifications :** `src/layouts/WorkflowLayout.astro`

- Retirer l'import et l'usage de NavigationArrows
- Ajouter WorkflowConnections
- Retirer le script de navigation par flèches latérales
- Garder la navigation clavier (mais elle déclenche les liens data-nav)

---

## Ordre d'Implémentation

### Étape 1 : Créer le système de pré-chargement
1. Créer `src/scripts/page-cache.ts`
2. Implémenter les fonctions de pré-chargement
3. Tester le cache

### Étape 2 : Définir les positions des nodes
1. Créer `src/scripts/node-positions.ts`
2. Définir NODE_POSITIONS et CONNECTIONS
3. Tester les positions

### Étape 3 : Créer l'overlay SVG
1. Créer `src/components/WorkflowConnections.astro`
2. Dessiner les liens entre les nodes
3. Tester l'affichage

### Étape 4 : Améliorer NodePort
1. Ajouter les props `href` et `dataNav`
2. Transformer en lien cliquable
3. Tester la navigation

### Étape 5 : Refondre transition-engine.ts
1. Implémenter l'animation synchronisée
2. Utiliser le cache de pages
3. Animer signal + glissement en même temps
4. Tester les transitions

### Étape 6 : Mettre à jour les pages
1. Ajouter les `href` aux NodePort
2. Retirer les liens de navigation textuels
3. Tester chaque page

### Étape 7 : Mettre à jour WorkflowLayout
1. Retirer NavigationArrows
2. Ajouter WorkflowConnections
3. Tester le layout global

### Étape 8 : Tests et polish
1. Tester la navigation complète
2. Tester le pré-chargement
3. Tester l'animation synchronisée
4. Ajuster les timings et courbes d'animation

---

## Détails Techniques Importants

### Synchronisation Signal + Glissement

**Problème :** Le signal doit se propager le long du lien SVG pendant que la page glisse.

**Solution :**
- Utiliser la même variable `progress` (0 à 1) pour les deux animations
- Le signal utilise `stroke-dashoffset` animé de `length` à `0`
- La page utilise `transform: translateX/Y()` animé de `0%` à `100%`
- Les deux animations sont dans le même `requestAnimationFrame`

### Calcul de la Longueur des Liens

**Problème :** Pour animer `stroke-dashoffset`, il faut connaître la longueur du path SVG.

**Solution :**
```typescript
const path = document.querySelector('.signal-path');
const length = path.getTotalLength();
path.setAttribute('stroke-dasharray', `${length}`);
path.setAttribute('stroke-dashoffset', `${length}`);
```

### Pré-chargement Intelligent

**Quand pré-charger ?**
- Au chargement initial de la page
- Après chaque transition (pré-charger les pages adjacentes de la nouvelle page)

**Quoi pré-charger ?**
- Page précédente (si existe)
- Page suivante (si existe)

**Gestion du cache :**
- Cache avec timestamp
- Invalidation après 5 minutes
- Fallback sur fetch si pas en cache

---

## Fichiers à Créer/Modifier

### À créer :
1. `src/scripts/page-cache.ts`
2. `src/scripts/node-positions.ts`
3. `src/components/WorkflowConnections.astro`

### À modifier :
1. `src/components/NodePort.astro`
2. `src/scripts/transition-engine.ts`
3. `src/pages/index.astro`
4. `src/pages/services.astro`
5. `src/pages/projects.astro`
6. `src/pages/contact.astro`
7. `src/layouts/WorkflowLayout.astro`

### À supprimer :
1. `src/components/NavigationArrows.astro`

---

## Points d'Attention

1. **Performance :** Le pré-chargement peut consommer de la bande passante. Limiter à 2 pages (précédente + suivante).

2. **Accessibilité :** Les NodePort doivent être accessibles au clavier (tabindex, focus visible).

3. **Responsive :** Les positions des nodes sont en % pour s'adapter à toutes les tailles d'écran.

4. **Fallback :** Si le cache échoue, fallback sur fetch classique.

5. **Animation fluide :** Utiliser `requestAnimationFrame` et `transform` (pas `top/left`) pour des animations à 60fps.

6. **Timing :** L'animation complète doit durer environ 1.2s pour être fluide sans être lente.

---

## Questions en Suspens

1. **Forme des liens SVG :** Lignes droites ou courbes de Bézier ?
   - Suggestion : Courbes de Bézier pour un look plus organique (comme dans n8n)

2. **Couleur des liens :** Gris par défaut, vert quand validé ?
   - Suggestion : Gris (#1E3050) par défaut, vert (#22C55E) pour le signal

3. **Épaisseur des liens :** Assez visibles mais pas dominants ?
   - Suggestion : 2px pour la base, 3px pour le signal

4. **Faut-il afficher tous les liens ou seulement les liens adjacents ?**
   - Suggestion : Tous les liens pour voir le workflow complet

---

## Prochaines Étapes

1. Valider ce plan
2. Implémenter étape par étape
3. Tester après chaque étape
4. Ajuster les détails visuels (couleurs, épaisseurs, courbes)
