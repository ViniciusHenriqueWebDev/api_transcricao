"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const EmployeeGoal_1 = __importDefault(require("../../models/EmployeeGoal"));
const Employee_1 = __importDefault(require("../../models/Employee"));
const Goal_1 = __importDefault(require("../../models/Goal"));
const ListEmployeeGoalsService = async ({ goalId, employeeId, companyId }) => {
    const whereCondition = {
        "$goal.companyId$": companyId
    };
    if (goalId) {
        whereCondition.goalId = goalId;
    }
    if (employeeId) {
        whereCondition.employeeId = employeeId;
    }
    const employeeGoals = await EmployeeGoal_1.default.findAll({
        where: whereCondition,
        include: [
            {
                model: Employee_1.default,
                as: "employee",
                attributes: ["id", "name", "email", "department", "position"]
            },
            {
                model: Goal_1.default,
                as: "goal",
                attributes: ["id", "name", "target", "current", "metricType", "companyId"]
            }
        ],
        order: [["updatedAt", "DESC"]]
    });
    // Calcular o progresso para cada employee goal
    employeeGoals.forEach(employeeGoal => {
        const goal = employeeGoal.goal;
        const target = employeeGoal.individualTarget || goal.target;
        const current = employeeGoal.individualCurrent || 0;
        // Adicionar campo virtual progress
        employeeGoal.progress = target > 0 ? Math.round((current / target) * 100) : 0;
    });
    return employeeGoals;
};
exports.default = ListEmployeeGoalsService;
