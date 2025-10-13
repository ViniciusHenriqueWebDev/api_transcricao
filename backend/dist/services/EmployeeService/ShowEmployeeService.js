"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../../errors/AppError"));
const Employee_1 = __importDefault(require("../../models/Employee"));
const EmployeeGoal_1 = __importDefault(require("../../models/EmployeeGoal"));
const Goal_1 = __importDefault(require("../../models/Goal"));
const PerformanceCampaign_1 = __importDefault(require("../../models/PerformanceCampaign"));
const ShowEmployeeService = async ({ id, companyId }) => {
    const employee = await Employee_1.default.findOne({
        where: { id, companyId },
        include: [{
                model: EmployeeGoal_1.default,
                include: [{
                        model: Goal_1.default,
                        include: [PerformanceCampaign_1.default]
                    }]
            }]
    });
    if (!employee) {
        throw new AppError_1.default("Funcionário não encontrado", 404);
    }
    return employee;
};
exports.default = ShowEmployeeService;
