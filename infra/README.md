# Infrastructure Setup Guide

This directory contains infrastructure configuration and documentation for Proof-of-Build.

## Directory Structure

```
infra/
├── r2/
│   └── bucket-config.md          # R2 bucket structure and configuration
├── wrangler/
│   └── worker.toml               # Worker configuration template
└── README.md                     # This file
```

## Required Infrastructure

### 1. R2 Bucket

**Name:** `proof-of-build-uploads`

**Purpose:** Stores all project data:
- Uploaded artifacts (screenshots, terminal, logs)
- Generated scripts
- Generated audio
- State files

**Creation:**
```bash
wrangler r2 bucket create proof-of-build-uploads
```

### 2. Queue (TEMPORARY: COMMENTED OUT)

**Name:** `proof-of-build-queue`

**Purpose:** Receives event notifications when `manifest.json` is uploaded to R2.

**Status:** ⚠️ **COMMENTED OUT** - Requires Workers Paid plan. Currently using polling worker instead.

**Creation (when moving to paid plan):**
```bash
wrangler queues create proof-of-build-queue
```

**Note:** Requires Workers Paid plan ($5/month).

### 3. Event Notification (TEMPORARY: COMMENTED OUT)

**Purpose:** Triggers queue messages when `manifest.json` is uploaded (completion signal).

**Status:** ⚠️ **COMMENTED OUT** - Requires Workers Paid plan. Currently using polling worker instead.

**Creation (when moving to paid plan):**
```bash
wrangler r2 bucket notification create proof-of-build-uploads \
  --event-type object-create \
  --queue proof-of-build-queue \
  --suffix manifest.json
```

**Behavior:**
- Only triggers on `object-create` events
- Only triggers when object key ends with `manifest.json`
- Sends message to `proof-of-build-queue`
- Worker consumes messages and processes pipeline

### 2.5. Polling Worker (TEMPORARY: CURRENT IMPLEMENTATION)

**Purpose:** Polls R2 for new `manifest.json` files using cron triggers (free tier).

**Configuration:**
- Cron trigger: Runs every 2 minutes
- Polls `uploads/*/manifest.json` files
- Tracks processed projects via `state/{project_id}.json`
- Skips already processed projects

**Benefits:**
- ✅ Free (uses Workers free tier cron triggers)
- ✅ No paid plan required
- ⚠️ Not real-time (up to 2 minute delay)

**TODO:** After moving to paid plan (~2 weeks), switch back to queue implementation.

### 4. Worker Configuration

**Template:** `infra/wrangler/worker.toml`

**Usage:**
1. Copy `infra/wrangler/worker.toml` to `apps/worker/wrangler.toml`
2. Customize as needed
3. Deploy Worker (Phase 3)

## Setup Checklist

- [ ] Create R2 bucket: `proof-of-build-uploads`
- [ ] ~~Create queue: `proof-of-build-queue`~~ [SKIPPED - Using polling]
- [ ] ~~Create event notification (triggers on manifest.json)~~ [SKIPPED - Using polling]
- [ ] Verify bucket is accessible
- [ ] ~~Verify queue is accessible~~ [SKIPPED - Using polling]
- [ ] Deploy worker with cron trigger (polls every 2 minutes)
- [ ] Test polling (upload manifest.json via CLI, wait up to 2 minutes)

## Validation

After setup, verify:

1. **Bucket exists:**
   ```bash
   wrangler r2 bucket list
   ```

2. **Worker is deployed:**
   ```bash
   cd apps/worker
   wrangler deploy
   ```

3. **Test flow:**
   ```bash
   # Upload artifacts and manifest via CLI
   cd apps/cli
   npm run dev -- upload --project test-001 --frames ./screenshots
   npm run dev -- manifest --project test-001 --artifacts-file /tmp/artifacts-test-001.json
   
   # Worker will poll for manifest.json (runs every 2 minutes)
   # Check state file: state/test-001.json (should be created/updated)
   # Note: Processing may take up to 2 minutes due to polling interval
   ```

4. **Check worker logs:**
   ```bash
   cd apps/worker
   wrangler tail
   ```

**Note:** Queue and event notification validation skipped (using polling instead).

## Next Steps

After infrastructure is set up:

1. **Phase 3:** Build Worker orchestration
2. **Phase 4:** Integrate AI and audio generation
3. **Phase 5:** Build playback UI

---

**See Also:**
- `ARCHITECTURE.md` - System architecture
- `IMPLEMENTATION_PLAN.md` Phase 2 - Detailed setup instructions
- `infra/r2/bucket-config.md` - Bucket structure details
- `infra/wrangler/worker.toml` - Worker configuration template

