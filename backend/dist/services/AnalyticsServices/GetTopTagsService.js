"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const database_1 = __importDefault(require("../../database"));
const GetTopTagsService = async ({ companyId, startDate, endDate }) => {
    const startDateUTC = new Date(startDate);
    const endDateUTC = new Date(endDate);
    endDateUTC.setDate(endDateUTC.getDate() + 1);
    // Formatando as datas como strings para evitar problemas com o tipo Date
    const startDateStr = startDateUTC.toISOString();
    const endDateStr = endDateUTC.toISOString();
    // Primeiro, vamos obter todas as tickets do período
    const tickets = await Ticket_1.default.findAll({
        attributes: ["id"],
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
        raw: true
    });
    const ticketIds = tickets.map(t => t.id);
    if (ticketIds.length === 0) {
        return [];
    }
    // Agora, vamos buscar as tags associadas a esses tickets
    const query = `
    SELECT 
      "Tag"."id", 
      "Tag"."name", 
      "Tag"."color", 
      COUNT("TicketTag"."tagId") AS "count"
    FROM "Tags" AS "Tag"
    INNER JOIN "TicketTags" AS "TicketTag" ON "Tag"."id" = "TicketTag"."tagId"
    WHERE "TicketTag"."ticketId" IN (${ticketIds.join(',')})
      AND "Tag"."companyId" = ?
    GROUP BY "Tag"."id", "Tag"."name", "Tag"."color"
    ORDER BY "count" DESC
    LIMIT 10
  `;
    let tagCounts = [];
    try {
        tagCounts = await database_1.default.query(query, {
            replacements: [companyId],
            type: sequelize_1.QueryTypes.SELECT
        });
    }
    catch (error) {
        console.error("Erro ao buscar tags:", error);
        return [];
    }
    const totalTagged = tagCounts.reduce((acc, tag) => acc + parseInt(tag.count, 10), 0);
    const tagsWithPercentage = tagCounts.map(tag => ({
        tagId: tag.id,
        name: tag.name,
        color: tag.color,
        count: parseInt(tag.count, 10),
        percentage: totalTagged > 0 ? Math.round((parseInt(tag.count, 10) / totalTagged) * 100) : 0
    }));
    return tagsWithPercentage;
};
exports.default = GetTopTagsService;
