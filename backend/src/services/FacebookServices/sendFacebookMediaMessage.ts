import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import path from "path";
import mime from "mime-types";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import CreateMessageService from "../MessageServices/CreateMessageService";
import Contact from "../../models/Contact";
import { getIO } from "../../libs/socket";
import { verifyMessageMedia } from "./facebookMessageListener";

// ✅ INTERFACE ATUALIZADA PARA SUPORTAR AMBOS OS FORMATOS
interface SendFacebookMediaRequest {
  ticket: Ticket;
  media?: Express.Multer.File;  // ✅ FORMATO NOVO
  mediaPath?: string;           // ✅ FORMATO ANTIGO
  mediaType?: string;           // ✅ FORMATO ANTIGO
  body?: string;
  caption?: string;             // ✅ FORMATO ANTIGO
  fileName?: string;            // ✅ FORMATO ANTIGO
  isPrivate?: boolean;
}

export const sendFacebookMediaMessage = async ({
  ticket,
  media,
  mediaPath,
  mediaType,
  body = "",
  caption = "",
  fileName,
  isPrivate = false
}: SendFacebookMediaRequest): Promise<Message> => {
  try {
    // ✅ COMPATIBILIDADE: DETECTAR QUAL FORMATO ESTÁ SENDO USADO
    let finalMediaPath: string;
    let finalMediaType: string;
    let finalFileName: string;
    let finalBody: string;

    if (media) {
      // ✅ FORMATO NOVO (Express.Multer.File)
      finalMediaPath = media.path;
      finalMediaType = media.mimetype;
      finalFileName = media.originalname;
      finalBody = body;
      
      console.log("📎 Enviando mídia Facebook/Instagram (formato novo):", {
        ticketId: ticket.id,
        mediaType: media.mimetype,
        fileName: media.originalname,
        channel: ticket.whatsapp?.channel,
        fileExists: fs.existsSync(media.path),
        fileSize: fs.statSync(media.path).size
      });
    } else if (mediaPath) {
      // ✅ FORMATO ANTIGO (path + tipo)
      finalMediaPath = mediaPath;
      finalMediaType = mediaType || 'application/octet-stream';
      finalFileName = fileName || `media_${Date.now()}`;
      finalBody = caption || body;
      
      console.log("📎 Enviando mídia Facebook/Instagram (formato antigo):", {
        ticketId: ticket.id,
        mediaType: finalMediaType,
        fileName: finalFileName,
        channel: ticket.whatsapp?.channel,
        fileExists: fs.existsSync(mediaPath)
      });
    } else {
      throw new Error("Mídia não fornecida (nem media nem mediaPath)");
    }

    // ✅ VERIFICAR SE ARQUIVO EXISTE
    if (!fs.existsSync(finalMediaPath)) {
      throw new Error(`Arquivo não encontrado: ${finalMediaPath}`);
    }

    const whatsapp = ticket.whatsapp;
    const token = whatsapp.facebookUserToken;
    const recipientId = ticket.contact.number;
    const channel = whatsapp.channel || "facebook";

    if (!token) {
      throw new Error("Token do Facebook não encontrado");
    }

    // ✅ VERIFICAR TAMANHO DO ARQUIVO (Facebook tem limites)
    const fileSize = fs.statSync(finalMediaPath).size;
    const maxSize = getMaxFileSize(finalMediaType);
    
    if (fileSize > maxSize) {
      throw new Error(`Arquivo muito grande. Máximo: ${Math.round(maxSize / 1024 / 1024)}MB`);
    }

    // ✅ 1. UPLOAD DA MÍDIA PARA FACEBOOK
    console.log("📤 Fazendo upload da mídia...");
    
    const formData = new FormData();
    formData.append('file', fs.createReadStream(finalMediaPath));
    formData.append('type', getAttachmentType(finalMediaType));
    formData.append('is_reusable', 'false');

    const uploadUrl = `https://graph.facebook.com/v18.0/me/message_attachments`;
    
    const uploadResponse = await axios.post(uploadUrl, formData, {
      params: { access_token: token },
      headers: {
        ...formData.getHeaders()
      },
      timeout: 60000 // 60 segundos para upload
    });

    const attachmentId = uploadResponse.data.attachment_id;
    console.log("✅ Upload concluído:", attachmentId);

    // ✅ 2. ENVIAR MENSAGEM COM MÍDIA
    const messageData = {
      recipient: { id: recipientId },
      message: {
        attachment: {
          type: getAttachmentType(finalMediaType),
          payload: {
            attachment_id: attachmentId,
            is_reusable: false
          }
        }
      }
    };

    const sendUrl = `https://graph.facebook.com/v18.0/me/messages`;
    
    const messageResponse = await axios.post(sendUrl, messageData, {
      params: { access_token: token },
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000
    });

    console.log("✅ Mídia enviada:", messageResponse.data.message_id);

    // ✅ 3. SALVAR ARQUIVO LOCALMENTE PARA VISUALIZAÇÃO
    let savedFileName: string;
    
    if (media) {
      // ✅ FORMATO NOVO - SALVAR ARQUIVO
      savedFileName = await saveMediaLocally(media, ticket.companyId);
    } else {
      // ✅ FORMATO ANTIGO - USAR NOME EXISTENTE OU COPIAR
      savedFileName = await saveExistingMedia(finalMediaPath, finalFileName, ticket.companyId);
    }

    // ✅ 4. ENVIAR CAPTION SE EXISTIR
    if (finalBody && finalBody.trim()) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // delay

      const captionData = {
        recipient: { id: recipientId },
        message: { text: finalBody }
      };

      try {
        const captionResponse = await axios.post(sendUrl, captionData, {
          params: { access_token: token },
          headers: { 'Content-Type': 'application/json' }
        });

        console.log("✅ Caption enviado:", captionResponse.data.message_id);
      } catch (captionError) {
        console.warn("⚠️ Erro ao enviar caption:", captionError.message);
      }
    }

    // ✅ 5. SALVAR MENSAGEM NO BANCO USANDO O MÉTODO ANTIGO (compatibilidade)
    const fakeMessage = {
      mid: messageResponse.data.message_id,
      attachments: [{
        type: getAttachmentType(finalMediaType),
        payload: { 
          url: `${process.env.BACKEND_URL || 'http://localhost:8080'}/public/company${ticket.companyId}/${savedFileName}`
        }
      }],
      text: finalBody || getMediaDescription(getMediaTypeInternal(finalMediaType))
    };

    // ✅ USAR O MÉTODO EXISTENTE verifyMessageMedia
    const message = await verifyMessageMedia(
      fakeMessage,
      ticket,
      ticket.contact,
      true, // fromMe = true
      channel
    );

    console.log("✅ Mídia Facebook/Instagram processada completamente");

    return message;

  } catch (error) {
    console.error("❌ Erro ao enviar mídia Facebook:", {
      error: error.message,
      status: error.response?.status,
      data: error.response?.data,
      ticketId: ticket.id
    });
    throw new Error(`Erro ao enviar mídia: ${error.message}`);
  }
};

