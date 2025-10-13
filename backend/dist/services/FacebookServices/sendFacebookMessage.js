"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../../errors/AppError"));
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const graphAPI_1 = require("./graphAPI");
const facebookMessageListener_1 = require("./facebookMessageListener");
const socket_1 = require("../../libs/socket");
// ✅ FUNÇÃO PARA DIVIDIR MENSAGENS LONGAS
const splitMessageForFacebook = (message, maxLength = 2000) => {
    if (message.length <= maxLength) {
        return [message];
    }
    const parts = [];
    let currentPart = '';
    const lines = message.split('\n');
    for (const line of lines) {
        // Se adicionar esta linha ultrapassar o limite
        if ((currentPart + line + '\n').length > maxLength) {
            // Se currentPart não está vazio, salvar como uma parte
            if (currentPart.trim()) {
                parts.push(currentPart.trim());
                currentPart = '';
            }
            // Se a linha sozinha é muito grande, dividir ela também
            if (line.length > maxLength) {
                const chunks = splitLongLine(line, maxLength);
                chunks.forEach((chunk, index) => {
                    if (index === chunks.length - 1) {
                        currentPart = chunk + '\n';
                    }
                    else {
                        parts.push(chunk);
                    }
                });
            }
            else {
                currentPart = line + '\n';
            }
        }
        else {
            currentPart += line + '\n';
        }
    }
    // Adicionar a última parte
    if (currentPart.trim()) {
        parts.push(currentPart.trim());
    }
    return parts;
};
const splitLongLine = (line, maxLength) => {
    const parts = [];
    let remaining = line;
    while (remaining.length > maxLength) {
        // Tentar quebrar em um espaço próximo ao limite
        let breakPoint = maxLength;
        const lastSpace = remaining.lastIndexOf(' ', maxLength);
        if (lastSpace > maxLength * 0.7) { // Se o espaço está em uma posição razoável
            breakPoint = lastSpace;
        }
        parts.push(remaining.substring(0, breakPoint).trim());
        remaining = remaining.substring(breakPoint).trim();
    }
    if (remaining) {
        parts.push(remaining);
    }
    return parts;
};
const sendFacebookMessage = async ({ body, ticket, quotedMsg }) => {
    const { number } = ticket.contact;
    const io = (0, socket_1.getIO)();
    try {
        console.log("🚀 Facebook sendMessage started:", {
            ticketId: ticket.id,
            contactNumber: number,
            bodyLength: body?.length,
            hasQuote: !!quotedMsg,
            ticketWhatsappId: ticket.whatsappId,
            originalBody: body
        });
        // ✅ VALIDAR E LIMPAR MENSAGEM
        let cleanBody = body;
        if (typeof cleanBody === 'string') {
            cleanBody = cleanBody.replace(/\u200e/g, ''); // Remove left-to-right mark
            cleanBody = cleanBody.replace(/\u200f/g, ''); // Remove right-to-left mark
            cleanBody = cleanBody.trim(); // Remove espaços
        }
        // ✅ VERIFICAR SE A MENSAGEM NÃO ESTÁ VAZIA
        if (!cleanBody || cleanBody === '' || cleanBody.match(/^\s*$/)) {
            console.log("⚠️ Empty message detected, skipping send");
            return {
                mid: `facebook_skip_${Date.now()}_${Math.random()}`,
                message_id: `facebook_skip_${Date.now()}_${Math.random()}`,
                skipped: true,
                reason: "empty_message"
            };
        }
        console.log("📝 Clean message:", {
            originalLength: body?.length,
            cleanLength: cleanBody.length,
            cleanBody: cleanBody
        });
        // ✅ BUSCAR CONEXÃO FACEBOOK
        const whatsappConnection = await Whatsapp_1.default.findByPk(ticket.whatsappId);
        if (!whatsappConnection) {
            throw new AppError_1.default("ERR_WAPP_NOT_FOUND");
        }
        const facebookToken = whatsappConnection.facebookUserToken;
        if (!facebookToken) {
            throw new AppError_1.default("ERR_FACEBOOK_TOKEN_NOT_FOUND");
        }
        console.log("✅ Facebook connection found:", {
            id: whatsappConnection.id,
            name: whatsappConnection.name,
            channel: whatsappConnection.channel,
            tokenLength: facebookToken.length
        });
        // ✅ VERIFICAR TAMANHO DA MENSAGEM E DIVIDIR SE NECESSÁRIO
        const MAX_FACEBOOK_MESSAGE_LENGTH = 2000;
        if (cleanBody.length > MAX_FACEBOOK_MESSAGE_LENGTH) {
            console.log("📏 Message too long for Facebook, splitting...");
            // Dividir a mensagem em partes menores
            const parts = splitMessageForFacebook(cleanBody, MAX_FACEBOOK_MESSAGE_LENGTH);
            console.log(`📤 Sending message in ${parts.length} parts`);
            let lastSend;
            // Enviar cada parte com delay
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                console.log(`📤 Sending part ${i + 1}/${parts.length} to Facebook (${part.length} chars)`);
                const send = await (0, graphAPI_1.sendText)(number, part, facebookToken);
                // Salvar cada parte no banco
                await (0, facebookMessageListener_1.verifyMessageFace)(send, part, ticket, ticket.contact, true);
                lastSend = send;
                // Delay entre mensagens para não sobrecarregar (exceto na última)
                if (i < parts.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 800));
                }
            }
            await ticket.update({
                lastMessage: cleanBody,
                lastMessageAt: new Date()
            });
            await ticket.reload({
                include: [
                    { model: require("../../models/Queue"), as: "queue" },
                    { model: require("../../models/User"), as: "user" },
                    { model: require("../../models/Contact"), as: "contact" },
                ],
            });
            io.to(ticket.id.toString())
                .to(`company-${ticket.companyId}-${ticket.status}`)
                .to(`queue-${ticket.queueId}-${ticket.status}`)
                .to(`user-${ticket.userId}`)
                .emit(`company-${ticket.companyId}-ticket`, {
                action: "update",
                ticket,
                ticketId: ticket.id,
            });
            // ✅ EMITIR EVENTO DE NOTIFICAÇÃO
            io.to(`company-${ticket.companyId}-notification`)
                .to(`queue-${ticket.queueId}-notification`)
                .to(`user-${ticket.userId}`)
                .to("notification")
                .emit(`company-${ticket.companyId}-ticket`, {
                action: "update",
                ticket,
                ticketId: ticket.id
            });
            console.log(`✅ Facebook message sent in ${parts.length} parts`);
            return lastSend;
        }
        // ✅ LÓGICA NORMAL PARA MENSAGENS CURTAS
        // Atualizar ticket se necessário
        if (!ticket.whatsappId || ticket.whatsappId !== whatsappConnection.id) {
            console.log("🔄 Updating ticket with correct whatsappId:", whatsappConnection.id);
            await ticket.update({
                whatsappId: whatsappConnection.id,
                channel: whatsappConnection.channel
            });
        }
        // ✅ ENVIAR VIA FACEBOOK API
        console.log("📤 Sending via Facebook API to contact:", number);
        const send = await (0, graphAPI_1.sendText)(number, cleanBody, facebookToken);
        console.log("✅ Facebook message sent successfully");
        await (0, facebookMessageListener_1.verifyMessageFace)(send, cleanBody, ticket, ticket.contact, true);
        await ticket.update({
            lastMessage: cleanBody,
            lastMessageAt: new Date()
        });
        return send;
    }
    catch (error) {
        console.error("❌ Error in sendFacebookMessage:", error);
        // Se for erro de axios, extrair detalhes
        if (error.response) {
            console.error("Facebook API Error:", {
                status: error.response.status,
                data: error.response.data,
                message: error.response.data?.error?.message
            });
        }
        throw new AppError_1.default("ERR_SENDING_FACEBOOK_MSG");
    }
};
exports.default = sendFacebookMessage;
