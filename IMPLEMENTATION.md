# Plan d'Implémentation — Portfolio Workflow Navigable

## Vision du Projet

Le portfolio est un **workflow interactif navigable**. Chaque page principale est un **node** dans un système connecté. La navigation se fait latéralement (← →) entre les nodes principaux, et chaque node contient des **sous-nodes** accessibles par clic. Le site lui-même EST le workflow, pas juste une métaphore visuelle.

---

## Architecture Globale

### Structure des Pages (Nodes Principaux)

```
Node 1: HERO / START
├── Intro personnelle
├── Proposition de valeur
└── CTA de navigation

Node 2: SERVICES
├── Workflows n8n
├── Agents IA
├── Intégrations
── Sur mesure

Node 3: PROJECTS
├── Projet 1 (avec détails)
├── Projet 2 (avec détails)
└── Projet 3 (avec détails)

Node 4: CONTACT
├── Formulaire
├── Informations de contact
└── Réseaux sociaux
```

### Navigation

- **Flèches latérales fixes** (← à gauche, → à droite) pour naviguer entre les nodes principaux
- **Indicateur de progression** en haut ou en bas (ex: "Node 2/4 - Services")
- **Navigation clavier** (touches gauche/droite)
- **Swipe mobile** pour la navigation tactile

### Sous-Nodes

- Accessibles par clic sur des éléments dans chaque page
- S'affichent en **modal** ou **expansion inline**
- Animation d'ouverture fluide
- Fermeture par clic extérieur, touche Escape, ou bouton X

---

## Design System

### Palette de Couleurs

**Principale :**
- Fond : à définir selon les images de référence (probablement un ton sombre mais pas noir pur)
- Accent primaire : à définir (cyan, vert, ou autre couleur vive)
- Accent secondaire : à définir
- Texte principal : clair sur fond sombre
- Texte secondaire : gris/atténué

**États :**
- Node actif : couleur accent + glow/bordure
- Node inactif : neutre/atténué
- Hover : léger éclaircissement ou animation
- Sous-node ouvert : overlay semi-transparent

### Typographie

- **Titres** : police avec caractère (serif display ou sans-serif géométrique)
- **Corps** : sans-serif lisible (Inter, system-ui)
- **Labels/Mono** : pour les numéros de nodes, états (optionnel, à tester)

### Éléments Visuels

- **Grille de fond** : subtile, évoquant un canvas de workflow (lignes fines, dots aux intersections)
- **Connexions** : lignes SVG entre les nodes (animées)
- **Ports** : petits cercles sur les côtés des nodes (inputs/outputs visuels)
- **Indicateurs d'état** : dots colorés (actif/inactif/ouvert)
- **Particules** : éléments flottants subtils en arrière-plan (optionnel)

---

## Composants à Créer

### Composants de Navigation

1. **NavigationArrows**
   - Flèches fixes à gauche et droite de l'écran
   - Position : vertical center, à 20-40px du bord
   - Style : icônes SVG, taille 48px, opacity 0.6 → 1 au hover
   - Animation : légère translation au hover
   - Désactivé sur le premier/dernier node

