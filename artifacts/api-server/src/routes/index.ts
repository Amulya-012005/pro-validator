import { Router, type IRouter } from "express";
import healthRouter from "./health";
import detectionRouter from "./detection";
import historyRouter from "./history";
import analyticsRouter from "./analytics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(detectionRouter);
router.use(historyRouter);
router.use(analyticsRouter);

export default router;
