import { auth, setUser, clearUser, getUser } from "./authContext.js";

export {
  authMiddleware,
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  encryptToken,
  decryptToken,
} from "./auth.js";

export type { AuthGuard } from "./authContext.js";
export { auth, setUser, clearUser, getUser };

// Register on globalThis so auth(), setUser(), clearUser(), getUser() work everywhere without imports
Object.assign(globalThis, { auth, setUser, clearUser, getUser });
