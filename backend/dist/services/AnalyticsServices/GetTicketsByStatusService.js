"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const GetTicketsByStatusService = async ({ companyId, startDate, endDate }) => {
    // Adicionando o horário às datas para filtrar com precisão
    const startDateWithTime = `${startDate} 00:00:00`;
    const endDateWithTime = `${endDate} 23:59:59`;
    const results = await Ticket_1.default.findAll({
        attributes: [
            'status',
            [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('id')), 'count']
        ],
        where: {
            companyId,
            [sequelize_1.Op.or]: [
                {
                    createdAt: {
                        [sequelize_1.Op.gte]: startDateWithTime,
                        [sequelize_1.Op.lte]: endDateWithTime
                    }
                },
                {
                    updatedAt: {
                        [sequelize_1.Op.gte]: startDateWithTime,
                        [sequelize_1.Op.lte]: endDateWithTime
                    }
                }
            ]
        },
        group: ['status'],
        raw: true
    });
    // Calcular o total para percentagens
    const total = results.reduce((acc, curr) => acc + parseInt(curr.count, 10), 0);
    // Formatar e calcular percentagens
    const formattedResults = results.map((item) => ({
        status: item.status,
        count: parseInt(item.count, 10),
        percentage: total > 0 ? Math.round((parseInt(item.count, 10) / total) * 100) : 0
    }));
    return formattedResults.sort((a, b) => b.count - a.count);
};
exports.default = GetTicketsByStatusService;
