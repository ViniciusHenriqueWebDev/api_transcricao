"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../../errors/AppError"));
const Goal_1 = __importDefault(require("../../models/Goal"));
const EmployeeGoal_1 = __importDefault(require("../../models/EmployeeGoal"));
const DeleteGoalService = async (id, companyId) => {
    const goal = await Goal_1.default.findOne({
        where: { id, companyId }
    });
    if (!goal) {
        throw new AppError_1.default("Meta não encontrada", 404);
    }
    // Remover todas as associações com funcionários
    await EmployeeGoal_1.default.destroy({
        where: { goalId: id }
    });
    // Remover a meta
    await goal.destroy();
};
exports.default = DeleteGoalService;
