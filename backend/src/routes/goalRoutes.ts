import express from "express";
import isAuth from "../middleware/isAuth";
import checkFeatureEnabledMiddleware from "../middleware/checkFeatureEnabledMiddleware";
import * as GoalController from "../controllers/GoalController";
import * as GoalMessageController from "../controllers/GoalMessageController";

const goalRoutes = express.Router();

// Todas as rotas requerem autenticação
goalRoutes.use(isAuth);

// Rotas específicas com verificação de feature
goalRoutes.get("/goals", checkFeatureEnabledMiddleware(["goals-management", "analytics_dashboard"]), GoalController.index);
goalRoutes.post("/goals", checkFeatureEnabledMiddleware("goals-management"), GoalController.store);
goalRoutes.get("/goals/:id", checkFeatureEnabledMiddleware(["goals-management", "analytics_dashboard"]), GoalController.show);
goalRoutes.put("/goals/:id", checkFeatureEnabledMiddleware("goals-management"), GoalController.update);
goalRoutes.delete("/goals/:id", checkFeatureEnabledMiddleware("goals-management"), GoalController.remove);

goalRoutes.put("/goals/:id/progress", checkFeatureEnabledMiddleware("goals-management"), GoalController.updateProgress);
goalRoutes.put("/goals/:id/reward-status", checkFeatureEnabledMiddleware("goals-management"), GoalController.updateRewardStatus);
goalRoutes.put("/goals/:id/employee-progress", checkFeatureEnabledMiddleware("goals-management"), GoalController.updateEmployeeProgress);
goalRoutes.post("/goals/send-message", checkFeatureEnabledMiddleware("goals-management"), GoalMessageController.sendGoalMessage);

export default goalRoutes;