import express from "express";
import isAuth from "../middleware/isAuth";

import * as PerformanceCampaignController from "../controllers/PerformanceCampaignController";

const performanceCampaignRoutes = express.Router();

// Middleware para todas as rotas
performanceCampaignRoutes.use(isAuth);

// Rotas básicas CRUD
performanceCampaignRoutes.get("/performance-campaigns", PerformanceCampaignController.index);
performanceCampaignRoutes.post("/performance-campaigns", PerformanceCampaignController.store);
performanceCampaignRoutes.get("/performance-campaigns/:id", PerformanceCampaignController.show);
performanceCampaignRoutes.put("/performance-campaigns/:id", PerformanceCampaignController.update);
performanceCampaignRoutes.delete("/performance-campaigns/:id", PerformanceCampaignController.remove);

// Rota para obter resumo da campanha
performanceCampaignRoutes.get("/performance-campaigns/:id/summary", PerformanceCampaignController.getSummary);

export default performanceCampaignRoutes;