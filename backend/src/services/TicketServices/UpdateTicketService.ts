import AppError from "../../errors/AppError";
import CheckContactOpenTickets from "../../helpers/CheckContactOpenTickets";
import SetTicketMessagesAsRead from "../../helpers/SetTicketMessagesAsRead";
import { getIO } from "../../libs/socket";
import Ticket from "../../models/Ticket";
import ShowTicketService from "./ShowTicketService";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import SendWhatsAppMessage from "../WbotServices/SendWhatsAppMessage";
import FindOrCreateATicketTrakingService from "./FindOrCreateATicketTrakingService";
import { verifyMessage } from "../WbotServices/wbotMessageListener";
import GetTicketWbot from "../../helpers/GetTicketWbot";
import moment from "moment";
import { isNil } from "lodash";
import TicketTraking from "../../models/TicketTraking";
import ShowUserService from "../UserServices/ShowUserService";
import Queue from "../../models/Queue";
import ListSettingsServiceOne from "../SettingServices/ListSettingsServiceOne";
import Setting from "../../models/Setting";
import { Op } from "sequelize";

interface TicketData {
  status?: string;
  userId?: number | null;
  queueId?: number | null;
  whatsappId?: string;
  chatbot?: boolean;
  queueOptionId?: number;
  amountUsedBotQueues?: number;
  lastMessage?: string;
  promptId?: number | null;
  useIntegration?: boolean;
  integrationId?: number | null;
}

interface Request {
  ticketData: TicketData;
  ticketId: string | number;
  companyId: number;
}

interface Response {
  ticket: Ticket;
  oldStatus: string;
  oldUserId: number | undefined;
}

