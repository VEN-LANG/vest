# Create Vest

`create-vest` is an alternative scaffolding tool for creating new LaraNode applications using the `@vest/*` namespace.

## Usage

```bash
pnpm create vest my-app
cd my-app
pnpm install
```

## Interactive Prompts

The CLI will ask:

- **Project name** -- Your application name
- **Database driver** -- MySQL or MongoDB
- **Optional packages** -- Select additional packages

## Generated Structure

Same as `create-laranode`:

```
my-app/
├── src/
│   ├── app/
│   │   ├── Events/
│   │   ├── Http/Controllers/
│   │   ├── Jobs/
│   │   ├── Listeners/
│   │   ├── Mail/
│   │   ├── Middleware/
│   │   ├── Models/
│   │   ├── Observers/
│   │   ├── Providers/
│   │   └── Services/
│   ├── bootstrap/app.ts
│   ├── config/
│   ├── database/migrations/
│   ├── database/seeders/
│   ├── routes/
│   ├── artisan.ts
│   └── server.ts
├── .env.example
├── .gitignore
├── package.json
└── tsconfig.json
```

## Package Namespace

Uses `@vest/*` package namespace:

```json
{
  "dependencies": {
    "@vest/core": "latest",
    "@vest/db": "latest",
    "@vest/router": "latest"
  }
}
```

## create-laranode vs create-vest

| Feature | create-laranode | create-vest |
|---------|-----------------|-------------|
| Namespace | `@lara-node/*` | `@vest/*` |
| Structure | Same | Same |
| Features | Same | Same |

Choose based on your preferred package namespace.

## Next Steps

- [Create LaraNode](/cli/create-laranode) -- Main scaffolder
- [Getting Started](/guide/getting-started) -- Quick start
- [Project Structure](/guide/project-structure) -- Directory layout
