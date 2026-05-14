import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";

try {
  process.loadEnvFile?.();
} catch {
  // Vercel and CI provide environment variables directly, so a missing .env is fine.
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_DATA_FILE = path.join(__dirname, "..", "data", "users.json");
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "vitalroad";
const MONGODB_USERS_COLLECTION = process.env.MONGODB_USERS_COLLECTION || "users";

let mongoClientPromise;
let userStorePromise;

const readUsers = async () => {
  if (!existsSync(USERS_DATA_FILE)) {
    return [];
  }

  const raw = await readFile(USERS_DATA_FILE, "utf8");
  return JSON.parse(raw);
};

const saveUsers = async (users) => {
  await writeFile(USERS_DATA_FILE, `${JSON.stringify(users, null, 2)}\n`);
};

const createJsonUserStore = () => ({
  name: "json",
  async listUsers() {
    return readUsers();
  },
  async findUserByEmail(email) {
    const users = await readUsers();
    return users.find(user => user.email === email);
  },
  async findUserById(id) {
    const users = await readUsers();
    return users.find(user => user.id === id);
  },
  async createUser(userData) {
    const users = await readUsers();

    // Check if user already exists
    if (users.some(user => user.email === userData.email)) {
      throw new Error("User with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);
    const user = {
      id: crypto.randomUUID(),
      email: userData.email,
      password: hashedPassword,
      name: userData.name,
      age: userData.age,
      createdAt: new Date().toISOString()
    };

    users.push(user);
    await saveUsers(users);
    return { id: user.id, email: user.email, name: user.name, age: user.age, createdAt: user.createdAt };
  },
  async validatePassword(email, password) {
    const user = await this.findUserByEmail(email);
    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? { id: user.id, email: user.email, name: user.name, age: user.age } : null;
  }
});

const getMongoClient = async () => {
  if (!mongoClientPromise) {
    const { MongoClient } = await import("mongodb");
    const client = new MongoClient(MONGODB_URI, {
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000
    });
    mongoClientPromise = client.connect();
  }

  return mongoClientPromise;
};

const createMongoUserStore = async () => {
  const client = await getMongoClient();
  const collection = client.db(MONGODB_DB).collection(MONGODB_USERS_COLLECTION);
  await collection.createIndex({ email: 1 }, { unique: true });
  await collection.createIndex({ id: 1 }, { unique: true });

  return {
    name: "mongodb",
    async listUsers() {
      return collection.find({}, { projection: { _id: 0, password: 0 } }).toArray();
    },
    async findUserByEmail(email) {
      return collection.findOne({ email }, { projection: { _id: 0 } });
    },
    async findUserById(id) {
      return collection.findOne({ id }, { projection: { _id: 0 } });
    },
    async createUser(userData) {
      const existingUser = await collection.findOne({ email: userData.email });
      if (existingUser) {
        throw new Error("User with this email already exists");
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);
      const user = {
        id: crypto.randomUUID(),
        email: userData.email,
        password: hashedPassword,
        name: userData.name,
        age: userData.age,
        createdAt: new Date().toISOString()
      };

      await collection.insertOne(user);
      return { id: user.id, email: user.email, name: user.name, age: user.age, createdAt: user.createdAt };
    },
    async validatePassword(email, password) {
      const user = await collection.findOne({ email });
      if (!user) {
        return null;
      }

      const isValid = await bcrypt.compare(password, user.password);
      return isValid ? { id: user.id, email: user.email, name: user.name, age: user.age } : null;
    }
  };
};

export const getUserStore = async () => {
  if (!userStorePromise) {
    userStorePromise = MONGODB_URI ? createMongoUserStore() : Promise.resolve(createJsonUserStore());
  }

  return userStorePromise;
};

export const normalizeUser = (body) => {
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const name = String(body.name || "").trim();
  const age = Number(body.age);

  const errors = [];

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Please provide a valid email address.");
  }

  if (!password || password.length < 6) {
    errors.push("Password must be at least 6 characters long.");
  }

  if (!name || name.length < 2) {
    errors.push("Name must be at least 2 characters long.");
  }

  if (!Number.isInteger(age) || age < 13 || age > 120) {
    errors.push("Age must be a whole number between 13 and 120.");
  }

  return {
    errors,
    user: {
      email,
      password,
      name,
      age
    }
  };
};
