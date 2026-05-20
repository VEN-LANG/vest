---
layout: home

hero:
  name: "LaraNode"
  text: "Laravel-Inspired Node.js Framework"
  tagline: Build elegant web APIs with the expressive power of Laravel, on top of Express.js
  image:
    src: /logo.svg
    alt: LaraNode Framework
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/anomalyco/vest

features:
  - icon: 📦
    title: IoC Container
    details: Powerful dependency injection container with automatic resolution, singleton binding, and service providers inspired by Laravel's architecture.
  - icon: 🗄️
    title: Eloquent ORM
    details: Full-featured ORM with MySQL and MongoDB support, relationships, eager loading, accessors, mutators, soft deletes, and model observers.
  - icon: 🛣️
    title: Expressive Routing
    details: Fluent route builder with middleware groups, named routes, route model binding, controller decorators, and automatic OpenAPI generation.
  - icon: 🔐
    title: Authentication
    details: JWT authentication with token generation, verification, encryption, password hashing with bcrypt, and ready-to-use auth middleware.
  - icon: ✅
    title: Validation
    details: 50+ Laravel-style validation rules including required, email, unique, exists, confirmed, and custom rule support with dot-notation.
  - icon: ⚡
    title: Job Queues
    details: Driver-based queue system (Sync, MongoDB, Redis) with retries, backoff, priorities, delays, failed-job tracking, and worker management.
  - icon: 📨
    title: Event System
    details: Event dispatcher with listeners, subscribers, queueable listeners, transaction-aware events, and WebSocket broadcasting support.
  - icon: 📧
    title: Mail
    details: Multi-driver mail system (SMTP, Log, Array, Failover) with fluent Mailable classes, queueing support, and HTML/text templates.
  - icon: 💾
    title: Caching
    details: Multi-driver cache (File, Database, Redis) with rate limiting, prefix management, remember patterns, and Telescope integration.
  - icon: 📅
    title: Carbon Dates
    details: Zero-dependency Laravel Carbon-inspired date library with immutable dates, fluent manipulation, human-readable diffs, and intervals.
  - icon: 🖥️
    title: Artisan CLI
    details: Laravel Artisan-style command system with 40+ built-in commands for migrations, queues, cache, routes, and more.
  - icon: 🔭
    title: Telescope & Horizon
    details: Beautiful debug dashboard for requests, queries, exceptions, and cache operations. Queue monitoring dashboard with worker management.
---

<script setup>
import { VPTeamMembers } from 'vitepress/theme'

const members = []
</script>
