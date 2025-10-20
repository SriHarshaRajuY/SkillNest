// Import with `import * as Sentry from "@sentry/node"` if you are using ESM
import * as Sentry from "@sentry/node"

Sentry.init({
  dsn: "https://ba48b2fc4950f568454905703ee1e94c@o4510220204310528.ingest.us.sentry.io/4510220208308224",
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  integrations: [Sentry.mongooseIntegration()],
  sendDefaultPii: true,
});