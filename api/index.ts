import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import { subscribeToRoomUpdates } from "../server/temporaryRooms";

const app = express();

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Serverless SSE stream
app.get("/api/temporary/stream", (req, res) => {
  const roomId = String(req.query.roomId || "");
  const inviteToken = String(req.query.inviteToken || "");
  const memberId = String(req.query.memberId || "");

  if (!roomId || !inviteToken || !memberId) {
    res.status(400).json({ error: "Missing required stream parameters." });
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  let unsubscribe: (() => void) | undefined;
  try {
    unsubscribe = subscribeToRoomUpdates(
      roomId,
      inviteToken,
      memberId,
      (snapshot) => {
        res.write(`data: ${JSON.stringify({ type: "snapshot", payload: snapshot })}\n\n`);
      },
      (reason) => {
        res.write(`data: ${JSON.stringify({ type: "closed", reason })}\n\n`);
        res.end();
      }
    );
  } catch (err: any) {
    res.write(`data: ${JSON.stringify({ type: "error", message: err.message || "Failed to subscribe." })}\n\n`);
    res.end();
    return;
  }

  req.on("close", () => {
    if (unsubscribe) unsubscribe();
  });
});

// tRPC API
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

export default app;