2. **WorkflowMinimap** (remplace ProgressIndicator)
   - Visualisation horizontale des 4 nodes avec connexions
   - 4 dots connectés par des lignes
   - Node actif : couleur accent (ambre #E8B86A) + glow + scale 125%
   - Nodes inactifs : opacité 40%, hover 70%
   - Lignes entre nodes : accent/40% si node précédent actif, border sinon
   - Clic sur un node : navigation directe vers la page
   - Labels sous chaque dot (Start, Services, Projects, Contact)
   - Position : fixed top-6, centré
   - Style : pill rounded-full avec border + backdrop-blur
   - Responsive : w-8/w-12 pour les connecteurs selon breakpoint

3. **PageTransition**
   - Animation de slide horizontal entre les pages
   - Direction : gauche→droite ou droite→gauche selon le sens de navigation
   - Durée : 400-600ms
   - Easing : ease-in-out ou custom cubic-bezier
   - Overlay : fondu léger pendant la transition

### Composants de Contenu

4. **NodeCard**
   - Container principal pour chaque sous-node
   - Bordure avec couleur d'état (actif/inactif)
   - Ports visuels sur les côtés (dots)
   - Hover : léger scale ou glow
   - Clic : ouvre le détail du sous-node

5. **SubNodeModal**
   - Modal pour afficher les détails d'un sous-node
   - Position : centré, 80% max-width, max-height 80vh
   - Overlay : fond semi-transparent avec blur
   - Animation : fade-in + slide-up
   - Fermeture : clic extérieur, Escape, bouton X
   - Contenu scrollable si nécessaire

6. **SubNodeInline**
   - Version alternative : expansion inline
   - S'ouvre sous le node cliqué
   - Pousse le contenu vers le bas
   - Animation : height auto avec smooth transition

### Composants de Fond

7. **Fond organique** (remplace WorkflowGrid)
   - Dégradés radiaux multiples pour créer de la profondeur
   - Centre légèrement éclairci : `radial-gradient(ellipse 80% 60% at 50% 40%, rgba(15, 29, 50, 0.8))`
   - Second gradient en bas-gauche : `radial-gradient(ellipse 60% 50% at 20% 80%, rgba(30, 48, 80, 0.4))`
   - Troisième gradient en haut-droite : `radial-gradient(ellipse 50% 40% at 80% 20%, rgba(30, 48, 80, 0.3))`
   - Courbes de workflow SVG subtiles en background (opacity 0.06)
   - 3 courbes de Bézier : une bleu, une ambre, une bleu clair
   - Évoque des connexions sans être une grille répétitive

8. **ConnectionLines**
   - Lignes SVG entre les nodes (si affichage multi-node)
   - Animation de pulse ou de flux
   - Style : gradient, dashed, ou solide fin

9. **FloatingParticles** (optionnel)
   - Particules flottantes en arrière-plan
   - Mouvement aléatoire lent
   - Taille : 2-4px
   - Opacité : 20-40%
   - Performance : utiliser Canvas si beaucoup de particules

---

## Animations & Interactions

### Animation Workflow entre Pages (NOUVEAU — remplace les transitions simples)

**Principe :** Au lieu d'une transition de page classique, la navigation entre nodes déclenche une animation de "signal" qui voyage le long du lien de connexion, comme une impulsion électrique dans un workflow.

**Séquence d'animation (clic sur flèche →) :**

1. **Activation du connecteur de départ** (0ms)
   - Le connecteur droit du node courant (orange `#D97706`) change en vert (`#10B981` ou `#22C55E`)
   - Animation : transition de couleur, durée 200ms
   - Le connecteur reçoit un léger glow vert

2. **Propagation du signal le long du lien** (200ms → 1200ms)
   - Le lien SVG (actuellement gris `#4A5568` en pointillés) s'allume progressivement en vert
   - Technique : utiliser `stroke-dasharray` + `stroke-dashoffset` animé, ou un gradient qui se déplace
   - Le vert "avance" le long de la courbe de Bézier, suivant le path
   - Durée totale de la propagation : ~1000ms
   - Le reste du lien reste gris jusqu'à ce que le signal l'atteigne

3. **Activation du connecteur d'arrivée** (1200ms)
   - Quand le signal vert atteint le connecteur gauche du node suivant, celui-ci s'allume en vert
   - Transition de couleur : gris/transparent → vert, durée 200ms
   - Glow vert sur le connecteur d'arrivée

4. **Reset du connecteur de départ** (1400ms)
   - Le connecteur droit du node courant repasse en orange (`#D97706`)
   - Le glow vert disparaît
   - Transition de couleur, durée 200ms

5. **Transition de page** (1400ms → 1900ms)
   - Une fois l'animation workflow terminée, la transition de page classique se déclenche
   - Slide horizontal OU fade + scale (à décider)
   - Durée : 500ms

**Séquence inverse (clic sur flèche ←) :**
- Mêmes étapes mais dans l'autre sens
- Le signal part du connecteur gauche, voyage vers le connecteur droit du node précédent
- Les couleurs et timings sont identiques

**Implementation technique :**
- Utiliser GSAP + ScrollTrigger ou une timeline custom
- Le path SVG du lien doit être animable via `stroke-dashoffset`
- Chaque lien a deux "couches" : la couche grise (base) et la couche verte (signal)
- La couche verte est masquée par défaut et révélée progressivement
- Les connecteurs ont des classes CSS pour les états : `.connector-idle` (orange), `.connector-active` (vert), `.connector-traveling` (vert avec glow)

**Fallback :**
- Si `prefers-reduced-motion` : skip l'animation workflow, transition de page directe
- Si JS désactivé : navigation classique entre pages

### Apparition des Sous-Nodes

**Stagger Animation :**
- Chaque sous-node apparaît avec un délai progressif
- Délai : 100ms entre chaque
- Animation : fade-in + translateY(20px → 0)
- Durée : 400ms par élément

**Hover sur NodeCard :**
- Scale : 1 → 1.02
- Border-color : accent
- Glow : box-shadow avec couleur accent
- Durée : 200ms

### Ouverture de Modal

**Entrée :**
- Opacity : 0 → 1
- Transform : translateY(30px) → translateY(0)
- Overlay : opacity 0 → 0.5
- Durée : 300ms
- Easing : ease-out

**Sortie :**
- Inverse de l'entrée
- Durée : 200ms (plus rapide)

---

## Responsive Design

### Desktop (>1024px)

- Flèches de navigation : visibles, 48px, position fixe
- Layout : grid ou flex avec espacement généreux
- Sous-nodes : 3-4 colonnes selon le contenu
- Modal : 80% width, centré

### Tablet (768px - 1024px)

- Flèches de navigation : visibles mais plus petites (40px)
- Layout : 2 colonnes pour les sous-nodes
- Modal : 90% width

### Mobile (<768px)

- Flèches de navigation : cachées, remplacées par **swipe**
- Indicateur de progression : plus visible (dots ou "X/Y")
- Layout : 1 colonne pour les sous-nodes
- Modal : 95% width, presque plein écran
- Swipe : détection touch, threshold 50px, direction horizontale

---

## Accessibilité

### Navigation Clavier

- **Flèches gauche/droite** : navigation entre nodes principaux
- **Tab** : navigation entre les sous-nodes cliquables
- **Enter/Space** : ouvrir un sous-node
- **Escape** : fermer un modal
- **Focus visible** : outline clair sur les éléments focusables

### Lecteurs d'Écran

- **ARIA labels** sur les flèches de navigation ("Aller au node précédent", "Aller au node suivant")
- **ARIA live region** pour annoncer le changement de node ("Node 2 sur 4 : Services")
- **Rôle dialog** sur les modals
- **Focus trap** dans les modals (ne pas laisser le focus sortir)

### Contraste & Visibilité

- Texte : contraste minimum 4.5:1 sur fond
- Éléments interactifs : contraste 3:1
- Indicateurs de focus : visibles même sans couleur (outline, bordure)

---

## Performance

### Optimisations

- **Lazy loading** des images dans les sous-nodes
- **Code splitting** par page (Astro le fait nativement)
- **Animations GPU** : utiliser transform et opacity (pas width/height/margin)
- **Will-change** sur les éléments animés (avec parcimonie)
- **Debounce** sur les events de scroll/resize

### Budget

- First Contentful Paint : < 1.5s
- Largest Contentful Paint : < 2.5s
- Cumulative Layout Shift : < 0.1
- Total Blocking Time : < 200ms
- Animations : 60fps constant

---

## Ordre d'Implémentation

### Phase 1 : Structure de Base

**Objectif :** Avoir 4 pages navigables avec flèches

1. Créer 4 pages Astro (index.astro, services.astro, projects.astro, contact.astro)
2. Créer le composant NavigationArrows
3. Créer le composant WorkflowMinimap
4. Implémenter la navigation entre pages (JS pour changer de page sans reload)
5. Ajouter la navigation clavier (flèches gauche/droite)
6. Tester sur desktop

**Livrable :** 4 pages vides navigables avec flèches et indicateur

---

### Phase 2 : Contenu des Nodes

**Objectif :** Remplir chaque page avec du contenu structuré

1. Créer le layout de base pour chaque page (Hero, Services, Projects, Contact)
2. Créer le composant NodeCard
3. Structurer le contenu de chaque page en sous-nodes
4. Ajouter le contenu texte/images pour chaque sous-node
5. Tester la mise en page

**Livrable :** 4 pages avec contenu visible, sous-nodes affichés

---

### Phase 3 : Interactions Sous-Nodes

**Objectif :** Rendre les sous-nodes cliquables et ouvrables

1. Créer le composant SubNodeModal
2. Implémenter l'ouverture au clic sur un NodeCard
3. Implémenter la fermeture (clic extérieur, Escape, bouton X)
4. Ajouter l'animation d'ouverture/fermeture
5. Tester sur desktop

**Livrable :** Sous-nodes ouvrables en modal avec animations

---

### Phase 4 : Animations Workflow entre Pages (NOUVEAU)

**Objectif :** Implémenter l'animation de signal qui voyage le long des liens lors de la navigation

1. **Préparation des liens SVG**
   - Chaque lien a deux paths superposés : base (gris) + signal (vert)
   - Le path signal est masqué via `stroke-dashoffset` = longueur totale du path
   - Calculer la longueur de chaque path via `getTotalLength()` en JS

2. **Animation du connecteur de départ**
   - Au clic sur flèche, ajouter la classe `.connector-traveling` au connecteur source
   - Transition CSS : couleur orange → vert + glow vert
   - Durée : 200ms

3. **Propagation du signal le long du lien**
   - Animer `stroke-dashoffset` du path signal de la longueur totale → 0
   - Durée : ~1000ms (ajustable selon la longueur du lien)
   - Easing : linear ou ease-in-out pour un mouvement fluide
   - Utiliser GSAP Timeline ou CSS `@keyframes`

4. **Activation du connecteur d'arrivée**
   - Callback à la fin de l'animation du lien
   - Ajouter la classe `.connector-active` au connecteur cible
   - Transition : apparition en vert + glow
   - Durée : 200ms

5. **Reset et transition de page**
   - Après 200ms, le connecteur de départ repasse en orange
   - Déclencher la transition de page (slide ou fade)
   - Durée : 500ms

6. **Gestion de la navigation inverse (←)**
   - Mêmes animations mais direction inversée
   - Le signal part du connecteur gauche vers le connecteur droit du node précédent

7. **Fallback et accessibilité**
   - Respecter `prefers-reduced-motion` : skip l'animation, transition directe
   - Navigation clavier fonctionnelle même sans animation

**Livrable :** Animation workflow complète, fluide à 60fps, avec fallback accessible

---

### Phase 5 : Responsive Mobile

**Objectif :** Adapter le site pour mobile

1. Implémenter la détection de swipe (touch events)
2. Cacher les flèches sur mobile
3. Adapter le layout (1 colonne)
4. Adapter les modals (plein écran)
5. Tester sur différents devices

**Livrable :** Site responsive, navigation swipe sur mobile

---

### Phase 6 : Accessibilité & Polish

**Objectif :** Rendre le site accessible et finaliser les détails

1. Ajouter les ARIA labels et rôles
2. Implémenter le focus trap dans les modals
3. Tester la navigation clavier complète
4. Tester avec un lecteur d'écran
5. Vérifier les contrastes
6. Ajouter les micro-interactions finales
7. Optimiser les performances

**Livrable :** Site accessible, performant, prêt pour la production

---

### Phase 7 : Contenu Réel & SEO

**Objectif :** Remplacer le contenu de test par le vrai contenu

1. Écrire les textes finaux pour chaque sous-node
2. Préparer les images/screenshots des projets
3. Créer le formulaire de contact fonctionnel
4. Ajouter les métadonnées SEO (title, description, OG tags)
5. Créer le sitemap
6. Tester le partage sur réseaux sociaux

**Livrable :** Site complet avec vrai contenu, prêt à déployer

---

## Dépendances Techniques

### Packages npm

- `astro` (déjà installé)
- `@astrojs/tailwind` (déjà installé)
- `tailwindcss` (déjà installé)
- `typescript` (déjà installé)
- `gsap` (déjà installé, pour les animations)
- `lenis` (déjà installé, pour le smooth scroll)

### Assets

- Images des projets (à fournir)
- Icônes SVG (à créer ou utiliser une lib comme Lucide/Feather)
- Fonts (Google Fonts ou self-hosted)

---

## Points de Décision à Valider

### Décisions déjà prises

1. **Couleur de fond principale** : bleu nuit profond (`#0A1628`)
2. **Couleur d'accent principale** : ambre doré (`#E8B86A`)
3. **Couleur des connecteurs** : orange (`#D97706`)
4. **Couleur des liens** : gris éteint (`#4A5568`)
5. **Couleur du signal d'animation** : vert (`#10B981` ou `#22C55E`)
6. **Typographie titres** : Instrument Serif (serif display)
7. **Typographie corps** : Inter (sans-serif)
8. **Typographie labels** : JetBrains Mono (mono)
9. **Style de chaque page** : node géant central avec connecteurs gauche/droite
10. **Fond** : dashboard d'automation (grille subtile + nodes fantômes)
11. **Minimap** : nodes style n8n avec connexions Bézier

### Reste à décider

1. **Style de transition de page** : slide horizontal ou fade+scale ? (après l'animation workflow)
2. **Sous-nodes** : modal ou expansion inline ?
3. **Navigation mobile** : swipe uniquement ou aussi boutons tactiles ?
4. **Sons** : ajouter des sons sur les interactions ? (avec toggle)

### À décider pendant l'implémentation

1. Nombre exact de projets à afficher
2. Contenu textuel de chaque sous-node
3. Ordre des nodes (est-ce que Contact doit être le dernier ?)
4. Niveau de détail dans les sous-nodes (tout afficher ou juste l'essentiel ?)

---

## Risques & Mitigations

### Risque : Performance des animations

**Mitigation :**
- Utiliser transform et opacity uniquement
- Limiter le nombre de particules
- Tester sur des devices bas de gamme
- Fallback : désactiver les animations si prefers-reduced-motion

### Risque : UX mobile complexe

**Mitigation :**
- Simplifier au maximum sur mobile
- Swipe intuitif (comme Instagram/Tinder)
- Boutons de secours si swipe ne fonctionne pas
- Tester sur iOS et Android

### Risque : SEO impacté

**Mitigation :**
- Avoir un sitemap XML
- Metadata complète sur chaque page
- Contenu textuel riche même si navigation non-standard
- Version alternative accessible (optionnel)

### Risque : Complexité technique

**Mitigation :**
- Implémenter phase par phase
- Tester chaque phase avant de passer à la suivante
- Garder le code simple, éviter la sur-ingénierie
- Documenter les décisions techniques

---

## Checklist Finale

- [ ] Phase 1 : Structure de base terminée
- [ ] Phase 2 : Contenu des nodes rempli
- [ ] Phase 3 : Interactions sous-nodes fonctionnelles
- [ ] Phase 4 : Transitions et animations en place
- [ ] Phase 5 : Responsive mobile testé
- [ ] Phase 6 : Accessibilité validée
- [ ] Phase 7 : Contenu réel intégré
- [ ] Tests cross-browser (Chrome, Firefox, Safari, Edge)
- [ ] Tests sur mobile (iOS, Android)
- [ ] Performance : Lighthouse > 90 sur tous les critères
- [ ] SEO : metadata, sitemap, OG tags
- [ ] Déploiement Vercel configuré
- [ ] Domaine custom configuré (optionnel)

---

## Ressources

### Images de référence

Dossier : `/home/ubuntu/portfoliotest1/ideaimages/`

- `idee1.jpg` : Site HYKROX (dark, cyan, agency style)
- `idee2.jpg` : Site SmartStruct (flow connecté, très pertinent)
- `idee3.jpeg` : Fusée particules (trop 3D, pas adapté)
- `idee4.jpeg` : UNBOT (glassmorphism, intéressant pour texture)

### Inspiration supplémentaire

- n8n.io : Canvas de workflow
- make.com : Nodes connectés
- linear.app : Style dashboard sombre
- SmartStruct : Section "How it Works" avec flow numéroté

---

## Notes

**Date de création :** 27 juillet 2026

**Concept validé par :** Achille Robbe

**État actuel :**
- ✅ Phase 1 : Structure de base (pages, navigation arrows, minimap)
- 🔄 Phase 2 : Contenu des nodes (pages 1 et 2 faites, 3 et 4 à faire)
- ⏳ Phase 3 : Interactions sous-nodes (à faire)
- ⏳ Phase 4 : Animations workflow entre pages (à faire)
- ⏳ Phase 5 : Responsive mobile (à faire)
- ⏳ Phase 6 : Accessibilité & Polish (à faire)
- ⏳ Phase 7 : Contenu réel & SEO (à faire)

**Prochaine étape :** Terminer les pages 3 (Projects) et 4 (Contact) en node géant avec connecteurs, puis implémenter les animations workflow (Phase 4).
