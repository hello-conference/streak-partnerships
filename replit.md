# StreakFlow Dashboard

## Overview

StreakFlow is a partnership management dashboard that integrates with the Streak CRM API to visualize and manage partnership deals across multiple pipelines. The application displays pipeline data with stages, boxes (deals), and supports filtering and searching functionality. It's designed for managing Techorama conference partnerships across different countries (Belgium, Netherlands).

## Recent Changes (January 2026)

- **Google Authentication** implemented via Replit Auth (OpenID Connect)
  - Domain restriction: Only @techorama.be and @techorama.nl emails allowed
  - Domain validation enforced at OAuth callback (before session creation) and on all API endpoints
  - Split-screen login page with Techorama branding
- Added dashboard landing page with navigation cards for BE and NL pipelines
- **NL pipeline now connected** with STREAK_API_KEY_NL - shows live partner counts and total values
- Dual API key architecture: BE pipelines use STREAK_API_KEY, NL pipelines use STREAK_API_KEY_NL
- Backend auto-detects NL pipelines based on pipeline key format (techorama.nl organization)
- Removed sidebar navigation in favor of simplified dashboard-based navigation
- Removed non-functional "Add New Box" button
- Added clickable Partner Page Live badges (red=OFF, green=LIVE) with confirmation dialog for toggling status
- Dynamic previous year comparison based on pipeline country code

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state caching and synchronization
- **Styling**: Tailwind CSS with shadcn/ui component library (New York style variant)
- **Animations**: Framer Motion for smooth transitions
- **Build Tool**: Vite with custom configuration for path aliases

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript compiled with TSX for development
- **API Pattern**: RESTful endpoints defined in `shared/routes.ts` with Zod schema validation
- **Build Process**: Custom esbuild script that bundles server code for production

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` contains both database tables and API response schemas
- **Database**: PostgreSQL (requires DATABASE_URL environment variable)
- **Migrations**: Drizzle Kit with migrations output to `./migrations`

### Project Structure
```
├── client/           # React frontend application
│   └── src/
│       ├── components/  # UI components (shadcn/ui + custom)
│       ├── hooks/       # React Query hooks for API calls
│       ├── pages/       # Route page components
│       └── lib/         # Utilities and query client
├── server/           # Express backend
│   ├── routes.ts     # API endpoint handlers
│   ├── db.ts         # Database connection
│   └── storage.ts    # Data access layer
├── shared/           # Shared types and schemas
│   ├── schema.ts     # Drizzle tables + Zod schemas
│   └── routes.ts     # API route definitions
└── migrations/       # Database migrations
```

### Authentication
- **Provider**: Replit Auth (OpenID Connect via Google)
- **Domain Restriction**: Only @techorama.be and @techorama.nl email domains allowed
- **Implementation**: 
  - Domain validated at OAuth callback before session creation
  - All API endpoints protected with `isAuthenticated` + `isDomainAllowed` middleware
  - Session storage in PostgreSQL via `connect-pg-simple`
- **Files**: `server/replit_integrations/auth/` directory contains auth logic

### Key Design Decisions

1. **Shared Schema Pattern**: API schemas and database schemas coexist in `shared/schema.ts`, enabling type safety across frontend and backend boundaries.

2. **External API Proxy**: The backend acts as a proxy to the Streak CRM API, handling authentication and data transformation before passing to the frontend.

3. **Component Library**: Uses shadcn/ui with the "new-york" style variant, providing accessible, customizable components built on Radix UI primitives.

4. **Path Aliases**: TypeScript path aliases (`@/`, `@shared/`) simplify imports across the monorepo structure.

5. **Domain-Restricted Authentication**: Authentication is restricted to Techorama organization emails, enforced at multiple layers (OAuth callback, API middleware).

## External Dependencies

### Third-Party APIs
- **Streak CRM API**: Primary data source for pipelines and boxes (deals)
  - Base URL: `https://www.streak.com/api/v1`
  - Authentication: Basic Auth with API key (requires `STREAK_API_KEY` environment variable)

### Database
- **PostgreSQL**: Primary database for application data
  - Connection via `DATABASE_URL` environment variable
  - Session storage using `connect-pg-simple`

### Key npm Dependencies
- `drizzle-orm` / `drizzle-kit`: Database ORM and migrations
- `@tanstack/react-query`: Server state management
- `zod` / `drizzle-zod`: Schema validation
- `date-fns`: Date formatting
- `framer-motion`: Animations
- `recharts`: Data visualization
- `lucide-react`: Icon library

### Environment Variables Required
- `DATABASE_URL`: PostgreSQL connection string
- `STREAK_API_KEY`: Streak CRM API authentication key (Belgium organization)
- `STREAK_API_KEY_NL`: Streak CRM API authentication key (Netherlands organization)