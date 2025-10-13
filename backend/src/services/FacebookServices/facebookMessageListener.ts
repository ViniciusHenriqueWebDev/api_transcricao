import { writeFileSync } from "fs";
import fs from "fs";
import axios from "axios";
import moment from "moment";
import { Op } from "sequelize";
import { join } from "path";
import path from "path";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import CreateOrUpdateContactService from "../ContactServices/CreateOrUpdateContactService";
import CreateMessageService from "../MessageServices/CreateMessageService";
import { getProfile, profilePsid, sendText } from "./graphAPI";
import Whatsapp from "../../models/Whatsapp";
import UpdateTicketService from "../TicketServices/UpdateTicketService";
import { debounce } from "../../helpers/Debounce";
import ShowWhatsAppService from "../WhatsappService/ShowWhatsAppService";
import formatBody from "../../helpers/Mustache";
import Queue from "../../models/Queue";
import Chatbot from "../../models/Chatbot";
import Message from "../../models/Message";
import { sayChatbot } from "../WbotServices/ChatbotListenerFacebook";
import ListSettingsService from "../SettingServices/ListSettingsService";
import { isNil, isNull, head } from "lodash";
import FindOrCreateATicketTrakingService from "../TicketServices/FindOrCreateATicketTrakingService";
import { handleMessageIntegration, handleRating, verifyRating } from "../WbotServices/wbotMessageListener";
import Setting from "../../models/Setting";
import sendFacebookMessage from "./sendFacebookMessage";
import { Mutex } from "async-mutex";
import TicketTag from "../../models/TicketTag";
import Tag from "../../models/Tag";
import ShowQueueIntegrationService from "../QueueIntegrationServices/ShowQueueIntegrationService";
import ShowTicketService from "../TicketServices/ShowTicketService";
import VerifyCurrentSchedule from "../CompanyService/VerifyCurrentSchedule";
import CreateTicketService from "../TicketServices/CreateTicketService";
import QueueIntegrations from "../../models/QueueIntegrations";
import typebotListenerUniversal from "../TypebotServices/typebotListenerUniversal";
import { getBodyMessage } from "../WbotServices/wbotMessageListener";
import OpenAI from "openai";
import ffmpeg from "fluent-ffmpeg";
import {
  SpeechConfig,
  SpeechSynthesizer,
  AudioConfig
} from "microsoft-cognitiveservices-speech-sdk";
import User from "../../models/User";
import { getIO } from "../../libs/socket";
import QueueOption from "../../models/QueueOption";

const request = require("request");

interface IMe {
  name: string;
  first_name: string;
  last_name: string;
  profile_pic: string;
  id: string;
}

export interface Root {
  object: string;
  entry: Entry[];
}

export interface Entry {
  id: string;
  time: number;
  messaging: Messaging[];
}

export interface Messaging {
  sender: Sender;
  recipient: Recipient;
  timestamp: number;
  message: MessageX;
}

export interface Sender {
  id: string;
}

export interface Recipient {
  id: string;
}

export interface MessageX {
  mid: string;
  text: string;
  reply_to: ReplyTo;
}

export interface ReplyTo {
  mid: string;
}

interface SessionOpenAi extends OpenAI {
  id?: number;
}

interface FacebookWbot {
  id: number;
  user: {
    id: string;
    name: string;
  };
  sendMessage: (jid: string, messageContent: any) => Promise<any>;
  presenceSubscribe?: (jid: string) => Promise<void>;
  sendPresenceUpdate?: (type: string, jid: string) => Promise<void>;
}

const sessionsOpenAiByConnection: Map<string, SessionOpenAi[]> = new Map();

const verifyContact = async (msgContact: any, whatsapp: any, companyId: number) => {
  // ✅ BUSCAR CONTATO EXISTENTE ANTES DE CRIAR
  const existingContact = await Contact.findOne({
    where: {
      [Op.or]: [
        { number: msgContact.id, companyId },
        { number: msgContact.id.toString(), companyId }
      ]
    },
    order: [["updatedAt", "DESC"]]
  });

  // ✅ CONSTRUIR NOME USANDO OS DADOS REAIS DO PERFIL
  let contactName = whatsapp.channel === "instagram" ? "Instagram User" : "Facebook User"; // fallback

  if (msgContact.name) {
    contactName = msgContact.name;
  } else if (msgContact.username) {
    contactName = msgContact.username;
  } else if (msgContact.first_name && msgContact.last_name) {
    contactName = `${msgContact.first_name} ${msgContact.last_name}`;
  } else if (msgContact.first_name) {
    contactName = msgContact.first_name;
  } else if (msgContact.last_name) {
    contactName = msgContact.last_name;
  }

  console.log("🏷️ Dados do contato:", {
    psid: msgContact.id,
    originalData: msgContact,
    constructedName: contactName,
    existingContact: existingContact ? {
      id: existingContact.id,
      name: existingContact.name,
      number: existingContact.number
    } : null
  });

  // ✅ TRUNCAR URL DA FOTO SE NECESSÁRIO
  let profilePicUrl = msgContact.profile_pic || "";
  if (profilePicUrl && profilePicUrl.length > 500) {
    profilePicUrl = profilePicUrl.substring(0, 500);
  }

  const contactData = {
    name: contactName,
    number: msgContact.id.toString(), // ✅ GARANTIR QUE É STRING
    profilePicUrl: profilePicUrl,
    isGroup: false,
    companyId: companyId,
    whatsappId: whatsapp.id
  };

  const contact = await CreateOrUpdateContactService(contactData);

  console.log("🔄 Contato processado:", {
    id: contact.id,
    finalName: contact.name,
    number: contact.number,
    wasExisting: !!existingContact
  });

  return contact;
};

export const verifyMessageFace = async (
  msg: any,
  body: any,
  ticket: Ticket,
  contact: Contact,
  fromMe: boolean = false,
  channel: string = "facebook"
) => {
  const quotedMsg = await verifyQuotedMessage(msg);
  const io = getIO();

  console.log("💾 Saving Facebook/Instagram message:", {
    ticketId: ticket.id,
    body: body,
    fromMe,
    messageType: fromMe ? "outgoing" : "incoming",
    channel: channel
  });

  // ✅ VERIFICAR SE A MENSAGEM FOI SKIPPED
  if (msg?.skipped) {
    console.log("⏭️ Skipping message save due to skip flag");
    return;
  }

  // ✅ GERAR ID SEGURO COM CANAL
  const messageId = msg?.mid ||
    msg?.message_id ||
    `${channel}_${Date.now()}_${Math.random()}`;

  const messageData = {
    id: messageId,
    wid: messageId,
    ticketId: ticket.id,
    contactId: fromMe ? undefined : contact.id,
    body: body,
    fromMe: fromMe,
    read: fromMe ? true : false,
    quotedMsgId: quotedMsg?.id,
    ack: fromMe ? 3 : 1,
    dataJson: JSON.stringify(msg || {}),
    channel: channel
  };

  const message = await CreateMessageService({ messageData, companyId: ticket.companyId });

  // ✅ ATUALIZAR TICKET COM ÚLTIMA MENSAGEM E CONTADORES
  const updateData: any = {
    lastMessage: body || "📎 Mídia",
    lastMessageAt: new Date()
  };

  // ✅ SE NÃO É MINHA MENSAGEM, INCREMENTAR CONTADOR
  if (!fromMe) {
    await ticket.update({
      unreadMessages: ticket.unreadMessages + 1,
      ...updateData
    });
  } else {
    await ticket.update(updateData);
  }

  // ✅ RECARREGAR TICKET COM TODAS AS ASSOCIAÇÕES PARA SOCKET
  await ticket.reload({
    include: [
      {
        model: Contact,
        as: "contact",
        attributes: ["id", "name", "number", "profilePicUrl"]
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
        model: Whatsapp,
        as: "whatsapp",
        attributes: ["id", "name", "channel"]
      }
    ]
  });

  console.log("✅ Ticket atualizado com lastMessage:", {
    ticketId: ticket.id,
    lastMessage: ticket.lastMessage,
    unreadMessages: ticket.unreadMessages
  });

  // ✅ EMITIR EVENTOS SOCKET PARA TODOS OS CANAIS NECESSÁRIOS
  const companyId = ticket.companyId;
  const status = ticket.status;
  const queueId = ticket.queueId;
  const userId = ticket.userId;

  console.log("📡 Emitindo eventos socket para Facebook/Instagram:", {
    companyId,
    ticketId: ticket.id,
    status,
    queueId,
    userId,
    channel: ticket.whatsapp?.channel,
    lastMessage: ticket.lastMessage
  });

  // ✅ EVENTO PRINCIPAL PARA ATUALIZAÇÃO DE TICKET
  io.to(ticket.id.toString())
    .to(`company-${companyId}-mainchannel`)
    .to(`company-${companyId}-${status}`)
    .emit(`company-${companyId}-ticket`, {
      action: "update",
      ticket,
      ticketId: ticket.id
    });

  // ✅ EVENTOS ESPECÍFICOS POR FILA
  if (queueId) {
    io.to(`queue-${queueId}-${status}`)
      .emit(`company-${companyId}-ticket`, {
        action: "update",
        ticket,
        ticketId: ticket.id
      });
  }

  // ✅ EVENTOS ESPECÍFICOS POR USUÁRIO
  if (userId) {
    io.to(`user-${userId}`)
      .emit(`company-${companyId}-ticket`, {
        action: "update",
        ticket,
        ticketId: ticket.id
      });
  }

  // ✅ EVENTO ESPECÍFICO PARA NOVA MENSAGEM
  io.to(ticket.id.toString())
    .to(`company-${companyId}-mainchannel`)
    .emit(`company-${companyId}-appMessage`, {
      action: fromMe ? "create" : "received",
      message,
      ticket,
      contact
    });

  // ✅ EVENTOS DE NOTIFICAÇÃO PARA MENSAGENS NÃO LIDAS
  if (!fromMe) {
    io.to(`company-${companyId}-notification`)
      .emit("notification", {
        action: "new-message",
        ticket,
        message: {
          body: body
        }
      });

    // ✅ NOTIFICAÇÃO POR FILA
    if (queueId) {
      io.to(`queue-${queueId}-notification`)
        .emit("notification", {
          action: "new-message",
          ticket
        });
    }

    // ✅ NOTIFICAÇÃO POR USUÁRIO
    if (userId) {
      io.to(`user-${userId}`)
        .emit("notification", {
          action: "new-message",
          ticket
        });
    }
  }

  console.log("✅ Eventos socket emitidos com sucesso para Facebook/Instagram");

  return message;
};

