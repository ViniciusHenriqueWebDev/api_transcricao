import { Op, Sequelize } from "sequelize";
import Ticket from "../../models/Ticket";
import Queue from "../../models/Queue";

interface Request {
  companyId: number;
  startDate: string;
  endDate: string;
}

interface QueueCount {
  queueId: number | null;
  name: string;
  count: number;
  percentage: number;
}

interface TicketQueueResult {
  queueId: number | null;
  count: string;
  "queue.name"?: string;
}

const GetTicketsByQueueService = async ({
  companyId,
  startDate,
  endDate
}: Request): Promise<QueueCount[]> => {
  const startDateUTC = new Date(startDate);
  const endDateUTC = new Date(endDate);
  endDateUTC.setDate(endDateUTC.getDate() + 1);

  // Formatando as datas como strings para evitar problemas com o tipo Date
  const startDateStr = startDateUTC.toISOString();
  const endDateStr = endDateUTC.toISOString();

  const ticketsByQueue = await Ticket.findAll({
    attributes: [
      "queueId",
      [Sequelize.fn("count", Sequelize.col("Ticket.id")), "count"],
      [Sequelize.literal('"queue"."name"'), "queue.name"]
    ],
    include: [
      {
        model: Queue,
        as: "queue",
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
    group: ["queueId", "queue.name"],
    raw: true
  }) as unknown as TicketQueueResult[];

  // Se não houver resultados, retorne array vazio
  if (ticketsByQueue.length === 0) {
    return [];
  }

  const totalTickets = ticketsByQueue.reduce(
    (acc, queue) => acc + parseInt(queue.count, 10),
    0
  );

  const queuesWithPercentage = ticketsByQueue.map(queue => ({
    queueId: queue.queueId,
    name: queue.queueId ? queue["queue.name"] || "Fila Removida" : "Sem Fila",
    count: parseInt(queue.count, 10),
    percentage: Math.round((parseInt(queue.count, 10) / totalTickets) * 100) || 0
  }));

  return queuesWithPercentage;
};

export default GetTicketsByQueueService;