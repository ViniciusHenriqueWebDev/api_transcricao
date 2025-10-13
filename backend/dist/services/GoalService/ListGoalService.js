"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const Goal_1 = __importDefault(require("../../models/Goal"));
const EmployeeGoal_1 = __importDefault(require("../../models/EmployeeGoal"));
const Employee_1 = __importDefault(require("../../models/Employee"));
const PerformanceCampaign_1 = __importDefault(require("../../models/PerformanceCampaign"));
const ListGoalService = async ({ searchParam = "", pageNumber = "1", companyId, employeeId, performanceCampaignId, startDate, endDate, status }) => {
    const limit = 50;
    const offset = (parseInt(pageNumber, 10) - 1) * limit;
    const currentDate = new Date();
    // Construir as condições de pesquisa
    let where = { companyId };
    if (searchParam) {
        where = {
            ...where,
            [sequelize_1.Op.or]: [
                { name: { [sequelize_1.Op.iLike]: `%${searchParam}%` } },
                { description: { [sequelize_1.Op.iLike]: `%${searchParam}%` } }
            ]
        };
    }
    if (performanceCampaignId) {
        where.performanceCampaignId = performanceCampaignId;
    }
    if (startDate) {
        where.startDate = {
            [sequelize_1.Op.gte]: startDate
        };
    }
    if (endDate) {
        where.endDate = {
            [sequelize_1.Op.lte]: endDate
        };
    }
    // Filtro por status
    if (status === "active") {
        where.endDate = {
            [sequelize_1.Op.gte]: currentDate
        };
    }
    else if (status === "completed") {
        where[sequelize_1.Op.and] = [
            sequelize_1.Sequelize.literal(`"current" >= "target"`)
        ];
    }
    else if (status === "expired") {
        where.endDate = {
            [sequelize_1.Op.lt]: currentDate
        };
        where[sequelize_1.Op.and] = [
            sequelize_1.Sequelize.literal(`"current" < "target"`)
        ];
    }
    // Opções de include
    const includeOptions = [
        {
            model: PerformanceCampaign_1.default,
            attributes: ["id", "name", "startDate", "endDate"]
        },
        {
            model: EmployeeGoal_1.default,
            include: [{
                    model: Employee_1.default,
                    attributes: ["id", "name", "position", "department"]
                }]
        }
    ];
    // Se há um employeeId específico, filtrar as metas pelo funcionário
    if (employeeId) {
        includeOptions.push({
            model: EmployeeGoal_1.default,
            as: "employeeGoals",
            where: { employeeId },
            required: false
        });
    }
    // Buscar as metas
    const { count, rows: goals } = await Goal_1.default.findAndCountAll({
        where,
        limit,
        offset,
        order: [["createdAt", "DESC"]],
        include: includeOptions,
    });
    const hasMore = count > offset + goals.length;
    return {
        goals,
        count,
        hasMore
    };
};
exports.default = ListGoalService;
