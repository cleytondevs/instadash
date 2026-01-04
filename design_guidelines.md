# Dashboard de Anúncios Instagram - Design Guidelines

## Design Approach
**Selected System**: Ultra-simplified Single-Purpose Dashboard (inspired by Stripe's metric clarity + Notion's onboarding + Linear's typography)

**Justification**: Beginner-friendly utility tool requiring instant comprehension of profit/loss. Eliminate complexity, focus on the three critical numbers entrepreneurs care about most.

**Language**: Portuguese (BR) throughout entire interface

## Core Design Elements

### Typography
- **Font**: Inter (Google Fonts CDN)
- **Hierarchy**:
  - Hero metrics: text-5xl font-bold (Gastei/Ganhei/Lucro values)
  - Metric labels: text-sm font-medium uppercase tracking-wide
  - Section headers: text-xl font-semibold
  - Body text: text-base
  - Helper text: text-sm text-gray-600

### Layout System
**Spacing**: Tailwind units 4, 6, 8, 12 (consistent with existing)
**Container**: max-w-5xl mx-auto px-6 (narrower than analytics dashboard)

### Component Library

**Top Navigation Bar**:
- Logo "InstaDash" (left)
- "Configurações" link (right)
- Height: h-16, border-b
- Profile avatar + "Sair" dropdown

**Hero Metrics Section** (Primary Dashboard View):
- 3-column grid (grid-cols-1 md:grid-cols-3 gap-8)
- Each metric card structure:
  - Small label on top: "Quanto Gastei" / "Quanto Ganhei" / "Lucro"
  - Massive number: R$ value in text-5xl font-bold
  - Icon: DollarSign (Lucide) in subtle accent
- **Lucro Card Special Treatment**:
  - Positive: Green background gradient (emerald-50 to emerald-100), emerald-700 text
  - Negative: Red background gradient (red-50 to red-100), red-700 text
  - Zero: Neutral gray background
  - Badge with percentage: "+45%" or "-12%"

**Quick Status Summary** (Below Hero):
- Single row with key insights:
  - "Última atualização: há 2 horas"
  - "Campanhas ativas: 3"
  - Visual indicator: Green dot for "Lucro" / Red dot for "Prejuízo"

**Campaign Performance Table**:
- Simplified columns: Nome da Campanha, Gasto, Receita, Lucro, Status
- Status badges: "Ativa" (green), "Pausada" (amber), "Encerrada" (gray)
- Profit column: Color-coded green (positive) / red (negative)
- Row hover: subtle background lift
- "Ver detalhes" link in each row

**Onboarding Flow** (For First-Time Users):
- 3-step guided setup modal:
  1. "Conecte sua conta Instagram" (OAuth button)
  2. "Configure seu método de rastreamento" (Pixel/UTM setup)
  3. "Defina suas metas" (Target ROI input)
- Progress indicator: 1/3, 2/3, 3/3
- Large "Começar" primary button
- Skip option: "Fazer isso depois" subtle link

**Date Range Selector**:
- Preset chips: "Hoje", "7 dias", "30 dias", "Este mês"
- Active state with accent background
- Positioned below hero metrics

**Empty States**:
- Centered illustration placeholder comment
- Title: "Nenhum anúncio encontrado"
- Subtitle: "Conecte sua conta do Instagram para começar"
- Primary CTA: "Conectar Instagram"

**Help/Tutorial Elements**:
- Floating "?" button (bottom-right, fixed)
- Tooltips on hover for each metric: "O quanto você investiu em anúncios" etc.
- First-visit banner: "Primeira vez aqui? Faça o tour guiado" with dismiss X

### Color Strategy (Critical for Profit/Loss)
**Semantic Profit Colors**:
- Positive/Lucro: emerald-600, emerald-700, emerald-50 backgrounds
- Negative/Prejuízo: red-600, red-700, red-50 backgrounds
- Neutral/Break-even: gray-600

**Base Colors**:
- Background: gray-50 (light mode), gray-950 (dark mode)
- Cards: white (light), gray-900 (dark)
- Primary CTA: blue-600
- Borders: gray-200 (light), gray-800 (dark)

### Dark/Light Mode
- Toggle in top-right navigation
- CSS variables for seamless switching
- Profit/loss colors remain vibrant in both modes
- Chart backgrounds adapt for readability

## Visual Hierarchy Emphasis
1. **Lucro (Profit)** is the hero - largest, most prominent, color-coded
2. Secondary: Gastei/Ganhei in equal weight
3. Tertiary: Campaign details below fold
4. Everything else: Supporting elements

## Responsive Behavior
- Mobile: Stack hero metrics vertically, full-width
- Tablet: 2-column for Gastei/Ganhei, Lucro spans full row below
- Desktop: 3-column equal grid

## Accessibility
- High contrast ratios for all text
- Focus states on all interactive elements
- Screen reader labels in Portuguese
- Keyboard navigation for entire flow

## Images
**No hero image required** - Dashboard is data-first. Focus purely on metric clarity and clean UI.