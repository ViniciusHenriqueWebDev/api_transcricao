import { Request, Response } from "express";
import * as Yup from "yup";
import AppError from "../errors/AppError";
import * as FeatureServices from "../services/FeatureServices"; 

import GetDashboardDataService from "../services/AnalyticsServices/GetDashboardDataService";
import GetTicketsByUserService from "../services/AnalyticsServices/GetTicketsByUserService";
import GetTicketsByStatusService from "../services/AnalyticsServices/GetTicketsByStatusService";
import GetTicketsByQueueService from "../services/AnalyticsServices/GetTicketsByQueueService";
import GetTicketsByWhatsappService from "../services/AnalyticsServices/GetTicketsByWhatsappService";
import GetTicketsByTimeService from "../services/AnalyticsServices/GetTicketsByTimeService";
import GetTicketsEvolutionService from "../services/AnalyticsServices/GetTicketsEvolutionService";
import GetTopTagsService from "../services/AnalyticsServices/GetTopTagsService";
import GetQueueEfficiencyService from "../services/AnalyticsServices/GetQueueEfficiencyService";
import GetAllActiveTicketsService from "../services/AnalyticsServices/GetAllActiveTicketsService";
import { getTodayPeriod, getCurrentWeekPeriod, getCurrentMonthPeriod } from "../utils/dateHelpers";


interface DateFilter {
  startDate: string;
  endDate: string;
  filterActive?: boolean;
}

export const getPredefinedPeriod = async (req: Request, res: Response): Promise<Response> => {
  const { period } = req.params;
  const { companyId } = req.user;
  
  let dateRange;
  
  switch (period) {
    case 'today':
      dateRange = getTodayPeriod();
      break;
    case 'week':
      dateRange = getCurrentWeekPeriod();
      break;
    case 'month':
      dateRange = getCurrentMonthPeriod();
      break;
    default:
      return res.status(400).json({ error: "Período inválido. Use 'today', 'week' ou 'month'." });
  }
  
  try {
    // Usamos o GetDashboardDataService para todos os períodos para garantir consistência
    const dashboardData = await GetDashboardDataService({
      companyId,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    });
    
    // Se for 'today', aprimoramos alguns dados específicos com o GetAllActiveTicketsService
    if (period === 'today') {
      try {
        const activeData = await GetAllActiveTicketsService({ companyId });
        
        // Mantemos os dados do GetDashboardDataService, mas complementamos com dados 
        // mais precisos do GetAllActiveTicketsService para visualizações específicas
        const data = {
          ...dashboardData,
          // Usamos os dados do GetAllActiveTicketsService apenas para as métricas
          // que ele calcula melhor para o período "today"
          ticketsByStatus: activeData.ticketsByStatus || dashboardData.ticketsByStatus,
          ticketsByDay: activeData.ticketsByDay || dashboardData.ticketsByDay,
          ticketsByHour: activeData.ticketsByHour || dashboardData.ticketsByHour
        };
        
        return res.status(200).json({
          data,
          period: {
            type: period,
            ...dateRange
          }
        });
      } catch (activeError) {
        // Se o GetAllActiveTicketsService falhar, continuamos com os dados do GetDashboardDataService
        console.error("Erro ao buscar dados ativos:", activeError);
      }
    }

    // Se não for 'today' ou se o GetAllActiveTicketsService falhar, usamos apenas os dados do GetDashboardDataService
    return res.status(200).json({
      data: dashboardData,
      period: {
        type: period,
        ...dateRange
      }
    });
  } catch (err) {
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    return res.status(500).json({ error: "Erro interno do servidor", details: err.message });
  }
};

export const getDashboardData = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  
  try {
    const schema = Yup.object().shape({
      startDate: Yup.string().required(),
      endDate: Yup.string().required()
    });
    
    await schema.validate(req.query);

    const { startDate, endDate } = req.query as unknown as DateFilter;
    
    console.log("AnalyticsController: Requisição recebida:", {
      companyId,
      startDate,
      endDate
    });
    
    const data = await GetDashboardDataService({
      companyId,
      startDate,
      endDate
    });

    console.log("AnalyticsController: Dados retornados com sucesso");
    return res.status(200).json(data);
  } catch (err) {
    console.error("AnalyticsController: Erro ao processar requisição:", err);
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    return res.status(500).json({ error: "Erro interno do servidor" });
  }
};

