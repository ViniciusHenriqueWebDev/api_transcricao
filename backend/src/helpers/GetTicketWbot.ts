import { WASocket } from "@whiskeysockets/baileys";
import { getWbot } from "../libs/wbot";
import GetDefaultWhatsApp from "./GetDefaultWhatsApp";
import Ticket from "../models/Ticket";
import Whatsapp from "../models/Whatsapp";
import { Store } from "../libs/store";
import sendFacebookMessage from "../services/FacebookServices/sendFacebookMessage";
import AppError from "../errors/AppError";

type Session = WASocket & {
  id?: number;
  store?: Store;
};

const GetTicketWbot = async (ticket: any): Promise<any> => {
  console.log("🔍 GetTicketWbot called with:", {
    ticketId: ticket.id,
    channel: ticket.channel,
    whatsappId: ticket.whatsappId,
    hasWhatsappAssociation: !!ticket.whatsapp
  });

  // ✅ VERIFICAR SE É FACEBOOK/INSTAGRAM PELO CHANNEL
  if (ticket.channel === "facebook" || ticket.channel === "instagram") {
    console.log("📘 Processing Facebook/Instagram ticket:", ticket.id);
    
    // ✅ GARANTIR QUE O TICKET TENHA A ASSOCIAÇÃO WHATSAPP CARREGADA
    if (!ticket.whatsapp && ticket.whatsappId) {
      console.log("🔍 Loading whatsapp association for ticket:", ticket.id);
      const ticketWithWhatsapp = await Ticket.findByPk(ticket.id, {
        include: [
          {
            model: Whatsapp,
            as: "whatsapp",
            attributes: ["id", "name", "channel", "facebookUserToken", "status"]
          }
        ]
      });
      
      if (ticketWithWhatsapp && ticketWithWhatsapp.whatsapp) {
        ticket.whatsapp = ticketWithWhatsapp.whatsapp;
        console.log("✅ Association loaded:", {
          id: ticket.whatsapp.id,
          name: ticket.whatsapp.name,
          channel: ticket.whatsapp.channel,
          hasToken: !!ticket.whatsapp.facebookUserToken
        });
      } else {
        console.log("❌ No whatsapp association found");
      }
    }

    // ✅ SE AINDA NÃO TEM WHATSAPP, BUSCAR POR EMPRESA E CANAL
    if (!ticket.whatsapp && !ticket.whatsappId) {
      console.log("🔍 Searching Facebook connection for company:", ticket.companyId);
      const facebookConnection = await Whatsapp.findOne({
        where: {
          companyId: ticket.companyId,
          channel: ["facebook", "instagram"],
          status: "CONNECTED"
        }
      });

      if (facebookConnection) {
        console.log("✅ Facebook connection found, updating ticket");
        await ticket.update({ 
          whatsappId: facebookConnection.id,
          channel: facebookConnection.channel 
        });
        ticket.whatsapp = facebookConnection;
      }
    }
    
    // ✅ RETORNAR OBJETO COMPATÍVEL
    return {
      id: ticket.whatsappId,
      type: "facebook", 
      channel: ticket.channel,
      sendMessage: async (content: any, options?: any) => {
        const body = typeof content === 'string' ? content : content.text || content.body || content;
        
        return await sendFacebookMessage({
          body,
          ticket,
          quotedMsg: options?.quotedMsg || content.quotedMsg
        });
      }
    };
  }

  // ✅ VERIFICAR SE É FACEBOOK/INSTAGRAM PELO WHATSAPP ASSOCIADO
  if (ticket.whatsapp?.channel === "facebook" || ticket.whatsapp?.channel === "instagram") {
    console.log("📘 Returning Facebook message service for ticket via whatsapp.channel:", ticket.id);
    
    return {
      id: ticket.whatsappId,
      type: "facebook", 
      channel: ticket.whatsapp.channel,
      sendMessage: async (content: any, options?: any) => {
        const body = typeof content === 'string' ? content : content.text || content.body || content;
        
        return await sendFacebookMessage({
          body,
          ticket,
          quotedMsg: options?.quotedMsg || content.quotedMsg
        });
      }
    };
  }

  // ✅ LÓGICA ORIGINAL PARA WHATSAPP
  const { whatsappId } = ticket;
  
  if (!whatsappId) {
    const defaultWhatsapp = await GetDefaultWhatsApp(ticket.companyId);
    if (!defaultWhatsapp) {
      throw new AppError("ERR_NO_DEF_WAPP_FOUND");
    }
    return getWbot(defaultWhatsapp.id);
  }

  const wbot = getWbot(whatsappId);
  return wbot;
};

export default GetTicketWbot;