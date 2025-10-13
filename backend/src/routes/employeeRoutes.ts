import express from "express";
import isAuth from "../middleware/isAuth";

import * as EmployeeController from "../controllers/EmployeeController";

const employeeRoutes = express.Router();

// Middleware para todas as rotas
employeeRoutes.use(isAuth);

// Rotas de Employees
employeeRoutes.get("/employees", EmployeeController.index);
employeeRoutes.post("/employees", EmployeeController.store);
employeeRoutes.get("/employees/:id", EmployeeController.show);
employeeRoutes.put("/employees/:id", EmployeeController.update);
employeeRoutes.delete("/employees/:id", EmployeeController.remove);
employeeRoutes.get("/employee-departments", EmployeeController.listDepartments);

export default employeeRoutes;