export const verifyMessageMedia = async (
  msg: any,
  ticket: Ticket,
  contact: Contact,
  fromMe: boolean = false,
  channel: string = "facebook"
): Promise<Message> => {
  console.log("📎 Processando mídia Facebook/Instagram:", {
    ticketId: ticket.id,
    attachmentType: msg.attachments?.[0]?.type,
    channel,
    fromMe,
    hasAttachments: !!msg.attachments && msg.attachments.length > 0
  });

  if (!msg.attachments || msg.attachments.length === 0) {
    throw new Error("Nenhum anexo encontrado na mensagem");
  }

  const attachment = msg.attachments[0];
  const mediaUrl = attachment.payload?.url;

  if (!mediaUrl) {
    throw new Error("URL do anexo não encontrada");
  }

  let mediaData: Buffer;
  let fileName: string;
  let mediaType: string;
  let detectedMimeType: string;

  try {
    console.log("📥 Baixando mídia de:", mediaUrl.substring(0, 100) + "...");

    // ✅ BAIXAR MÍDIA COM HEADERS APROPRIADOS
    const response = await axios.get(mediaUrl, {
      responseType: "arraybuffer",
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br'
      },
      timeout: 60000, // 60 segundos timeout
      maxContentLength: 200 * 1024 * 1024, // 200MB máximo
      maxBodyLength: 200 * 1024 * 1024
    });

    mediaData = Buffer.from(response.data);
    console.log("📊 Dados da mídia baixados:", {
      size: mediaData.length,
      sizeInMB: (mediaData.length / 1024 / 1024).toFixed(2) + "MB"
    });

    // ✅ DETECTAR TIPO DE ARQUIVO
    const { fileTypeFromBuffer } = await import("file-type");
    const detectedType = await fileTypeFromBuffer(mediaData);

    detectedMimeType = detectedType?.mime || 'application/octet-stream';

    // ✅ DETERMINAR TIPO E EXTENSÃO BASEADO NO ATTACHMENT TYPE
    switch (attachment.type) {
      case 'image':
        mediaType = 'image';
        fileName = `img_${Date.now()}.${detectedType?.ext || 'jpg'}`;
        break;
      case 'audio':
        mediaType = 'audio';
        fileName = `audio_${Date.now()}.${detectedType?.ext || 'mp3'}`;
        break;
      case 'video':
        mediaType = 'video';
        fileName = `video_${Date.now()}.${detectedType?.ext || 'mp4'}`;
        break;
      case 'file':
        mediaType = 'document';
        fileName = `doc_${Date.now()}.${detectedType?.ext || 'bin'}`;
        break;
      default:
        mediaType = 'document';
        fileName = `media_${Date.now()}.${detectedType?.ext || 'bin'}`;
    }

    console.log("🔍 Mídia detectada:", {
      type: mediaType,
      fileName,
      size: mediaData.length,
      detectedMimeType,
      attachmentType: attachment.type
    });

  } catch (downloadError) {
    console.error("❌ Erro ao baixar mídia:", {
      error: downloadError.message,
      url: mediaUrl.substring(0, 100) + "...",
      status: downloadError.response?.status
    });
    throw new Error(`Erro ao baixar mídia: ${downloadError.message}`);
  }

  // ✅ CRIAR DIRETÓRIO SE NÃO EXISTIR
  const folder = `public/company${ticket.companyId}`;
  const fullPath = join(__dirname, "..", "..", "..", folder);

  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    fs.chmodSync(fullPath, 0o777);
  }

  // ✅ SALVAR ARQUIVO
  const filePath = join(fullPath, fileName);
  try {
    writeFileSync(filePath, mediaData);
    console.log("💾 Arquivo salvo:", {
      path: filePath,
      fileName,
      exists: fs.existsSync(filePath)
    });
  } catch (saveError) {
    console.error("❌ Erro ao salvar arquivo:", saveError);
    throw new Error(`Erro ao salvar arquivo: ${saveError.message}`);
  }

  // ✅ PROCESSAR ÁUDIO ESPECIFICAMENTE
  if (mediaType === 'audio') {
    try {
      const processedAudio = await processAudioForPlayback(filePath, fullPath);
      if (processedAudio) {
        fileName = processedAudio;
        console.log("🎵 Áudio processado:", fileName);
      }
    } catch (audioError) {
      console.warn("⚠️ Erro ao processar áudio, usando original:", audioError.message);
    }
  }

  // ✅ PREPARAR DADOS DA MENSAGEM
  const messageId = msg.mid || `${channel}_media_${Date.now()}_${Math.random()}`;

  const messageData = {
    id: messageId,
    wid: messageId,
    ticketId: ticket.id,
    contactId: fromMe ? undefined : contact.id,
    body: msg.text || getMediaDescription(mediaType),
    fromMe: fromMe,
    mediaType: mediaType,
    mediaUrl: fileName,
    read: fromMe ? true : false,
    quotedMsgId: null,
    ack: fromMe ? 3 : 1,
    dataJson: JSON.stringify({
      ...msg,
      attachment: {
        type: attachment.type,
        originalUrl: mediaUrl,
        fileName: fileName,
        size: mediaData.length,
        detectedMimeType,
        processed: mediaType === 'audio'
      }
    }),
    channel: channel
  };

  // ✅ CRIAR MENSAGEM NO BANCO
  const message = await CreateMessageService({
    messageData,
    companyId: ticket.companyId
  });

  // ✅ ATUALIZAR TICKET
  const lastMessage = msg.text || getMediaDescription(mediaType);
  await ticket.update({
    lastMessage: lastMessage,
    lastMessageAt: new Date(),
    unreadMessages: fromMe ? ticket.unreadMessages : ticket.unreadMessages + 1
  });

  // ✅ RECARREGAR TICKET PARA SOCKET
  await ticket.reload({
    include: [
      { model: Contact, as: "contact", attributes: ["id", "name", "number", "profilePicUrl"] },
      { model: Queue, as: "queue", attributes: ["id", "name", "color"] },
      { model: User, as: "user", attributes: ["id", "name"] },
      { model: Whatsapp, as: "whatsapp", attributes: ["id", "name", "channel"] }
    ]
  });

  // ✅ EMITIR EVENTOS SOCKET
  const io = getIO();
  const companyId = ticket.companyId;

  io.to(ticket.id.toString())
    .to(`company-${companyId}-mainchannel`)
    .to(`company-${companyId}-${ticket.status}`)
    .emit(`company-${companyId}-ticket`, {
      action: "update",
      ticket,
      ticketId: ticket.id
    });

  io.to(ticket.id.toString())
    .to(`company-${companyId}-mainchannel`)
    .emit(`company-${companyId}-appMessage`, {
      action: fromMe ? "create" : "received",
      message,
      ticket,
      contact
    });

  // ✅ NOTIFICAÇÃO PARA MENSAGENS RECEBIDAS
  if (!fromMe) {
    io.to(`company-${companyId}-notification`)
      .emit("notification", {
        action: "new-message",
        ticket,
        message: {
          body: getMediaDescription(mediaType)
        }
      });
  }

  console.log("✅ Mídia Facebook/Instagram processada com sucesso:", {
    messageId: message.id,
    mediaType,
    fileName,
    ticketId: ticket.id
  });

  return message;
};

