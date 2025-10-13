import express from "express";
import isAuth from "../middleware/isAuth";

import * as SubscriptionController from "../controllers/SubscriptionController";

const subscriptionRoutes = express.Router();
subscriptionRoutes.post("/subscription", isAuth, SubscriptionController.createSubscription);
subscriptionRoutes.post("/subscription/create/webhook", SubscriptionController.createWebhook);
subscriptionRoutes.post("/subscription/webhook/:type?", SubscriptionController.webhook);

subscriptionRoutes.post("/subscription/mercadopago", isAuth, SubscriptionController.createMercadoPagoPayment);
subscriptionRoutes.post("/subscription/mp-webhook", SubscriptionController.mercadoPagoWebhook);
subscriptionRoutes.post(
  "/subscription/check-payment", 
  isAuth, 
  SubscriptionController.checkMercadoPagoPaymentStatus
);

subscriptionRoutes.post(
  "/subscription/cancel-payment",
  isAuth,
  SubscriptionController.cancelMercadoPagoPayment
);
export default subscriptionRoutes;
