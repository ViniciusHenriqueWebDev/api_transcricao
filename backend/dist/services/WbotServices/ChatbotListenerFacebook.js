"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sayChatbot = exports.deleteAndCreateDialogStage = void 0;
const ShowDialogChatBotsServices_1 = __importDefault(require("../DialogChatBotsServices/ShowDialogChatBotsServices"));
const ShowQueueService_1 = __importDefault(require("../QueueService/ShowQueueService"));
const ShowChatBotServices_1 = __importDefault(require("../ChatBotServices/ShowChatBotServices"));
const DeleteDialogChatBotsServices_1 = __importDefault(require("../DialogChatBotsServices/DeleteDialogChatBotsServices"));
const ShowChatBotByChatbotIdServices_1 = __importDefault(require("../ChatBotServices/ShowChatBotByChatbotIdServices"));
const CreateDialogChatBotsServices_1 = __importDefault(require("../DialogChatBotsServices/CreateDialogChatBotsServices"));
const ShowWhatsAppService_1 = __importDefault(require("../WhatsappService/ShowWhatsAppService"));
const Mustache_1 = __importDefault(require("../../helpers/Mustache"));
const UpdateTicketService_1 = __importDefault(require("../TicketServices/UpdateTicketService"));
const User_1 = __importDefault(require("../../models/User"));
const graphAPI_1 = require("../FacebookServices/graphAPI");
const isNumeric = (value) => /^-?\d+$/.test(value);
const deleteAndCreateDialogStage = async (contact, chatbotId, ticket) => {
    try {
        await (0, DeleteDialogChatBotsServices_1.default)(contact.id);
        const bots = await (0, ShowChatBotByChatbotIdServices_1.default)(chatbotId);
        if (!bots) {
            await ticket.update({ isBot: false });
        }
        return await (0, CreateDialogChatBotsServices_1.default)({
            awaiting: 1,
            contactId: contact.id,
            chatbotId,
            queueId: bots.queueId
        });
    }
    catch (error) {
        await ticket.update({ isBot: false });
    }
};
exports.deleteAndCreateDialogStage = deleteAndCreateDialogStage;
const sendMessage = async (wbot, contact, ticket, body) => {
    const sentMessage = await (0, graphAPI_1.sendText)(contact.number, (0, Mustache_1.default)(body, contact), ticket.whatsapp.facebookUserToken);
};
const sendDialog = async (choosenQueue, contact, ticket) => {
    const showChatBots = await (0, ShowChatBotServices_1.default)(choosenQueue.id);
    if (showChatBots.options) {
        // ✅ VERIFICAR SE É FACEBOOK PARA LIMITAR OPÇÕES
        const isFacebook = ticket.whatsapp?.channel === 'facebook' ||
            ticket.whatsapp?.channel === 'instagram';
        let options = "";
        const maxOptions = isFacebook ? 5 : showChatBots.options.length; // Limitar a 5 opções no Facebook
        const optionsToShow = showChatBots.options.slice(0, maxOptions);
        optionsToShow.forEach((option, index) => {
            options += `*${index + 1}* - ${option.name}\n`;
        });
        // ✅ MENSAGEM MAIS COMPACTA PARA FACEBOOK
        let body;
        if (isFacebook) {
            body = `${choosenQueue.greetingMessage}\n\n${options}`;
            if (showChatBots.options.length > maxOptions) {
                body += `\n*0* - Ver mais opções`;
            }
            body += `\n*#* - Menu principal`;
        }
        else {
            // WhatsApp - mensagem completa
            const optionsBack = options.length > 0
                ? `${options}\n*#* Voltar para o menu principal`
                : options;
            body = `\u200e${choosenQueue.greetingMessage}\n\n${optionsBack}`;
        }
        console.log(`📤 Sending ${isFacebook ? 'Facebook' : 'WhatsApp'} menu with ${optionsToShow.length} options`);
        const sendOption = await (0, graphAPI_1.sendText)(contact.number, (0, Mustache_1.default)(body, contact), ticket.whatsapp.facebookUserToken || null);
        return sendOption;
    }
    const body = `\u200e${choosenQueue.greetingMessage}`;
    const send = await (0, graphAPI_1.sendText)(contact.number, (0, Mustache_1.default)(body, contact), ticket.whatsapp.facebookUserToken);
    return send;
};
const backToMainMenu = async (wbot, contact, ticket) => {
    await (0, UpdateTicketService_1.default)({
        ticketData: { queueId: null },
        ticketId: ticket.id,
        companyId: ticket.companyId
    });
    const { queues, greetingMessage } = await (0, ShowWhatsAppService_1.default)(wbot.id, ticket.companyId);
    let options = "";
    queues.forEach((option, index) => {
        options += `*${index + 1}* - ${option.name}\n`;
    });
    const body = (0, Mustache_1.default)(`\u200e${greetingMessage}\n\n${options}`, contact);
    await sendMessage(wbot, contact, ticket, body);
    const deleteDialog = await (0, DeleteDialogChatBotsServices_1.default)(contact.id);
    return deleteDialog;
};
const sayChatbot = async (queueId, wbot, ticket, contact, msg) => {
    const selectedOption = msg.text;
    if (!queueId && selectedOption && msg.is_echo)
        return;
    const getStageBot = await (0, ShowDialogChatBotsServices_1.default)(contact.id);
    if (selectedOption === "#") {
        const backTo = await backToMainMenu(wbot, contact, ticket);
        return backTo;
    }
    if (!getStageBot) {
        const queue = await (0, ShowQueueService_1.default)(queueId, ticket.companyId);
        const selectedOption = msg.text;
        // Verificar se a queue tem chatbots ou usar uma estrutura alternativa
        const chatbots = queue.chatbots || queue.Chatbots || [];
        const choosenQueue = chatbots[+selectedOption - 1];
        if (!choosenQueue?.greetingMessage) {
            await (0, DeleteDialogChatBotsServices_1.default)(contact.id);
            return;
        } // nao tem mensagem de boas vindas
        if (choosenQueue) {
            if (choosenQueue.isAgent) {
                const getUserByName = await User_1.default.findOne({
                    where: {
                        name: choosenQueue.name
                    }
                });
                const ticketUpdateAgent = {
                    ticketData: {
                        userId: getUserByName.id,
                        status: "open",
                    },
                    ticketId: ticket.id,
                    companyId: ticket.companyId
                };
                await (0, UpdateTicketService_1.default)(ticketUpdateAgent);
            }
            await (0, exports.deleteAndCreateDialogStage)(contact, choosenQueue.id, ticket);
            const send = await sendDialog(choosenQueue, contact, ticket);
            return send;
        }
    }
    if (getStageBot) {
        const selected = isNumeric(selectedOption) ? selectedOption : 1;
        const bots = await (0, ShowChatBotServices_1.default)(getStageBot.chatbotId);
        const choosenQueue = bots.options[+selected - 1]
            ? bots.options[+selected - 1]
            : bots.options[0];
        if (!choosenQueue.greetingMessage) {
            await (0, DeleteDialogChatBotsServices_1.default)(contact.id);
            return;
        } // nao tem mensagem de boas vindas
        if (choosenQueue) {
            if (choosenQueue.isAgent) {
                const getUserByName = await User_1.default.findOne({
                    where: {
                        name: choosenQueue.name
                    }
                });
                const ticketUpdateAgent = {
                    ticketData: {
                        userId: getUserByName.id,
                        status: "open"
                    },
                    ticketId: ticket.id,
                    companyId: ticket.companyId
                };
                await (0, UpdateTicketService_1.default)(ticketUpdateAgent);
            }
            await (0, exports.deleteAndCreateDialogStage)(contact, choosenQueue.id, ticket);
            const send = await sendDialog(choosenQueue, contact, ticket);
            return send;
        }
    }
};
exports.sayChatbot = sayChatbot;
