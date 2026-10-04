import { Router, type IRouter } from "express";
import healthRouter from "./health";
import agentRouter from "./agent";
import sandboxRouter from "./sandbox";

const router: IRouter = Router();

router.use(healthRouter);
router.use(agentRouter);
router.use(sandboxRouter);

export default router;
