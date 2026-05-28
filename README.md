# Mobilize Platform

Mobilize is a platform designed to connect campaigners (organizations, researchers, event organizers) with on-ground participants at scale. The platform handles real-time participant dispatch, automated reliability scoring, and secure micro-payouts.

## Monorepo Architecture

This project is organized as an npm workspaces monorepo:

```
├── apps/
│   ├── participant/     # React Native (Expo) mobile app for on-ground participants
│   ├── campaigner/      # Next.js web app for campaigners to create and track campaigns
│   └── admin/           # Next.js web app for operations team to moderate and review activity
└── packages/
    ├── api/             # Express.js REST API (core backend + background jobs)
    └── shared/          # Shared TypeScript models, utility typings, and constants
```

### Tech Stack Overview
- **Backend API**: Node.js, Express.js, TypeScript, PostgreSQL (with PostGIS extensions), Supabase (Auth, RLS, Storage)
- **Web Applications**: Next.js 14/15, Tailwind CSS, shadcn/ui components
- **Mobile Application**: React Native, Expo, NativeWind (Tailwind CSS)
- **External Integrations**:
  - **Razorpay**: Campaigner wallet funding and automated participant payouts (payouts API)
  - **Supabase Service Client**: Direct database connections and file storage management
  - **Mapbox & Google Maps**: Participant heatmap rendering and GPS-based check-in verifications

---

## Setup and Installation

### Prerequisites
- Node.js (v20 or higher)
- npm (v10 or higher)
- Docker & Docker Compose (for local containerized running)
- A Supabase Project with PostGIS enabled

### Initial Setup
1. Clone the repository and navigate to the directory:
   ```bash
   cd Mobilize
   ```
2. Install dependencies for all apps and packages in the monorepo:
   ```bash
   npm install
   ```
3. Set up environment variables:
   Copy `.env.example` to `.env` in the root:
   ```bash
   cp .env.example .env
   ```
   Fill in your Supabase connection strings, Razorpay keys, and Mapbox tokens.

---

## Running the Platform Locally

### Development Mode
To run all applications concurrently in development mode with hot-reloading:
- **Core API**: `npm run dev --workspace=@mobilize/api`
- **Campaigner Web App**: `npm run dev --workspace=campaigner`
- **Admin Panel**: `npm run dev --workspace=admin`
- **Participant App**: `cd apps/participant && npx expo start`

### Production Run with Docker Compose
To build and run all services in a simulated production environment:
```bash
docker compose up --build -d
```
The services will be available at:
- **Campaigner Portal**: `http://localhost:3000`
- **Backend REST API**: `http://localhost:3001`
- **Admin Panel**: `http://localhost:3002`

---

## Deployment & CI/CD
Deployments are managed automatically via GitHub Actions:
- **Deployment workflow**: Located in `.github/workflows/deploy.yml`
- Runs typechecks and lints across all monorepo packages.
- Builds production-ready multi-stage Docker images.
- Pushes Docker images to the GitHub Container Registry (GHCR).
- Triggers container recreation on the production host server.
