import { defineConfig } from "vitepress";

export default defineConfig({
  title: "LaraNode",
  description: "A Laravel-inspired Node.js framework built on Express",
  base: "/",
  lang: "en-US",
  lastUpdated: true,
  cleanUrls: true,

  head: [
    ["link", { rel: "icon", href: "/favicon.ico" }],
    ["meta", { name: "theme-color", content: "#FF2D20" }],
  ],

  themeConfig: {
    logo: { src: "/logo.svg", width: 24, height: 24 },

    nav: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/getting-started" },
      {
        text: "Packages",
        items: [
          { text: "Core", link: "/packages/core" },
          { text: "Database", link: "/packages/db" },
          { text: "Router", link: "/packages/router" },
          { text: "Auth", link: "/packages/auth" },
          { text: "Validator", link: "/packages/validator" },
          { text: "Cache", link: "/packages/cache" },
          { text: "Queue", link: "/packages/queue" },
          { text: "Events", link: "/packages/events" },
          { text: "Mail", link: "/packages/mail" },
          { text: "Middlewares", link: "/packages/middlewares" },
          { text: "Carbon", link: "/packages/carbon" },
          { text: "Console", link: "/packages/console" },
          { text: "Horizon", link: "/packages/horizon" },
          { text: "Telescope", link: "/packages/telescope" },
        ],
      },
      {
        text: "CLI Tools",
        items: [{ text: "Create LaraNode", link: "/cli/create-laranode" }],
      },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "Getting Started",
          items: [
            { text: "Introduction", link: "/guide/introduction" },
            { text: "Getting Started", link: "/guide/getting-started" },
            { text: "Installation", link: "/guide/installation" },
            { text: "Project Structure", link: "/guide/project-structure" },
            { text: "Configuration", link: "/guide/configuration" },
          ],
        },
        {
          text: "Fundamentals",
          items: [
            { text: "Service Providers", link: "/guide/service-providers" },
            { text: "Dependency Injection", link: "/guide/dependency-injection" },
            { text: "Middleware", link: "/guide/middleware" },
            { text: "Facades", link: "/guide/facades" },
          ],
        },
      ],
      "/packages/": [
        {
          text: "Core",
          items: [
            { text: "Overview", link: "/packages/core" },
            { text: "Container", link: "/packages/core/container" },
            { text: "Application", link: "/packages/core/application" },
            { text: "Service Providers", link: "/packages/core/service-providers" },
            { text: "Configuration", link: "/packages/core/config" },
            { text: "Request", link: "/packages/core/request" },
          ],
        },
        {
          text: "Database",
          items: [
            { text: "Overview", link: "/packages/db" },
            { text: "Models", link: "/packages/db/models" },
            { text: "Query Builder", link: "/packages/db/query-builder" },
            { text: "Relationships", link: "/packages/db/relationships" },
            { text: "Migrations", link: "/packages/db/migrations" },
            { text: "Seeders", link: "/packages/db/seeders" },
            { text: "Traits", link: "/packages/db/traits" },
            { text: "Observers", link: "/packages/db/observers" },
            { text: "DB Facade", link: "/packages/db/facade" },
          ],
        },
        {
          text: "Router",
          items: [
            { text: "Overview", link: "/packages/router" },
            { text: "Basic Routing", link: "/packages/router/basic" },
            { text: "Route Groups", link: "/packages/router/groups" },
            { text: "Controllers", link: "/packages/router/controllers" },
            { text: "Middleware", link: "/packages/router/middleware" },
            { text: "Route Model Binding", link: "/packages/router/model-binding" },
            { text: "Resource Routes", link: "/packages/router/resource" },
            { text: "OpenAPI Generation", link: "/packages/router/openapi" },
          ],
        },
        {
          text: "Auth",
          items: [
            { text: "Overview", link: "/packages/auth" },
            { text: "Token Generation", link: "/packages/auth/tokens" },
            { text: "Password Hashing", link: "/packages/auth/passwords" },
            { text: "Auth Middleware", link: "/packages/auth/middleware" },
            { text: "Token Encryption", link: "/packages/auth/encryption" },
          ],
        },
        {
          text: "Validator",
          items: [
            { text: "Overview", link: "/packages/validator" },
            { text: "Basic Usage", link: "/packages/validator/basic" },
            { text: "Validation Rules", link: "/packages/validator/rules" },
            { text: "Custom Rules", link: "/packages/validator/custom-rules" },
            { text: "Error Messages", link: "/packages/validator/messages" },
          ],
        },
        {
          text: "Cache",
          items: [
            { text: "Overview", link: "/packages/cache" },
            { text: "Cache Drivers", link: "/packages/cache/drivers" },
            { text: "Rate Limiting", link: "/packages/cache/rate-limiting" },
          ],
        },
        {
          text: "Queue",
          items: [
            { text: "Overview", link: "/packages/queue" },
            { text: "Jobs", link: "/packages/queue/jobs" },
            { text: "Workers", link: "/packages/queue/workers" },
            { text: "Scheduler", link: "/packages/queue/scheduler" },
            { text: "Failed Jobs", link: "/packages/queue/failed-jobs" },
          ],
        },
        {
          text: "Events",
          items: [
            { text: "Overview", link: "/packages/events" },
            { text: "Listeners", link: "/packages/events/listeners" },
            { text: "Subscribers", link: "/packages/events/subscribers" },
            { text: "Broadcasting", link: "/packages/events/broadcasting" },
            { text: "Queueable Listeners", link: "/packages/events/queueable" },
          ],
        },
        {
          text: "Mail",
          items: [
            { text: "Overview", link: "/packages/mail" },
            { text: "Mailables", link: "/packages/mail/mailables" },
            { text: "Mail Drivers", link: "/packages/mail/drivers" },
            { text: "Queued Mail", link: "/packages/mail/queued" },
          ],
        },
        {
          text: "Middlewares",
          items: [
            { text: "Overview", link: "/packages/middlewares" },
            { text: "Built-in Middleware", link: "/packages/middlewares/built-in" },
            { text: "Auth & Authorization", link: "/packages/middlewares/auth" },
          ],
        },
        {
          text: "Carbon",
          items: [
            { text: "Overview", link: "/packages/carbon" },
            { text: "Creating Dates", link: "/packages/carbon/creating" },
            { text: "Manipulation", link: "/packages/carbon/manipulation" },
            { text: "Formatting", link: "/packages/carbon/formatting" },
            { text: "Comparison", link: "/packages/carbon/comparison" },
            { text: "Intervals & Periods", link: "/packages/carbon/intervals" },
          ],
        },
        {
          text: "Console",
          items: [
            { text: "Overview", link: "/packages/console" },
            { text: "Writing Commands", link: "/packages/console/commands" },
            { text: "Built-in Commands", link: "/packages/console/built-in" },
          ],
        },
        {
          text: "Horizon",
          items: [
            { text: "Overview", link: "/packages/horizon" },
            { text: "Configuration", link: "/packages/horizon/configuration" },
            { text: "Dashboard", link: "/packages/horizon/dashboard" },
          ],
        },
        {
          text: "Telescope",
          items: [
            { text: "Overview", link: "/packages/telescope" },
            { text: "Configuration", link: "/packages/telescope/configuration" },
            { text: "Watchers", link: "/packages/telescope/watchers" },
          ],
        },
      ],
      "/cli/": [
        {
          text: "CLI Tools",
          items: [{ text: "Create LaraNode", link: "/cli/create-laranode" }],
        },
      ],
    },

    socialLinks: [{ icon: "github", link: "https://github.com/anomalyco/vest" }],

    search: {
      provider: "local",
    },

    editLink: {
      pattern: "https://github.com/anomalyco/vest/edit/main/packages/docs/:path",
      text: "Edit this page on GitHub",
    },

    footer: {
      message: "Released under the MIT License.",
      copyright: "Copyright © " + new Date().getFullYear() + " LaraNode Framework",
    },

    outline: {
      level: [2, 3],
      label: "On this page",
    },

    lastUpdated: {
      text: "Last updated",
    },

    docFooter: {
      prev: "Previous page",
      next: "Next page",
    },
  },

  markdown: {
    lineNumbers: true,
    languages: ["dotenv", "typescript", "js", "json", "jsonc", "ts"],
  },
});
