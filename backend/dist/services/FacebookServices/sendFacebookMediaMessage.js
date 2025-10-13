"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendFacebookMediaMessage = void 0;
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const form_data_1 = __importDefault(require("form-data"));
const path_1 = __importDefault(require("path"));
const mime_types_1 = __importDefault(require("mime-types"));
const facebookMessageListener_1 = require("./facebookMessageListener");
const sendFacebookMediaMessage = async ({ ticket, media, mediaPath, mediaType, body = "", caption = "", fileName, isPrivate = false }) => {
    try {
        // ✅ COMPATIBILIDADE: DETECTAR QUAL FORMATO ESTÁ SENDO USADO
        let finalMediaPath;
        let finalMediaType;
        let finalFileName;
        let finalBody;
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
                fileExists: fs_1.default.existsSync(media.path),
                fileSize: fs_1.default.statSync(media.path).size
            });
        }
        else if (mediaPath) {
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
                fileExists: fs_1.default.existsSync(mediaPath)
            });
        }
        else {
            throw new Error("Mídia não fornecida (nem media nem mediaPath)");
        }
        // ✅ VERIFICAR SE ARQUIVO EXISTE
        if (!fs_1.default.existsSync(finalMediaPath)) {
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
        const fileSize = fs_1.default.statSync(finalMediaPath).size;
        const maxSize = getMaxFileSize(finalMediaType);
        if (fileSize > maxSize) {
            throw new Error(`Arquivo muito grande. Máximo: ${Math.round(maxSize / 1024 / 1024)}MB`);
        }
        // ✅ 1. UPLOAD DA MÍDIA PARA FACEBOOK
        console.log("📤 Fazendo upload da mídia...");
        const formData = new form_data_1.default();
        formData.append('file', fs_1.default.createReadStream(finalMediaPath));
        formData.append('type', getAttachmentType(finalMediaType));
        formData.append('is_reusable', 'false');
        const uploadUrl = `https://graph.facebook.com/v18.0/me/message_attachments`;
        const uploadResponse = await axios_1.default.post(uploadUrl, formData, {
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
        const messageResponse = await axios_1.default.post(sendUrl, messageData, {
            params: { access_token: token },
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000
        });
        console.log("✅ Mídia enviada:", messageResponse.data.message_id);
        // ✅ 3. SALVAR ARQUIVO LOCALMENTE PARA VISUALIZAÇÃO
        let savedFileName;
        if (media) {
            // ✅ FORMATO NOVO - SALVAR ARQUIVO
            savedFileName = await saveMediaLocally(media, ticket.companyId);
        }
        else {
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
                const captionResponse = await axios_1.default.post(sendUrl, captionData, {
                    params: { access_token: token },
                    headers: { 'Content-Type': 'application/json' }
                });
                console.log("✅ Caption enviado:", captionResponse.data.message_id);
            }
            catch (captionError) {
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
        const message = await (0, facebookMessageListener_1.verifyMessageMedia)(fakeMessage, ticket, ticket.contact, true, // fromMe = true
        channel);
        console.log("✅ Mídia Facebook/Instagram processada completamente");
        return message;
    }
    catch (error) {
        console.error("❌ Erro ao enviar mídia Facebook:", {
            error: error.message,
            status: error.response?.status,
            data: error.response?.data,
            ticketId: ticket.id
        });
        throw new Error(`Erro ao enviar mídia: ${error.message}`);
    }
};
exports.sendFacebookMediaMessage = sendFacebookMediaMessage;
// ✅ FUNÇÃO PARA SALVAR MÍDIA LOCALMENTE (FORMATO NOVO)
const saveMediaLocally = async (media, companyId) => {
    const timestamp = Date.now();
    const extension = path_1.default.extname(media.originalname) || getExtensionFromMime(media.mimetype);
    const fileName = `${timestamp}_${media.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}${extension}`;
    const folder = `public/company${companyId}`;
    const fullPath = path_1.default.join(__dirname, "..", "..", "..", folder);
    // ✅ CRIAR DIRETÓRIO SE NÃO EXISTIR
    if (!fs_1.default.existsSync(fullPath)) {
        fs_1.default.mkdirSync(fullPath, { recursive: true });
        fs_1.default.chmodSync(fullPath, 0o777);
    }
    const destPath = path_1.default.join(fullPath, fileName);
    // ✅ COPIAR ARQUIVO
    fs_1.default.copyFileSync(media.path, destPath);
    console.log("💾 Arquivo salvo localmente:", fileName);
    return fileName;
};
// ✅ FUNÇÃO PARA SALVAR MÍDIA EXISTENTE (FORMATO ANTIGO)
const saveExistingMedia = async (mediaPath, originalFileName, companyId) => {
    const timestamp = Date.now();
    const extension = path_1.default.extname(originalFileName) || path_1.default.extname(mediaPath);
    const fileName = `${timestamp}_${originalFileName.replace(/[^a-zA-Z0-9.]/g, '_')}${extension}`;
    const folder = `public/company${companyId}`;
    const fullPath = path_1.default.join(__dirname, "..", "..", "..", folder);
    // ✅ CRIAR DIRETÓRIO SE NÃO EXISTIR
    if (!fs_1.default.existsSync(fullPath)) {
        fs_1.default.mkdirSync(fullPath, { recursive: true });
        fs_1.default.chmodSync(fullPath, 0o777);
    }
    const destPath = path_1.default.join(fullPath, fileName);
    // ✅ COPIAR ARQUIVO
    fs_1.default.copyFileSync(mediaPath, destPath);
    console.log("💾 Arquivo existente salvo localmente:", fileName);
    return fileName;
};
// ✅ FUNÇÃO PARA MAPEAR TIPOS DE ANEXO FACEBOOK
const getAttachmentType = (mimetype) => {
    if (mimetype.startsWith('image/'))
        return 'image';
    if (mimetype.startsWith('video/'))
        return 'video';
    if (mimetype.startsWith('audio/'))
        return 'audio';
    return 'file';
};
// ✅ FUNÇÃO PARA MAPEAR TIPOS DE MÍDIA INTERNO
const getMediaTypeInternal = (mimetype) => {
    if (mimetype.startsWith('image/'))
        return 'image';
    if (mimetype.startsWith('video/'))
        return 'video';
    if (mimetype.startsWith('audio/'))
        return 'audio';
    return 'document';
};
// ✅ FUNÇÃO PARA DESCRIÇÃO DA MÍDIA
const getMediaDescription = (mediaType) => {
    const descriptions = {
        'image': 'Imagem',
        'audio': 'Áudio',
        'video': 'Vídeo',
        'document': 'Arquivo'
    };
    return descriptions[mediaType] || 'Mídia';
};
// ✅ FUNÇÃO PARA OBTER EXTENSÃO DO MIME TYPE
const getExtensionFromMime = (mimetype) => {
    return mime_types_1.default.extension(mimetype) ? `.${mime_types_1.default.extension(mimetype)}` : '';
};
// ✅ FUNÇÃO PARA VERIFICAR TAMANHO MÁXIMO
const getMaxFileSize = (mimetype) => {
    // Limites do Facebook/Instagram (em bytes)
    if (mimetype.startsWith('image/'))
        return 25 * 1024 * 1024; // 25MB
    if (mimetype.startsWith('video/'))
        return 200 * 1024 * 1024; // 200MB
    if (mimetype.startsWith('audio/'))
        return 25 * 1024 * 1024; // 25MB
    return 100 * 1024 * 1024; // 100MB para outros arquivos
};
exports.default = exports.sendFacebookMediaMessage;
