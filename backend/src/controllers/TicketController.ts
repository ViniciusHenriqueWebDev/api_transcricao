import { Request, Response } from "express";
import { Op } from "sequelize";
import Ticket from "../models/Ticket";
import Contact from "../models/Contact";
import User from "../models/User";
import Queue from "../models/Queue";
import TicketTraking from "../models/TicketTraking";
import { getIO } from "../libs/socket";

import CreateTicketService from "../services/TicketServices/CreateTicketService";
import DeleteTicketService from "../services/TicketServices/DeleteTicketService";
import ListTicketsService from "../services/TicketServices/ListTicketsService";
import ShowTicketUUIDService from "../services/TicketServices/ShowTicketFromUUIDService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import UpdateTicketService from "../services/TicketServices/UpdateTicketService";
import ListTicketsServiceKanban from "../services/TicketServices/ListTicketsServiceKanban";
import ListTicketsServiceReport from "../services/TicketServices/ListTicketsServiceReport";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
  status: string;
  date: string;
  startDate: string;
  endDate: string;
  updatedAt?: string;
  showAll: string;
  withUnreadMessages: string;
  queueIds: string;
  tags: string;
  users: string;
  includeClosedTickets: string;
};
type IndexQueryReport = {
  searchParam: string;
  contactId: string;
  whatsappId: string;
  dateFrom: string;
  dateTo: string;
  status: string;
  queueIds: string;
  tags: string;
  users: string;
  page: string;
  pageSize: string;
};

interface TicketData {
  contactId: number;
  status: string;
  queueId: number;
  userId: number;
  whatsappId: string;
  useIntegration: boolean;
  promptId: number;
  integrationId: number;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const {
    pageNumber,
    status,
    date,
    updatedAt,
    searchParam,
    showAll,
    queueIds: queueIdsStringified,
    tags: tagIdsStringified,
    users: userIdsStringified,
    withUnreadMessages
  } = req.query as IndexQuery;

  const userId = req.user.id;
  const { companyId } = req.user;

  let queueIds: number[] = [];
  let tagsIds: number[] = [];
  let usersIds: number[] = [];

  try {
    // Tratamento para queueIds
    if (queueIdsStringified) {
      // Remove aspas extras se existirem
      const cleanQueueIds = queueIdsStringified.replace(/^"(.*)"$/, '$1');
      try {
        queueIds = JSON.parse(cleanQueueIds);
      } catch (error) {
        console.error("Erro ao analisar queueIds:", error);
      }
    }

    // Tratamento para tags
    if (tagIdsStringified) {
      // Remove aspas extras se existirem
      const cleanTagIds = tagIdsStringified.replace(/^"(.*)"$/, '$1');
      try {
        tagsIds = JSON.parse(cleanTagIds);
      } catch (error) {
        console.error("Erro ao analisar tagIds:", error);
      }
    }

    // Tratamento para users
    if (userIdsStringified) {
      // Remove aspas extras se existirem
      const cleanUserIds = userIdsStringified.replace(/^"(.*)"$/, '$1');
      try {
        usersIds = JSON.parse(cleanUserIds);
      } catch (error) {
        console.error("Erro ao analisar userIds:", error);
      }
    }

    const { tickets, count, hasMore } = await ListTicketsService({
      searchParam,
      tags: tagsIds,
      users: usersIds,
      pageNumber,
      status,
      date,
      updatedAt,
      showAll,
      userId,
      queueIds,
      withUnreadMessages,
      companyId,
    });
    
    return res.status(200).json({ tickets, count, hasMore });
  } catch (error) {
    console.error("Erro ao processar filtros de tickets:", error);
    return res.status(500).json({ 
      error: "Erro ao processar filtros de tickets",
      details: error.message 
    });
  }
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { contactId, status, userId, queueId, whatsappId }: TicketData = req.body;
  const { companyId } = req.user;

  const ticket = await CreateTicketService({
    contactId,
    status,
    userId,
    companyId,
    queueId,
    whatsappId: Number(whatsappId), 
  });

  const io = getIO();
  io.to(`company-${companyId}-${ticket.status}`)
    .to(`queue-${ticket.queueId}-${ticket.status}`)
    .emit(`company-${companyId}-ticket`, {
      action: "update",
      ticket
    });
  return res.status(200).json(ticket);
};

export const kanban = async (req: Request, res: Response): Promise<Response> => {
  const {
    pageNumber,
    status,
    date,
    startDate,  // Novos parâmetros
    endDate,    // Novos parâmetros
    updatedAt,
    searchParam,
    showAll,
    queueIds: queueIdsStringified,
    tags: tagIdsStringified,
    users: userIdsStringified,
    withUnreadMessages,
    includeClosedTickets
  } = req.query as IndexQuery;



  const userId = req.user.id;
  const { companyId } = req.user;

  let queueIds: number[] = [];
  let tagsIds: number[] = [];
  let usersIds: number[] = [];

  if (queueIdsStringified) {
    queueIds = JSON.parse(queueIdsStringified);
  }

  if (tagIdsStringified) {
    tagsIds = JSON.parse(tagIdsStringified);
  }

  if (userIdsStringified) {
    usersIds = JSON.parse(userIdsStringified);
  }

  const { tickets, count, hasMore, closedTickets } = await ListTicketsServiceKanban({
    searchParam,
    tags: tagsIds,
    users: usersIds,
    pageNumber,
    status,
    date,
    startDate,          
    endDate,            
    updatedAt,
    showAll,
    userId,
    queueIds,
    withUnreadMessages,
    companyId,
    includeClosedTickets: includeClosedTickets === "true"
  });
  return res.status(200).json({ tickets, count, hasMore, closedTickets });
};

