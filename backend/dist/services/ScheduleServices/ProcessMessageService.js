"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const User_1 = __importDefault(require("../../models/User"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const Schedule_1 = __importDefault(require("../../models/Schedule"));
const Mustache_1 = __importDefault(require("../../helpers/Mustache"));
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const Queue_1 = __importDefault(require("../../models/Queue"));
const ProcessMessageService = async ({ body, userId, contactId, whatsappId, queueId, scheduleId, sendSignature = false }) => {
    try {
        // Carrega o agendamento para acessar todos os seus dados
        let schedule = null;
        if (scheduleId) {
            schedule = await Schedule_1.default.findByPk(scheduleId, {
                include: [
                    { model: Contact_1.default, as: "contact" },
                    { model: User_1.default, as: "user" },
                    { model: Whatsapp_1.default, as: "whatsapp" },
                    { model: Queue_1.default, as: "queue" }
                ]
            });
        }
        // Carrega o contato se não tiver o schedule
        let contact = null;
        if (!schedule?.contact && contactId) {
            contact = await Contact_1.default.findByPk(contactId);
        }
        // Processa as variáveis do Mustache
        const processedBody = (0, Mustache_1.default)(body, schedule?.contact || contact, schedule);
        // Se não for para enviar assinatura ou não tiver userId, retorna o corpo processado
        if (!sendSignature || !userId) {
            return processedBody;
        }
        // Adiciona assinatura
        // Busca o usuário para obter o nome do atendente
        const user = await User_1.default.findByPk(userId);
        if (!user) {
            return processedBody; // Se não encontrar o usuário, retorna o texto processado
        }
        // Novo formato de assinatura usando o nome completo do usuário
        const signature = `\n\n*Assinado:*\n${user.name}`;
        // Adiciona a assinatura ao final da mensagem
        return `${processedBody}${signature}`;
    }
    catch (error) {
        console.error("Erro ao processar mensagem:", error);
        return body; // Em caso de erro, retorna o texto original
    }
};
exports.default = ProcessMessageService;
