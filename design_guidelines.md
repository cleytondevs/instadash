# Marketing Dashboard Design Guidelines

## Design Approach
**Selected System**: Modern Analytics Dashboard Pattern (inspired by Vercel Dashboard + Linear's data displays + Stripe's metric cards)

**Justification**: Data-heavy utility application requiring clarity, efficient information hierarchy, and professional credibility. Focus on immediate data comprehension over aesthetic flourish.

## Core Design Elements

### Typography
- **Primary Font**: Inter (Google Fonts)
- **Hierarchy**:
  - Page titles: text-2xl font-semibold
  - Section headers: text-lg font-medium
  - Metric values: text-3xl font-bold (large numbers)
  - Labels/captions: text-sm text-gray-600 dark:text-gray-400
  - Body text: text-base

### Layout System
**Spacing Primitives**: Tailwind units of 4, 6, 8, 12 (p-4, gap-6, mb-8, py-12)

**Grid Structure**:
- Dashboard container: max-w-7xl mx-auto px-6
- Metric cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6
- Chart sections: grid-cols-1 lg:grid-cols-2 gap-8
- Data tables: full-width with horizontal scroll

### Component Library

**Navigation Sidebar** (Fixed Left, 240px):
- Logo area with icon + text
- Main nav items with Lucide icons (BarChart3, ShoppingBag, DollarSign, Settings, TrendingUp)
- Active state: accent background with subtle left border indicator
- Platform switcher dropdown (Instagram/Shopee)
- Dark/Light mode toggle at bottom

**Top Header Bar**:
- Page breadcrumb/title on left
- Date range picker (center-right)
- Profile avatar + notifications bell (right)
- Height: h-16 with border-b

**Metric Summary Cards** (Top Dashboard Section):
- 4-column grid: Total Spend, Total Revenue, ROI %, Active Campaigns
- Card structure: Large numeric value, percentage change indicator (↑/↓ with color), small comparison text ("vs last month")
- Subtle border, rounded-lg, hover state with slight shadow lift
- Icons: Lucide icons (DollarSign, TrendingUp, BarChart2, Zap)

**Chart Components**:
- Revenue vs Spend Timeline: Line chart with dual Y-axes, area fill under lines
- Platform Performance: Horizontal bar chart comparing Instagram vs Shopee metrics
- ROI Trend: Sparkline micro-charts within metric cards
- Campaign Breakdown: Donut chart with legend

**Data Table** (Campaign List):
- Sticky header row
- Columns: Campaign Name, Platform (badge), Spend, Revenue, ROI, Status (badge), Actions (kebab menu)
- Row hover state with background change
- Sortable column headers with arrow icons
- Pagination footer

**Filters Panel**:
- Platform chips (Instagram/Shopee/All) with active state
- Date range with preset options (7d, 30d, 90d, Custom)
- Status dropdown (Active, Paused, Completed)
- Search input with magnifying glass icon

**Status Badges**:
- Active: green background
- Paused: yellow/amber background
- Completed: gray background
- High ROI indicator: blue accent badge

### Dark/Light Mode Specifications
- Implement via CSS variables for seamless switching
- Light: bg-gray-50 base, white cards, gray-900 text
- Dark: bg-gray-950 base, gray-900 cards, gray-100 text
- Borders: gray-200 (light) / gray-800 (dark)
- Accent color: Consistent across both (blue-600 works in both modes)
- Charts: Adjust grid lines and labels for contrast

### Color Usage Strategy
Use semantic color roles:
- Success/Positive: Revenue gains, positive ROI
- Warning: Moderate performance
- Danger: Budget alerts, negative trends
- Neutral: Inactive states, borders
- Primary: CTAs, active states, key metrics

## Images
**No hero images required** - This is a functional dashboard, not a marketing site. Focus purely on data visualization and UI clarity.

## Critical Implementation Notes
- All charts must be responsive and readable at mobile widths
- Maintain 8px baseline grid for vertical rhythm
- Table text alignment: Numbers right-aligned, text left-aligned
- Loading states: Skeleton screens for async data
- Empty states: Centered icon + text + CTA button
- Tooltips on hover for truncated campaign names
- Export buttons (CSV/PDF) in table header