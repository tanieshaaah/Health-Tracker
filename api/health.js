import { getEntryStore, sendError } from "../lib/entries-store.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ errors: ["Method not allowed."] });
    return;
  }

  try {
    const store = await getEntryStore();
    res.status(200).json({ status: "ok", service: "VitalRoad API", database: store.name });
  } catch (error) {
    sendError(res, error);
  }
}
