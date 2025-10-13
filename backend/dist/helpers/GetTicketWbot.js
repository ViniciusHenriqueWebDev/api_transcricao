"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const wbot_1 = require("../libs/wbot");
const GetDefaultWhatsApp_1 = __importDefault(require("./GetDefaultWhatsApp"));
const Ticket_1 = __importDefault(require("../models/Ticket"));
const Whatsapp_1 = __importDefault(require("../models/Whatsapp"));
const sendFacebookMessage_1 = __importDefault(require("../services/FacebookServices/sendFacebookMessage"));
const AppError_1 = __importDefault(require("../errors/AppError"));
const GetTicketWbot = async (ticket) => {
    console.log("🔍 GetTicketWbot called with:", {
        ticketId: ticket.id,
        channel: ticket.channel,
        whatsappId: ticket.whatsappId,
        hasWhatsappAssociation: !!ticket.whatsapp
    });
    // ✅ VERIFICAR SE É FACEBOOK/INSTAGRAM PELO CHANNEL
    if (ticket.channel === "facebook" || ticket.channel === "instagram") {
        console.log("📘 Processing Facebook/Instagram ticket:", ticket.id);
        // ✅ GARANTIR QUE O TICKET TENHA A ASSOCIAÇÃO WHATSAPP CARREGADA
        if (!ticket.whatsapp && ticket.whatsappId) {
            console.log("🔍 Loading whatsapp association for ticket:", ticket.id);
            const ticketWithWhatsapp = await Ticket_1.default.findByPk(ticket.id, {
                include: [
                    {
                        model: Whatsapp_1.default,
                        as: "whatsapp",
                        attributes: ["id", "name", "channel", "facebookUserToken", "status"]
                    }
                ]
            });
            if (ticketWithWhatsapp && ticketWithWhatsapp.whatsapp) {
                ticket.whatsapp = ticketWithWhatsapp.whatsapp;
                console.log("✅ Association loaded:", {
                    id: ticket.whatsapp.id,
                    name: ticket.whatsapp.name,
                    channel: ticket.whatsapp.channel,
                    hasToken: !!ticket.whatsapp.facebookUserToken
                });
            }
            else {
                console.log("❌ No whatsapp association found");
            }
        }
        // ✅ SE AINDA NÃO TEM WHATSAPP, BUSCAR POR EMPRESA E CANAL
        if (!ticket.whatsapp && !ticket.whatsappId) {
            console.log("🔍 Searching Facebook connection for company:", ticket.companyId);
            const facebookConnection = await Whatsapp_1.default.findOne({
                where: {
                    companyId: ticket.companyId,
                    channel: ["facebook", "instagram"],
                    status: "CONNECTED"
                }
            });
            if (facebookConnection) {
                console.log("✅ Facebook connection found, updating ticket");
                await ticket.update({
                    whatsappId: facebookConnection.id,
                    channel: facebookConnection.channel
                });
                ticket.whatsapp = facebookConnection;
            }
        }
        // ✅ RETORNAR OBJETO COMPATÍVEL
        return {
            id: ticket.whatsappId,
            type: "facebook",
            channel: ticket.channel,
            sendMessage: async (content, options) => {
                const body = typeof content === 'string' ? content : content.text || content.body || content;
                return await (0, sendFacebookMessage_1.default)({
                    body,
                    ticket,
                    quotedMsg: options?.quotedMsg || content.quotedMsg
                });
            }
        };
    }
    // ✅ VERIFICAR SE É FACEBOOK/INSTAGRAM PELO WHATSAPP ASSOCIADO
    if (ticket.whatsapp?.channel === "facebook" || ticket.whatsapp?.channel === "instagram") {
        console.log("📘 Returning Facebook message service for ticket via whatsapp.channel:", ticket.id);
        return {
            id: ticket.whatsappId,
            type: "facebook",
            channel: ticket.whatsapp.channel,
            sendMessage: async (content, options) => {
                const body = typeof content === 'string' ? content : content.text || content.body || content;
                return await (0, sendFacebookMessage_1.default)({
                    body,
                    ticket,
                    quotedMsg: options?.quotedMsg || content.quotedMsg
                });
            }
        };
    }
    // ✅ LÓGICA ORIGINAL PARA WHATSAPP
    const { whatsappId } = ticket;
    if (!whatsappId) {
        const defaultWhatsapp = await (0, GetDefaultWhatsApp_1.default)(ticket.companyId);
        if (!defaultWhatsapp) {
            throw new AppError_1.default("ERR_NO_DEF_WAPP_FOUND");
        }
        return (0, wbot_1.getWbot)(defaultWhatsapp.id);
    }
    const wbot = (0, wbot_1.getWbot)(whatsappId);
    return wbot;
};
exports.default = GetTicketWbot;
