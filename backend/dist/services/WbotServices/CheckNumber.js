"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../../errors/AppError"));
const GetDefaultWhatsApp_1 = __importDefault(require("../../helpers/GetDefaultWhatsApp"));
const wbot_1 = require("../../libs/wbot");
const CheckContactNumber = async (number, companyId, channel = "whatsapp") => {
    if (channel != "whatsapp") {
        return number;
    }
    const isFacebookInstagram = number.length > 15 ||
        !/^\d+$/.test(number) ||
        number.startsWith("100") ||
        number.startsWith("535") ||
        number.startsWith("101") ||
        number.length === 15;
    if (isFacebookInstagram) {
        return number;
    }
    try {
        const wahtsappList = await (0, GetDefaultWhatsApp_1.default)(companyId);
        const wbot = (0, wbot_1.getWbot)(wahtsappList.id);
        const isGroup = number.endsWith("@g.us");
        let numberArray;
        if (isGroup) {
            const grupoMeta = await wbot.groupMetadata(number);
            numberArray = [
                {
                    jid: grupoMeta.id,
                    exists: true
                }
            ];
        }
        else {
            numberArray = await wbot.onWhatsApp(`${number}@s.whatsapp.net`);
        }
        const isNumberExit = numberArray;
        if (!isNumberExit[0]?.exists) {
            throw new AppError_1.default("Este número não está cadastrado no whatsapp");
        }
        return isGroup ? number.split("@")[0] : isNumberExit[0].jid.split("@")[0];
    }
    catch (err) {
        console.error("❌ Erro na verificação de número WhatsApp:", err.message);
        if (err.message === "ERR_WAPP_NOT_INITIALIZED") {
            throw new AppError_1.default("ERR_WAPP_NOT_INITIALIZED");
        }
        throw err;
    }
};
exports.default = CheckContactNumber;
