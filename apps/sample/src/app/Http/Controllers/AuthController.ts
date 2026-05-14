import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import { generateToken } from "@vest/auth";
import { User } from "../../Models/User.js";

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(422).json({ error: "name, email and password are required" });
      return;
    }

    const exists = await User.where("email", email).first();
    if (exists) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const user = await User.create({ name, email, password: await bcrypt.hash(password, 10) });

    const token = generateToken({ sub: String(user.id ?? ""), email: String(user.email ?? "") });
    res.status(201).json({ user: { id: user.id, name: user.name, email: user.email }, token });
  }

  async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;

    const user = await User.where("email", email).first();
    if (!user || !(await bcrypt.compare(String(password), String(user.password ?? "")))) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = generateToken({ sub: String(user.id ?? ""), email: String(user.email ?? "") });
    res.json({ user: { id: user.id, name: user.name, email: user.email }, token });
  }

  async me(req: Request, res: Response): Promise<void> {
    const user = (req as any).user;
    res.json({ id: user.id, name: user.name, email: user.email });
  }
}
