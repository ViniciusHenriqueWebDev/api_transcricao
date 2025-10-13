"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const date_fns_1 = require("date-fns");
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const GetTicketsEvolutionService = async ({ companyId, startDate, endDate }) => {
    // Adicionando o horário às datas para filtrar com precisão
    const startDateWithTime = `${startDate} 00:00:00`;
    const endDateWithTime = `${endDate} 23:59:59`;
    // Diferença em dias entre as datas
    const daysDiff = (0, date_fns_1.differenceInDays)(new Date(endDate), new Date(startDate));
    // Escolher formato de agrupamento baseado no período
    let dateExtractor;
    if (daysDiff <= 31) {
        // Para períodos até 31 dias, agrupar por dia
        dateExtractor = (0, sequelize_1.fn)('DATE', (0, sequelize_1.col)('createdAt'));
    }
    else if (daysDiff <= 365) {
        // Para períodos até um ano, agrupar por semana
        dateExtractor = (0, sequelize_1.fn)('TO_CHAR', (0, sequelize_1.col)('createdAt'), (0, sequelize_1.literal)("'YYYY-WW'"));
    }
    else {
        // Para períodos maiores, agrupar por mês
        dateExtractor = (0, sequelize_1.fn)('TO_CHAR', (0, sequelize_1.col)('createdAt'), (0, sequelize_1.literal)("'YYYY-MM'"));
    }
    const results = await Ticket_1.default.findAll({
        attributes: [
            [dateExtractor, 'date'],
            [(0, sequelize_1.fn)('COUNT', (0, sequelize_1.col)('id')), 'total'],
            [(0, sequelize_1.fn)('SUM', (0, sequelize_1.literal)('CASE WHEN status = \'open\' THEN 1 ELSE 0 END')), 'open'],
            [(0, sequelize_1.fn)('SUM', (0, sequelize_1.literal)('CASE WHEN status = \'pending\' THEN 1 ELSE 0 END')), 'pending'],
            [(0, sequelize_1.fn)('SUM', (0, sequelize_1.literal)('CASE WHEN status = \'closed\' THEN 1 ELSE 0 END')), 'closed']
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
        group: [dateExtractor],
        order: [[dateExtractor, 'ASC']],
        raw: true
    });
    // Formatar dados para o retorno
    return results.map((item) => ({
        date: item.date,
        total: parseInt(item.total, 10),
        open: parseInt(item.open, 10),
        pending: parseInt(item.pending, 10),
        closed: parseInt(item.closed, 10)
    }));
};
exports.default = GetTicketsEvolutionService;