const processAudioForPlayback = async (
  filePath: string,
  outputDir: string
): Promise<string | null> => {
  return new Promise((resolve) => {
    const timestamp = Date.now();
    const outputFileName = `audio_${timestamp}_processed.mp3`;
    const outputPath = path.join(outputDir, outputFileName);

    ffmpeg(filePath)
      .audioCodec('mp3')
      .audioBitrate(128)
      .audioFrequency(44100)
      .on('end', () => {
        console.log("🎵 Áudio convertido para MP3");
        // ✅ REMOVER ARQUIVO ORIGINAL
        try {
          fs.unlinkSync(filePath);
        } catch (err) {
          console.warn("⚠️ Não foi possível remover arquivo original:", err.message);
        }
        resolve(outputFileName);
      })
      .on('error', (err) => {
        console.error("❌ Erro na conversão de áudio:", err);
        resolve(null);
      })
      .save(outputPath);
  });
};

const getMediaDescription = (mediaType: string): string => {
  const descriptions = {
    'image': '📷 Imagem',
    'audio': '🎵 Áudio',
    'video': '🎥 Vídeo',
    'document': '📄 Documento'
  };
  return descriptions[mediaType] || '📎 Mídia';
};

export const verifyQuotedMessage = async (msg: any): Promise<Message | null> => {
  if (!msg) return null;
  const quoted = msg?.reply_to?.mid;

  if (!quoted) return null;

  const quotedMsg = await Message.findOne({
    where: { wid: quoted }
  });

  if (!quotedMsg) return null;
  return quotedMsg;
};

const sanitizeName = (name: string): string => {
  let sanitized = name.split(" ")[0];
  sanitized = sanitized.replace(/[^a-zA-Z0-9]/g, "");
  return sanitized.substring(0, 60);
};

const keepOnlySpecifiedChars = (str: string) => {
  return str.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚâêîôûÂÊÎÔÛãõÃÕçÇ!?.,;:\s]/g, "");
};

const convertTextToSpeechAndSaveToFile = (
  text: string,
  filename: string,
  subscriptionKey: string,
  serviceRegion: string,
  voice: string = "pt-BR-FabioNeural",
  audioToFormat: string = "mp3"
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const speechConfig = SpeechConfig.fromSubscription(
      subscriptionKey,
      serviceRegion
    );
    speechConfig.speechSynthesisVoiceName = voice;
    const audioConfig = AudioConfig.fromAudioFileOutput(`${filename}.wav`);
    const synthesizer = new SpeechSynthesizer(speechConfig, audioConfig);
    synthesizer.speakTextAsync(
      text,
      result => {
        if (result) {
          convertWavToAnotherFormat(
            `${filename}.wav`,
            `${filename}.${audioToFormat}`,
            audioToFormat
          )
            .then(output => {
              resolve();
            })
            .catch(error => {
              console.error(error);
              reject(error);
            });
        } else {
          reject(new Error("No result from synthesizer"));
        }
        synthesizer.close();
      },
      error => {
        console.error(`Error: ${error}`);
        synthesizer.close();
        reject(error);
      }
    );
  });
};

const convertWavToAnotherFormat = (
  inputPath: string,
  outputPath: string,
  toFormat: string
) => {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(inputPath)
      .toFormat(toFormat)
      .on("end", () => resolve(outputPath))
      .on("error", (err: { message: any }) =>
        reject(new Error(`Error converting file: ${err.message}`))
      )
      .save(outputPath);
  });
};

const deleteFileSync = (path: string): void => {
  try {
    fs.unlinkSync(path);
  } catch (error) {
    console.error("Erro ao deletar o arquivo:", error);
  }
};

const transferQueue = async (
  queueId: number,
  ticket: Ticket,
  contact: Contact
): Promise<void> => {
  await UpdateTicketService({
    ticketData: { queueId, userId: null, status: "pending" },
    ticketId: ticket.id,
    companyId: ticket.companyId
  });
};

const handleOpenAiFacebook = async (
  message: any,
  token: Whatsapp,
  ticket: Ticket,
  contact: Contact,
  mediaSent: Message | undefined,
  ticketTraking: any
): Promise<void> => {

  if (contact.disableBot) {
    return;
  }

  let { prompt } = await ShowWhatsAppService(token.id, ticket.companyId);

  if (!prompt && !isNil(ticket?.queue?.prompt)) {
    prompt = ticket?.queue?.prompt;
  }

  if (!prompt) return;

  const publicFolder: string = path.resolve(
    __dirname,
    "..",
    "..",
    "..",
    "public",
    `company${ticket.companyId}`
  );

  const connectionKey = `${token.id}_${ticket.companyId}`;

  if (!sessionsOpenAiByConnection.has(connectionKey)) {
    sessionsOpenAiByConnection.set(connectionKey, []);
  }

  let openai: OpenAI | any;

  const connectionSessions = sessionsOpenAiByConnection.get(connectionKey)
  const openAiIndex = connectionSessions.findIndex(s => s.id === ticket.id);

  if (openAiIndex === -1) {
    openai = new OpenAI({ apiKey: prompt.apiKey });
    openai.id = ticket.id;
    connectionSessions.push(openai);
    console.log(`🤖 Nova sessão OpenAI criada para conexão ${connectionKey}, ticket ${ticket.id}`);
  } else {
    openai = connectionSessions[openAiIndex];
    console.log(`🔄 Reutilizando sessão OpenAI para conexão ${connectionKey}, ticket ${ticket.id}`);
  }

  const messages = await Message.findAll({
    where: { ticketId: ticket.id },
    order: [["createdAt", "ASC"]],
    limit: prompt.maxMessages
  });

  const promptSystem = `Nas respostas utilize o nome ${sanitizeName(contact.name || "Amigo(a)")} para identificar o cliente.\nSua resposta deve usar no máximo ${prompt.maxTokens}
     tokens e cuide para não truncar o final.\nSempre que possível, mencione o nome dele para ser mais personalizado o atendimento e mais educado. Quando a resposta requer uma transferência para o setor de atendimento, comece sua resposta com 'Ação: Transferir para o setor de atendimento'.\n
  ${prompt.prompt}\n`;

  let messagesOpenAi = [];

  if (message.text) {
    messagesOpenAi = [];
    messagesOpenAi.push({ role: "system", content: promptSystem });
    for (
      let i = 0;
      i < Math.min(prompt.maxMessages, messages.length);
      i++
    ) {
      const msg = messages[i];
      if (msg.mediaType === "chat") {
        if (msg.fromMe) {
          messagesOpenAi.push({ role: "assistant", content: msg.body });
        } else {
          messagesOpenAi.push({ role: "user", content: msg.body });
        }
      }
    }

    const bodyMessage = message.text;
    messagesOpenAi.push({ role: "user", content: bodyMessage! });

    const chat = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messagesOpenAi,
      max_tokens: prompt.maxTokens,
      temperature: prompt.temperature
    });

    let response = chat.choices[0].message?.content;

    if (response?.includes("Ação: Transferir para o setor de atendimento")) {
      await transferQueue(prompt.queueId, ticket, contact);
      response = response
        .replace("Ação: Transferir para o setor de atendimento", "")
        .trim();
    }

    if (prompt.voice === "texto") {
      const sentMessage = await sendText(contact.number, response!, token.facebookUserToken);

      if (sentMessage && !sentMessage.skipped) {
        await verifyMessageFace(sentMessage, response!, ticket, contact, true);
        console.log("✅ Mensagem Facebook enviada e registrada com sucesso");
      } else {
        console.log("⚠️ Mensagem Facebook foi pulada:", sentMessage?.reason);
      }
    } else {
      const fileNameWithOutExtension = `${ticket.id}_${Date.now()}`;

      convertTextToSpeechAndSaveToFile(
        keepOnlySpecifiedChars(response!),
        `${publicFolder}/${fileNameWithOutExtension}`,
        prompt.voiceKey,
        prompt.voiceRegion,
        prompt.voice,
        "mp3"
      ).then(async () => {
        try {
          const audioUrl = `${process.env.BACKEND_URL}/public/company${ticket.companyId}/${fileNameWithOutExtension}.mp3`;

          const sentMessage = await sendText(contact.number, `🎵 Áudio: ${audioUrl}`, token.facebookUserToken);
          await verifyMessageFace(sentMessage, `🎵 Áudio: ${audioUrl}`, ticket, contact, true);

          deleteFileSync(`${publicFolder}/${fileNameWithOutExtension}.mp3`);
          deleteFileSync(`${publicFolder}/${fileNameWithOutExtension}.wav`);
        } catch (error) {
          console.log(`Erro para responder com audio: ${error}`);
        }
      });
    }
  }
  messagesOpenAi = [];
};

