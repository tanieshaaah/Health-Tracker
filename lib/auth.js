import jwt from "jsonwebtoken";
import { getUserStore } from "./users-store.js";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

export const generateToken = (user) => {
  return jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export const authenticate = async (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return null;
  }

  const userStore = await getUserStore();
  const user = await userStore.findUserById(decoded.userId);
    return user ? { id: user.id, email: user.email, name: user.name, age: user.age } : null;
};

const sendJson = (res, status, payload) => {
  if (typeof res.status === "function") {
    res.status(status).json(payload);
    return;
  }

  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(payload));
};

export const requireAuth = (handler) => {
  return async (req, res, ...args) => {
    const user = await authenticate(req);
    if (!user) {
      sendJson(res, 401, { errors: ["Authentication required"] });
      return;
    }

    req.user = user;
    return handler(req, res, ...args);
  };
};
