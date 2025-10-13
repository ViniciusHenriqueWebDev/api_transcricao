import { WASocket, WAMessage } from "@whiskeysockets/baileys";
import * as Sentry from "@sentry/node";
import AppError from "../../errors/AppError";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import GetWbotMessage from "../../helpers/GetWbotMessage";
import Message from "../../models/Message";
// import OldMessage from "../../models/OldMessage";
import Ticket from "../../models/Ticket";

import formatBody from "../../helpers/Mustache";
import { getIO } from "../../libs/socket"; // 🔥 adicionado para emitir eventos

interface Request {
  messageId: string;
  body: string;
}

const EditWhatsAppMessage = async ({
  messageId,
  body,
}: Request): Promise<{ ticket: Ticket; message: Message }> => {

  const message = await Message.findByPk(messageId, {
    include: [
      {
        model: Ticket,
        as: "ticket",
        include: ["contact"]
      }
    ]
  });

  if (!message) {
    throw new AppError("No message found with this ID.");
  }

  const { ticket } = message;

  const wbot = await GetTicketWbot(ticket);

  const msg = JSON.parse(message.dataJson);

  try {
    await wbot.sendMessage(message.remoteJid, {
      text: body,
      edit: msg.key,
    }, {});

    // await OldMessage.upsert(oldMessage);
    await message.update({ body, isEdited: true });
    await ticket.update({ lastMessage: body });

    // 🔥 Correção: emitir evento para atualizar em tempo real
    const io = getIO();
    io.to(ticket.id.toString())
      .to(`company-${ticket.companyId}-${ticket.status}`)
      .to(`company-${ticket.companyId}-notification`)
      .to(`queue-${ticket.queueId || "default"}-${ticket.status}`)
      .emit(`company-${ticket.companyId}-appMessage`, {
        action: "update",
        message,
        ticket,
        contact: ticket.contact
      });

    // 🔥 Garantir que a lista de tickets também seja atualizada
    io.to(`company-${ticket.companyId}`)
      .to(`company-${ticket.companyId}-${ticket.status}`)
      .emit(`company-${ticket.companyId}-ticket`, {
        action: "update",
        ticket
      });

    return { ticket: message.ticket, message: message };
  } catch (err) {
    console.log(err);
    throw new AppError("ERR_EDITING_WAPP_MSG");
  }

};

export default EditWhatsAppMessage;
