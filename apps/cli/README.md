# Proof-of-Build CLI

CLI tool for uploading artifacts to R2 and generating manifests.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Authenticate with Cloudflare:**
   
   **For local development (recommended):**
   ```bash
   wrangler login
   ```
   This uses OAuth and stores credentials in `~/.wrangler/config/`. No `.env` file needed!
   
   **For CI/CD environments:**
   ```bash
   export CLOUDFLARE_API_TOKEN=your_token_here
   export CLOUDFLARE_ACCOUNT_ID=your_account_id_here
   ```
   Or use a `.env` file (not required for local dev if using `wrangler login`).

3. **Configure R2 bucket (optional):**
   ```bash
   export R2_BUCKET_NAME=your-bucket-name
   ```
   
   Default: `proof-of-build-uploads`

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `R2_BUCKET_NAME` | R2 bucket name for uploads | No | `proof-of-build-uploads` |
| `CLOUDFLARE_API_TOKEN` | Cloudflare API token (alternative to `wrangler login`) | No* | - |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account ID | No* | - |

\* Required if not using `wrangler login`

## Usage

### Initialize a project

```bash
npm run dev -- init
```

Generates a project ID that you'll use for uploads.

### Upload artifacts

```bash
npm run dev -- upload \
  --project <project-id> \
  --frames ./screenshots \
  --terminal ./terminal \
  --logs ./logs
```

Options:
- `--project` / `-p`: Project ID (required, from `init` command)
- `--frames` / `-f`: Directory containing screenshot files
- `--terminal` / `-t`: Directory containing terminal output files
- `--logs` / `-l`: Directory containing log files
- `--bucket` / `-b`: R2 bucket name (optional, uses `R2_BUCKET_NAME` env var or default)

### Generate manifest

```bash
npm run dev -- manifest \
  --project <project-id> \
  --artifacts-file /tmp/artifacts-<project-id>.json
```

The `upload` command saves artifact metadata to a temp file and prints the path.
Use that path with `--artifacts-file` when running `manifest`.

Options:
- `--project` / `-p`: Project ID (required)
- `--artifacts-file`: Path to artifact metadata JSON (from upload command)
- `--bucket` / `-b`: R2 bucket name (optional)

## Example Workflow

```bash
# 1. Initialize project
npm run dev -- init
# Output: Project ID: abc123xyz

# 2. Prepare your artifacts
mkdir screenshots terminal logs
# Add your files to these directories

# 3. Upload artifacts
npm run dev -- upload \
  --project abc123xyz \
  --frames ./screenshots \
  --terminal ./terminal

# 4. Generate manifest (use the artifacts file path from step 3)
npm run dev -- manifest \
  --project abc123xyz \
  --artifacts-file /tmp/artifacts-abc123xyz.json
```

## Authentication

### For CLI Users (You)

**Yes, you need to authenticate** to use the CLI tool. The CLI runs on your local machine and needs permission to upload files to R2.

Authentication can be done via:

1. **OAuth (recommended for local dev):**
   ```bash
   wrangler login
   ```
   This stores credentials in `~/.wrangler/config/`. **No `.env` file needed!**

2. **Environment variables (for CI/CD or if you prefer):**
   ```bash
   export CLOUDFLARE_API_TOKEN=your_token
   export CLOUDFLARE_ACCOUNT_ID=your_account_id
   ```
   Or create a `.env` file in `apps/cli/` (optional).

**Note:** If you've run `wrangler login`, you don't need environment variables or a `.env` file. The CLI will automatically detect Wrangler OAuth authentication.

### For Production Deployment (Worker & Pages Apps)

**No user authentication needed!** The Worker and Pages apps run on Cloudflare's infrastructure and use **R2 bindings** configured at deployment time.

- R2 bindings are configured in `wrangler.toml` or via the Cloudflare dashboard
- Bindings are set up once during deployment by the project maintainer
- End users don't need to authenticate - the Worker/Pages automatically have access to the bound R2 bucket
- This is different from the CLI, which runs on your local machine

**Summary:**
- **CLI users**: Need `wrangler login` or API tokens (one-time setup)
- **Production apps**: Use bindings configured at deployment (no user action needed)

See [Wrangler authentication docs](https://developers.cloudflare.com/workers/wrangler/authentication/) for more details.

