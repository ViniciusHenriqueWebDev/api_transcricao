"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClosedAllOpenTickets = void 0;
const sequelize_1 = require("sequelize");
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const socket_1 = require("../../libs/socket");
const Mustache_1 = __importDefault(require("../../helpers/Mustache"));
const SendWhatsAppMessage_1 = __importDefault(require("./SendWhatsAppMessage"));
const TicketTraking_1 = __importDefault(require("../../models/TicketTraking"));
const logger_1 = require("../../utils/logger");
const lodash_1 = require("lodash");
const date_fns_1 = require("date-fns");
const Contact_1 = __importDefault(require("../../models/Contact"));
const closeTicket = async (ticket, body) => {
    await ticket.update({
        status: "closed",
        lastMessage: body,
        unreadMessages: 0,
        amountUsedBotQueues: 0
    });
};
const handleOpenTickets = async (companyId, whatsapp) => {
    const currentTime = new Date();
    const brazilTimeZoneOffset = -3 * 60; // Fuso horário do Brasil é UTC-3
    const currentTimeBrazil = new Date(currentTime.getTime() + brazilTimeZoneOffset * 60000); // Adiciona o offset ao tempo atual
    let expiresTime = Number(whatsapp.expiresTicket || 0);
    if (!(0, lodash_1.isNil)(expiresTime) && expiresTime > 0) {
        let whereCondition;
        whereCondition = {
            status: "open",
            companyId,
            whatsappId: whatsapp.id,
            updatedAt: {
                [sequelize_1.Op.lt]: +(0, date_fns_1.sub)(new Date(), {
                    minutes: Number(expiresTime)
                })
            },
            imported: null,
            fromMe: true
        };
        const ticketsToClose = await Ticket_1.default.findAll({
            where: whereCondition,
            include: [
                {
                    model: Contact_1.default,
                    as: "contact",
                    attributes: ["id", "name", "number", "email", "profilePicUrl"]
                },
            ]
        });
        if (ticketsToClose && ticketsToClose.length > 0) {
            logger_1.logger.info(`Encontrou ${ticketsToClose.length} atendimentos para encerrar na empresa ${companyId} - na conexão ${whatsapp.name}!`);
            for (const ticket of ticketsToClose) {
                await ticket.reload();
                const ticketTraking = await TicketTraking_1.default.findOne({
                    where: { ticketId: ticket.id, finishedAt: null }
                });
                let bodyExpiresMessageInactive = "";
                if (!(0, lodash_1.isNil)(whatsapp.expiresInactiveMessage) && whatsapp.expiresInactiveMessage !== "") {
                    bodyExpiresMessageInactive = (0, Mustache_1.default)(`\u200e${whatsapp.expiresInactiveMessage}`, ticket.contact);
                    const sentMessage = await (0, SendWhatsAppMessage_1.default)({ body: bodyExpiresMessageInactive, ticket: ticket });
                    // await verifyMessage(sentMessage, ticket, ticket.contact);
                }
                // Como o campo sendInactiveMessage foi atualizado, podemos garantir que a mensagem foi enviada
                await closeTicket(ticket, bodyExpiresMessageInactive);
                await ticketTraking.update({
                    finishedAt: new Date(),
                    closedAt: new Date(),
                    whatsappId: ticket.whatsappId,
                    userId: ticket.userId,
                });
                (0, socket_1.getIO)().emit(`company-${companyId}-ticket`, {
                    action: "delete",
                    ticketId: ticket.id
                });
            }
        }
    }
};
const ClosedAllOpenTickets = async (companyId) => {
    try {
        const whatsapps = await Whatsapp_1.default.findAll({
            attributes: ["id", "name", "status", "timeSendQueue", "sendIdQueue",
                "expiresInactiveMessage", "expiresTicket",
                "complationMessage"],
            where: {
                expiresTicket: { [sequelize_1.Op.gt]: '0' },
                companyId: companyId,
                status: "CONNECTED"
            }
        });
        // Agora você pode iterar sobre as instâncias de Whatsapp diretamente
        if (whatsapps.length > 0) {
            for (const whatsapp of whatsapps) {
                if (whatsapp.expiresTicket) {
                    await handleOpenTickets(companyId, whatsapp);
                }
            }
        }
    }
    catch (error) {
        console.error('Erro:', error);
    }
};
exports.ClosedAllOpenTickets = ClosedAllOpenTickets;
