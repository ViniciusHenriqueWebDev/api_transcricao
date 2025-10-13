"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listDepartments = exports.remove = exports.update = exports.show = exports.store = exports.index = void 0;
const socket_1 = require("../libs/socket");
const CreateEmployeeService_1 = __importDefault(require("../services/EmployeeService/CreateEmployeeService"));
const ListEmployeesService_1 = __importDefault(require("../services/EmployeeService/ListEmployeesService"));
const ShowEmployeeService_1 = __importDefault(require("../services/EmployeeService/ShowEmployeeService"));
const UpdateEmployeeService_1 = __importDefault(require("../services/EmployeeService/UpdateEmployeeService"));
const DeleteEmployeeService_1 = __importDefault(require("../services/EmployeeService/DeleteEmployeeService"));
const ListEmployeeDepartmentsService_1 = __importDefault(require("../services/EmployeeService/ListEmployeeDepartmentsService"));
const index = async (req, res) => {
    const { searchParam, pageNumber, department, status } = req.query;
    const { companyId } = req.user;
    const { employees, count, hasMore } = await (0, ListEmployeesService_1.default)({
        searchParam,
        pageNumber,
        companyId,
        department,
        status
    });
    return res.status(200).json({ employees, count, hasMore });
};
exports.index = index;
const store = async (req, res) => {
    const employeeData = req.body;
    const { companyId } = req.user;
    const employee = await (0, CreateEmployeeService_1.default)({
        ...employeeData,
        companyId
    });
    const io = (0, socket_1.getIO)();
    io.emit("employee", {
        action: "create",
        employee
    });
    return res.status(200).json(employee);
};
exports.store = store;
const show = async (req, res) => {
    const { id } = req.params;
    const { companyId } = req.user;
    const employee = await (0, ShowEmployeeService_1.default)({ id, companyId });
    return res.status(200).json(employee);
};
exports.show = show;
const update = async (req, res) => {
    const employeeData = req.body;
    const { id } = req.params;
    const { companyId } = req.user;
    const employee = await (0, UpdateEmployeeService_1.default)({
        employeeData,
        employeeId: id,
        companyId
    });
    const io = (0, socket_1.getIO)();
    io.emit("employee", {
        action: "update",
        employee
    });
    return res.status(200).json(employee);
};
exports.update = update;
const remove = async (req, res) => {
    const { id } = req.params;
    const { companyId } = req.user;
    await (0, DeleteEmployeeService_1.default)(id, companyId);
    const io = (0, socket_1.getIO)();
    io.emit("employee", {
        action: "delete",
        employeeId: id
    });
    return res.status(200).json({ message: "Funcionário excluído com sucesso" });
};
exports.remove = remove;
const listDepartments = async (req, res) => {
    const { companyId } = req.user;
    const departments = await (0, ListEmployeeDepartmentsService_1.default)({ companyId });
    return res.status(200).json({ departments });
};
exports.listDepartments = listDepartments;
