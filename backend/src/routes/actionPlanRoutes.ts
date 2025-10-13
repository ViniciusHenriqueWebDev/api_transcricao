import express from "express";
import isAuth from "../middleware/isAuth";
import * as ActionPlanController from "../controllers/ActionPlanController";

const actionPlanRoutes = express.Router();

actionPlanRoutes.get("/action-plans", isAuth, ActionPlanController.index);
actionPlanRoutes.get("/action-plans/:id", isAuth, ActionPlanController.show);
actionPlanRoutes.post("/action-plans", isAuth, ActionPlanController.store);
actionPlanRoutes.put("/action-plans/:id", isAuth, ActionPlanController.update);
actionPlanRoutes.delete("/action-plans/:id", isAuth, ActionPlanController.remove);

export default actionPlanRoutes;