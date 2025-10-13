import { subHours } from "date-fns";
import { Op } from "sequelize";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import ShowTicketService from "./ShowTicketService";
import FindOrCreateATicketTrakingService from "./FindOrCreateATicketTrakingService";
import Setting from "../../models/Setting";
import Whatsapp from "../../models/Whatsapp";

interface TicketData {
  status?: string;
  companyId?: number;
  unreadMessages?: number;
}

const FindOrCreateTicketService = async (
  contact: Contact,
  whatsappId: number,
  unreadMessages: number,
  companyId: number,
  groupContact?: Contact,
  isImported?: boolean,
): Promise<Ticket> => {
  // 1️⃣ Busca ticket existente para o contato
  let ticket = await Ticket.findOne({
    where: {
      contactId: groupContact ? groupContact.id : contact.id,
      companyId,
      whatsappId,
      status: {
        [Op.or]: ["open", "pending", "closed"]
      }
    },
    order: [["id", "DESC"]]
  });

  if (ticket) {
    // 🔧 Corrigido: Sempre reabrir ticket se estiver fechado
    if (ticket.status === "closed") {
      await ticket.update({
        status: "pending",
        queueId: null,
        userId: null,
        unreadMessages,
        whatsappId
      });
    } else {
      await ticket.update({ unreadMessages, whatsappId });
    }
  }

  // 2️⃣ Caso não exista ticket, tenta buscar o último atualizado do contato
  if (!ticket) {
    ticket = await Ticket.findOne({
      where: {
        contactId: groupContact ? groupContact.id : contact.id,
        whatsappId,
        companyId
      },
      order: [["updatedAt", "DESC"]]
    });

    if (ticket) {
      await ticket.update({
        status: "pending",
        userId: null,
        unreadMessages,
        queueId: null,
        whatsappId
      });

      await FindOrCreateATicketTrakingService({
        ticketId: ticket.id,
        companyId,
        whatsappId: ticket.whatsappId,
        userId: ticket.userId
      });
    }
  }

  // 3️⃣ Se ainda não encontrou, cria um novo ticket
  if (!ticket) {
    const whatsapp = await Whatsapp.findOne({
      where: { id: whatsappId }
    });

    ticket = await Ticket.create({
      contactId: groupContact ? groupContact.id : contact.id,
      status: "pending",
      isGroup: !!groupContact,
      unreadMessages,
      whatsappId,
      whatsapp,
      companyId,
      imported: isImported ? new Date() : null,
    });

    await FindOrCreateATicketTrakingService({
      ticketId: ticket.id,
      companyId,
      whatsappId,
      userId: ticket.userId
    });
  }

  ticket = await ShowTicketService(ticket.id, companyId);

  return ticket;
};

export default FindOrCreateTicketService;
