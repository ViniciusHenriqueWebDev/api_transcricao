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
exports.handleMessage = exports.sleep = exports.verifyQuotedMessage = exports.verifyMessageMedia = exports.verifyMessageFace = void 0;
const fs_1 = require("fs");
const fs_2 = __importDefault(require("fs"));
const axios_1 = __importDefault(require("axios"));
const moment_1 = __importDefault(require("moment"));
const sequelize_1 = require("sequelize");
const path_1 = require("path");
const path_2 = __importDefault(require("path"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const CreateOrUpdateContactService_1 = __importDefault(require("../ContactServices/CreateOrUpdateContactService"));
const CreateMessageService_1 = __importDefault(require("../MessageServices/CreateMessageService"));
const graphAPI_1 = require("./graphAPI");
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const UpdateTicketService_1 = __importDefault(require("../TicketServices/UpdateTicketService"));
const ShowWhatsAppService_1 = __importDefault(require("../WhatsappService/ShowWhatsAppService"));
const Mustache_1 = __importDefault(require("../../helpers/Mustache"));
const Queue_1 = __importDefault(require("../../models/Queue"));
const Message_1 = __importDefault(require("../../models/Message"));
const lodash_1 = require("lodash");
const FindOrCreateATicketTrakingService_1 = __importDefault(require("../TicketServices/FindOrCreateATicketTrakingService"));
const wbotMessageListener_1 = require("../WbotServices/wbotMessageListener");
const Setting_1 = __importDefault(require("../../models/Setting"));
const sendFacebookMessage_1 = __importDefault(require("./sendFacebookMessage"));
const ShowQueueIntegrationService_1 = __importDefault(require("../QueueIntegrationServices/ShowQueueIntegrationService"));
const VerifyCurrentSchedule_1 = __importDefault(require("../CompanyService/VerifyCurrentSchedule"));
const CreateTicketService_1 = __importDefault(require("../TicketServices/CreateTicketService"));
const typebotListenerUniversal_1 = __importDefault(require("../TypebotServices/typebotListenerUniversal"));
const openai_1 = __importDefault(require("openai"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const microsoft_cognitiveservices_speech_sdk_1 = require("microsoft-cognitiveservices-speech-sdk");
const User_1 = __importDefault(require("../../models/User"));
const socket_1 = require("../../libs/socket");
const QueueOption_1 = __importDefault(require("../../models/QueueOption"));
const request = require("request");
const sessionsOpenAiByConnection = new Map();
const verifyContact = async (msgContact, whatsapp, companyId) => {
    // ✅ BUSCAR CONTATO EXISTENTE ANTES DE CRIAR
    const existingContact = await Contact_1.default.findOne({
        where: {
            [sequelize_1.Op.or]: [
                { number: msgContact.id, companyId },
                { number: msgContact.id.toString(), companyId }
            ]
        },
        order: [["updatedAt", "DESC"]]
    });
    // ✅ CONSTRUIR NOME USANDO OS DADOS REAIS DO PERFIL
    let contactName = whatsapp.channel === "instagram" ? "Instagram User" : "Facebook User"; // fallback
    if (msgContact.name) {
        contactName = msgContact.name;
    }
    else if (msgContact.username) {
        contactName = msgContact.username;
    }
    else if (msgContact.first_name && msgContact.last_name) {
        contactName = `${msgContact.first_name} ${msgContact.last_name}`;
    }
    else if (msgContact.first_name) {
        contactName = msgContact.first_name;
    }
    else if (msgContact.last_name) {
        contactName = msgContact.last_name;
    }
    console.log("🏷️ Dados do contato:", {
        psid: msgContact.id,
        originalData: msgContact,
        constructedName: contactName,
        existingContact: existingContact ? {
            id: existingContact.id,
            name: existingContact.name,
            number: existingContact.number
        } : null
    });
    // ✅ TRUNCAR URL DA FOTO SE NECESSÁRIO
    let profilePicUrl = msgContact.profile_pic || "";
    if (profilePicUrl && profilePicUrl.length > 500) {
        profilePicUrl = profilePicUrl.substring(0, 500);
    }
    const contactData = {
        name: contactName,
        number: msgContact.id.toString(),
        profilePicUrl: profilePicUrl,
        isGroup: false,
        companyId: companyId,
        whatsappId: whatsapp.id
    };
    const contact = await (0, CreateOrUpdateContactService_1.default)(contactData);
    console.log("🔄 Contato processado:", {
        id: contact.id,
        finalName: contact.name,
        number: contact.number,
        wasExisting: !!existingContact
    });
    return contact;
};
const verifyMessageFace = async (msg, body, ticket, contact, fromMe = false, channel = "facebook") => {
    const quotedMsg = await (0, exports.verifyQuotedMessage)(msg);
    const io = (0, socket_1.getIO)();
    console.log("💾 Saving Facebook/Instagram message:", {
        ticketId: ticket.id,
        body: body,
        fromMe,
        messageType: fromMe ? "outgoing" : "incoming",
        channel: channel
    });
    // ✅ VERIFICAR SE A MENSAGEM FOI SKIPPED
    if (msg?.skipped) {
        console.log("⏭️ Skipping message save due to skip flag");
        return;
    }
    // ✅ GERAR ID SEGURO COM CANAL
    const messageId = msg?.mid ||
        msg?.message_id ||
        `${channel}_${Date.now()}_${Math.random()}`;
    const messageData = {
        id: messageId,
        wid: messageId,
        ticketId: ticket.id,
        contactId: fromMe ? undefined : contact.id,
        body: body,
        fromMe: fromMe,
        read: fromMe ? true : false,
        quotedMsgId: quotedMsg?.id,
        ack: fromMe ? 3 : 1,
        dataJson: JSON.stringify(msg || {}),
        channel: channel
    };
    const message = await (0, CreateMessageService_1.default)({ messageData, companyId: ticket.companyId });
    // ✅ ATUALIZAR TICKET COM ÚLTIMA MENSAGEM E CONTADORES
    const updateData = {
        lastMessage: body || "📎 Mídia",
        lastMessageAt: new Date()
    };
    // ✅ SE NÃO É MINHA MENSAGEM, INCREMENTAR CONTADOR
    if (!fromMe) {
        await ticket.update({
            unreadMessages: ticket.unreadMessages + 1,
            ...updateData
        });
    }
    else {
        await ticket.update(updateData);
    }
    // ✅ RECARREGAR TICKET COM TODAS AS ASSOCIAÇÕES PARA SOCKET
    await ticket.reload({
        include: [
            {
                model: Contact_1.default,
                as: "contact",
                attributes: ["id", "name", "number", "profilePicUrl"]
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
                model: Whatsapp_1.default,
                as: "whatsapp",
                attributes: ["id", "name", "channel"]
            }
        ]
    });
    console.log("✅ Ticket atualizado com lastMessage:", {
        ticketId: ticket.id,
        lastMessage: ticket.lastMessage,
        unreadMessages: ticket.unreadMessages
    });
    // ✅ EMITIR EVENTOS SOCKET PARA TODOS OS CANAIS NECESSÁRIOS
    const companyId = ticket.companyId;
    const status = ticket.status;
    const queueId = ticket.queueId;
    const userId = ticket.userId;
    console.log("📡 Emitindo eventos socket para Facebook/Instagram:", {
        companyId,
        ticketId: ticket.id,
        status,
        queueId,
        userId,
        channel: ticket.whatsapp?.channel,
        lastMessage: ticket.lastMessage
    });
    // ✅ EVENTO PRINCIPAL PARA ATUALIZAÇÃO DE TICKET
    io.to(ticket.id.toString())
        .to(`company-${companyId}-mainchannel`)
        .to(`company-${companyId}-${status}`)
        .emit(`company-${companyId}-ticket`, {
        action: "update",
        ticket,
        ticketId: ticket.id
    });
    // ✅ EVENTOS ESPECÍFICOS POR FILA
    if (queueId) {
        io.to(`queue-${queueId}-${status}`)
            .emit(`company-${companyId}-ticket`, {
            action: "update",
            ticket,
            ticketId: ticket.id
        });
    }
    // ✅ EVENTOS ESPECÍFICOS POR USUÁRIO
    if (userId) {
        io.to(`user-${userId}`)
            .emit(`company-${companyId}-ticket`, {
            action: "update",
            ticket,
            ticketId: ticket.id
        });
    }
    // ✅ EVENTO ESPECÍFICO PARA NOVA MENSAGEM
    io.to(ticket.id.toString())
        .to(`company-${companyId}-mainchannel`)
        .emit(`company-${companyId}-appMessage`, {
        action: fromMe ? "create" : "received",
        message,
        ticket,
        contact
    });
    // ✅ EVENTOS DE NOTIFICAÇÃO PARA MENSAGENS NÃO LIDAS
    if (!fromMe) {
        io.to(`company-${companyId}-notification`)
            .emit("notification", {
            action: "new-message",
            ticket,
            message: {
                body: body
            }
        });
        // ✅ NOTIFICAÇÃO POR FILA
        if (queueId) {
            io.to(`queue-${queueId}-notification`)
                .emit("notification", {
                action: "new-message",
                ticket
            });
        }
        // ✅ NOTIFICAÇÃO POR USUÁRIO
        if (userId) {
            io.to(`user-${userId}`)
                .emit("notification", {
                action: "new-message",
                ticket
            });
        }
    }
    console.log("✅ Eventos socket emitidos com sucesso para Facebook/Instagram");
    return message;
};
exports.verifyMessageFace = verifyMessageFace;
const verifyMessageMedia = async (msg, ticket, contact, fromMe = false, channel = "facebook") => {
    console.log("📎 Processando mídia Facebook/Instagram:", {
        ticketId: ticket.id,
        attachmentType: msg.attachments?.[0]?.type,
        channel,
        fromMe,
        hasAttachments: !!msg.attachments && msg.attachments.length > 0
    });
    if (!msg.attachments || msg.attachments.length === 0) {
        throw new Error("Nenhum anexo encontrado na mensagem");
    }
    const attachment = msg.attachments[0];
    const mediaUrl = attachment.payload?.url;
    if (!mediaUrl) {
        throw new Error("URL do anexo não encontrada");
    }
    let mediaData;
    let fileName;
    let mediaType;
    let detectedMimeType;
    try {
        console.log("📥 Baixando mídia de:", mediaUrl.substring(0, 100) + "...");
        // ✅ BAIXAR MÍDIA COM HEADERS APROPRIADOS
        const response = await axios_1.default.get(mediaUrl, {
            responseType: "arraybuffer",
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': '*/*',
                'Accept-Encoding': 'gzip, deflate, br'
            },
            timeout: 60000,
            maxContentLength: 200 * 1024 * 1024,
            maxBodyLength: 200 * 1024 * 1024
        });
        mediaData = Buffer.from(response.data);
        console.log("📊 Dados da mídia baixados:", {
            size: mediaData.length,
            sizeInMB: (mediaData.length / 1024 / 1024).toFixed(2) + "MB"
        });
        // ✅ DETECTAR TIPO DE ARQUIVO
        const { fileTypeFromBuffer } = await Promise.resolve().then(() => __importStar(require("file-type")));
        const detectedType = await fileTypeFromBuffer(mediaData);
        detectedMimeType = detectedType?.mime || 'application/octet-stream';
        // ✅ DETERMINAR TIPO E EXTENSÃO BASEADO NO ATTACHMENT TYPE
        switch (attachment.type) {
            case 'image':
                mediaType = 'image';
                fileName = `img_${Date.now()}.${detectedType?.ext || 'jpg'}`;
                break;
            case 'audio':
                mediaType = 'audio';
                fileName = `audio_${Date.now()}.${detectedType?.ext || 'mp3'}`;
                break;
            case 'video':
                mediaType = 'video';
                fileName = `video_${Date.now()}.${detectedType?.ext || 'mp4'}`;
                break;
            case 'file':
                mediaType = 'document';
                fileName = `doc_${Date.now()}.${detectedType?.ext || 'bin'}`;
                break;
            default:
                mediaType = 'document';
                fileName = `media_${Date.now()}.${detectedType?.ext || 'bin'}`;
        }
        console.log("🔍 Mídia detectada:", {
            type: mediaType,
            fileName,
            size: mediaData.length,
            detectedMimeType,
            attachmentType: attachment.type
        });
    }
    catch (downloadError) {
        console.error("❌ Erro ao baixar mídia:", {
            error: downloadError.message,
            url: mediaUrl.substring(0, 100) + "...",
            status: downloadError.response?.status
        });
        throw new Error(`Erro ao baixar mídia: ${downloadError.message}`);
    }
    // ✅ CRIAR DIRETÓRIO SE NÃO EXISTIR
    const folder = `public/company${ticket.companyId}`;
    const fullPath = (0, path_1.join)(__dirname, "..", "..", "..", folder);
    if (!fs_2.default.existsSync(fullPath)) {
        fs_2.default.mkdirSync(fullPath, { recursive: true });
        fs_2.default.chmodSync(fullPath, 0o777);
    }
    // ✅ SALVAR ARQUIVO
    const filePath = (0, path_1.join)(fullPath, fileName);
    try {
        (0, fs_1.writeFileSync)(filePath, mediaData);
        console.log("💾 Arquivo salvo:", {
            path: filePath,
            fileName,
            exists: fs_2.default.existsSync(filePath)
        });
    }
    catch (saveError) {
        console.error("❌ Erro ao salvar arquivo:", saveError);
        throw new Error(`Erro ao salvar arquivo: ${saveError.message}`);
    }
    // ✅ PROCESSAR ÁUDIO ESPECIFICAMENTE
    if (mediaType === 'audio') {
        try {
            const processedAudio = await processAudioForPlayback(filePath, fullPath);
            if (processedAudio) {
                fileName = processedAudio;
                console.log("🎵 Áudio processado:", fileName);
            }
        }
        catch (audioError) {
            console.warn("⚠️ Erro ao processar áudio, usando original:", audioError.message);
        }
    }
    // ✅ PREPARAR DADOS DA MENSAGEM
    const messageId = msg.mid || `${channel}_media_${Date.now()}_${Math.random()}`;
    const messageData = {
        id: messageId,
        wid: messageId,
        ticketId: ticket.id,
        contactId: fromMe ? undefined : contact.id,
        body: msg.text || getMediaDescription(mediaType),
        fromMe: fromMe,
        mediaType: mediaType,
        mediaUrl: fileName,
        read: fromMe ? true : false,
        quotedMsgId: null,
        ack: fromMe ? 3 : 1,
        dataJson: JSON.stringify({
            ...msg,
            attachment: {
                type: attachment.type,
                originalUrl: mediaUrl,
                fileName: fileName,
                size: mediaData.length,
                detectedMimeType,
                processed: mediaType === 'audio'
            }
        }),
        channel: channel
    };
    // ✅ CRIAR MENSAGEM NO BANCO
    const message = await (0, CreateMessageService_1.default)({
        messageData,
        companyId: ticket.companyId
    });
    // ✅ ATUALIZAR TICKET
    const lastMessage = msg.text || getMediaDescription(mediaType);
    await ticket.update({
        lastMessage: lastMessage,
        lastMessageAt: new Date(),
        unreadMessages: fromMe ? ticket.unreadMessages : ticket.unreadMessages + 1
    });
    // ✅ RECARREGAR TICKET PARA SOCKET
    await ticket.reload({
        include: [
            { model: Contact_1.default, as: "contact", attributes: ["id", "name", "number", "profilePicUrl"] },
            { model: Queue_1.default, as: "queue", attributes: ["id", "name", "color"] },
            { model: User_1.default, as: "user", attributes: ["id", "name"] },
            { model: Whatsapp_1.default, as: "whatsapp", attributes: ["id", "name", "channel"] }
        ]
    });
    // ✅ EMITIR EVENTOS SOCKET
    const io = (0, socket_1.getIO)();
    const companyId = ticket.companyId;
    io.to(ticket.id.toString())
        .to(`company-${companyId}-mainchannel`)
        .to(`company-${companyId}-${ticket.status}`)
        .emit(`company-${companyId}-ticket`, {
        action: "update",
        ticket,
        ticketId: ticket.id
    });
    io.to(ticket.id.toString())
        .to(`company-${companyId}-mainchannel`)
        .emit(`company-${companyId}-appMessage`, {
        action: fromMe ? "create" : "received",
        message,
        ticket,
        contact
    });
    // ✅ NOTIFICAÇÃO PARA MENSAGENS RECEBIDAS
    if (!fromMe) {
        io.to(`company-${companyId}-notification`)
            .emit("notification", {
            action: "new-message",
            ticket,
            message: {
                body: getMediaDescription(mediaType)
            }
        });
    }
    console.log("✅ Mídia Facebook/Instagram processada com sucesso:", {
        messageId: message.id,
        mediaType,
        fileName,
        ticketId: ticket.id
    });
    return message;
};
exports.verifyMessageMedia = verifyMessageMedia;
const processAudioForPlayback = async (filePath, outputDir) => {
    return new Promise((resolve) => {
        const timestamp = Date.now();
        const outputFileName = `audio_${timestamp}_processed.mp3`;
        const outputPath = path_2.default.join(outputDir, outputFileName);
        (0, fluent_ffmpeg_1.default)(filePath)
            .audioCodec('mp3')
            .audioBitrate(128)
            .audioFrequency(44100)
            .on('end', () => {
            console.log("🎵 Áudio convertido para MP3");
            // ✅ REMOVER ARQUIVO ORIGINAL
            try {
                fs_2.default.unlinkSync(filePath);
            }
            catch (err) {
                console.warn("⚠️ Não foi possível remover arquivo original:", err.message);
            }
            resolve(outputFileName);
        })
            .on('error', (err) => {
            console.error("❌ Erro na conversão de áudio:", err);
            resolve(null);
        })
            .save(outputPath);
    });
};
const getMediaDescription = (mediaType) => {
    const descriptions = {
        'image': '📷 Imagem',
        'audio': '🎵 Áudio',
        'video': '🎥 Vídeo',
        'document': '📄 Documento'
    };
    return descriptions[mediaType] || '📎 Mídia';
};
const verifyQuotedMessage = async (msg) => {
    if (!msg)
        return null;
    const quoted = msg?.reply_to?.mid;
    if (!quoted)
        return null;
    const quotedMsg = await Message_1.default.findOne({
        where: { wid: quoted }
    });
    if (!quotedMsg)
        return null;
    return quotedMsg;
};
exports.verifyQuotedMessage = verifyQuotedMessage;
const sanitizeName = (name) => {
    let sanitized = name.split(" ")[0];
    sanitized = sanitized.replace(/[^a-zA-Z0-9]/g, "");
    return sanitized.substring(0, 60);
};
const keepOnlySpecifiedChars = (str) => {
    return str.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚâêîôûÂÊÎÔÛãõÃÕçÇ!?.,;:\s]/g, "");
};
const convertTextToSpeechAndSaveToFile = (text, filename, subscriptionKey, serviceRegion, voice = "pt-BR-FabioNeural", audioToFormat = "mp3") => {
    return new Promise((resolve, reject) => {
        const speechConfig = microsoft_cognitiveservices_speech_sdk_1.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);
        speechConfig.speechSynthesisVoiceName = voice;
        const audioConfig = microsoft_cognitiveservices_speech_sdk_1.AudioConfig.fromAudioFileOutput(`${filename}.wav`);
        const synthesizer = new microsoft_cognitiveservices_speech_sdk_1.SpeechSynthesizer(speechConfig, audioConfig);
        synthesizer.speakTextAsync(text, result => {
            if (result) {
                convertWavToAnotherFormat(`${filename}.wav`, `${filename}.${audioToFormat}`, audioToFormat)
                    .then(output => {
                    resolve();
                })
                    .catch(error => {
                    console.error(error);
                    reject(error);
                });
            }
            else {
                reject(new Error("No result from synthesizer"));
            }
            synthesizer.close();
        }, error => {
            console.error(`Error: ${error}`);
            synthesizer.close();
            reject(error);
        });
    });
};
const convertWavToAnotherFormat = (inputPath, outputPath, toFormat) => {
    return new Promise((resolve, reject) => {
        (0, fluent_ffmpeg_1.default)()
            .input(inputPath)
            .toFormat(toFormat)
            .on("end", () => resolve(outputPath))
            .on("error", (err) => reject(new Error(`Error converting file: ${err.message}`)))
            .save(outputPath);
    });
};
const deleteFileSync = (path) => {
    try {
        fs_2.default.unlinkSync(path);
    }
    catch (error) {
        console.error("Erro ao deletar o arquivo:", error);
    }
};
const transferQueue = async (queueId, ticket, contact) => {
    await (0, UpdateTicketService_1.default)({
        ticketData: { queueId, userId: null, status: "pending" },
        ticketId: ticket.id,
        companyId: ticket.companyId
    });
};
const handleOpenAiFacebook = async (message, token, ticket, contact, mediaSent, ticketTraking) => {
    if (contact.disableBot) {
        return;
    }
    let { prompt } = await (0, ShowWhatsAppService_1.default)(token.id, ticket.companyId);
    if (!prompt && !(0, lodash_1.isNil)(ticket?.queue?.prompt)) {
        prompt = ticket?.queue?.prompt;
    }
    if (!prompt)
        return;
    const publicFolder = path_2.default.resolve(__dirname, "..", "..", "..", "public", `company${ticket.companyId}`);
    const connectionKey = `${token.id}_${ticket.companyId}`;
    if (!sessionsOpenAiByConnection.has(connectionKey)) {
        sessionsOpenAiByConnection.set(connectionKey, []);
    }
    let openai;
    const connectionSessions = sessionsOpenAiByConnection.get(connectionKey);
    const openAiIndex = connectionSessions.findIndex(s => s.id === ticket.id);
    if (openAiIndex === -1) {
        openai = new openai_1.default({ apiKey: prompt.apiKey });
        openai.id = ticket.id;
        connectionSessions.push(openai);
        console.log(`🤖 Nova sessão OpenAI criada para conexão ${connectionKey}, ticket ${ticket.id}`);
    }
    else {
        openai = connectionSessions[openAiIndex];
        console.log(`🔄 Reutilizando sessão OpenAI para conexão ${connectionKey}, ticket ${ticket.id}`);
    }
    const messages = await Message_1.default.findAll({
        where: { ticketId: ticket.id },
        order: [["createdAt", "ASC"]],
        limit: prompt.maxMessages
    });
    const promptSystem = `Nas respostas utilize o nome ${sanitizeName(contact.name || "Amigo(a)")} para identificar o cliente.\nSua resposta deve usar no máximo ${prompt.maxTokens}
     tokens e cuide para não truncar o final.\nSempre que possível, mencione o nome dele para ser mais personalizado o atendimento e mais educado. Quando a resposta requer uma transferência para o setor de atendimento, comece sua resposta com 'Ação: Transferir para o setor de atendimento'.\n
  ${prompt.prompt}\n`;
    let messagesOpenAi = [];
    if (message.text) {
        messagesOpenAi = [];
        messagesOpenAi.push({ role: "system", content: promptSystem });
        for (let i = 0; i < Math.min(prompt.maxMessages, messages.length); i++) {
            const msg = messages[i];
            if (msg.mediaType === "chat") {
                if (msg.fromMe) {
                    messagesOpenAi.push({ role: "assistant", content: msg.body });
                }
                else {
                    messagesOpenAi.push({ role: "user", content: msg.body });
                }
            }
        }
        const bodyMessage = message.text;
        messagesOpenAi.push({ role: "user", content: bodyMessage });
        const chat = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: messagesOpenAi,
            max_tokens: prompt.maxTokens,
            temperature: prompt.temperature
        });
        let response = chat.choices[0].message?.content;
        if (response?.includes("Ação: Transferir para o setor de atendimento")) {
            await transferQueue(prompt.queueId, ticket, contact);
            response = response
                .replace("Ação: Transferir para o setor de atendimento", "")
                .trim();
        }
        if (prompt.voice === "texto") {
            const sentMessage = await (0, graphAPI_1.sendText)(contact.number, response, token.facebookUserToken);
            if (sentMessage && !sentMessage.skipped) {
                await (0, exports.verifyMessageFace)(sentMessage, response, ticket, contact, true);
                console.log("✅ Mensagem Facebook enviada e registrada com sucesso");
            }
            else {
                console.log("⚠️ Mensagem Facebook foi pulada:", sentMessage?.reason);
            }
        }
        else {
            const fileNameWithOutExtension = `${ticket.id}_${Date.now()}`;
            convertTextToSpeechAndSaveToFile(keepOnlySpecifiedChars(response), `${publicFolder}/${fileNameWithOutExtension}`, prompt.voiceKey, prompt.voiceRegion, prompt.voice, "mp3").then(async () => {
                try {
                    const audioUrl = `${process.env.BACKEND_URL}/public/company${ticket.companyId}/${fileNameWithOutExtension}.mp3`;
                    const sentMessage = await (0, graphAPI_1.sendText)(contact.number, `🎵 Áudio: ${audioUrl}`, token.facebookUserToken);
                    await (0, exports.verifyMessageFace)(sentMessage, `🎵 Áudio: ${audioUrl}`, ticket, contact, true);
                    deleteFileSync(`${publicFolder}/${fileNameWithOutExtension}.mp3`);
                    deleteFileSync(`${publicFolder}/${fileNameWithOutExtension}.wav`);
                }
                catch (error) {
                    console.log(`Erro para responder com audio: ${error}`);
                }
            });
        }
    }
    messagesOpenAi = [];
};
const handleMessageIntegrationFacebook = async (message, token, queueIntegration, ticket) => {
    // REGRA PARA DESABILITAR O BOT PARA ALGUM CONTATO
    if (ticket.contact.disableBot) {
        return;
    }
    console.log("🔗 handleMessageIntegrationFacebook iniciado:", {
        integrationType: queueIntegration.type,
        integrationId: queueIntegration.id,
        ticketId: ticket.id
    });
    if (queueIntegration.type === "n8n" || queueIntegration.type === "webhook") {
        if (queueIntegration?.urlN8N) {
            console.log("🌐 Enviando para N8N/Webhook:", queueIntegration.urlN8N);
            const options = {
                method: "POST",
                url: queueIntegration?.urlN8N,
                headers: {
                    "Content-Type": "application/json"
                },
                json: {
                    // ✅ ADAPTAR ESTRUTURA PARA FACEBOOK
                    message: {
                        text: message.text,
                        mid: message.mid,
                        attachments: message.attachments
                    },
                    contact: {
                        id: ticket.contact.number,
                        name: ticket.contact.name,
                        number: ticket.contact.number
                    },
                    ticket: {
                        id: ticket.id,
                        status: ticket.status,
                        queueId: ticket.queueId
                    },
                    whatsapp: {
                        id: token.id,
                        name: token.name,
                        channel: "facebook"
                    }
                }
            };
            try {
                request(options, function (error, response) {
                    if (error) {
                        console.error("❌ Erro no N8N/Webhook:", error);
                        throw new Error(error);
                    }
                    else {
                        console.log("✅ Resposta N8N/Webhook:", response.body);
                    }
                });
            }
            catch (error) {
                console.error("❌ Erro ao enviar para N8N/Webhook:", error);
                throw new Error(error);
            }
        }
    }
    else if (queueIntegration.type === "typebot") {
        console.log("🤖 Iniciando integração Typebot");
        try {
            await (0, typebotListenerUniversal_1.default)({
                ticket,
                message: message,
                wbot: null,
                typebot: queueIntegration,
                platform: ticket.whatsapp?.channel === 'instagram' ? 'instagram' : 'facebook'
            });
            console.log("✅ Typebot processado com sucesso");
        }
        catch (error) {
            console.error("❌ Erro no Typebot:", error);
        }
    }
};
function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function sleep(time) {
    await timeout(time);
}
exports.sleep = sleep;
const handleMessage = async (whatsapp, messagingEvent, channel, companyId) => {
    try {
        // ✅ DETECTAR CANAL COM FALLBACKS
        const detectedChannel = channel || whatsapp.channel || "facebook";
        console.log("🚀 handleMessage started with:", {
            whatsappId: whatsapp.id,
            whatsappName: whatsapp.name,
            channel: detectedChannel,
            companyId,
            senderPsid: messagingEvent.sender?.id,
            messageText: messagingEvent.message?.text
        });
        if (messagingEvent.message) {
            let msgContact;
            const senderPsid = messagingEvent.sender.id;
            const recipientPsid = messagingEvent.recipient.id;
            const { message } = messagingEvent;
            const fromMe = message.is_echo;
            let bodyMessage = message.text;
            console.log("📝 Message details:", {
                senderPsid,
                recipientPsid,
                fromMe,
                bodyMessage,
                channel: detectedChannel
            });
            if (fromMe) {
                if (/\u200e/.test(bodyMessage))
                    return;
                try {
                    msgContact = await (0, graphAPI_1.profilePsid)(recipientPsid, whatsapp.facebookUserToken);
                }
                catch (error) {
                    console.log(`⚠️ Erro ao buscar perfil do destinatário:`, error.message);
                    const shortPsid = recipientPsid.slice(-6);
                    msgContact = {
                        id: recipientPsid,
                        name: `User ${shortPsid}`,
                        first_name: 'User',
                        last_name: shortPsid,
                        profile_pic: ''
                    };
                }
            }
            else {
                try {
                    msgContact = await (0, graphAPI_1.profilePsid)(senderPsid, whatsapp.facebookUserToken);
                }
                catch (error) {
                    console.log(`⚠️ Erro ao buscar perfil do remetente:`, error.message);
                    const shortPsid = senderPsid.slice(-6);
                    msgContact = {
                        id: senderPsid,
                        name: `User ${shortPsid}`,
                        first_name: 'User',
                        last_name: shortPsid,
                        profile_pic: ''
                    };
                }
            }
            const contact = await verifyContact(msgContact, whatsapp, companyId);
            let getSession = await Whatsapp_1.default.findOne({
                where: {
                    facebookPageUserId: whatsapp.facebookPageUserId
                },
                include: [
                    {
                        model: Queue_1.default,
                        as: "queues",
                        attributes: ["id", "name", "color", "greetingMessage", "integrationId", "promptId"],
                        through: { attributes: [] }
                    }
                ]
            });
            if (!getSession.queues) {
                console.log("⚠️ Conexão sem filas associadas, inicializando array vazio");
                getSession.queues = [];
            }
            console.log("📋 Filas da conexão carregadas:", {
                connectionId: getSession.id,
                queuesCount: getSession.queues.length,
                queues: getSession.queues.map(q => ({ id: q.id, name: q.name })),
                connectionPromptId: getSession.promptId
            });
            const settings = await Setting_1.default.findOne({
                where: { companyId }
            });
            console.log("⚙️ Settings loaded");
            let ticket = await Ticket_1.default.findOne({
                where: {
                    contactId: contact.id,
                    companyId: companyId,
                    whatsappId: getSession.id,
                    status: {
                        [sequelize_1.Op.in]: ["open", "pending", "closed"]
                    }
                },
                include: [
                    {
                        model: Contact_1.default,
                        as: "contact",
                    },
                    {
                        model: Queue_1.default,
                        as: "queue",
                    },
                    {
                        model: User_1.default,
                        as: "user",
                    },
                    {
                        model: Whatsapp_1.default,
                        as: "whatsapp",
                    },
                ],
                order: [["updatedAt", "DESC"]]
            });
            if (ticket) {
                console.log("🎫 Ticket encontrado - verificando reutilização:", {
                    ticketId: ticket.id,
                    status: ticket.status,
                    currentUserId: ticket.userId,
                    hasPrompt: !!getSession.promptId,
                    hasIntegration: !!getSession.integrationId
                });
                if (ticket.status === "closed") {
                    const timeSinceClose = new Date().getTime() - new Date(ticket.updatedAt).getTime();
                    const maxTimeToReopen = 24 * 60 * 60 * 1000;
                    if (timeSinceClose < maxTimeToReopen) {
                        // ✅ REABRIR E LIMPAR USUÁRIO/FILA
                        await ticket.update({
                            status: "pending",
                            unreadMessages: 0,
                            userId: null,
                            queueId: null
                        });
                        console.log("🔄 Ticket reaberto e limpo:", {
                            ticketId: ticket.id,
                            newStatus: "pending",
                            userId: null,
                            queueId: null
                        });
                        const io = (0, socket_1.getIO)();
                        io.to(ticket.status)
                            .to(`company-${companyId}-${ticket.status}`)
                            .emit(`company-${companyId}-ticket`, {
                            action: "update",
                            ticket,
                        });
                    }
                    else {
                        ticket = null;
                    }
                }
                else if (ticket.status === "open" || ticket.status === "pending") {
                    // ✅ FIX PRINCIPAL: SE TEM PROMPT/INTEGRAÇÃO NA CONEXÃO E TICKET TEM USUÁRIO, LIMPAR USUÁRIO
                    const shouldResetForAI = !fromMe && ((!(0, lodash_1.isNil)(getSession.promptId) && !ticket.useIntegration) ||
                        (!(0, lodash_1.isNil)(getSession.integrationId) && !ticket.useIntegration));
                    if (shouldResetForAI && ticket.userId) {
                        console.log("🤖 Limpando userId para permitir IA/Integração da conexão:", {
                            ticketId: ticket.id,
                            previousUserId: ticket.userId,
                            connectionPromptId: getSession.promptId,
                            connectionIntegrationId: getSession.integrationId,
                            ticketUseIntegration: ticket.useIntegration
                        });
                        await ticket.update({
                            userId: null,
                            status: "pending" // ✅ GARANTIR QUE FICA PENDING PARA IA PROCESSAR
                        });
                        // ✅ EMITIR EVENTO DE ATUALIZAÇÃO
                        const io = (0, socket_1.getIO)();
                        io.to(`company-${companyId}-mainchannel`)
                            .to(`company-${companyId}-pending`)
                            .emit(`company-${companyId}-ticket`, {
                            action: "update",
                            ticket: await ticket.reload({
                                include: [
                                    { model: Contact_1.default, as: "contact" },
                                    { model: Queue_1.default, as: "queue" },
                                    { model: User_1.default, as: "user" },
                                    { model: Whatsapp_1.default, as: "whatsapp" }
                                ]
                            })
                        });
                    }
                    console.log("✅ Reutilizando ticket existente:", {
                        ticketId: ticket.id,
                        status: ticket.status,
                        userId: ticket.userId,
                        readyForAI: !ticket.userId && !ticket.useIntegration
                    });
                }
            }
            if (!ticket) {
                try {
                    ticket = await (0, CreateTicketService_1.default)({
                        contactId: contact.id,
                        status: "pending",
                        companyId,
                        whatsappId: getSession.id,
                        channel: detectedChannel
                    });
                    console.log("✨ Novo ticket criado:", {
                        id: ticket.id,
                        status: ticket.status,
                        contactId: contact.id,
                        channel: detectedChannel
                    });
                    const io = (0, socket_1.getIO)();
                    io.to(`company-${companyId}-mainchannel`)
                        .to(`company-${companyId}-pending`)
                        .to("pending")
                        .emit(`company-${companyId}-ticket`, {
                        action: "create",
                        ticket,
                        ticketId: ticket.id
                    });
                }
                catch (createError) {
                    console.error("❌ Erro ao criar ticket:", createError);
                    ticket = await Ticket_1.default.findOne({
                        where: {
                            contactId: contact.id,
                            companyId: companyId
                        },
                        order: [["updatedAt", "DESC"]]
                    });
                    if (ticket) {
                        await ticket.update({
                            status: "pending",
                            whatsappId: getSession.id
                        });
                    }
                    else {
                        throw new Error(`Não foi possível criar ou encontrar ticket para contato ${contact.id}: ${createError.message}`);
                    }
                }
            }
            // ✅ RECARREGAR TICKET COM TODAS AS ASSOCIAÇÕES
            await ticket.reload({
                include: [
                    {
                        model: Contact_1.default,
                        as: "contact",
                    },
                    {
                        model: Queue_1.default,
                        as: "queue",
                    },
                    {
                        model: User_1.default,
                        as: "user",
                    },
                    {
                        model: Whatsapp_1.default,
                        as: "whatsapp",
                    },
                ]
            });
            // ✅ VERIFICAR HORÁRIO DE FUNCIONAMENTO
            try {
                const schedule = await (0, VerifyCurrentSchedule_1.default)(ticket.companyId);
                if (settings?.scheduleType === "company" &&
                    !ticket?.user &&
                    !fromMe &&
                    !schedule.inActivity) {
                    const body = schedule.message || "Estamos fora do horário de atendimento.";
                    const sentMessage = await (0, sendFacebookMessage_1.default)({
                        ticket,
                        body
                    });
                    return { success: true };
                }
            }
            catch (scheduleError) {
                console.log("⚠️ Erro ao verificar horário:", scheduleError);
            }
            if (message.attachments && message.attachments.length > 0) {
                console.log("📎 Anexo detectado:", {
                    type: message.attachments[0].type,
                    hasUrl: !!message.attachments[0].payload?.url
                });
                // ✅ PROCESSAR COMO MÍDIA (incluindo áudio, imagem, vídeo, documento)
                await (0, exports.verifyMessageMedia)(message, ticket, contact, fromMe, detectedChannel);
            }
            else {
                // ✅ MENSAGEM DE TEXTO
                await (0, exports.verifyMessageFace)(message, bodyMessage, ticket, contact, fromMe, detectedChannel);
            }
            // ✅ SE É MENSAGEM NOSSA, NÃO PROCESSAR LÓGICA DO BOT
            if (fromMe) {
                return { success: true };
            }
            // ✅ VERIFICAÇÕES DE SEGURANÇA
            if (ticket.contact.disableBot) {
                console.log("🚫 Bot desabilitado para este contato");
                return { success: true };
            }
            // ✅ TRACKING DE TICKET
            const ticketTraking = await (0, FindOrCreateATicketTrakingService_1.default)({
                ticketId: ticket.id,
                companyId,
                whatsappId: getSession.id
            });
            try {
                if (settings?.userRating && ticket?.user) {
                    await (0, wbotMessageListener_1.handleRating)(message, ticket, ticketTraking);
                }
            }
            catch (ratingError) {
                console.error("❌ Erro no rating:", ratingError);
            }
            const queuesLength = getSession.queues ? getSession.queues.length : 0;
            // ✅ LOG DE DEBUG PARA VERIFICAÇÃO
            console.log("🔍 Verificação de condições para IA/Integração:", {
                ticketId: ticket.id,
                imported: ticket.imported,
                isGroup: ticket.isGroup,
                userId: ticket.userId,
                useIntegration: ticket.useIntegration,
                connectionPromptId: getSession.promptId,
                connectionIntegrationId: getSession.integrationId,
                ticketPromptId: ticket.promptId,
                ticketIntegrationId: ticket.integrationId,
                queuesLength
            });
            // ✅ IA DA CONEXÃO (PRIORIDADE MÁXIMA)
            if (!ticket.imported &&
                !ticket.isGroup &&
                !ticket.userId &&
                !(0, lodash_1.isNil)(getSession.promptId)) {
                // ✅ VERIFICAR SE DEVE PROCESSAR A IA
                const shouldProcessAI = !ticket.useIntegration ||
                    !ticket.promptId ||
                    Number(ticket.promptId) === Number(getSession.promptId);
                console.log("🤖 Verificação da IA da conexão:", {
                    ticketId: ticket.id,
                    connectionPromptId: getSession.promptId,
                    ticketPromptId: ticket.promptId,
                    ticketUseIntegration: ticket.useIntegration,
                    shouldProcessAI,
                    comparison: `ticket:${ticket.promptId} === connection:${getSession.promptId} = ${Number(ticket.promptId) === Number(getSession.promptId)}`
                });
                if (shouldProcessAI) {
                    console.log("🤖 EXECUTANDO OpenAI na conexão Facebook:", {
                        ticketId: ticket.id,
                        promptId: getSession.promptId,
                        connectionId: getSession.id
                    });
                    try {
                        await handleOpenAiFacebook(message, getSession, ticket, contact, undefined, ticketTraking);
                        // ✅ ATUALIZAR TICKET COM CONFIGURAÇÕES DA IA
                        await ticket.update({
                            useIntegration: true,
                            promptId: getSession.promptId,
                            integrationId: null // ✅ GARANTIR QUE INTEGRAÇÃO FICA NULL
                        });
                        console.log("✅ IA da conexão executada com sucesso");
                        return { success: true };
                    }
                    catch (aiError) {
                        console.error("❌ Erro na IA da conexão:", aiError);
                    }
                }
            }
            // ✅ INTEGRAÇÃO DA CONEXÃO
            if (!ticket.imported &&
                !ticket.isGroup &&
                !ticket.userId &&
                !(0, lodash_1.isNil)(getSession.integrationId) // ✅ Esta condição já garante que só executa se tiver integração
            ) {
                // ✅ VERIFICAR SE DEVE PROCESSAR A INTEGRAÇÃO
                const shouldProcessIntegration = !ticket.useIntegration ||
                    !ticket.integrationId ||
                    Number(ticket.integrationId) === Number(getSession.integrationId);
                console.log("🔗 Verificação da integração da conexão:", {
                    ticketId: ticket.id,
                    connectionIntegrationId: getSession.integrationId,
                    ticketIntegrationId: ticket.integrationId,
                    ticketUseIntegration: ticket.useIntegration,
                    shouldProcessIntegration
                });
                if (shouldProcessIntegration) {
                    console.log("🔗 EXECUTANDO integração na conexão Facebook:", {
                        ticketId: ticket.id,
                        integrationId: getSession.integrationId,
                        connectionId: getSession.id
                    });
                    try {
                        const integrations = await (0, ShowQueueIntegrationService_1.default)(getSession.integrationId, companyId);
                        await handleMessageIntegrationFacebook(message, getSession, integrations, ticket);
                        // ✅ ATUALIZAR TICKET COM CONFIGURAÇÕES DA INTEGRAÇÃO
                        await ticket.update({
                            useIntegration: true,
                            integrationId: integrations.id,
                            promptId: null // ✅ LIMPAR PROMPT SE TEM INTEGRAÇÃO
                        });
                        console.log("✅ Integração da conexão executada com sucesso");
                        return { success: true };
                    }
                    catch (integrationError) {
                        console.error("❌ Erro na integração da conexão:", integrationError);
                    }
                }
            }
            // ✅ IA/INTEGRAÇÃO NA FILA
            if (!ticket.imported &&
                !ticket.isGroup &&
                !ticket.userId &&
                !(0, lodash_1.isNil)(ticket.promptId) &&
                ticket.useIntegration &&
                ticket.queueId) {
                console.log("🤖 Executando OpenAI na fila");
                await handleOpenAiFacebook(message, getSession, ticket, contact, undefined, ticketTraking);
                return { success: true };
            }
            if (!ticket.imported &&
                !ticket.isGroup &&
                !ticket.userId &&
                ticket.integrationId &&
                ticket.useIntegration &&
                ticket.queue) {
                console.log("🔗 Executando integração na fila");
                const integrations = await (0, ShowQueueIntegrationService_1.default)(ticket.integrationId, companyId);
                await handleMessageIntegrationFacebook(message, getSession, integrations, ticket);
                return { success: true };
            }
            // ✅ VERIFICAR FILAS APENAS SE EXISTIR ALGUMA
            if (!ticket.imported &&
                !ticket.queue &&
                !ticket.isGroup &&
                !ticket.userId &&
                queuesLength >= 1 &&
                !ticket.useIntegration) {
                console.log("📋 Verificando filas disponíveis");
                await verifyQueue(getSession, message, ticket, contact, ticketTraking);
                if (ticketTraking.chatbotAt === null) {
                    await ticketTraking.update({
                        chatbotAt: (0, moment_1.default)().toDate(),
                    });
                }
                return { success: true };
            }
            const dontReadTheFirstQuestion = ticket.queue === null;
            await ticket.reload();
            // ✅ CHATBOT DAS FILAS
            if (queuesLength == 1 && ticket.queue) {
                if (ticket.chatbot && !fromMe) {
                    console.log("🤖 Executando chatbot da fila única");
                    await handleChartbotFacebook(ticket, message, getSession, dontReadTheFirstQuestion, ticketTraking);
                    return { success: true };
                }
            }
            if (queuesLength > 1 && ticket.queue) {
                if (ticket.chatbot && !fromMe) {
                    console.log("🤖 Executando chatbot de múltiplas filas");
                    await handleChartbotFacebook(ticket, message, getSession, dontReadTheFirstQuestion, ticketTraking);
                    return { success: true };
                }
            }
            // ✅ SE CHEGOU ATÉ AQUI E NÃO TEM FILAS, APENAS REGISTRAR A MENSAGEM
            if (queuesLength === 0) {
                console.log("📝 Conexão Facebook sem filas - apenas registrando mensagem");
                return { success: true };
            }
        } // ✅ FECHAR O if (messagingEvent.message)
        return { success: true };
    }
    catch (error) {
        console.error("❌ Error in handleMessage:", error);
        throw new Error(`Error: ${error.message}`);
    }
}; // ✅ FECHAR A FUNÇÃO handleMessage
exports.handleMessage = handleMessage;
// ✅ CORRIGIR verifyQueue PARA EVITAR queueId=0
const verifyQueue = async (getSession, msg, ticket, contact, ticketTraking) => {
    console.log("🔍 verifyQueue iniciado:", {
        ticketId: ticket.id,
        messageText: msg.text,
        hasQueueId: !!ticket.queueId
    });
    // ✅ OBTER FILAS COM VERIFICAÇÃO SEGURA
    let queues = [];
    let greetingMessage = "";
    let maxUseBotQueues = 3;
    let timeUseBotQueues = 0;
    try {
        const whatsappData = await (0, ShowWhatsAppService_1.default)(getSession.id, ticket.companyId);
        queues = whatsappData.queues || [];
        greetingMessage = whatsappData.greetingMessage || "Bem-vindo!";
        maxUseBotQueues = whatsappData.maxUseBotQueues || 3;
        timeUseBotQueues = Number(whatsappData.timeUseBotQueues) || 0;
    }
    catch (error) {
        console.error("❌ Erro ao carregar dados do WhatsApp:", error);
        // ✅ FALLBACK: BUSCAR FILAS DIRETAMENTE DA CONEXÃO
        if (getSession.queues && Array.isArray(getSession.queues)) {
            queues = getSession.queues;
        }
    }
    console.log("📋 Filas disponíveis:", queues.map(q => ({ id: q.id, name: q.name })));
    // ✅ SE NÃO TEM FILAS, RETORNAR
    if (!queues || queues.length === 0) {
        console.log("⚠️ Nenhuma fila disponível");
        return;
    }
    if (queues.length === 1) {
        const firstQueue = (0, lodash_1.head)(queues);
        let chatbot = false;
        if (firstQueue && 'chatbots' in firstQueue) {
            const queueWithChatbots = firstQueue;
            chatbot = queueWithChatbots.chatbots && queueWithChatbots.chatbots.length > 0;
        }
        // ✅ INTEGRAÇÃO N8N/WEBHOOK/TYPEBOT NA FILA ÚNICA (PRIORIDADE MÁXIMA)
        if (!(0, lodash_1.isNil)(queues[0]?.integrationId)) {
            console.log("🔗 Iniciando integração da fila única:", queues[0].integrationId);
            try {
                const integrations = await (0, ShowQueueIntegrationService_1.default)(queues[0].integrationId, ticket.companyId);
                await handleMessageIntegrationFacebook(msg, getSession, integrations, ticket);
                // ✅ FIX: VERIFICAR SE A FILA EXISTE ANTES DE DEFINIR
                const queueExists = await Queue_1.default.findByPk(queues[0].id);
                if (queueExists) {
                    await ticket.update({
                        queueId: queues[0].id,
                        useIntegration: true,
                        integrationId: integrations.id
                    });
                }
                else {
                    console.error(`❌ Fila ${queues[0].id} não existe na tabela Queues`);
                    await ticket.update({
                        queueId: null,
                        useIntegration: true,
                        integrationId: integrations.id
                    });
                }
                return; // ✅ PARAR AQUI SE TEM INTEGRAÇÃO
            }
            catch (error) {
                console.error("❌ Erro ao buscar integração da fila única:", error);
            }
        }
        // ✅ INTEGRAÇÃO OPENAI NA FILA ÚNICA (igual ao WhatsApp)
        if (!(0, lodash_1.isNil)(queues[0]?.promptId)) {
            console.log("🤖 Iniciando OpenAI da fila única:", queues[0].promptId);
            await handleOpenAiFacebook(msg, getSession, ticket, contact, undefined, ticketTraking);
            // ✅ FIX: VERIFICAR SE A FILA EXISTE ANTES DE DEFINIR
            const queueExists = await Queue_1.default.findByPk(queues[0].id);
            if (queueExists) {
                await ticket.update({
                    queueId: queues[0].id,
                    useIntegration: true,
                    promptId: queues[0]?.promptId
                });
            }
            else {
                console.error(`❌ Fila ${queues[0].id} não existe na tabela Queues`);
                await ticket.update({
                    queueId: null,
                    useIntegration: true,
                    promptId: queues[0]?.promptId
                });
            }
            return; // ✅ PARAR AQUI SE TEM OPENAI
        }
        // ✅ FIX: VERIFICAR SE A FILA EXISTE ANTES DE DEFINIR
        const queueExists = await Queue_1.default.findByPk(firstQueue.id);
        if (queueExists) {
            await (0, UpdateTicketService_1.default)({
                ticketData: { queueId: queues[0].id, chatbot },
                ticketId: ticket.id,
                companyId: ticket.companyId
            });
        }
        else {
            console.error(`❌ Fila ${firstQueue.id} não existe na tabela Queues`);
            return; // ✅ NÃO CONTINUAR SE FILA NÃO EXISTE
        }
        // ✅ BUSCAR A FILA COMPLETA COM OPÇÕES PARA EXIBIR O MENU
        const queueWithOptions = await Queue_1.default.findByPk(firstQueue.id, {
            include: [
                {
                    model: QueueOption_1.default,
                    as: "options",
                    where: { parentId: null },
                    order: [["option", "ASC"]],
                    required: false
                }
            ]
        });
        // ✅ SE TEM OPÇÕES, EXIBIR MENU
        if (queueWithOptions?.options && queueWithOptions.options.length > 0) {
            let optionsText = "";
            queueWithOptions.options.forEach((option, index) => {
                optionsText += `[${option.option}] - ${option.title}\n`;
            });
            const menuBody = `${queueWithOptions.greetingMessage || greetingMessage}\n\n${optionsText}\n[0] - Menu anterior\n[#] - Menu inicial`;
            const sentMessage = await (0, sendFacebookMessage_1.default)({
                ticket,
                body: menuBody
            });
            console.log("🤖 Enviado menu de opções da fila para Facebook");
            return;
        }
        // ✅ SE NÃO TEM OPÇÕES, ENVIAR APENAS SAUDAÇÃO
        if (queueWithOptions?.greetingMessage) {
            const sentMessage = await (0, sendFacebookMessage_1.default)({
                ticket,
                body: queueWithOptions.greetingMessage
            });
            console.log("👋 Enviada saudação da fila");
        }
        return;
    }
    // REGRA PARA DESABILITAR O BOT PARA ALGUM CONTATO
    if (contact.disableBot) {
        console.log("🚫 Bot desabilitado para este contato");
        return;
    }
    let selectedOption = "";
    if (ticket.status !== "lgpd") {
        selectedOption = msg.text || "";
        console.log("📝 Opção selecionada pelo usuário:", selectedOption);
    }
    else {
        const ticketWithLgpd = ticket;
        if (!(0, lodash_1.isNil)(ticketWithLgpd.lgpdAcceptedAt)) {
            await ticket.update({
                status: "pending"
            });
        }
        await ticket.reload();
    }
    // ✅ TRATAMENTO ESPECIAL PARA NAVEGAÇÃO DE MENUS (PRIORIDADE MÁXIMA)
    if (selectedOption === "#") {
        console.log("🏠 Usuário solicitou menu inicial");
        // Limpar fila do ticket para voltar ao menu inicial
        await (0, UpdateTicketService_1.default)({
            ticketData: { queueId: null, useIntegration: false, promptId: null },
            ticketId: ticket.id,
            companyId: ticket.companyId
        });
        // Recarregar ticket para ter dados atualizados
        await ticket.reload();
        // Mostrar menu inicial de filas
        let options = "";
        queues.forEach((queue, index) => {
            options += `[${index + 1}] - ${queue.name}\n`;
        });
        const body = `${greetingMessage}\n\n${options}`;
        const sentMessage = await (0, sendFacebookMessage_1.default)({
            ticket,
            body: body
        });
        console.log("🏠 Retornado ao menu inicial");
        return;
    }
    if (selectedOption === "0") {
        console.log("⬅️ Usuário solicitou menu anterior");
        // Se já está no menu principal (sem fila), mostrar mensagem
        if (!ticket.queueId) {
            const body = "📍 Você já está no menu principal!";
            const sentMessage = await (0, sendFacebookMessage_1.default)({
                ticket,
                body: body
            });
            await sleep(1000);
            // Mostrar menu principal novamente
            let options = "";
            queues.forEach((queue, index) => {
                options += `[${index + 1}] - ${queue.name}\n`;
            });
            const menuBody = `${greetingMessage}\n\n${options}`;
            const sentMainMenu = await (0, sendFacebookMessage_1.default)({
                ticket,
                body: menuBody
            });
            console.log("📍 Já no menu principal - reenviado");
            return;
        }
        // Se está em uma fila, voltar para o menu principal
        await (0, UpdateTicketService_1.default)({
            ticketData: { queueId: null, useIntegration: false, promptId: null },
            ticketId: ticket.id,
            companyId: ticket.companyId
        });
        // Recarregar ticket
        await ticket.reload();
        // Mostrar menu principal
        let options = "";
        queues.forEach((queue, index) => {
            options += `[${index + 1}] - ${queue.name}\n`;
        });
        const body = `${greetingMessage}\n\n${options}`;
        const sentMessage = await (0, sendFacebookMessage_1.default)({
            ticket,
            body: body
        });
        console.log("⬅️ Retornado ao menu anterior (principal)");
        return;
    }
    // Verificar se a seleção é um número válido
    const isValidSelection = selectedOption && /^\d+$/.test(selectedOption.trim());
    if (isValidSelection) {
        const queueIndex = parseInt(selectedOption.trim(), 10) - 1;
        const choosenQueue = queues[queueIndex];
        console.log("🎯 Tentativa de seleção de fila:", {
            selectedOption,
            queueIndex,
            queueFound: !!choosenQueue,
            queueName: choosenQueue?.name
        });
        if (choosenQueue) {
            console.log("✅ Fila selecionada com sucesso:", choosenQueue.name);
            // ✅ FIX: VERIFICAR SE A FILA EXISTE NO BANCO ANTES DE USAR
            const queueExists = await Queue_1.default.findByPk(choosenQueue.id);
            if (!queueExists) {
                console.error(`❌ Fila selecionada ${choosenQueue.id} não existe na tabela Queues`);
                const errorBody = `❌ Fila selecionada não está disponível. Escolha uma das opções válidas.`;
                await (0, sendFacebookMessage_1.default)({
                    ticket,
                    body: errorBody
                });
                return;
            }
            if (!(0, lodash_1.isNil)(choosenQueue?.integrationId)) {
                console.log("🔗 Iniciando integração da fila selecionada:", choosenQueue.integrationId);
                try {
                    const integrations = await (0, ShowQueueIntegrationService_1.default)(choosenQueue.integrationId, ticket.companyId);
                    await handleMessageIntegrationFacebook(msg, getSession, integrations, ticket);
                    await ticket.update({
                        queueId: choosenQueue.id,
                        useIntegration: true,
                        integrationId: integrations.id
                    });
                    return; // ✅ PARAR AQUI SE TEM INTEGRAÇÃO
                }
                catch (error) {
                    console.error("❌ Erro ao buscar integração da fila selecionada:", error);
                }
            }
            if (!(0, lodash_1.isNil)(choosenQueue?.promptId)) {
                console.log("🤖 Iniciando OpenAI da fila selecionada:", choosenQueue.promptId);
                await handleOpenAiFacebook(msg, getSession, ticket, contact, undefined, ticketTraking);
                await ticket.update({
                    queueId: choosenQueue.id,
                    useIntegration: true,
                    promptId: choosenQueue?.promptId
                });
                return; // ✅ PARAR AQUI SE TEM OPENAI
            }
            // ✅ ATUALIZAR TICKET COM A FILA SELECIONADA (VERIFICADA)
            await (0, UpdateTicketService_1.default)({
                ticketData: { queueId: choosenQueue.id },
                ticketId: ticket.id,
                companyId: ticket.companyId
            });
            // ✅ BUSCAR A FILA COMPLETA COM OPÇÕES DO BANCO
            const queueWithOptions = await Queue_1.default.findByPk(choosenQueue.id, {
                include: [
                    {
                        model: QueueOption_1.default,
                        as: "options",
                        where: { parentId: null },
                        order: [["option", "ASC"]],
                        required: false
                    }
                ]
            });
            console.log("🔍 Fila carregada com opções:", {
                queueId: queueWithOptions?.id,
                optionsCount: queueWithOptions?.options?.length || 0
            });
            // ✅ SE TEM OPÇÕES DE CHATBOT, EXIBIR MENU
            if (queueWithOptions?.options && queueWithOptions.options.length > 0) {
                let optionsText = "";
                queueWithOptions.options.forEach((option, index) => {
                    optionsText += `[${option.option}] - ${option.title}\n`;
                });
                // ✅ MENSAGEM FORMATADA PARA FACEBOOK
                const menuBody = `${queueWithOptions.greetingMessage || "Escolha uma opção:"}\n\n${optionsText}\n[0] - Menu anterior\n[#] - Menu inicial`;
                const sentMessage = await (0, sendFacebookMessage_1.default)({
                    ticket,
                    body: menuBody
                });
                console.log("🤖 Enviado menu de opções da fila para Facebook");
                return;
            }
            // ✅ SE NÃO TEM OPÇÕES, ENVIAR APENAS SAUDAÇÃO
            const body = queueWithOptions?.greetingMessage || `Bem-vindo ao ${choosenQueue.name}`;
            const sentMessage = await (0, sendFacebookMessage_1.default)({
                ticket,
                body: body
            });
            console.log("📝 Enviada mensagem de boas-vindas da fila");
            return;
        }
        else {
            // ✅ SÓ ENVIAR MENSAGEM DE ERRO SE NÃO ATINGIU LIMITE
            if (!maxUseBotQueues || !ticket.amountUsedBotQueues || ticket.amountUsedBotQueues < maxUseBotQueues) {
                // Enviar mensagem de erro e mostrar opções novamente
                await sleep(1000);
                let options = "";
                queues.forEach((queue, index) => {
                    options += `[${index + 1}] - ${queue.name}\n`;
                });
                const errorBody = `❌ Opção inválida. Por favor, escolha uma das opções abaixo:\n\n${greetingMessage}\n\n${options}`;
                const sentMessage = await (0, sendFacebookMessage_1.default)({
                    ticket,
                    body: errorBody
                });
                // Atualizar contagem de uso do bot
                await (0, UpdateTicketService_1.default)({
                    ticketData: { amountUsedBotQueues: (ticket.amountUsedBotQueues || 0) + 1 },
                    ticketId: ticket.id,
                    companyId: ticket.companyId
                });
                console.log("📤 Reenviado menu com mensagem de erro");
            }
            else {
                console.log("🚫 Limite de mensagens do bot atingido - não enviando mais mensagens");
            }
            return;
        }
    }
    else if (ticket.amountUsedBotQueues > 0) {
        if (!maxUseBotQueues || ticket.amountUsedBotQueues < maxUseBotQueues) {
            let options = "";
            queues.forEach((queue, index) => {
                options += `[${index + 1}] - ${queue.name}\n`;
            });
            const helpBody = `💡 Por favor, digite apenas o *número* da opção desejada:\n\n${greetingMessage}\n\n${options}`;
            const sentMessage = await (0, sendFacebookMessage_1.default)({
                ticket,
                body: helpBody
            });
            await (0, UpdateTicketService_1.default)({
                ticketData: { amountUsedBotQueues: (ticket.amountUsedBotQueues || 0) + 1 },
                ticketId: ticket.id,
                companyId: ticket.companyId
            });
            console.log("📤 Reenviado menu com instrução de ajuda");
        }
        else {
            console.log("🚫 Limite de mensagens do bot atingido - parando interação");
        }
        return;
    }
    else {
        // Primeira interação - mostrar menu inicial
        console.log("🎬 Primeira interação - mostrando menu inicial");
        let options = "";
        queues.forEach((queue, index) => {
            options += `[${index + 1}] - ${queue.name}\n`;
        });
        const body = `${greetingMessage}\n\n${options}`;
        const sentMessage = await (0, sendFacebookMessage_1.default)({
            ticket,
            body: body
        });
        await (0, UpdateTicketService_1.default)({
            ticketData: { amountUsedBotQueues: 1 },
            ticketId: ticket.id,
            companyId: ticket.companyId
        });
        console.log("📤 Menu inicial enviado");
    }
};
const handleChartbotFacebook = async (ticket, msg, token, dontReadTheFirstQuestion = false, ticketTraking) => {
    const queue = await Queue_1.default.findByPk(ticket.queueId, {
        include: [
            {
                model: QueueOption_1.default,
                as: "options",
                where: { parentId: null },
                order: [
                    ["option", "ASC"],
                    ["createdAt", "ASC"],
                ],
            },
        ],
    });
    const messageBody = msg.text;
    if (messageBody == "#") {
        // voltar para o menu inicial
        await ticket.update({ queueOptionId: null, chatbot: false, queueId: null });
        await verifyQueue(token, msg, ticket, ticket.contact, ticketTraking);
        return;
    }
    // voltar para o menu anterior
    if (!(0, lodash_1.isNil)(queue) && !(0, lodash_1.isNil)(ticket.queueOptionId) && messageBody == "0") {
        const option = await QueueOption_1.default.findByPk(ticket.queueOptionId);
        // ✅ FIX: Garantir que parentId seja number ou null
        const parentId = option?.parentId ? Number(option.parentId) : null;
        await ticket.update({ queueOptionId: parentId });
    }
    else if (!(0, lodash_1.isNil)(queue) && !(0, lodash_1.isNil)(ticket.queueOptionId)) {
        const count = await QueueOption_1.default.count({ where: { parentId: ticket.queueOptionId } });
        let option = {};
        if (count == 1) {
            option = await QueueOption_1.default.findOne({ where: { parentId: ticket.queueOptionId } });
        }
        else {
            option = await QueueOption_1.default.findOne({
                where: {
                    option: messageBody || "",
                    parentId: ticket.queueOptionId,
                },
            });
        }
        if (option) {
            // ✅ FIX: Garantir que option.id seja number
            await ticket.update({ queueOptionId: Number(option.id) });
        }
    }
    else if (!(0, lodash_1.isNil)(queue) && (0, lodash_1.isNil)(ticket.queueOptionId) && !dontReadTheFirstQuestion) {
        const option = queue?.options.find((o) => o.option == messageBody);
        if (option) {
            // ✅ FIX: Garantir que option.id seja number
            await ticket.update({ queueOptionId: Number(option.id) });
        }
    }
    await ticket.reload();
    if (!(0, lodash_1.isNil)(queue) && (0, lodash_1.isNil)(ticket.queueOptionId)) {
        const queueOptions = await QueueOption_1.default.findAll({
            where: { queueId: ticket.queueId, parentId: null },
            order: [
                ["option", "ASC"],
                ["createdAt", "ASC"],
            ],
        });
        let options = "";
        queueOptions.forEach((option, i) => {
            options += `*[ ${option.option} ]* - ${option.title}\n`;
        });
        options += `\n*[ 0 ]* - Menu anterior`;
        options += `\n*[ # ]* - Menu inicial`;
        const textMessage = {
            text: (0, Mustache_1.default)(`\u200e${queue.greetingMessage}\n\n${options}`, ticket.contact)
        };
        const sentMessage = await (0, sendFacebookMessage_1.default)({
            ticket,
            body: textMessage.text
        });
    }
    else if (!(0, lodash_1.isNil)(queue) && !(0, lodash_1.isNil)(ticket.queueOptionId)) {
        const currentOption = await QueueOption_1.default.findByPk(ticket.queueOptionId);
        const queueOptions = await QueueOption_1.default.findAll({
            where: { parentId: ticket.queueOptionId },
            order: [
                ["option", "ASC"],
                ["createdAt", "ASC"],
            ],
        });
        if (currentOption?.closeTicket) {
            const sentMessage = await (0, sendFacebookMessage_1.default)({
                ticket,
                body: (0, Mustache_1.default)(`\u200e${currentOption.message}`, ticket.contact)
            });
            await (0, UpdateTicketService_1.default)({
                ticketData: { queueOptionId: null, chatbot: false, status: "closed" },
                ticketId: ticket.id,
                companyId: ticket.companyId,
            });
        }
        else if (currentOption?.forwardQueueId) {
            const sentMessage = await (0, sendFacebookMessage_1.default)({
                ticket,
                body: (0, Mustache_1.default)(`\u200e${currentOption.message}`, ticket.contact)
            });
            // ✅ FIX: Garantir que forwardQueueId seja number
            const forwardQueueId = Number(currentOption.forwardQueueId);
            await (0, UpdateTicketService_1.default)({
                ticketData: {
                    queueOptionId: null,
                    queueId: forwardQueueId,
                    chatbot: false,
                    status: "pending"
                },
                ticketId: ticket.id,
                companyId: ticket.companyId,
            });
        }
        else if (queueOptions.length > 0) {
            let options = "";
            queueOptions.forEach((option, i) => {
                options += `*[ ${option.option} ]* - ${option.title}\n`;
            });
            options += `\n*[ 0 ]* - Menu anterior`;
            options += `\n*[ # ]* - Menu inicial`;
            const textMessage = (0, Mustache_1.default)(`\u200e${currentOption?.message}\n\n${options}`, ticket.contact);
            const sentMessage = await (0, sendFacebookMessage_1.default)({
                ticket,
                body: textMessage
            });
        }
        else {
            // ✅ ADICIONAR: SE NÃO TEM MAIS OPÇÕES, FINALIZAR CHATBOT
            const finalMessage = currentOption?.message || "Obrigado pelo contato!";
            const sentMessage = await (0, sendFacebookMessage_1.default)({
                ticket,
                body: (0, Mustache_1.default)(`\u200e${finalMessage}`, ticket.contact)
            });
            // ✅ LIMPAR CHATBOT E DEIXAR PARA ATENDIMENTO HUMANO
            await (0, UpdateTicketService_1.default)({
                ticketData: {
                    queueOptionId: null,
                    chatbot: false,
                    status: "pending"
                },
                ticketId: ticket.id,
                companyId: ticket.companyId,
            });
        }
    }
};
// ✅ ADICIONAR ESTA FUNÇÃO NO facebookMessageListener.ts
const processAudioMessage = async (msg, ticket, contact, fromMe = false, channel = "facebook") => {
    console.log("🎵 Processando áudio Facebook/Instagram:", {
        ticketId: ticket.id,
        channel,
        fromMe
    });
    try {
        // ✅ BAIXAR ÁUDIO
        const attachment = msg.attachments[0];
        const audioUrl = attachment.payload?.url;
        const response = await axios_1.default.get(audioUrl, {
            responseType: "arraybuffer",
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        const audioData = Buffer.from(response.data);
        // ✅ DETECTAR FORMATO
        const { fileTypeFromBuffer } = await Promise.resolve().then(() => __importStar(require("file-type")));
        const detectedType = await fileTypeFromBuffer(audioData);
        const originalExt = detectedType?.ext || 'mp3';
        const timestamp = Date.now();
        const originalFileName = `audio_${timestamp}.${originalExt}`;
        const convertedFileName = `audio_${timestamp}_converted.ogg`;
        // ✅ CRIAR DIRETÓRIOS
        const folder = `public/company${ticket.companyId}`;
        const fullPath = (0, path_1.join)(__dirname, "..", "..", "..", folder);
        if (!fs_2.default.existsSync(fullPath)) {
            fs_2.default.mkdirSync(fullPath, { recursive: true });
            fs_2.default.chmodSync(fullPath, 0o777);
        }
        const originalPath = (0, path_1.join)(fullPath, originalFileName);
        const convertedPath = (0, path_1.join)(fullPath, convertedFileName);
        // ✅ SALVAR ARQUIVO ORIGINAL
        (0, fs_1.writeFileSync)(originalPath, audioData);
        // ✅ CONVERTER PARA OGG SE NECESSÁRIO (OPCIONAL)
        let finalFileName = originalFileName;
        if (originalExt !== 'ogg' && originalExt !== 'mp3') {
            try {
                await convertAudioToOgg(originalPath, convertedPath);
                finalFileName = convertedFileName;
                // ✅ REMOVER ARQUIVO ORIGINAL APÓS CONVERSÃO
                fs_2.default.unlinkSync(originalPath);
                console.log("✅ Áudio convertido para OGG:", finalFileName);
            }
            catch (conversionError) {
                console.log("⚠️ Conversão falhou, usando arquivo original:", conversionError.message);
                finalFileName = originalFileName;
            }
        }
        // ✅ CRIAR MENSAGEM
        const messageId = msg.mid || `${channel}_audio_${timestamp}`;
        const messageData = {
            id: messageId,
            wid: messageId,
            ticketId: ticket.id,
            contactId: fromMe ? undefined : contact.id,
            body: msg.text || "🎵 Áudio",
            fromMe: fromMe,
            mediaType: 'audio',
            mediaUrl: finalFileName,
            read: fromMe ? true : false,
            quotedMsgId: null,
            ack: fromMe ? 3 : 1,
            dataJson: JSON.stringify({
                ...msg,
                processedAudio: {
                    originalFormat: originalExt,
                    finalFormat: finalFileName.split('.').pop(),
                    duration: null // Poderia ser extraído com ffprobe
                }
            }),
            channel: channel
        };
        const message = await (0, CreateMessageService_1.default)({
            messageData,
            companyId: ticket.companyId
        });
        console.log("✅ Áudio processado com sucesso:", {
            messageId: message.id,
            fileName: finalFileName,
            originalFormat: originalExt
        });
        return message;
    }
    catch (error) {
        console.error("❌ Erro ao processar áudio:", error);
        throw error;
    }
};
const convertAudioToOgg = (inputPath, outputPath) => {
    return new Promise((resolve, reject) => {
        (0, fluent_ffmpeg_1.default)(inputPath)
            .audioCodec('libopus')
            .format('ogg')
            .on('end', () => {
            console.log("🔄 Conversão de áudio concluída");
            resolve(outputPath);
        })
            .on('error', (err) => {
            console.error("❌ Erro na conversão:", err);
            reject(err);
        })
            .save(outputPath);
    });
};
