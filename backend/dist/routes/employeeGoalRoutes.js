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
const EmployeeGoalController = __importStar(require("../controllers/EmployeeGoalController"));
const AuditLogController = __importStar(require("../controllers/AuditLogController"));
const employeeGoalRoutes = express_1.default.Router();
employeeGoalRoutes.get("/employee-goals", isAuth_1.default, EmployeeGoalController.index);
employeeGoalRoutes.get("/employee-goals/:id", isAuth_1.default, EmployeeGoalController.show);
employeeGoalRoutes.post("/employee-goals", isAuth_1.default, EmployeeGoalController.store);
employeeGoalRoutes.put("/employee-goals/:id", isAuth_1.default, EmployeeGoalController.update);
employeeGoalRoutes.delete("/employee-goals/:id", isAuth_1.default, EmployeeGoalController.remove);
employeeGoalRoutes.patch("/employee-goals/:id/progress", isAuth_1.default, EmployeeGoalController.updateProgress);
employeeGoalRoutes.get("/audit-logs/progress", isAuth_1.default, AuditLogController.listProgressLogs);
employeeGoalRoutes.delete("/audit-logs/progress/all", isAuth_1.default, AuditLogController.deleteAllProgressLogs);
exports.default = employeeGoalRoutes;