const handleMessageIntegrationFacebook = async (
  message: any,
  token: Whatsapp,
  queueIntegration: QueueIntegrations,
  ticket: Ticket
): Promise<void> => {
  // REGRA PARA DESABILITAR O BOT PARA ALGUM CONTATO
  if (ticket.contact.disableBot) {
    return;
  }

  console.log("🔗 handleMessageIntegrationFacebook iniciado:", {
    integrationType: queueIntegration.type,
    integrationId: queueIntegration.id,
    ticketId: ticket.id
  });

  if (queueIntegration.type === "n8n" || queueIntegration.type === "webhook") {
    if (queueIntegration?.urlN8N) {
      console.log("🌐 Enviando para N8N/Webhook:", queueIntegration.urlN8N);

      const options = {
        method: "POST",
        url: queueIntegration?.urlN8N,
        headers: {
          "Content-Type": "application/json"
        },
        json: {
          // ✅ ADAPTAR ESTRUTURA PARA FACEBOOK
          message: {
            text: message.text,
            mid: message.mid,
            attachments: message.attachments
          },
          contact: {
            id: ticket.contact.number,
            name: ticket.contact.name,
            number: ticket.contact.number
          },
          ticket: {
            id: ticket.id,
            status: ticket.status,
            queueId: ticket.queueId
          },
          whatsapp: {
            id: token.id,
            name: token.name,
            channel: "facebook"
          }
        }
      };

      try {
        request(options, function (error, response) {
          if (error) {
            console.error("❌ Erro no N8N/Webhook:", error);
            throw new Error(error);
          } else {
            console.log("✅ Resposta N8N/Webhook:", response.body);
          }
        });
      } catch (error) {
        console.error("❌ Erro ao enviar para N8N/Webhook:", error);
        throw new Error(error);
      }
    }
  } else if (queueIntegration.type === "typebot") {
    console.log("🤖 Iniciando integração Typebot");

    try {
      await typebotListenerUniversal({
        ticket,
        message: message,
        wbot: null, // Facebook não usa wbot
        typebot: queueIntegration,
        platform: ticket.whatsapp?.channel === 'instagram' ? 'instagram' : 'facebook'
      });

      console.log("✅ Typebot processado com sucesso");
    } catch (error) {
      console.error("❌ Erro no Typebot:", error);
    }
  }
};

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function sleep(time) {
  await timeout(time);
}

