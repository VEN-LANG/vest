// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    "@nuxt/image",
    "@nuxt/ui",
    "@nuxt/content",
    "nuxt-og-image",
    "nuxt-llms",
    "@nuxtjs/mcp-toolkit",
  ],

  devtools: {
    enabled: true,
  },

  css: ["~/assets/css/main.css"],

  content: {
    build: {
      markdown: {
        toc: {
          searchDepth: 1,
        },
      },
    },
    experimental: {
      sqliteConnector: "native",
    },
  },

  experimental: {
    asyncContext: true,
  },

  compatibilityDate: "2024-07-11",

  routeRules: {
    "/getting-started": { redirect: { to: "/guide/getting-started", statusCode: 301 } },
  },

  nitro: {
    prerender: {
      routes: ["/"],
      crawlLinks: true,
      autoSubfolderIndex: false,
      failOnError: false,
    },
  },

  icon: {
    provider: "iconify",
  },

  llms: {
    domain: "https://laranode.doitrixtech.co.ke/",
    title: "LaraNode Framework",
    description: "A modern Node.js framework inspired by Laravel's elegance, built for TypeScript.",
    full: {
      title: "LaraNode Framework - Full Documentation",
      description:
        "Complete documentation for the LaraNode framework - a modern Node.js framework inspired by Laravel.",
    },
    sections: [
      {
        title: "Getting Started",
        contentCollection: "docs",
        contentFilters: [{ field: "path", operator: "LIKE", value: "/guide%" }],
      },
      {
        title: "Packages",
        contentCollection: "docs",
        contentFilters: [{ field: "path", operator: "LIKE", value: "/packages%" }],
      },
    ],
  },

  mcp: {
    name: "LaraNode Docs",
  },

  ogImage: {
    zeroRuntime: true,
  },
});
