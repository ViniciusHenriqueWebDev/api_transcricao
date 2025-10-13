import GetTicketsByUserService from "./GetTicketsByUserService";
import GetTicketsByStatusService from "./GetTicketsByStatusService";
import GetTicketsByQueueService from "./GetTicketsByQueueService";
import GetTicketsByWhatsappService from "./GetTicketsByWhatsappService";
import GetTicketsByTimeService from "./GetTicketsByTimeService";
import GetTicketsEvolutionService from "./GetTicketsEvolutionService";
import GetTopTagsService from "./GetTopTagsService";
import GetQueueEfficiencyService from "./GetQueueEfficiencyService";
import { logger } from "../../utils/logger";

interface Request {
  companyId: number;
  startDate: string;
  endDate: string;
}

interface DashboardData {
  ticketsByUser: any[];
  ticketsByStatus: any[];
  ticketsByQueue: any[];
  ticketsByWhatsapp: any[];
  ticketsByTime: any[];
  ticketsEvolution: any[];
  topTags: any[];
  queueEfficiency: any[];
  ticketsByDay?: any[]; // Adicionando como opcional
  ticketsByHour?: any[]; // Adicionando como opcional
}

// Função auxiliar que tenta executar uma ação e, em caso de erro, retorna um array vazio e registra o erro
const fetchWithFallback = async (fn: Function, serviceName: string): Promise<any> => {
  try {
    const result = await fn();
    logger.info(`${serviceName} executado com sucesso`);
    return result;
  } catch (error) {
    logger.error(`Erro ao buscar dados de ${serviceName}: ${error.message}`, error);
    console.error(`Erro ao buscar dados de ${serviceName}:`, error);
    return [];
  }
};

const GetDashboardDataService = async ({
  companyId,
  startDate,
  endDate
}: Request): Promise<DashboardData> => {
  try {
    logger.info(`Iniciando busca de dados do dashboard para company ${companyId}`);
    
    // Para debug - imprimir os dados usados na busca
    console.log(`Buscando dados do dashboard:`, { companyId, startDate, endDate });
    
    // Executar cada serviço com tratamento de erro independente
    const ticketsByUser = await fetchWithFallback(
      () => GetTicketsByUserService({ companyId, startDate, endDate }),
      'GetTicketsByUserService'
    );
    
    const ticketsByStatus = await fetchWithFallback(
      () => GetTicketsByStatusService({ companyId, startDate, endDate }),
      'GetTicketsByStatusService'
    );
    
    const ticketsByQueue = await fetchWithFallback(
      () => GetTicketsByQueueService({ companyId, startDate, endDate }),
      'GetTicketsByQueueService'
    );
    
    const ticketsByWhatsapp = await fetchWithFallback(
      () => GetTicketsByWhatsappService({ companyId, startDate, endDate }),
      'GetTicketsByWhatsappService'
    );
    
    const ticketsByTime = await fetchWithFallback(
      () => GetTicketsByTimeService({ companyId, startDate, endDate }),
      'GetTicketsByTimeService'
    );
    
    const ticketsEvolution = await fetchWithFallback(
      () => GetTicketsEvolutionService({ companyId, startDate, endDate }),
      'GetTicketsEvolutionService'
    );
    
    const topTags = await fetchWithFallback(
      () => GetTopTagsService({ companyId, startDate, endDate }),
      'GetTopTagsService'
    );
    
    const queueEfficiency = await fetchWithFallback(
      () => GetQueueEfficiencyService({ companyId, startDate, endDate }),
      'GetQueueEfficiencyService'
    );

    const result = {
      ticketsByUser,
      ticketsByStatus,
      ticketsByQueue,
      ticketsByWhatsapp,
      ticketsByTime,
      ticketsEvolution,
      topTags,
      queueEfficiency
    };
    
    // Para debug - ver quantos itens cada serviço retornou
    console.log("Resultados do dashboard:", {
      ticketsByUser: ticketsByUser.length,
      ticketsByStatus: ticketsByStatus.length,
      ticketsByQueue: ticketsByQueue.length,
      ticketsByWhatsapp: ticketsByWhatsapp.length,
      ticketsByTime: ticketsByTime.length,
      ticketsEvolution: ticketsEvolution.length,
      topTags: topTags.length,
      queueEfficiency: queueEfficiency.length
    });
    
    return result;
  } catch (error) {
    logger.error("Erro geral ao obter dados do dashboard:", error);
    console.error("Erro ao obter dados do dashboard:", error);
    // Retorna objeto vazio em caso de erro geral
    return {
      ticketsByUser: [],
      ticketsByStatus: [],
      ticketsByQueue: [],
      ticketsByWhatsapp: [],
      ticketsByTime: [],
      ticketsEvolution: [],
      topTags: [],
      queueEfficiency: []
    };
  }
};

export default GetDashboardDataService;