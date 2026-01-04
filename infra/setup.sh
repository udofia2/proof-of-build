#!/bin/bash
# Infrastructure Setup Script for Proof-of-Build
# Run this script to set up R2 bucket, queue, and event notifications
# 
# TEMPORARY: Using polling worker instead of queues (free tier)
# TODO: After 2 weeks, uncomment queue implementation and comment out polling

set -e  # Exit on error

echo "🚀 Setting up Proof-of-Build Infrastructure..."
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Error: wrangler CLI not found"
    echo "   Install it with: npm install -g wrangler"
    exit 1
fi

# Check if logged in
if ! wrangler whoami &> /dev/null; then
    echo "⚠️  Warning: Not logged in to Cloudflare"
    echo "   Run: wrangler login"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

BUCKET_NAME="proof-of-build-uploads"
QUEUE_NAME="proof-of-build-queue"

echo "📦 Step 1: Creating R2 bucket..."
if wrangler r2 bucket list | grep -q "$BUCKET_NAME"; then
    echo "   ✅ Bucket '$BUCKET_NAME' already exists"
else
    wrangler r2 bucket create "$BUCKET_NAME"
    echo "   ✅ Bucket '$BUCKET_NAME' created"
fi

# ============================================================================
# QUEUE IMPLEMENTATION (COMMENTED OUT - REQUIRES PAID PLAN)
# TODO: Uncomment after moving to paid plan (in ~2 weeks)
# ============================================================================
# echo ""
# echo "📬 Step 2: Creating queue..."
# if wrangler queues list | grep -q "$QUEUE_NAME"; then
#     echo "   ✅ Queue '$QUEUE_NAME' already exists"
# else
#     wrangler queues create "$QUEUE_NAME"
#     echo "   ✅ Queue '$QUEUE_NAME' created"
# fi
# 
# echo ""
# echo "🔔 Step 3: Creating event notification..."
# # Check if notification already exists
# NOTIFICATIONS=$(wrangler r2 bucket notification list "$BUCKET_NAME" 2>/dev/null || echo "")
# if echo "$NOTIFICATIONS" | grep -q "manifest.json"; then
#     echo "   ✅ Event notification already exists (triggers on manifest.json)"
# else
#     wrangler r2 bucket notification create "$BUCKET_NAME" \
#         --event-type object-create \
#         --queue "$QUEUE_NAME" \
#         --suffix manifest.json
#     echo "   ✅ Event notification created (triggers on manifest.json uploads)"
# fi
# ============================================================================

echo ""
echo "✅ Infrastructure setup complete!"
echo ""
echo "📋 Summary:"
echo "   - R2 Bucket: $BUCKET_NAME"
echo "   - Queue: [SKIPPED - Using polling worker instead]"
echo "   - Event Notification: [SKIPPED - Using polling worker instead]"
echo "   - Worker: Will poll R2 for new manifest.json files (cron trigger)"
echo ""
echo "💡 Note: Currently using polling worker (free tier)."
echo "   Queue implementation is commented out and will be enabled after moving to paid plan."
echo ""
echo "🔐 Next steps:"
echo "   1. Set secrets (when ready):"
echo "      wrangler secret put ELEVENLABS_API_KEY"
echo "      wrangler secret put AI_API_KEY  # (if using external AI)"
echo ""
echo "   2. Copy worker.toml template:"
echo "      cp infra/wrangler/worker.toml apps/worker/wrangler.toml"
echo ""
echo "   3. Proceed to Phase 3: Worker Orchestration"