export const handleMessage = async (
  whatsapp: any,
  messagingEvent: any,
  channel: string,
  companyId: any
): Promise<any> => {
  try {
    // ✅ DETECTAR CANAL COM FALLBACKS
    const detectedChannel = channel || whatsapp.channel || "facebook";

    console.log("🚀 handleMessage started with:", {
      whatsappId: whatsapp.id,
      whatsappName: whatsapp.name,
      channel: detectedChannel,
      companyId,
      senderPsid: messagingEvent.sender?.id,
      messageText: messagingEvent.message?.text
    });

    if (messagingEvent.message) {
      let msgContact: any;
      const senderPsid = messagingEvent.sender.id;
      const recipientPsid = messagingEvent.recipient.id;
      const { message } = messagingEvent;
      const fromMe = message.is_echo;
      let bodyMessage = message.text;

      console.log("📝 Message details:", {
        senderPsid,
        recipientPsid,
        fromMe,
        bodyMessage,
        channel: detectedChannel
      });

      if (fromMe) {
        if (/\u200e/.test(bodyMessage)) return;

        try {
          msgContact = await profilePsid(recipientPsid, whatsapp.facebookUserToken);
        } catch (error) {
          console.log(`⚠️ Erro ao buscar perfil do destinatário:`, error.message);

          const shortPsid = recipientPsid.slice(-6);
          msgContact = {
            id: recipientPsid,
            name: `User ${shortPsid}`,
            first_name: 'User',
            last_name: shortPsid,
            profile_pic: ''
          };
        }
      } else {
        try {
          msgContact = await profilePsid(senderPsid, whatsapp.facebookUserToken);
        } catch (error) {
          console.log(`⚠️ Erro ao buscar perfil do remetente:`, error.message);

          const shortPsid = senderPsid.slice(-6);
          msgContact = {
            id: senderPsid,
            name: `User ${shortPsid}`,
            first_name: 'User',
            last_name: shortPsid,
            profile_pic: ''
          };
        }
      }

      const contact = await verifyContact(msgContact, whatsapp, companyId);

      let getSession = await Whatsapp.findOne({
        where: {
          facebookPageUserId: whatsapp.facebookPageUserId
        },
        include: [
          {
            model: Queue,
            as: "queues",
            attributes: ["id", "name", "color", "greetingMessage", "integrationId", "promptId"],
            through: { attributes: [] }
          }
        ]
      });

      if (!getSession.queues) {
        console.log("⚠️ Conexão sem filas associadas, inicializando array vazio");
        getSession.queues = [];
      }

      console.log("📋 Filas da conexão carregadas:", {
        connectionId: getSession.id,
        queuesCount: getSession.queues.length,
        queues: getSession.queues.map(q => ({ id: q.id, name: q.name })),
        connectionPromptId: getSession.promptId
      });

      const settings = await Setting.findOne({
        where: { companyId }
      });

      console.log("⚙️ Settings loaded");

      let ticket = await Ticket.findOne({
        where: {
          contactId: contact.id,
          companyId: companyId,
          whatsappId: getSession.id,
          status: {
            [Op.in]: ["open", "pending", "closed"]
          }
        },
        include: [
          {
            model: Contact,
            as: "contact",
          },
          {
            model: Queue,
            as: "queue",
          },
          {
            model: User,
            as: "user",
          },
          {
            model: Whatsapp,
            as: "whatsapp",
          },
        ],
        order: [["updatedAt", "DESC"]]
      });

      if (ticket) {
        console.log("🎫 Ticket encontrado - verificando reutilização:", {
          ticketId: ticket.id,
          status: ticket.status,
          currentUserId: ticket.userId,
          hasPrompt: !!getSession.promptId,
          hasIntegration: !!getSession.integrationId
        });

        if (ticket.status === "closed") {
          const timeSinceClose = new Date().getTime() - new Date(ticket.updatedAt).getTime();
          const maxTimeToReopen = 24 * 60 * 60 * 1000;

          if (timeSinceClose < maxTimeToReopen) {
            // ✅ REABRIR E LIMPAR USUÁRIO/FILA
            await ticket.update({
              status: "pending",
              unreadMessages: 0,
              userId: null,
              queueId: null
            });

            console.log("🔄 Ticket reaberto e limpo:", {
              ticketId: ticket.id,
              newStatus: "pending",
              userId: null,
              queueId: null
            });

            const io = getIO();
            io.to(ticket.status)
              .to(`company-${companyId}-${ticket.status}`)
              .emit(`company-${companyId}-ticket`, {
                action: "update",
                ticket,
              });
          } else {
            ticket = null;
          }
        } else if (ticket.status === "open" || ticket.status === "pending") {
          // ✅ FIX PRINCIPAL: SE TEM PROMPT/INTEGRAÇÃO NA CONEXÃO E TICKET TEM USUÁRIO, LIMPAR USUÁRIO
          const shouldResetForAI = !fromMe && (
            (!isNil(getSession.promptId) && !ticket.useIntegration) ||
            (!isNil(getSession.integrationId) && !ticket.useIntegration)
          );

          if (shouldResetForAI && ticket.userId) {
            console.log("🤖 Limpando userId para permitir IA/Integração da conexão:", {
              ticketId: ticket.id,
              previousUserId: ticket.userId,
              connectionPromptId: getSession.promptId,
              connectionIntegrationId: getSession.integrationId,
              ticketUseIntegration: ticket.useIntegration
            });

            await ticket.update({
              userId: null,
              status: "pending" // ✅ GARANTIR QUE FICA PENDING PARA IA PROCESSAR
            });

            // ✅ EMITIR EVENTO DE ATUALIZAÇÃO
            const io = getIO();
            io.to(`company-${companyId}-mainchannel`)
              .to(`company-${companyId}-pending`)
              .emit(`company-${companyId}-ticket`, {
                action: "update",
                ticket: await ticket.reload({
                  include: [
                    { model: Contact, as: "contact" },
                    { model: Queue, as: "queue" },
                    { model: User, as: "user" },
                    { model: Whatsapp, as: "whatsapp" }
                  ]
                })
              });
          }

          console.log("✅ Reutilizando ticket existente:", {
            ticketId: ticket.id,
            status: ticket.status,
            userId: ticket.userId,
            readyForAI: !ticket.userId && !ticket.useIntegration
          });
        }
      }

      if (!ticket) {
        try {
          ticket = await CreateTicketService({
            contactId: contact.id,
            status: "pending",
            companyId,
            whatsappId: getSession.id,
            channel: detectedChannel
          });

          console.log("✨ Novo ticket criado:", {
            id: ticket.id,
            status: ticket.status,
            contactId: contact.id,
            channel: detectedChannel
          });

          const io = getIO();
          io.to(`company-${companyId}-mainchannel`)
            .to(`company-${companyId}-pending`)
            .to("pending")
            .emit(`company-${companyId}-ticket`, {
              action: "create",
              ticket,
              ticketId: ticket.id
            });

        } catch (createError) {
          console.error("❌ Erro ao criar ticket:", createError);

          ticket = await Ticket.findOne({
            where: {
              contactId: contact.id,
              companyId: companyId
            },
            order: [["updatedAt", "DESC"]]
          });

          if (ticket) {
            await ticket.update({
              status: "pending",
              whatsappId: getSession.id
            });
          } else {
            throw new Error(`Não foi possível criar ou encontrar ticket para contato ${contact.id}: ${createError.message}`);
          }
        }
      }

      // ✅ RECARREGAR TICKET COM TODAS AS ASSOCIAÇÕES
      await ticket.reload({
        include: [
          {
            model: Contact,
            as: "contact",
          },
          {
            model: Queue,
            as: "queue",
          },
          {
            model: User,
            as: "user",
          },
          {
            model: Whatsapp,
            as: "whatsapp",
          },
        ]
      });

      // ✅ VERIFICAR HORÁRIO DE FUNCIONAMENTO
      try {
        const schedule = await VerifyCurrentSchedule(ticket.companyId);

        if (
          (settings as any)?.scheduleType === "company" &&
          !ticket?.user &&
          !fromMe &&
          !(schedule as any).inActivity
        ) {
          const body = (schedule as any).message || "Estamos fora do horário de atendimento.";

          const sentMessage = await sendFacebookMessage({
            ticket,
            body
          });

          return { success: true };
        }
      } catch (scheduleError) {
        console.log("⚠️ Erro ao verificar horário:", scheduleError);
      }

      if (message.attachments && message.attachments.length > 0) {
        console.log("📎 Anexo detectado:", {
          type: message.attachments[0].type,
          hasUrl: !!message.attachments[0].payload?.url
        });

        // ✅ PROCESSAR COMO MÍDIA (incluindo áudio, imagem, vídeo, documento)
        await verifyMessageMedia(message, ticket, contact, fromMe, detectedChannel);
      } else {
        // ✅ MENSAGEM DE TEXTO
        await verifyMessageFace(message, bodyMessage, ticket, contact, fromMe, detectedChannel);
      }

      // ✅ SE É MENSAGEM NOSSA, NÃO PROCESSAR LÓGICA DO BOT
      if (fromMe) {
        return { success: true };
      }

      // ✅ VERIFICAÇÕES DE SEGURANÇA
      if (ticket.contact.disableBot) {
        console.log("🚫 Bot desabilitado para este contato");
        return { success: true };
      }

      // ✅ TRACKING DE TICKET
      const ticketTraking = await FindOrCreateATicketTrakingService({
        ticketId: ticket.id,
        companyId,
        whatsappId: getSession.id
      });

      try {
        if ((settings as any)?.userRating && ticket?.user) {
          await handleRating(message, ticket, ticketTraking);
        }
      } catch (ratingError) {
        console.error("❌ Erro no rating:", ratingError);
      }

      const queuesLength = getSession.queues ? getSession.queues.length : 0;

      // ✅ LOG DE DEBUG PARA VERIFICAÇÃO
      console.log("🔍 Verificação de condições para IA/Integração:", {
        ticketId: ticket.id,
        imported: ticket.imported,
        isGroup: ticket.isGroup,
        userId: ticket.userId,
        useIntegration: ticket.useIntegration,
        connectionPromptId: getSession.promptId,
        connectionIntegrationId: getSession.integrationId,
        ticketPromptId: ticket.promptId,
        ticketIntegrationId: ticket.integrationId,
        queuesLength
      });

      // ✅ IA DA CONEXÃO (PRIORIDADE MÁXIMA)
      if (
        !ticket.imported &&
        !ticket.isGroup &&
        !ticket.userId &&
        !isNil(getSession.promptId)
      ) {
        // ✅ VERIFICAR SE DEVE PROCESSAR A IA
        const shouldProcessAI = !ticket.useIntegration ||
          !ticket.promptId ||
          Number(ticket.promptId) === Number(getSession.promptId);

        console.log("🤖 Verificação da IA da conexão:", {
          ticketId: ticket.id,
          connectionPromptId: getSession.promptId,
          ticketPromptId: ticket.promptId,
          ticketUseIntegration: ticket.useIntegration,
          shouldProcessAI,
          comparison: `ticket:${ticket.promptId} === connection:${getSession.promptId} = ${Number(ticket.promptId) === Number(getSession.promptId)}`
        });

        if (shouldProcessAI) {
          console.log("🤖 EXECUTANDO OpenAI na conexão Facebook:", {
            ticketId: ticket.id,
            promptId: getSession.promptId,
            connectionId: getSession.id
          });

          try {
            await handleOpenAiFacebook(message, getSession, ticket, contact, undefined, ticketTraking);

            // ✅ ATUALIZAR TICKET COM CONFIGURAÇÕES DA IA
            await ticket.update({
              useIntegration: true,
              promptId: getSession.promptId,
              integrationId: null // ✅ GARANTIR QUE INTEGRAÇÃO FICA NULL
            });

            console.log("✅ IA da conexão executada com sucesso");
            return { success: true };
          } catch (aiError) {
            console.error("❌ Erro na IA da conexão:", aiError);
          }
        }
      }

      // ✅ INTEGRAÇÃO DA CONEXÃO
      if (
        !ticket.imported &&
        !ticket.isGroup &&
        !ticket.userId &&
        !isNil(getSession.integrationId) // ✅ Esta condição já garante que só executa se tiver integração
      ) {
        // ✅ VERIFICAR SE DEVE PROCESSAR A INTEGRAÇÃO
        const shouldProcessIntegration = !ticket.useIntegration ||
          !ticket.integrationId ||
          Number(ticket.integrationId) === Number(getSession.integrationId);

        console.log("🔗 Verificação da integração da conexão:", {
          ticketId: ticket.id,
          connectionIntegrationId: getSession.integrationId,
          ticketIntegrationId: ticket.integrationId,
          ticketUseIntegration: ticket.useIntegration,
          shouldProcessIntegration
        });

        if (shouldProcessIntegration) {
          console.log("🔗 EXECUTANDO integração na conexão Facebook:", {
            ticketId: ticket.id,
            integrationId: getSession.integrationId,
            connectionId: getSession.id
          });

          try {
            const integrations = await ShowQueueIntegrationService(getSession.integrationId, companyId);
            await handleMessageIntegrationFacebook(message, getSession, integrations, ticket);

            // ✅ ATUALIZAR TICKET COM CONFIGURAÇÕES DA INTEGRAÇÃO
            await ticket.update({
              useIntegration: true,
              integrationId: integrations.id,
              promptId: null // ✅ LIMPAR PROMPT SE TEM INTEGRAÇÃO
            });

            console.log("✅ Integração da conexão executada com sucesso");
            return { success: true };
          } catch (integrationError) {
            console.error("❌ Erro na integração da conexão:", integrationError);
          }
        }
      }

      // ✅ IA/INTEGRAÇÃO NA FILA
      if (
        !ticket.imported &&
        !ticket.isGroup &&
        !ticket.userId &&
        !isNil(ticket.promptId) &&
        ticket.useIntegration &&
        ticket.queueId
      ) {
        console.log("🤖 Executando OpenAI na fila");
        await handleOpenAiFacebook(message, getSession, ticket, contact, undefined, ticketTraking);
        return { success: true };
      }

      if (
        !ticket.imported &&
        !ticket.isGroup &&
        !ticket.userId &&
        ticket.integrationId &&
        ticket.useIntegration &&
        ticket.queue
      ) {
        console.log("🔗 Executando integração na fila");
        const integrations = await ShowQueueIntegrationService(ticket.integrationId, companyId);
        await handleMessageIntegrationFacebook(message, getSession, integrations, ticket);
        return { success: true };
      }

      // ✅ VERIFICAR FILAS APENAS SE EXISTIR ALGUMA
      if (
        !ticket.imported &&
        !ticket.queue &&
        !ticket.isGroup &&
        !ticket.userId &&
        queuesLength >= 1 &&
        !ticket.useIntegration
      ) {
        console.log("📋 Verificando filas disponíveis");
        await verifyQueue(getSession, message, ticket, contact, ticketTraking);

        if (ticketTraking.chatbotAt === null) {
          await ticketTraking.update({
            chatbotAt: moment().toDate(),
          });
        }
        return { success: true };
      }

      const dontReadTheFirstQuestion = ticket.queue === null;
      await ticket.reload();

      // ✅ CHATBOT DAS FILAS
      if (queuesLength == 1 && ticket.queue) {
        if (ticket.chatbot && !fromMe) {
          console.log("🤖 Executando chatbot da fila única");
          await handleChartbotFacebook(ticket, message, getSession, dontReadTheFirstQuestion, ticketTraking);
          return { success: true };
        }
      }

      if (queuesLength > 1 && ticket.queue) {
        if (ticket.chatbot && !fromMe) {
          console.log("🤖 Executando chatbot de múltiplas filas");
          await handleChartbotFacebook(ticket, message, getSession, dontReadTheFirstQuestion, ticketTraking);
          return { success: true };
        }
      }

      // ✅ SE CHEGOU ATÉ AQUI E NÃO TEM FILAS, APENAS REGISTRAR A MENSAGEM
      if (queuesLength === 0) {
        console.log("📝 Conexão Facebook sem filas - apenas registrando mensagem");
        return { success: true };
      }

    } // ✅ FECHAR O if (messagingEvent.message)

    return { success: true };

  } catch (error) {
    console.error("❌ Error in handleMessage:", error);
    throw new Error(`Error: ${error.message}`);
  }
}; // ✅ FECHAR A FUNÇÃO handleMessage

