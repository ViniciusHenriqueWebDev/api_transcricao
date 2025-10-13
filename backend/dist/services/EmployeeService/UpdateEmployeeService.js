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
const Employee_1 = __importDefault(require("../../models/Employee"));
const sequelize_1 = require("sequelize");
const UpdateEmployeeService = async ({ employeeData, employeeId, companyId }) => {
    const schema = Yup.object().shape({
        name: Yup.string().min(2),
        email: Yup.string().email(),
        phone: Yup.string(),
        position: Yup.string(),
        department: Yup.string(),
        status: Yup.boolean()
    });
    try {
        await schema.validate(employeeData);
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    const employee = await Employee_1.default.findOne({
        where: { id: employeeId, companyId }
    });
    if (!employee) {
        throw new AppError_1.default("Funcionário não encontrado", 404);
    }
    // Se estiver alterando o e-mail, verificar se já existe outro funcionário com este e-mail
    if (employeeData.email && employeeData.email !== employee.email) {
        const emailExists = await Employee_1.default.findOne({
            where: { email: employeeData.email, companyId, id: { [sequelize_1.Op.ne]: employeeId } }
        });
        if (emailExists) {
            throw new AppError_1.default("Já existe outro funcionário com este e-mail.");
        }
    }
    await employee.update(employeeData);
    return employee;
};
exports.default = UpdateEmployeeService;
