import { Op, fn, where, col, Filterable, Includeable } from "sequelize";
import { startOfDay, endOfDay, parseISO } from "date-fns";

import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
import Message from "../../models/Message";
import Queue from "../../models/Queue";
import User from "../../models/User";
import ShowUserService from "../UserServices/ShowUserService";
import Tag from "../../models/Tag";
import TicketTag from "../../models/TicketTag";
import { intersection } from "lodash";
import Whatsapp from "../../models/Whatsapp";

interface Request {
  searchParam?: string;
  pageNumber?: string;
  status?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  updatedAt?: string;
  showAll?: string;
  userId: string;
  withUnreadMessages?: string;
  queueIds: number[];
  tags: number[];
  users: number[];
  companyId: number;
  includeClosedTickets?: boolean;
}

interface Response {
  tickets: Ticket[];
  count: number;
  hasMore: boolean;
  closedTickets?: Ticket[];
}

const ListTicketsServiceKanban = async ({
  searchParam = "",
  pageNumber = "1",
  queueIds,
  tags,
  users,
  status,
  date,
  startDate,
  endDate,
  updatedAt,
  showAll,
  userId,
  withUnreadMessages,
  companyId,
  includeClosedTickets = false
}: Request): Promise<Response> => {
  let user = await ShowUserService(userId);
  const isAdmin = user.profile === "admin" || user.profile === "supervisor";
  let whereCondition: Filterable["where"] = {
    companyId // Sempre aplicar o filtro de empresa
  };

  // Configurar condições padrão com base no perfil e filtros de data
  if (startDate && endDate) {
    // Com filtro de data, excluir tickets fechados da lista principal
    if (isAdmin) {
      whereCondition = {
        ...whereCondition,
        queueId: { [Op.or]: [queueIds, null] },
        status: { [Op.ne]: "closed" } // Excluir tickets fechados
      };
    } else {
      whereCondition = {
        ...whereCondition,
        [Op.or]: [{ userId }, { status: "pending" }],
        queueId: { [Op.or]: [queueIds, null] },
        status: { [Op.ne]: "closed" } // Excluir tickets fechados
      };
    }
  } else {
    // Sem filtro de data, comportamento padrão do kanban
    if (isAdmin) {
      whereCondition = {
        ...whereCondition,
        queueId: { [Op.or]: [queueIds, null] },
        status: { [Op.or]: ["pending", "open"] }
      };
    } else {
      whereCondition = {
        ...whereCondition,
        [Op.or]: [{ userId }, { status: "pending" }],
        queueId: { [Op.or]: [queueIds, null] },
        status: { [Op.or]: ["pending", "open"] }
      };
    }
  }

  // Condições para inclusão de modelos relacionados
  const includeCondition: Includeable[] = [
    {
      model: Contact,
      as: "contact",
      attributes: ["id", "name", "number", "email"]
    },
    {
      model: Queue,
      as: "queue",
      attributes: ["id", "name", "color"]
    },
    {
      model: User,
      as: "user",
      attributes: ["id", "name"]
    },
    {
      model: Tag,
      as: "tags",
      attributes: ["id", "name", "color"]
    },
    {
      model: Whatsapp,
      as: "whatsapp",
      attributes: ["name"]
    },
  ];

  // Sobrescrever condições se showAll for true, mas manter exclusão de fechados
  if (showAll === "true") {
    whereCondition = {
      ...whereCondition,
      queueId: { [Op.or]: [queueIds, null] },
      // Manter exclusão de tickets fechados se filtro de data estiver ativo
      ...(startDate && endDate ? { status: { [Op.ne]: "closed" } } : {})
    };
  }

  // Aplicar filtro de busca por texto
  if (searchParam) {
    const sanitizedSearchParam = searchParam.toLocaleLowerCase().trim();

    includeCondition.push({
      model: Message,
      as: "messages",
      attributes: ["id", "body"],
      where: {
        body: where(
          fn("LOWER", col("body")),
          "LIKE",
          `%${sanitizedSearchParam}%`
        )
      },
      required: false,
      duplicating: false
    });

    whereCondition = {
      ...whereCondition,
      [Op.or]: [
        {
          "$contact.name$": where(
            fn("LOWER", col("contact.name")),
            "LIKE",
            `%${sanitizedSearchParam}%`
          )
        },
        { "$contact.number$": { [Op.like]: `%${sanitizedSearchParam}%` } },
        {
          "$message.body$": where(
            fn("LOWER", col("body")),
            "LIKE",
            `%${sanitizedSearchParam}%`
          )
        }
      ]
    };
  }

  // Aplicar filtros de data de forma mais robusta
  if (startDate && endDate) {
    try {
      const startDateTime = startOfDay(parseISO(startDate));
      const endDateTime = endOfDay(parseISO(endDate));

      // Verificar se as datas são válidas
      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        throw new Error("Data inválida");
      }

      whereCondition = {
        ...whereCondition,
        createdAt: {
          [Op.between]: [+startDateTime, +endDateTime]
        }
      };

      console.log(`Filtro de data aplicado: ${startDate} até ${endDate}`);
      console.log(`Timestamps: ${+startDateTime} até ${+endDateTime}`);
    } catch (error) {
      console.error("Erro ao processar filtro de data:", error);
      // Em caso de erro, não aplicar filtro de data
    }
  } else if (date) {
    try {
      const dateObj = parseISO(date);
      whereCondition = {
        ...whereCondition,
        createdAt: {
          [Op.between]: [+startOfDay(dateObj), +endOfDay(dateObj)]
        }
      };
    } catch (error) {
      console.error("Erro ao processar data:", error);
    }
  }

  // Aplicar filtro de data de atualização se fornecido
  if (updatedAt) {
    try {
      const updatedAtDate = parseISO(updatedAt);
      whereCondition = {
        ...whereCondition,
        updatedAt: {
          [Op.between]: [
            +startOfDay(updatedAtDate),
            +endOfDay(updatedAtDate)
          ]
        }
      };
    } catch (error) {
      console.error("Erro ao processar updatedAt:", error);
    }
  }

  // Aplicar filtro de mensagens não lidas
  if (withUnreadMessages === "true") {
    const userQueueIds = user.queues.map(queue => queue.id);

    if (isAdmin) {
      whereCondition = {
        ...whereCondition,
        queueId: { [Op.or]: [userQueueIds, null] },
        unreadMessages: { [Op.gt]: 0 }
      };
    } else {
      whereCondition = {
        ...whereCondition,
        [Op.or]: [{ userId }, { status: "pending" }],
        queueId: { [Op.or]: [userQueueIds, null] },
        unreadMessages: { [Op.gt]: 0 }
      };
    }
  }

  // Aplicar filtros de tags
  if (Array.isArray(tags) && tags.length > 0) {
    const ticketsTagFilter: any[] | null = [];
    for (let tag of tags) {
      const ticketTags = await TicketTag.findAll({
        where: { tagId: tag }
      });
      if (ticketTags) {
        ticketsTagFilter.push(ticketTags.map(t => t.ticketId));
      }
    }

    if (ticketsTagFilter.length > 0) {
      const ticketsIntersection: number[] = intersection(...ticketsTagFilter);

      whereCondition = {
        ...whereCondition,
        id: {
          [Op.in]: ticketsIntersection.length > 0 ? ticketsIntersection : [0] // Se vazio, não retorna nada
        }
      };
    }
  }

  // Aplicar filtros de usuários
  if (Array.isArray(users) && users.length > 0) {
    const ticketsUserFilter: any[] | null = [];
    for (let user of users) {
      const ticketUsers = await Ticket.findAll({
        where: { userId: user }
      });
      if (ticketUsers) {
        ticketsUserFilter.push(ticketUsers.map(t => t.id));
      }
    }

    if (ticketsUserFilter.length > 0) {
      const ticketsIntersection: number[] = intersection(...ticketsUserFilter);

      whereCondition = {
        ...whereCondition,
        id: {
          [Op.in]: ticketsIntersection.length > 0 ? ticketsIntersection : [0]
        }
      };
    }
  }

  // Paginação
  const limit = 40;
  const offset = limit * (+pageNumber - 1);

  console.log("Condição final para busca de tickets:");
  console.log(JSON.stringify(whereCondition, null, 2));

  // Buscar tickets
  const { count, rows: tickets } = await Ticket.findAndCountAll({
    where: whereCondition,
    include: includeCondition,
    distinct: true,
    limit,
    offset,
    order: [["updatedAt", "DESC"]],
    subQuery: false
  });

  const hasMore = count > offset + tickets.length;

  // Buscar tickets fechados separadamente se solicitado
  let closedTickets: Ticket[] = [];
  if (includeClosedTickets && startDate && endDate) {
    try {
      const startDateTime = startOfDay(parseISO(startDate));
      const endDateTime = endOfDay(parseISO(endDate));

      // Verificar se as datas são válidas
      if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
        throw new Error("Data inválida");
      }

      let closedWhereCondition: Filterable["where"] = {
        status: "closed",
        companyId,
        createdAt: {
          [Op.between]: [+startDateTime, +endDateTime]
        }
      };

      if (queueIds && queueIds.length > 0) {
        closedWhereCondition = {
          ...closedWhereCondition,
          queueId: { [Op.or]: [queueIds, null] }
        };
      }

      console.log("Buscando tickets fechados com filtro:");
      console.log(JSON.stringify(closedWhereCondition, null, 2));

      const { rows: closed } = await Ticket.findAndCountAll({
        where: closedWhereCondition,
        include: includeCondition,
        distinct: true,
        limit: 100,
        order: [["updatedAt", "DESC"]],
        subQuery: false
      });

      closedTickets = closed;
      console.log(`Encontrados ${closed.length} tickets fechados`);
    } catch (error) {
      console.error("Erro ao buscar tickets fechados:", error);
      closedTickets = [];
    }
  }

  return {
    tickets,
    count,
    hasMore,
    closedTickets: includeClosedTickets ? closedTickets : undefined
  };
};

export default ListTicketsServiceKanban;