// ✅ CORRIGIR verifyQueue PARA EVITAR queueId=0
const verifyQueue = async (
  getSession: Whatsapp,
  msg: any,
  ticket: Ticket,
  contact: Contact,
  ticketTraking?: any
) => {
  console.log("🔍 verifyQueue iniciado:", {
    ticketId: ticket.id,
    messageText: msg.text,
    hasQueueId: !!ticket.queueId
  });

  // ✅ OBTER FILAS COM VERIFICAÇÃO SEGURA
  let queues = [];
  let greetingMessage = "";
  let maxUseBotQueues = 3;
  let timeUseBotQueues = 0;

  try {
    const whatsappData = await ShowWhatsAppService(getSession.id!, ticket.companyId);
    queues = whatsappData.queues || [];
    greetingMessage = whatsappData.greetingMessage || "Bem-vindo!";
    maxUseBotQueues = whatsappData.maxUseBotQueues || 3;
    timeUseBotQueues = Number(whatsappData.timeUseBotQueues) || 0;
  } catch (error) {
    console.error("❌ Erro ao carregar dados do WhatsApp:", error);
    // ✅ FALLBACK: BUSCAR FILAS DIRETAMENTE DA CONEXÃO
    if (getSession.queues && Array.isArray(getSession.queues)) {
      queues = getSession.queues;
    }
  }

  console.log("📋 Filas disponíveis:", queues.map(q => ({ id: q.id, name: q.name })));

  // ✅ SE NÃO TEM FILAS, RETORNAR
  if (!queues || queues.length === 0) {
    console.log("⚠️ Nenhuma fila disponível");
    return;
  }

  if (queues.length === 1) {
    const firstQueue = head(queues);
    let chatbot = false;

    if (firstQueue && 'chatbots' in firstQueue) {
      const queueWithChatbots = firstQueue as any;
      chatbot = queueWithChatbots.chatbots && queueWithChatbots.chatbots.length > 0;
    }

    // ✅ INTEGRAÇÃO N8N/WEBHOOK/TYPEBOT NA FILA ÚNICA (PRIORIDADE MÁXIMA)
    if (!isNil(queues[0]?.integrationId)) {
      console.log("🔗 Iniciando integração da fila única:", queues[0].integrationId);

      try {
        const integrations = await ShowQueueIntegrationService(queues[0].integrationId, ticket.companyId);

        await handleMessageIntegrationFacebook(msg, getSession, integrations, ticket);

        // ✅ FIX: VERIFICAR SE A FILA EXISTE ANTES DE DEFINIR
        const queueExists = await Queue.findByPk(queues[0].id);
        if (queueExists) {
          await ticket.update({
            queueId: queues[0].id,
            useIntegration: true,
            integrationId: integrations.id
          });
        } else {
          console.error(`❌ Fila ${queues[0].id} não existe na tabela Queues`);
          await ticket.update({
            queueId: null, // ✅ NÃO DEFINIR FILA INVÁLIDA
            useIntegration: true,
            integrationId: integrations.id
          });
        }

        return; // ✅ PARAR AQUI SE TEM INTEGRAÇÃO
      } catch (error) {
        console.error("❌ Erro ao buscar integração da fila única:", error);
      }
    }

    // ✅ INTEGRAÇÃO OPENAI NA FILA ÚNICA (igual ao WhatsApp)
    if (!isNil(queues[0]?.promptId)) {
      console.log("🤖 Iniciando OpenAI da fila única:", queues[0].promptId);

      await handleOpenAiFacebook(msg, getSession, ticket, contact, undefined, ticketTraking);

      // ✅ FIX: VERIFICAR SE A FILA EXISTE ANTES DE DEFINIR
      const queueExists = await Queue.findByPk(queues[0].id);
      if (queueExists) {
        await ticket.update({
          queueId: queues[0].id,
          useIntegration: true,
          promptId: queues[0]?.promptId
        });
      } else {
        console.error(`❌ Fila ${queues[0].id} não existe na tabela Queues`);
        await ticket.update({
          queueId: null, // ✅ NÃO DEFINIR FILA INVÁLIDA
          useIntegration: true,
          promptId: queues[0]?.promptId
        });
      }

      return; // ✅ PARAR AQUI SE TEM OPENAI
    }

    // ✅ FIX: VERIFICAR SE A FILA EXISTE ANTES DE DEFINIR
    const queueExists = await Queue.findByPk(firstQueue.id);
    if (queueExists) {
      await UpdateTicketService({
        ticketData: { queueId: queues[0].id, chatbot },
        ticketId: ticket.id,
        companyId: ticket.companyId
      });
    } else {
      console.error(`❌ Fila ${firstQueue.id} não existe na tabela Queues`);
      return; // ✅ NÃO CONTINUAR SE FILA NÃO EXISTE
    }

    // ✅ BUSCAR A FILA COMPLETA COM OPÇÕES PARA EXIBIR O MENU
    const queueWithOptions = await Queue.findByPk(firstQueue.id, {
      include: [
        {
          model: QueueOption,
          as: "options",
          where: { parentId: null },
          order: [["option", "ASC"]],
          required: false
        }
      ]
    });

    // ✅ SE TEM OPÇÕES, EXIBIR MENU
    if (queueWithOptions?.options && queueWithOptions.options.length > 0) {
      let optionsText = "";
      queueWithOptions.options.forEach((option, index) => {
        optionsText += `[${option.option}] - ${option.title}\n`;
      });

      const menuBody = `${queueWithOptions.greetingMessage || greetingMessage}\n\n${optionsText}\n[0] - Menu anterior\n[#] - Menu inicial`;

      const sentMessage = await sendFacebookMessage({
        ticket,
        body: menuBody
      });

      console.log("🤖 Enviado menu de opções da fila para Facebook");
      return;
    }

    // ✅ SE NÃO TEM OPÇÕES, ENVIAR APENAS SAUDAÇÃO
    if (queueWithOptions?.greetingMessage) {
      const sentMessage = await sendFacebookMessage({
        ticket,
        body: queueWithOptions.greetingMessage
      });
      console.log("👋 Enviada saudação da fila");
    }

    return;
  }

  // REGRA PARA DESABILITAR O BOT PARA ALGUM CONTATO
  if (contact.disableBot) {
    console.log("🚫 Bot desabilitado para este contato");
    return;
  }

  let selectedOption = "";

  if (ticket.status !== "lgpd") {
    selectedOption = msg.text || "";
    console.log("📝 Opção selecionada pelo usuário:", selectedOption);
  } else {
    const ticketWithLgpd = ticket as any;
    if (!isNil(ticketWithLgpd.lgpdAcceptedAt)) {
      await ticket.update({
        status: "pending"
      });
    }
    await ticket.reload();
  }

  // ✅ TRATAMENTO ESPECIAL PARA NAVEGAÇÃO DE MENUS (PRIORIDADE MÁXIMA)
  if (selectedOption === "#") {
    console.log("🏠 Usuário solicitou menu inicial");

    // Limpar fila do ticket para voltar ao menu inicial
    await UpdateTicketService({
      ticketData: { queueId: null, useIntegration: false, promptId: null },
      ticketId: ticket.id,
      companyId: ticket.companyId
    });

    // Recarregar ticket para ter dados atualizados
    await ticket.reload();

    // Mostrar menu inicial de filas
    let options = "";
    queues.forEach((queue, index) => {
      options += `[${index + 1}] - ${queue.name}\n`;
    });

    const body = `${greetingMessage}\n\n${options}`;

    const sentMessage = await sendFacebookMessage({
      ticket,
      body: body
    });

    console.log("🏠 Retornado ao menu inicial");
    return;
  }

  if (selectedOption === "0") {
    console.log("⬅️ Usuário solicitou menu anterior");

    // Se já está no menu principal (sem fila), mostrar mensagem
    if (!ticket.queueId) {
      const body = "📍 Você já está no menu principal!";

      const sentMessage = await sendFacebookMessage({
        ticket,
        body: body
      });

      await sleep(1000);

      // Mostrar menu principal novamente
      let options = "";
      queues.forEach((queue, index) => {
        options += `[${index + 1}] - ${queue.name}\n`;
      });

      const menuBody = `${greetingMessage}\n\n${options}`;

      const sentMainMenu = await sendFacebookMessage({
        ticket,
        body: menuBody
      });

      console.log("📍 Já no menu principal - reenviado");
      return;
    }

    // Se está em uma fila, voltar para o menu principal
    await UpdateTicketService({
      ticketData: { queueId: null, useIntegration: false, promptId: null },
      ticketId: ticket.id,
      companyId: ticket.companyId
    });

    // Recarregar ticket
    await ticket.reload();

    // Mostrar menu principal
    let options = "";
    queues.forEach((queue, index) => {
      options += `[${index + 1}] - ${queue.name}\n`;
    });

    const body = `${greetingMessage}\n\n${options}`;

    const sentMessage = await sendFacebookMessage({
      ticket,
      body: body
    });

    console.log("⬅️ Retornado ao menu anterior (principal)");
    return;
  }

  // Verificar se a seleção é um número válido
  const isValidSelection = selectedOption && /^\d+$/.test(selectedOption.trim());

  if (isValidSelection) {
    const queueIndex = parseInt(selectedOption.trim(), 10) - 1;
    const choosenQueue = queues[queueIndex];

    console.log("🎯 Tentativa de seleção de fila:", {
      selectedOption,
      queueIndex,
      queueFound: !!choosenQueue,
      queueName: choosenQueue?.name
    });

    if (choosenQueue) {
      console.log("✅ Fila selecionada com sucesso:", choosenQueue.name);

      // ✅ FIX: VERIFICAR SE A FILA EXISTE NO BANCO ANTES DE USAR
      const queueExists = await Queue.findByPk(choosenQueue.id);
      if (!queueExists) {
        console.error(`❌ Fila selecionada ${choosenQueue.id} não existe na tabela Queues`);

        const errorBody = `❌ Fila selecionada não está disponível. Escolha uma das opções válidas.`;
        await sendFacebookMessage({
          ticket,
          body: errorBody
        });
        return;
      }

      if (!isNil(choosenQueue?.integrationId)) {
        console.log("🔗 Iniciando integração da fila selecionada:", choosenQueue.integrationId);

        try {
          const integrations = await ShowQueueIntegrationService(choosenQueue.integrationId, ticket.companyId);

          await handleMessageIntegrationFacebook(msg, getSession, integrations, ticket);

          await ticket.update({
            queueId: choosenQueue.id, // ✅ FILA VERIFICADA COMO EXISTENTE
            useIntegration: true,
            integrationId: integrations.id
          });

          return; // ✅ PARAR AQUI SE TEM INTEGRAÇÃO
        } catch (error) {
          console.error("❌ Erro ao buscar integração da fila selecionada:", error);
        }
      }

      if (!isNil(choosenQueue?.promptId)) {
        console.log("🤖 Iniciando OpenAI da fila selecionada:", choosenQueue.promptId);

        await handleOpenAiFacebook(msg, getSession, ticket, contact, undefined, ticketTraking);

        await ticket.update({
          queueId: choosenQueue.id, // ✅ FILA VERIFICADA COMO EXISTENTE
          useIntegration: true,
          promptId: choosenQueue?.promptId
        });

        return; // ✅ PARAR AQUI SE TEM OPENAI
      }

      // ✅ ATUALIZAR TICKET COM A FILA SELECIONADA (VERIFICADA)
      await UpdateTicketService({
        ticketData: { queueId: choosenQueue.id },
        ticketId: ticket.id,
        companyId: ticket.companyId
      });

      // ✅ BUSCAR A FILA COMPLETA COM OPÇÕES DO BANCO
      const queueWithOptions = await Queue.findByPk(choosenQueue.id, {
        include: [
          {
            model: QueueOption,
            as: "options",
            where: { parentId: null },
            order: [["option", "ASC"]],
            required: false
          }
        ]
      });

      console.log("🔍 Fila carregada com opções:", {
        queueId: queueWithOptions?.id,
        optionsCount: queueWithOptions?.options?.length || 0
      });

      // ✅ SE TEM OPÇÕES DE CHATBOT, EXIBIR MENU
      if (queueWithOptions?.options && queueWithOptions.options.length > 0) {
        let optionsText = "";
        queueWithOptions.options.forEach((option, index) => {
          optionsText += `[${option.option}] - ${option.title}\n`;
        });

        // ✅ MENSAGEM FORMATADA PARA FACEBOOK
        const menuBody = `${queueWithOptions.greetingMessage || "Escolha uma opção:"}\n\n${optionsText}\n[0] - Menu anterior\n[#] - Menu inicial`;

        const sentMessage = await sendFacebookMessage({
          ticket,
          body: menuBody
        });

        console.log("🤖 Enviado menu de opções da fila para Facebook");
        return;
      }

      // ✅ SE NÃO TEM OPÇÕES, ENVIAR APENAS SAUDAÇÃO
      const body = queueWithOptions?.greetingMessage || `Bem-vindo ao ${choosenQueue.name}`;

      const sentMessage = await sendFacebookMessage({
        ticket,
        body: body
      });

      console.log("📝 Enviada mensagem de boas-vindas da fila");
      return;

    } else {
      // ✅ SÓ ENVIAR MENSAGEM DE ERRO SE NÃO ATINGIU LIMITE
      if (!maxUseBotQueues || !ticket.amountUsedBotQueues || ticket.amountUsedBotQueues < maxUseBotQueues) {
        // Enviar mensagem de erro e mostrar opções novamente
        await sleep(1000);

        let options = "";
        queues.forEach((queue, index) => {
          options += `[${index + 1}] - ${queue.name}\n`;
        });

        const errorBody = `❌ Opção inválida. Por favor, escolha uma das opções abaixo:\n\n${greetingMessage}\n\n${options}`;

        const sentMessage = await sendFacebookMessage({
          ticket,
          body: errorBody
        });

        // Atualizar contagem de uso do bot
        await UpdateTicketService({
          ticketData: { amountUsedBotQueues: (ticket.amountUsedBotQueues || 0) + 1 },
          ticketId: ticket.id,
          companyId: ticket.companyId
        });

        console.log("📤 Reenviado menu com mensagem de erro");
      } else {
        console.log("🚫 Limite de mensagens do bot atingido - não enviando mais mensagens");
      }
      return;
    }
  } else if (ticket.amountUsedBotQueues > 0) {
    if (!maxUseBotQueues || ticket.amountUsedBotQueues < maxUseBotQueues) {
      let options = "";
      queues.forEach((queue, index) => {
        options += `[${index + 1}] - ${queue.name}\n`;
      });

      const helpBody = `💡 Por favor, digite apenas o *número* da opção desejada:\n\n${greetingMessage}\n\n${options}`;

      const sentMessage = await sendFacebookMessage({
        ticket,
        body: helpBody
      });

      await UpdateTicketService({
        ticketData: { amountUsedBotQueues: (ticket.amountUsedBotQueues || 0) + 1 },
        ticketId: ticket.id,
        companyId: ticket.companyId
      });

      console.log("📤 Reenviado menu com instrução de ajuda");
    } else {
      console.log("🚫 Limite de mensagens do bot atingido - parando interação");
    }
    return;
  } else {
    // Primeira interação - mostrar menu inicial
    console.log("🎬 Primeira interação - mostrando menu inicial");

    let options = "";
    queues.forEach((queue, index) => {
      options += `[${index + 1}] - ${queue.name}\n`;
    });

    const body = `${greetingMessage}\n\n${options}`;

    const sentMessage = await sendFacebookMessage({
      ticket,
      body: body
    });

    await UpdateTicketService({
      ticketData: { amountUsedBotQueues: 1 },
      ticketId: ticket.id,
      companyId: ticket.companyId
    });

    console.log("📤 Menu inicial enviado");
  }
};


