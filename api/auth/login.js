import { generateToken } from "../../lib/auth.js";
import { getUserStore } from "../../lib/users-store.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ errors: ["Method not allowed."] });
    return;
  }

  try {
    const email = String(req.body?.email || "").trim().toLowerCase();
    const password = String(req.body?.password || "");

    if (!email || !password) {
      res.status(400).json({ errors: ["Email and password are required."] });
      return;
    }

    const userStore = await getUserStore();
    const user = await userStore.validatePassword(email, password);

    if (!user) {
      res.status(401).json({ errors: ["Invalid email or password."] });
      return;
    }

    const token = generateToken(user);
    res.status(200).json({ user, token, message: "Login successful." });
  } catch (error) {
    console.error(`Login error: ${error.message}`);
    res.status(500).json({ errors: ["Login failed."] });
  }
}
