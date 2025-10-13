"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../../errors/AppError"));
const Goal_1 = __importDefault(require("../../models/Goal"));
const Employee_1 = __importDefault(require("../../models/Employee"));
const EmployeeGoal_1 = __importDefault(require("../../models/EmployeeGoal"));
const PerformanceCampaign_1 = __importDefault(require("../../models/PerformanceCampaign"));
const ShowGoalService = async ({ id, companyId }) => {
    const goal = await Goal_1.default.findOne({
        where: { id, companyId },
        include: [
            {
                model: EmployeeGoal_1.default,
                include: [
                    {
                        model: Employee_1.default,
                        attributes: ["id", "name", "email", "position", "department"]
                    }
                ]
            },
            {
                model: PerformanceCampaign_1.default,
                attributes: ["id", "name", "startDate", "endDate", "status"]
            }
        ]
    });
    if (!goal) {
        throw new AppError_1.default("Meta não encontrada", 404);
    }
    return goal;
};
exports.default = ShowGoalService;
