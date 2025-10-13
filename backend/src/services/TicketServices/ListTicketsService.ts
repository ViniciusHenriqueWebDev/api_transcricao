import { Op, fn, where, col, Filterable, Includeable } from "sequelize";
import { startOfDay, endOfDay, parseISO } from "date-fns";
import { union } from "lodash";

import Ticket from "../../models/Ticket";
import Contact from "../../models/Contact";
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
  updatedAt?: string;
  showAll?: string;
  userId: string;
  withUnreadMessages?: string;
  queueIds: number[];
  tags: number[];
  users: number[];
  companyId: number;
  orderBy?: string;
}

interface Response {
  tickets: Ticket[];
  count: number;
  hasMore: boolean;
}

const ListTicketsService = async ({
  searchParam = "",
  pageNumber = "1",
  queueIds,
  tags,
  users,
  status,
  date,
  updatedAt,
  showAll,
  userId,
  withUnreadMessages,
  companyId,
  orderBy = "DESC"
}: Request): Promise<Response> => {

  console.log("📋 ListTicketsService:", {
    searchParam,
    pageNumber,
    status,
    showAll,
    userId,
    companyId
  });

  const user = await User.findByPk(userId, {
    include: [
      {
        model: Whatsapp,
        as: "whatsapp",
      }
    ]
  });

  const userWhatsappId = user?.whatsapp?.id;

  // ✅ CONDIÇÃO BASE SIMPLES
  let whereCondition: Filterable["where"] = {
    companyId,
    ...(userWhatsappId ? { whatsappId: userWhatsappId } : {}),
    [Op.or]: [{ userId }, { status: "pending" }],
    queueId: { [Op.or]: [queueIds, null] }
  };

  // ✅ INCLUDES BÁSICOS - SEM MENSAGENS
  let includeCondition: Includeable[] = [
    {
      model: Contact,
      as: "contact",
      attributes: ["id", "name", "number", "email", "profilePicUrl"]
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
      attributes: ["id", "name", "color"],
      where: tags && tags.length > 0 ? { id: tags } : undefined,
      required: tags && tags.length > 0
    },
    {
      model: Whatsapp,
      as: "whatsapp",
      attributes: ["name"]
    }
  ];

  // ✅ SHOW ALL
  if (showAll === "true") {
    whereCondition = {
      companyId,
      ...(userWhatsappId ? { whatsappId: userWhatsappId } : {}),
      queueId: { [Op.or]: [queueIds, null] }
    };
  }

  // ✅ FILTRO DE STATUS
  if (status) {
    whereCondition = {
      ...whereCondition,
      status
    };
  }

  // ✅ PESQUISA SIMPLIFICADA - APENAS CONTACT NAME E NUMBER
  if (searchParam) {
    const sanitizedSearchParam = searchParam.toLocaleLowerCase().trim();

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
        {
          "$contact.number$": {
            [Op.like]: `%${sanitizedSearchParam}%`
          }
        }
      ]
    };
  }

  // ✅ FILTRO DE DATA
  if (date) {
    whereCondition = {
      ...whereCondition,
      createdAt: {
        [Op.between]: [+startOfDay(parseISO(date)), +endOfDay(parseISO(date))]
      }
    };
  }

  // ✅ FILTRO DE UPDATED AT
  if (updatedAt) {
    whereCondition = {
      ...whereCondition,
      updatedAt: {
        [Op.between]: [
          +startOfDay(parseISO(updatedAt)),
          +endOfDay(parseISO(updatedAt))
        ]
      }
    };
  }

  // ✅ FILTRO DE MENSAGENS NÃO LIDAS
  if (withUnreadMessages === "true") {
    const userObj = await ShowUserService(userId);
    const userQueueIds = userObj.queues.map(queue => queue.id);

    whereCondition = {
      companyId,
      ...(userWhatsappId ? { whatsappId: userWhatsappId } : {}),
      [Op.or]: [{ userId }, { status: "pending" }],
      queueId: { [Op.or]: [userQueueIds, null] },
      unreadMessages: { [Op.gt]: 0 }
    };
  }

  // ✅ FILTRO DE TAGS
  if (Array.isArray(tags) && tags.length > 0) {
    const ticketsTagFilter: any[] = [];
    for (let tag of tags) {
      const ticketTags = await TicketTag.findAll({
        where: { tagId: tag },
        include: [
          {
            model: Ticket,
            as: "ticket",
            where: {
              companyId,
              ...(userWhatsappId ? { whatsappId: userWhatsappId } : {})
            }
          }
        ]
      });
      if (ticketTags) {
        ticketsTagFilter.push(ticketTags.map(t => t.ticketId));
      }
    }

    // Troque intersection por union
    const ticketsUnion: number[] = union(...ticketsTagFilter);

    whereCondition = {
      ...whereCondition,
      id: {
        [Op.in]: ticketsUnion
      }
    };
  }

  // ✅ FILTRO DE USUÁRIOS
  if (Array.isArray(users) && users.length > 0) {
    const ticketsUserFilter: any[] = [];
    for (let user of users) {
      const ticketUsers = await Ticket.findAll({
        where: {
          userId: user,
          companyId,
          ...(userWhatsappId ? { whatsappId: userWhatsappId } : {})
        }
      });
      if (ticketUsers) {
        ticketsUserFilter.push(ticketUsers.map(t => t.id));
      }
    }

    const ticketsIntersection: number[] = intersection(...ticketsUserFilter);

    whereCondition = {
      ...whereCondition,
      id: {
        [Op.in]: ticketsIntersection
      }
    };
  }

  // ✅ PAGINAÇÃO
  const limit = 40;
  const offset = limit * (+pageNumber - 1);

  // ✅ GARANTIR COMPANY ID
  whereCondition = {
    ...whereCondition,
    companyId,
    ...(userWhatsappId ? { whatsappId: userWhatsappId } : {})
  };

  const sortOrder = status === "pending" ? "ASC" : (orderBy || "DESC");

  // ✅ BUSCAR TICKETS
  const { count, rows: tickets } = await Ticket.findAndCountAll({
    where: whereCondition,
    include: includeCondition,
    distinct: true,
    limit,
    offset,
    order: [["updatedAt", sortOrder]],
    subQuery: false
  });

  const hasMore = count > offset + tickets.length;

  console.log("✅ Tickets encontrados:", {
    count,
    ticketsLength: tickets.length,
    hasMore
  });

  return {
    tickets,
    count,
    hasMore
  };
};

export default ListTicketsService;