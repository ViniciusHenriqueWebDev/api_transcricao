"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQueueEfficiency = exports.getTopTags = exports.getTicketsEvolution = exports.getTicketsByTime = exports.getTicketsByWhatsapp = exports.getTicketsByQueue = exports.getTicketsByStatus = exports.getTicketsByUser = exports.getDashboardData = exports.getPredefinedPeriod = void 0;
const Yup = __importStar(require("yup"));
const AppError_1 = __importDefault(require("../errors/AppError"));
const GetDashboardDataService_1 = __importDefault(require("../services/AnalyticsServices/GetDashboardDataService"));
const GetTicketsByUserService_1 = __importDefault(require("../services/AnalyticsServices/GetTicketsByUserService"));
const GetTicketsByStatusService_1 = __importDefault(require("../services/AnalyticsServices/GetTicketsByStatusService"));
const GetTicketsByQueueService_1 = __importDefault(require("../services/AnalyticsServices/GetTicketsByQueueService"));
const GetTicketsByWhatsappService_1 = __importDefault(require("../services/AnalyticsServices/GetTicketsByWhatsappService"));
const GetTicketsByTimeService_1 = __importDefault(require("../services/AnalyticsServices/GetTicketsByTimeService"));
const GetTicketsEvolutionService_1 = __importDefault(require("../services/AnalyticsServices/GetTicketsEvolutionService"));
const GetTopTagsService_1 = __importDefault(require("../services/AnalyticsServices/GetTopTagsService"));
const GetQueueEfficiencyService_1 = __importDefault(require("../services/AnalyticsServices/GetQueueEfficiencyService"));
const GetAllActiveTicketsService_1 = __importDefault(require("../services/AnalyticsServices/GetAllActiveTicketsService"));
const dateHelpers_1 = require("../utils/dateHelpers");
const getPredefinedPeriod = async (req, res) => {
    const { period } = req.params;
    const { companyId } = req.user;
    let dateRange;
    switch (period) {
        case 'today':
            dateRange = (0, dateHelpers_1.getTodayPeriod)();
            break;
        case 'week':
            dateRange = (0, dateHelpers_1.getCurrentWeekPeriod)();
            break;
        case 'month':
            dateRange = (0, dateHelpers_1.getCurrentMonthPeriod)();
            break;
        default:
            return res.status(400).json({ error: "Período inválido. Use 'today', 'week' ou 'month'." });
    }
    try {
        // Usamos o GetDashboardDataService para todos os períodos para garantir consistência
        const dashboardData = await (0, GetDashboardDataService_1.default)({
            companyId,
            startDate: dateRange.startDate,
            endDate: dateRange.endDate
        });
        // Se for 'today', aprimoramos alguns dados específicos com o GetAllActiveTicketsService
        if (period === 'today') {
            try {
                const activeData = await (0, GetAllActiveTicketsService_1.default)({ companyId });
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
            }
            catch (activeError) {
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
    }
    catch (err) {
        if (err instanceof AppError_1.default) {
            return res.status(err.statusCode).json({ error: err.message });
        }
        return res.status(500).json({ error: "Erro interno do servidor", details: err.message });
    }
};
exports.getPredefinedPeriod = getPredefinedPeriod;
const getDashboardData = async (req, res) => {
    const { companyId } = req.user;
    try {
        const schema = Yup.object().shape({
            startDate: Yup.string().required(),
            endDate: Yup.string().required()
        });
        await schema.validate(req.query);
        const { startDate, endDate } = req.query;
        console.log("AnalyticsController: Requisição recebida:", {
            companyId,
            startDate,
            endDate
        });
        const data = await (0, GetDashboardDataService_1.default)({
            companyId,
            startDate,
            endDate
        });
        console.log("AnalyticsController: Dados retornados com sucesso");
        return res.status(200).json(data);
    }
    catch (err) {
        console.error("AnalyticsController: Erro ao processar requisição:", err);
        if (err instanceof AppError_1.default) {
            return res.status(err.statusCode).json({ error: err.message });
        }
        return res.status(500).json({ error: "Erro interno do servidor" });
    }
};
exports.getDashboardData = getDashboardData;
const getTicketsByUser = async (req, res) => {
    const { companyId } = req.user;
    const schema = Yup.object().shape({
        startDate: Yup.string().required(),
        endDate: Yup.string().required()
    });
    try {
        await schema.validate(req.query);
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    const { startDate, endDate } = req.query;
    const data = await (0, GetTicketsByUserService_1.default)({
        companyId,
        startDate,
        endDate
    });
    return res.status(200).json(data);
};
exports.getTicketsByUser = getTicketsByUser;
const getTicketsByStatus = async (req, res) => {
    const { companyId } = req.user;
    const schema = Yup.object().shape({
        startDate: Yup.string().required(),
        endDate: Yup.string().required()
    });
    try {
        await schema.validate(req.query);
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    const { startDate, endDate } = req.query;
    const data = await (0, GetTicketsByStatusService_1.default)({
        companyId,
        startDate,
        endDate
    });
    return res.status(200).json(data);
};
exports.getTicketsByStatus = getTicketsByStatus;
const getTicketsByQueue = async (req, res) => {
    const { companyId } = req.user;
    const schema = Yup.object().shape({
        startDate: Yup.string().required(),
        endDate: Yup.string().required()
    });
    try {
        await schema.validate(req.query);
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    const { startDate, endDate } = req.query;
    const data = await (0, GetTicketsByQueueService_1.default)({
        companyId,
        startDate,
        endDate
    });
    return res.status(200).json(data);
};
exports.getTicketsByQueue = getTicketsByQueue;
const getTicketsByWhatsapp = async (req, res) => {
    const { companyId } = req.user;
    const schema = Yup.object().shape({
        startDate: Yup.string().required(),
        endDate: Yup.string().required()
    });
    try {
        await schema.validate(req.query);
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    const { startDate, endDate } = req.query;
    const data = await (0, GetTicketsByWhatsappService_1.default)({
        companyId,
        startDate,
        endDate
    });
    return res.status(200).json(data);
};
exports.getTicketsByWhatsapp = getTicketsByWhatsapp;
const getTicketsByTime = async (req, res) => {
    const { companyId } = req.user;
    const schema = Yup.object().shape({
        startDate: Yup.string().required(),
        endDate: Yup.string().required()
    });
    try {
        await schema.validate(req.query);
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    const { startDate, endDate } = req.query;
    const data = await (0, GetTicketsByTimeService_1.default)({
        companyId,
        startDate,
        endDate
    });
    return res.status(200).json(data);
};
exports.getTicketsByTime = getTicketsByTime;
const getTicketsEvolution = async (req, res) => {
    const { companyId } = req.user;
    const schema = Yup.object().shape({
        startDate: Yup.string().required(),
        endDate: Yup.string().required()
    });
    try {
        await schema.validate(req.query);
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    const { startDate, endDate } = req.query;
    const data = await (0, GetTicketsEvolutionService_1.default)({
        companyId,
        startDate,
        endDate
    });
    return res.status(200).json(data);
};
exports.getTicketsEvolution = getTicketsEvolution;
const getTopTags = async (req, res) => {
    const { companyId } = req.user;
    const schema = Yup.object().shape({
        startDate: Yup.string().required(),
        endDate: Yup.string().required()
    });
    try {
        await schema.validate(req.query);
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    const { startDate, endDate } = req.query;
    const data = await (0, GetTopTagsService_1.default)({
        companyId,
        startDate,
        endDate
    });
    return res.status(200).json(data);
};
exports.getTopTags = getTopTags;
const getQueueEfficiency = async (req, res) => {
    const { companyId } = req.user;
    const schema = Yup.object().shape({
        startDate: Yup.string().required(),
        endDate: Yup.string().required()
    });
    try {
        await schema.validate(req.query);
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    const { startDate, endDate } = req.query;
    const data = await (0, GetQueueEfficiencyService_1.default)({
        companyId,
        startDate,
        endDate
    });
    return res.status(200).json(data);
};
exports.getQueueEfficiency = getQueueEfficiency;
