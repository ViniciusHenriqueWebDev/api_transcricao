import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import Contact from "../../models/Contact";
import Queue from "../../models/Queue";
import User from "../../models/User";
import { getIO } from "../../libs/socket";
import { Op } from "sequelize";

interface Request {
  contactId: number;
  status: string;
  userId?: number;
  companyId: number;
  queueId?: number;
  whatsappId?: number;
  channel?: string;
}

const CreateTicketService = async ({
  contactId,
  status,
  userId,
  companyId,
  queueId,
  whatsappId,
  channel = "whatsapp"
}: Request): Promise<Ticket> => {
  
  const io = getIO();

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
    let ticket = await Ticket.findOne({
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
        { model: Contact, as: "contact" },
        { model: Whatsapp, as: "whatsapp" },
        { model: Queue, as: "queue" },
        { model: User, as: "user" }
      ]
    });

    // ✅ SE NÃO ENCONTROU TICKET ESPECÍFICO DA CONEXÃO, BUSCAR QUALQUER UM
    if (!ticket && whatsappId) {
      ticket = await Ticket.findOne({
        where: {
          contactId,
          companyId
        },
        order: [
          ["status", "ASC"],
          ["updatedAt", "DESC"]
        ],
        include: [
          { model: Contact, as: "contact" },
          { model: Whatsapp, as: "whatsapp" },
          { model: Queue, as: "queue" },
          { model: User, as: "user" }
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
      const updateData: any = {
        status,
        userId, // ✅ SEMPRE USAR O USUÁRIO LOGADO
        queueId: queueId || ticket.queueId || null,
        unreadMessages: 0,
        chatbot: false,
        fromMe: false
      };

      // ✅ ATUALIZAR CONEXÃO E CHANNEL SE FORNECIDOS
      if (whatsappId && whatsappId !== ticket.whatsappId) {
        updateData.whatsappId = whatsappId;
        
        const whatsapp = await Whatsapp.findByPk(whatsappId);
        if (whatsapp?.channel) {
          updateData.channel = whatsapp.channel;
        }
      }

      // ✅ SE ESTAVA FECHADO, LIMPAR ALGUNS CAMPOS
      if (ticket.status === "closed") {
        updateData.lastMessage = "";
        console.log("🔄 Reabrindo ticket fechado para usuário atual");
      } else if (isDifferentUser) {
        console.log("🔄 Transferindo ticket para usuário atual");
      } else {
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
      const whatsapp = await Whatsapp.findByPk(whatsappId);
      if (whatsapp?.channel) {
        channel = whatsapp.channel;
      }
    }

    ticket = await Ticket.create({
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
        { model: Contact, as: "contact" },
        { model: Whatsapp, as: "whatsapp" },
        { model: Queue, as: "queue" },
        { model: User, as: "user" }
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

  } catch (error) {
    console.error("❌ Erro ao criar/reabrir ticket:", error);
    
    // ✅ SE FOR ERRO DE CONSTRAINT, TENTAR BUSCAR O TICKET NOVAMENTE
    if (error.name === "SequelizeUniqueConstraintError") {
      console.log("🔄 Constraint violation - buscando ticket existente...");
      
      const existingTicket = await Ticket.findOne({
        where: {
          contactId,
          companyId,
          ...(whatsappId && { whatsappId })
        },
        include: [
          { model: Contact, as: "contact" },
          { model: Whatsapp, as: "whatsapp" },
          { model: Queue, as: "queue" },
          { model: User, as: "user" }
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

export default CreateTicketService;