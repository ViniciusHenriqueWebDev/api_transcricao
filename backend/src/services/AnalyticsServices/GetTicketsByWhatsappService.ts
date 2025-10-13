import { Op, Sequelize } from "sequelize";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";

interface Request {
  companyId: number;
  startDate: string;
  endDate: string;
}

interface WhatsappCount {
  whatsappId: number;
  name: string;
  count: number;
  percentage: number;
}

interface TicketWhatsappResult {
  whatsappId: number;
  count: string;
  "whatsapp.name"?: string;
}

const GetTicketsByWhatsappService = async ({
  companyId,
  startDate,
  endDate
}: Request): Promise<WhatsappCount[]> => {
  const startDateUTC = new Date(startDate);
  const endDateUTC = new Date(endDate);
  endDateUTC.setDate(endDateUTC.getDate() + 1);

  // Formatando as datas como strings para evitar problemas com o tipo Date
  const startDateStr = startDateUTC.toISOString();
  const endDateStr = endDateUTC.toISOString();

  const ticketsByWhatsapp = await Ticket.findAll({
    attributes: [
      "whatsappId",
      [Sequelize.fn("count", Sequelize.col("Ticket.id")), "count"],
      [Sequelize.literal('"whatsapp"."name"'), "whatsapp.name"]
    ],
    include: [
      {
        model: Whatsapp,
        as: "whatsapp",
        attributes: []
      }
    ],
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
    group: ["whatsappId", "whatsapp.name"],
    raw: true
  }) as unknown as TicketWhatsappResult[];

  // Se não houver resultados, retorne array vazio
  if (ticketsByWhatsapp.length === 0) {
    return [];
  }

  const totalTickets = ticketsByWhatsapp.reduce(
    (acc, whatsapp) => acc + parseInt(whatsapp.count, 10),
    0
  );

  const whatsappsWithPercentage = ticketsByWhatsapp.map(whatsapp => ({
    whatsappId: whatsapp.whatsappId,
    name: whatsapp["whatsapp.name"] || "WhatsApp Removido",
    count: parseInt(whatsapp.count, 10),
    percentage: Math.round((parseInt(whatsapp.count, 10) / totalTickets) * 100) || 0
  }));

  return whatsappsWithPercentage;
};

export default GetTicketsByWhatsappService;