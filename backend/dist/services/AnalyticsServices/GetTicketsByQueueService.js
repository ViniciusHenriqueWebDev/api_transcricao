"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const Queue_1 = __importDefault(require("../../models/Queue"));
const GetTicketsByQueueService = async ({ companyId, startDate, endDate }) => {
    const startDateUTC = new Date(startDate);
    const endDateUTC = new Date(endDate);
    endDateUTC.setDate(endDateUTC.getDate() + 1);
    // Formatando as datas como strings para evitar problemas com o tipo Date
    const startDateStr = startDateUTC.toISOString();
    const endDateStr = endDateUTC.toISOString();
    const ticketsByQueue = await Ticket_1.default.findAll({
        attributes: [
            "queueId",
            [sequelize_1.Sequelize.fn("count", sequelize_1.Sequelize.col("Ticket.id")), "count"],
            [sequelize_1.Sequelize.literal('"queue"."name"'), "queue.name"]
        ],
        include: [
            {
                model: Queue_1.default,
                as: "queue",
                attributes: []
            }
        ],
        where: {
            companyId,
            [sequelize_1.Op.or]: [
                {
                    createdAt: {
                        [sequelize_1.Op.gte]: startDateStr,
                        [sequelize_1.Op.lt]: endDateStr
                    }
                },
                {
                    updatedAt: {
                        [sequelize_1.Op.gte]: startDateStr,
                        [sequelize_1.Op.lt]: endDateStr
                    }
                }
            ]
        },
        group: ["queueId", "queue.name"],
        raw: true
    });
    // Se não houver resultados, retorne array vazio
    if (ticketsByQueue.length === 0) {
        return [];
    }
    const totalTickets = ticketsByQueue.reduce((acc, queue) => acc + parseInt(queue.count, 10), 0);
    const queuesWithPercentage = ticketsByQueue.map(queue => ({
        queueId: queue.queueId,
        name: queue.queueId ? queue["queue.name"] || "Fila Removida" : "Sem Fila",
        count: parseInt(queue.count, 10),
        percentage: Math.round((parseInt(queue.count, 10) / totalTickets) * 100) || 0
    }));
    return queuesWithPercentage;
};
exports.default = GetTicketsByQueueService;
