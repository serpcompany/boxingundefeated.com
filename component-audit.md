# Component Usage Audit

## Pages and Their Component Usage

### 1. `/pages/index.vue` (Homepage)
**Components Used:**
- NuxtLink (built-in)
- UCard (NuxtUI)
- UIcon (NuxtUI)
- UBadge (NuxtUI)
- UButton (NuxtUI)

**Custom Components:** None - all UI is inline

---

### 2. `/pages/boxers/index.vue` (Boxers Directory)
**Components Used:**
- BreadCrumbs (custom)
- PageHero (custom)
- UInput (NuxtUI)
- USelectMenu (NuxtUI)
- UButton (NuxtUI)
- NuxtLink (built-in)
- UCard (NuxtUI)
- UIcon (NuxtUI)
- UBadge (NuxtUI)
- UPagination (NuxtUI)

**Custom Components:**
- BreadCrumbs
- PageHero

---

### 3. `/pages/boxers/[slug].vue` (Individual Boxer Page)
**Components Used:**
- ErrorState (custom)
- LoadingState (custom)
- BreadCrumbs (custom)
- BoxerHero (custom)
- BoxerPageTOCHorizontal (custom)
- StatsGrid (custom)
- FighterInfoCard (custom)
- BiographySection (custom)
- FightHistoryTable (custom)
- UButton (NuxtUI)

**Custom Components:**
- ErrorState
- LoadingState
- BreadCrumbs
- BoxerHero
- BoxerPageTOCHorizontal
- StatsGrid
- FighterInfoCard
- BiographySection
- FightHistoryTable

---

### 4. `/pages/divisions/index.vue` (Divisions Directory)
**Components Used:**
- BreadCrumbs (custom)
- PageHero (custom)
- HTML table (no component)

**Custom Components:**
- BreadCrumbs
- PageHero

---

### 5. `/pages/divisions/[slug].vue` (Individual Division Page)
**Components Used:**
- BreadCrumbs (custom)
- PageHero (custom)
- BoxersTable (custom)
- UIcon (NuxtUI)
- UButton (NuxtUI)

**Custom Components:**
- BreadCrumbs
- PageHero
- BoxersTable

---

### 6. `/pages/about.vue` (About Page)
**Components Used:**
- BreadCrumbs (custom)
- PageHero (custom)
- UCard (NuxtUI)
- UIcon (NuxtUI)

**Custom Components:**
- BreadCrumbs
- PageHero

---

### 7. Legal Pages (`/pages/legal/*.vue`)
- privacy-policy.vue
- terms-conditions.vue
- affiliate-disclosure.vue
- dmca.vue

**Components Used:** (Similar pattern for all)
- BreadCrumbs (custom)
- PageHero (custom)

---

## Summary of Component Usage

### Most Used Custom Components:
1. **BreadCrumbs** - Used on almost every page
2. **PageHero** - Used on almost every page
3. **BoxersTable** - Used on division pages
4. **ErrorState** - Used on dynamic pages
5. **LoadingState** - Used on dynamic pages
6. **StatsGrid** - Used on boxer profile
7. **BoxerHero** - Used on boxer profile
8. **FighterInfoCard** - Used on boxer profile
9. **BiographySection** - Used on boxer profile
10. **FightHistoryTable** - Used on boxer profile
11. **BoxerPageTOCHorizontal** - Used on boxer profile

### Layout Components (used globally):
- LayoutAppHeader
- LayoutAppFooter

### Unused Components (found in /components but not referenced):
1. **MCP/** folder - All components (MCPCard, MCPFilters, MCPGrid, MCPHeader)
2. **Directory/** folder - All components (DirectoryFilters, DirectoryGrid, etc.)
3. **Learn/** folder - All components (LearnCard, LearnSection, SectionHeading)
4. **Community/** folder - All components (CommunityHelp, CommunitySection, etc.)
5. **Demo/** folder - DemoSection
6. **Hero/** folder - All components (HeroSection, HeroHeadline, etc.)
7. **CTA/** folder - All components (SignupButtons, SignupCTA)
8. **collection/** folder - CollectionHeader
9. **Boxing/** folder - New components (BoxerCard, DivisionCard, BoxerStats) - not yet used

### Components Actually Being Used:
- **Layout/**: AppHeader, AppFooter, AppLogo
- **Shared UI**: BreadCrumbs, PageHero, ErrorState, LoadingState
- **Boxing specific**: BoxersTable, BoxerHero, StatsGrid, FighterInfoCard, BiographySection, FightHistoryTable, BoxerPageTOC components

### Observations:
1. Many components from the MCP theme are unused
2. Most pages use inline UI instead of reusable components
3. Heavy reliance on NuxtUI components (UCard, UButton, UBadge, etc.)
4. Opportunity to create more reusable components for common patterns

### NuxtUI Component Research:
- **LoadingState**: Could be replaced with NuxtUI's `USkeleton` component
- **ErrorState**: Should be kept - NuxtUI doesn't provide an empty/error state component
- NuxtUI provides: USkeleton for loading states, but no UEmpty or error state components