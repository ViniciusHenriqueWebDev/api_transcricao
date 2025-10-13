import { fn, col, literal, Op, where, WhereOptions } from "sequelize";
import { format, parseISO } from "date-fns";
import Ticket from "../../models/Ticket";

interface Request {
  companyId: number;
  startDate: string;
  endDate: string;
}

interface TimeAnalysis {
  byDay: Array<{
    date: string;
    count: number;
  }>;
  byHour: Array<{
    hour: number;
    count: number;
  }>;
}

const GetTicketsByTimeService = async ({
  companyId,
  startDate,
  endDate
}: Request): Promise<TimeAnalysis> => {
  // Adicionando o horário às datas para filtrar com precisão
  const startDateWithTime = `${startDate} 00:00:00`;
  const endDateWithTime = `${endDate} 23:59:59`;

  // Analisar tickets por hora
  const ticketsByHour = await Ticket.findAll({
    attributes: [
      [fn("EXTRACT", literal("HOUR FROM \"createdAt\"")), "hour"],
      [fn("COUNT", "*"), "count"]
    ],
    where: {
          companyId,
          [Op.or]: [
            {
              createdAt: {
                [Op.gte]: startDateWithTime,
                [Op.lte]: endDateWithTime
              }
            },
            {
              updatedAt: {
                [Op.gte]: startDateWithTime,
                [Op.lte]: endDateWithTime
              }
            }
          ]
        } as WhereOptions, 
    group: [fn("EXTRACT", literal("HOUR FROM \"createdAt\""))],
    order: [[fn("EXTRACT", literal("HOUR FROM \"createdAt\"")), "ASC"]],
    raw: true
  });

  // Analisar tickets por dia
  const ticketsByDay = await Ticket.findAll({
    attributes: [
      [fn("DATE", col("createdAt")), "date"],
      [fn("COUNT", "*"), "count"]
    ],
    where: {
      companyId,
      [Op.or]: [
        {
          createdAt: {
            [Op.gte]: startDateWithTime,
            [Op.lte]: endDateWithTime
          }
        },
        {
          updatedAt: {
            [Op.gte]: startDateWithTime,
            [Op.lte]: endDateWithTime
          }
        }
      ]
    } as WhereOptions, 
    group: [fn("DATE", col("createdAt"))],
    order: [[fn("DATE", col("createdAt")), "ASC"]],
    raw: true
  });

  // Formatar dados para o retorno
  const formattedByHour = ticketsByHour.map((item: any) => ({
    hour: parseInt(item.hour, 10),
    count: parseInt(item.count, 10)
  }));

  const formattedByDay = ticketsByDay.map((item: any) => ({
    date: format(new Date(item.date), 'yyyy-MM-dd'),
    count: parseInt(item.count, 10)
  }));

  return {
    byHour: formattedByHour,
    byDay: formattedByDay
  };
};

export default GetTicketsByTimeService;