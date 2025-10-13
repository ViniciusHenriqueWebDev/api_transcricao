"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../../errors/AppError"));
const Goal_1 = __importDefault(require("../../models/Goal"));
const EmployeeGoal_1 = __importDefault(require("../../models/EmployeeGoal"));
const Employee_1 = __importDefault(require("../../models/Employee"));
const UpdateGoalRewardStatusService = async ({ goalId, rewardStatus, companyId }) => {
    const goal = await Goal_1.default.findOne({
        where: { id: goalId, companyId }
    });
    if (!goal) {
        throw new AppError_1.default("Meta não encontrada", 404);
    }
    if (!goal.reward && !goal.rewardValue) {
        throw new AppError_1.default("Esta meta não possui uma recompensa definida");
    }
    // Atualizar o status da recompensa
    await goal.update({ rewardStatus });
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
exports.default = UpdateGoalRewardStatusService;
