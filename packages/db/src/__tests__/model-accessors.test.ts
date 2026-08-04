import { describe, expect, it } from "vitest";
import { Model } from "../Model.js";

/*
|--------------------------------------------------------------------------
| Typed accessors read attributes
|--------------------------------------------------------------------------
|
| A model is returned as a Proxy, and the trap is what turns `user.email`
| into a lookup in the attribute bag. Subclass *methods* were already bound
| to that proxy so `this.email` worked inside them. Getters were not — and
| could not be, because the trap discovered "is this a function?" by reading
| `target[prop]`, which invokes a getter, bound to the raw instance.
|
| The result was a getter that silently returned undefined:
|
|   get tierCode(): string { return String(this.code); }  // "undefined"
|
| Silently is the operative word. Nothing threw; models simply reported empty
| fields, and the damage showed up somewhere far away — a price computed as
| zero, a status that read as its default.
|
*/

class Tier extends Model {
  static table = "tiers";

  get tierCode(): string {
    return String(this.code);
  }

  get displayName(): string {
    return String(this.display_name ?? this.code);
  }

  /** Getters that lean on other getters have to work too. */
  get label(): string {
    return `${this.tierCode} — ${this.displayName}`;
  }

  isActive(): boolean {
    return this.active !== false;
  }
}

interface Tier {
  code?: string;
  display_name?: string;
  active?: boolean;
  status?: string;
}

describe("Model proxy — subclass getters", () => {
  it("resolves attribute access inside a getter", () => {
    const tier = new Tier({ code: "GROWTH", display_name: "Growth" });

    expect(tier.tierCode).toBe("GROWTH");
    expect(tier.displayName).toBe("Growth");
  });

  it("falls back within a getter when the attribute is absent", () => {
    const tier = new Tier({ code: "GROWTH" });

    expect(tier.displayName).toBe("GROWTH");
  });

  it("lets one getter call another", () => {
    const tier = new Tier({ code: "GROWTH", display_name: "Growth" });

    expect(tier.label).toBe("GROWTH — Growth");
  });

  it("still resolves attribute access inside a method", () => {
    expect(new Tier({ active: false }).isActive()).toBe(false);
    expect(new Tier({ active: true }).isActive()).toBe(true);
  });

  it("gives a stored attribute priority over a same-named getter", () => {
    // Reading `this.status` inside `get status()` must not recurse — the
    // attribute answers first, which is what makes the whole scheme safe.
    class Loud extends Model {
      static table = "loud";
      get status(): string {
        return String((this as unknown as { status?: string }).status ?? "PENDING");
      }
    }

    expect((new Loud({ status: "SENT" }) as unknown as { status: string }).status).toBe("SENT");
  });

  it("keeps plain attribute access working", () => {
    const tier = new Tier({ code: "GROWTH" });

    expect(tier.code).toBe("GROWTH");
    expect(tier.getAttribute("code")).toBe("GROWTH");
  });
});
