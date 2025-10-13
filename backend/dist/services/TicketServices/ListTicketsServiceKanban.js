"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const date_fns_1 = require("date-fns");
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const Message_1 = __importDefault(require("../../models/Message"));
const Queue_1 = __importDefault(require("../../models/Queue"));
const User_1 = __importDefault(require("../../models/User"));
const ShowUserService_1 = __importDefault(require("../UserServices/ShowUserService"));
const Tag_1 = __importDefault(require("../../models/Tag"));
const TicketTag_1 = __importDefault(require("../../models/TicketTag"));
const lodash_1 = require("lodash");
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const ListTicketsServiceKanban = async ({ searchParam = "", pageNumber = "1", queueIds, tags, users, status, date, startDate, endDate, updatedAt, showAll, userId, withUnreadMessages, companyId, includeClosedTickets = false }) => {
    let user = await (0, ShowUserService_1.default)(userId);
    const isAdmin = user.profile === "admin" || user.profile === "supervisor";
    let whereCondition = {
        companyId // Sempre aplicar o filtro de empresa
    };
    // Configurar condições padrão com base no perfil e filtros de data
    if (startDate && endDate) {
        // Com filtro de data, excluir tickets fechados da lista principal
        if (isAdmin) {
            whereCondition = {
                ...whereCondition,
                queueId: { [sequelize_1.Op.or]: [queueIds, null] },
                status: { [sequelize_1.Op.ne]: "closed" } // Excluir tickets fechados
            };
        }
        else {
            whereCondition = {
                ...whereCondition,
                [sequelize_1.Op.or]: [{ userId }, { status: "pending" }],
                queueId: { [sequelize_1.Op.or]: [queueIds, null] },
                status: { [sequelize_1.Op.ne]: "closed" } // Excluir tickets fechados
            };
        }
    }
    else {
        // Sem filtro de data, comportamento padrão do kanban
        if (isAdmin) {
            whereCondition = {
                ...whereCondition,
                queueId: { [sequelize_1.Op.or]: [queueIds, null] },
                status: { [sequelize_1.Op.or]: ["pending", "open"] }
            };
        }
        else {
            whereCondition = {
                ...whereCondition,
                [sequelize_1.Op.or]: [{ userId }, { status: "pending" }],
                queueId: { [sequelize_1.Op.or]: [queueIds, null] },
                status: { [sequelize_1.Op.or]: ["pending", "open"] }
            };
        }
    }
    // Condições para inclusão de modelos relacionados
    const includeCondition = [
        {
            model: Contact_1.default,
            as: "contact",
            attributes: ["id", "name", "number", "email"]
        },
        {
            model: Queue_1.default,
            as: "queue",
            attributes: ["id", "name", "color"]
        },
        {
            model: User_1.default,
            as: "user",
            attributes: ["id", "name"]
        },
        {
            model: Tag_1.default,
            as: "tags",
            attributes: ["id", "name", "color"]
        },
        {
            model: Whatsapp_1.default,
            as: "whatsapp",
            attributes: ["name"]
        },
    ];
    // Sobrescrever condições se showAll for true, mas manter exclusão de fechados
    if (showAll === "true") {
        whereCondition = {
            ...whereCondition,
            queueId: { [sequelize_1.Op.or]: [queueIds, null] },
            // Manter exclusão de tickets fechados se filtro de data estiver ativo
            ...(startDate && endDate ? { status: { [sequelize_1.Op.ne]: "closed" } } : {})
        };
    }
    // Aplicar filtro de busca por texto
    if (searchParam) {
        const sanitizedSearchParam = searchParam.toLocaleLowerCase().trim();
        includeCondition.push({
            model: Message_1.default,
            as: "messages",
            attributes: ["id", "body"],
            where: {
                body: (0, sequelize_1.where)((0, sequelize_1.fn)("LOWER", (0, sequelize_1.col)("body")), "LIKE", `%${sanitizedSearchParam}%`)
            },
            required: false,
            duplicating: false
        });
        whereCondition = {
            ...whereCondition,
            [sequelize_1.Op.or]: [
                {
                    "$contact.name$": (0, sequelize_1.where)((0, sequelize_1.fn)("LOWER", (0, sequelize_1.col)("contact.name")), "LIKE", `%${sanitizedSearchParam}%`)
                },
                { "$contact.number$": { [sequelize_1.Op.like]: `%${sanitizedSearchParam}%` } },
                {
                    "$message.body$": (0, sequelize_1.where)((0, sequelize_1.fn)("LOWER", (0, sequelize_1.col)("body")), "LIKE", `%${sanitizedSearchParam}%`)
                }
            ]
        };
    }
    // Aplicar filtros de data de forma mais robusta
    if (startDate && endDate) {
        try {
            const startDateTime = (0, date_fns_1.startOfDay)((0, date_fns_1.parseISO)(startDate));
            const endDateTime = (0, date_fns_1.endOfDay)((0, date_fns_1.parseISO)(endDate));
            // Verificar se as datas são válidas
            if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
                throw new Error("Data inválida");
            }
            whereCondition = {
                ...whereCondition,
                createdAt: {
                    [sequelize_1.Op.between]: [+startDateTime, +endDateTime]
                }
            };
            console.log(`Filtro de data aplicado: ${startDate} até ${endDate}`);
            console.log(`Timestamps: ${+startDateTime} até ${+endDateTime}`);
        }
        catch (error) {
            console.error("Erro ao processar filtro de data:", error);
            // Em caso de erro, não aplicar filtro de data
        }
    }
    else if (date) {
        try {
            const dateObj = (0, date_fns_1.parseISO)(date);
            whereCondition = {
                ...whereCondition,
                createdAt: {
                    [sequelize_1.Op.between]: [+(0, date_fns_1.startOfDay)(dateObj), +(0, date_fns_1.endOfDay)(dateObj)]
                }
            };
        }
        catch (error) {
            console.error("Erro ao processar data:", error);
        }
    }
    // Aplicar filtro de data de atualização se fornecido
    if (updatedAt) {
        try {
            const updatedAtDate = (0, date_fns_1.parseISO)(updatedAt);
            whereCondition = {
                ...whereCondition,
                updatedAt: {
                    [sequelize_1.Op.between]: [
                        +(0, date_fns_1.startOfDay)(updatedAtDate),
                        +(0, date_fns_1.endOfDay)(updatedAtDate)
                    ]
                }
            };
        }
        catch (error) {
            console.error("Erro ao processar updatedAt:", error);
        }
    }
    // Aplicar filtro de mensagens não lidas
    if (withUnreadMessages === "true") {
        const userQueueIds = user.queues.map(queue => queue.id);
        if (isAdmin) {
            whereCondition = {
                ...whereCondition,
                queueId: { [sequelize_1.Op.or]: [userQueueIds, null] },
                unreadMessages: { [sequelize_1.Op.gt]: 0 }
            };
        }
        else {
            whereCondition = {
                ...whereCondition,
                [sequelize_1.Op.or]: [{ userId }, { status: "pending" }],
                queueId: { [sequelize_1.Op.or]: [userQueueIds, null] },
                unreadMessages: { [sequelize_1.Op.gt]: 0 }
            };
        }
    }
    // Aplicar filtros de tags
    if (Array.isArray(tags) && tags.length > 0) {
        const ticketsTagFilter = [];
        for (let tag of tags) {
            const ticketTags = await TicketTag_1.default.findAll({
                where: { tagId: tag }
            });
            if (ticketTags) {
                ticketsTagFilter.push(ticketTags.map(t => t.ticketId));
            }
        }
        if (ticketsTagFilter.length > 0) {
            const ticketsIntersection = (0, lodash_1.intersection)(...ticketsTagFilter);
            whereCondition = {
                ...whereCondition,
                id: {
                    [sequelize_1.Op.in]: ticketsIntersection.length > 0 ? ticketsIntersection : [0] // Se vazio, não retorna nada
                }
            };
        }
    }
    // Aplicar filtros de usuários
    if (Array.isArray(users) && users.length > 0) {
        const ticketsUserFilter = [];
        for (let user of users) {
            const ticketUsers = await Ticket_1.default.findAll({
                where: { userId: user }
            });
            if (ticketUsers) {
                ticketsUserFilter.push(ticketUsers.map(t => t.id));
            }
        }
        if (ticketsUserFilter.length > 0) {
            const ticketsIntersection = (0, lodash_1.intersection)(...ticketsUserFilter);
            whereCondition = {
                ...whereCondition,
                id: {
                    [sequelize_1.Op.in]: ticketsIntersection.length > 0 ? ticketsIntersection : [0]
                }
            };
        }
    }
    // Paginação
    const limit = 40;
    const offset = limit * (+pageNumber - 1);
    console.log("Condição final para busca de tickets:");
    console.log(JSON.stringify(whereCondition, null, 2));
    // Buscar tickets
    const { count, rows: tickets } = await Ticket_1.default.findAndCountAll({
        where: whereCondition,
        include: includeCondition,
        distinct: true,
        limit,
        offset,
        order: [["updatedAt", "DESC"]],
        subQuery: false
    });
    const hasMore = count > offset + tickets.length;
    // Buscar tickets fechados separadamente se solicitado
    let closedTickets = [];
    if (includeClosedTickets && startDate && endDate) {
        try {
            const startDateTime = (0, date_fns_1.startOfDay)((0, date_fns_1.parseISO)(startDate));
            const endDateTime = (0, date_fns_1.endOfDay)((0, date_fns_1.parseISO)(endDate));
            // Verificar se as datas são válidas
            if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
                throw new Error("Data inválida");
            }
            let closedWhereCondition = {
                status: "closed",
                companyId,
                createdAt: {
                    [sequelize_1.Op.between]: [+startDateTime, +endDateTime]
                }
            };
            if (queueIds && queueIds.length > 0) {
                closedWhereCondition = {
                    ...closedWhereCondition,
                    queueId: { [sequelize_1.Op.or]: [queueIds, null] }
                };
            }
            console.log("Buscando tickets fechados com filtro:");
            console.log(JSON.stringify(closedWhereCondition, null, 2));
            const { rows: closed } = await Ticket_1.default.findAndCountAll({
                where: closedWhereCondition,
                include: includeCondition,
                distinct: true,
                limit: 100,
                order: [["updatedAt", "DESC"]],
                subQuery: false
            });
            closedTickets = closed;
            console.log(`Encontrados ${closed.length} tickets fechados`);
        }
        catch (error) {
            console.error("Erro ao buscar tickets fechados:", error);
            closedTickets = [];
        }
    }
    return {
        tickets,
        count,
        hasMore,
        closedTickets: includeClosedTickets ? closedTickets : undefined
    };
};
exports.default = ListTicketsServiceKanban;
