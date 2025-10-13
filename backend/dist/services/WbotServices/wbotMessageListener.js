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
exports.handleMessage = exports.wbotMessageListener = exports.handleMessageIntegration = exports.handleRating = exports.verifyRating = exports.isValidMsg = exports.verifyMessage = exports.getQuotedMessageId = exports.getQuotedMessage = exports.getBodyMessage = exports.makeid = exports.sendMessageLink = exports.sendMessageImage = exports.sleep = exports.validaCpfCnpj = exports.getTypeMessage = exports.isNumeric = void 0;
const path_1 = __importStar(require("path"));
const util_1 = require("util");
const fs_1 = require("fs");
const Sentry = __importStar(require("@sentry/node"));
const lodash_1 = require("lodash");
const baileys_1 = require("@whiskeysockets/baileys");
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const Message_1 = __importDefault(require("../../models/Message"));
const socket_1 = require("../../libs/socket");
const CreateMessageService_1 = __importDefault(require("../MessageServices/CreateMessageService"));
const logger_1 = require("../../utils/logger");
const CreateOrUpdateContactService_1 = __importDefault(require("../ContactServices/CreateOrUpdateContactService"));
const FindOrCreateTicketService_1 = __importDefault(require("../TicketServices/FindOrCreateTicketService"));
const ShowWhatsAppService_1 = __importDefault(require("../WhatsappService/ShowWhatsAppService"));
const UpdateTicketService_1 = __importDefault(require("../TicketServices/UpdateTicketService"));
const Mustache_1 = __importDefault(require("../../helpers/Mustache"));
const UserRating_1 = __importDefault(require("../../models/UserRating"));
const SendWhatsAppMessage_1 = __importDefault(require("./SendWhatsAppMessage"));
const moment_1 = __importDefault(require("moment"));
const Queue_1 = __importDefault(require("../../models/Queue"));
const QueueOption_1 = __importDefault(require("../../models/QueueOption"));
const FindOrCreateATicketTrakingService_1 = __importDefault(require("../TicketServices/FindOrCreateATicketTrakingService"));
const VerifyCurrentSchedule_1 = __importDefault(require("../CompanyService/VerifyCurrentSchedule"));
const Campaign_1 = __importDefault(require("../../models/Campaign"));
const CampaignShipping_1 = __importDefault(require("../../models/CampaignShipping"));
const sequelize_1 = require("sequelize");
const queues_1 = require("../../queues");
const Setting_1 = __importDefault(require("../../models/Setting"));
const cache_1 = __importDefault(require("../../libs/cache"));
const providers_1 = require("./providers");
const Debounce_1 = require("../../helpers/Debounce");
const openai_1 = __importDefault(require("openai"));
const fluent_ffmpeg_1 = __importDefault(require("fluent-ffmpeg"));
const microsoft_cognitiveservices_speech_sdk_1 = require("microsoft-cognitiveservices-speech-sdk");
const typebotListenerUniversal_1 = __importDefault(require("../TypebotServices/typebotListenerUniversal"));
const ShowQueueIntegrationService_1 = __importDefault(require("../QueueIntegrationServices/ShowQueueIntegrationService"));
const addLogs_1 = require("../../helpers/addLogs");
const MarkDeleteWhatsAppMessage_1 = __importDefault(require("./MarkDeleteWhatsAppMessage"));
const SendWhatsAppMedia_1 = require("./SendWhatsAppMedia");
const request = require("request");
const fs = require('fs');
let i = 0;
const sessionsOpenAi = [];
const isNumeric = (value) => /^-?\d+$/.test(value);
exports.isNumeric = isNumeric;
const writeFileAsync = (0, util_1.promisify)(fs_1.writeFile);
const getTypeMessage = (msg) => {
    return (0, baileys_1.getContentType)(msg.message);
};
exports.getTypeMessage = getTypeMessage;
function validaCpfCnpj(val) {
    if (val.length == 11) {
        var cpf = val.trim();
        cpf = cpf.replace(/\./g, '');
        cpf = cpf.replace('-', '');
        cpf = cpf.split('');
        var v1 = 0;
        var v2 = 0;
        var aux = false;
        for (var i = 1; cpf.length > i; i++) {
            if (cpf[i - 1] != cpf[i]) {
                aux = true;
            }
        }
        if (aux == false) {
            return false;
        }
        for (var i = 0, p = 10; (cpf.length - 2) > i; i++, p--) {
            v1 += cpf[i] * p;
        }
        v1 = ((v1 * 10) % 11);
        if (v1 == 10) {
            v1 = 0;
        }
        if (v1 != cpf[9]) {
            return false;
        }
        for (var i = 0, p = 11; (cpf.length - 1) > i; i++, p--) {
            v2 += cpf[i] * p;
        }
        v2 = ((v2 * 10) % 11);
        if (v2 == 10) {
            v2 = 0;
        }
        if (v2 != cpf[10]) {
            return false;
        }
        else {
            return true;
        }
    }
    else if (val.length == 14) {
        var cnpj = val.trim();
        cnpj = cnpj.replace(/\./g, '');
        cnpj = cnpj.replace('-', '');
        cnpj = cnpj.replace('/', '');
        cnpj = cnpj.split('');
        var v1 = 0;
        var v2 = 0;
        var aux = false;
        for (var i = 1; cnpj.length > i; i++) {
            if (cnpj[i - 1] != cnpj[i]) {
                aux = true;
            }
        }
        if (aux == false) {
            return false;
        }
        for (var i = 0, p1 = 5, p2 = 13; (cnpj.length - 2) > i; i++, p1--, p2--) {
            if (p1 >= 2) {
                v1 += cnpj[i] * p1;
            }
            else {
                v1 += cnpj[i] * p2;
            }
        }
        v1 = (v1 % 11);
        if (v1 < 2) {
            v1 = 0;
        }
        else {
            v1 = (11 - v1);
        }
        if (v1 != cnpj[12]) {
            return false;
        }
        for (var i = 0, p1 = 6, p2 = 14; (cnpj.length - 1) > i; i++, p1--, p2--) {
            if (p1 >= 2) {
                v2 += cnpj[i] * p1;
            }
            else {
                v2 += cnpj[i] * p2;
            }
        }
        v2 = (v2 % 11);
        if (v2 < 2) {
            v2 = 0;
        }
        else {
            v2 = (11 - v2);
        }
        if (v2 != cnpj[13]) {
            return false;
        }
        else {
            return true;
        }
    }
    else {
        return false;
    }
}
exports.validaCpfCnpj = validaCpfCnpj;
function timeout(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function sleep(time) {
    await timeout(time);
}
exports.sleep = sleep;
const sendMessageImage = async (wbot, contact, ticket, url, caption) => {
    let sentMessage;
    try {
        sentMessage = await wbot.sendMessage(`${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
            image: url ? { url } : fs.readFileSync(`public/temp/${caption}-${makeid(10)}`),
            fileName: caption,
            caption: caption,
            mimetype: 'image/jpeg'
        });
    }
    catch (error) {
        sentMessage = await wbot.sendMessage(`${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
            text: (0, Mustache_1.default)('Não consegui enviar o PDF, tente novamente!', contact)
        });
    }
    (0, exports.verifyMessage)(sentMessage, ticket, contact);
};
exports.sendMessageImage = sendMessageImage;
const sendMessageLink = async (wbot, contact, ticket, url, caption) => {
    let sentMessage;
    try {
        sentMessage = await wbot.sendMessage(`${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
            document: url ? { url } : fs.readFileSync(`public/temp/${caption}-${makeid(10)}`),
            fileName: caption,
            caption: caption,
            mimetype: 'application/pdf'
        });
    }
    catch (error) {
        sentMessage = await wbot.sendMessage(`${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
            text: (0, Mustache_1.default)('Não consegui enviar o PDF, tente novamente!', contact)
        });
    }
    (0, exports.verifyMessage)(sentMessage, ticket, contact);
};
exports.sendMessageLink = sendMessageLink;
function makeid(length) {
    var result = '';
    var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}
exports.makeid = makeid;
const getBodyList = (msg) => {
    if (msg.key.fromMe && msg.message.listMessage?.description) {
        let bodyMessage = `${msg.message.listMessage?.description}`;
        for (const buton of msg.message.listMessage?.sections) {
            for (const rows of buton.rows) {
                bodyMessage += `\n\n${rows.title}`;
            }
        }
        return bodyMessage;
    }
    if (msg.key.fromMe && msg?.message?.viewOnceMessage?.message?.listMessage) {
        let bodyMessage = `${msg?.message?.viewOnceMessage?.message?.listMessage?.description}`;
        for (const buton of msg.message?.viewOnceMessage?.message?.listMessage?.sections) {
            for (const rows of buton.rows) {
                bodyMessage += `\n\n${rows.title}`;
            }
        }
        return bodyMessage;
    }
};
const multVecardGet = function (param) {
    let output = " ";
    let name = param.split("\n")[2].replace(";;;", "\n").replace('N:', "").replace(";", "").replace(";", " ").replace(";;", " ").replace("\n", "");
    let inicio = param.split("\n")[4].indexOf('=');
    let fim = param.split("\n")[4].indexOf(':');
    let contact = param.split("\n")[4].substring(inicio + 1, fim).replace(";", "");
    let contactSemWhats = param.split("\n")[4].replace("item1.TEL:", "");
    //console.log(contact);
    if (contact != "item1.TEL") {
        output = output + name + ": 📞" + contact + "" + "\n";
    }
    else
        output = output + name + ": 📞" + contactSemWhats + "" + "\n";
    return output;
};
const contactsArrayMessageGet = (msg) => {
    let contactsArray = msg.message?.contactsArrayMessage?.contacts;
    let vcardMulti = contactsArray.map(function (item, indice) {
        return item.vcard;
    });
    let bodymessage = ``;
    vcardMulti.forEach(function (vcard, indice) {
        bodymessage += vcard + "\n\n" + "";
    });
    let contacts = bodymessage.split("BEGIN:");
    contacts.shift();
    let finalContacts = "";
    for (let contact of contacts) {
        finalContacts = finalContacts + multVecardGet(contact);
    }
    return finalContacts;
};
const getBodyButton = (msg) => {
    if (msg.key.fromMe && msg?.message?.viewOnceMessage?.message?.buttonsMessage?.contentText) {
        let bodyMessage = `*${msg?.message?.viewOnceMessage?.message?.buttonsMessage?.contentText}*`;
        for (const buton of msg.message?.viewOnceMessage?.message?.buttonsMessage?.buttons) {
            bodyMessage += `\n\n${buton.buttonText?.displayText}`;
        }
        return bodyMessage;
    }
    if (msg.key.fromMe && msg?.message?.viewOnceMessage?.message?.listMessage) {
        let bodyMessage = `*${msg?.message?.viewOnceMessage?.message?.listMessage?.description}*`;
        for (const buton of msg.message?.viewOnceMessage?.message?.listMessage?.sections) {
            for (const rows of buton.rows) {
                bodyMessage += `\n\n${rows.title}`;
            }
        }
        return bodyMessage;
    }
};
const msgLocation = (image, latitude, longitude) => {
    if (image) {
        var b64 = Buffer.from(image).toString("base64");
        let data = `data:image/png;base64, ${b64} | https://maps.google.com/maps?q=${latitude}%2C${longitude}&z=17&hl=pt-BR|${latitude}, ${longitude} `;
        return data;
    }
};
const getBodyMessage = (msg) => {
    try {
        let type = (0, exports.getTypeMessage)(msg);
        const types = {
            conversation: msg.message?.conversation,
            imageMessage: msg.message?.imageMessage?.caption,
            videoMessage: msg.message?.videoMessage?.caption,
            extendedTextMessage: msg?.message?.extendedTextMessage?.text,
            buttonsResponseMessage: msg.message?.buttonsResponseMessage?.selectedDisplayText,
            listResponseMessage: msg.message?.listResponseMessage?.title || msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId,
            templateButtonReplyMessage: msg.message?.templateButtonReplyMessage?.selectedId,
            messageContextInfo: msg.message?.buttonsResponseMessage?.selectedButtonId || msg.message?.listResponseMessage?.title,
            buttonsMessage: getBodyButton(msg) || msg.message?.listResponseMessage?.title,
            stickerMessage: "sticker",
            contactMessage: msg.message?.contactMessage?.vcard,
            contactsArrayMessage: (msg.message?.contactsArrayMessage?.contacts) && contactsArrayMessageGet(msg),
            //locationMessage: `Latitude: ${msg.message.locationMessage?.degreesLatitude} - Longitude: ${msg.message.locationMessage?.degreesLongitude}`,
            locationMessage: msgLocation(msg.message?.locationMessage?.jpegThumbnail, msg.message?.locationMessage?.degreesLatitude, msg.message?.locationMessage?.degreesLongitude),
            liveLocationMessage: `Latitude: ${msg.message?.liveLocationMessage?.degreesLatitude} - Longitude: ${msg.message?.liveLocationMessage?.degreesLongitude}`,
            documentMessage: msg.message?.documentMessage?.caption,
            audioMessage: "Áudio",
            listMessage: getBodyList(msg) || msg.message?.listResponseMessage?.title,
            viewOnceMessage: getBodyButton(msg),
            reactionMessage: msg.message?.reactionMessage?.text || "reaction",
            senderKeyDistributionMessage: msg?.message?.senderKeyDistributionMessage?.axolotlSenderKeyDistributionMessage,
            documentWithCaptionMessage: msg.message?.documentWithCaptionMessage?.message?.documentMessage?.caption,
            viewOnceMessageV2: msg.message?.viewOnceMessageV2?.message?.imageMessage?.caption,
            editedMessage: msg?.message?.protocolMessage?.editedMessage?.conversation ||
                msg?.message?.editedMessage?.message?.protocolMessage?.editedMessage?.conversation,
            ephemeralMessage: msg.message?.ephemeralMessage?.message?.extendedTextMessage?.text,
            imageWhitCaptionMessage: msg?.message?.ephemeralMessage?.message?.imageMessage,
            highlyStructuredMessage: msg.message?.highlyStructuredMessage,
            protocolMessage: msg?.message?.protocolMessage?.editedMessage?.conversation
        };
        const objKey = Object.keys(types).find(key => key === type);
        if (!objKey) {
            logger_1.logger.warn(`#### Nao achou o type 152: ${type}
${JSON.stringify(msg)}`);
            Sentry.setExtra("Mensagem", { BodyMsg: msg.message, msg, type });
            Sentry.captureException(new Error("Novo Tipo de Mensagem em getTypeMessage"));
        }
        return types[type];
    }
    catch (error) {
        Sentry.setExtra("Error getTypeMessage", { msg, BodyMsg: msg.message });
        Sentry.captureException(error);
        console.log(error);
    }
};
exports.getBodyMessage = getBodyMessage;
const getQuotedMessage = (msg) => {
    const body = msg.message.imageMessage.contextInfo ||
        msg.message.videoMessage.contextInfo ||
        msg.message?.documentMessage ||
        msg.message.extendedTextMessage.contextInfo ||
        msg.message.buttonsResponseMessage.contextInfo ||
        msg.message.listResponseMessage.contextInfo ||
        msg.message.templateButtonReplyMessage.contextInfo ||
        msg.message.buttonsResponseMessage?.contextInfo ||
        msg?.message?.buttonsResponseMessage?.selectedButtonId ||
        msg.message.listResponseMessage?.singleSelectReply?.selectedRowId ||
        msg?.message?.listResponseMessage?.singleSelectReply.selectedRowId ||
        msg.message.listResponseMessage?.contextInfo;
    msg.message.senderKeyDistributionMessage;
    // testar isso
    return (0, baileys_1.extractMessageContent)(body[Object.keys(body).values().next().value]);
};
exports.getQuotedMessage = getQuotedMessage;
const getQuotedMessageId = (msg) => {
    const body = (0, baileys_1.extractMessageContent)(msg.message)[Object.keys(msg?.message).values().next().value];
    return body?.contextInfo?.stanzaId;
};
exports.getQuotedMessageId = getQuotedMessageId;
const getMeSocket = (wbot) => {
    return {
        id: (0, baileys_1.jidNormalizedUser)(wbot.user.id),
        name: wbot.user.name
    };
};
const getSenderMessage = (msg, wbot) => {
    const me = getMeSocket(wbot);
    if (msg.key.fromMe)
        return me.id;
    const senderId = msg.participant || msg.key.participant || msg.key.remoteJid || undefined;
    return senderId && (0, baileys_1.jidNormalizedUser)(senderId);
};
const getContactMessage = async (msg, wbot) => {
    const isGroup = msg.key.remoteJid.includes("g.us");
    const rawNumber = isGroup ? msg.key.remoteJid.replace(/[^\d-]/g, "") : msg.key.remoteJid.replace(/\D/g, "");
    return isGroup
        ? {
            id: getSenderMessage(msg, wbot),
            name: msg.pushName
        }
        : {
            id: msg.key.remoteJid,
            name: msg.key.fromMe ? rawNumber : msg.pushName
        };
};
const downloadMedia = async (msg, isImported = null) => {
    let buffer;
    try {
        buffer = await (0, baileys_1.downloadMediaMessage)(msg, 'buffer', {});
    }
    catch (err) {
        if (isImported) {
            console.log("Falha ao fazer o download de uma mensagem importada, provavelmente a mensagem já não esta mais disponível");
        }
        else {
            console.error('Erro ao baixar mídia:', err);
        }
        // Trate o erro de acordo com as suas necessidades
    }
    let filename = msg.message?.documentMessage?.fileName || "";
    const mineType = msg.message?.imageMessage ||
        msg.message?.audioMessage ||
        msg.message?.videoMessage ||
        msg.message?.stickerMessage ||
        msg.message?.documentMessage ||
        msg.message?.documentWithCaptionMessage?.message?.documentMessage ||
        // msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage ||
        // msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage ||
        // msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.audioMessage ||
        msg.message?.ephemeralMessage?.message?.audioMessage ||
        msg.message?.ephemeralMessage?.message?.documentMessage ||
        msg.message?.ephemeralMessage?.message?.videoMessage ||
        msg.message?.ephemeralMessage?.message?.stickerMessage ||
        msg.message?.ephemeralMessage?.message?.imageMessage ||
        msg.message?.viewOnceMessage?.message?.imageMessage ||
        msg.message?.viewOnceMessage?.message?.videoMessage ||
        msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message?.imageMessage ||
        msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message?.videoMessage ||
        msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message?.audioMessage ||
        msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message?.documentMessage ||
        msg.message?.templateMessage?.hydratedTemplate?.imageMessage ||
        msg.message?.templateMessage?.hydratedTemplate?.documentMessage ||
        msg.message?.templateMessage?.hydratedTemplate?.videoMessage ||
        msg.message?.templateMessage?.hydratedFourRowTemplate?.imageMessage ||
        msg.message?.templateMessage?.hydratedFourRowTemplate?.documentMessage ||
        msg.message?.templateMessage?.hydratedFourRowTemplate?.videoMessage ||
        msg.message?.templateMessage?.fourRowTemplate?.imageMessage ||
        msg.message?.templateMessage?.fourRowTemplate?.documentMessage ||
        msg.message?.templateMessage?.fourRowTemplate?.videoMessage ||
        msg.message?.interactiveMessage?.header?.imageMessage ||
        msg.message?.interactiveMessage?.header?.documentMessage ||
        msg.message?.interactiveMessage?.header?.videoMessage;
    if (!filename) {
        const ext = mineType.mimetype.split("/")[1].split(";")[0];
        filename = `${new Date().getTime()}.${ext}`;
    }
    else {
        filename = `${new Date().getTime()}_${filename}`;
    }
    const media = {
        data: buffer,
        mimetype: mineType.mimetype,
        filename
    };
    return media;
};
const verifyContact = async (msgContact, wbot, companyId) => {
    let profilePicUrl;
    try {
        profilePicUrl = await wbot.profilePictureUrl(msgContact.id);
    }
    catch (e) {
        Sentry.captureException(e);
        profilePicUrl = "";
    }
    const isGroup = msgContact.id.includes("g.us");
    const number = isGroup ? msgContact.id.replace(/[^\d-]/g, "") : msgContact.id.replace(/\D/g, "");
    const name = msgContact?.name || number;
    const contactData = {
        name,
        number,
        profilePicUrl,
        isGroup,
        companyId,
        whatsappId: wbot.id
    };
    const contact = (0, CreateOrUpdateContactService_1.default)(contactData);
    return contact;
};
const getTimestampMessage = (msgTimestamp) => {
    return msgTimestamp * 1;
};
const verifyQuotedMessage = async (msg) => {
    if (!msg)
        return null;
    const quoted = (0, exports.getQuotedMessageId)(msg);
    if (!quoted)
        return null;
    const quotedMsg = await Message_1.default.findOne({
        where: { id: quoted },
    });
    if (!quotedMsg)
        return null;
    return quotedMsg;
};
const sanitizeName = (name) => {
    let sanitized = name.split(" ")[0];
    sanitized = sanitized.replace(/[^a-zA-Z0-9]/g, "");
    return sanitized.substring(0, 60);
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
        fs.unlinkSync(path);
    }
    catch (error) {
        console.error("Erro ao deletar o arquivo:", error);
    }
};
const keepOnlySpecifiedChars = (str) => {
    return str.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚâêîôûÂÊÎÔÛãõÃÕçÇ!?.,;:\s]/g, "");
};
const handleOpenAi = async (msg, wbot, ticket, contact, mediaSent, ticketTraking) => {
    // REGRA PARA DESABILITAR O BOT PARA ALGUM CONTATO
    if (contact.disableBot) {
        return;
    }
    const bodyMessage = (0, exports.getBodyMessage)(msg);
    // Verificar se é uma mídia que não é áudio (foto, vídeo, documento, sticker)
    const hasUnsupportedMedia = msg.message?.imageMessage ||
        msg.message?.videoMessage ||
        msg.message?.documentMessage ||
        msg.message?.stickerMessage ||
        msg.message?.audioMessage ||
        msg.message?.documentWithCaptionMessage?.message?.documentMessage ||
        msg.message?.ephemeralMessage?.message?.documentMessage ||
        msg.message?.ephemeralMessage?.message?.videoMessage ||
        msg.message?.ephemeralMessage?.message?.stickerMessage ||
        msg.message?.ephemeralMessage?.message?.imageMessage ||
        msg.message?.viewOnceMessage?.message?.imageMessage ||
        msg.message?.viewOnceMessage?.message?.videoMessage ||
        msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message?.imageMessage ||
        msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message?.videoMessage ||
        msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message?.documentMessage ||
        msg.message?.templateMessage?.hydratedTemplate?.imageMessage ||
        msg.message?.templateMessage?.hydratedTemplate?.documentMessage ||
        msg.message?.templateMessage?.hydratedTemplate?.videoMessage ||
        msg.message?.templateMessage?.hydratedFourRowTemplate?.imageMessage ||
        msg.message?.templateMessage?.hydratedFourRowTemplate?.documentMessage ||
        msg.message?.templateMessage?.hydratedFourRowTemplate?.videoMessage ||
        msg.message?.templateMessage?.fourRowTemplate?.imageMessage ||
        msg.message?.templateMessage?.fourRowTemplate?.documentMessage ||
        msg.message?.templateMessage?.fourRowTemplate?.videoMessage ||
        msg.message?.interactiveMessage?.header?.imageMessage ||
        msg.message?.interactiveMessage?.header?.documentMessage ||
        msg.message?.interactiveMessage?.header?.videoMessage;
    // Se for uma mídia não suportada, transferir para atendimento humano
    if (hasUnsupportedMedia) {
        const mediaTransferMessage = "👩🏻‍💼 *Vejo que você enviou uma mídia!*\nVou transferir para um de nossos especialistas para que possamos te atender melhor";
        // Enviar mensagem explicativa
        const sentMessage = await wbot.sendMessage(msg.key.remoteJid, {
            text: `\u200e ${mediaTransferMessage}`
        });
        await (0, exports.verifyMessage)(sentMessage, ticket, contact, false, ticketTraking);
        // Transferir para a primeira fila disponível ou fila padrão
        let { prompt } = await (0, ShowWhatsAppService_1.default)(wbot.id, ticket.companyId);
        if (!prompt && !(0, lodash_1.isNil)(ticket?.queue?.prompt)) {
            prompt = ticket.queue.prompt;
        }
        if (prompt && prompt.queueId) {
            await transferQueue(prompt.queueId, ticket, contact);
        }
        else {
            // Se não houver uma fila específica no prompt, buscar a primeira fila disponível
            const { queues } = await (0, ShowWhatsAppService_1.default)(wbot.id, ticket.companyId);
            if (queues && queues.length > 0) {
                await transferQueue(queues[0].id, ticket, contact);
            }
        }
        return;
    }
    if (!bodyMessage && !msg.message?.audioMessage)
        return;
    let { prompt } = await (0, ShowWhatsAppService_1.default)(wbot.id, ticket.companyId);
    if (!prompt && !(0, lodash_1.isNil)(ticket?.queue?.prompt)) {
        prompt = ticket.queue.prompt;
    }
    if (!prompt)
        return;
    if (msg.messageStubType)
        return;
    const publicFolder = path_1.default.resolve(__dirname, "..", "..", "..", "public", `company${ticket.companyId}`);
    let openai;
    const openAiIndex = sessionsOpenAi.findIndex(s => s.id === ticket.id);
    if (openAiIndex === -1) {
        openai = new openai_1.default({ apiKey: prompt.apiKey });
        openai.id = ticket.id;
        sessionsOpenAi.push(openai);
    }
    else {
        openai = sessionsOpenAi[openAiIndex];
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
    if (msg.message?.conversation || msg.message?.extendedTextMessage?.text) {
        messagesOpenAi = [];
        messagesOpenAi.push({ role: "system", content: promptSystem });
        for (let i = 0; i < Math.min(prompt.maxMessages, messages.length); i++) {
            const message = messages[i];
            if (message.mediaType === "chat") {
                if (message.fromMe) {
                    messagesOpenAi.push({ role: "assistant", content: message.body });
                }
                else {
                    messagesOpenAi.push({ role: "user", content: message.body });
                }
            }
        }
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
            const sentMessage = await wbot.sendMessage(msg.key.remoteJid, { text: `\u200e ${response}` });
            (0, exports.verifyMessage)(sentMessage, ticket, contact, false, ticketTraking);
        }
        else {
            const fileNameWithOutExtension = `${ticket.id}_${Date.now()}`;
            convertTextToSpeechAndSaveToFile(keepOnlySpecifiedChars(response), `${publicFolder}/${fileNameWithOutExtension}`, prompt.voiceKey, prompt.voiceRegion, prompt.voice, "mp3").then(async () => {
                try {
                    const sendMessage = await wbot.sendMessage(msg.key.remoteJid, {
                        audio: { url: `${publicFolder}/${fileNameWithOutExtension}.mp3` },
                        mimetype: "audio/mpeg",
                        ptt: true
                    });
                    await verifyMediaMessage(sendMessage, ticket, contact, false, ticketTraking);
                    deleteFileSync(`${publicFolder}/${fileNameWithOutExtension}.mp3`);
                    deleteFileSync(`${publicFolder}/${fileNameWithOutExtension}.wav`);
                }
                catch (error) {
                    console.log(`Erro para responder com audio: ${error}`);
                }
            });
        }
    }
    else if (msg.message?.audioMessage) {
        const mediaUrl = mediaSent.mediaUrl.split("/").pop();
        const file = fs.createReadStream(`${publicFolder}/${mediaUrl}`);
        const transcription = await openai.audio.transcriptions.create({
            model: "whisper-1",
            file: file,
        });
        messagesOpenAi = [];
        messagesOpenAi.push({ role: "system", content: promptSystem });
        for (let i = 0; i < Math.min(prompt.maxMessages, messages.length); i++) {
            const message = messages[i];
            if (message.mediaType === "chat") {
                if (message.fromMe) {
                    messagesOpenAi.push({ role: "assistant", content: message.body });
                }
                else {
                    messagesOpenAi.push({ role: "user", content: message.body });
                }
            }
        }
        messagesOpenAi.push({ role: "user", content: transcription.text });
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
            const sentMessage = await wbot.sendMessage(msg.key.remoteJid, {
                text: `\u200e ${response}`
            });
            (0, exports.verifyMessage)(sentMessage, ticket, contact, false, ticketTraking);
        }
        else {
            const fileNameWithOutExtension = `${ticket.id}_${Date.now()}`;
            convertTextToSpeechAndSaveToFile(keepOnlySpecifiedChars(response), `${publicFolder}/${fileNameWithOutExtension}`, prompt.voiceKey, prompt.voiceRegion, prompt.voice, "mp3").then(async () => {
                try {
                    const sendMessage = await wbot.sendMessage(msg.key.remoteJid, {
                        audio: { url: `${publicFolder}/${fileNameWithOutExtension}.mp3` },
                        mimetype: "audio/mpeg",
                        ptt: true
                    });
                    await verifyMediaMessage(sendMessage, ticket, contact, false, ticketTraking);
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
const transferQueue = async (queueId, ticket, contact) => {
    await (0, UpdateTicketService_1.default)({
        ticketData: { queueId: queueId, useIntegration: false, promptId: null },
        ticketId: ticket.id,
        companyId: ticket.companyId
    });
};
const verifyMediaMessage = async (msg, ticket, contact, isForwarded, ticketTraking) => {
    const io = (0, socket_1.getIO)();
    const quotedMsg = await verifyQuotedMessage(msg);
    const companyId = ticket.companyId;
    const media = await downloadMedia(msg, ticket?.imported);
    if (!media && ticket.imported) {
        const body = "*System:* \nFalha no download da mídia verifique no dispositivo";
        const messageData = {
            //mensagem de texto
            id: msg.key.id,
            ticketId: ticket.id,
            contactId: msg.key.fromMe ? undefined : ticket.contactId,
            body,
            reactionMessage: msg.message?.reactionMessage,
            fromMe: msg.key.fromMe,
            mediaType: (0, exports.getTypeMessage)(msg),
            read: msg.key.fromMe,
            quotedMsgId: quotedMsg?.id || msg.message?.reactionMessage?.key?.id,
            ack: msg.status,
            companyId: companyId,
            remoteJid: msg.key.remoteJid,
            participant: msg.key.participant,
            timestamp: getTimestampMessage(msg.messageTimestamp),
            createdAt: new Date(Math.floor(getTimestampMessage(msg.messageTimestamp) * 1000)).toISOString(),
            dataJson: JSON.stringify(msg),
            ticketImported: ticket.imported,
            isForwarded
        };
    }
    if (!media) {
        throw new Error("ERR_WAPP_DOWNLOAD_MEDIA");
    }
    if (!media.filename) {
        const ext = media.mimetype.split("/")[1].split(";")[0];
        media.filename = `${new Date().getTime()}.${ext}`;
    }
    try {
        await writeFileAsync((0, path_1.join)(__dirname, "..", "..", "..", "public", media.filename), media.data, "base64");
    }
    catch (err) {
        Sentry.captureException(err);
        logger_1.logger.error(err);
    }
    const body = (0, exports.getBodyMessage)(msg);
    const messageData = {
        id: msg.key.id,
        ticketId: ticket.id,
        contactId: msg.key.fromMe ? undefined : contact.id,
        body: body ? (0, Mustache_1.default)(body, ticket.contact) : media.filename,
        fromMe: msg.key.fromMe,
        read: msg.key.fromMe,
        mediaUrl: media.filename,
        mediaType: media.mimetype.split("/")[0],
        quotedMsgId: quotedMsg?.id,
        ack: msg.status,
        remoteJid: msg.key.remoteJid,
        participant: msg.key.participant,
        dataJson: JSON.stringify(msg),
        createdAt: new Date(Math.floor(getTimestampMessage(msg.messageTimestamp) * 1000)).toISOString(),
        ticketImported: ticket.imported,
        isForwarded
    };
    await ticket.update({
        lastMessage: body || media.filename,
    });
    await ticketTraking.update({
        lastMessage: body || media.filename,
    });
    const newMessage = await (0, CreateMessageService_1.default)({
        messageData,
        companyId: ticket.companyId,
    });
    if (!msg.key.fromMe && ticket.status === "closed") {
        await ticket.update({ status: "pending" });
        await ticket.reload({
            include: [
                { model: Queue_1.default, as: "queue" },
                { model: Ticket_1.default.sequelize.models.User, as: "user" },
                { model: Ticket_1.default.sequelize.models.Contact, as: "contact" },
                { model: Ticket_1.default.sequelize.models.Whatsapp, as: "whatsapp" },
                { model: Ticket_1.default.sequelize.models.Tag, as: "tags" }
            ]
        });
        io.to(`company-${ticket.companyId}-closed`)
            .to(`queue-${ticket.queueId}-closed`)
            .emit(`company-${ticket.companyId}-ticket`, {
            action: "delete",
            ticket,
            ticketId: ticket.id,
        });
        io.to(`company-${ticket.companyId}-${ticket.status}`)
            .to(`queue-${ticket.queueId}-${ticket.status}`)
            .to(ticket.id.toString())
            .emit(`company-${ticket.companyId}-ticket`, {
            action: "update",
            ticket,
            ticketId: ticket.id,
        });
    }
    return newMessage;
};
const verifyMessage = async (msg, ticket, contact, isForwarded, ticketTraking) => {
    const io = (0, socket_1.getIO)();
    const quotedMsg = await verifyQuotedMessage(msg);
    const body = (0, exports.getBodyMessage)(msg);
    const hasMedia = msg.message?.imageMessage ||
        msg.message?.audioMessage ||
        msg.message?.videoMessage ||
        msg.message?.stickerMessage ||
        msg.message?.documentMessage ||
        msg.message?.documentWithCaptionMessage?.message?.documentMessage ||
        msg.message?.ephemeralMessage?.message?.audioMessage ||
        msg.message?.ephemeralMessage?.message?.documentMessage ||
        msg.message?.ephemeralMessage?.message?.videoMessage ||
        msg.message?.ephemeralMessage?.message?.stickerMessage ||
        msg.message?.ephemeralMessage?.message?.imageMessage ||
        msg.message?.viewOnceMessage?.message?.imageMessage ||
        msg.message?.viewOnceMessage?.message?.videoMessage ||
        msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message?.imageMessage ||
        msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message?.videoMessage ||
        msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message?.audioMessage ||
        msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message?.documentMessage ||
        msg.message?.documentWithCaptionMessage?.message?.documentMessage ||
        msg.message?.templateMessage?.hydratedTemplate?.imageMessage ||
        msg.message?.templateMessage?.hydratedTemplate?.documentMessage ||
        msg.message?.templateMessage?.hydratedTemplate?.videoMessage ||
        msg.message?.templateMessage?.hydratedFourRowTemplate?.imageMessage ||
        msg.message?.templateMessage?.hydratedFourRowTemplate?.documentMessage ||
        msg.message?.templateMessage?.hydratedFourRowTemplate?.videoMessage ||
        msg.message?.templateMessage?.fourRowTemplate?.imageMessage ||
        msg.message?.templateMessage?.fourRowTemplate?.documentMessage ||
        msg.message?.templateMessage?.fourRowTemplate?.videoMessage ||
        msg.message?.interactiveMessage?.header?.imageMessage ||
        msg.message?.interactiveMessage?.header?.documentMessage ||
        msg.message?.interactiveMessage?.header?.videoMessage ||
        msg.message?.highlyStructuredMessage?.hydratedHsm?.hydratedTemplate?.documentMessage ||
        msg.message?.highlyStructuredMessage?.hydratedHsm?.hydratedTemplate?.videoMessage ||
        msg.message?.highlyStructuredMessage?.hydratedHsm?.hydratedTemplate?.imageMessage ||
        msg.message?.highlyStructuredMessage?.hydratedHsm?.hydratedTemplate?.locationMessage;
    if (hasMedia) {
        var media = await downloadMedia(msg, ticket?.imported);
    }
    const messageData = {
        id: msg.key.id,
        ticketId: ticket.id,
        contactId: msg.key.fromMe ? undefined : contact.id,
        body,
        fromMe: msg.key.fromMe,
        mediaType: (0, exports.getTypeMessage)(msg),
        mediaUrl: hasMedia ? media.filename : null,
        read: msg.key.fromMe,
        quotedMsgId: quotedMsg?.id,
        ack: msg.status,
        remoteJid: msg.key.remoteJid,
        participant: msg.key.participant,
        dataJson: JSON.stringify(msg),
        createdAt: new Date(Math.floor(getTimestampMessage(msg.messageTimestamp) * 1000)).toISOString(),
        ticketImported: ticket.imported,
        isForwarded
    };
    // ✅ PRESERVAR ESTADO DA INTEGRAÇÃO
    const currentTicketData = {
        lastMessage: body,
        // NÃO alterar useIntegration, integrationId, promptId se não foi especificado
    };
    await ticket.update(currentTicketData);
    await ticketTraking.update({ lastMessage: body });
    await (0, CreateMessageService_1.default)({ messageData, companyId: ticket.companyId });
    if (!msg.key.fromMe) {
        io.to(`company-${ticket.companyId}-ticket`).emit(`company-${ticket.companyId}-presence`, {
            ticketId: ticket.id,
            presence: null
        });
    }
    if (!msg.key.fromMe && ticket.status === "closed") {
        await ticket.update({ status: "pending" });
        await ticket.reload({
            include: [
                { model: Queue_1.default, as: "queue" },
                { model: Ticket_1.default.sequelize.models.User, as: "user" },
                { model: Ticket_1.default.sequelize.models.Contact, as: "contact" },
                { model: Ticket_1.default.sequelize.models.Whatsapp, as: "whatsapp" },
                { model: Ticket_1.default.sequelize.models.Tag, as: "tags" }
            ]
        });
        if (!ticket.imported) {
            io.to(`company-${ticket.companyId}-${ticket.status}`)
                .to(`queue-${ticket.queueId}-${ticket.status}`)
                .to(ticket.id.toString())
                .emit(`company-${ticket.companyId}-ticket`, {
                action: "update",
                ticket,
                ticketId: ticket.id
            });
        }
        io.to(`company-${ticket.companyId}-ticket`).emit(`company-${ticket.companyId}-presence`, {
            ticketId: ticket.id,
            presence: null
        });
    }
};
exports.verifyMessage = verifyMessage;
const isValidMsg = (msg) => {
    if (msg.key.remoteJid === "status@broadcast")
        return false;
    try {
        const msgType = (0, exports.getTypeMessage)(msg);
        if (!msgType) {
            return;
        }
        const ifType = msgType === "conversation" ||
            msgType === "extendedTextMessage" ||
            msgType === "audioMessage" ||
            msgType === "videoMessage" ||
            msgType === "imageMessage" ||
            msgType === "documentMessage" ||
            msgType === "stickerMessage" ||
            msgType === "buttonsResponseMessage" ||
            msgType === "buttonsMessage" ||
            msgType === "messageContextInfo" ||
            msgType === "locationMessage" ||
            msgType === "liveLocationMessage" ||
            msgType === "contactMessage" ||
            msgType === "voiceMessage" ||
            msgType === "mediaMessage" ||
            msgType === "contactsArrayMessage" ||
            msgType === "reactionMessage" ||
            msgType === "ephemeralMessage" ||
            msgType === "protocolMessage" ||
            msgType === "listResponseMessage" ||
            msgType === "listMessage" ||
            msgType === "viewOnceMessage" ||
            msgType === "documentWithCaptionMessage" ||
            msgType === "viewOnceMessageV2" ||
            msgType === "editedMessage" ||
            msgType === "highlyStructuredMessage";
        if (!ifType) {
            logger_1.logger.warn(`#### Nao achou o type em isValidMsg: ${msgType}
${JSON.stringify(msg?.message)}`);
            Sentry.setExtra("Mensagem", { BodyMsg: msg.message, msg, msgType });
            Sentry.captureException(new Error("Novo Tipo de Mensagem em isValidMsg"));
        }
        return !!ifType;
    }
    catch (error) {
        Sentry.setExtra("Error isValidMsg", { msg });
        Sentry.captureException(error);
    }
};
exports.isValidMsg = isValidMsg;
const Push = (msg) => {
    return msg.pushName;
};
const verifyQueue = async (wbot, msg, ticket, contact, mediaSent, ticketTraking) => {
    const companyId = ticket.companyId;
    const { queues, greetingMessage, maxUseBotQueues, timeUseBotQueues, mediaName, mediaPath } = await (0, ShowWhatsAppService_1.default)(wbot.id, ticket.companyId);
    if (queues.length === 1) {
        const firstQueue = (0, lodash_1.head)(queues);
        let chatbot = false;
        if (firstQueue?.options) {
            chatbot = firstQueue.options.length > 0;
        }
        //inicia integração dialogflow/n8n
        if (!msg.key.fromMe &&
            !ticket.isGroup &&
            !(0, lodash_1.isNil)(queues[0]?.integrationId)) {
            const integrations = await (0, ShowQueueIntegrationService_1.default)(queues[0].integrationId, companyId);
            await (0, exports.handleMessageIntegration)(msg, wbot, integrations, ticket);
            await ticket.update({
                useIntegration: true,
                integrationId: integrations.id
            });
            // return;
        }
        //inicia integração openai
        if (!msg.key.fromMe &&
            !ticket.isGroup &&
            !(0, lodash_1.isNil)(queues[0]?.promptId)) {
            await handleOpenAi(msg, wbot, ticket, contact, mediaSent, ticketTraking);
            await ticket.update({
                useIntegration: true,
                promptId: queues[0]?.promptId
            });
            // return;
        }
        await (0, UpdateTicketService_1.default)({
            ticketData: { queueId: firstQueue?.id, chatbot },
            ticketId: ticket.id,
            companyId: ticket.companyId,
        });
        if (greetingMessage.trim() !== "") {
            const textMessage = {
                text: (0, Mustache_1.default)(`\u200e${greetingMessage}`, contact),
            };
            const sendMsg = await wbot.sendMessage(`${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, textMessage);
            await (0, exports.verifyMessage)(sendMsg, ticket, ticket.contact, false, ticketTraking);
        }
        return;
    }
    // REGRA PARA DESABILITAR O BOT PARA ALGUM CONTATO
    if (contact.disableBot) {
        return;
    }
    const selectedOption = (0, exports.getBodyMessage)(msg);
    const choosenQueue = queues[+selectedOption - 1];
    const buttonActive = await Setting_1.default.findOne({
        where: {
            key: "chatBotType",
            companyId
        }
    });
    const botText = async () => {
        let options = "";
        queues.forEach((queue, index) => {
            options += `*[ ${index + 1} ]* - ${queue.name}\n`;
        });
        const textMessage = {
            text: (0, Mustache_1.default)(`\u200e${greetingMessage}\n\n${options}`, contact),
        };
        // @ts-ignore
        const messageFinal = (0, Mustache_1.default)(`\u200e${greetingMessage}\n\n${options}`, contact);
        var sendMsg;
        if (mediaPath) {
            const filePath = path_1.default.resolve("public", mediaPath);
            const messagePath = messageFinal;
            let options2 = await (0, SendWhatsAppMedia_1.getMessageOptions)(messagePath, filePath, messagePath);
            sendMsg = await wbot.sendMessage(`${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
                ...options2
            });
        }
        else {
            sendMsg = await wbot.sendMessage(`${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, textMessage);
        }
        await (0, exports.verifyMessage)(sendMsg, ticket, ticket.contact, false, ticketTraking);
        await (0, UpdateTicketService_1.default)({
            ticketData: { amountUsedBotQueues: ticket.amountUsedBotQueues + 1 },
            ticketId: ticket.id,
            companyId
        });
    };
    if (choosenQueue) {
        let chatbot = false;
        if (choosenQueue?.options) {
            chatbot = choosenQueue.options.length > 0;
        }
        await (0, UpdateTicketService_1.default)({
            ticketData: { queueId: choosenQueue.id, chatbot },
            ticketId: ticket.id,
            companyId: ticket.companyId,
        });
        /* Tratamento para envio de mensagem quando a fila está fora do expediente */
        if (choosenQueue.options.length === 0) {
            const queue = await Queue_1.default.findByPk(choosenQueue.id);
            const { schedules } = queue;
            const now = (0, moment_1.default)();
            const weekday = now.format("dddd").toLowerCase();
            let schedule;
            if (Array.isArray(schedules) && schedules.length > 0) {
                schedule = schedules.find((s) => s.weekdayEn === weekday && s.startTime !== "" && s.startTime !== null && s.endTime !== "" && s.endTime !== null);
            }
            if (queue.outOfHoursMessage !== null && queue.outOfHoursMessage !== "" && !(0, lodash_1.isNil)(schedule)) {
                const startTime = (0, moment_1.default)(schedule.startTime, "HH:mm");
                const endTime = (0, moment_1.default)(schedule.endTime, "HH:mm");
                if (now.isBefore(startTime) || now.isAfter(endTime)) {
                    const body = (0, Mustache_1.default)(`\u200e ${queue.outOfHoursMessage}\n\n*[ # ]* - Voltar ao Menu Principal`, ticket.contact);
                    const sentMessage = await wbot.sendMessage(`${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
                        text: body,
                    });
                    await (0, exports.verifyMessage)(sentMessage, ticket, contact, false, ticketTraking);
                    await (0, UpdateTicketService_1.default)({
                        ticketData: { queueId: null, chatbot },
                        ticketId: ticket.id,
                        companyId: ticket.companyId,
                    });
                    return;
                }
            }
            //inicia integração dialogflow/n8n
            if (!msg.key.fromMe &&
                !ticket.isGroup &&
                choosenQueue.integrationId) {
                const integrations = await (0, ShowQueueIntegrationService_1.default)(choosenQueue.integrationId, companyId);
                await (0, exports.handleMessageIntegration)(msg, wbot, integrations, ticket);
                await ticket.update({
                    useIntegration: true,
                    integrationId: integrations.id
                });
                // return;
            }
            //inicia integração openai
            if (!msg.key.fromMe &&
                !ticket.isGroup &&
                !(0, lodash_1.isNil)(choosenQueue?.promptId)) {
                await handleOpenAi(msg, wbot, ticket, contact, mediaSent, ticketTraking);
                await ticket.update({
                    useIntegration: true,
                    promptId: choosenQueue?.promptId
                });
                // return;
            }
            const body = (0, Mustache_1.default)(`\u200e${choosenQueue.greetingMessage}`, ticket.contact);
            if (choosenQueue.greetingMessage) {
                const sentMessage = await wbot.sendMessage(`${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
                    text: body,
                });
                await (0, exports.verifyMessage)(sentMessage, ticket, contact, false, ticketTraking);
            }
        }
    }
    else {
        if (maxUseBotQueues && maxUseBotQueues !== 0 && ticket.amountUsedBotQueues >= maxUseBotQueues) {
            // await UpdateTicketService({
            //   ticketData: { queueId: queues[0].id },
            //   ticketId: ticket.id
            // });
            return;
        }
        //Regra para desabilitar o chatbot por x minutos/horas após o primeiro envio
        // const ticketTraking = await FindOrCreateATicketTrakingService({ ticketId: ticket.id, companyId });
        let dataLimite = new Date();
        let Agora = new Date();
        if (ticketTraking.chatbotAt !== null) {
            dataLimite.setMinutes(ticketTraking.chatbotAt.getMinutes() + (Number(timeUseBotQueues)));
            if (ticketTraking.chatbotAt !== null && Agora < dataLimite && timeUseBotQueues !== "0" && ticket.amountUsedBotQueues !== 0) {
                return;
            }
        }
        await ticketTraking.update({
            chatbotAt: null,
            contactId: ticket.contactId,
            status: ticket.status,
            queueId: ticket.queueId,
            userId: ticket.userId,
            lastMessage: (0, exports.getBodyMessage)(msg)
        });
        if (ticket.amountUsedBotQueues > 0) {
            await sleep(1000);
            await wbot.sendMessage(`${contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
                text: 'Opção inválida, por favor escolha uma opção válida abaixo:',
            });
            await sleep(500);
        }
        if (buttonActive.value === "text") {
            return botText();
        }
    }
};
const verifyRating = (ticketTraking) => {
    if (ticketTraking &&
        ticketTraking.finishedAt === null &&
        ticketTraking.userId !== null &&
        ticketTraking.ratingAt !== null) {
        return true;
    }
    return false;
};
exports.verifyRating = verifyRating;
const handleRating = async (rate, ticket, ticketTraking) => {
    const io = (0, socket_1.getIO)();
    const companyId = ticket.companyId;
    const { complationMessage } = await (0, ShowWhatsAppService_1.default)(ticket.whatsappId, companyId);
    let finalRate = rate;
    if (rate < 0) {
        finalRate = 0;
    }
    if (rate > 3) {
        finalRate = 3;
    }
    await UserRating_1.default.create({
        ticketId: ticketTraking.ticketId,
        companyId: ticketTraking.companyId,
        userId: ticketTraking.userId,
        ticketTrakingId: ticketTraking.id,
        rate: finalRate,
    });
    if (!(0, lodash_1.isNil)(complationMessage) && complationMessage !== "" && !ticket.isGroup) {
        const body = (0, Mustache_1.default)(`\u200e ${complationMessage}`, ticket.contact);
        const msg = await (0, SendWhatsAppMessage_1.default)({ body, ticket });
        await (0, exports.verifyMessage)(msg, ticket, ticket.contact, false, ticketTraking);
    }
    await ticket.update({
        chatbot: false,
        status: "closed"
    });
    io.to(`company-${ticket.companyId}-open`)
        .to(`queue-${ticket.queueId}-open`)
        .to(ticket.id.toString())
        .emit(`company-${companyId}-ticket`, {
        action: "delete",
        ticket,
        ticketId: ticket.id,
    });
    io.to(`company-${ticket.companyId}-${ticket.status}`)
        .to(`queue-${ticket.queueId}-${ticket.status}`)
        .to(ticket.id.toString())
        .emit(`company-${companyId}-ticket`, {
        action: "update",
        ticket,
        ticketId: ticket.id
    });
};
exports.handleRating = handleRating;
const handleChartbot = async (ticket, msg, wbot, dontReadTheFirstQuestion = false, ticketTraking) => {
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
    const messageBody = (0, exports.getBodyMessage)(msg);
    if (messageBody == "#") {
        // voltar para o menu inicial
        await ticket.update({ queueOptionId: null, chatbot: false, queueId: null });
        await verifyQueue(wbot, msg, ticket, ticket.contact, null, ticketTraking);
        return;
    }
    // voltar para o menu anterior
    if (!(0, lodash_1.isNil)(queue) && !(0, lodash_1.isNil)(ticket.queueOptionId) && messageBody == "0") {
        const option = await QueueOption_1.default.findByPk(ticket.queueOptionId);
        await ticket.update({ queueOptionId: option?.parentId });
        // escolheu uma opção
    }
    else if (!(0, lodash_1.isNil)(queue) && !(0, lodash_1.isNil)(ticket.queueOptionId)) {
        const count = await QueueOption_1.default.count({ where: { parentId: ticket.queueOptionId }, });
        let option = {};
        if (count == 1) {
            option = await QueueOption_1.default.findOne({ where: { parentId: ticket.queueOptionId }, });
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
            await ticket.update({ queueOptionId: option?.id });
        }
        // não linha a primeira pergunta
    }
    else if (!(0, lodash_1.isNil)(queue) && (0, lodash_1.isNil)(ticket.queueOptionId) && !dontReadTheFirstQuestion) {
        const option = queue?.options.find((o) => o.option == messageBody);
        if (option) {
            await ticket.update({ queueOptionId: option?.id });
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
        const companyId = ticket.companyId;
        const buttonActive = await Setting_1.default.findOne({
            where: {
                key: "chatBotType",
                companyId
            }
        });
        // const botList = async () => {
        // const sectionsRows = [];
        // queues.forEach((queue, index) => {
        //   sectionsRows.push({
        //     title: queue.name,
        //     rowId: `${index + 1}`
        //   });
        // });
        // const sections = [
        //   {
        //     rows: sectionsRows
        //   }
        // ];
        //   const listMessage = {
        //     text: formatBody(`\u200e${queue.greetingMessage}`, ticket.contact),
        //     buttonText: "Escolha uma opção",
        //     sections
        //   };
        //   const sendMsg = await wbot.sendMessage(
        //     `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
        //     listMessage
        //   );
        //   await verifyMessage(sendMsg, ticket, ticket.contact);
        // }
        const botButton = async () => {
            const buttons = [];
            queueOptions.forEach((option, i) => {
                buttons.push({
                    buttonId: `${option.option}`,
                    buttonText: { displayText: option.title },
                    type: 4
                });
            });
            buttons.push({
                buttonId: `#`,
                buttonText: { displayText: "Menu inicial *[ 0 ]* Menu anterior" },
                type: 4
            });
            const buttonMessage = {
                text: (0, Mustache_1.default)(`\u200e${queue.greetingMessage}`, ticket.contact),
                buttons,
                headerType: 4
            };
            const sendMsg = await wbot.sendMessage(`${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, buttonMessage);
            await (0, exports.verifyMessage)(sendMsg, ticket, ticket.contact, false, ticketTraking);
        };
        const botText = async () => {
            let options = "";
            queueOptions.forEach((option, i) => { options += `*[ ${option.option} ]* - ${option.title}\n`; });
            options += `\n*[ 0 ]* - Menu anterior`;
            options += `\n*[ # ]* - Menu inicial 1`;
            const textMessage = { text: (0, Mustache_1.default)(`\u200e${queue.greetingMessage}\n\n${options}`, ticket.contact), };
            const myLastMessage = await Message_1.default.findOne({
                where: {
                    ticketId: ticket.id,
                },
                order: [["createdAt", "DESC"]],
            });
            const lastMessageUser = await Message_1.default.findOne({
                where: {
                    ticketId: ticket.id,
                    fromMe: false
                },
                order: [["createdAt", "DESC"]],
            });
            //@ts-ignore
            if (myLastMessage.body.includes(textMessage.text) && (lastMessageUser.body != "#" || lastMessageUser.body != "0")) {
                await wbot.sendMessage(`${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
                    text: 'Opção inválida, por favor escolha uma opção válida abaixo:',
                });
                await sleep(500);
            }
            const sendMsg = await wbot.sendMessage(`${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, textMessage);
            await (0, exports.verifyMessage)(sendMsg, ticket, ticket.contact, false, ticketTraking);
        };
        // if (buttonActive.value === "list") {
        //   return botList();
        // };
        if (buttonActive.value === "button" && QueueOption_1.default.length <= 4) {
            return botButton();
        }
        if (buttonActive.value === "text") {
            // console.log("submenu 10 => ",); // busca minha ultima mensagem e ve se foi a de fila ou a de nao entendeu.
            // const myLastMessage = await Message.findOne({
            //   where: {
            //     ticketId: ticket.id,
            //     fromMe: true
            //   },
            //   order: [["createdAt", "DESC"]],
            // });
            // await wbot.sendMessage(`${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
            //   text: 'Opção inválida, por favor escolha uma opção válida abaixo:',
            // });
            // await sleep(500);
            // console.log("submenu 11 => ", myLastMessage.body);
            return botText();
        }
        if (buttonActive.value === "button" && QueueOption_1.default.length > 4) {
            return botText();
        }
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
        if (currentOption.closeTicket) {
            const listMessage = {
                text: (0, Mustache_1.default)(`\u200e${currentOption.message}`, ticket.contact),
            };
            const sendMsg = await wbot.sendMessage(`${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, listMessage);
            await (0, exports.verifyMessage)(sendMsg, ticket, ticket.contact, false, ticketTraking);
            await (0, UpdateTicketService_1.default)({
                ticketData: { queueOptionId: null, chatbot: false, status: "closed" },
                ticketId: ticket.id,
                companyId: ticket.companyId,
            });
        }
        else if (currentOption.forwardQueueId) {
            const listMessage = {
                text: (0, Mustache_1.default)(`\u200e${currentOption.message}`, ticket.contact),
            };
            const sendMsg = await wbot.sendMessage(`${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, listMessage);
            await (0, exports.verifyMessage)(sendMsg, ticket, ticket.contact, false, ticketTraking);
            await (0, UpdateTicketService_1.default)({
                ticketData: { queueOptionId: null, queueId: currentOption.forwardQueueId, chatbot: false, status: "pending" },
                ticketId: ticket.id,
                companyId: ticket.companyId,
            });
        }
        else if (queueOptions.length > -1) {
            const companyId = ticket.companyId;
            const buttonActive = await Setting_1.default.findOne({ where: { key: "chatBotType", companyId } });
            const botList = async () => {
                const sectionsRows = [];
                queueOptions.forEach((option, i) => {
                    sectionsRows.push({
                        title: option.title,
                        rowId: `${option.option}`
                    });
                });
                sectionsRows.push({
                    title: "Menu inicial *[ 0 ]* Menu anterior",
                    rowId: `#`
                });
                const sections = [
                    {
                        rows: sectionsRows
                    }
                ];
                const listMessage = {
                    text: (0, Mustache_1.default)(`\u200e${currentOption.message}`, ticket.contact),
                    buttonText: "Escolha uma opção",
                    sections
                };
                const sendMsg = await wbot.sendMessage(`${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, listMessage);
                await (0, exports.verifyMessage)(sendMsg, ticket, ticket.contact, false, ticketTraking);
            };
            const botButton = async () => {
                const buttons = [];
                queueOptions.forEach((option, i) => {
                    buttons.push({
                        buttonId: `${option.option}`,
                        buttonText: { displayText: option.title },
                        type: 4
                    });
                });
                buttons.push({
                    buttonId: `#`,
                    buttonText: { displayText: "Menu inicial *[ 0 ]* Menu anterior" },
                    type: 4
                });
                const buttonMessage = {
                    text: (0, Mustache_1.default)(`\u200e${currentOption.message}`, ticket.contact),
                    buttons,
                    headerType: 4
                };
                const sendMsg = await wbot.sendMessage(`${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, buttonMessage);
                await (0, exports.verifyMessage)(sendMsg, ticket, ticket.contact, false, ticketTraking);
            };
            const botText = async () => {
                const lastMessage = await Message_1.default.findOne({
                    where: {
                        ticketId: ticket.id,
                        fromMe: true
                    },
                    order: [["createdAt", "DESC"]]
                });
                let options = "";
                queueOptions.forEach((option, i) => {
                    options += `*[ ${option.option} ]* - ${option.title}\n`;
                });
                options += `\n*[ 0 ]* - Menu anterior`;
                options += `\n*[ # ]* - Menu inicial 2`;
                const textMessage = {
                    text: (0, Mustache_1.default)(`\u200e${currentOption.message}\n\n${options}`, ticket.contact),
                };
                // if (lastMessage.body.includes(textMessage.text)) return;
                const myLastMessage = await Message_1.default.findOne({
                    where: {
                        ticketId: ticket.id,
                    },
                    order: [["createdAt", "DESC"]],
                });
                const lastMessageUser = await Message_1.default.findOne({
                    where: {
                        ticketId: ticket.id,
                        fromMe: false
                    },
                    order: [["createdAt", "DESC"]],
                });
                //@ts-ignore
                if (myLastMessage.body.includes(textMessage.text) && (lastMessageUser.body != "#" || lastMessageUser.body != "0")) {
                    await wbot.sendMessage(`${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
                        text: 'Opção inválida, por favor escolha uma opção válida abaixo:',
                    });
                    await sleep(500);
                }
                const sendMsg = await wbot.sendMessage(`${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, textMessage);
                await (0, exports.verifyMessage)(sendMsg, ticket, ticket.contact, false, ticketTraking);
            };
            if (buttonActive.value === "list") {
                return botList();
            }
            ;
            if (buttonActive.value === "button" && QueueOption_1.default.length <= 4) {
                return botButton();
            }
            if (buttonActive.value === "text") {
                // console.log("caiu aqui => ", buttonActive.value);
                return botText();
            }
            if (buttonActive.value === "button" && QueueOption_1.default.length > 4) {
                return botText();
            }
        }
    }
};
const handleMessageIntegration = async (msg, wbot, queueIntegration, ticket) => {
    console.log("🔗 handleMessageIntegration chamado:", {
        ticketId: ticket.id,
        integrationType: queueIntegration.type,
        body: (0, exports.getBodyMessage)(msg)
    });
    // REGRA PARA DESABILITAR O BOT PARA ALGUM CONTATO
    if (ticket.contact.disableBot) {
        console.log("🚫 Bot desabilitado para este contato");
        return;
    }
    const msgType = (0, exports.getTypeMessage)(msg);
    if (queueIntegration.type === "n8n" || queueIntegration.type === "webhook") {
        if (queueIntegration?.urlN8N) {
            const options = {
                method: "POST",
                url: queueIntegration?.urlN8N,
                headers: {
                    "Content-Type": "application/json"
                },
                json: msg
            };
            try {
                request(options, function (error, response) {
                    if (error) {
                        throw new Error(error);
                    }
                    else {
                        console.log(response.body);
                    }
                });
            }
            catch (error) {
                throw new Error(error);
            }
        }
    }
    else if (queueIntegration.type === "typebot") {
        console.log("🤖 Chamando typebotListenerUniversal...");
        await (0, typebotListenerUniversal_1.default)({
            ticket,
            message: msg,
            wbot: wbot,
            typebot: queueIntegration,
            platform: 'whatsapp'
        });
        console.log("✅ typebotListenerUniversal finalizado");
    }
};
exports.handleMessageIntegration = handleMessageIntegration;
const handleMessage = async (msg, wbot, companyId, isImported = false) => {
    // ✅ ADICIONE ESTE LOG NO INÍCIO DA FUNÇÃO handleMessage:
    if (!msg.key.fromMe && !isImported) {
        console.log("📥 Mensagem recebida:", {
            id: msg.key.id,
            body: (0, exports.getBodyMessage)(msg),
            fromMe: msg.key.fromMe,
            remoteJid: msg.key.remoteJid,
            timestamp: new Date().toISOString()
        });
    }
    if (isImported) {
        (0, addLogs_1.addLogs)({ fileName: `processImportMessagesWppId${wbot.id}.txt`, text: `Importando Mensagem: ${JSON.stringify(msg, null, 2)}>>>>>>>>>>>>>>>>>>>` });
        let id = msg.key.id;
        let existMessage = await Message_1.default.findOne({
            where: { id }
        });
        console.log("existe Mensagem: ", existMessage);
        if (existMessage) {
            await new Promise(r => setTimeout(r, 150));
            console.log("Esta mensagem já existe");
            return;
        }
        else {
            await new Promise(r => setTimeout(r, parseInt(process.env.TIMEOUT_TO_IMPORT_MESSAGE) || 330));
        }
    }
    // else {
    //   await new Promise(r => setTimeout(r, i * 650));
    //   i++
    // }
    let mediaSent;
    // console.log("Mensagem: ", msg)
    if (!(0, exports.isValidMsg)(msg))
        return;
    try {
        let msgContact;
        let groupContact;
        const isGroup = msg.key.remoteJid?.endsWith("@g.us");
        const msgIsGroupBlock = await Setting_1.default.findOne({
            where: {
                companyId,
                key: "CheckMsgIsGroup",
            },
        });
        const bodyMessage = (0, exports.getBodyMessage)(msg);
        const msgType = (0, exports.getTypeMessage)(msg);
        const hasMedia = msg.message?.imageMessage ||
            msg.message?.audioMessage ||
            msg.message?.videoMessage ||
            msg.message?.stickerMessage ||
            msg.message?.documentMessage ||
            msg.message?.documentWithCaptionMessage?.message?.documentMessage ||
            //msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage ||
            //msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.videoMessage ||
            //msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.audioMessage ||
            msg.message?.ephemeralMessage?.message?.audioMessage ||
            msg.message?.ephemeralMessage?.message?.documentMessage ||
            msg.message?.ephemeralMessage?.message?.videoMessage ||
            msg.message?.ephemeralMessage?.message?.stickerMessage ||
            msg.message?.ephemeralMessage?.message?.imageMessage ||
            msg.message?.viewOnceMessage?.message?.imageMessage ||
            msg.message?.viewOnceMessage?.message?.videoMessage ||
            msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message?.imageMessage ||
            msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message?.videoMessage ||
            msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message?.audioMessage ||
            msg.message?.ephemeralMessage?.message?.viewOnceMessage?.message?.documentMessage ||
            msg.message?.documentWithCaptionMessage?.message?.documentMessage ||
            msg.message?.templateMessage?.hydratedTemplate?.imageMessage ||
            msg.message?.templateMessage?.hydratedTemplate?.documentMessage ||
            msg.message?.templateMessage?.hydratedTemplate?.videoMessage ||
            msg.message?.templateMessage?.hydratedFourRowTemplate?.imageMessage ||
            msg.message?.templateMessage?.hydratedFourRowTemplate?.documentMessage ||
            msg.message?.templateMessage?.hydratedFourRowTemplate?.videoMessage ||
            msg.message?.templateMessage?.fourRowTemplate?.imageMessage ||
            msg.message?.templateMessage?.fourRowTemplate?.documentMessage ||
            msg.message?.templateMessage?.fourRowTemplate?.videoMessage ||
            msg.message?.interactiveMessage?.header?.imageMessage ||
            msg.message?.interactiveMessage?.header?.documentMessage ||
            msg.message?.interactiveMessage?.header?.videoMessage ||
            msg.message?.highlyStructuredMessage?.hydratedHsm?.hydratedTemplate?.documentMessage ||
            msg.message?.highlyStructuredMessage?.hydratedHsm?.hydratedTemplate?.videoMessage ||
            msg.message?.highlyStructuredMessage?.hydratedHsm?.hydratedTemplate?.imageMessage ||
            msg.message?.highlyStructuredMessage?.hydratedHsm?.hydratedTemplate?.locationMessage;
        if (msg.key.fromMe) {
            if (/\u200e/.test(bodyMessage))
                return;
            if (!hasMedia &&
                msgType !== "conversation" &&
                msgType !== "extendedTextMessage" &&
                msgType !== "contactMessage" &&
                msgType !== "reactionMessage" &&
                msgType !== "ephemeralMessage" &&
                msgType !== "protocolMessage" &&
                msgType !== "viewOnceMessage" &&
                msgType !== "editedMessage" &&
                msgType !== "hydratedContentText")
                return;
            msgContact = await getContactMessage(msg, wbot);
        }
        else {
            msgContact = await getContactMessage(msg, wbot);
        }
        if (msgIsGroupBlock?.value === "enabled" && isGroup)
            return;
        if (isGroup) {
            const grupoMeta = await wbot.groupMetadata(msg.key.remoteJid);
            const msgGroupContact = {
                id: grupoMeta.id,
                name: grupoMeta.subject
            };
            groupContact = await verifyContact(msgGroupContact, wbot, companyId);
        }
        const whatsapp = await (0, ShowWhatsAppService_1.default)(wbot.id, companyId);
        const contact = await verifyContact(msgContact, wbot, companyId);
        let unreadMessages = 0;
        if (msg.key.fromMe) {
            await cache_1.default.set(`contacts:${contact.id}:unreads`, "0");
        }
        else {
            const unreads = await cache_1.default.get(`contacts:${contact.id}:unreads`);
            unreadMessages = +unreads + 1;
            await cache_1.default.set(`contacts:${contact.id}:unreads`, `${unreadMessages}`);
        }
        const lastMessage = await Message_1.default.findOne({
            where: {
                contactId: contact.id,
                companyId,
            },
            order: [["createdAt", "DESC"]],
        });
        if (!isImported && unreadMessages === 0 && whatsapp.complationMessage && (0, Mustache_1.default)(whatsapp.complationMessage, contact).trim().toLowerCase() === lastMessage?.body.trim().toLowerCase()) {
            return;
        }
        const ticket = await (0, FindOrCreateTicketService_1.default)(contact, wbot.id, unreadMessages, companyId, groupContact, isImported);
        // console.log("ticket: ", ticket.id);
        if (!ticket.queueId && whatsapp.sendIdQueue && whatsapp.sendIdQueue > 0 && whatsapp.queues.length === 0) {
            await ticket.update({
                queueId: whatsapp.sendIdQueue
            });
        }
        await (0, providers_1.provider)(ticket, msg, companyId, contact, wbot);
        // voltar para o menu inicial
        const ticketTraking = await (0, FindOrCreateATicketTrakingService_1.default)({
            ticketId: ticket.id,
            companyId,
            whatsappId: whatsapp?.id
        });
        if (bodyMessage == "#") {
            await ticket.update({
                queueOptionId: null,
                chatbot: true,
                useIntegration: false,
                queueId: null,
            });
            await verifyQueue(wbot, msg, ticket, ticket.contact, null, ticketTraking);
            return;
        }
        if (msgType === "editedMessage" || msgType === "protocolMessage") {
            const msgKeyIdEdited = msgType === "editedMessage" ? msg.message.editedMessage.message.protocolMessage.key.id : msg.message?.protocolMessage.key.id;
            const bodyEdited = msgType === "editedMessage" ? msg.message.editedMessage.message.protocolMessage.editedMessage.conversation : msg.message.protocolMessage?.editedMessage?.extendedTextMessage?.text || msg.message.protocolMessage?.editedMessage?.conversation;
            const io = (0, socket_1.getIO)();
            try {
                const messageToUpdate = await Message_1.default.findOne({
                    where: {
                        id: msgKeyIdEdited,
                        companyId,
                        ticketId: ticket.id
                    }
                });
                if (!messageToUpdate)
                    return;
                await messageToUpdate.update({ isEdited: true, body: bodyEdited });
                await ticket.update({ lastMessage: bodyEdited });
                await ticketTraking.update({
                    lastMessage: bodyEdited,
                });
                io.to(messageToUpdate.ticketId.toString())
                    .to(`company-${ticket.companyId}-${ticket.status}`)
                    .emit(`company-${companyId}-appMessage`, {
                    action: "update",
                    message: messageToUpdate,
                    ticket: ticket,
                    contact: ticket.contact
                });
                io.to(`company-${ticket.companyId}-${ticket.status}`)
                    .to(`company-${ticket.companyId}-notification`)
                    .to(`queue-${ticket.queueId}-notification`)
                    .to(`user-${ticket.userId}`)
                    .to("notification")
                    .to(String(ticket.id))
                    .emit(`company-${companyId}-ticket`, {
                    action: "update",
                    ticket
                });
            }
            catch (err) {
                Sentry.captureException(err);
                logger_1.logger.error(`Error handling message ack. Err: ${err}`);
            }
            return;
        }
        try {
            if (!msg.key.fromMe) {
                /**
                 * Tratamento para avaliação do atendente
                 */
                //  // dev Ricardo: insistir a responder avaliação
                //  const rate_ = Number(bodyMessage);
                //  if ((ticket?.lastMessage.includes('_Insatisfeito_') || ticket?.lastMessage.includes('Por favor avalie nosso atendimento.')) &&  (!isFinite(rate_))) {
                //      const debouncedSentMessage = debounce(
                //        async () => {
                //          await wbot.sendMessage(
                //            `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"
                //            }`,
                //            {
                //              text: 'Por favor avalie nosso atendimento.'
                //            }
                //          );
                //        },
                //        1000,
                //        ticket.id
                //      );
                //      debouncedSentMessage();
                //      return;
                //  }
                //  // dev Ricardo
                if (ticketTraking !== null && (0, exports.verifyRating)(ticketTraking)) {
                    if (!isNaN(parseFloat(bodyMessage))) {
                        (0, exports.handleRating)(parseFloat(bodyMessage), ticket, ticketTraking);
                        await ticketTraking.update({
                            ratingAt: (0, moment_1.default)().toDate(),
                            finishedAt: (0, moment_1.default)().toDate(),
                            rated: true,
                            status: "closed"
                        });
                        return;
                    }
                }
            }
        }
        catch (e) {
            Sentry.captureException(e);
            console.log(e);
        }
        // Atualiza o ticket se a ultima mensagem foi enviada por mim, para que possa ser finalizado.
        try {
            await ticket.update({
                fromMe: msg.key.fromMe,
            });
        }
        catch (e) {
            Sentry.captureException(e);
            console.log(e);
        }
        const isMsgForwarded = msg.message?.extendedTextMessage?.contextInfo?.isForwarded ||
            msg.message?.imageMessage?.contextInfo?.isForwarded ||
            msg.message?.audioMessage?.contextInfo?.isForwarded ||
            msg.message?.videoMessage?.contextInfo?.isForwarded ||
            msg.message?.documentMessage?.contextInfo?.isForwarded;
        if (hasMedia) {
            mediaSent = await verifyMediaMessage(msg, ticket, contact, isMsgForwarded, ticketTraking);
        }
        else {
            await (0, exports.verifyMessage)(msg, ticket, contact, isMsgForwarded, ticketTraking);
        }
        const currentSchedule = await (0, VerifyCurrentSchedule_1.default)(companyId);
        const scheduleType = await Setting_1.default.findOne({
            where: {
                companyId,
                key: "scheduleType"
            }
        });
        try {
            if (!msg.key.fromMe && scheduleType && !ticket.imported) {
                /**
                 * Tratamento para envio de mensagem quando a empresa está fora do expediente
                 */
                if (scheduleType.value === "company" &&
                    !(0, lodash_1.isNil)(currentSchedule) &&
                    (!currentSchedule || currentSchedule.inActivity === false)) {
                    const body = `\u200e ${whatsapp.outOfHoursMessage}`;
                    const debouncedSentMessage = (0, Debounce_1.debounce)(async () => {
                        await wbot.sendMessage(`${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
                            text: body
                        });
                    }, 3000, ticket.id);
                    debouncedSentMessage();
                    return;
                }
                if (scheduleType.value === "queue" && ticket.queueId !== null) {
                    /**
                     * Tratamento para envio de mensagem quando a fila está fora do expediente
                     */
                    const queue = await Queue_1.default.findByPk(ticket.queueId);
                    const { schedules } = queue;
                    const now = (0, moment_1.default)();
                    const weekday = now.format("dddd").toLowerCase();
                    let schedule = null;
                    if (Array.isArray(schedules) && schedules.length > 0) {
                        schedule = schedules.find(s => s.weekdayEn === weekday &&
                            s.startTime !== "" &&
                            s.startTime !== null &&
                            s.endTime !== "" &&
                            s.endTime !== null);
                    }
                    if (scheduleType.value === "queue" &&
                        queue.outOfHoursMessage !== null &&
                        queue.outOfHoursMessage !== "" &&
                        !(0, lodash_1.isNil)(schedule)) {
                        const startTime = (0, moment_1.default)(schedule.startTime, "HH:mm");
                        const endTime = (0, moment_1.default)(schedule.endTime, "HH:mm");
                        if (now.isBefore(startTime) || now.isAfter(endTime)) {
                            const body = `${queue.outOfHoursMessage}`;
                            const debouncedSentMessage = (0, Debounce_1.debounce)(async () => {
                                await wbot.sendMessage(`${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
                                    text: body
                                });
                            }, 3000, ticket.id);
                            debouncedSentMessage();
                            return;
                        }
                    }
                }
            }
        }
        catch (e) {
            Sentry.captureException(e);
            console.log(e);
        }
        try {
            if (!msg.key.fromMe && !ticket.imported) {
                if (ticketTraking !== null && (0, exports.verifyRating)(ticketTraking)) {
                    (0, exports.handleRating)(parseFloat(bodyMessage), ticket, ticketTraking);
                    return;
                }
            }
        }
        catch (e) {
            Sentry.captureException(e);
            console.log(e);
        }
        //openai na conexao
        if (!ticket.imported &&
            !ticket.queue &&
            !isGroup &&
            !msg.key.fromMe &&
            !ticket.userId &&
            !(0, lodash_1.isNil)(whatsapp.promptId)) {
            await handleOpenAi(msg, wbot, ticket, contact, mediaSent, ticketTraking);
        }
        if (!ticket.imported &&
            !msg.key.fromMe &&
            !ticket.isGroup &&
            !ticket.queue &&
            ticket.chatbot &&
            !(0, lodash_1.isNil)(whatsapp.integrationId) &&
            !ticket.useIntegration &&
            !ticket.integrationId // ✅ ADICIONAR: Só executar se não tiver integração ativa
        ) {
            console.log("🆕 Iniciando integração na conexão:", {
                ticketId: ticket.id,
                integrationId: whatsapp.integrationId
            });
            const integrations = await (0, ShowQueueIntegrationService_1.default)(whatsapp.integrationId, companyId);
            await (0, exports.handleMessageIntegration)(msg, wbot, integrations, ticket);
            return;
        }
        //openai na fila
        if (!ticket.imported &&
            !isGroup &&
            !msg.key.fromMe &&
            !ticket.userId &&
            !(0, lodash_1.isNil)(ticket.promptId) &&
            ticket.useIntegration &&
            ticket.queueId) {
            await handleOpenAi(msg, wbot, ticket, contact, mediaSent, ticketTraking);
        }
        console.log("🔍 Estado do ticket antes da verificação do Typebot:", {
            ticketId: ticket.id,
            imported: ticket.imported,
            fromMe: msg.key.fromMe,
            isGroup: ticket.isGroup,
            integrationId: ticket.integrationId,
            useIntegration: ticket.useIntegration,
            userId: ticket.userId,
            body: (0, exports.getBodyMessage)(msg)
        });
        if (!ticket.imported &&
            !msg.key.fromMe &&
            !ticket.isGroup &&
            ticket.integrationId &&
            ticket.useIntegration &&
            !ticket.userId // ✅ Só não processar se tiver usuário atribuído
        ) {
            console.log("🔄 Processando mensagem no Typebot (continuação):", {
                ticketId: ticket.id,
                integrationId: ticket.integrationId,
                useIntegration: ticket.useIntegration,
                hasQueue: !!ticket.queue,
                queueId: ticket.queueId,
                hasUserId: !!ticket.userId,
                body: (0, exports.getBodyMessage)(msg)
            });
            const integrations = await (0, ShowQueueIntegrationService_1.default)(ticket.integrationId, companyId);
            await (0, exports.handleMessageIntegration)(msg, wbot, integrations, ticket);
            // ✅ Se o Typebot processou a mensagem, não continuar para outros fluxos
            return;
        }
        if (!ticket.imported &&
            !ticket.queue &&
            !ticket.isGroup &&
            !msg.key.fromMe &&
            !ticket.userId &&
            whatsapp.queues.length >= 1 &&
            !ticket.useIntegration // ✅ IMPORTANTE: Não executar se já tem integração ativa
        ) {
            await verifyQueue(wbot, msg, ticket, contact, mediaSent, ticketTraking);
            if (ticketTraking.chatbotAt === null) {
                await ticketTraking.update({
                    chatbotAt: (0, moment_1.default)().toDate(),
                });
            }
        }
        const dontReadTheFirstQuestion = ticket.queue === null;
        await ticket.reload();
        try {
            //Fluxo fora do expediente
            if (!msg.key.fromMe && scheduleType && ticket.queueId !== null) {
                /**
                 * Tratamento para envio de mensagem quando a fila está fora do expediente
                 */
                const queue = await Queue_1.default.findByPk(ticket.queueId);
                const { schedules } = queue;
                const now = (0, moment_1.default)();
                const weekday = now.format("dddd").toLowerCase();
                let schedule = null;
                if (Array.isArray(schedules) && schedules.length > 0) {
                    schedule = schedules.find(s => s.weekdayEn === weekday &&
                        s.startTime !== "" &&
                        s.startTime !== null &&
                        s.endTime !== "" &&
                        s.endTime !== null);
                }
                if (scheduleType.value === "queue" &&
                    queue.outOfHoursMessage !== null &&
                    queue.outOfHoursMessage !== "" &&
                    !(0, lodash_1.isNil)(schedule) && !ticket.imported) {
                    const startTime = (0, moment_1.default)(schedule.startTime, "HH:mm");
                    const endTime = (0, moment_1.default)(schedule.endTime, "HH:mm");
                    if (now.isBefore(startTime) || now.isAfter(endTime)) {
                        const body = queue.outOfHoursMessage;
                        const debouncedSentMessage = (0, Debounce_1.debounce)(async () => {
                            await wbot.sendMessage(`${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
                                text: body
                            });
                        }, 3000, ticket.id);
                        debouncedSentMessage();
                        return;
                    }
                }
            }
        }
        catch (e) {
            Sentry.captureException(e);
            console.log(e);
        }
        if (!whatsapp?.queues?.length && !ticket.userId && !isGroup && !msg.key.fromMe) {
            const lastMessage = await Message_1.default.findOne({
                where: {
                    ticketId: ticket.id,
                    fromMe: true
                },
                order: [["createdAt", "DESC"]]
            });
            if (lastMessage && lastMessage.body.includes(whatsapp.greetingMessage)) {
                return;
            }
            if (whatsapp.greetingMessage) {
                const filePath = path_1.default.resolve("public", whatsapp.mediaPath);
                const messagePath = whatsapp.greetingMessage;
                let options = await (0, SendWhatsAppMedia_1.getMessageOptions)(messagePath, filePath, messagePath);
                const debouncedSentMessage = (0, Debounce_1.debounce)(async () => {
                    await wbot.sendMessage(`${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
                        ...options
                    });
                }, 1000, ticket.id);
                debouncedSentMessage();
                return;
            }
        }
        if (whatsapp.queues.length == 1 && ticket.queue) {
            if (ticket.chatbot && !msg.key.fromMe) {
                await handleChartbot(ticket, msg, wbot, dontReadTheFirstQuestion, ticketTraking);
            }
        }
        if (whatsapp.queues.length > 1 && ticket.queue) {
            if (ticket.chatbot && !msg.key.fromMe) {
                await handleChartbot(ticket, msg, wbot, dontReadTheFirstQuestion, ticketTraking);
            }
        }
    }
    catch (err) {
        console.log(err);
        Sentry.captureException(err);
        logger_1.logger.error(`Error handling whatsapp message: Err: ${err}`);
    }
};
exports.handleMessage = handleMessage;
const handleMsgAck = async (msg, chat) => {
    await new Promise((r) => setTimeout(r, 500));
    const io = (0, socket_1.getIO)();
    try {
        const messageToUpdate = await Message_1.default.findByPk(msg.key.id, {
            include: [
                "contact",
                {
                    model: Message_1.default,
                    as: "quotedMsg",
                    include: ["contact"],
                },
            ],
        });
        if (!messageToUpdate)
            return;
        await messageToUpdate.update({ ack: chat });
        io.to(messageToUpdate.ticketId.toString()).emit(`company-${messageToUpdate.companyId}-appMessage`, {
            action: "update",
            message: messageToUpdate,
        });
    }
    catch (err) {
        Sentry.captureException(err);
        logger_1.logger.error(`Error handling message ack 1. Err: ${err}`);
    }
};
const verifyRecentCampaign = async (message, companyId) => {
    if (!message.key.fromMe) {
        const number = message.key.remoteJid.replace(/\D/g, "");
        const campaigns = await Campaign_1.default.findAll({
            where: { companyId, status: "EM_ANDAMENTO", confirmation: true },
        });
        if (campaigns) {
            const ids = campaigns.map((c) => c.id);
            const campaignShipping = await CampaignShipping_1.default.findOne({
                where: { campaignId: { [sequelize_1.Op.in]: ids }, number, confirmation: null },
            });
            if (campaignShipping) {
                await campaignShipping.update({
                    confirmedAt: (0, moment_1.default)(),
                    confirmation: true,
                });
                await queues_1.campaignQueue.add("DispatchCampaign", {
                    campaignShippingId: campaignShipping.id,
                    campaignId: campaignShipping.campaignId,
                }, {
                    delay: (0, queues_1.parseToMilliseconds)((0, queues_1.randomValue)(0, 10)),
                });
            }
        }
    }
};
const verifyCampaignMessageAndCloseTicket = async (message, companyId) => {
    const io = (0, socket_1.getIO)();
    const body = (0, exports.getBodyMessage)(message);
    const isCampaign = /\u200c/.test(body);
    if (message.key.fromMe && isCampaign) {
        const messageRecord = await Message_1.default.findOne({
            where: { id: message.key.id, companyId },
        });
        const ticket = await Ticket_1.default.findByPk(messageRecord.ticketId);
        await ticket.update({ status: "closed" });
        io.to(`company-${ticket.companyId}-open`)
            .to(`queue-${ticket.queueId}-open`)
            .emit(`company-${ticket.companyId}-ticket`, {
            action: "delete",
            ticket,
            ticketId: ticket.id,
        });
        io.to(`company-${ticket.companyId}-${ticket.status}`)
            .to(`queue-${ticket.companyId}-${ticket.status}`)
            .to(ticket.id.toString())
            .emit(`company-${ticket.companyId}-ticket`, {
            action: "update",
            ticket,
            ticketId: ticket.id,
        });
    }
};
const filterMessages = (msg) => {
    if (msg.message?.protocolMessage?.editedMessage)
        return true;
    if (msg.message?.protocolMessage)
        return false;
    if ([
        baileys_1.WAMessageStubType.REVOKE,
        baileys_1.WAMessageStubType.E2E_DEVICE_CHANGED,
        baileys_1.WAMessageStubType.E2E_IDENTITY_CHANGED,
        baileys_1.WAMessageStubType.CIPHERTEXT
    ].includes(msg.messageStubType))
        return false;
    return true;
};
const wbotMessageListener = async (wbot, companyId) => {
    try {
        wbot.ev.on("messages.upsert", async (messageUpsert) => {
            const messages = messageUpsert.messages
                .filter(filterMessages)
                .map(msg => msg);
            if (!messages)
                return;
            messages.forEach(async (message) => {
                const messageExists = await Message_1.default.count({
                    where: { id: message.key.id, companyId }
                });
                if (!messageExists) {
                    await handleMessage(message, wbot, companyId);
                    await verifyRecentCampaign(message, companyId);
                    await verifyCampaignMessageAndCloseTicket(message, companyId);
                }
                if (message.key.remoteJid?.endsWith("@g.us")) {
                    handleMsgAck(message, 2);
                }
            });
        });
        wbot.ev.on("messages.update", (messageUpdate) => {
            if (messageUpdate.length === 0)
                return;
            messageUpdate.forEach(async (message) => {
                wbot.readMessages([message.key]);
                const msgUp = { ...messageUpdate };
                if (msgUp['0']?.update.messageStubType === 1 && msgUp['0']?.key.remoteJid !== 'status@broadcast') {
                    (0, MarkDeleteWhatsAppMessage_1.default)(msgUp['0']?.key.remoteJid, null, msgUp['0']?.key.id, companyId);
                }
                let ack;
                if (message.update.status === 3 && message?.key?.fromMe) {
                    ack = 2;
                }
                else {
                    ack = message.update.status;
                }
                handleMsgAck(message, ack);
            });
        });
        // wbot.ev.on("messages.set", async (messageSet: IMessage) => {
        //   messageSet.messages.filter(filterMessages).map(msg => msg);
        // });
    }
    catch (error) {
        Sentry.captureException(error);
        logger_1.logger.error(`Error handling wbot message listener. Err: ${error}`);
    }
};
exports.wbotMessageListener = wbotMessageListener;
