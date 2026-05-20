# Route Model Binding

Route model binding automatically resolves route parameters to model instances.

## Binding Models

Use the `@Bind()` decorator on a model:

```typescript
import { Model, Bind } from "@lara-node/db";

@Bind("user")
class User extends Model {
  static table = "users";
}
```

Now routes with `:user` parameter automatically resolve:

```typescript
Route.get("/users/:user", (req) => {
  // req.user is already the User model instance
  return req.user;
});
```

## Controller Usage

```typescript
@Route("/api/users")
class UserController {
  @Route.get("/:user")
  async show(req: Request) {
    // req.user is the resolved User model
    return req.user;
  }

  @Route.put("/:user")
  async update(req: Request) {
    const user = req.user;
    return user.update(req.body);
  }
}
```

## Custom Resolution

You can customize how models are resolved:

```typescript
Route.model("user", async (value) => {
  return User.where("slug", value).firstOrFail();
});
```

## Enable Auto Model Binding

```typescript
Route.enableAutoModelBinding();
```

## Next Steps

- [Controllers](/packages/router/controllers) -- Controller decorators
- [Resource Routes](/packages/router/resource) -- RESTful routing
- [Models](/packages/db/models) -- Working with models