export const getTicketsByUser = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  
  const schema = Yup.object().shape({
    startDate: Yup.string().required(),
    endDate: Yup.string().required()
  });

  try {
    await schema.validate(req.query);
  } catch (err) {
    throw new AppError(err.message);
  }

  const { startDate, endDate } = req.query as unknown as DateFilter;
  
  const data = await GetTicketsByUserService({
    companyId,
    startDate,
    endDate
  });

  return res.status(200).json(data);
};

export const getTicketsByStatus = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  
  const schema = Yup.object().shape({
    startDate: Yup.string().required(),
    endDate: Yup.string().required()
  });

  try {
    await schema.validate(req.query);
  } catch (err) {
    throw new AppError(err.message);
  }

  const { startDate, endDate } = req.query as unknown as DateFilter;
  
  const data = await GetTicketsByStatusService({
    companyId,
    startDate,
    endDate
  });

  return res.status(200).json(data);
};

export const getTicketsByQueue = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  
  const schema = Yup.object().shape({
    startDate: Yup.string().required(),
    endDate: Yup.string().required()
  });

  try {
    await schema.validate(req.query);
  } catch (err) {
    throw new AppError(err.message);
  }

  const { startDate, endDate } = req.query as unknown as DateFilter;
  
  const data = await GetTicketsByQueueService({
    companyId,
    startDate,
    endDate
  });

  return res.status(200).json(data);
};

export const getTicketsByWhatsapp = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  
  const schema = Yup.object().shape({
    startDate: Yup.string().required(),
    endDate: Yup.string().required()
  });

  try {
    await schema.validate(req.query);
  } catch (err) {
    throw new AppError(err.message);
  }

  const { startDate, endDate } = req.query as unknown as DateFilter;
  
  const data = await GetTicketsByWhatsappService({
    companyId,
    startDate,
    endDate
  });

  return res.status(200).json(data);
};

export const getTicketsByTime = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  
  const schema = Yup.object().shape({
    startDate: Yup.string().required(),
    endDate: Yup.string().required()
  });

  try {
    await schema.validate(req.query);
  } catch (err) {
    throw new AppError(err.message);
  }

  const { startDate, endDate } = req.query as unknown as DateFilter;
  
  const data = await GetTicketsByTimeService({
    companyId,
    startDate,
    endDate
  });

  return res.status(200).json(data);
};

export const getTicketsEvolution = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  
  const schema = Yup.object().shape({
    startDate: Yup.string().required(),
    endDate: Yup.string().required()
  });

  try {
    await schema.validate(req.query);
  } catch (err) {
    throw new AppError(err.message);
  }

  const { startDate, endDate } = req.query as unknown as DateFilter;
  
  const data = await GetTicketsEvolutionService({
    companyId,
    startDate,
    endDate
  });

  return res.status(200).json(data);
};

export const getTopTags = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  
  const schema = Yup.object().shape({
    startDate: Yup.string().required(),
    endDate: Yup.string().required()
  });

  try {
    await schema.validate(req.query);
  } catch (err) {
    throw new AppError(err.message);
  }

  const { startDate, endDate } = req.query as unknown as DateFilter;
  
  const data = await GetTopTagsService({
    companyId,
    startDate,
    endDate
  });

  return res.status(200).json(data);
};

export const getQueueEfficiency = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  
  const schema = Yup.object().shape({
    startDate: Yup.string().required(),
    endDate: Yup.string().required()
  });

  try {
    await schema.validate(req.query);
  } catch (err) {
    throw new AppError(err.message);
  }

  const { startDate, endDate } = req.query as unknown as DateFilter;
  
  const data = await GetQueueEfficiencyService({
    companyId,
    startDate,
    endDate
  });

  return res.status(200).json(data);
};