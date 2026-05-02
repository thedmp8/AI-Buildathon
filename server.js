import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC_DIR = resolve(ROOT_DIR, "public");
const PORT = Number(process.env.PORT || 3001);
const HOST = process.env.HOST || "127.0.0.1";
const DEFAULT_MODEL = "gpt-5.5";

loadDotEnv();

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml"
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);

    if (req.method === "POST" && url.pathname === "/api/chat") {
      await handleChat(req, res);
      return;
    }

    if ((req.method === "GET" || req.method === "HEAD") && url.pathname === "/courses.json") {
      await serveRootJson("courses.json", "Course data not found", req.method === "HEAD", res);
      return;
    }

    if ((req.method === "GET" || req.method === "HEAD") && url.pathname === "/anu_programs.json") {
      await serveRootJson("anu_programs.json", "Program data not found", req.method === "HEAD", res);
      return;
    }

    if (
      (req.method === "GET" || req.method === "HEAD") &&
      url.pathname === "/elective_subject_areas.json"
    ) {
      await serveRootJson(
        "elective_subject_areas.json",
        "Elective subject area data not found",
        req.method === "HEAD",
        res
      );
      return;
    }

    if (req.method === "GET" || req.method === "HEAD") {
      await serveStatic(url.pathname, req.method === "HEAD", res);
      return;
    }

    sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: "Unexpected server error" });
  }
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    const nextPort = PORT + 1;
    console.error(
      `Port ${PORT} is already in use. Stop the existing server or run this app with PORT=${nextPort} npm start.`
    );
    process.exit(1);
  }

  console.error(error);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  const displayHost = HOST === "0.0.0.0" ? "localhost" : HOST;
  console.log(`ChatGPT API website running at http://${displayHost}:${PORT}`);
});

async function handleChat(req, res) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    sendJson(res, 500, {
      error: "Missing OPENAI_API_KEY. Add it to .env or set it before starting the server."
    });
    return;
  }

  const body = await readJson(req);
  const messages = normalizeMessages(body.messages);

  if (!messages.some((message) => message.role === "user")) {
    sendJson(res, 400, { error: "Send at least one user message." });
    return;
  }

  const openAIResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
      instructions:
        process.env.OPENAI_INSTRUCTIONS ||
        "You are a helpful assistant embedded in a simple website. Keep answers concise and practical.",
      input: messages
    })
  });

  const data = await openAIResponse.json().catch(() => ({}));

  if (!openAIResponse.ok) {
    sendJson(res, openAIResponse.status, {
      error: data.error?.message || "OpenAI API request failed."
    });
    return;
  }

  sendJson(res, 200, {
    id: data.id,
    model: data.model,
    reply: extractOutputText(data)
  });
}

async function serveStatic(pathname, headOnly, res) {
  const decodedPath = decodeURIComponent(pathname);
  const relativePath = decodedPath === "/" ? "/index.html" : decodedPath;
  const filePath = resolve(PUBLIC_DIR, `.${relativePath}`);

  if (!filePath.startsWith(`${PUBLIC_DIR}${sep}`) && filePath !== PUBLIC_DIR) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  try {
    const fileInfo = await stat(filePath);

    if (!fileInfo.isFile()) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }

    const type = mimeTypes[extname(filePath)] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": type });

    if (!headOnly) {
      res.end(await readFile(filePath));
    } else {
      res.end();
    }
  } catch {
    sendJson(res, 404, { error: "Not found" });
  }
}

async function serveRootJson(fileName, notFoundMessage, headOnly, res) {
  const filePath = resolve(ROOT_DIR, fileName);

  try {
    const fileInfo = await stat(filePath);

    if (!fileInfo.isFile()) {
      sendJson(res, 404, { error: notFoundMessage });
      return;
    }

    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });

    if (!headOnly) {
      res.end(await readFile(filePath));
    } else {
      res.end();
    }
  } catch {
    sendJson(res, 404, { error: notFoundMessage });
  }
}

function readJson(req) {
  return new Promise((resolvePromise, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;

      if (raw.length > 1_000_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      try {
        resolvePromise(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });

    req.on("error", reject);
  });
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter((message) => ["user", "assistant"].includes(message.role))
    .map((message) => ({
      role: message.role,
      content: String(message.content || "").slice(0, 8000)
    }))
    .filter((message) => message.content.trim())
    .slice(-20);
}

function extractOutputText(data) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const textParts = [];

  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === "string") {
        textParts.push(content.text);
      }
    }
  }

  return textParts.join("\n\n").trim() || "No text response returned.";
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function loadDotEnv() {
  const envPath = resolve(ROOT_DIR, ".env");

  if (!existsSync(envPath)) {
    return;
  }

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] ||= value;
  }
}
