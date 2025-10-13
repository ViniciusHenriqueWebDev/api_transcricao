"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const date_fns_1 = require("date-fns");
const lodash_1 = require("lodash");
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const Queue_1 = __importDefault(require("../../models/Queue"));
const User_1 = __importDefault(require("../../models/User"));
const ShowUserService_1 = __importDefault(require("../UserServices/ShowUserService"));
const Tag_1 = __importDefault(require("../../models/Tag"));
const TicketTag_1 = __importDefault(require("../../models/TicketTag"));
const lodash_2 = require("lodash");
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const ListTicketsService = async ({ searchParam = "", pageNumber = "1", queueIds, tags, users, status, date, updatedAt, showAll, userId, withUnreadMessages, companyId, orderBy = "DESC" }) => {
    console.log("📋 ListTicketsService:", {
        searchParam,
        pageNumber,
        status,
        showAll,
        userId,
        companyId
    });
    const user = await User_1.default.findByPk(userId, {
        include: [
            {
                model: Whatsapp_1.default,
                as: "whatsapp",
            }
        ]
    });
    const userWhatsappId = user?.whatsapp?.id;
    // ✅ CONDIÇÃO BASE SIMPLES
    let whereCondition = {
        companyId,
        ...(userWhatsappId ? { whatsappId: userWhatsappId } : {}),
        [sequelize_1.Op.or]: [{ userId }, { status: "pending" }],
        queueId: { [sequelize_1.Op.or]: [queueIds, null] }
    };
    // ✅ INCLUDES BÁSICOS - SEM MENSAGENS
    let includeCondition = [
        {
            model: Contact_1.default,
            as: "contact",
            attributes: ["id", "name", "number", "email", "profilePicUrl"]
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
            attributes: ["id", "name", "color"],
            where: tags && tags.length > 0 ? { id: tags } : undefined,
            required: tags && tags.length > 0
        },
        {
            model: Whatsapp_1.default,
            as: "whatsapp",
            attributes: ["name"]
        }
    ];
    // ✅ SHOW ALL
    if (showAll === "true") {
        whereCondition = {
            companyId,
            ...(userWhatsappId ? { whatsappId: userWhatsappId } : {}),
            queueId: { [sequelize_1.Op.or]: [queueIds, null] }
        };
    }
    // ✅ FILTRO DE STATUS
    if (status) {
        whereCondition = {
            ...whereCondition,
            status
        };
    }
    // ✅ PESQUISA SIMPLIFICADA - APENAS CONTACT NAME E NUMBER
    if (searchParam) {
        const sanitizedSearchParam = searchParam.toLocaleLowerCase().trim();
        whereCondition = {
            ...whereCondition,
            [sequelize_1.Op.or]: [
                {
                    "$contact.name$": (0, sequelize_1.where)((0, sequelize_1.fn)("LOWER", (0, sequelize_1.col)("contact.name")), "LIKE", `%${sanitizedSearchParam}%`)
                },
                {
                    "$contact.number$": {
                        [sequelize_1.Op.like]: `%${sanitizedSearchParam}%`
                    }
                }
            ]
        };
    }
    // ✅ FILTRO DE DATA
    if (date) {
        whereCondition = {
            ...whereCondition,
            createdAt: {
                [sequelize_1.Op.between]: [+(0, date_fns_1.startOfDay)((0, date_fns_1.parseISO)(date)), +(0, date_fns_1.endOfDay)((0, date_fns_1.parseISO)(date))]
            }
        };
    }
    // ✅ FILTRO DE UPDATED AT
    if (updatedAt) {
        whereCondition = {
            ...whereCondition,
            updatedAt: {
                [sequelize_1.Op.between]: [
                    +(0, date_fns_1.startOfDay)((0, date_fns_1.parseISO)(updatedAt)),
                    +(0, date_fns_1.endOfDay)((0, date_fns_1.parseISO)(updatedAt))
                ]
            }
        };
    }
    // ✅ FILTRO DE MENSAGENS NÃO LIDAS
    if (withUnreadMessages === "true") {
        const userObj = await (0, ShowUserService_1.default)(userId);
        const userQueueIds = userObj.queues.map(queue => queue.id);
        whereCondition = {
            companyId,
            ...(userWhatsappId ? { whatsappId: userWhatsappId } : {}),
            [sequelize_1.Op.or]: [{ userId }, { status: "pending" }],
            queueId: { [sequelize_1.Op.or]: [userQueueIds, null] },
            unreadMessages: { [sequelize_1.Op.gt]: 0 }
        };
    }
    // ✅ FILTRO DE TAGS
    if (Array.isArray(tags) && tags.length > 0) {
        const ticketsTagFilter = [];
        for (let tag of tags) {
            const ticketTags = await TicketTag_1.default.findAll({
                where: { tagId: tag },
                include: [
                    {
                        model: Ticket_1.default,
                        as: "ticket",
                        where: {
                            companyId,
                            ...(userWhatsappId ? { whatsappId: userWhatsappId } : {})
                        }
                    }
                ]
            });
            if (ticketTags) {
                ticketsTagFilter.push(ticketTags.map(t => t.ticketId));
            }
        }
        // Troque intersection por union
        const ticketsUnion = (0, lodash_1.union)(...ticketsTagFilter);
        whereCondition = {
            ...whereCondition,
            id: {
                [sequelize_1.Op.in]: ticketsUnion
            }
        };
    }
    // ✅ FILTRO DE USUÁRIOS
    if (Array.isArray(users) && users.length > 0) {
        const ticketsUserFilter = [];
        for (let user of users) {
            const ticketUsers = await Ticket_1.default.findAll({
                where: {
                    userId: user,
                    companyId,
                    ...(userWhatsappId ? { whatsappId: userWhatsappId } : {})
                }
            });
            if (ticketUsers) {
                ticketsUserFilter.push(ticketUsers.map(t => t.id));
            }
        }
        const ticketsIntersection = (0, lodash_2.intersection)(...ticketsUserFilter);
        whereCondition = {
            ...whereCondition,
            id: {
                [sequelize_1.Op.in]: ticketsIntersection
            }
        };
    }
    // ✅ PAGINAÇÃO
    const limit = 40;
    const offset = limit * (+pageNumber - 1);
    // ✅ GARANTIR COMPANY ID
    whereCondition = {
        ...whereCondition,
        companyId,
        ...(userWhatsappId ? { whatsappId: userWhatsappId } : {})
    };
    const sortOrder = status === "pending" ? "ASC" : (orderBy || "DESC");
    // ✅ BUSCAR TICKETS
    const { count, rows: tickets } = await Ticket_1.default.findAndCountAll({
        where: whereCondition,
        include: includeCondition,
        distinct: true,
        limit,
        offset,
        order: [["updatedAt", sortOrder]],
        subQuery: false
    });
    const hasMore = count > offset + tickets.length;
    console.log("✅ Tickets encontrados:", {
        count,
        ticketsLength: tickets.length,
        hasMore
    });
    return {
        tickets,
        count,
        hasMore
    };
};
exports.default = ListTicketsService;
