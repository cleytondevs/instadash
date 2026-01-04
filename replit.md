# InstaDash - Instagram Ads Dashboard

## Overview

InstaDash is a beginner-friendly analytics dashboard designed for Brazilian entrepreneurs to track Instagram and Shopee ad performance. The application provides a simplified, single-purpose interface focused on three critical metrics: spend (Gastei), revenue (Ganhei), and profit (Lucro). Built with a Portuguese (BR) interface throughout, it prioritizes instant comprehension of profit/loss for users managing advertising campaigns.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style)
- **Build Tool**: Vite with custom path aliases (@/, @shared/, @assets/)
- **Typography**: Outfit (display) and Plus Jakarta Sans (body) fonts
- **Charts**: Recharts for data visualization

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful endpoints defined in shared/routes.ts with Zod validation
- **Database ORM**: Drizzle ORM with PostgreSQL dialect

### Data Layer
- **Database**: PostgreSQL (connection via DATABASE_URL environment variable)
- **Schema Location**: shared/schema.ts defines all tables (users, ads, reports)
- **Migrations**: Drizzle Kit with migrations output to ./migrations directory
- **Data Storage**: Monetary values stored in cents (integers) for precision

### Key Data Models
- **Users**: Basic authentication with username/password
- **Ads**: Campaign tracking with platform identifier, name, platform type (instagram/shopee), status
- **Reports**: Daily performance data including spend, revenue, impressions, clicks linked to ads

### API Structure
- Routes defined declaratively in shared/routes.ts with method, path, input schema, and response types
- Centralized route definitions allow type-safe API consumption on frontend
- Error handling with standardized error schemas (validation, notFound, internal)

### Design System
- Shopee Orange (#EE4D2D) as primary brand color
- Clean white/gray palette for dashboard backgrounds
- Hero metrics displayed in large text-5xl format
- Profit card uses dynamic coloring (green for positive, red for negative)
- Glass-card styling with subtle backgrounds and hover effects

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, configured via DATABASE_URL environment variable
- **Connection Pooling**: pg Pool for database connections
- **Session Storage**: connect-pg-simple for Express sessions

### UI Component Libraries
- **Radix UI**: Full suite of accessible primitives (dialog, dropdown, tabs, etc.)
- **shadcn/ui**: Pre-styled component library built on Radix
- **Lucide React**: Icon library
- **Embla Carousel**: Carousel functionality
- **Recharts**: Chart visualization library
- **date-fns**: Date formatting and manipulation

### Form Handling
- **React Hook Form**: Form state management
- **@hookform/resolvers**: Zod integration for form validation
- **Zod**: Schema validation throughout the stack

### Build & Development
- **Vite**: Frontend build tool with HMR
- **esbuild**: Server bundling for production
- **tsx**: TypeScript execution for development
- **Drizzle Kit**: Database schema management and migrations