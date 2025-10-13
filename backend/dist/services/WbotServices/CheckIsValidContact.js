"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../../errors/AppError"));
const GetDefaultWhatsApp_1 = __importDefault(require("../../helpers/GetDefaultWhatsApp"));
const wbot_1 = require("../../libs/wbot");
const CheckIsValidContact = async (number, companyId, channel = "whatsapp") => {
    if (channel != "whatsapp") {
        return;
    }
    try {
        const defaultWhatsapp = await (0, GetDefaultWhatsApp_1.default)(companyId);
        const wbot = (0, wbot_1.getWbot)(defaultWhatsapp.id);
        const isValidNumber = await wbot.onWhatsApp(`${number}`);
        if (!isValidNumber) {
            throw new AppError_1.default("invalidNumber");
        }
    }
    catch (err) {
        console.error("❌ Erro na validação WhatsApp:", err.message);
        if (err.message === "invalidNumber") {
            throw new AppError_1.default("ERR_WAPP_INVALID_CONTACT");
        }
        if (err.message === "ERR_WAPP_NOT_INITIALIZED") {
            throw new AppError_1.default("ERR_WAPP_NOT_INITIALIZED");
        }
        throw new AppError_1.default("ERR_WAPP_CHECK_CONTACT");
    }
};
exports.default = CheckIsValidContact;