export const report = async (req: Request, res: Response): Promise<Response> => {
  const {
    searchParam,
    contactId,
    whatsappId: whatsappIdsStringified,
    dateFrom,
    dateTo,
    status: statusStringified,
    queueIds: queueIdsStringified,
    tags: tagIdsStringified,
    users: userIdsStringified,
    page: pageNumber,
    pageSize
  } = req.query as IndexQueryReport;

  const userId = req.user.id;
  const { companyId } = req.user;

  let queueIds: number[] = [];
  let whatsappIds: string[] = [];
  let tagsIds: number[] = [];
  let usersIds: number[] = [];
  let statusIds: string[] = [];


  if (statusStringified) {
    statusIds = JSON.parse(statusStringified);
  }

  if (whatsappIdsStringified) {
    whatsappIds = JSON.parse(whatsappIdsStringified);
  }

  if (queueIdsStringified) {
    queueIds = JSON.parse(queueIdsStringified);
  }

  if (tagIdsStringified) {
    tagsIds = JSON.parse(tagIdsStringified);
  }

  if (userIdsStringified) {
    usersIds = JSON.parse(userIdsStringified);
  }

  const { tickets, totalTickets } = await ListTicketsServiceReport(
    companyId,
    {
      searchParam,
      queueIds,
      tags: tagsIds,
      users: usersIds,
      status: statusIds,
      dateFrom,
      dateTo,
      userId,
      contactId,
      whatsappId: whatsappIds
    },
    +pageNumber,
    +pageSize
  );

  return res.status(200).json({ tickets, totalTickets });
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { companyId } = req.user;

  const contact = await ShowTicketService(ticketId, companyId);
  return res.status(200).json(contact);
};

export const showFromUUID = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { uuid } = req.params;

  const ticket: Ticket = await ShowTicketUUIDService(uuid);

  return res.status(200).json(ticket);
};

// No método update, modifique para:

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const { ticketId } = req.params;
    const ticketData = req.body;
    const { companyId } = req.user;

    const result = await UpdateTicketService({
      ticketData,
      ticketId,
      companyId
    });

    if (!result) {
      return res.status(500).json({ error: "Erro ao atualizar o ticket" });
    }

    const { ticket } = result;
    console.log(`Ticket ${ticketId} atualizado com sucesso`);
    
    return res.status(200).json(ticket);
  } catch (error) {
    console.error(`Erro ao atualizar ticket: ${error.message}`, error);
    // Retornar mensagem de erro mais detalhada
    return res.status(500).json({ 
      error: `Erro ao atualizar o ticket: ${error.message}`,
      details: error.stack 
    });
  }
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { ticketId } = req.params;
  const { companyId } = req.user;

  await ShowTicketService(ticketId, companyId);

  const ticket = await DeleteTicketService(ticketId);

  const io = getIO();
  io.to(ticketId)
    .to(`company-${companyId}-${ticket.status}`)
    .to(`company-${companyId}-notification`)
    .to(`queue-${ticket.queueId}-${ticket.status}`)
    .to(`queue-${ticket.queueId}-notification`)
    .emit(`company-${companyId}-ticket`, {
      action: "delete",
      ticketId: +ticketId
    });

  return res.status(200).json({ message: "ticket deleted" });
};

export const closeAll = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { companyId } = req.user;
    const { status } = req.body;
    const io = getIO();

    console.log("🔄 closeAll - Parâmetros:", { companyId, status });

    // ✅ BUSCAR E CONTAR TICKETS SIMPLES
    const { rows: tickets } = await Ticket.findAndCountAll({
      where: { 
        companyId: companyId, 
        status: status 
      },
      order: [["updatedAt", "DESC"]]
    });

    console.log(`📊 Encontrados ${tickets.length} tickets para fechar`);

    if (tickets.length === 0) {
      return res.status(200).json({ 
        message: "Nenhum ticket encontrado para fechar",
        count: 0 
      });
    }

    // ✅ FECHAR TICKETS COM PROMISE.ALL PARA MELHOR PERFORMANCE
    const closePromises = tickets.map(async (ticket) => {
      try {
        await ticket.update({
          status: "closed",
          closedAt: new Date(),
          useIntegration: false,
          promptId: null,
          integrationId: null,
          unreadMessages: 0
        });

        // ✅ EMITIR SOCKET PARA REMOVER DA LISTA
        io.to(`company-${companyId}-${status}`)
          .to(`company-${companyId}-notification`)
          .emit(`company-${companyId}-ticket`, {
            action: "delete",
            ticketId: ticket.id
          });

        console.log(`✅ Ticket ${ticket.id} fechado`);
        return { success: true, ticketId: ticket.id };
      } catch (error) {
        console.error(`❌ Erro ao fechar ticket ${ticket.id}:`, error);
        return { success: false, ticketId: ticket.id, error: error.message };
      }
    });

    // ✅ AGUARDAR TODOS OS FECHAMENTOS
    const results = await Promise.all(closePromises);
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    console.log(`✅ Processo concluído: ${successCount} sucessos, ${errorCount} erros`);

    // ✅ EMITIR EVENTO GLOBAL PARA FORÇAR RELOAD
    setTimeout(() => {
      io.to(`company-${companyId}-${status}`)
        .to(`company-${companyId}-open`)
        .to(`company-${companyId}-pending`)
        .emit('force-tickets-reload', {
          companyId,
          status,
          count: successCount
        });
    }, 1000);

    return res.status(200).json({
      message: `${successCount} tickets fechados com sucesso`,
      count: successCount,
      total: tickets.length,
      errors: errorCount > 0 ? results.filter(r => !r.success) : undefined
    });

  } catch (error) {
    console.error("❌ Erro geral em closeAll:", error);
    return res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message
    });
  }
};