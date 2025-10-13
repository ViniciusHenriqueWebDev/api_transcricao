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
const checkFeatureEnabledMiddleware_1 = __importDefault(require("../middleware/checkFeatureEnabledMiddleware"));
const GoalController = __importStar(require("../controllers/GoalController"));
const GoalMessageController = __importStar(require("../controllers/GoalMessageController"));
const goalRoutes = express_1.default.Router();
// Todas as rotas requerem autenticação
goalRoutes.use(isAuth_1.default);
// Rotas específicas com verificação de feature
goalRoutes.get("/goals", (0, checkFeatureEnabledMiddleware_1.default)(["goals-management", "analytics_dashboard"]), GoalController.index);
goalRoutes.post("/goals", (0, checkFeatureEnabledMiddleware_1.default)("goals-management"), GoalController.store);
goalRoutes.get("/goals/:id", (0, checkFeatureEnabledMiddleware_1.default)(["goals-management", "analytics_dashboard"]), GoalController.show);
goalRoutes.put("/goals/:id", (0, checkFeatureEnabledMiddleware_1.default)("goals-management"), GoalController.update);
goalRoutes.delete("/goals/:id", (0, checkFeatureEnabledMiddleware_1.default)("goals-management"), GoalController.remove);
goalRoutes.put("/goals/:id/progress", (0, checkFeatureEnabledMiddleware_1.default)("goals-management"), GoalController.updateProgress);
goalRoutes.put("/goals/:id/reward-status", (0, checkFeatureEnabledMiddleware_1.default)("goals-management"), GoalController.updateRewardStatus);
goalRoutes.put("/goals/:id/employee-progress", (0, checkFeatureEnabledMiddleware_1.default)("goals-management"), GoalController.updateEmployeeProgress);
goalRoutes.post("/goals/send-message", (0, checkFeatureEnabledMiddleware_1.default)("goals-management"), GoalMessageController.sendGoalMessage);
exports.default = goalRoutes;
