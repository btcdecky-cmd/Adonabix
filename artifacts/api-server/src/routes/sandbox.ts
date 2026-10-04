import { Router, type IRouter } from "express";
import { getSandboxStatus } from "../lib/vercel-sandbox";

const router: IRouter = Router();

router.get("/sandbox/status", (_req, res) => {
  res.json(getSandboxStatus());
});

export default router;
