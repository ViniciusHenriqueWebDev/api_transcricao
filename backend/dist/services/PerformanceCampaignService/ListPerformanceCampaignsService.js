"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const PerformanceCampaign_1 = __importDefault(require("../../models/PerformanceCampaign"));
const Goal_1 = __importDefault(require("../../models/Goal"));
const ListPerformanceCampaignsService = async ({ searchParam = "", pageNumber = "1", companyId, status, startDate, endDate }) => {
    const limit = 20;
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
    // Filtrar por status
    if (status === "active") {
        where[sequelize_1.Op.and] = [
            { startDate: { [sequelize_1.Op.lte]: currentDate } },
            { endDate: { [sequelize_1.Op.gte]: currentDate } }
        ];
    }
    else if (status === "upcoming") {
        where.startDate = { [sequelize_1.Op.gt]: currentDate };
    }
    else if (status === "finished") {
        where.endDate = { [sequelize_1.Op.lt]: currentDate };
    }
    // Filtrar por data
    if (startDate) {
        where.startDate = {
            ...where.startDate,
            [sequelize_1.Op.gte]: startDate
        };
    }
    if (endDate) {
        where.endDate = {
            ...where.endDate,
            [sequelize_1.Op.lte]: endDate
        };
    }
    // Buscar as campanhas
    const { count, rows: campaigns } = await PerformanceCampaign_1.default.findAndCountAll({
        where,
        limit,
        offset,
        order: [["startDate", "DESC"]],
        include: [
            {
                model: Goal_1.default,
                attributes: ["id", "name", "target", "current"]
            }
        ]
    });
    const hasMore = count > offset + campaigns.length;
    return {
        campaigns,
        count,
        hasMore
    };
};
exports.default = ListPerformanceCampaignsService;
