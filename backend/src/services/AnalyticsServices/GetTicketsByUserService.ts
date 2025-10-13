import { Op, Sequelize } from "sequelize";
import User from "../../models/User";
import Ticket from "../../models/Ticket";

interface Request {
  companyId: number;
  startDate: string;
  endDate: string;
}

interface UserTicketCount {
  userId: number;
  name: string;
  total: number;
  finished: number;
  avgResponseTime: number | null;
  percentageResolved: number;
}

interface UserTicketResult {
  id: number;
  name: string;
  total: string;
  finished: string;
  avgResponseTime: string | null;
}

const GetTicketsByUserService = async ({
  companyId,
  startDate,
  endDate
}: Request): Promise<UserTicketCount[]> => {
  const startDateUTC = new Date(startDate);
  const endDateUTC = new Date(endDate);
  endDateUTC.setDate(endDateUTC.getDate() + 1);

  // Formatando as datas como strings para evitar problemas com o tipo Date
  const startDateStr = startDateUTC.toISOString();
  const endDateStr = endDateUTC.toISOString();

  // Verificar se a coluna closedAt existe no modelo Ticket
  // Se não existir, usaremos updatedAt quando status = 'closed'
  const ticketsByUser = await User.findAll({
    attributes: [
      "id",
      "name",
      [Sequelize.fn("COUNT", Sequelize.col("tickets.id")), "total"],
      [
        Sequelize.fn(
          "SUM",
          Sequelize.literal(`CASE WHEN "tickets"."status" = 'closed' THEN 1 ELSE 0 END`)
        ),
        "finished"
      ],
      [
        Sequelize.fn(
          "AVG",
          Sequelize.literal(
            `CASE WHEN "tickets"."status" = 'closed' THEN EXTRACT(EPOCH FROM ("tickets"."updatedAt" - "tickets"."createdAt")) ELSE NULL END`
          )
        ),
        "avgResponseTime"
      ]
    ],
    include: [
      {
        model: Ticket,
        as: "tickets",
        attributes: [],
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
        required: false
      }
    ],
    where: {
      companyId,
      profile: "user"
    },
    group: ["User.id", "User.name"],
    order: [[Sequelize.literal("total"), "DESC"]],
    raw: true
  }) as unknown as UserTicketResult[];

  const formattedTicketsByUser = ticketsByUser.map(user => ({
    userId: user.id,
    name: user.name,
    total: parseInt(user.total, 10) || 0,
    finished: parseInt(user.finished, 10) || 0,
    avgResponseTime: user.avgResponseTime ? parseFloat(user.avgResponseTime) : null,
    percentageResolved: 
      parseInt(user.total, 10) > 0 
        ? Math.round((parseInt(user.finished, 10) / parseInt(user.total, 10)) * 100) 
        : 0
  }));

  return formattedTicketsByUser;
};

export default GetTicketsByUserService;