// ✅ FUNÇÃO PARA SALVAR MÍDIA LOCALMENTE (FORMATO NOVO)
const saveMediaLocally = async (media: Express.Multer.File, companyId: number): Promise<string> => {
  const timestamp = Date.now();
  const extension = path.extname(media.originalname) || getExtensionFromMime(media.mimetype);
  const fileName = `${timestamp}_${media.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}${extension}`;
  
  const folder = `public/company${companyId}`;
  const fullPath = path.join(__dirname, "..", "..", "..", folder);

  // ✅ CRIAR DIRETÓRIO SE NÃO EXISTIR
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    fs.chmodSync(fullPath, 0o777);
  }

  const destPath = path.join(fullPath, fileName);

  // ✅ COPIAR ARQUIVO
  fs.copyFileSync(media.path, destPath);

  console.log("💾 Arquivo salvo localmente:", fileName);

  return fileName;
};

// ✅ FUNÇÃO PARA SALVAR MÍDIA EXISTENTE (FORMATO ANTIGO)
const saveExistingMedia = async (mediaPath: string, originalFileName: string, companyId: number): Promise<string> => {
  const timestamp = Date.now();
  const extension = path.extname(originalFileName) || path.extname(mediaPath);
  const fileName = `${timestamp}_${originalFileName.replace(/[^a-zA-Z0-9.]/g, '_')}${extension}`;
  
  const folder = `public/company${companyId}`;
  const fullPath = path.join(__dirname, "..", "..", "..", folder);

  // ✅ CRIAR DIRETÓRIO SE NÃO EXISTIR
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    fs.chmodSync(fullPath, 0o777);
  }

  const destPath = path.join(fullPath, fileName);

  // ✅ COPIAR ARQUIVO
  fs.copyFileSync(mediaPath, destPath);

  console.log("💾 Arquivo existente salvo localmente:", fileName);

  return fileName;
};

// ✅ FUNÇÃO PARA MAPEAR TIPOS DE ANEXO FACEBOOK
const getAttachmentType = (mimetype: string): string => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  return 'file';
};

// ✅ FUNÇÃO PARA MAPEAR TIPOS DE MÍDIA INTERNO
const getMediaTypeInternal = (mimetype: string): string => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  return 'document';
};

// ✅ FUNÇÃO PARA DESCRIÇÃO DA MÍDIA
const getMediaDescription = (mediaType: string): string => {
  const descriptions = {
    'image': 'Imagem',
    'audio': 'Áudio', 
    'video': 'Vídeo',
    'document': 'Arquivo'
  };
  return descriptions[mediaType] || 'Mídia';
};

// ✅ FUNÇÃO PARA OBTER EXTENSÃO DO MIME TYPE
const getExtensionFromMime = (mimetype: string): string => {
  return mime.extension(mimetype) ? `.${mime.extension(mimetype)}` : '';
};

// ✅ FUNÇÃO PARA VERIFICAR TAMANHO MÁXIMO
const getMaxFileSize = (mimetype: string): number => {
  // Limites do Facebook/Instagram (em bytes)
  if (mimetype.startsWith('image/')) return 25 * 1024 * 1024; // 25MB
  if (mimetype.startsWith('video/')) return 200 * 1024 * 1024; // 200MB
  if (mimetype.startsWith('audio/')) return 25 * 1024 * 1024; // 25MB
  return 100 * 1024 * 1024; // 100MB para outros arquivos
};

export default sendFacebookMediaMessage;