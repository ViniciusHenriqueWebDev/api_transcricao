import { fn, col, literal, Op, WhereOptions } from "sequelize";
import { format, parseISO, differenceInDays } from "date-fns";
import Ticket from "../../models/Ticket";

interface Request {
  companyId: number;
  startDate: string;
  endDate: string;
}

interface DateCount {
  date: string;
  total: number;
  open: number;
  pending: number;
  closed: number;
}

const GetTicketsEvolutionService = async ({
  companyId,
  startDate,
  endDate
}: Request): Promise<DateCount[]> => {
  // Adicionando o horário às datas para filtrar com precisão
  const startDateWithTime = `${startDate} 00:00:00`;
  const endDateWithTime = `${endDate} 23:59:59`;

  // Diferença em dias entre as datas
  const daysDiff = differenceInDays(new Date(endDate), new Date(startDate));
  
  // Escolher formato de agrupamento baseado no período
  let dateExtractor;
  
  if (daysDiff <= 31) {
    // Para períodos até 31 dias, agrupar por dia
    dateExtractor = fn('DATE', col('createdAt'));
  } else if (daysDiff <= 365) {
    // Para períodos até um ano, agrupar por semana
    dateExtractor = fn('TO_CHAR', col('createdAt'), literal("'YYYY-WW'"));
  } else {
    // Para períodos maiores, agrupar por mês
    dateExtractor = fn('TO_CHAR', col('createdAt'), literal("'YYYY-MM'"));
  }

  const results = await Ticket.findAll({
    attributes: [
      [dateExtractor, 'date'],
      [fn('COUNT', col('id')), 'total'],
      [fn('SUM', literal('CASE WHEN status = \'open\' THEN 1 ELSE 0 END')), 'open'],
      [fn('SUM', literal('CASE WHEN status = \'pending\' THEN 1 ELSE 0 END')), 'pending'],
      [fn('SUM', literal('CASE WHEN status = \'closed\' THEN 1 ELSE 0 END')), 'closed']
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
    group: [dateExtractor], // Usar o extrator de data já definido
    order: [[dateExtractor, 'ASC']],
    raw: true
  });

  // Formatar dados para o retorno
  return results.map((item: any) => ({
    date: item.date,
    total: parseInt(item.total, 10),
    open: parseInt(item.open, 10),
    pending: parseInt(item.pending, 10),
    closed: parseInt(item.closed, 10)
  }));
};

export default GetTicketsEvolutionService;