const handleChartbotFacebook = async (
  ticket: Ticket,
  msg: any,
  token: Whatsapp,
  dontReadTheFirstQuestion: boolean = false,
  ticketTraking: any
) => {
  const queue = await Queue.findByPk(ticket.queueId, {
    include: [
      {
        model: QueueOption,
        as: "options",
        where: { parentId: null },
        order: [
          ["option", "ASC"],
          ["createdAt", "ASC"],
        ],
      },
    ],
  });

  const messageBody = msg.text;

  if (messageBody == "#") {
    // voltar para o menu inicial
    await ticket.update({ queueOptionId: null, chatbot: false, queueId: null });
    await verifyQueue(token, msg, ticket, ticket.contact, ticketTraking);
    return;
  }

  // voltar para o menu anterior
  if (!isNil(queue) && !isNil(ticket.queueOptionId) && messageBody == "0") {
    const option = await QueueOption.findByPk(ticket.queueOptionId);
    // ✅ FIX: Garantir que parentId seja number ou null
    const parentId = option?.parentId ? Number(option.parentId) : null;
    await ticket.update({ queueOptionId: parentId });

  } else if (!isNil(queue) && !isNil(ticket.queueOptionId)) {
    const count = await QueueOption.count({ where: { parentId: ticket.queueOptionId } });

    let option: any = {};

    if (count == 1) {
      option = await QueueOption.findOne({ where: { parentId: ticket.queueOptionId } });
    } else {
      option = await QueueOption.findOne({
        where: {
          option: messageBody || "",
          parentId: ticket.queueOptionId,
        },
      });
    }
    if (option) {
      // ✅ FIX: Garantir que option.id seja number
      await ticket.update({ queueOptionId: Number(option.id) });
    }

  } else if (!isNil(queue) && isNil(ticket.queueOptionId) && !dontReadTheFirstQuestion) {
    const option = queue?.options.find((o) => o.option == messageBody);
    if (option) {
      // ✅ FIX: Garantir que option.id seja number
      await ticket.update({ queueOptionId: Number(option.id) });
    }
  }

  await ticket.reload();

  if (!isNil(queue) && isNil(ticket.queueOptionId)) {
    const queueOptions = await QueueOption.findAll({
      where: { queueId: ticket.queueId, parentId: null },
      order: [
        ["option", "ASC"],
        ["createdAt", "ASC"],
      ],
    });

    let options = "";
    queueOptions.forEach((option, i) => {
      options += `*[ ${option.option} ]* - ${option.title}\n`;
    });
    options += `\n*[ 0 ]* - Menu anterior`;
    options += `\n*[ # ]* - Menu inicial`;

    const textMessage = {
      text: formatBody(`\u200e${queue.greetingMessage}\n\n${options}`, ticket.contact)
    };

    const sentMessage = await sendFacebookMessage({
      ticket,
      body: textMessage.text
    });

  } else if (!isNil(queue) && !isNil(ticket.queueOptionId)) {
    const currentOption = await QueueOption.findByPk(ticket.queueOptionId);
    const queueOptions = await QueueOption.findAll({
      where: { parentId: ticket.queueOptionId },
      order: [
        ["option", "ASC"],
        ["createdAt", "ASC"],
      ],
    });

    if (currentOption?.closeTicket) {
      const sentMessage = await sendFacebookMessage({
        ticket,
        body: formatBody(`\u200e${currentOption.message}`, ticket.contact)
      });

      await UpdateTicketService({
        ticketData: { queueOptionId: null, chatbot: false, status: "closed" },
        ticketId: ticket.id,
        companyId: ticket.companyId,
      });

    } else if (currentOption?.forwardQueueId) {
      const sentMessage = await sendFacebookMessage({
        ticket,
        body: formatBody(`\u200e${currentOption.message}`, ticket.contact)
      });

      // ✅ FIX: Garantir que forwardQueueId seja number
      const forwardQueueId = Number(currentOption.forwardQueueId);

      await UpdateTicketService({
        ticketData: {
          queueOptionId: null,
          queueId: forwardQueueId,
          chatbot: false,
          status: "pending"
        },
        ticketId: ticket.id,
        companyId: ticket.companyId,
      });
    } else if (queueOptions.length > 0) {
      let options = "";
      queueOptions.forEach((option, i) => {
        options += `*[ ${option.option} ]* - ${option.title}\n`;
      });
      options += `\n*[ 0 ]* - Menu anterior`;
      options += `\n*[ # ]* - Menu inicial`;

      const textMessage = formatBody(`\u200e${currentOption?.message}\n\n${options}`, ticket.contact);

      const sentMessage = await sendFacebookMessage({
        ticket,
        body: textMessage
      });
    } else {
      // ✅ ADICIONAR: SE NÃO TEM MAIS OPÇÕES, FINALIZAR CHATBOT
      const finalMessage = currentOption?.message || "Obrigado pelo contato!";

      const sentMessage = await sendFacebookMessage({
        ticket,
        body: formatBody(`\u200e${finalMessage}`, ticket.contact)
      });

      // ✅ LIMPAR CHATBOT E DEIXAR PARA ATENDIMENTO HUMANO
      await UpdateTicketService({
        ticketData: {
          queueOptionId: null,
          chatbot: false,
          status: "pending"
        },
        ticketId: ticket.id,
        companyId: ticket.companyId,
      });
    }
  }
};

