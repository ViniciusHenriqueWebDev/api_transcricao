"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const Queue_1 = __importDefault(require("../../models/Queue"));
const GetQueueEfficiencyService = async ({ companyId, startDate, endDate }) => {
    const startDateUTC = new Date(startDate);
    const endDateUTC = new Date(endDate);
    endDateUTC.setDate(endDateUTC.getDate() + 1);
    // Formatando as datas como strings para evitar problemas com o tipo Date
    const startDateStr = startDateUTC.toISOString();
    const endDateStr = endDateUTC.toISOString();
    try {
        const efficiency = await Ticket_1.default.findAll({
            attributes: [
                "queueId",
                [sequelize_1.Sequelize.fn("count", sequelize_1.Sequelize.col("Ticket.id")), "tickets"],
                // Usando NULL para avgResponseTime já que não temos timestamp para primeira resposta
                [
                    sequelize_1.Sequelize.literal(`NULL`),
                    "avgResponseTime"
                ],
                [
                    sequelize_1.Sequelize.fn("AVG", sequelize_1.Sequelize.literal(`CASE WHEN "Ticket"."status" = 'closed' THEN EXTRACT(EPOCH FROM ("Ticket"."updatedAt" - "Ticket"."createdAt")) ELSE NULL END`)),
                    "avgResolutionTime"
                ],
                [
                    sequelize_1.Sequelize.fn("SUM", sequelize_1.Sequelize.literal(`CASE WHEN "Ticket"."status" = 'closed' THEN 1 ELSE 0 END`)),
                    "resolved"
                ],
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
                ],
                queueId: {
                    [sequelize_1.Op.not]: null
                }
            },
            group: ["queueId", "queue.name"],
            raw: true
        });
        // Se não houver resultados, retorne array vazio
        if (!efficiency || efficiency.length === 0) {
            return [];
        }
        const formattedEfficiency = efficiency.map(queue => ({
            queueId: queue.queueId,
            name: queue["queue.name"] || "Fila Removida",
            tickets: parseInt(queue.tickets, 10),
            avgResponseTime: null,
            avgResolutionTime: queue.avgResolutionTime ? parseFloat(queue.avgResolutionTime) : null,
            percentageResolved: Math.round((parseInt(queue.resolved, 10) / parseInt(queue.tickets, 10)) * 100) || 0
        }));
        return formattedEfficiency;
    }
    catch (error) {
        console.error("Erro ao calcular eficiência das filas:", error);
        return [];
    }
};
exports.default = GetQueueEfficiencyService;
