import { WASocket, proto } from "@whiskeysockets/baileys";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import { Store } from "../../libs/store";
import ShowDialogChatBotsServices from "../DialogChatBotsServices/ShowDialogChatBotsServices";
import ShowQueueService from "../QueueService/ShowQueueService";
import ShowChatBotServices from "../ChatBotServices/ShowChatBotServices";
import DeleteDialogChatBotsServices from "../DialogChatBotsServices/DeleteDialogChatBotsServices";
import ShowChatBotByChatbotIdServices from "../ChatBotServices/ShowChatBotByChatbotIdServices";
import CreateDialogChatBotsServices from "../DialogChatBotsServices/CreateDialogChatBotsServices";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import formatBody from "../../helpers/Mustache";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import Chatbot from "../../models/Chatbot";
import User from "../../models/User";
import { sendText } from "../FacebookServices/graphAPI";

type Session = WASocket & {
  id?: number;
  store?: Store;
};

const isNumeric = (value: string) => /^-?\d+$/.test(value);

export const deleteAndCreateDialogStage = async (
  contact: Contact,
  chatbotId: number,
  ticket: Ticket
) => {
  try {
    await DeleteDialogChatBotsServices(contact.id);
    const bots = await ShowChatBotByChatbotIdServices(chatbotId);
    if (!bots) {
      await ticket.update({ isBot: false });
    }
    return await CreateDialogChatBotsServices({
      awaiting: 1,
      contactId: contact.id,
      chatbotId,
      queueId: bots.queueId
    });
  } catch (error) {
    await ticket.update({ isBot: false });
  }
};

const sendMessage = async (
  wbot: Session,
  contact: Contact,
  ticket: Ticket,
  body: string
) => {
  const sentMessage = await sendText(
    contact.number,
    formatBody(body, contact),
    ticket.whatsapp.facebookUserToken
  );
};

const sendDialog = async (
  choosenQueue: Chatbot,
  contact: Contact,
  ticket: Ticket
) => {
  const showChatBots = await ShowChatBotServices(choosenQueue.id);
  if (showChatBots.options) {
    // ✅ VERIFICAR SE É FACEBOOK PARA LIMITAR OPÇÕES
    const isFacebook = ticket.whatsapp?.channel === 'facebook' ||
      ticket.whatsapp?.channel === 'instagram';

    let options = "";
    const maxOptions = isFacebook ? 5 : showChatBots.options.length; // Limitar a 5 opções no Facebook

    const optionsToShow = showChatBots.options.slice(0, maxOptions);

    optionsToShow.forEach((option, index) => {
      options += `*${index + 1}* - ${option.name}\n`;
    });

    // ✅ MENSAGEM MAIS COMPACTA PARA FACEBOOK
    let body;
    if (isFacebook) {
      body = `${choosenQueue.greetingMessage}\n\n${options}`;
      if (showChatBots.options.length > maxOptions) {
        body += `\n*0* - Ver mais opções`;
      }
      body += `\n*#* - Menu principal`;
    } else {
      // WhatsApp - mensagem completa
      const optionsBack = options.length > 0
        ? `${options}\n*#* Voltar para o menu principal`
        : options;
      body = `\u200e${choosenQueue.greetingMessage}\n\n${optionsBack}`;
    }

    console.log(`📤 Sending ${isFacebook ? 'Facebook' : 'WhatsApp'} menu with ${optionsToShow.length} options`);

    const sendOption = await sendText(
      contact.number,
      formatBody(body, contact),
      ticket.whatsapp.facebookUserToken || null
    );
    return sendOption;
  }

  const body = `\u200e${choosenQueue.greetingMessage}`;
  const send = await sendText(
    contact.number,
    formatBody(body, contact),
    ticket.whatsapp.facebookUserToken
  );
  return send;
};

const backToMainMenu = async (
  wbot: Session,
  contact: Contact,
  ticket: Ticket
) => {
  await UpdateTicketService({
    ticketData: { queueId: null },
    ticketId: ticket.id,
    companyId: ticket.companyId
  });
  
  const { queues, greetingMessage } = await ShowWhatsAppService(wbot.id!, ticket.companyId);

  let options = "";

  queues.forEach((option, index) => {
    options += `*${index + 1}* - ${option.name}\n`;
  });

  const body = formatBody(`\u200e${greetingMessage}\n\n${options}`, contact);
  await sendMessage(wbot, contact, ticket, body);

  const deleteDialog = await DeleteDialogChatBotsServices(contact.id);
  return deleteDialog;
};

export const sayChatbot = async (
  queueId: number,
  wbot: any,
  ticket: Ticket,
  contact: Contact,
  msg: any
): Promise<any> => {
  const selectedOption = msg.text;
  if (!queueId && selectedOption && msg.is_echo) return;

  const getStageBot = await ShowDialogChatBotsServices(contact.id);

  if (selectedOption === "#") {
    const backTo = await backToMainMenu(wbot, contact, ticket);
    return backTo;
  }

  if (!getStageBot) {
    const queue = await ShowQueueService(queueId, ticket.companyId);
    const selectedOption = msg.text

    // Verificar se a queue tem chatbots ou usar uma estrutura alternativa
    const chatbots = (queue as any).chatbots || (queue as any).Chatbots || [];
    const choosenQueue = chatbots[+selectedOption - 1];
    
    if (!choosenQueue?.greetingMessage) {
      await DeleteDialogChatBotsServices(contact.id);
      return;
    } // nao tem mensagem de boas vindas
    
    if (choosenQueue) {
      if (choosenQueue.isAgent) {
        const getUserByName = await User.findOne({
          where: {
            name: choosenQueue.name
          }
        });
        const ticketUpdateAgent = {
          ticketData: {
            userId: getUserByName.id,
            status: "open" as const,
          },
          ticketId: ticket.id,
          companyId: ticket.companyId
        };
        await UpdateTicketService(ticketUpdateAgent);
      }
      await deleteAndCreateDialogStage(contact, choosenQueue.id, ticket);
      const send = await sendDialog(choosenQueue, contact, ticket);
      return send;
    }
  }

  if (getStageBot) {
    const selected = isNumeric(selectedOption) ? selectedOption : 1;
    const bots = await ShowChatBotServices(getStageBot.chatbotId);
    const choosenQueue = bots.options[+selected - 1]
      ? bots.options[+selected - 1]
      : bots.options[0];
    if (!choosenQueue.greetingMessage) {
      await DeleteDialogChatBotsServices(contact.id);
      return;
    } // nao tem mensagem de boas vindas
    if (choosenQueue) {
      if (choosenQueue.isAgent) {
        const getUserByName = await User.findOne({
          where: {
            name: choosenQueue.name
          }
        });
        const ticketUpdateAgent = {
          ticketData: {
            userId: getUserByName.id,
            status: "open" as const
          },
          ticketId: ticket.id,
          companyId: ticket.companyId
        };
        await UpdateTicketService(ticketUpdateAgent);
      }
      await deleteAndCreateDialogStage(contact, choosenQueue.id, ticket);
      const send = await sendDialog(choosenQueue, contact, ticket);
      return send;
    }
  }
};