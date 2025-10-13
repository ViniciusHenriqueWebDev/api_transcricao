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
const CreateEmployeeService = async (employeeData) => {
    const schema = Yup.object().shape({
        name: Yup.string().required().min(2),
        email: Yup.string().email().required(),
        phone: Yup.string(),
        position: Yup.string(),
        department: Yup.string(),
        status: Yup.boolean().default(true)
    });
    try {
        await schema.validate(employeeData);
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    const { email } = employeeData;
    const employeeExists = await Employee_1.default.findOne({
        where: { email, companyId: employeeData.companyId }
    });
    if (employeeExists) {
        throw new AppError_1.default("Já existe um funcionário com este e-mail.");
    }
    const employee = await Employee_1.default.create({
        ...employeeData,
        status: employeeData.status !== undefined ? employeeData.status : true
    });
    return employee;
};
exports.default = CreateEmployeeService;
