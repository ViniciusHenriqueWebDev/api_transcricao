import { Op, QueryTypes } from "sequelize";
import Tag from "../../models/Tag";
import TicketTag from "../../models/TicketTag";
import Ticket from "../../models/Ticket";
import sequelize from "../../database";

interface Request {
  companyId: number;
  startDate: string;
  endDate: string;
}

interface TagCount {
  tagId: number;
  name: string;
  color: string;
  count: number;
  percentage: number;
}

const GetTopTagsService = async ({
  companyId,
  startDate,
  endDate
}: Request): Promise<TagCount[]> => {
  const startDateUTC = new Date(startDate);
  const endDateUTC = new Date(endDate);
  endDateUTC.setDate(endDateUTC.getDate() + 1);

  // Formatando as datas como strings para evitar problemas com o tipo Date
  const startDateStr = startDateUTC.toISOString();
  const endDateStr = endDateUTC.toISOString();

  // Primeiro, vamos obter todas as tickets do período
  const tickets = await Ticket.findAll({
    attributes: ["id"],
    where: {
      companyId,
      [Op.or]: [
        {
          createdAt: {
            [Op.gte]: startDateStr,
            [Op.lt]: endDateStr
          }
        },
        {
          updatedAt: {
            [Op.gte]: startDateStr,
            [Op.lt]: endDateStr
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

  let tagCounts: any[] = [];
  
  try {
    tagCounts = await sequelize.query(query, {
      replacements: [companyId],
      type: QueryTypes.SELECT
    });
  } catch (error) {
    console.error("Erro ao buscar tags:", error);
    return [];
  }

  const totalTagged = tagCounts.reduce(
    (acc, tag) => acc + parseInt(tag.count, 10),
    0
  );

  const tagsWithPercentage = tagCounts.map(tag => ({
    tagId: tag.id,
    name: tag.name,
    color: tag.color,
    count: parseInt(tag.count, 10),
    percentage: totalTagged > 0 ? Math.round((parseInt(tag.count, 10) / totalTagged) * 100) : 0
  }));

  return tagsWithPercentage;
};

export default GetTopTagsService;