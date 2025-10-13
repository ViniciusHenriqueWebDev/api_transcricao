"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const isAuth_1 = __importDefault(require("../middleware/isAuth"));
const PerformanceCampaignController = __importStar(require("../controllers/PerformanceCampaignController"));
const performanceCampaignRoutes = express_1.default.Router();
// Middleware para todas as rotas
performanceCampaignRoutes.use(isAuth_1.default);
// Rotas básicas CRUD
performanceCampaignRoutes.get("/performance-campaigns", PerformanceCampaignController.index);
performanceCampaignRoutes.post("/performance-campaigns", PerformanceCampaignController.store);
performanceCampaignRoutes.get("/performance-campaigns/:id", PerformanceCampaignController.show);
performanceCampaignRoutes.put("/performance-campaigns/:id", PerformanceCampaignController.update);
performanceCampaignRoutes.delete("/performance-campaigns/:id", PerformanceCampaignController.remove);
// Rota para obter resumo da campanha
performanceCampaignRoutes.get("/performance-campaigns/:id/summary", PerformanceCampaignController.getSummary);
exports.default = performanceCampaignRoutes;
