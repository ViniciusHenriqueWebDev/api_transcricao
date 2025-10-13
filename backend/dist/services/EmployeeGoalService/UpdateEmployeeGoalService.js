"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../../errors/AppError"));
const EmployeeGoal_1 = __importDefault(require("../../models/EmployeeGoal"));
const Goal_1 = __importDefault(require("../../models/Goal"));
const UpdateEmployeeGoalService = async ({ id, individualTarget, individualCurrent, companyId }) => {
    // Encontrar o registro a ser atualizado com o seu goal associado
    const employeeGoal = await EmployeeGoal_1.default.findByPk(id, {
        include: [
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
    const updateData = {};
    if (individualTarget !== undefined) {
        updateData.individualTarget = individualTarget;
    }
    if (individualCurrent !== undefined) {
        updateData.individualCurrent = individualCurrent;
        // Atualizar o progresso da meta principal
        const goal = await Goal_1.default.findByPk(employeeGoal.goalId);
        if (goal) {
            // Se a meta tem multi-employee e é dividida, calculamos a soma dos progressos individuais
            if (goal.multiEmployee) {
                // Buscar todos os employee goals desta meta
                const allEmployeeGoals = await EmployeeGoal_1.default.findAll({
                    where: { goalId: goal.id }
                });
                // Calcular o total atual somando os valores individuais
                const newCurrentTotal = allEmployeeGoals.reduce((total, eg) => {
                    // Usar o valor atualizado para o employee goal que está sendo modificado
                    if (eg.id === employeeGoal.id) {
                        return total + (individualCurrent || 0);
                    }
                    return total + (eg.individualCurrent || 0);
                }, 0);
                // Atualizar o progresso da meta principal
                await goal.update({ current: newCurrentTotal });
            }
            // Se não for multi-employee, atualizamos diretamente o valor atual da meta
            else {
                await goal.update({ current: individualCurrent });
            }
        }
    }
    await employeeGoal.update(updateData);
    // Recalcular o progresso
    const target = employeeGoal.individualTarget || employeeGoal.goal.target;
    const current = employeeGoal.individualCurrent || 0;
    employeeGoal.progress = target > 0 ? Math.round((current / target) * 100) : 0;
    return employeeGoal;
};
exports.default = UpdateEmployeeGoalService;
