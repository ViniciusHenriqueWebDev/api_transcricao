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
exports.initWASocket = exports.dataMessages = exports.removeWbot = exports.restartWbot = exports.getWbot = void 0;
const Sentry = __importStar(require("@sentry/node"));
const baileys_1 = __importStar(require("@whiskeysockets/baileys"));
const sequelize_1 = require("sequelize");
const Whatsapp_1 = __importDefault(require("../models/Whatsapp"));
const logger_1 = require("../utils/logger");
const logger_2 = __importDefault(require("@whiskeysockets/baileys/lib/Utils/logger"));
const AppError_1 = __importDefault(require("../errors/AppError"));
const socket_1 = require("./socket");
const StartWhatsAppSession_1 = require("../services/WbotServices/StartWhatsAppSession");
const DeleteBaileysService_1 = __importDefault(require("../services/BaileysServices/DeleteBaileysService"));
const cache_1 = __importDefault(require("../libs/cache"));
const ImportWhatsAppMessageService_1 = __importDefault(require("../services/WhatsappService/ImportWhatsAppMessageService"));
const date_fns_1 = require("date-fns");
const moment_1 = __importDefault(require("moment"));
const wbotMessageListener_1 = require("../services/WbotServices/wbotMessageListener");
const addLogs_1 = require("../helpers/addLogs");
const node_cache_1 = __importDefault(require("node-cache"));
const authState_1 = __importDefault(require("../helpers/authState"));
const Contact_1 = __importDefault(require("../models/Contact"));
const Ticket_1 = __importDefault(require("../models/Ticket"));
const loggerBaileys = logger_2.default.child({});
loggerBaileys.level = "error";
const sessions = [];
const retriesQrCodeMap = new Map();
const getWbot = (whatsappId) => {
    const sessionIndex = sessions.findIndex(s => s.id === whatsappId);
    if (sessionIndex === -1) {
        throw new AppError_1.default("ERR_WAPP_NOT_INITIALIZED");
    }
    return sessions[sessionIndex];
};
exports.getWbot = getWbot;
const restartWbot = async (companyId, session) => {
    try {
        const options = {
            where: {
                companyId,
            },
            attributes: ["id"],
        };
        const whatsapp = await Whatsapp_1.default.findAll(options);
        whatsapp.map(async (c) => {
            const sessionIndex = sessions.findIndex(s => s.id === c.id);
            if (sessionIndex !== -1) {
                sessions[sessionIndex].ws.close();
            }
        });
    }
    catch (err) {
        logger_1.logger.error(err);
    }
};
exports.restartWbot = restartWbot;
const removeWbot = async (whatsappId, isLogout = true) => {
    try {
        const sessionIndex = sessions.findIndex(s => s.id === whatsappId);
        if (sessionIndex !== -1) {
            if (isLogout) {
                sessions[sessionIndex].logout();
                sessions[sessionIndex].ws.close();
            }
            sessions.splice(sessionIndex, 1);
        }
    }
    catch (err) {
        logger_1.logger.error(err);
    }
};
exports.removeWbot = removeWbot;
exports.dataMessages = {};
const initWASocket = async (whatsapp) => {
    return new Promise((resolve, reject) => {
        try {
            (async () => {
                const io = (0, socket_1.getIO)();
                const whatsappUpdate = await Whatsapp_1.default.findOne({
                    where: { id: whatsapp.id }
                });
                if (!whatsappUpdate)
                    return;
                const { id, name, provider, companyId } = whatsappUpdate;
                const { version, isLatest } = await (0, baileys_1.fetchLatestWaWebVersion)({});
                logger_1.logger.info(`using WA v${version.join(".")}, isLatest: ${isLatest}`);
                logger_1.logger.info(`Starting session ${name}`);
                let retriesQrCode = 0;
                let wsocket = null;
                const { state, saveState } = await (0, authState_1.default)(whatsapp);
                // const msgRetryCounterCache = new NodeCache();
                // wsocket = makeWASocket({
                //   version,
                //   logger: loggerBaileys,
                //   printQRInTerminal: false,
                //   // auth: state as AuthenticationState,
                //   auth: {
                //     creds: state.creds,
                //     /** caching makes the store faster to send/recv messages */
                //     keys: makeCacheableSignalKeyStore(state.keys, logger),
                //   },
                //   // generateHighQualityLinkPreview: false,
                //   // shouldIgnoreJid: jid => isJidBroadcast(jid),
                //   // browser: Browsers.appropriate("Desktop"),
                //   // defaultQueryTimeoutMs: 10000,
                //   // msgRetryCounterCache,
                //   // retryRequestDelayMs: 250,
                //   // transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 3000 },
                //   // connectTimeoutMs: 60_000,
                //   // getMessage: async () => undefined,
                // });
                const msgRetryCounterCache = new node_cache_1.default();
                wsocket = (0, baileys_1.default)({
                    logger: loggerBaileys,
                    printQRInTerminal: false,
                    browser: baileys_1.Browsers.appropriate("Desktop"),
                    auth: {
                        creds: state.creds,
                        keys: (0, baileys_1.makeCacheableSignalKeyStore)(state.keys, logger_1.logger),
                    },
                    version: [2, 3000, 1027590052],
                    // defaultQueryTimeoutMs: 60000,
                    // retryRequestDelayMs: 250,
                    // keepAliveIntervalMs: 1000 * 60 * 10 * 3,
                    msgRetryCounterCache,
                    shouldIgnoreJid: jid => (0, baileys_1.isJidBroadcast)(jid),
                });
                setTimeout(async () => {
                    const wpp = await Whatsapp_1.default.findByPk(whatsapp.id);
                    // console.log("Status:::::",wpp.status)
                    if (wpp?.importOldMessages && wpp.status === "CONNECTED") {
                        let dateOldLimit = new Date(wpp.importOldMessages).getTime();
                        let dateRecentLimit = new Date(wpp.importRecentMessages).getTime();
                        (0, addLogs_1.addLogs)({
                            fileName: `preparingImportMessagesWppId${whatsapp.id}.txt`, forceNewFile: true,
                            text: `Aguardando conexão para iniciar a importação de mensagens:
  Whatsapp nome: ${wpp.name}
  Whatsapp Id: ${wpp.id}
  Criação do arquivo de logs: ${(0, moment_1.default)().format("DD/MM/YYYY HH:mm:ss")}
  Selecionado Data de inicio de importação: ${(0, moment_1.default)(dateOldLimit).format("DD/MM/YYYY HH:mm:ss")}
  Selecionado Data final da importação: ${(0, moment_1.default)(dateRecentLimit).format("DD/MM/YYYY HH:mm:ss")}
  `
                        });
                        const statusImportMessages = new Date().getTime();
                        await wpp.update({
                            statusImportMessages
                        });
                        wsocket.ev.on("messaging-history.set", async (messageSet) => {
                            //if(messageSet.isLatest){
                            const statusImportMessages = new Date().getTime();
                            await wpp.update({
                                statusImportMessages
                            });
                            const whatsappId = whatsapp.id;
                            let filteredMessages = messageSet.messages;
                            let filteredDateMessages = [];
                            filteredMessages.forEach(msg => {
                                const timestampMsg = Math.floor(msg.messageTimestamp["low"] * 1000);
                                if ((0, wbotMessageListener_1.isValidMsg)(msg) && dateOldLimit < timestampMsg && dateRecentLimit > timestampMsg) {
                                    if (msg.key?.remoteJid.split("@")[1] != "g.us") {
                                        (0, addLogs_1.addLogs)({
                                            fileName: `preparingImportMessagesWppId${whatsapp.id}.txt`, text: `Adicionando mensagem para pos processamento:
  Não é Mensagem de GRUPO >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  Data e hora da mensagem: ${(0, moment_1.default)(timestampMsg).format("DD/MM/YYYY HH:mm:ss")}
  Contato da Mensagem : ${msg.key?.remoteJid}
  Tipo da mensagem : ${(0, wbotMessageListener_1.getTypeMessage)(msg)}

  `
                                        });
                                        filteredDateMessages.push(msg);
                                    }
                                    else {
                                        if (wpp?.importOldMessagesGroups) {
                                            (0, addLogs_1.addLogs)({
                                                fileName: `preparingImportMessagesWppId${whatsapp.id}.txt`, text: `Adicionando mensagem para pos processamento:
  Mensagem de GRUPO >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  Data e hora da mensagem: ${(0, moment_1.default)(timestampMsg).format("DD/MM/YYYY HH:mm:ss")}
  Contato da Mensagem : ${msg.key?.remoteJid}
  Tipo da mensagem : ${(0, wbotMessageListener_1.getTypeMessage)(msg)}

  `
                                            });
                                            filteredDateMessages.push(msg);
                                        }
                                    }
                                }
                            });
                            if (!exports.dataMessages?.[whatsappId]) {
                                exports.dataMessages[whatsappId] = [];
                                exports.dataMessages[whatsappId].unshift(...filteredDateMessages);
                            }
                            else {
                                exports.dataMessages[whatsappId].unshift(...filteredDateMessages);
                            }
                            setTimeout(async () => {
                                const wpp = await Whatsapp_1.default.findByPk(whatsappId);
                                io.to(`company-${companyId}-mainchannel`)
                                    .emit(`importMessages-${wpp.companyId}`, {
                                    action: "update",
                                    status: { this: -1, all: -1 }
                                });
                                io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-whatsappSession`, {
                                    action: "update",
                                    session: wpp
                                });
                                //console.log(JSON.stringify(wpp, null, 2));
                            }, 500);
                            setTimeout(async () => {
                                const wpp = await Whatsapp_1.default.findByPk(whatsappId);
                                if (wpp?.importOldMessages) {
                                    let isTimeStamp = !isNaN(new Date(Math.floor(parseInt(wpp?.statusImportMessages))).getTime());
                                    if (isTimeStamp) {
                                        const ultimoStatus = new Date(Math.floor(parseInt(wpp?.statusImportMessages))).getTime();
                                        const dataLimite = +(0, date_fns_1.add)(ultimoStatus, { seconds: +45 }).getTime();
                                        if (dataLimite < new Date().getTime()) {
                                            //console.log("Pronto para come?ar")
                                            (0, ImportWhatsAppMessageService_1.default)(wpp.id);
                                            wpp.update({
                                                statusImportMessages: "Running"
                                            });
                                        }
                                        else {
                                            //console.log("Aguardando inicio")
                                        }
                                    }
                                }
                                io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-whatsappSession`, {
                                    action: "update",
                                    session: wpp
                                });
                            }, 1000 * 45);
                        });
                    }
                }, 2500);
                wsocket.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
                    logger_1.logger.info(`Socket  ${name} Connection Update ${connection || ""} ${lastDisconnect ? lastDisconnect.error.message : ""}`);
                    if (lastDisconnect) {
                        const statusCode = lastDisconnect?.error?.output?.statusCode;
                        logger_1.logger.error(`Disconnection error details: Status code: ${statusCode}, Error message: ${lastDisconnect.error.message}`);
                        logger_1.logger.error(`Stack trace: ${lastDisconnect.error.stack}`);
                    }
                    if (connection === "close") {
                        logger_1.logger.info(`Socket  ${name} Connection Update ${connection || ""} ${lastDisconnect ? lastDisconnect.error.message : ""}`);
                        // Detalhe completo do erro
                        const disconnectError = lastDisconnect?.error;
                        const statusCode = disconnectError?.output?.statusCode;
                        logger_1.logger.error(`Full error details: ${JSON.stringify(disconnectError)}`);
                        if (lastDisconnect?.error?.output?.statusCode === 403) {
                            await whatsapp.update({ status: "PENDING", session: "" });
                            await (0, DeleteBaileysService_1.default)(whatsapp.id);
                            await cache_1.default.delFromPattern(`sessions:${whatsapp.id}:*`);
                            io.to(`company-${companyId}-mainchannel`)
                                .emit(`company-${whatsapp.companyId}-whatsappSession`, {
                                action: "update",
                                session: whatsapp
                            });
                            (0, exports.removeWbot)(id, false);
                        }
                        if (lastDisconnect?.error?.output?.statusCode !== baileys_1.DisconnectReason.loggedOut) {
                            (0, exports.removeWbot)(id, false);
                            setTimeout(() => (0, StartWhatsAppSession_1.StartWhatsAppSession)(whatsapp, whatsapp.companyId), 2000);
                        }
                        else {
                            await whatsapp.update({ status: "PENDING", session: "" });
                            await (0, DeleteBaileysService_1.default)(whatsapp.id);
                            await cache_1.default.delFromPattern(`sessions:${whatsapp.id}:*`);
                            io.to(`company-${companyId}-mainchannel`)
                                .emit(`company-${whatsapp.companyId}-whatsappSession`, {
                                action: "update",
                                session: whatsapp
                            });
                            (0, exports.removeWbot)(id, false);
                            setTimeout(() => (0, StartWhatsAppSession_1.StartWhatsAppSession)(whatsapp, whatsapp.companyId), 2000);
                        }
                    }
                    if (connection === "open") {
                        await whatsapp.update({
                            status: "CONNECTED", qrcode: "", retries: 0,
                            number: wsocket.type === "md" ? (0, baileys_1.jidNormalizedUser)(wsocket.user.id).split("@")[0] : "-"
                        });
                        io.to(`company-${companyId}-mainchannel`)
                            .emit(`company-${whatsapp.companyId}-whatsappSession`, {
                            action: "update",
                            session: whatsapp
                        });
                        console.log("Wsocket open => ", `company-${whatsapp.companyId}-whatsappSession`);
                        const sessionIndex = sessions.findIndex(s => s.id === whatsapp.id);
                        if (sessionIndex === -1) {
                            wsocket.id = whatsapp.id;
                            sessions.push(wsocket);
                        }
                        resolve(wsocket);
                    }
                    if (qr !== undefined) {
                        if (retriesQrCodeMap.get(id) && retriesQrCodeMap.get(id) >= 3) {
                            await whatsappUpdate.update({
                                status: "DISCONNECTED",
                                qrcode: ""
                            });
                            await (0, DeleteBaileysService_1.default)(whatsappUpdate.id);
                            await cache_1.default.delFromPattern(`sessions:${whatsapp.id}:*`);
                            io.to(`company-${companyId}-mainchannel`)
                                .emit(`company-${whatsapp.companyId}-whatsappSession`, {
                                action: "update",
                                session: whatsappUpdate
                            });
                            wsocket.ev.removeAllListeners("connection.update");
                            wsocket.ws.close();
                            wsocket = null;
                            retriesQrCodeMap.delete(id);
                        }
                        else {
                            logger_1.logger.info(`Session QRCode Generate ${name}`);
                            retriesQrCodeMap.set(id, (retriesQrCode += 1));
                            await whatsapp.update({
                                qrcode: qr,
                                status: "qrcode",
                                retries: 0,
                                number: ""
                            });
                            const sessionIndex = sessions.findIndex(s => s.id === whatsapp.id);
                            if (sessionIndex === -1) {
                                wsocket.id = whatsapp.id;
                                sessions.push(wsocket);
                            }
                            io.to(`company-${whatsapp.companyId}-mainchannel`).emit(`company-${whatsapp.companyId}-whatsappSession`, {
                                action: "update",
                                session: whatsapp
                            });
                        }
                    }
                });
                wsocket.ev.on("creds.update", saveState);
                wsocket.ev.on("presence.update", async ({ id: remoteJid, presences }) => {
                    try {
                        logger_1.logger.debug({ remoteJid, presences }, "Received contact presence");
                        if (!presences[remoteJid]?.lastKnownPresence) {
                            console.debug("Received invalid presence");
                            return;
                        }
                        const contact = await Contact_1.default.findOne({
                            where: {
                                number: remoteJid.replace(/\D/g, ""),
                                companyId: whatsapp.companyId
                            }
                        });
                        if (!contact) {
                            return;
                        }
                        const ticket = await Ticket_1.default.findOne({
                            where: {
                                contactId: contact.id,
                                whatsappId: whatsapp.id,
                                status: {
                                    [sequelize_1.Op.or]: ["open", "pending"]
                                }
                            }
                        });
                        if (ticket) {
                            io.to(ticket.id.toString())
                                .to(`company-${whatsapp.companyId}-${ticket.status}`)
                                .to(`queue-${ticket.queueId}-${ticket.status}`)
                                .emit(`company-${whatsapp.companyId}-presence`, {
                                ticketId: ticket.id,
                                presence: presences[remoteJid].lastKnownPresence
                            });
                        }
                    }
                    catch (error) {
                        logger_1.logger.error({ remoteJid, presences }, "presence.update: error processing");
                        if (error instanceof Error) {
                            logger_1.logger.error(`Error: ${error.name} ${error.message}`);
                        }
                        else {
                            logger_1.logger.error(`Error was object of type: ${typeof error}`);
                        }
                    }
                });
            })();
        }
        catch (error) {
            Sentry.captureException(error);
            console.log(error);
            reject(error);
        }
    });
};
exports.initWASocket = initWASocket;
