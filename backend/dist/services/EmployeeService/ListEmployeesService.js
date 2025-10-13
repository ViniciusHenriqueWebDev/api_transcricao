"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const Employee_1 = __importDefault(require("../../models/Employee"));
const EmployeeGoal_1 = __importDefault(require("../../models/EmployeeGoal"));
const Goal_1 = __importDefault(require("../../models/Goal"));
const ListEmployeesService = async ({ searchParam = "", pageNumber = "1", companyId, department, status }) => {
    const limit = 50;
    const offset = (parseInt(pageNumber, 10) - 1) * limit;
    // Construir as condições de pesquisa
    let where = {
        companyId
    };
    if (searchParam) {
        where = {
            ...where,
            [sequelize_1.Op.or]: [
                { name: { [sequelize_1.Op.iLike]: `%${searchParam}%` } },
                { email: { [sequelize_1.Op.iLike]: `%${searchParam}%` } },
                { position: { [sequelize_1.Op.iLike]: `%${searchParam}%` } }
            ]
        };
    }
    if (department) {
        where.department = department;
    }
    if (status) {
        where.status = status === "true";
    }
    const { count, rows: employees } = await Employee_1.default.findAndCountAll({
        where,
        limit,
        offset,
        order: [["name", "ASC"]],
        include: [{
                model: EmployeeGoal_1.default,
                attributes: ["id", "progress", "individualTarget", "individualCurrent"],
                include: [{
                        model: Goal_1.default,
                        attributes: ["id", "name", "metricType", "target", "current", "startDate", "endDate"]
                    }]
            }]
    });
    const hasMore = count > offset + employees.length;
    return {
        employees,
        count,
        hasMore
    };
};
exports.default = ListEmployeesService;
