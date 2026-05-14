import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

try {
  process.loadEnvFile?.();
} catch {
  // Vercel and CI provide environment variables directly, so a missing .env is fine.
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, "..", "data", "entries.json");
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB || "vitalroad";
const MONGODB_COLLECTION = process.env.MONGODB_COLLECTION || "entries";

let mongoClientPromise;
let entryStorePromise;
let lastLoggedError = "";

const readEntries = async () => {
  if (!existsSync(DATA_FILE)) {
    return [];
  }

  const raw = await readFile(DATA_FILE, "utf8");
  return JSON.parse(raw);
};

const saveEntries = async (entries) => {
  await writeFile(DATA_FILE, `${JSON.stringify(entries, null, 2)}\n`);
};

const createJsonStore = () => ({
  name: "json",
  async listEntries(userId) {
    const entries = await readEntries();
    return userId ? entries.filter((entry) => entry.userId === userId) : entries;
  },
  async createEntry(entry, userId) {
    const entries = await readEntries();
    const scopedEntry = userId ? { ...entry, userId } : entry;
    entries.push(scopedEntry);
    await saveEntries(entries);
    return scopedEntry;
  },
  async deleteEntry(id, userId) {
    const entries = await readEntries();
    const filteredEntries = entries.filter((entry) => entry.id !== id || (userId && entry.userId !== userId));

    if (filteredEntries.length === entries.length) {
      return false;
    }

    await saveEntries(filteredEntries);
    return true;
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

const createMongoStore = async () => {
  const client = await getMongoClient();
  const collection = client.db(MONGODB_DB).collection(MONGODB_COLLECTION);
  await collection.createIndex({ id: 1 }, { unique: true });
  await collection.createIndex({ userId: 1, date: -1 });

  return {
    name: "mongodb",
    async listEntries(userId) {
      const query = userId ? { userId } : {};
      return collection.find(query, { projection: { _id: 0 } }).sort({ date: -1 }).toArray();
    },
    async createEntry(entry, userId) {
      const scopedEntry = userId ? { ...entry, userId } : entry;
      await collection.insertOne(scopedEntry);
      return scopedEntry;
    },
    async deleteEntry(id, userId) {
      const query = userId ? { id, userId } : { id };
      const result = await collection.deleteOne(query);
      return result.deletedCount > 0;
    }
  };
};

export const getEntryStore = async () => {
  if (!entryStorePromise) {
    entryStorePromise = MONGODB_URI ? createMongoStore() : Promise.resolve(createJsonStore());
  }

  return entryStorePromise;
};

export const normalizeEntry = (body) => {
  const date = String(body.date || "").trim();
  const mood = String(body.mood || "").trim();
  const notes = String(body.notes || "").trim();
  const steps = Number(body.steps);
  const sleep = Number(body.sleep);
  const water = Number(body.water);

  const errors = [];

  if (!date || Number.isNaN(Date.parse(date))) errors.push("Choose a valid date.");
  if (!Number.isFinite(steps) || steps < 0) errors.push("Steps must be zero or more.");
  if (!Number.isFinite(sleep) || sleep < 0 || sleep > 24) errors.push("Sleep must be between 0 and 24 hours.");
  if (!Number.isFinite(water) || water < 0) errors.push("Water must be zero or more glasses.");
  if (!mood) errors.push("Select a mood.");

  return {
    errors,
    entry: {
      id: crypto.randomUUID(),
      date,
      steps: Math.round(steps),
      sleep: Number(sleep.toFixed(1)),
      water: Math.round(water),
      mood,
      notes,
      createdAt: new Date().toISOString()
    }
  };
};

export const calculateStats = (entries) => {
  const total = entries.length || 1;
  const sum = (field) => entries.reduce((value, entry) => value + Number(entry[field] || 0), 0);

  return {
    entryCount: entries.length,
    averageSteps: Math.round(sum("steps") / total),
    averageSleep: Number((sum("sleep") / total).toFixed(1)),
    averageWater: Number((sum("water") / total).toFixed(1)),
    bestStepDay: entries.reduce((best, entry) => (entry.steps > (best?.steps || 0) ? entry : best), null)
  };
};

export const sendError = (res, error) => {
  const message = error?.message || "Unknown error";
  const fingerprint = `${error?.name || "Error"}:${error?.code || ""}:${message}`;

  if (fingerprint !== lastLoggedError) {
    lastLoggedError = fingerprint;
    console.error(`${error?.name || "Error"}: ${message}`);
  }

  if (error.name === "MongoServerSelectionError" || error.code === "ECONNREFUSED") {
    res.status(503).json({
      errors: [
        "MongoDB Atlas is not reachable from this machine. Check Atlas Network Access, cluster status, and your internet/DNS connection."
      ]
    });
    return;
  }

  res.status(500).json({ errors: ["Unexpected server error."] });
};
