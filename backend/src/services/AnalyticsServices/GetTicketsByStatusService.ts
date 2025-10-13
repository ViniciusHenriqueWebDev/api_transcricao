import { fn, col, Op, WhereOptions } from "sequelize";
import Ticket from "../../models/Ticket";

interface Request {
  companyId: number;
  startDate: string;
  endDate: string;
}

interface StatusCount {
  status: string;
  count: number;
  percentage: number;
}

const GetTicketsByStatusService = async ({
  companyId,
  startDate,
  endDate
}: Request): Promise<StatusCount[]> => {
  // Adicionando o horário às datas para filtrar com precisão
  const startDateWithTime = `${startDate} 00:00:00`;
  const endDateWithTime = `${endDate} 23:59:59`;

  const results = await Ticket.findAll({
    attributes: [
      'status',
      [fn('COUNT', col('id')), 'count']
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
    group: ['status'],
    raw: true
  });

  // Calcular o total para percentagens
  const total = results.reduce((acc, curr: any) => acc + parseInt(curr.count, 10), 0);

  // Formatar e calcular percentagens
  const formattedResults = results.map((item: any) => ({
    status: item.status,
    count: parseInt(item.count, 10),
    percentage: total > 0 ? Math.round((parseInt(item.count, 10) / total) * 100) : 0
  }));

  return formattedResults.sort((a, b) => b.count - a.count);
};

export default GetTicketsByStatusService;