import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { calculateStats, getEntryStore, normalizeEntry, sendError } from "./lib/entries-store.js";
import { requireAuth } from "./lib/auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const MAX_PORT_ATTEMPTS = 10;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8"
};

const sendJson = (res, status, payload) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
};

const openBrowser = (url) => {
  if (process.env.NO_OPEN === "true" || process.env.VERCEL || process.env.CI || process.env.RENDER || process.env.NODE_ENV === "production") {
    return;
  }

  const commands = {
    win32: ["cmd", ["/c", "start", "", url]],
    darwin: ["open", [url]],
    linux: ["xdg-open", [url]]
  };
  const [command, args] = commands[process.platform] || commands.win32;
  const child = spawn(command, args, { detached: true, stdio: "ignore" });
  child.once("error", () => { }); // Silently ignore if browser open fails
  child.unref();
};

const parseBody = async (req) => {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return null;
  }
};

const handleApi = async (req, res, url) => {
  if (!url.pathname.startsWith("/api/")) {
    return false;
  }

  // Auth routes (public)
  if (url.pathname === "/api/auth/register" || url.pathname === "/api/auth/login") {
    const authHandler = await import("./api/auth.js");
    await authHandler.default(req, res);
    return true;
  }

  // Health check (public)
  if (url.pathname === "/api/health" && req.method === "GET") {
    const store = await getEntryStore();
    sendJson(res, 200, { status: "ok", service: "VitalRoad API", database: store.name });
    return true;
  }

  // Protected routes - require authentication
  if (url.pathname === "/api/entries" && req.method === "GET") {
    await requireAuth(async (req, res) => {
      const store = await getEntryStore();
      const entries = await store.listEntries(req.user.id);
      const sortedEntries = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date));
      sendJson(res, 200, sortedEntries);
    })(req, res);
    return true;
  }

  if (url.pathname === "/api/stats" && req.method === "GET") {
    await requireAuth(async (req, res) => {
      const store = await getEntryStore();
      const entries = await store.listEntries(req.user.id);
      sendJson(res, 200, calculateStats(entries));
    })(req, res);
    return true;
  }

  if (url.pathname === "/api/entries" && req.method === "POST") {
    await requireAuth(async (req, res) => {
      const body = await parseBody(req);

      if (body === null) {
        sendJson(res, 400, { errors: ["Request body must be valid JSON."] });
        return;
      }

      const { errors, entry } = normalizeEntry(body);

      if (errors.length) {
        sendJson(res, 422, { errors });
        return;
      }

      const store = await getEntryStore();
      await store.createEntry(entry, req.user.id);
      sendJson(res, 201, entry);
    })(req, res);
    return true;
  }

  const entryId = url.pathname.match(/^\/api\/entries\/(?<id>[\w-]+)$/)?.groups?.id;

  if (entryId && req.method === "DELETE") {
    await requireAuth(async (req, res) => {
      const store = await getEntryStore();
      const deleted = await store.deleteEntry(entryId, req.user.id);

      if (!deleted) {
        sendJson(res, 404, { errors: ["Entry not found."] });
        return;
      }

      sendJson(res, 200, { deleted: entryId });
    })(req, res);
    return true;
  }

  sendJson(res, 404, { errors: ["API route not found."] });
  return true;
};

const serveStatic = async (req, res, url) => {
  const requestedPath =
    url.pathname === "/" ? "/landing.html" :
    url.pathname === "/app" ? "/index.html" :
    url.pathname;
  const safePath = path.normalize(decodeURIComponent(requestedPath)).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(__dirname, "public", safePath);

  if (!filePath.startsWith(path.join(__dirname, "public"))) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const file = await readFile(filePath);
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    res.end(file);
  } catch {
    const indexFile = await readFile(path.join(__dirname, "public", "index.html"));
    res.writeHead(200, { "Content-Type": mimeTypes[".html"] });
    res.end(indexFile);
  }
};

const createAppServer = () => createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  try {
    const handled = await handleApi(req, res, url);

    if (!handled) {
      await serveStatic(req, res, url);
    }
  } catch (error) {
    sendError({ status: (status) => ({ json: (payload) => sendJson(res, status, payload) }) }, error);
  }
});

const listen = (port, attemptsLeft = MAX_PORT_ATTEMPTS) => {
  const server = createAppServer();

  server.once("error", (error) => {
    if (error.code === "EADDRINUSE" && attemptsLeft > 0) {
      console.warn(`Port ${port} is already in use. Trying ${port + 1}...`);
      listen(port + 1, attemptsLeft - 1);
      return;
    }

    throw error;
  });

  server.once("listening", () => {
    const address = server.address();
    const activePort = typeof address === "object" && address ? address.port : port;
    const url = `http://localhost:${activePort}`;
    console.log(`VitalRoad is running at ${url}`);
    openBrowser(url);
  });

  server.listen(port);
};

listen(PORT);