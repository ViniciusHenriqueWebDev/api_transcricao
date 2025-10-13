import { Op } from "sequelize";
import Ticket from "../../models/Ticket";
import User from "../../models/User";
import Queue from "../../models/Queue";
import Whatsapp from "../../models/Whatsapp";
import Tag from "../../models/Tag";
import TicketTag from "../../models/TicketTag";

interface Request {
  companyId: number;
}

interface DashboardData {
  ticketsByStatus: Array<{ status: string; count: number; percentage: number }>;
  ticketsByUser: Array<{
    userId: number;
    name: string;
    total: number;
    finished: number;
    avgResponseTime: number | null;
    percentageFinished: number;
  }>;
  ticketsByQueue: Array<{
    queueId: number | null;
    name: string;
    count: number;
    percentage: number;
  }>;
  ticketsByWhatsapp: Array<{
    whatsappId: number;
    name: string;
    count: number;
    percentage: number;
  }>;
  topTags: Array<{
    tagId: number;
    name: string;
    color: string;
    count: number;
    percentage: number;
  }>;
  queueEfficiency: Array<{
    queueId: number;
    name: string;
    tickets: number;
    avgResponseTime: number | null;
    avgResolutionTime: number | null;
    percentageResolved: number;
  }>;
  ticketsByDay: Array<{ day: string; count: number }>;
  ticketsByHour: Array<{ hour: number; count: number }>;
  ticketsEvolution: Array<{
    date: string;
    total: number;
    open: number;
    pending: number;
    closed: number;
  }>;
}

