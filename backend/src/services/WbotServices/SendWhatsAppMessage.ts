import { WAMessage } from "@whiskeysockets/baileys";
import WALegacySocket from "@whiskeysockets/baileys"
import * as Sentry from "@sentry/node";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import sendFacebookMessage from "../FacebookServices/sendFacebookMessage";
import formatBody from "../../helpers/Mustache";
import FindOrCreateATicketTrakingService from "../TicketServices/FindOrCreateATicketTrakingService"; // ✅ IMPORTADO

interface Request {
  body: string;
  ticket: Ticket;
  quotedMsg?: Message;
  isForwarded?: boolean;
}

const SendWhatsAppMessage = async ({
  body,
  ticket,
  quotedMsg,
  isForwarded = false
}: Request): Promise<WAMessage> => {
  
  console.log("🚀 SendWhatsAppMessage called for ticket:", {
    ticketId: ticket.id,
    channel: ticket.channel,
    whatsappChannel: ticket.whatsapp?.channel,
    hasWhatsapp: !!ticket.whatsapp
  });

  // ✅ GARANTE QUE EXISTE UM TRACKING PARA O TICKET
  try {
    await FindOrCreateATicketTrakingService({
      ticketId: ticket.id,
      companyId: ticket.companyId
    });
  } catch (err) {
    console.log("⚠️ Não foi possível criar/verificar o tracking do ticket:", ticket.id, err);
  }

  // ✅ VERIFICAR MÚLTIPLAS FORMAS SE É FACEBOOK/INSTAGRAM
  const isFacebookChannel = 
    ticket.channel === "facebook" || 
    ticket.channel === "instagram" ||
    ticket.whatsapp?.channel === "facebook" || 
    ticket.whatsapp?.channel === "instagram";

  if (isFacebookChannel) {
    console.log("📘 Redirecting to Facebook message service for ticket:", ticket.id);
    return await sendFacebookMessage({ body, ticket, quotedMsg }) as any;
  }

  // ✅ LÓGICA ORIGINAL PARA WHATSAPP
  console.log("📱 Processing WhatsApp message for ticket:", ticket.id);
  
  let options = {};
  const wbot = await GetTicketWbot(ticket);

  const number = `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`;

  if (quotedMsg) {
    const chatMessages = await Message.findOne({
      where: {
        id: quotedMsg.id
      }
    });

    if (chatMessages) {
      const msgFound = JSON.parse(chatMessages.dataJson);

      options = {
        quoted: {
          key: msgFound.key,
          message: {
            extendedTextMessage: msgFound.message.extendedTextMessage
          }
        }
      };
    }
  }

  try {
    const sentMessage = await wbot.sendMessage(number, {
      text: formatBody(body, ticket.contact),
      contextInfo: { forwardingScore: isForwarded ? 2 : 0, isForwarded: isForwarded ? true : false }
    },
    {
      ...options
    });

    await ticket.update({ lastMessage: formatBody(body, ticket.contact) });
    return sentMessage;
  } catch (err) {
    Sentry.captureException(err);
    console.log(err);
    throw new AppError("ERR_SENDING_WAPP_MSG");
  }
};

export default SendWhatsAppMessage;
