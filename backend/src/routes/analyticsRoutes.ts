import express from "express";
import isAuth from "../middleware/isAuth";
import checkFeatureEnabledMiddleware from "../middleware/checkFeatureEnabledMiddleware";
import * as AnalyticsController from "../controllers/AnalyticsController";

const analyticsRoutes = express.Router();

// CORREÇÃO - Use o nome correto da feature
analyticsRoutes.use(isAuth, checkFeatureEnabledMiddleware("analytics_dashboard"));

analyticsRoutes.get("/analytics/dashboard", AnalyticsController.getDashboardData);
analyticsRoutes.get("/dashboard/period/:period", AnalyticsController.getPredefinedPeriod);
analyticsRoutes.get("/analytics/users", AnalyticsController.getTicketsByUser);
analyticsRoutes.get("/analytics/status", AnalyticsController.getTicketsByStatus);
analyticsRoutes.get("/analytics/queues", AnalyticsController.getTicketsByQueue);
analyticsRoutes.get("/analytics/whatsapps", AnalyticsController.getTicketsByWhatsapp);
analyticsRoutes.get("/analytics/time", AnalyticsController.getTicketsByTime);
analyticsRoutes.get("/analytics/evolution", AnalyticsController.getTicketsEvolution);
analyticsRoutes.get("/analytics/tags", AnalyticsController.getTopTags);
analyticsRoutes.get("/analytics/efficiency", AnalyticsController.getQueueEfficiency);

export default analyticsRoutes;