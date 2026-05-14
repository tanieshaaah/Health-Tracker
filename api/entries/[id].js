import { getEntryStore, sendError } from "../../lib/entries-store.js";
import { requireAuth } from "../../lib/auth.js";

async function handler(req, res) {
  if (req.method !== "DELETE") {
    res.setHeader("Allow", "DELETE");
    res.status(405).json({ errors: ["Method not allowed."] });
    return;
  }

  try {
    const store = await getEntryStore();
    const deleted = await store.deleteEntry(req.query.id, req.user.id);

    if (!deleted) {
      res.status(404).json({ errors: ["Entry not found."] });
      return;
    }

    res.status(200).json({ deleted: req.query.id });
  } catch (error) {
    sendError(res, error);
  }
}

export default requireAuth(handler);
