"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Ticket_1 = __importDefault(require("../../models/Ticket"));
const Whatsapp_1 = __importDefault(require("../../models/Whatsapp"));
const Contact_1 = __importDefault(require("../../models/Contact"));
const Queue_1 = __importDefault(require("../../models/Queue"));
const User_1 = __importDefault(require("../../models/User"));
const socket_1 = require("../../libs/socket");
const CreateTicketService = async ({ contactId, status, userId, companyId, queueId, whatsappId, channel = "whatsapp" }) => {
    const io = (0, socket_1.getIO)();
    try {
        console.log("🎫 Iniciando criação/reabertura de ticket:", {
            contactId,
            status,
            queueId,
            userId,
            companyId,
            whatsappId,
            channel
        });
        // ✅ BUSCAR QUALQUER TICKET EXISTENTE (ATIVO OU FECHADO)
        let ticket = await Ticket_1.default.findOne({
            where: {
                contactId,
                companyId,
                ...(whatsappId && { whatsappId })
            },
            order: [
                ["status", "ASC"],
                ["updatedAt", "DESC"]
            ],
            include: [
                { model: Contact_1.default, as: "contact" },
                { model: Whatsapp_1.default, as: "whatsapp" },
                { model: Queue_1.default, as: "queue" },
                { model: User_1.default, as: "user" }
            ]
        });
        // ✅ SE NÃO ENCONTROU TICKET ESPECÍFICO DA CONEXÃO, BUSCAR QUALQUER UM
        if (!ticket && whatsappId) {
            ticket = await Ticket_1.default.findOne({
                where: {
                    contactId,
                    companyId
                },
                order: [
                    ["status", "ASC"],
                    ["updatedAt", "DESC"]
                ],
                include: [
                    { model: Contact_1.default, as: "contact" },
                    { model: Whatsapp_1.default, as: "whatsapp" },
                    { model: Queue_1.default, as: "queue" },
                    { model: User_1.default, as: "user" }
                ]
            });
        }
        if (ticket) {
            const isTicketActive = ["open", "pending"].includes(ticket.status);
            const isDifferentUser = ticket.userId && ticket.userId !== userId;
            console.log("🔍 Ticket encontrado:", {
                ticketId: ticket.id,
                status: ticket.status,
                isActive: isTicketActive,
                currentUserId: ticket.userId,
                requestedUserId: userId,
                willTransfer: isDifferentUser
            });
            // ✅ SEMPRE ATUALIZAR PARA O USUÁRIO LOGADO ATUAL
            const updateData = {
                status,
                userId,
                queueId: queueId || ticket.queueId || null,
                unreadMessages: 0,
                chatbot: false,
                fromMe: false
            };
            // ✅ ATUALIZAR CONEXÃO E CHANNEL SE FORNECIDOS
            if (whatsappId && whatsappId !== ticket.whatsappId) {
                updateData.whatsappId = whatsappId;
                const whatsapp = await Whatsapp_1.default.findByPk(whatsappId);
                if (whatsapp?.channel) {
                    updateData.channel = whatsapp.channel;
                }
            }
            // ✅ SE ESTAVA FECHADO, LIMPAR ALGUNS CAMPOS
            if (ticket.status === "closed") {
                updateData.lastMessage = "";
                console.log("🔄 Reabrindo ticket fechado para usuário atual");
            }
            else if (isDifferentUser) {
                console.log("🔄 Transferindo ticket para usuário atual");
            }
            else {
                console.log("🔧 Atualizando ticket existente");
            }
            await ticket.update(updateData);
            await ticket.reload();
            console.log("✅ Ticket atualizado/transferido:", {
                id: ticket.id,
                status: ticket.status,
                queue: ticket.queue?.name,
                user: ticket.user?.name,
                whatsappId: ticket.whatsappId,
                channel: ticket.channel
            });
            // ✅ EMITIR EVENTO
            const action = ticket.status === status && !isDifferentUser ? "update" : "create";
            io.to(`company-${companyId}-mainchannel`)
                .to(`company-${companyId}-${status}`)
                .emit(`company-${companyId}-ticket`, {
                action,
                ticket,
                ticketId: ticket.id
            });
            return ticket;
        }
        // ✅ CRIAR NOVO TICKET APENAS SE REALMENTE NÃO EXISTE
        console.log("✨ Criando novo ticket");
        if (whatsappId) {
            const whatsapp = await Whatsapp_1.default.findByPk(whatsappId);
            if (whatsapp?.channel) {
                channel = whatsapp.channel;
            }
        }
        ticket = await Ticket_1.default.create({
            contactId,
            status,
            queueId,
            userId,
            companyId,
            whatsappId,
            channel,
            unreadMessages: 0,
            isGroup: false,
            chatbot: false,
            useIntegration: false,
            typebotStatus: false,
            fromMe: false,
            amountUsedBotQueues: 0,
            lastMessage: ""
        });
        await ticket.reload({
            include: [
                { model: Contact_1.default, as: "contact" },
                { model: Whatsapp_1.default, as: "whatsapp" },
                { model: Queue_1.default, as: "queue" },
                { model: User_1.default, as: "user" }
            ]
        });
        console.log("✅ Novo ticket criado:", {
            id: ticket.id,
            status: ticket.status,
            channel: ticket.channel
        });
        io.to(`company-${companyId}-mainchannel`)
            .to(`company-${companyId}-${status}`)
            .emit(`company-${companyId}-ticket`, {
            action: "create",
            ticket,
            ticketId: ticket.id
        });
        return ticket;
    }
    catch (error) {
        console.error("❌ Erro ao criar/reabrir ticket:", error);
        // ✅ SE FOR ERRO DE CONSTRAINT, TENTAR BUSCAR O TICKET NOVAMENTE
        if (error.name === "SequelizeUniqueConstraintError") {
            console.log("🔄 Constraint violation - buscando ticket existente...");
            const existingTicket = await Ticket_1.default.findOne({
                where: {
                    contactId,
                    companyId,
                    ...(whatsappId && { whatsappId })
                },
                include: [
                    { model: Contact_1.default, as: "contact" },
                    { model: Whatsapp_1.default, as: "whatsapp" },
                    { model: Queue_1.default, as: "queue" },
                    { model: User_1.default, as: "user" }
                ]
            });
            if (existingTicket) {
                console.log("✅ Ticket existente encontrado - transferindo para usuário atual");
                // ✅ SEMPRE TRANSFERIR PARA O USUÁRIO ATUAL
                return CreateTicketService({
                    contactId,
                    status,
                    userId,
                    companyId,
                    queueId,
                    whatsappId,
                    channel
                });
            }
        }
        throw error;
    }
};
exports.default = CreateTicketService;
