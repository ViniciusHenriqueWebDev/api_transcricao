"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const GetTicketsByUserService_1 = __importDefault(require("./GetTicketsByUserService"));
const GetTicketsByStatusService_1 = __importDefault(require("./GetTicketsByStatusService"));
const GetTicketsByQueueService_1 = __importDefault(require("./GetTicketsByQueueService"));
const GetTicketsByWhatsappService_1 = __importDefault(require("./GetTicketsByWhatsappService"));
const GetTicketsByTimeService_1 = __importDefault(require("./GetTicketsByTimeService"));
const GetTicketsEvolutionService_1 = __importDefault(require("./GetTicketsEvolutionService"));
const GetTopTagsService_1 = __importDefault(require("./GetTopTagsService"));
const GetQueueEfficiencyService_1 = __importDefault(require("./GetQueueEfficiencyService"));
const logger_1 = require("../../utils/logger");
// Função auxiliar que tenta executar uma ação e, em caso de erro, retorna um array vazio e registra o erro
const fetchWithFallback = async (fn, serviceName) => {
    try {
        const result = await fn();
        logger_1.logger.info(`${serviceName} executado com sucesso`);
        return result;
    }
    catch (error) {
        logger_1.logger.error(`Erro ao buscar dados de ${serviceName}: ${error.message}`, error);
        console.error(`Erro ao buscar dados de ${serviceName}:`, error);
        return [];
    }
};
const GetDashboardDataService = async ({ companyId, startDate, endDate }) => {
    try {
        logger_1.logger.info(`Iniciando busca de dados do dashboard para company ${companyId}`);
        // Para debug - imprimir os dados usados na busca
        console.log(`Buscando dados do dashboard:`, { companyId, startDate, endDate });
        // Executar cada serviço com tratamento de erro independente
        const ticketsByUser = await fetchWithFallback(() => (0, GetTicketsByUserService_1.default)({ companyId, startDate, endDate }), 'GetTicketsByUserService');
        const ticketsByStatus = await fetchWithFallback(() => (0, GetTicketsByStatusService_1.default)({ companyId, startDate, endDate }), 'GetTicketsByStatusService');
        const ticketsByQueue = await fetchWithFallback(() => (0, GetTicketsByQueueService_1.default)({ companyId, startDate, endDate }), 'GetTicketsByQueueService');
        const ticketsByWhatsapp = await fetchWithFallback(() => (0, GetTicketsByWhatsappService_1.default)({ companyId, startDate, endDate }), 'GetTicketsByWhatsappService');
        const ticketsByTime = await fetchWithFallback(() => (0, GetTicketsByTimeService_1.default)({ companyId, startDate, endDate }), 'GetTicketsByTimeService');
        const ticketsEvolution = await fetchWithFallback(() => (0, GetTicketsEvolutionService_1.default)({ companyId, startDate, endDate }), 'GetTicketsEvolutionService');
        const topTags = await fetchWithFallback(() => (0, GetTopTagsService_1.default)({ companyId, startDate, endDate }), 'GetTopTagsService');
        const queueEfficiency = await fetchWithFallback(() => (0, GetQueueEfficiencyService_1.default)({ companyId, startDate, endDate }), 'GetQueueEfficiencyService');
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
    }
    catch (error) {
        logger_1.logger.error("Erro geral ao obter dados do dashboard:", error);
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
exports.default = GetDashboardDataService;