const UpdateTicketService = async ({
  ticketData,
  ticketId,
  companyId
}: Request): Promise<Response> => {

  try {
    const { status } = ticketData;
    let { queueId, userId, whatsappId, amountUsedBotQueues, lastMessage = null } = ticketData;
    let chatbot: boolean | null = ticketData.chatbot || false;
    let queueOptionId: number | null = ticketData.queueOptionId || null;

    // ✅ MUDANÇA CRÍTICA: SÓ ALTERAR SE EXPLICITAMENTE FORNECIDO
    let promptId: number | null = ticketData.hasOwnProperty('promptId') ? ticketData.promptId : undefined;
    let useIntegration: boolean | null = ticketData.hasOwnProperty('useIntegration') ? ticketData.useIntegration : undefined;
    let integrationId: number | null = ticketData.hasOwnProperty('integrationId') ? ticketData.integrationId : undefined;

    const io = getIO();

    const key = "userRating";
    const setting = await Setting.findOne({
      where: {
        companyId,
        key
      }
    });

    const ticket = await ShowTicketService(ticketId, companyId);

    const openTickets = await Ticket.findAll({
      where: {
        contactId: ticket.contact.id,
        status: { [Op.or]: ["open", "pending"] },
        id: { [Op.ne]: ticket.id }
      }
    });

    for (const conflictingTicket of openTickets) {
      // Finalizar tracking
      const conflictingTraking = await FindOrCreateATicketTrakingService({
        ticketId: conflictingTicket.id,
        companyId,
        whatsappId: conflictingTicket.whatsappId
      });

      if (conflictingTraking) {
        conflictingTraking.finishedAt = moment().toDate();
        conflictingTraking.status = "closed";
        await conflictingTraking.save();
      }

      // Atualizar status do ticket para closed
      await conflictingTicket.update({ status: "closed" });

      // Emitir evento de remoção para o frontend
      io.to(conflictingTicket.status)
        .to(`company-${companyId}-${conflictingTicket.status}`)
        .to(`queue-${conflictingTicket.queueId}-${conflictingTicket.status}`)
        .emit(`company-${companyId}-ticket`, {
          action: "delete",
          ticketId: conflictingTicket.id
        });
    }

    if (useIntegration === undefined) useIntegration = ticket.useIntegration;
    if (integrationId === undefined) integrationId = ticket.integrationId;
    if (promptId === undefined) promptId = ticket.promptId;

    if (status === "open" && !userId) {
      const hasActiveIntegration = ticket.useIntegration || ticket.promptId || ticket.integrationId || useIntegration || promptId || integrationId;

      if (hasActiveIntegration) {
        console.log("🤖 Ticket com IA ativa sem usuário - forçando status PENDING");
        ticketData.status = "pending";
        userId = null;
      }
    }

    // ✅ VERIFICAR SE É FACEBOOK/INSTAGRAM
    const isFacebookChannel =
      ticket.channel === "facebook" ||
      ticket.channel === "instagram" ||
      ticket.whatsapp?.channel === "facebook" ||
      ticket.whatsapp?.channel === "instagram";

    console.log(`🔍 Canal detectado: ${isFacebookChannel ? 'Facebook/Instagram' : 'WhatsApp'}`);

    // ✅ FIX: VALIDAÇÃO MAIS ROBUSTA PARA whatsappId
    const ticketTraking = await FindOrCreateATicketTrakingService({
      ticketId,
      companyId,
      whatsappId: ticket.whatsappId || undefined
    });

    // ✅ FIX: VERIFICAÇÃO SEGURA PARA whatsappId
    if (isNil(whatsappId)) {
      whatsappId = ticket.whatsappId ? ticket.whatsappId.toString() : undefined;
    }

    // ✅ PARA FACEBOOK: PULAR SetTicketMessagesAsRead
    if (!isFacebookChannel) {
      await SetTicketMessagesAsRead(ticket);
    } else {
      console.log("📘 Ticket Facebook/Instagram - pulando SetTicketMessagesAsRead");
    }

    const oldStatus = ticket.status;
    const oldUserId = ticket.user?.id;
    const oldQueueId = ticket.queueId;
    const oldWhatsappId = ticket.whatsappId;

    if (oldStatus === "closed" || (whatsappId && Number(whatsappId) !== ticket.whatsappId)) {
      console.log(`🔄 Transferência detectada ou reabertura - verificando conflitos`);
      chatbot = null;
      queueOptionId = null;
    }

    // ✅ LÓGICA DE FECHAMENTO ESPECÍFICA PARA FACEBOOK
    if (ticketData.status !== undefined && ["closed"].indexOf(ticketData.status) > -1) {

      if (isFacebookChannel) {
        console.log("📘 Fechando ticket Facebook/Instagram - pulando lógicas de rating e mensagens do WhatsApp");

        // ✅ ATUALIZAR TICKET FACEBOOK DIRETAMENTE
        await ticket.update({
          status: "closed",
          promptId: null,
          integrationId: null,
          useIntegration: false,
          typebotStatus: false,
          typebotSessionId: null,
          amountUsedBotQueues: 0,
          imported: null
        });

        // ✅ ATUALIZAR TRACKING COM VERIFICAÇÃO SEGURA
        if (ticketTraking) {
          ticketTraking.finishedAt = moment().toDate();
          ticketTraking.whatsappId = ticket.whatsappId;
          ticketTraking.userId = ticket.userId;
          ticketTraking.contactId = ticket.contactId;
          ticketTraking.queueId = ticket.queueId;
          ticketTraking.lastMessage = lastMessage !== null ? lastMessage : ticket.lastMessage;
          ticketTraking.status = "closed";
          await ticketTraking.save();
        }

        // ✅ RECARREGAR TICKET
        await ticket.reload();

        // ✅ EMITIR EVENTOS SOCKET PARA FACEBOOK
        io.to(oldStatus)
          .to(`company-${companyId}-${oldStatus}`)
          .to(`queue-${oldQueueId}-${oldStatus}`)
          .emit(`company-${companyId}-ticket`, {
            action: "delete",
            ticketId: ticket.id
          });

        io.to("closed")
          .to(`company-${companyId}-closed`)
          .to(`queue-${queueId || ticket.queueId}-closed`)
          .emit(`company-${companyId}-ticket`, {
            action: "update",
            ticket
          });

        console.log(`✅ Ticket Facebook ${ticketId} fechado com sucesso`);
        return { ticket, oldStatus, oldUserId };
      }

      // ✅ LÓGICA ORIGINAL PARA WHATSAPP (mantida sem alterações)
      const { complationMessage, ratingMessage } = await ShowWhatsAppService(
        ticket.whatsappId,
        companyId
      );

      if (setting?.value === "enabled") {
        if (ticketTraking.ratingAt === null && ticket.userId !== null) {
          const ratingTxt = ratingMessage || "";
          let bodyRatingMessage = `\u200e ${ratingTxt}`;
          bodyRatingMessage +=
            "*👩🏻‍💼 Antes de finalizarmos, por favor, qual nota você dá para o meu atendimento?*:\n\n*1* - Insatisfeito\n*2* - Satisfeito\n*3* - Muito Satisfeito";
          const sendRatingMessage = await SendWhatsAppMessage({ body: bodyRatingMessage, ticket });

          await verifyMessage(sendRatingMessage, ticket, ticket.contact, false, ticketTraking);

          await ticketTraking.update({
            ratingAt: moment().toDate(),
            rated: false
          });

          setTimeout(async () => {
            try {
              const currentTicket = await ShowTicketService(ticket.id, companyId);
              if (currentTicket.status !== "closed") {

                const currentTraking = await FindOrCreateATicketTrakingService({
                  ticketId: currentTicket.id,
                  companyId,
                  whatsappId: currentTicket.whatsappId
                });

                const timeoutMessage = "*O tempo para avaliar o atendimento foi encerrado!*";
                const wbot = await GetTicketWbot(currentTicket)

                const timeoutSentMessage = await wbot.sendMessage(
                  `${currentTicket.contact.number}@${currentTicket.isGroup ? "g.us" : "s.whatsapp.net"}`,
                  { text: timeoutMessage }
                );
                await verifyMessage(timeoutSentMessage, currentTicket, currentTicket.contact, false, currentTraking);

                if (!isNil(complationMessage) && complationMessage !== "") {
                  const body = `\u200e ${complationMessage}`;
                  const sendMessage = await SendWhatsAppMessage({ body, ticket: currentTicket });

                  await verifyMessage(sendMessage, currentTicket, currentTicket.contact, false, currentTraking);
                }

                await currentTicket.update({
                  status: "closed",
                  promptId: null,
                  integrationId: null,
                  useIntegration: false,
                  typebotStatus: false,
                  typebotSessionId: null
                });

                currentTraking.finishedAt = moment().toDate();
                currentTraking.status = "closed";
                await currentTraking.save();

                io.to("open")
                  .to(`company-${companyId}-open`)
                  .to(`queue-${currentTicket.queueId}-open`)
                  .emit(`company-${companyId}-ticket`, {
                    action: "delete",
                    ticketId: currentTicket.id
                  });

                io.to("closed")
                  .to(`company-${companyId}-closed`)
                  .to(`queue-${currentTicket.queueId}-closed`)
                  .emit(`company-${companyId}-ticket`, {
                    action: "update",
                    ticket: currentTicket
                  });
              }
            } catch (err) {
              console.error("Erro ao fechar ticket automaticamente:", err);
            }
          }, 60000)

          io.to(`company-${ticket.companyId}-mainchannel-open`)
            .to(`queue-${ticket.queueId}-open`)
            .to(ticketId.toString())
            .emit(`company-${companyId}-ticket`, {
              action: "delete",
              ticketId: ticket.id
            });

          return { ticket, oldStatus, oldUserId };
        }
      }

      if (!isNil(complationMessage) && complationMessage !== "") {
        const body = `\u200e ${complationMessage}`;
        const sendMessage = await SendWhatsAppMessage({ body, ticket });
        await verifyMessage(sendMessage, ticket, ticket.contact, false, ticketTraking);
      }

      await ticket.update({
        promptId: null,
        integrationId: null,
        useIntegration: false,
        typebotStatus: false,
        typebotSessionId: null
      })

      if (ticketTraking) {
        ticketTraking.finishedAt = moment().toDate();
        ticketTraking.whatsappId = ticket.whatsappId;
        ticketTraking.userId = ticket.userId;
        ticketTraking.contactId = ticket.contactId;
        ticketTraking.queueId = ticket.queueId;
        ticketTraking.lastMessage = lastMessage !== null ? lastMessage : ticket.lastMessage;
        ticketTraking.status = "closed";
      }
    }

    if (queueId !== undefined && queueId !== null && ticketTraking) {
      ticketTraking.queuedAt = moment().toDate();
      ticketTraking.lastMessage = lastMessage !== null ? lastMessage : ticket.lastMessage;
      ticketTraking.status = ticketData.status || ticket.status;
      ticketTraking.userId = ticket.userId;
      ticketTraking.contactId = ticket.contactId;
      ticketTraking.queueId = ticket.queueId;
      ticketTraking.lastMessage = lastMessage !== null ? lastMessage : ticket.lastMessage;
    }

    // ✅ PULAR MENSAGENS DE TRANSFERÊNCIA PARA FACEBOOK
    if (!isFacebookChannel) {
      const settingsTransfTicket = await ListSettingsServiceOne({ companyId: companyId, key: "sendMsgTransfTicket" });

      if (settingsTransfTicket?.value === "enabled") {
        // Mensagem de transferencia da FILA
        if (oldQueueId !== queueId && oldUserId === userId && !isNil(oldQueueId) && !isNil(queueId)) {

          const queue = await Queue.findByPk(queueId);
          const wbot = await GetTicketWbot(ticket);
          const msgtxt = "*Mensagem automática*:\nVocê foi transferido para o departamento *" + queue?.name + "*\naguarde, já vamos te atender!";

          const queueChangedMessage = await wbot.sendMessage(
            `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
            {
              text: msgtxt
            }
          );
          await verifyMessage(queueChangedMessage, ticket, ticket.contact, false, ticketTraking);
        }
        else
          // Mensagem de transferencia do ATENDENTE
          if (oldUserId !== userId && oldQueueId === queueId && !isNil(oldUserId) && !isNil(userId)) {
            const wbot = await GetTicketWbot(ticket);
            const nome = await ShowUserService(ticketData.userId);
            const msgtxt = "*Mensagem automática*:\nFoi transferido para o atendente *" + nome.name + "*\naguarde, já vamos te atender!";

            const queueChangedMessage = await wbot.sendMessage(
              `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
              {
                text: msgtxt
              }
            );
            await verifyMessage(queueChangedMessage, ticket, ticket.contact, false, ticketTraking);
          }
          else
            // Mensagem de transferencia do ATENDENTE e da FILA
            if (oldUserId !== userId && !isNil(oldUserId) && !isNil(userId) && oldQueueId !== queueId && !isNil(oldQueueId) && !isNil(queueId)) {
              const wbot = await GetTicketWbot(ticket);
              const queue = await Queue.findByPk(queueId);
              const nome = await ShowUserService(ticketData.userId);
              const msgtxt = "*Mensagem automática*:\nVocê foi transferido para o departamento *" + queue?.name + "* e contará com a presença de *" + nome.name + "*\naguarde, já vamos te atender!";

              const queueChangedMessage = await wbot.sendMessage(
                `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
                {
                  text: msgtxt
                }
              );
              await verifyMessage(queueChangedMessage, ticket, ticket.contact, false, ticketTraking);
            } else
              if (oldUserId !== undefined && isNil(userId) && oldQueueId !== queueId && !isNil(queueId)) {

                const queue = await Queue.findByPk(queueId);
                const wbot = await GetTicketWbot(ticket);
                const msgtxt = "*Mensagem automática*:\nVocê foi transferido para o departamento *" + queue?.name + "*\naguarde, já vamos te atender!";

                const queueChangedMessage = await wbot.sendMessage(
                  `${ticket.contact.number}@${ticket.isGroup ? "g.us" : "s.whatsapp.net"}`,
                  {
                    text: msgtxt
                  }
                );
                await verifyMessage(queueChangedMessage, ticket, ticket.contact, false, ticketTraking);
              }
      }
    } else {
      console.log("📘 Facebook/Instagram - pulando mensagens de transferência");
    }

    const finalStatus = ticketData.status || ticket.status;

    const updateData = {
      status: finalStatus,
      queueId,
      userId,
      whatsappId,
      chatbot,
      queueOptionId,
      amountUsedBotQueues: finalStatus === "closed" ? 0 : amountUsedBotQueues ? amountUsedBotQueues : ticket.amountUsedBotQueues,
      lastMessage: lastMessage !== null ? lastMessage : ticket.lastMessage,
      imported: finalStatus === "closed" ? null : ticket.imported,
      promptId: promptId,
      useIntegration: useIntegration,
      integrationId: integrationId
    };

    // ✅ ATUALIZE O TICKET PRIMEIRO
    try {
      await ticket.update(updateData);
    } catch (updateError) {
      // ✅ SE AINDA HOUVER CONFLITO DE CONSTRAINT, DELETAR E RECRIAR
      if (updateError.name === 'SequelizeUniqueConstraintError') {
        console.log(`⚠️  Constraint violation detectada - deletando ticket conflitante e tentando novamente`);

        // ✅ BUSCAR E DELETAR TODOS OS TICKETS CONFLITANTES
        const allConflictingTickets = await Ticket.findAll({
          where: {
            contactId: ticket.contact.id,
            whatsappId: updateData.whatsappId,
            companyId: companyId,
            id: { [Op.ne]: ticket.id }
          }
        });

        for (const conflictTicket of allConflictingTickets) {
          console.log(`🗑️  Deletando ticket conflitante ${conflictTicket.id}`);

          // ✅ FINALIZAR TRACKING
          const conflictTraking = await FindOrCreateATicketTrakingService({
            ticketId: conflictTicket.id,
            companyId,
            whatsappId: conflictTicket.whatsappId
          });

          if (conflictTraking) {
            conflictTraking.finishedAt = moment().toDate();
            conflictTraking.status = "closed";
            await conflictTraking.save();
          }

          // ✅ EMITIR EVENTO DE REMOÇÃO
          io.to(conflictTicket.status)
            .to(`company-${companyId}-${conflictTicket.status}`)
            .to(`queue-${conflictTicket.queueId}-${conflictTicket.status}`)
            .emit(`company-${companyId}-ticket`, {
              action: "delete",
              ticketId: conflictTicket.id
            });
          await conflictTicket.destroy();
        }
        await ticket.update(updateData);
        console.log(`✅ Ticket atualizado com sucesso após resolver conflitos`);
      } else {
        throw updateError;
      }
    }

    // ✅ AGORA ATUALIZE O TRACKING COM OS NOVOS VALORES DO TICKET
    if (ticketTraking) {
      ticketTraking.status = finalStatus;
      ticketTraking.userId = ticket.userId;
      ticketTraking.queueId = ticket.queueId;
      ticketTraking.whatsappId = ticket.whatsappId;
      ticketTraking.contactId = ticket.contactId;
      ticketTraking.lastMessage = lastMessage !== null ? lastMessage : ticket.lastMessage;
      await ticketTraking.save();
    }

    await ticket.reload({
      include: [
        { model: Queue, as: "queue" },
        { model: Ticket.sequelize.models.User, as: "user" },
        { model: Ticket.sequelize.models.Contact, as: "contact" },
        { model: Ticket.sequelize.models.Whatsapp, as: "whatsapp" },
        { model: Ticket.sequelize.models.Tag, as: "tags" } 
      ]
    });

    const updatedFinalStatus = ticket.status;

    // ✅ EMITA OS EVENTOS SOCKET APÓS TUDO ATUALIZADO
    io.to(oldStatus)
      .to(`company-${companyId}-${oldStatus}`)
      .to(`queue-${oldQueueId}-${oldStatus}`)
      .emit(`company-${companyId}-ticket`, {
        action: "delete",
        ticketId: ticket.id
      });

    io.to(updatedFinalStatus)
      .to(`company-${companyId}-${updatedFinalStatus}`)
      .to(`company-${companyId}-notification`)
      .to(`queue-${ticket.queueId}-${updatedFinalStatus}`)
      .to(ticketId.toString())
      .emit(`company-${companyId}-ticket`, {
        action: "update",
        ticket
      });

    console.log(`✅ Ticket ${ticketId} atualizado com sucesso - Status: ${updatedFinalStatus}`);
    return { ticket, oldStatus, oldUserId };

  } catch (err) {
    console.error(`❌ Erro em UpdateTicketService:`, err);
    throw err;
  }
};

export default UpdateTicketService;