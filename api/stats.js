import { calculateStats, getEntryStore, sendError } from "../lib/entries-store.js";
import { requireAuth } from "../lib/auth.js";

async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ errors: ["Method not allowed."] });
    return;
  }

  try {
    const store = await getEntryStore();
    const entries = await store.listEntries(req.user.id);
    res.status(200).json(calculateStats(entries));
  } catch (error) {
    sendError(res, error);
  }
}

export default requireAuth(handler);
