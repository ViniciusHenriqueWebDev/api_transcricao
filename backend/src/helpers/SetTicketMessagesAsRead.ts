import { proto, WASocket } from "@whiskeysockets/baileys";
// import cacheLayer from "../libs/cache";
import { getIO } from "../libs/socket";
import Message from "../models/Message";
import Ticket from "../models/Ticket";
import { logger } from "../utils/logger";
import GetTicketWbot from "./GetTicketWbot";

const SetTicketMessagesAsRead = async (ticket: Ticket): Promise<void> => {
  // Verificar se o ticket é válido
  if (!ticket || !ticket.id) {
    logger.warn("Ticket inválido enviado para SetTicketMessagesAsRead");
    return;
  }

  // Sempre atualizar o contador de mensagens não lidas para zero
  await ticket.update({ unreadMessages: 0 });

  // Sempre marcar mensagens como lidas no banco de dados
  await Message.update(
    { read: true },
    {
      where: {
        ticketId: ticket.id,
        read: false
      }
    }
  );

  // Emitir evento de atualização para os clientes sem depender do wbot
  const io = getIO();
  io.to(ticket.status)
    .to("notification")
    .emit(`company-${ticket.companyId}-ticket`, {
      action: "updateUnread",
      ticketId: ticket.id
    });

  // ✅ VERIFICAR SE É FACEBOOK/INSTAGRAM - NÃO TENTAR USAR WBOT
  if (ticket.channel === "facebook" || ticket.channel === "instagram") {
    console.log(`📘 Ticket ${ticket.id} é do ${ticket.channel}, não precisa marcar como lido no WhatsApp`);
    return;
  }

  // IMPORTANTE: Retornar sem tentar usar o wbot se estamos em processo de transferência
  // Verificar se o ticket foi atualizado recentemente (possível transferência)
  const updatedAt = new Date(ticket.updatedAt);
  const now = new Date();
  const diffInSeconds = (now.getTime() - updatedAt.getTime()) / 1000;
  
  // Se o ticket foi atualizado há menos de 3 segundos, não tente usar o wbot
  if (diffInSeconds < 3) {
    logger.info(`Ticket ${ticket.id} foi atualizado recentemente. Pulando chamada ao WhatsApp.`);
    return;
  }

  // Se o ticket não tem whatsappId, pare aqui
  if (!ticket.whatsappId) {
    return;
  }

  try {
    // Tente obter o wbot com tratamento de erro
    const wbot = await GetTicketWbot(ticket).catch(err => {
      logger.warn(`Não foi possível obter wbot para ticket ${ticket.id}: ${err.message}`);
      return null;
    });

    // Se não conseguiu obter o wbot, não prossiga
    if (!wbot) return;

    const getJsonMessage = await Message.findAll({
      where: {
        ticketId: ticket.id,
        fromMe: false,
        read: false
      },
      order: [["createdAt", "DESC"]]
    });

    if (getJsonMessage.length > 0) {
      try {
        const lastMessages = JSON.parse(JSON.stringify(getJsonMessage[0].dataJson));
        
        if (lastMessages.key && lastMessages.key.fromMe === false) {
          await (wbot as WASocket).chatModify(
            { markRead: true, lastMessages: [lastMessages] },
            `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`
          );
        }
      } catch (err) {
        logger.warn(`Erro ao marcar mensagens como lidas no WhatsApp: ${err.message}`);
      }
    }
  } catch (err) {
    logger.warn(
      `Não foi possível marcar mensagens como lidas: ${err.message}`
    );
  }
};
export default SetTicketMessagesAsRead;