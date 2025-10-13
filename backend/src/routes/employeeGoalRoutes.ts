import express from "express";
import isAuth from "../middleware/isAuth";
import * as EmployeeGoalController from "../controllers/EmployeeGoalController";
import * as AuditLogController from "../controllers/AuditLogController";

const employeeGoalRoutes = express.Router();

employeeGoalRoutes.get("/employee-goals", isAuth, EmployeeGoalController.index);
employeeGoalRoutes.get("/employee-goals/:id", isAuth, EmployeeGoalController.show);
employeeGoalRoutes.post("/employee-goals", isAuth, EmployeeGoalController.store);
employeeGoalRoutes.put("/employee-goals/:id", isAuth, EmployeeGoalController.update);
employeeGoalRoutes.delete("/employee-goals/:id", isAuth, EmployeeGoalController.remove);
employeeGoalRoutes.patch("/employee-goals/:id/progress", isAuth, EmployeeGoalController.updateProgress);
employeeGoalRoutes.get("/audit-logs/progress", isAuth, AuditLogController.listProgressLogs);
employeeGoalRoutes.delete("/audit-logs/progress/all", isAuth, AuditLogController.deleteAllProgressLogs);
export default employeeGoalRoutes;