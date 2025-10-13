"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_1 = require("../../libs/socket");
const Message_1 = __importDefault(require("../../models/Message"));
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const CreateMessageService = async ({ messageData, companyId }) => {
    await Message_1.default.upsert({ ...messageData, companyId });
    const message = await Message_1.default.findByPk(messageData.id, {
        include: [
            "contact",
            {
                model: Ticket_1.default,
                as: "ticket",
                include: [
                    "contact",
                    "queue",
                    {
                        model: Whatsapp_1.default,
                        as: "whatsapp",
                        attributes: ["name", "wavoip"]
                    }
                ]
            },
            {
                model: Message_1.default,
                as: "quotedMsg",
                include: ["contact"]
            }
        ]
    });
    if (message.ticket.queueId !== null && message.queueId === null) {
        await message.update({ queueId: message.ticket.queueId });
    }
    if (!message) {
        throw new Error("ERR_CREATING_MESSAGE");
    }
    const io = (0, socket_1.getIO)();
    if (!messageData?.ticketImported) {
        io.to(message.ticketId.toString())
            .to(`company-${companyId}-${message.ticket.status}`)
            .to(`company-${companyId}-notification`)
            .to(`queue-${message.ticket.queueId || "default"}-${message.ticket.status}`)
            .to(`queue-${message.ticket.queueId || "default"}-notification`)
            .emit(`company-${companyId}-appMessage`, {
            action: "create",
            message,
            ticket: message.ticket,
            contact: message.ticket.contact
        });
        io.to(`company-${companyId}`)
            .to(`company-${companyId}-${message.ticket.status}`)
            .emit(`company-${companyId}-ticket`, {
            action: "update",
            ticket: message.ticket
        });
    }
    return message;
};
exports.default = CreateMessageService;