const GetAllActiveTicketsService = async ({
  companyId
}: Request): Promise<DashboardData> => {
  // Obter data de hoje para filtrar tickets fechados hoje
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
  const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
  
  // 1. Buscar todos os tickets (ativos e fechados de hoje)
  const allTickets = await Ticket.findAll({
    where: {
      companyId,
      [Op.or]: [
        { status: { [Op.in]: ['open', 'pending'] } }, // Tickets ativos
        { 
          status: 'closed',
          updatedAt: {
            [Op.gte]: startOfToday, 
            [Op.lte]: endOfToday
          }
        }
      ]
    },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'name']
      },
      {
        model: Queue,
        as: 'queue',
        attributes: ['id', 'name', 'color']
      },
      {
        model: Whatsapp,
        as: 'whatsapp',
        attributes: ['id', 'name']
      },
      {
        model: TicketTag,
        as: 'ticketTags',
        include: [
          {
            model: Tag,
            as: 'tag',
            attributes: ['id', 'name', 'color']
          }
        ]
      }
    ]
  });
  
  const activeTickets = allTickets.filter(t => t.status === 'open' || t.status === 'pending');
  const closedTickets = allTickets.filter(t => t.status === 'closed');

  // 2. Calcular tickets por status
  const statusCounts = {
    open: activeTickets.filter(t => t.status === 'open').length,
    pending: activeTickets.filter(t => t.status === 'pending').length,
    closed: closedTickets.length
  };

  const totalTickets = allTickets.length;
  const openPercentage = totalTickets > 0 ? Math.round((statusCounts.open / totalTickets) * 100) : 0;
  const pendingPercentage = totalTickets > 0 ? Math.round((statusCounts.pending / totalTickets) * 100) : 0;
  const closedPercentage = totalTickets > 0 ? Math.round((statusCounts.closed / totalTickets) * 100) : 0;

  const ticketsByStatus = [
    { status: 'open', count: statusCounts.open, percentage: openPercentage },
    { status: 'pending', count: statusCounts.pending, percentage: pendingPercentage },
    { status: 'closed', count: statusCounts.closed, percentage: closedPercentage }
  ];

  // 3. Tickets por usuário
  const userMap = new Map();
  
  allTickets.forEach(ticket => {
    if (!ticket.userId) return;
    
    const userId = ticket.userId;
    const userName = ticket.user?.name || 'Sem Usuário';
    
    if (!userMap.has(userId)) {
      userMap.set(userId, {
        userId,
        name: userName,
        total: 0,
        finished: 0,
        avgResponseTime: null,
        percentageFinished: 0
      });
    }
    
    const userData = userMap.get(userId);
    userData.total++;
    
    if (ticket.status === 'closed') {
      userData.finished++;
    }
    
    userMap.set(userId, userData);
  });
  
  const ticketsByUser = Array.from(userMap.values())
    .map(user => ({
      ...user,
      percentageFinished: user.total > 0 ? Math.round((user.finished / user.total) * 100) : 0
    }))
    .sort((a, b) => b.total - a.total);

  // 4. Tickets por fila
  const queueMap = new Map();
  
  allTickets.forEach(ticket => {
    if (!ticket.queueId) return;
    
    const queueId = ticket.queueId;
    const queueName = ticket.queue?.name || 'Sem Fila';
    
    if (!queueMap.has(queueId)) {
      queueMap.set(queueId, {
        queueId,
        name: queueName,
        count: 0,
        percentage: 0
      });
    }
    
    const queueData = queueMap.get(queueId);
    queueData.count++;
    
    queueMap.set(queueId, queueData);
  });
  
  const ticketsByQueue = Array.from(queueMap.values())
    .map(queue => ({
      ...queue,
      percentage: totalTickets > 0 ? Math.round((queue.count / totalTickets) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count);

  // 5. Tickets por WhatsApp
  const whatsappMap = new Map();
  
  allTickets.forEach(ticket => {
    if (!ticket.whatsappId) return;
    
    const whatsappId = ticket.whatsappId;
    const whatsappName = ticket.whatsapp?.name || 'Sem WhatsApp';
    
    if (!whatsappMap.has(whatsappId)) {
      whatsappMap.set(whatsappId, {
        whatsappId,
        name: whatsappName,
        count: 0,
        percentage: 0
      });
    }
    
    const whatsappData = whatsappMap.get(whatsappId);
    whatsappData.count++;
    
    whatsappMap.set(whatsappId, whatsappData);
  });
  
  const ticketsByWhatsapp = Array.from(whatsappMap.values())
    .map(whatsapp => ({
      ...whatsapp,
      percentage: totalTickets > 0 ? Math.round((whatsapp.count / totalTickets) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count);

  // 6. Top tags
  const tagMap = new Map();
  
  allTickets.forEach(ticket => {
    if (!ticket.ticketTags || ticket.ticketTags.length === 0) return;
    
    ticket.ticketTags.forEach(ticketTag => {
      if (!ticketTag.tag) return;
      
      const tagId = ticketTag.tag.id;
      const tagName = ticketTag.tag.name;
      const tagColor = ticketTag.tag.color;
      
      if (!tagMap.has(tagId)) {
        tagMap.set(tagId, {
          tagId,
          name: tagName,
          color: tagColor,
          count: 0,
          percentage: 0
        });
      }
      
      const tagData = tagMap.get(tagId);
      tagData.count++;
      
      tagMap.set(tagId, tagData);
    });
  });
  
  const totalTaggedTickets = Array.from(tagMap.values()).reduce((sum, tag) => sum + tag.count, 0);
  
  const topTags = Array.from(tagMap.values())
    .map(tag => ({
      ...tag,
      percentage: totalTaggedTickets > 0 ? Math.round((tag.count / totalTaggedTickets) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10); // Top 10 tags

  // 7. Eficiência das filas
  const queueEfficiency = ticketsByQueue.map(queue => {
    const closedInQueue = closedTickets.filter(t => t.queueId === queue.queueId).length;
    
    return {
      queueId: queue.queueId,
      name: queue.name,
      tickets: queue.count,
      avgResponseTime: null,
      avgResolutionTime: null,
      percentageResolved: queue.count > 0 ? Math.round((closedInQueue / queue.count) * 100) : 0
    };
  });

  // 8. Distribuição de tickets por dia e hora
  const ticketsByDay = [
    { day: "Dom", count: 0 },
    { day: "Seg", count: 0 },
    { day: "Ter", count: 0 },
    { day: "Qua", count: 0 },
    { day: "Qui", count: 0 },
    { day: "Sex", count: 0 },
    { day: "Sab", count: 0 }
  ];
  
  allTickets.forEach(ticket => {
    const day = new Date(ticket.createdAt).getDay(); // 0 = domingo, 6 = sábado
    ticketsByDay[day].count++;
  });

  const ticketsByHour = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    count: 0
  }));
  
  allTickets.forEach(ticket => {
    const hour = new Date(ticket.createdAt).getHours();
    ticketsByHour[hour].count++;
  });

  // 9. Evolução dos tickets
  const todayStr = today.toISOString().split('T')[0];
  
  const ticketsEvolution = [{
    date: todayStr,
    total: totalTickets,
    open: statusCounts.open,
    pending: statusCounts.pending,
    closed: statusCounts.closed
  }];

  return {
    ticketsByStatus,
    ticketsByUser,
    ticketsByQueue,
    ticketsByWhatsapp,
    topTags,
    queueEfficiency,
    ticketsByDay,
    ticketsByHour,
    ticketsEvolution
  };
};

export default GetAllActiveTicketsService;