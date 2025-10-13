import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as FeatureController from "../controllers/FeatureController";

const featureRoutes = Router();

featureRoutes.get("/features", isAuth, FeatureController.index);
featureRoutes.get("/companies/:companyId/features", isAuth, FeatureController.listCompanyFeatures);
featureRoutes.put("/companies/:companyId/features", isAuth, FeatureController.update);
featureRoutes.get("/companies/:companyId/features/check", isAuth, FeatureController.check);

export default featureRoutes;