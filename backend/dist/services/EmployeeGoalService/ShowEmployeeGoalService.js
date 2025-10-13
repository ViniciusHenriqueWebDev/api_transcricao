"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../../errors/AppError"));
const EmployeeGoal_1 = __importDefault(require("../../models/EmployeeGoal"));
const Employee_1 = __importDefault(require("../../models/Employee"));
const Goal_1 = __importDefault(require("../../models/Goal"));
const ShowEmployeeGoalService = async ({ id, companyId }) => {
    const employeeGoal = await EmployeeGoal_1.default.findByPk(id, {
        include: [
            {
                model: Employee_1.default,
                as: "employee",
                attributes: ["id", "name", "email", "department", "position"]
            },
            {
                model: Goal_1.default,
                as: "goal",
                attributes: ["id", "name", "target", "current", "companyId"]
            }
        ]
    });
    if (!employeeGoal) {
        throw new AppError_1.default("Employee goal not found", 404);
    }
    // Verificar se o registro pertence à empresa do usuário
    if (employeeGoal.goal.companyId !== companyId) {
        throw new AppError_1.default("Access denied: this employee goal belongs to another company", 403);
    }
    // Calcular o progresso
    const goal = employeeGoal.goal;
    const target = employeeGoal.individualTarget || goal.target;
    const current = employeeGoal.individualCurrent || 0;
    employeeGoal.progress = target > 0 ? Math.round((current / target) * 100) : 0;
    return employeeGoal;
};
exports.default = ShowEmployeeGoalService;
