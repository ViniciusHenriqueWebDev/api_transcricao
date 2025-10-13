"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../../errors/AppError"));
const Employee_1 = __importDefault(require("../../models/Employee"));
const DeleteEmployeeService = async (id, companyId) => {
    const employee = await Employee_1.default.findOne({
        where: { id, companyId }
    });
    if (!employee) {
        throw new AppError_1.default("Funcionário não encontrado", 404);
    }
    await employee.destroy();
};
exports.default = DeleteEmployeeService;
