// This file MUST be loaded with: node --import ./instrument.mjs server.js
// It runs before any other module resolves, allowing Sentry to hook into Express.
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import 'dotenv/config'

Sentry.init({
    dsn: process.env.SENTRY_DSN || "https://c3a06b548227cfb47e20f925d3a0d85e@o4510220204310528.ingest.us.sentry.io/4511296059932672",
    integrations: [
        nodeProfilingIntegration(),
        Sentry.mongooseIntegration()
    ],
    tracesSampleRate: 1.0,
});
