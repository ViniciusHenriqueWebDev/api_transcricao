import User from "../../models/User";
import Contact from "../../models/Contact";
import Schedule from "../../models/Schedule";
import formatBody from "../../helpers/Mustache";
import Whatsapp from "../../models/Whatsapp";
import Queue from "../../models/Queue";

interface ProcessMessageData {
  body: string;
  userId?: number;
  contactId?: number;
  whatsappId?: number;
  queueId?: number;
  scheduleId?: number;
  sendSignature?: boolean;
}

const ProcessMessageService = async ({
  body,
  userId,
  contactId,
  whatsappId,
  queueId,
  scheduleId,
  sendSignature = false
}: ProcessMessageData): Promise<string> => {
  try {
    // Carrega o agendamento para acessar todos os seus dados
    let schedule: Schedule | null = null;
    if (scheduleId) {
      schedule = await Schedule.findByPk(scheduleId, {
        include: [
          { model: Contact, as: "contact" },
          { model: User, as: "user" },
          { model: Whatsapp, as: "whatsapp" },
          { model: Queue, as: "queue" }
        ]
      });
    }

    // Carrega o contato se não tiver o schedule
    let contact: Contact | null = null;
    if (!schedule?.contact && contactId) {
      contact = await Contact.findByPk(contactId);
    }

    // Processa as variáveis do Mustache
    const processedBody = formatBody(
      body, 
      schedule?.contact || contact, 
      schedule
    );
    
    // Se não for para enviar assinatura ou não tiver userId, retorna o corpo processado
    if (!sendSignature || !userId) {
      return processedBody;
    }

    // Adiciona assinatura
    // Busca o usuário para obter o nome do atendente
    const user = await User.findByPk(userId);
    
    if (!user) {
      return processedBody; // Se não encontrar o usuário, retorna o texto processado
    }

    // Novo formato de assinatura usando o nome completo do usuário
    const signature = `\n\n*Assinado:*\n${user.name}`;
    
    // Adiciona a assinatura ao final da mensagem
    return `${processedBody}${signature}`;
  } catch (error) {
    console.error("Erro ao processar mensagem:", error);
    return body; // Em caso de erro, retorna o texto original
  }
};

export default ProcessMessageService;