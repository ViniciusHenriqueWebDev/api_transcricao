import Chatbot from "../../../models/Chatbot";
import Contact from "../../../models/Contact";
import Queue from "../../../models/Queue";
import Ticket from "../../../models/Ticket";
import Whatsapp from "../../../models/Whatsapp";
import ShowTicketService from "../../TicketServices/ShowTicketService";
import { getAccessToken, sendAttachmentFromUrl, sendText, showTypingIndicator } from "../graphAPI";
import formatBody from "../../../helpers/Mustache";
import { randomString } from "../../../utils/randomCode";
import UpdateTicketService from "../../TicketServices/UpdateTicketService";
import FindOrCreateATicketTrakingService from "../../TicketServices/FindOrCreateATicketTrakingService";
import ShowQueueService from "../../QueueService/ShowQueueService";

interface IAddContact {
    companyId: number;
    name: string;
    phoneNumber: string;
    email?: string;
    dataMore?: any;
}

interface NumberPhrase {
    number: string;
    name: string;
    email: string;
}

// ✅ Versão simplificada sem FlowBuilder
export const ActionsWebhookFacebookService = async (
    token: Whatsapp,
    companyId: number,
    dataWebhook: any,
    details: any,
    hashWebhookId: string,
    pressKey?: string,
    idTicket?: number,
    numberPhrase?: NumberPhrase
): Promise<string> => {

    console.log("🎭 ActionsWebhookFacebookService - simplified version");
    
    let ticket = null;

    if (idTicket) {
        ticket = await Ticket.findOne({
            where: { id: idTicket }
        });

        if (ticket?.status === "closed") {
            return "Ticket closed";
        }

        await ticket?.update({
            dataWebhook: {
                status: "process",
            },
        });
    }

    if (pressKey === "parar" && idTicket) {
        const ticket = await Ticket.findOne({
            where: { id: idTicket }
        });
        await ticket?.update({
            status: "closed"
        });
        return "Stopped";
    }

    const getSession = await Whatsapp.findOne({
        where: {
            facebookPageUserId: token.facebookPageUserId
        },
        include: [
            {
                model: Queue,
                as: "queues",
                attributes: ["id", "name", "color", "greetingMessage"],
                include: [
                    {
                        model: Chatbot,
                        as: "chatbots",
                        attributes: ["id", "name", "greetingMessage"]
                    }
                ]
            }
        ],
        order: [
            ["queues", "id", "ASC"],
            ["queues", "chatbots", "id", "ASC"]
        ]
    });

    // ✅ Implementação básica sem FlowBuilder
    if (numberPhrase && getSession) {
        const contact = await Contact.findOne({
            where: { number: numberPhrase.number, companyId }
        });

        if (contact && getSession.facebookUserToken) {
            // Enviar mensagem simples
            await showTypingIndicator(
                contact.number,
                getSession.facebookUserToken,
                "typing_on"
            );

            await intervalWhats("2");

            const message = "Mensagem processada via webhook";
            await sendText(
                contact.number,
                message,
                getSession.facebookUserToken
            );

            await showTypingIndicator(
                contact.number,
                getSession.facebookUserToken,
                "typing_off"
            );

            if (ticket) {
                await ticket.update({
                    lastMessage: message,
                    dataWebhook: {
                        status: "completed",
                    },
                });
            }
        }
    }

    return "completed";
};

const intervalWhats = (time: string) => {
    const seconds = parseInt(time) * 1000;
    return new Promise(resolve => setTimeout(resolve, seconds));
};

async function updateQueueId(ticket: Ticket, companyId: number, queueId: number) {
    await ticket.update({
        status: 'pending',
        queueId: queueId,
        userId: ticket.userId,
        companyId: companyId,
    });

    await FindOrCreateATicketTrakingService({
        ticketId: ticket.id,
        companyId,
        whatsappId: ticket.whatsappId,
        userId: ticket.userId
    });

    await UpdateTicketService({
        ticketData: {
            status: "pending",
            queueId: queueId 
        },
        ticketId: ticket.id,
        companyId
    });
}