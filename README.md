# Proof-of-Build

**Automated video demo generation from development artifacts**

Proof-of-Build transforms screenshots, terminal output, and logs into shareable video demos with AI-generated narration.

---

## Architecture

This is a monorepo with three main applications:

- **`apps/cli/`** - CLI tool for uploading artifacts to R2
- **`apps/worker/`** - Cloudflare Worker that orchestrates the processing pipeline
- **`apps/pages/`** - Cloudflare Pages (Hono) for playback UI

See [`ARCHITECTURE.md`](./docs/ARCHITECTURE.md) for detailed architecture documentation.

---

## Quick Start

### Prerequisites

- Node.js v18+
- npm
- Cloudflare account (for R2, Workers, Pages)
- Wrangler CLI: `npm install -g wrangler`

### Setup

1. **Install dependencies for shared packages first:**

```bash
# Install dependencies for shared packages
cd packages/schemas && npm install
cd ../core && npm install
```

2. **Install dependencies for each app:**

```bash
# CLI
cd apps/cli && npm install

# Pages app
cd apps/pages && npm install

# Worker (when created)
cd apps/worker && npm install
```

**Note:** Since this monorepo uses `file:` protocol for local packages (not npm workspaces), you must install dependencies in shared packages (`packages/schemas`, `packages/core`) before installing app dependencies.

2. **Configure Cloudflare:**

```bash
wrangler login
```

3. **Run Pages app locally:**

```bash
# From root
npm run pages:dev

# Or from apps/pages
cd apps/pages && npm run dev
```

Visit `http://localhost:8788`


---

## Development

### Pages App

```bash
cd apps/pages
npm run dev      # Local development
npm run build    # Build for production
npm run deploy   # Deploy to Cloudflare Pages
```

### CLI (Phase 1)

```bash
cd apps/cli
npm install

# 1. Initialize a project (generates project ID)
npm run dev -- init
# Output: Project ID: abc123xyz (use this in next steps)

# 2. Prepare your artifact directories locally:
#    - ./screenshots/ (PNG/JPG files)
#    - ./terminal/ (.txt files)  
#    - ./logs/ (.log files)

# 3. Upload artifacts (use project ID from step 1)
npm run dev -- upload --project <project-id> --frames ./screenshots --terminal ./terminal

# 4. Generate manifest (after uploads complete)
npm run dev -- manifest --project <project-id>
```

### Worker (Phase 3+)

```bash
cd apps/worker
npm run dev      # Local development
npm run deploy   # Deploy to Cloudflare Workers
```


