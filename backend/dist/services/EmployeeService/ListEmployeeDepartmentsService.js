"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const sequelize_2 = require("sequelize");
const Employee_1 = __importDefault(require("../../models/Employee"));
const ListEmployeeDepartmentsService = async ({ companyId }) => {
    const departments = await Employee_1.default.findAll({
        attributes: [
            [sequelize_1.Sequelize.fn("DISTINCT", sequelize_1.Sequelize.col("department")), "department"]
        ],
        where: {
            companyId,
            department: { [sequelize_2.Op.ne]: null }
        },
        raw: true
    });
    return departments.map(d => d.department).filter(Boolean);
};
exports.default = ListEmployeeDepartmentsService;
