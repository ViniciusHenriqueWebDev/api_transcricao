"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Yup = __importStar(require("yup"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const EmployeeGoal_1 = __importDefault(require("../../models/EmployeeGoal"));
const Goal_1 = __importDefault(require("../../models/Goal"));
const Employee_1 = __importDefault(require("../../models/Employee"));
const CreateEmployeeGoalService = async ({ employeeId, goalId, individualTarget, individualCurrent, companyId }) => {
    const schema = Yup.object().shape({
        employeeId: Yup.number().required("Employee ID is required"),
        goalId: Yup.number().required("Goal ID is required"),
        individualTarget: Yup.number().required("Individual target is required"),
    });
    try {
        await schema.validate({ employeeId, goalId, individualTarget });
    }
    catch (error) {
        throw new AppError_1.default(error.message);
    }
    // Verificar se o goal pertence à empresa
    const goal = await Goal_1.default.findByPk(goalId);
    if (!goal) {
        throw new AppError_1.default("Goal not found", 404);
    }
    if (goal.companyId !== companyId) {
        throw new AppError_1.default("Goal doesn't belong to this company", 403);
    }
    // Verificar se o employee pertence à empresa
    const employee = await Employee_1.default.findByPk(employeeId);
    if (!employee) {
        throw new AppError_1.default("Employee not found", 404);
    }
    if (employee.companyId !== companyId) {
        throw new AppError_1.default("Employee doesn't belong to this company", 403);
    }
    // Verificar se já existe um registro para esse employee nesse goal
    const existingEmployeeGoal = await EmployeeGoal_1.default.findOne({
        where: {
            employeeId,
            goalId
        }
    });
    if (existingEmployeeGoal) {
        throw new AppError_1.default("This employee is already assigned to this goal");
    }
    // Criar o employee goal
    const employeeGoal = await EmployeeGoal_1.default.create({
        employeeId,
        goalId,
        individualTarget,
        individualCurrent: individualCurrent || 0
    });
    return employeeGoal;
};
exports.default = CreateEmployeeGoalService;
