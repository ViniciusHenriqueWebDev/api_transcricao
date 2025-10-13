"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const GetTicketsByWhatsappService = async ({ companyId, startDate, endDate }) => {
    const startDateUTC = new Date(startDate);
    const endDateUTC = new Date(endDate);
    endDateUTC.setDate(endDateUTC.getDate() + 1);
    // Formatando as datas como strings para evitar problemas com o tipo Date
    const startDateStr = startDateUTC.toISOString();
    const endDateStr = endDateUTC.toISOString();
    const ticketsByWhatsapp = await Ticket_1.default.findAll({
        attributes: [
            "whatsappId",
            [sequelize_1.Sequelize.fn("count", sequelize_1.Sequelize.col("Ticket.id")), "count"],
            [sequelize_1.Sequelize.literal('"whatsapp"."name"'), "whatsapp.name"]
        ],
        include: [
            {
                model: Whatsapp_1.default,
                as: "whatsapp",
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
        group: ["whatsappId", "whatsapp.name"],
        raw: true
    });
    // Se não houver resultados, retorne array vazio
    if (ticketsByWhatsapp.length === 0) {
        return [];
    }
    const totalTickets = ticketsByWhatsapp.reduce((acc, whatsapp) => acc + parseInt(whatsapp.count, 10), 0);
    const whatsappsWithPercentage = ticketsByWhatsapp.map(whatsapp => ({
        whatsappId: whatsapp.whatsappId,
        name: whatsapp["whatsapp.name"] || "WhatsApp Removido",
        count: parseInt(whatsapp.count, 10),
        percentage: Math.round((parseInt(whatsapp.count, 10) / totalTickets) * 100) || 0
    }));
    return whatsappsWithPercentage;
};
exports.default = GetTicketsByWhatsappService;
