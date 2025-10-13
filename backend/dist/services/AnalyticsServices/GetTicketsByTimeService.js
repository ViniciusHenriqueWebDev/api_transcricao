"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const date_fns_1 = require("date-fns");
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const GetTicketsByTimeService = async ({ companyId, startDate, endDate }) => {
    // Adicionando o horário às datas para filtrar com precisão
    const startDateWithTime = `${startDate} 00:00:00`;
    const endDateWithTime = `${endDate} 23:59:59`;
    // Analisar tickets por hora
    const ticketsByHour = await Ticket_1.default.findAll({
        attributes: [
            [(0, sequelize_1.fn)("EXTRACT", (0, sequelize_1.literal)("HOUR FROM \"createdAt\"")), "hour"],
            [(0, sequelize_1.fn)("COUNT", "*"), "count"]
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
        group: [(0, sequelize_1.fn)("EXTRACT", (0, sequelize_1.literal)("HOUR FROM \"createdAt\""))],
        order: [[(0, sequelize_1.fn)("EXTRACT", (0, sequelize_1.literal)("HOUR FROM \"createdAt\"")), "ASC"]],
        raw: true
    });
    // Analisar tickets por dia
    const ticketsByDay = await Ticket_1.default.findAll({
        attributes: [
            [(0, sequelize_1.fn)("DATE", (0, sequelize_1.col)("createdAt")), "date"],
            [(0, sequelize_1.fn)("COUNT", "*"), "count"]
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
        group: [(0, sequelize_1.fn)("DATE", (0, sequelize_1.col)("createdAt"))],
        order: [[(0, sequelize_1.fn)("DATE", (0, sequelize_1.col)("createdAt")), "ASC"]],
        raw: true
    });
    // Formatar dados para o retorno
    const formattedByHour = ticketsByHour.map((item) => ({
        hour: parseInt(item.hour, 10),
        count: parseInt(item.count, 10)
    }));
    const formattedByDay = ticketsByDay.map((item) => ({
        date: (0, date_fns_1.format)(new Date(item.date), 'yyyy-MM-dd'),
        count: parseInt(item.count, 10)
    }));
    return {
        byHour: formattedByHour,
        byDay: formattedByDay
    };
};
exports.default = GetTicketsByTimeService;
