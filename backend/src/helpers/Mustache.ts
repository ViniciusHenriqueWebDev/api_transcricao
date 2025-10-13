import Mustache from "mustache";
import Contact from "../models/Contact";
import Schedule from "../models/Schedule";

export const greeting = (): string => {
  const greetings = ["Boa madrugada", "Bom dia", "Boa tarde", "Boa noite"];
  const h = new Date().getHours();
  // eslint-disable-next-line no-bitwise
  return greetings[(h / 6) >> 0];
};

export const firstName = (contact?: Contact): string => {
  if (contact && contact?.name) {
    const nameArr = contact?.name.split(' ');
    return nameArr[0];
  }
  return '';
};

// Função expandida para processar mensagens agendadas
export default (body: string, contact: Contact, schedule?: Schedule): string => {
  let ms = "";

  const Hr = new Date();

  const dd: string = `0${Hr.getDate()}`.slice(-2);
  const mm: string = `0${Hr.getMonth() + 1}`.slice(-2);
  const yy: string = Hr.getFullYear().toString();
  const hh: number = Hr.getHours();
  const min: string = `0${Hr.getMinutes()}`.slice(-2);
  const ss: string = `0${Hr.getSeconds()}`.slice(-2);

  if (hh >= 6) {
    ms = "Bom dia";
  }
  if (hh > 11) {
    ms = "Boa tarde";
  }
  if (hh > 17) {
    ms = "Boa noite";
  }
  if (hh > 23 || hh < 6) {
    ms = "Boa madrugada";
  }

  const protocol = yy + mm + dd + String(hh) + min + ss;

  const hora = `${hh}:${min}`;
  const today = `${dd}-${mm}-${yy}`;

  // Identificar se o texto já possui uma assinatura
  const signatureRegex = /\n\n\*[a-z0-9]+:\*\n[^\n]+$/;
  const hasSignature = signatureRegex.test(body);
  
  let mainBody = body;
  let signature = "";
  
  // Se tem assinatura, separa para processar apenas o corpo principal
  if (hasSignature) {
    const match = body.match(signatureRegex);
    signature = match ? match[0] : "";
    mainBody = body.replace(signatureRegex, "");
  }

  // Obter informações da conexão e fila
  let connectionName = "";
  let queueName = "";
  let userName = "";

  // Usar os dados do agendamento, se disponíveis
  if (schedule) {
    // Tenta obter nome da conexão
    if (schedule.whatsapp) {
      connectionName = schedule.whatsapp.name;
    } else if (schedule.whatsappData) {
      connectionName = schedule.whatsappData.name || "";
    }

    // Tenta obter nome da fila
    if (schedule.queue) {
      queueName = schedule.queue.name;
    } else if (schedule.queueData) {
      queueName = schedule.queueData.name || "";
    }

    if(schedule.user){
      userName = schedule.user.name;
    }
  }

  const view = {
    firstName: firstName(contact),
    name: contact ? contact.name : "",
    gretting: greeting(),
    ms,
    protocol,
    hour: hora,
    today,
    connection: connectionName,
    queue: queueName, 
    username: userName,
  };

  // Processa apenas o corpo principal
  const processedBody = Mustache.render(mainBody, view);
  
  return hasSignature ? `${processedBody}${signature}` : processedBody;
};