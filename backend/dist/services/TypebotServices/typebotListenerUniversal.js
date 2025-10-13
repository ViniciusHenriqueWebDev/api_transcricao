"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const baileys_1 = require("@whiskeysockets/baileys");
const logger_1 = require("../../utils/logger");
const lodash_1 = require("lodash");
const UpdateTicketService_1 = __importDefault(require("../TicketServices/UpdateTicketService"));
const sendFacebookMessage_1 = __importDefault(require("../FacebookServices/sendFacebookMessage"));
const typebotListenerUniversal = async ({ ticket, message, wbot, typebot, platform }) => {
    const { urlN8N: url, typebotExpires, typebotKeywordFinish, typebotKeywordRestart, typebotUnknownMessage, typebotSlug, typebotDelayMessage, typebotRestartMessage } = typebot;
    // ✅ Extrair texto da mensagem baseado na plataforma
    let body = '';
    let number = '';
    let remoteJid = '';
    if (platform === 'whatsapp') {
        // WhatsApp format - função getBodyMessage equivalente
        body = message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            message.message?.imageMessage?.caption ||
            message.message?.videoMessage?.caption ||
            message.message?.documentMessage?.caption ||
            '';
        number = message.key.remoteJid.replace(/\D/g, '');
        remoteJid = message.key.remoteJid;
    }
    else {
        // Facebook/Instagram format
        body = message.text || '';
        number = ticket.contact.number;
        remoteJid = `${number}@facebook.com`;
    }
    console.log("🤖 Typebot Universal iniciado:", {
        platform,
        ticketId: ticket.id,
        sessionId: ticket.typebotSessionId,
        body,
        number,
        hasSession: !(0, lodash_1.isNil)(ticket.typebotSessionId),
        isFirstMessage: (0, lodash_1.isNil)(ticket.typebotSessionId)
    });
    // ✅ Função para enviar mensagem baseado na plataforma
    const sendMessage = async (content) => {
        console.log("📤 Enviando mensagem:", content.substring(0, 100) + "...");
        if (platform === 'whatsapp' && wbot) {
            await wbot.sendMessage(remoteJid, { text: content });
        }
        else {
            // Facebook/Instagram
            await (0, sendFacebookMessage_1.default)({
                ticket,
                body: content
            });
        }
    };
    // ✅ Função para criar sessão
    async function createSession() {
        try {
            console.log("🔄 Criando nova sessão Typebot:", {
                url: `${url}/api/v1/typebots/${typebotSlug}/startChat`,
                number,
                pushName: ticket.contact.name || ""
            });
            const reqData = JSON.stringify({
                "isStreamEnabled": true,
                "message": "string",
                "resultId": "string",
                "isOnlyRegistering": false,
                "prefilledVariables": {
                    "number": number,
                    "pushName": ticket.contact.name || ""
                },
            });
            const config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: `${url}/api/v1/typebots/${typebotSlug}/startChat`,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                data: reqData
            };
            const request = await axios_1.default.request(config);
            console.log("✅ Sessão criada com sucesso:", {
                sessionId: request.data.sessionId,
                messagesCount: request.data.messages?.length || 0
            });
            return request.data;
        }
        catch (err) {
            console.error("❌ Erro ao criar sessão do typebot:", err.response?.data || err.message);
            logger_1.logger.error("Erro ao criar sessão do typebot: ", err);
            throw err;
        }
    }
    try {
        let sessionId;
        let dataStart;
        let status = false;
        // ✅ Verificar expiração da sessão
        const dataLimite = new Date();
        dataLimite.setMinutes(dataLimite.getMinutes() - Number(typebotExpires));
        if (typebotExpires > 0 && ticket.updatedAt < dataLimite) {
            console.log("⏰ Sessão expirada - resetando:", {
                expires: typebotExpires,
                lastUpdate: ticket.updatedAt,
                limit: dataLimite
            });
            await ticket.update({
                typebotSessionId: null,
                isBot: true
            });
            await ticket.reload();
        }
        // ✅ Criar ou recuperar sessão
        const isNewSession = (0, lodash_1.isNil)(ticket.typebotSessionId);
        if (isNewSession) {
            console.log("🆕 Criando nova sessão...");
            dataStart = await createSession();
            sessionId = dataStart.sessionId;
            status = true;
            await ticket.update({
                typebotSessionId: sessionId,
                typebotStatus: true,
                useIntegration: true,
                integrationId: typebot.id
            });
        }
        else {
            console.log("♻️ Usando sessão existente:", ticket.typebotSessionId);
            sessionId = ticket.typebotSessionId;
            status = ticket.typebotStatus;
        }
        if (!status) {
            console.log("❌ Typebot status false - parando execução");
            return;
        }
        // ✅ Processar comandos especiais
        if (body === typebotKeywordRestart) {
            console.log("🔄 Comando de restart recebido");
            await ticket.update({
                isBot: true,
                typebotSessionId: null,
                typebotStatus: false
            });
            await ticket.reload();
            await sendMessage(typebotRestartMessage);
            return;
        }
        if (body === typebotKeywordFinish) {
            console.log("🏁 Comando de finalização recebido");
            await (0, UpdateTicketService_1.default)({
                ticketData: {
                    status: "closed",
                    useIntegration: false,
                    integrationId: null
                },
                ticketId: ticket.id,
                companyId: ticket.companyId
            });
            return;
        }
        // ✅ CORREÇÃO PRINCIPAL: Lógica para primeira mensagem vs continuação
        let messages;
        let input;
        if (isNewSession && dataStart && dataStart.messages && dataStart.messages.length > 0) {
            // ✅ PRIMEIRA INTERAÇÃO - usar mensagens da sessão inicial
            console.log("📨 Primeira interação - usando mensagens iniciais:", {
                messagesCount: dataStart.messages.length,
                sessionId
            });
            messages = dataStart.messages;
            input = dataStart.input;
        }
        else {
            // ✅ CONTINUAÇÃO DA CONVERSA ou sessão existente - fazer nova requisição
            console.log("📨 Continuação da conversa - fazendo nova requisição:", {
                body,
                sessionId,
                isNewSession,
                url: `${url}/api/v1/sessions/${sessionId}/continueChat`
            });
            const reqData = JSON.stringify({
                "message": body
            });
            const config = {
                method: 'post',
                maxBodyLength: Infinity,
                url: `${url}/api/v1/sessions/${sessionId}/continueChat`,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                data: reqData
            };
            try {
                const requestContinue = await axios_1.default.request(config);
                messages = requestContinue.data?.messages;
                input = requestContinue.data?.input;
                console.log("📥 Resposta da API continueChat:", {
                    messagesCount: messages?.length || 0,
                    hasInput: !!input,
                    sessionId: requestContinue.data?.sessionId || sessionId,
                    responseData: requestContinue.data
                });
            }
            catch (apiError) {
                console.error("❌ Erro na API continueChat:", {
                    error: apiError.response?.data || apiError.message,
                    status: apiError.response?.status,
                    sessionId,
                    body
                });
                // Se der erro na continuação, tentar resetar a sessão
                if (apiError.response?.status === 404 || apiError.response?.status === 400) {
                    console.log("🔄 Erro na sessão - resetando e criando nova...");
                    await ticket.update({
                        typebotSessionId: null,
                        typebotStatus: false
                    });
                    // Recriar sessão
                    dataStart = await createSession();
                    sessionId = dataStart.sessionId;
                    await ticket.update({
                        typebotSessionId: sessionId,
                        typebotStatus: true
                    });
                    messages = dataStart.messages;
                    input = dataStart.input;
                    console.log("✅ Nova sessão criada após erro:", {
                        sessionId,
                        messagesCount: messages?.length || 0
                    });
                }
                else {
                    throw apiError;
                }
            }
        }
        // ✅ Processar mensagens
        if (!messages || messages.length === 0) {
            console.log("⚠️ Nenhuma mensagem retornada - enviando mensagem padrão");
            await sendMessage(typebotUnknownMessage);
            return;
        }
        console.log("🔄 Processando mensagens:", {
            totalMessages: messages.length,
            platform
        });
        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];
            console.log(`📨 Processando mensagem ${i + 1}/${messages.length}:`, {
                type: msg.type,
                hasContent: !!msg.content
            });
            if (msg.type === 'text') {
                let formattedText = '';
                // ✅ Processar rich text com verificação de segurança
                if (msg.content?.richText && Array.isArray(msg.content.richText)) {
                    for (const richText of msg.content.richText) {
                        if (richText.children && Array.isArray(richText.children)) {
                            for (const element of richText.children) {
                                let text = element.text || '';
                                if (element.bold)
                                    text = `*${text}*`;
                                if (element.italic)
                                    text = `_${text}_`;
                                if (element.underline)
                                    text = `~${text}~`;
                                if (element.url) {
                                    const linkText = element.children?.[0]?.text || text;
                                    text = `[${linkText}](${element.url})`;
                                }
                                formattedText += text;
                            }
                        }
                        formattedText += '\n';
                    }
                }
                else {
                    // ✅ Fallback para texto simples
                    formattedText = msg.content?.text || msg.content || '';
                }
                formattedText = formattedText.replace(/\n$/, '').trim();
                if (!formattedText) {
                    console.log("⚠️ Texto vazio após processamento - pulando mensagem");
                    continue;
                }
                if (formattedText === "Invalid message. Please, try again.") {
                    formattedText = typebotUnknownMessage;
                }
                // ✅ Processar comandos especiais (#)
                if (formattedText.startsWith("#")) {
                    const gatilho = formattedText.replace("#", "");
                    console.log("🎯 Comando especial detectado:", gatilho);
                    try {
                        const jsonGatilho = JSON.parse(gatilho);
                        if (jsonGatilho.stopBot && (0, lodash_1.isNil)(jsonGatilho.userId) && (0, lodash_1.isNil)(jsonGatilho.queueId)) {
                            console.log("🛑 Executando stopBot");
                            await ticket.update({
                                useIntegration: false,
                                isBot: false,
                                typebotStatus: false
                            });
                            return;
                        }
                        // Processar transferências de fila/usuário
                        const ticketData = {
                            chatbot: false,
                            useIntegration: false,
                            integrationId: null
                        };
                        if (!(0, lodash_1.isNil)(jsonGatilho.queueId) && jsonGatilho.queueId > 0) {
                            ticketData.queueId = jsonGatilho.queueId;
                        }
                        if (!(0, lodash_1.isNil)(jsonGatilho.userId) && jsonGatilho.userId > 0) {
                            ticketData.userId = jsonGatilho.userId;
                        }
                        await (0, UpdateTicketService_1.default)({
                            ticketData,
                            ticketId: ticket.id,
                            companyId: ticket.companyId
                        });
                        return;
                    }
                    catch (err) {
                        console.error("❌ Erro ao processar comando JSON:", err);
                        logger_1.logger.error("Erro ao processar comando JSON:", err);
                    }
                }
                // ✅ Simular digitação apenas no WhatsApp
                if (platform === 'whatsapp' && wbot) {
                    try {
                        await wbot.presenceSubscribe(remoteJid);
                        await wbot.sendPresenceUpdate('composing', remoteJid);
                        await (0, baileys_1.delay)(typebotDelayMessage || 1000);
                        await wbot.sendPresenceUpdate('paused', remoteJid);
                    }
                    catch (presenceError) {
                        console.log("⚠️ Erro ao enviar presença:", presenceError.message);
                    }
                }
                else {
                    // Delay simples para Facebook/Instagram
                    await (0, baileys_1.delay)(typebotDelayMessage || 1000);
                }
                await sendMessage(formattedText);
            }
            // ✅ Processar outros tipos de mídia
            if (msg.type === 'image') {
                console.log("🖼️ Processando imagem:", msg.content?.url);
                if (platform === 'whatsapp' && wbot) {
                    await (0, baileys_1.delay)(typebotDelayMessage || 1000);
                    await wbot.sendMessage(remoteJid, {
                        image: { url: msg.content.url }
                    });
                }
                else {
                    // Para Facebook, enviar como texto com link da imagem
                    await sendMessage(`🖼️ Imagem: ${msg.content.url}`);
                }
            }
            if (msg.type === 'audio') {
                console.log("🎵 Processando áudio:", msg.content?.url);
                if (platform === 'whatsapp' && wbot) {
                    await (0, baileys_1.delay)(typebotDelayMessage || 1000);
                    await wbot.sendMessage(remoteJid, {
                        audio: { url: msg.content.url },
                        mimetype: 'audio/mp4',
                        ptt: true
                    });
                }
                else {
                    // Para Facebook, enviar como texto com link do áudio
                    await sendMessage(`🎵 Áudio: ${msg.content.url}`);
                }
            }
        }
        // ✅ Processar inputs de escolha
        if (input?.type === 'choice input') {
            console.log("🔘 Processando choice input:", input.items?.length || 0, "opções");
            let formattedText = '';
            if (input.items && Array.isArray(input.items)) {
                for (const item of input.items) {
                    formattedText += `▶️ ${item.content}\n`;
                }
            }
            formattedText = formattedText.replace(/\n$/, '');
            if (formattedText) {
                if (platform === 'whatsapp' && wbot) {
                    await (0, baileys_1.delay)(typebotDelayMessage || 1000);
                }
                await sendMessage(formattedText);
            }
        }
        console.log("✅ Processamento completo do Typebot Universal");
    }
    catch (error) {
        console.error("❌ Error on typebotListenerUniversal:", error);
        logger_1.logger.error("Error on typebotListenerUniversal: ", error);
        await ticket.update({
            typebotSessionId: null,
            typebotStatus: false
        });
        throw error;
    }
};
exports.default = typebotListenerUniversal;
