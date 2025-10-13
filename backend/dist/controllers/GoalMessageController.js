"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendGoalMessage = void 0;
const socket_1 = require("../libs/socket");
const Whatsapp_1 = __importDefault(require("../models/Whatsapp"));
const AppError_1 = __importDefault(require("../errors/AppError"));
const GetWbot_1 = __importDefault(require("../helpers/GetWbot"));
const sendGoalMessage = async (req, res) => {
    const { whatsappId, number, body, goalId, employeeId } = req.body;
    const { companyId } = req.user;
    try {
        // Encontrar a conexão do WhatsApp
        const whatsapp = await Whatsapp_1.default.findOne({
            where: { id: whatsappId, companyId }
        });
        if (!whatsapp) {
            throw new AppError_1.default("Conexão de WhatsApp não encontrada", 404);
        }
        if (whatsapp.status !== "CONNECTED") {
            throw new AppError_1.default("WhatsApp não está conectado", 400);
        }
        let formattedNumber = number.replace(/\D/g, "");
        if (!formattedNumber || formattedNumber.length < 10) {
            throw new AppError_1.default("Número de telefone inválido", 400);
        }
        if (!formattedNumber.includes("@")) {
            formattedNumber = `${formattedNumber}@s.whatsapp.net`;
        }
        const wbot = await (0, GetWbot_1.default)(whatsapp);
        const sentMessage = await wbot.sendMessage(formattedNumber, { text: body });
        const io = (0, socket_1.getIO)();
        io.to(`company-${companyId}-goal`).emit("goal-message", {
            message: body,
            goalId,
            employeeId,
            whatsappId
        });
        return res.status(200).json({
            status: "success",
            message: "Mensagem enviada com sucesso",
            data: {
                messageId: sentMessage.key.id,
                timestamp: sentMessage.messageTimestamp
            }
        });
    }
    catch (err) {
        console.error("Erro ao enviar mensagem:", err);
        if (err instanceof AppError_1.default) {
            return res.status(err.statusCode).json({ error: err.message });
        }
        const errorMsg = err.message || "Erro ao enviar mensagem";
        return res.status(500).json({
            error: `${errorMsg}. Verifique se o número está correto e se a conexão está ativa.`
        });
    }
};
exports.sendGoalMessage = sendGoalMessage;
