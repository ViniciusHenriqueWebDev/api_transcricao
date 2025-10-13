import { Router } from "express";
import * as WebHooksController from "../controllers/WebhookController";

const webhookRoutes = Router();

// ✅ WEBHOOK PRINCIPAL (Facebook + Instagram unificado)
webhookRoutes.get("/", WebHooksController.index);
webhookRoutes.post("/", WebHooksController.webHook);

// ✅ WEBHOOK ESPECÍFICO INSTAGRAM
webhookRoutes.get("/instagram", WebHooksController.index);
webhookRoutes.post("/instagram", WebHooksController.instagramWebhook);

// ✅ OAUTH CALLBACK DO INSTAGRAM (AGORA NO WEBHOOK CONTROLLER)
webhookRoutes.get("/instagram/oauth", WebHooksController.instagramOAuth);
webhookRoutes.get("/instagram/callback", WebHooksController.instagramOAuth);

export default webhookRoutes;