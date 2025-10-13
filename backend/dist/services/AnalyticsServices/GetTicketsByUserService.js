"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const User_1 = __importDefault(require("../../models/User"));
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const GetTicketsByUserService = async ({ companyId, startDate, endDate }) => {
    const startDateUTC = new Date(startDate);
    const endDateUTC = new Date(endDate);
    endDateUTC.setDate(endDateUTC.getDate() + 1);
    // Formatando as datas como strings para evitar problemas com o tipo Date
    const startDateStr = startDateUTC.toISOString();
    const endDateStr = endDateUTC.toISOString();
    // Verificar se a coluna closedAt existe no modelo Ticket
    // Se não existir, usaremos updatedAt quando status = 'closed'
    const ticketsByUser = await User_1.default.findAll({
        attributes: [
            "id",
            "name",
            [sequelize_1.Sequelize.fn("COUNT", sequelize_1.Sequelize.col("tickets.id")), "total"],
            [
                sequelize_1.Sequelize.fn("SUM", sequelize_1.Sequelize.literal(`CASE WHEN "tickets"."status" = 'closed' THEN 1 ELSE 0 END`)),
                "finished"
            ],
            [
                sequelize_1.Sequelize.fn("AVG", sequelize_1.Sequelize.literal(`CASE WHEN "tickets"."status" = 'closed' THEN EXTRACT(EPOCH FROM ("tickets"."updatedAt" - "tickets"."createdAt")) ELSE NULL END`)),
                "avgResponseTime"
            ]
        ],
        include: [
            {
                model: Ticket_1.default,
                as: "tickets",
                attributes: [],
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
                required: false
            }
        ],
        where: {
            companyId,
            profile: "user"
        },
        group: ["User.id", "User.name"],
        order: [[sequelize_1.Sequelize.literal("total"), "DESC"]],
        raw: true
    });
    const formattedTicketsByUser = ticketsByUser.map(user => ({
        userId: user.id,
        name: user.name,
        total: parseInt(user.total, 10) || 0,
        finished: parseInt(user.finished, 10) || 0,
        avgResponseTime: user.avgResponseTime ? parseFloat(user.avgResponseTime) : null,
        percentageResolved: parseInt(user.total, 10) > 0
            ? Math.round((parseInt(user.finished, 10) / parseInt(user.total, 10)) * 100)
            : 0
    }));
    return formattedTicketsByUser;
};
exports.default = GetTicketsByUserService;
