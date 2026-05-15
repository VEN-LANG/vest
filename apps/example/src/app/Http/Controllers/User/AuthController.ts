import type { Request, Response } from "express";
import { AuthService } from "@app/Services/AuthService";
import { ValidationError } from "@app/Helpers/validator";
import { TProfile } from "@app/Http/types";
import { UserService } from "@app/Services/UserService";
import { UserRegistered } from "@app/Events";
import { Doc } from "@vest-ts/router";
import { auth } from "@app/Helpers/auth";

export class AuthController {
  public constructor(
    public authService: AuthService,
    public userService: UserService,
  ) {}
  @Doc({
    summary: "Register a new user",
    tags: ["Auth"],
    validationRules: {
      name: "required|string|max:191",
      email: "required|email|max:255",
      password: "required|string|min:6",
      password_confirmation: "required|string|min:6",
      profile: "nullable",
    },
    responses: [
      { status: 201, description: "User registered successfully" },
      { status: 422, description: "Validation error" },
    ],
  })
  async register(req: Request, res: Response, user_type?: string) {
    // validate incoming registration payload
    const rules: any = {
      name: "required|string|max:191",
      email: "required|email|max:255|unique:users,email",
      password: "required|string|min:6|confirmed",
      password_confirmation: "required|string|min:6",
      profile: "nullable",
    };
    try {
      const validated = (await req.validate(rules)) as any;
      // pick only allowed fields
      const clean: any = {
        name: validated.name,
        email: validated.email,
        password: validated.password,
      };
      const user = await this.authService.register(clean);

      if (validated.profile) {
        const profileData = validated.profile;
        delete validated.profile;
        if (user_type) {
          profileData.type = user_type;
        }

        const profileValidated = (await req.validate(
          { ...(profileData ?? {}) },
          {
            gender: "nullable|string|in:male,female",
            type: "nullable|string|max:50|in:admin,user,staff,employee,employer",
            id_number: "nullable|string|max:100",
            city: "nullable|string|max:100",
            country: "nullable|string|max:100",
            address: "nullable|string|max:255",
            zip_code: "nullable|string|max:20",
            date_of_birth: "nullable|date",
            metadata: "nullable",
          },
        )) as any as Partial<TProfile>;

        await this.userService.updateProfile(user.id as any, profileValidated as TProfile);

        const registered = new UserRegistered(String(user.id), user.email, user.name);
        await registered.dispatch();
      }
      return res.status(201).json(user);
    } catch (e) {
      if (e instanceof ValidationError)
        return res.status(422).json({ errors: e.errors, messages: e.messages });
      throw e;
    }
  }

  @Doc({
    summary: "Login",
    description: "Authenticate with email and password to receive a JWT token.",
    tags: ["Auth"],
    validationRules: {
      email: "required|email|max:255",
      password: "required|string|min:6",
    },
    responses: [
      { status: 200, description: "Login successful", example: { token: "eyJ...", user: {} } },
      { status: 401, description: "Invalid credentials" },
      { status: 422, description: "Validation error" },
    ],
  })
  async login(req: Request, res: Response) {
    const rules: any = {
      email: "required|email|max:255",
      password: "required|string|min:6",
    };
    try {
      const validated = (await req.validate(rules)) as any;
      const clean: any = {
        email: validated.email,
        password: validated.password,
      };
      const result = await this.authService.login(clean.email, clean.password);
      if (!result) return res.status(401).json({ message: "Invalid credentials" });
      return res.json(result);
    } catch (e) {
      if (e instanceof ValidationError)
        return res.status(422).json({ errors: e.errors, messages: e.messages });
      throw e;
    }
  }
  @Doc({
    summary: "Get current user",
    description: "Returns the authenticated user profile.",
    tags: ["Auth"],
    auth: true,
  })
  async me(req: Request, res: Response) {
    const user = await auth()?.user()?.toJSON();
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    res.json({ data: user });
  }
}