// ✅ ADICIONAR ESTA FUNÇÃO NO facebookMessageListener.ts

const processAudioMessage = async (
  msg: any,
  ticket: Ticket,
  contact: Contact,
  fromMe: boolean = false,
  channel: string = "facebook"
): Promise<Message> => {
  console.log("🎵 Processando áudio Facebook/Instagram:", {
    ticketId: ticket.id,
    channel,
    fromMe
  });

  try {
    // ✅ BAIXAR ÁUDIO
    const attachment = msg.attachments[0];
    const audioUrl = attachment.payload?.url;

    const response = await axios.get(audioUrl, {
      responseType: "arraybuffer",
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const audioData = Buffer.from(response.data);

    // ✅ DETECTAR FORMATO
    const { fileTypeFromBuffer } = await import("file-type");
    const detectedType = await fileTypeFromBuffer(audioData);

    const originalExt = detectedType?.ext || 'mp3';
    const timestamp = Date.now();
    const originalFileName = `audio_${timestamp}.${originalExt}`;
    const convertedFileName = `audio_${timestamp}_converted.ogg`;

    // ✅ CRIAR DIRETÓRIOS
    const folder = `public/company${ticket.companyId}`;
    const fullPath = join(__dirname, "..", "..", "..", folder);

    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      fs.chmodSync(fullPath, 0o777);
    }

    const originalPath = join(fullPath, originalFileName);
    const convertedPath = join(fullPath, convertedFileName);

    // ✅ SALVAR ARQUIVO ORIGINAL
    writeFileSync(originalPath, audioData);

    // ✅ CONVERTER PARA OGG SE NECESSÁRIO (OPCIONAL)
    let finalFileName = originalFileName;
    if (originalExt !== 'ogg' && originalExt !== 'mp3') {
      try {
        await convertAudioToOgg(originalPath, convertedPath);
        finalFileName = convertedFileName;

        // ✅ REMOVER ARQUIVO ORIGINAL APÓS CONVERSÃO
        fs.unlinkSync(originalPath);

        console.log("✅ Áudio convertido para OGG:", finalFileName);
      } catch (conversionError) {
        console.log("⚠️ Conversão falhou, usando arquivo original:", conversionError.message);
        finalFileName = originalFileName;
      }
    }

    // ✅ CRIAR MENSAGEM
    const messageId = msg.mid || `${channel}_audio_${timestamp}`;

    const messageData = {
      id: messageId,
      wid: messageId,
      ticketId: ticket.id,
      contactId: fromMe ? undefined : contact.id,
      body: msg.text || "🎵 Áudio",
      fromMe: fromMe,
      mediaType: 'audio',
      mediaUrl: finalFileName,
      read: fromMe ? true : false,
      quotedMsgId: null,
      ack: fromMe ? 3 : 1,
      dataJson: JSON.stringify({
        ...msg,
        processedAudio: {
          originalFormat: originalExt,
          finalFormat: finalFileName.split('.').pop(),
          duration: null // Poderia ser extraído com ffprobe
        }
      }),
      channel: channel
    };

    const message = await CreateMessageService({
      messageData,
      companyId: ticket.companyId
    });

    console.log("✅ Áudio processado com sucesso:", {
      messageId: message.id,
      fileName: finalFileName,
      originalFormat: originalExt
    });

    return message;

  } catch (error) {
    console.error("❌ Erro ao processar áudio:", error);
    throw error;
  }
};

const convertAudioToOgg = (inputPath: string, outputPath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .audioCodec('libopus')
      .format('ogg')
      .on('end', () => {
        console.log("🔄 Conversão de áudio concluída");
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error("❌ Erro na conversão:", err);
        reject(err);
      })
      .save(outputPath);
  });
};