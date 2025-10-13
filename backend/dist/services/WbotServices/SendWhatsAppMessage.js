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
const Sentry = __importStar(require("@sentry/node"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const GetTicketWbot_1 = __importDefault(require("../../helpers/GetTicketWbot"));
const Message_1 = __importDefault(require("../../models/Message"));
const sendFacebookMessage_1 = __importDefault(require("../FacebookServices/sendFacebookMessage"));
const Mustache_1 = __importDefault(require("../../helpers/Mustache"));
const FindOrCreateATicketTrakingService_1 = __importDefault(require("../TicketServices/FindOrCreateATicketTrakingService")); // ✅ IMPORTADO
const SendWhatsAppMessage = async ({ body, ticket, quotedMsg, isForwarded = false }) => {
    console.log("🚀 SendWhatsAppMessage called for ticket:", {
        ticketId: ticket.id,
        channel: ticket.channel,
        whatsappChannel: ticket.whatsapp?.channel,
        hasWhatsapp: !!ticket.whatsapp
    });
    // ✅ GARANTE QUE EXISTE UM TRACKING PARA O TICKET
    try {
        await (0, FindOrCreateATicketTrakingService_1.default)({
            ticketId: ticket.id,
            companyId: ticket.companyId
        });
    }
    catch (err) {
        console.log("⚠️ Não foi possível criar/verificar o tracking do ticket:", ticket.id, err);
    }
    // ✅ VERIFICAR MÚLTIPLAS FORMAS SE É FACEBOOK/INSTAGRAM
    const isFacebookChannel = ticket.channel === "facebook" ||
        ticket.channel === "instagram" ||
        ticket.whatsapp?.channel === "facebook" ||
        ticket.whatsapp?.channel === "instagram";
    if (isFacebookChannel) {
        console.log("📘 Redirecting to Facebook message service for ticket:", ticket.id);
        return await (0, sendFacebookMessage_1.default)({ body, ticket, quotedMsg });
    }
    // ✅ LÓGICA ORIGINAL PARA WHATSAPP
    console.log("📱 Processing WhatsApp message for ticket:", ticket.id);
    let options = {};
    const wbot = await (0, GetTicketWbot_1.default)(ticket);
    const number = `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`;
    if (quotedMsg) {
        const chatMessages = await Message_1.default.findOne({
            where: {
                id: quotedMsg.id
            }
        });
        if (chatMessages) {
            const msgFound = JSON.parse(chatMessages.dataJson);
            options = {
                quoted: {
                    key: msgFound.key,
                    message: {
                        extendedTextMessage: msgFound.message.extendedTextMessage
                    }
                }
            };
        }
    }
    try {
        const sentMessage = await wbot.sendMessage(number, {
            text: (0, Mustache_1.default)(body, ticket.contact),
            contextInfo: { forwardingScore: isForwarded ? 2 : 0, isForwarded: isForwarded ? true : false }
        }, {
            ...options
        });
        await ticket.update({ lastMessage: (0, Mustache_1.default)(body, ticket.contact) });
        return sentMessage;
    }
    catch (err) {
        Sentry.captureException(err);
        console.log(err);
        throw new AppError_1.default("ERR_SENDING_WAPP_MSG");
    }
};
exports.default = SendWhatsAppMessage;
