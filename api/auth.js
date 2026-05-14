import { getUserStore, normalizeUser } from "../lib/users-store.js";
import { generateToken } from "../lib/auth.js";

const sendJson = (res, status, payload) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
};

export default async (req, res) => {
  if (req.method === "POST" && req.url === "/api/auth/register") {
    return handleRegister(req, res);
  }

  if (req.method === "POST" && req.url === "/api/auth/login") {
    return handleLogin(req, res);
  }

  sendJson(res, 404, { errors: ["Auth route not found"] });
};

const handleRegister = async (req, res) => {
  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }

    if (!chunks.length) {
      return sendJson(res, 400, { errors: ["Request body required"] });
    }

    let body;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      return sendJson(res, 400, { errors: ["Request body must be valid JSON."] });
    }

    const { errors, user } = normalizeUser(body);

    if (errors.length) {
      return sendJson(res, 422, { errors });
    }

    const userStore = await getUserStore();
    const createdUser = await userStore.createUser(user);
    const token = generateToken(createdUser);

    sendJson(res, 201, {
      user: createdUser,
      token,
      message: "User registered successfully"
    });
  } catch (error) {
    if (error.message === "User with this email already exists") {
      sendJson(res, 409, { errors: [error.message] });
    } else {
      console.error("Registration error:", error);
      sendJson(res, 500, { errors: ["Registration failed"] });
    }
  }
};

const handleLogin = async (req, res) => {
  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }

    if (!chunks.length) {
      return sendJson(res, 400, { errors: ["Request body required"] });
    }

    let body;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      return sendJson(res, 400, { errors: ["Request body must be valid JSON."] });
    }

    const { email, password } = body;

    if (!email || !password) {
      return sendJson(res, 400, { errors: ["Email and password are required"] });
    }

    const userStore = await getUserStore();
    const user = await userStore.validatePassword(email.toLowerCase(), password);

    if (!user) {
      return sendJson(res, 401, { errors: ["Invalid email or password"] });
    }

    const token = generateToken(user);

    sendJson(res, 200, {
      user,
      token,
      message: "Login successful"
    });
  } catch (error) {
    console.error("Login error:", error);
    sendJson(res, 500, { errors: ["Login failed"] });
  }
};
