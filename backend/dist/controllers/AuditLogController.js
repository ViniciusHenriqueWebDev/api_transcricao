"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAllProgressLogs = exports.listProgressLogs = void 0;
const sequelize_1 = require("sequelize");
const AppError_1 = __importDefault(require("../errors/AppError"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const User_1 = __importDefault(require("../models/User"));
const Goal_1 = __importDefault(require("../models/Goal"));
const Employee_1 = __importDefault(require("../models/Employee"));
const listProgressLogs = async (req, res) => {
    if (req.user.profile !== "admin") {
        throw new AppError_1.default("ERR_NO_PERMISSION", 403);
    }
    const { companyId } = req.user;
    const { searchParam = "", pageNumber = "1", employeeId, changeType, startDate, endDate } = req.query;
    const whereCondition = {
        companyId
    };
    // Filtrar por funcionário específico
    if (employeeId) {
        whereCondition.employeeId = employeeId;
    }
    // Filtrar por tipo de alteração
    if (changeType) {
        whereCondition.changeType = changeType;
    }
    // Filtrar por período
    if (startDate && endDate) {
        whereCondition.createdAt = {
            [sequelize_1.Op.between]: [new Date(startDate), new Date(endDate)]
        };
    }
    // Filtrar por termo de busca
    if (searchParam) {
        whereCondition[sequelize_1.Op.or] = [
            { goalName: { [sequelize_1.Op.like]: `%${searchParam}%` } },
            { employeeName: { [sequelize_1.Op.like]: `%${searchParam}%` } },
            { justification: { [sequelize_1.Op.like]: `%${searchParam}%` } },
            { userName: { [sequelize_1.Op.like]: `%${searchParam}%` } }
        ];
    }
    const limit = 50;
    const offset = (parseInt(pageNumber, 10) - 1) * limit;
    const { count, rows: logs } = await AuditLog_1.default.findAndCountAll({
        where: whereCondition,
        limit,
        offset,
        order: [["createdAt", "DESC"]],
        include: [
            {
                model: User_1.default,
                attributes: ["id", "name"],
                required: false
            },
            {
                model: Goal_1.default,
                attributes: ["id", "name"],
                required: false
            },
            {
                model: Employee_1.default,
                attributes: ["id", "name"],
                required: false
            }
        ]
    });
    const hasMore = count > offset + logs.length;
    return res.json({
        logs,
        count,
        hasMore
    });
};
exports.listProgressLogs = listProgressLogs;
const deleteAllProgressLogs = async (req, res) => {
    if (req.user.profile !== "admin") {
        throw new AppError_1.default("ERR_NO_PERMISSION", 403);
    }
    const { companyId } = req.user;
    try {
        await AuditLog_1.default.destroy({
            where: {
                companyId
            }
        });
        return res.status(204).send();
    }
    catch (err) {
        throw new AppError_1.default("ERR_DELETE_AUDIT_LOGS", 500);
    }
};
exports.deleteAllProgressLogs = deleteAllProgressLogs;
