# Lara-Node Sample — Blog API

A minimal, runnable blog API built with Lara-Node. Demonstrates auth, models, events, jobs, and scheduled tasks in ~200 lines.

## What's included

| File                                         | What it shows                                     |
| -------------------------------------------- | ------------------------------------------------- |
| `src/bootstrap/app.ts`                       | Provider registration, kernel boot order          |
| `src/app/Http/Kernel.ts`                     | Named middleware aliases (`auth`)                 |
| `src/routes/api.ts`                          | Fluent route builder with middleware              |
| `src/app/Models/User.ts`                     | Model with `Timestamps`, `SoftDeletes`, `hasMany` |
| `src/app/Models/Post.ts`                     | Model with `belongsTo`                            |
| `src/app/Http/Controllers/AuthController.ts` | Register / login / me                             |
| `src/app/Http/Controllers/PostController.ts` | CRUD + event dispatch + job dispatch              |
| `src/app/Events/PostCreated.ts`              | Typed event class                                 |
| `src/app/Listeners/WelcomeNewAuthor.ts`      | Listener that sends a mail                        |
| `src/app/Jobs/ProcessPostAnalytics.ts`       | Queued job                                        |
| `src/app/Providers/AppServiceProvider.ts`    | Scheduled task registration                       |

## Quick start

```bash
cp .env.example .env          # set JWT_SECRET, DB_NAME if needed
pnpm install
pnpm artisan migrate          # creates users + posts collections/tables
pnpm artisan db:seed          # creates demo user alice@example.com
pnpm dev                      # http://localhost:3001
```

## API Endpoints

```
GET  /api/health              No auth — health check

POST /api/auth/register       { name, email, password }
POST /api/auth/login          { email, password } → { user, token }
GET  /api/auth/me             Bearer token required

GET  /api/posts               List published posts
GET  /api/posts/:id           Single post (dispatches ProcessPostAnalytics job)
POST /api/posts               Bearer token — create post (fires PostCreated event)
PUT  /api/posts/:id           Bearer token — update (author only)
DELETE /api/posts/:id         Bearer token — soft-delete (author only)
```

## Try it

```bash
# Register
curl -s -X POST http://localhost:3001/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Bob","email":"bob@example.com","password":"secret123"}' | jq .

# Login
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"bob@example.com","password":"secret123"}' | jq -r .token)

# Create a post (fires PostCreated event → WelcomeNewAuthor listener → mail)
curl -s -X POST http://localhost:3001/api/posts \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"title":"My First Post","body":"Hello from Lara-Node!"}' | jq .

# List posts
curl -s http://localhost:3001/api/posts | jq .
```

## Artisan commands

```bash
pnpm artisan serve             # start HTTP server
pnpm artisan migrate           # run migrations
pnpm artisan migrate:status    # check migration state
pnpm artisan queue:work        # process queued jobs
pnpm artisan schedule:work     # run cron scheduler
pnpm artisan event:list        # see registered events
pnpm artisan route:list        # not applicable (routes registered at runtime)
```
