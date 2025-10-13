"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeAll = exports.remove = exports.update = exports.showFromUUID = exports.show = exports.report = exports.kanban = exports.store = exports.index = void 0;
const Ticket_1 = __importDefault(require("../models/Ticket"));
const socket_1 = require("../libs/socket");
const CreateTicketService_1 = __importDefault(require("../services/TicketServices/CreateTicketService"));
const DeleteTicketService_1 = __importDefault(require("../services/TicketServices/DeleteTicketService"));
const ListTicketsService_1 = __importDefault(require("../services/TicketServices/ListTicketsService"));
const ShowTicketFromUUIDService_1 = __importDefault(require("../services/TicketServices/ShowTicketFromUUIDService"));
const ShowTicketService_1 = __importDefault(require("../services/TicketServices/ShowTicketService"));
const UpdateTicketService_1 = __importDefault(require("../services/TicketServices/UpdateTicketService"));
const ListTicketsServiceKanban_1 = __importDefault(require("../services/TicketServices/ListTicketsServiceKanban"));
const ListTicketsServiceReport_1 = __importDefault(require("../services/TicketServices/ListTicketsServiceReport"));
const index = async (req, res) => {
    const { pageNumber, status, date, updatedAt, searchParam, showAll, queueIds: queueIdsStringified, tags: tagIdsStringified, users: userIdsStringified, withUnreadMessages } = req.query;
    const userId = req.user.id;
    const { companyId } = req.user;
    let queueIds = [];
    let tagsIds = [];
    let usersIds = [];
    try {
        // Tratamento para queueIds
        if (queueIdsStringified) {
            // Remove aspas extras se existirem
            const cleanQueueIds = queueIdsStringified.replace(/^"(.*)"$/, '$1');
            try {
                queueIds = JSON.parse(cleanQueueIds);
            }
            catch (error) {
                console.error("Erro ao analisar queueIds:", error);
            }
        }
        // Tratamento para tags
        if (tagIdsStringified) {
            // Remove aspas extras se existirem
            const cleanTagIds = tagIdsStringified.replace(/^"(.*)"$/, '$1');
            try {
                tagsIds = JSON.parse(cleanTagIds);
            }
            catch (error) {
                console.error("Erro ao analisar tagIds:", error);
            }
        }
        // Tratamento para users
        if (userIdsStringified) {
            // Remove aspas extras se existirem
            const cleanUserIds = userIdsStringified.replace(/^"(.*)"$/, '$1');
            try {
                usersIds = JSON.parse(cleanUserIds);
            }
            catch (error) {
                console.error("Erro ao analisar userIds:", error);
            }
        }
        const { tickets, count, hasMore } = await (0, ListTicketsService_1.default)({
            searchParam,
            tags: tagsIds,
            users: usersIds,
            pageNumber,
            status,
            date,
            updatedAt,
            showAll,
            userId,
            queueIds,
            withUnreadMessages,
            companyId,
        });
        return res.status(200).json({ tickets, count, hasMore });
    }
    catch (error) {
        console.error("Erro ao processar filtros de tickets:", error);
        return res.status(500).json({
            error: "Erro ao processar filtros de tickets",
            details: error.message
        });
    }
};
exports.index = index;
const store = async (req, res) => {
    const { contactId, status, userId, queueId, whatsappId } = req.body;
    const { companyId } = req.user;
    const ticket = await (0, CreateTicketService_1.default)({
        contactId,
        status,
        userId,
        companyId,
        queueId,
        whatsappId: Number(whatsappId),
    });
    const io = (0, socket_1.getIO)();
    io.to(`company-${companyId}-${ticket.status}`)
        .to(`queue-${ticket.queueId}-${ticket.status}`)
        .emit(`company-${companyId}-ticket`, {
        action: "update",
        ticket
    });
    return res.status(200).json(ticket);
};
exports.store = store;
const kanban = async (req, res) => {
    const { pageNumber, status, date, startDate, // Novos parâmetros
    endDate, // Novos parâmetros
    updatedAt, searchParam, showAll, queueIds: queueIdsStringified, tags: tagIdsStringified, users: userIdsStringified, withUnreadMessages, includeClosedTickets } = req.query;
    const userId = req.user.id;
    const { companyId } = req.user;
    let queueIds = [];
    let tagsIds = [];
    let usersIds = [];
    if (queueIdsStringified) {
        queueIds = JSON.parse(queueIdsStringified);
    }
    if (tagIdsStringified) {
        tagsIds = JSON.parse(tagIdsStringified);
    }
    if (userIdsStringified) {
        usersIds = JSON.parse(userIdsStringified);
    }
    const { tickets, count, hasMore, closedTickets } = await (0, ListTicketsServiceKanban_1.default)({
        searchParam,
        tags: tagsIds,
        users: usersIds,
        pageNumber,
        status,
        date,
        startDate,
        endDate,
        updatedAt,
        showAll,
        userId,
        queueIds,
        withUnreadMessages,
        companyId,
        includeClosedTickets: includeClosedTickets === "true"
    });
    return res.status(200).json({ tickets, count, hasMore, closedTickets });
};
exports.kanban = kanban;
const report = async (req, res) => {
    const { searchParam, contactId, whatsappId: whatsappIdsStringified, dateFrom, dateTo, status: statusStringified, queueIds: queueIdsStringified, tags: tagIdsStringified, users: userIdsStringified, page: pageNumber, pageSize } = req.query;
    const userId = req.user.id;
    const { companyId } = req.user;
    let queueIds = [];
    let whatsappIds = [];
    let tagsIds = [];
    let usersIds = [];
    let statusIds = [];
    if (statusStringified) {
        statusIds = JSON.parse(statusStringified);
    }
    if (whatsappIdsStringified) {
        whatsappIds = JSON.parse(whatsappIdsStringified);
    }
    if (queueIdsStringified) {
        queueIds = JSON.parse(queueIdsStringified);
    }
    if (tagIdsStringified) {
        tagsIds = JSON.parse(tagIdsStringified);
    }
    if (userIdsStringified) {
        usersIds = JSON.parse(userIdsStringified);
    }
    const { tickets, totalTickets } = await (0, ListTicketsServiceReport_1.default)(companyId, {
        searchParam,
        queueIds,
        tags: tagsIds,
        users: usersIds,
        status: statusIds,
        dateFrom,
        dateTo,
        userId,
        contactId,
        whatsappId: whatsappIds
    }, +pageNumber, +pageSize);
    return res.status(200).json({ tickets, totalTickets });
};
exports.report = report;
const show = async (req, res) => {
    const { ticketId } = req.params;
    const { companyId } = req.user;
    const contact = await (0, ShowTicketService_1.default)(ticketId, companyId);
    return res.status(200).json(contact);
};
exports.show = show;
const showFromUUID = async (req, res) => {
    const { uuid } = req.params;
    const ticket = await (0, ShowTicketFromUUIDService_1.default)(uuid);
    return res.status(200).json(ticket);
};
exports.showFromUUID = showFromUUID;
// No método update, modifique para:
const update = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const ticketData = req.body;
        const { companyId } = req.user;
        const result = await (0, UpdateTicketService_1.default)({
            ticketData,
            ticketId,
            companyId
        });
        if (!result) {
            return res.status(500).json({ error: "Erro ao atualizar o ticket" });
        }
        const { ticket } = result;
        console.log(`Ticket ${ticketId} atualizado com sucesso`);
        return res.status(200).json(ticket);
    }
    catch (error) {
        console.error(`Erro ao atualizar ticket: ${error.message}`, error);
        // Retornar mensagem de erro mais detalhada
        return res.status(500).json({
            error: `Erro ao atualizar o ticket: ${error.message}`,
            details: error.stack
        });
    }
};
exports.update = update;
const remove = async (req, res) => {
    const { ticketId } = req.params;
    const { companyId } = req.user;
    await (0, ShowTicketService_1.default)(ticketId, companyId);
    const ticket = await (0, DeleteTicketService_1.default)(ticketId);
    const io = (0, socket_1.getIO)();
    io.to(ticketId)
        .to(`company-${companyId}-${ticket.status}`)
        .to(`company-${companyId}-notification`)
        .to(`queue-${ticket.queueId}-${ticket.status}`)
        .to(`queue-${ticket.queueId}-notification`)
        .emit(`company-${companyId}-ticket`, {
        action: "delete",
        ticketId: +ticketId
    });
    return res.status(200).json({ message: "ticket deleted" });
};
exports.remove = remove;
const closeAll = async (req, res) => {
    try {
        const { companyId } = req.user;
        const { status } = req.body;
        const io = (0, socket_1.getIO)();
        console.log("🔄 closeAll - Parâmetros:", { companyId, status });
        // ✅ BUSCAR E CONTAR TICKETS SIMPLES
        const { rows: tickets } = await Ticket_1.default.findAndCountAll({
            where: {
                companyId: companyId,
                status: status
            },
            order: [["updatedAt", "DESC"]]
        });
        console.log(`📊 Encontrados ${tickets.length} tickets para fechar`);
        if (tickets.length === 0) {
            return res.status(200).json({
                message: "Nenhum ticket encontrado para fechar",
                count: 0
            });
        }
        // ✅ FECHAR TICKETS COM PROMISE.ALL PARA MELHOR PERFORMANCE
        const closePromises = tickets.map(async (ticket) => {
            try {
                await ticket.update({
                    status: "closed",
                    closedAt: new Date(),
                    useIntegration: false,
                    promptId: null,
                    integrationId: null,
                    unreadMessages: 0
                });
                // ✅ EMITIR SOCKET PARA REMOVER DA LISTA
                io.to(`company-${companyId}-${status}`)
                    .to(`company-${companyId}-notification`)
                    .emit(`company-${companyId}-ticket`, {
                    action: "delete",
                    ticketId: ticket.id
                });
                console.log(`✅ Ticket ${ticket.id} fechado`);
                return { success: true, ticketId: ticket.id };
            }
            catch (error) {
                console.error(`❌ Erro ao fechar ticket ${ticket.id}:`, error);
                return { success: false, ticketId: ticket.id, error: error.message };
            }
        });
        // ✅ AGUARDAR TODOS OS FECHAMENTOS
        const results = await Promise.all(closePromises);
        const successCount = results.filter(r => r.success).length;
        const errorCount = results.filter(r => !r.success).length;
        console.log(`✅ Processo concluído: ${successCount} sucessos, ${errorCount} erros`);
        // ✅ EMITIR EVENTO GLOBAL PARA FORÇAR RELOAD
        setTimeout(() => {
            io.to(`company-${companyId}-${status}`)
                .to(`company-${companyId}-open`)
                .to(`company-${companyId}-pending`)
                .emit('force-tickets-reload', {
                companyId,
                status,
                count: successCount
            });
        }, 1000);
        return res.status(200).json({
            message: `${successCount} tickets fechados com sucesso`,
            count: successCount,
            total: tickets.length,
            errors: errorCount > 0 ? results.filter(r => !r.success) : undefined
        });
    }
    catch (error) {
        console.error("❌ Erro geral em closeAll:", error);
        return res.status(500).json({
            error: "Erro interno do servidor",
            details: error.message
        });
    }
};
exports.closeAll = closeAll;
