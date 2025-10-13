import { Op, Sequelize } from "sequelize";
import Ticket from "../../models/Ticket";
import Queue from "../../models/Queue";

interface Request {
  companyId: number;
  startDate: string;
  endDate: string;
}

interface QueueEfficiency {
  queueId: number;
  name: string;
  tickets: number;
  avgResponseTime: number | null;
  avgResolutionTime: number | null;
  percentageResolved: number;
}

interface EfficiencyResult {
  queueId: number;
  tickets: string;
  avgResponseTime: string | null;
  avgResolutionTime: string | null;
  resolved: string;
  "queue.name"?: string;
}

const GetQueueEfficiencyService = async ({
  companyId,
  startDate,
  endDate
}: Request): Promise<QueueEfficiency[]> => {
  const startDateUTC = new Date(startDate);
  const endDateUTC = new Date(endDate);
  endDateUTC.setDate(endDateUTC.getDate() + 1);

  // Formatando as datas como strings para evitar problemas com o tipo Date
  const startDateStr = startDateUTC.toISOString();
  const endDateStr = endDateUTC.toISOString();

  try {
    const efficiency = await Ticket.findAll({
      attributes: [
        "queueId",
        [Sequelize.fn("count", Sequelize.col("Ticket.id")), "tickets"],
        // Usando NULL para avgResponseTime já que não temos timestamp para primeira resposta
        [
          Sequelize.literal(`NULL`),
          "avgResponseTime"
        ],
        [
          Sequelize.fn(
            "AVG",
            Sequelize.literal(
              `CASE WHEN "Ticket"."status" = 'closed' THEN EXTRACT(EPOCH FROM ("Ticket"."updatedAt" - "Ticket"."createdAt")) ELSE NULL END`
            )
          ),
          "avgResolutionTime"
        ],
        [
          Sequelize.fn(
            "SUM",
            Sequelize.literal(`CASE WHEN "Ticket"."status" = 'closed' THEN 1 ELSE 0 END`)
          ),
          "resolved"
        ],
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
        ],
        queueId: {
          [Op.not]: null
        }
      },
      group: ["queueId", "queue.name"],
      raw: true
    }) as unknown as EfficiencyResult[];

    // Se não houver resultados, retorne array vazio
    if (!efficiency || efficiency.length === 0) {
      return [];
    }

    const formattedEfficiency = efficiency.map(queue => ({
      queueId: queue.queueId,
      name: queue["queue.name"] || "Fila Removida",
      tickets: parseInt(queue.tickets, 10),
      avgResponseTime: null, // Não é possível calcular tempo de resposta sem timestamp válido
      avgResolutionTime: queue.avgResolutionTime ? parseFloat(queue.avgResolutionTime) : null,
      percentageResolved: Math.round((parseInt(queue.resolved, 10) / parseInt(queue.tickets, 10)) * 100) || 0
    }));

    return formattedEfficiency;
  } catch (error) {
    console.error("Erro ao calcular eficiência das filas:", error);
    return [];
  }
};

export default GetQueueEfficiencyService;