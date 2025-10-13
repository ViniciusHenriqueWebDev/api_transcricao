"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionsWebhookFacebookService = void 0;
const Chatbot_1 = __importDefault(require("../../../models/Chatbot"));
const Contact_1 = __importDefault(require("../../../models/Contact"));
const Queue_1 = __importDefault(require("../../../models/Queue"));
const Ticket_1 = __importDefault(require("../../../models/Ticket"));
const Whatsapp_1 = __importDefault(require("../../../models/Whatsapp"));
const graphAPI_1 = require("../graphAPI");
const UpdateTicketService_1 = __importDefault(require("../../TicketServices/UpdateTicketService"));
const FindOrCreateATicketTrakingService_1 = __importDefault(require("../../TicketServices/FindOrCreateATicketTrakingService"));
// ✅ Versão simplificada sem FlowBuilder
const ActionsWebhookFacebookService = async (token, companyId, dataWebhook, details, hashWebhookId, pressKey, idTicket, numberPhrase) => {
    console.log("🎭 ActionsWebhookFacebookService - simplified version");
    let ticket = null;
    if (idTicket) {
        ticket = await Ticket_1.default.findOne({
            where: { id: idTicket }
        });
        if (ticket?.status === "closed") {
            return "Ticket closed";
        }
        await ticket?.update({
            dataWebhook: {
                status: "process",
            },
        });
    }
    if (pressKey === "parar" && idTicket) {
        const ticket = await Ticket_1.default.findOne({
            where: { id: idTicket }
        });
        await ticket?.update({
            status: "closed"
        });
        return "Stopped";
    }
    const getSession = await Whatsapp_1.default.findOne({
        where: {
            facebookPageUserId: token.facebookPageUserId
        },
        include: [
            {
                model: Queue_1.default,
                as: "queues",
                attributes: ["id", "name", "color", "greetingMessage"],
                include: [
                    {
                        model: Chatbot_1.default,
                        as: "chatbots",
                        attributes: ["id", "name", "greetingMessage"]
                    }
                ]
            }
        ],
        order: [
            ["queues", "id", "ASC"],
            ["queues", "chatbots", "id", "ASC"]
        ]
    });
    // ✅ Implementação básica sem FlowBuilder
    if (numberPhrase && getSession) {
        const contact = await Contact_1.default.findOne({
            where: { number: numberPhrase.number, companyId }
        });
        if (contact && getSession.facebookUserToken) {
            // Enviar mensagem simples
            await (0, graphAPI_1.showTypingIndicator)(contact.number, getSession.facebookUserToken, "typing_on");
            await intervalWhats("2");
            const message = "Mensagem processada via webhook";
            await (0, graphAPI_1.sendText)(contact.number, message, getSession.facebookUserToken);
            await (0, graphAPI_1.showTypingIndicator)(contact.number, getSession.facebookUserToken, "typing_off");
            if (ticket) {
                await ticket.update({
                    lastMessage: message,
                    dataWebhook: {
                        status: "completed",
                    },
                });
            }
        }
    }
    return "completed";
};
exports.ActionsWebhookFacebookService = ActionsWebhookFacebookService;
const intervalWhats = (time) => {
    const seconds = parseInt(time) * 1000;
    return new Promise(resolve => setTimeout(resolve, seconds));
};
async function updateQueueId(ticket, companyId, queueId) {
    await ticket.update({
        status: 'pending',
        queueId: queueId,
        userId: ticket.userId,
        companyId: companyId,
    });
    await (0, FindOrCreateATicketTrakingService_1.default)({
        ticketId: ticket.id,
        companyId,
        whatsappId: ticket.whatsappId,
        userId: ticket.userId
    });
    await (0, UpdateTicketService_1.default)({
        ticketData: {
            status: "pending",
            queueId: queueId
        },
        ticketId: ticket.id,
        companyId
    });
}
