"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../../errors/AppError"));
const EmployeeGoal_1 = __importDefault(require("../../models/EmployeeGoal"));
const Goal_1 = __importDefault(require("../../models/Goal"));
const DeleteEmployeeGoalService = async ({ id, companyId }) => {
    // Encontrar o employeeGoal com o goal associado
    const employeeGoal = await EmployeeGoal_1.default.findByPk(id, {
        include: [
            {
                model: Goal_1.default,
                as: "goal",
                attributes: ["companyId"]
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
    // Excluir o employee goal
    await employeeGoal.destroy();
};
exports.default = DeleteEmployeeGoalService;
