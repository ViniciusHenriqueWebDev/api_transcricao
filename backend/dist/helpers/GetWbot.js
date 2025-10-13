"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../errors/AppError"));
const wbot_1 = require("../libs/wbot");
const GetWbot = async (whatsapp) => {
    const wbot = (0, wbot_1.getWbot)(whatsapp.id);
    if (!wbot) {
        throw new AppError_1.default("ERR_WAPP_NOT_INITIALIZED");
    }
    return wbot;
};
exports.default = GetWbot;
