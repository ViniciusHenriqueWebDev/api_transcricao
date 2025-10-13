"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProgress = exports.remove = exports.update = exports.store = exports.show = exports.index = void 0;
const socket_1 = require("../libs/socket");
const ListEmployeeGoalsService_1 = __importDefault(require("../services/EmployeeGoalService/ListEmployeeGoalsService"));
const ShowEmployeeGoalService_1 = __importDefault(require("../services/EmployeeGoalService/ShowEmployeeGoalService"));
const UpdateEmployeeGoalService_1 = __importDefault(require("../services/EmployeeGoalService/UpdateEmployeeGoalService"));
const CreateEmployeeGoalService_1 = __importDefault(require("../services/EmployeeGoalService/CreateEmployeeGoalService"));
const DeleteEmployeeGoalService_1 = __importDefault(require("../services/EmployeeGoalService/DeleteEmployeeGoalService"));
const ShowUserService_1 = __importDefault(require("../services/UserServices/ShowUserService"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const index = async (req, res) => {
    const { goalId, employeeId } = req.query;
    const { companyId } = req.user;
    const employeeGoals = await (0, ListEmployeeGoalsService_1.default)({
        goalId: goalId ? Number(goalId) : undefined,
        employeeId: employeeId ? Number(employeeId) : undefined,
        companyId
    });
    return res.status(200).json(employeeGoals);
};
exports.index = index;
const show = async (req, res) => {
    const { id } = req.params;
    const { companyId } = req.user;
    const employeeGoal = await (0, ShowEmployeeGoalService_1.default)({ id: Number(id), companyId });
    return res.status(200).json(employeeGoal);
};
exports.show = show;
const store = async (req, res) => {
    const { employeeId, goalId, individualTarget, individualCurrent } = req.body;
    const { companyId } = req.user;
    const employeeGoal = await (0, CreateEmployeeGoalService_1.default)({
        employeeId,
        goalId,
        individualTarget,
        individualCurrent: individualCurrent || 0,
        companyId
    });
    const io = (0, socket_1.getIO)();
    io.to(`company-${companyId}-mainchannel`).emit("employeeGoal", {
        action: "create",
        employeeGoal
    });
    return res.status(200).json(employeeGoal);
};
exports.store = store;
const update = async (req, res) => {
    const { id } = req.params;
    const { individualTarget, individualCurrent, justification } = req.body;
    const { companyId, id: userId } = req.user;
    // Buscar o valor atual antes da atualização
    const currentEmployeeGoal = await (0, ShowEmployeeGoalService_1.default)({ id: Number(id), companyId });
    const oldValue = currentEmployeeGoal.individualCurrent;
    // Atualizar a meta do funcionário
    const employeeGoal = await (0, UpdateEmployeeGoalService_1.default)({
        id: Number(id),
        individualTarget,
        individualCurrent,
        companyId
    });
    // Se o valor atual foi alterado, registrar na auditoria
    if (individualCurrent !== undefined && individualCurrent !== oldValue) {
        // Determinar o tipo de alteração
        let changeType = "neutral";
        if (individualCurrent > oldValue) {
            changeType = "increase";
        }
        else if (individualCurrent < oldValue) {
            changeType = "decrease";
        }
        // Buscar informações completas do employeeGoal para o log
        const employeeGoalDetails = await (0, ShowEmployeeGoalService_1.default)({
            id: Number(id),
            companyId,
        });
        // Buscar o usuário para obter o nome
        const user = await (0, ShowUserService_1.default)(userId);
        // Registrar o log de auditoria
        await AuditLog_1.default.create({
            userId,
            userName: user.name,
            ip: req.ip,
            userAgent: req.headers["user-agent"],
            goalId: employeeGoalDetails.goalId,
            goalName: employeeGoalDetails.goal.name,
            employeeId: employeeGoalDetails.employeeId,
            employeeName: employeeGoalDetails.employee.name,
            oldValue,
            newValue: individualCurrent,
            changeType,
            justification: justification || "",
            metricType: employeeGoalDetails.goal.metricType,
            individualTarget: employeeGoalDetails.individualTarget,
            companyId
        });
    }
    const io = (0, socket_1.getIO)();
    io.to(`company-${companyId}-mainchannel`).emit("employeeGoal", {
        action: "update",
        employeeGoal
    });
    return res.status(200).json(employeeGoal);
};
exports.update = update;
const remove = async (req, res) => {
    const { id } = req.params;
    const { companyId } = req.user;
    await (0, DeleteEmployeeGoalService_1.default)({ id: Number(id), companyId });
    const io = (0, socket_1.getIO)();
    io.to(`company-${companyId}-mainchannel`).emit("employeeGoal", {
        action: "delete",
        id: Number(id)
    });
    return res.status(200).json({ message: "Employee goal deleted" });
};
exports.remove = remove;
// Método específico para atualizar progresso individual
const updateProgress = async (req, res) => {
    const { id } = req.params;
    const { individualCurrent } = req.body;
    const { companyId } = req.user;
    const employeeGoal = await (0, UpdateEmployeeGoalService_1.default)({
        id: Number(id),
        individualCurrent,
        companyId
    });
    // Atualize o progresso da meta principal
    const io = (0, socket_1.getIO)();
    io.to(`company-${companyId}-mainchannel`).emit("employeeGoal", {
        action: "update",
        employeeGoal
    });
    return res.status(200).json(employeeGoal);
};
exports.updateProgress = updateProgress;
