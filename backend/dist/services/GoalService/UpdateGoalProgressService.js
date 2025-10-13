"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../../errors/AppError"));
const Goal_1 = __importDefault(require("../../models/Goal"));
const EmployeeGoal_1 = __importDefault(require("../../models/EmployeeGoal"));
const Employee_1 = __importDefault(require("../../models/Employee"));
const UpdateGoalProgressService = async ({ goalId, currentValue, companyId }) => {
    if (currentValue < 0) {
        throw new AppError_1.default("O valor atual não pode ser negativo");
    }
    const goal = await Goal_1.default.findOne({
        where: { id: goalId, companyId },
        include: [
            {
                model: EmployeeGoal_1.default,
                include: [{ model: Employee_1.default }]
            }
        ]
    });
    if (!goal) {
        throw new AppError_1.default("Meta não encontrada", 404);
    }
    // Atualizar o progresso geral da meta
    await goal.update({ current: currentValue });
    // Se não for uma meta dividida, atualizar o progresso para todos os funcionários
    if (!goal.dividedGoal && goal.employeeGoals?.length > 0) {
        const progressPercentage = Math.min(Math.floor((currentValue / goal.target) * 100), 100);
        for (const employeeGoal of goal.employeeGoals) {
            await employeeGoal.update({
                individualCurrent: currentValue,
                progress: progressPercentage
            });
        }
    }
    // Buscar a meta atualizada com todos os relacionamentos
    const updatedGoal = await Goal_1.default.findByPk(goalId, {
        include: [
            {
                model: EmployeeGoal_1.default,
                include: [
                    {
                        model: Employee_1.default,
                        attributes: ["id", "name", "position", "department"]
                    }
                ]
            }
        ]
    });
    return updatedGoal;
};
exports.default = UpdateGoalProgressService;
