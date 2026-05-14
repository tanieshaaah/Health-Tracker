import { getEntryStore, normalizeEntry, sendError } from "../../lib/entries-store.js";
import { requireAuth } from "../../lib/auth.js";

async function handler(req, res) {
  try {
    const store = await getEntryStore();

    if (req.method === "GET") {
      const entries = await store.listEntries(req.user.id);
      const sortedEntries = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
      res.status(200).json(sortedEntries);
      return;
    }

    if (req.method === "POST") {
      const { errors, entry } = normalizeEntry(req.body || {});

      if (errors.length) {
        res.status(422).json({ errors });
        return;
      }

      await store.createEntry(entry, req.user.id);
      res.status(201).json(entry);
      return;
    }

    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ errors: ["Method not allowed."] });
  } catch (error) {
    sendError(res, error);
  }
}

export default requireAuth(handler);
