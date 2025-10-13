"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const ShowTicketService_1 = __importDefault(require("./ShowTicketService"));
const FindOrCreateATicketTrakingService_1 = __importDefault(require("./FindOrCreateATicketTrakingService"));
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const FindOrCreateTicketService = async (contact, whatsappId, unreadMessages, companyId, groupContact, isImported) => {
    // 1️⃣ Busca ticket existente para o contato
    let ticket = await Ticket_1.default.findOne({
        where: {
            contactId: groupContact ? groupContact.id : contact.id,
            companyId,
            whatsappId,
            status: {
                [sequelize_1.Op.or]: ["open", "pending", "closed"]
            }
        },
        order: [["id", "DESC"]]
    });
    if (ticket) {
        // 🔧 Corrigido: Sempre reabrir ticket se estiver fechado
        if (ticket.status === "closed") {
            await ticket.update({
                status: "pending",
                queueId: null,
                userId: null,
                unreadMessages,
                whatsappId
            });
        }
        else {
            await ticket.update({ unreadMessages, whatsappId });
        }
    }
    // 2️⃣ Caso não exista ticket, tenta buscar o último atualizado do contato
    if (!ticket) {
        ticket = await Ticket_1.default.findOne({
            where: {
                contactId: groupContact ? groupContact.id : contact.id,
                whatsappId,
                companyId
            },
            order: [["updatedAt", "DESC"]]
        });
        if (ticket) {
            await ticket.update({
                status: "pending",
                userId: null,
                unreadMessages,
                queueId: null,
                whatsappId
            });
            await (0, FindOrCreateATicketTrakingService_1.default)({
                ticketId: ticket.id,
                companyId,
                whatsappId: ticket.whatsappId,
                userId: ticket.userId
            });
        }
    }
    // 3️⃣ Se ainda não encontrou, cria um novo ticket
    if (!ticket) {
        const whatsapp = await Whatsapp_1.default.findOne({
            where: { id: whatsappId }
        });
        ticket = await Ticket_1.default.create({
            contactId: groupContact ? groupContact.id : contact.id,
            status: "pending",
            isGroup: !!groupContact,
            unreadMessages,
            whatsappId,
            whatsapp,
            companyId,
            imported: isImported ? new Date() : null,
        });
        await (0, FindOrCreateATicketTrakingService_1.default)({
            ticketId: ticket.id,
            companyId,
            whatsappId,
            userId: ticket.userId
        });
    }
    ticket = await (0, ShowTicketService_1.default)(ticket.id, companyId);
    return ticket;
};
exports.default = FindOrCreateTicketService;
