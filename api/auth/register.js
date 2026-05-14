import { generateToken } from "../../lib/auth.js";
import { getUserStore, normalizeUser } from "../../lib/users-store.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ errors: ["Method not allowed."] });
    return;
  }

  try {
    const { errors, user } = normalizeUser(req.body || {});

    if (errors.length) {
      res.status(422).json({ errors });
      return;
    }

    const userStore = await getUserStore();
    const createdUser = await userStore.createUser(user);
    const token = generateToken(createdUser);

    res.status(201).json({ user: createdUser, token, message: "Account created successfully." });
  } catch (error) {
    if (error.message === "User with this email already exists") {
      res.status(409).json({ errors: [error.message] });
      return;
    }

    console.error(`Registration error: ${error.message}`);
    res.status(500).json({ errors: ["Registration failed."] });
  }
}
