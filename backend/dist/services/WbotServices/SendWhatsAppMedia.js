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
exports.getMessageOptions = void 0;
const Sentry = __importStar(require("@sentry/node"));
const fs_1 = __importDefault(require("fs"));
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const ffmpeg_1 = __importDefault(require("@ffmpeg-installer/ffmpeg"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const GetTicketWbot_1 = __importDefault(require("../../helpers/GetTicketWbot"));
const mime_types_1 = __importDefault(require("mime-types"));
const Mustache_1 = __importDefault(require("../../helpers/Mustache"));
const publicFolder = path_1.default.resolve(__dirname, "..", "..", "..", "public");
const processAudio = async (audio) => {
    const outputAudio = `${publicFolder}/${new Date().getTime()}.mp3`;
    return new Promise((resolve, reject) => {
        (0, child_process_1.exec)(`${ffmpeg_1.default.path} -i ${audio} -vn -ab 128k -ar 44100 -f ipod ${outputAudio} -y`, (error, _stdout, _stderr) => {
            if (error)
                reject(error);
            fs_1.default.unlinkSync(audio);
            resolve(outputAudio);
        });
    });
};
const processAudioFile = async (audio) => {
    const outputAudio = `${publicFolder}/${new Date().getTime()}.mp3`;
    return new Promise((resolve, reject) => {
        (0, child_process_1.exec)(`${ffmpeg_1.default.path} -i ${audio} -vn -ar 44100 -ac 2 -b:a 192k ${outputAudio}`, (error, _stdout, _stderr) => {
            if (error)
                reject(error);
            fs_1.default.unlinkSync(audio);
            resolve(outputAudio);
        });
    });
};
const getMessageOptions = async (fileName, pathMedia, body) => {
    const mimeType = mime_types_1.default.lookup(pathMedia);
    const typeMessage = mimeType.split("/")[0];
    try {
        if (!mimeType) {
            throw new Error("Invalid mimetype");
        }
        let options;
        if (typeMessage === "video") {
            options = {
                video: fs_1.default.readFileSync(pathMedia),
                caption: body ? body : '',
                fileName: fileName
            };
        }
        else if (typeMessage === "audio") {
            const typeAudio = true;
            const convert = await processAudio(pathMedia);
            if (typeAudio) {
                options = {
                    audio: fs_1.default.readFileSync(convert),
                    mimetype: typeAudio ? "audio/mp4" : mimeType,
                    caption: body ? body : null,
                    ptt: true
                };
            }
            else {
                options = {
                    audio: fs_1.default.readFileSync(convert),
                    mimetype: typeAudio ? "audio/mp4" : mimeType,
                    caption: body ? body : null,
                    ptt: true
                };
            }
        }
        else if (typeMessage === "document") {
            options = {
                document: fs_1.default.readFileSync(pathMedia),
                caption: body ? body : null,
                fileName: fileName,
                mimetype: mimeType
            };
        }
        else if (typeMessage === "application") {
            options = {
                document: fs_1.default.readFileSync(pathMedia),
                caption: body ? body : null,
                fileName: fileName,
                mimetype: mimeType
            };
        }
        else {
            options = {
                image: fs_1.default.readFileSync(pathMedia),
                caption: body ? body : null
            };
        }
        return options;
    }
    catch (e) {
        Sentry.captureException(e);
        console.log(e);
        return null;
    }
};
exports.getMessageOptions = getMessageOptions;
const SendWhatsAppMedia = async ({ media, ticket, body, isForwarded = false, isPrivate = false }) => {
    try {
        const wbot = await (0, GetTicketWbot_1.default)(ticket);
        const pathMedia = media.path;
        const typeMessage = media.mimetype.split("/")[0];
        let options;
        const bodyMessage = (0, Mustache_1.default)(body, ticket.contact);
        if (typeMessage === "video") {
            options = {
                video: fs_1.default.readFileSync(pathMedia),
                caption: bodyMessage,
                fileName: media.originalname,
                contextInfo: { forwardingScore: isForwarded ? 2 : 0, isForwarded: isForwarded }
            };
        }
        else if (typeMessage === "audio") {
            // ✅ CONVERSÃO PARA OGG OPUS (compatível com WhatsApp Mobile)
            const outputAudio = `${publicFolder}/${new Date().getTime()}.ogg`;
            await new Promise((resolve, reject) => {
                (0, child_process_1.exec)(`${ffmpeg_1.default.path} -i "${pathMedia}" -c:a libopus -b:a 64k -ar 48000 "${outputAudio}" -y`, (error, _stdout, _stderr) => {
                    if (error)
                        reject(error);
                    fs_1.default.unlinkSync(pathMedia);
                    resolve(outputAudio);
                });
            });
            options = {
                audio: fs_1.default.readFileSync(outputAudio),
                mimetype: "audio/ogg; codecs=opus",
                fileName: "audio.ogg",
                ptt: true,
                contextInfo: { forwardingScore: isForwarded ? 2 : 0, isForwarded: isForwarded }
            };
        }
        else if (typeMessage === "document" || typeMessage === "text") {
            options = {
                document: fs_1.default.readFileSync(pathMedia),
                caption: bodyMessage,
                fileName: media.originalname,
                mimetype: media.mimetype,
                contextInfo: { forwardingScore: isForwarded ? 2 : 0, isForwarded: isForwarded }
            };
        }
        else if (typeMessage === "application") {
            options = {
                document: fs_1.default.readFileSync(pathMedia),
                caption: bodyMessage,
                fileName: media.originalname,
                mimetype: media.mimetype,
                contextInfo: { forwardingScore: isForwarded ? 2 : 0, isForwarded: isForwarded }
            };
        }
        else {
            options = {
                image: fs_1.default.readFileSync(pathMedia),
                caption: bodyMessage,
                contextInfo: { forwardingScore: isForwarded ? 2 : 0, isForwarded: isForwarded }
            };
        }
        const sentMessage = await wbot.sendMessage(`${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`, {
            ...options
        });
        await ticket.update({ lastMessage: bodyMessage });
        return {
            ...sentMessage,
            key: sentMessage.key || {
                id: sentMessage.key?.id || `msg_${Date.now()}`,
                remoteJid: `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
                fromMe: true
            }
        };
    }
    catch (err) {
        Sentry.captureException(err);
        console.log(err);
        throw new AppError_1.default("ERR_SENDING_WAPP_MSG");
    }
};
exports.default = SendWhatsAppMedia;
