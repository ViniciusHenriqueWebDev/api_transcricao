"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureInstagramAppWebhook = exports.subscribeInstagramWebhook = exports.removeApplcation = exports.getAccessTokenFromPage = exports.getSubscribedApps = exports.unsubscribeApp = exports.subscribeApp = exports.profilePsid = exports.getPageProfile = exports.getProfile = exports.genText = exports.sendAttachment = exports.sendAttachmentFromUrl = exports.verifyTokenValidity = exports.sendText = exports.verifyTokenPermissions = exports.showTypingIndicator = exports.markSeen = exports.getAccessToken = void 0;
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const fs_1 = require("fs");
const logger_1 = require("../../utils/logger");
const formData = new form_data_1.default();
const apiBase = (token) => axios_1.default.create({
    baseURL: "https://graph.facebook.com/v18.0/",
    params: {
        access_token: token
    }
});
const getAccessToken = async () => {
    const { data } = await axios_1.default.get("https://graph.facebook.com/v18.0/oauth/access_token", {
        params: {
            client_id: process.env.FACEBOOK_APP_ID,
            client_secret: process.env.FACEBOOK_APP_SECRET,
            grant_type: "client_credentials"
        }
    });
    return data.access_token;
};
exports.getAccessToken = getAccessToken;
const markSeen = async (id, token) => {
    await apiBase(token).post(`${id}/messages`, {
        recipient: {
            id
        },
        sender_action: "mark_seen"
    });
};
exports.markSeen = markSeen;
const showTypingIndicator = async (id, token, action) => {
    try {
        const { data } = await apiBase(token).post("me/messages", {
            recipient: {
                id: id
            },
            sender_action: action
        });
        return data;
    }
    catch (error) {
        console.log(error);
    }
};
exports.showTypingIndicator = showTypingIndicator;
// Adicione uma função para verificar permissões do token
const verifyTokenPermissions = async (accessToken) => {
    try {
        const response = await axios_1.default.get('https://graph.facebook.com/v18.0/me/permissions', {
            params: {
                access_token: accessToken
            }
        });
        console.log("🔑 Permissões do token:", response.data);
        const requiredPermissions = [
            'pages_messaging',
            'pages_read_engagement',
            'pages_manage_metadata'
        ];
        const grantedPermissions = response.data.data
            .filter(p => p.status === 'granted')
            .map(p => p.permission);
        const missingPermissions = requiredPermissions.filter(perm => !grantedPermissions.includes(perm));
        if (missingPermissions.length > 0) {
            console.error("❌ Permissões em falta:", missingPermissions);
            return false;
        }
        return true;
    }
    catch (error) {
        console.error("❌ Erro ao verificar permissões:", error);
        return false;
    }
};
exports.verifyTokenPermissions = verifyTokenPermissions;
const sendText = async (recipientId, message, accessToken) => {
    try {
        // ✅ LIMPAR A MENSAGEM DE CARACTERES PROBLEMÁTICOS
        const cleanMessage = message
            .replace(/[\u200e\u200f]/g, '') // Remove caracteres direcionais invisíveis
            .replace(/^\s+/, '') // Remove espaços no início
            .trim();
        // ✅ VERIFICAR SE A MENSAGEM NÃO ESTÁ VAZIA
        if (!cleanMessage || cleanMessage === '') {
            console.log("⚠️ Mensagem vazia detectada - criando resposta mock");
            return {
                mid: `facebook_skip_${Date.now()}_${Math.random()}`,
                message_id: `facebook_skip_${Date.now()}_${Math.random()}`,
                skipped: true,
                reason: "empty_message"
            };
        }
        console.log("📤 Enviando mensagem Facebook:", {
            recipientId,
            messagePreview: cleanMessage.substring(0, 100),
            messageLength: cleanMessage.length
        });
        const messageData = {
            recipient: { id: recipientId },
            message: { text: cleanMessage }
        };
        const response = await axios_1.default.post('https://graph.facebook.com/v18.0/me/messages', messageData, {
            params: {
                access_token: accessToken
            },
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log("✅ Mensagem Facebook enviada:", response.data);
        return response.data;
    }
    catch (error) {
        console.error("❌ Erro ao enviar mensagem Facebook:", {
            error: error.message,
            response: error.response?.data,
            status: error.response?.status,
            recipientId,
            messagePreview: message.substring(0, 100)
        });
        // ✅ TRATAMENTO ESPECÍFICO DE ERROS
        if (error.response?.status === 400) {
            const errorData = error.response?.data?.error || {};
            const errorMessage = errorData.message || '';
            const errorCode = errorData.code || 0;
            console.log("🔍 Detalhes do erro Facebook:", {
                code: errorCode,
                message: errorMessage,
                type: errorData.type,
                subcode: errorData.error_subcode
            });
            // ✅ VERIFICAR SE É ERRO DE PERMISSÕES DE PÁGINAS
            if (errorMessage.includes('pages_messaging') ||
                errorMessage.includes('pages_manage_metadata') ||
                errorMessage.includes('pages_read_engagement') ||
                errorCode === 200) { // Código comum para falta de permissões
                throw new Error("FACEBOOK_PERMISSIONS_ERROR: Token precisa ser renovado com permissões de página");
            }
            // ✅ OUTROS ERROS COMUNS
            if (errorMessage.includes('Invalid parameter')) {
                throw new Error("FACEBOOK_INVALID_PARAMETER: Parâmetros inválidos na mensagem");
            }
            if (errorMessage.includes('rate limit') || errorCode === 4) {
                throw new Error("FACEBOOK_RATE_LIMIT: Limite de taxa excedido");
            }
            if (errorMessage.includes('User request limit reached') || errorCode === 17) {
                throw new Error("FACEBOOK_USER_LIMIT: Limite de usuário excedido");
            }
            if (errorMessage.includes('This person isn\'t available right now') || errorCode === 551) {
                throw new Error("FACEBOOK_USER_UNAVAILABLE: Usuário não disponível para receber mensagens");
            }
            // ✅ ERRO GENÉRICO COM DETALHES
            throw new Error(`FACEBOOK_API_ERROR: ${errorMessage} (Code: ${errorCode})`);
        }
        throw error;
    }
};
exports.sendText = sendText;
const verifyTokenValidity = async (accessToken) => {
    try {
        const response = await axios_1.default.get('https://graph.facebook.com/v18.0/me', {
            params: {
                access_token: accessToken,
                fields: 'id,name'
            }
        });
        console.log("✅ Token válido:", {
            id: response.data.id,
            name: response.data.name
        });
        return true;
    }
    catch (error) {
        console.error("❌ Token inválido:", error.response?.data || error.message);
        return false;
    }
};
exports.verifyTokenValidity = verifyTokenValidity;
const sendAttachmentFromUrl = async (id, url, type, token) => {
    try {
        const { data } = await apiBase(token).post("me/messages", {
            recipient: {
                id
            },
            message: {
                attachment: {
                    type,
                    payload: {
                        url
                    }
                }
            }
        });
        return data;
    }
    catch (error) {
        console.log(error);
    }
};
exports.sendAttachmentFromUrl = sendAttachmentFromUrl;
const sendAttachment = async (id, file, type, token) => {
    formData.append("recipient", JSON.stringify({
        id
    }));
    formData.append("message", JSON.stringify({
        attachment: {
            type,
            payload: {
                is_reusable: true
            }
        }
    }));
    const fileReaderStream = (0, fs_1.createReadStream)(file.path);
    formData.append("filedata", fileReaderStream);
    try {
        await apiBase(token).post("me/messages", formData, {
            headers: {
                ...formData.getHeaders()
            }
        });
    }
    catch (error) {
        throw new Error(error);
    }
};
exports.sendAttachment = sendAttachment;
const genText = (text) => {
    const response = {
        text
    };
    return response;
};
exports.genText = genText;
const getProfile = async (id, token) => {
    try {
        const { data } = await apiBase(token).get(id);
        return data;
    }
    catch (error) {
        console.log(error);
        throw new Error("ERR_FETCHING_FB_USER_PROFILE_2");
    }
};
exports.getProfile = getProfile;
const getPageProfile = async (id, token) => {
    try {
        console.log("🔍 getPageProfile called with:");
        console.log("ID:", id);
        console.log("Token:", token ? `${token.substring(0, 20)}...` : "NO TOKEN");
        // ✅ TESTE 1: Verificar informações básicas do usuário
        try {
            const userInfo = await apiBase(token).get('me?fields=id,name,email');
            console.log("👤 User info:", userInfo.data);
        }
        catch (error) {
            console.log("❌ Erro ao buscar info do usuário:", error.response?.data);
        }
        // ✅ TESTE 2: Verificar permissões
        try {
            const permissions = await apiBase(token).get('me/permissions');
            console.log("🔑 Permissões:", permissions.data);
            const granted = permissions.data.data.filter(p => p.status === 'granted');
            console.log("✅ Permissões concedidas:", granted.map(p => p.permission));
        }
        catch (error) {
            console.log("❌ Erro ao buscar permissões:", error.response?.data);
        }
        // ✅ TESTE 3: Buscar páginas (método principal)
        const url = `me/accounts?fields=name,access_token,id,instagram_business_account{id,username,profile_picture_url,name}`;
        console.log("📡 Request URL:", url);
        const { data } = await apiBase(token).get(url);
        console.log("✅ Facebook API Response:");
        console.log("Data structure:", JSON.stringify(data, null, 2));
        console.log("Number of pages found:", data?.data?.length || 0);
        // Se não encontrou páginas, vamos tentar métodos alternativos
        if (!data?.data || data.data.length === 0) {
            console.log("⚠️ Nenhuma página encontrada, tentando métodos alternativos...");
            // Método alternativo 1: Buscar páginas que o usuário gerencia
            try {
                const managedPages = await apiBase(token).get('me?fields=accounts{name,id,access_token}');
                console.log("📄 Páginas gerenciadas:", managedPages.data);
            }
            catch (error) {
                console.log("❌ Erro no método alternativo 1:", error.response?.data);
            }
            // Método alternativo 2: Buscar através do business manager
            try {
                const businesses = await apiBase(token).get('me/businesses?fields=name,id');
                console.log("🏢 Businesses:", businesses.data);
            }
            catch (error) {
                console.log("❌ Erro no método alternativo 2:", error.response?.data);
            }
        }
        // Verificar cada página se existir
        if (data?.data) {
            data.data.forEach((page, index) => {
                console.log(`📄 Page ${index + 1}:`, {
                    id: page.id,
                    name: page.name,
                    hasAccessToken: !!page.access_token,
                    hasInstagram: !!page.instagram_business_account
                });
            });
        }
        return data;
    }
    catch (error) {
        console.log("❌ Facebook API Error:", error.response?.data || error.message);
        console.log("Status:", error.response?.status);
        console.log("Headers:", error.response?.headers);
        throw new Error("ERR_FETCHING_FB_PAGES");
    }
};
exports.getPageProfile = getPageProfile;
const profilePsid = async (id, token) => {
    try {
        console.log(`🔍 profilePsid: buscando perfil de ${id}`);
        const { data } = await axios_1.default.get(`https://graph.facebook.com/v18.0/${id}?fields=id,name,first_name,last_name,profile_pic&access_token=${token}`);
        console.log(`✅ Perfil encontrado:`, {
            id: data.id,
            name: data.name,
            hasProfilePic: !!data.profile_pic
        });
        return data;
    }
    catch (error) {
        console.log(`❌ Erro em profilePsid:`, error.response?.data?.error?.message || error.message);
        // ✅ TENTAR MÉTODO ALTERNATIVO
        try {
            console.log(`🔄 Tentando método alternativo via getProfile`);
            return await (0, exports.getProfile)(id, token);
        }
        catch (fallbackError) {
            console.log(`❌ Método alternativo também falhou:`, fallbackError.message);
            // ✅ FALLBACK FINAL
            const shortId = id.slice(-6);
            return {
                id: id,
                name: `User ${shortId}`,
                first_name: 'User',
                last_name: shortId,
                profile_pic: ''
            };
        }
    }
};
exports.profilePsid = profilePsid;
const subscribeApp = async (id, token) => {
    try {
        const { data } = await axios_1.default.post(`https://graph.facebook.com/v18.0/${id}/subscribed_apps?access_token=${token}`, {
            subscribed_fields: [
                "messages",
                "messaging_postbacks",
                "message_deliveries",
                "message_reads",
                "message_echoes"
            ]
        });
        return data;
    }
    catch (error) {
        console.log(error);
        throw new Error("ERR_SUBSCRIBING_PAGE_TO_MESSAGE_WEBHOOKS");
    }
};
exports.subscribeApp = subscribeApp;
const unsubscribeApp = async (id, token) => {
    try {
        const { data } = await axios_1.default.delete(`https://graph.facebook.com/v18.0/${id}/subscribed_apps?access_token=${token}`);
        return data;
    }
    catch (error) {
        throw new Error("ERR_UNSUBSCRIBING_PAGE_TO_MESSAGE_WEBHOOKS");
    }
};
exports.unsubscribeApp = unsubscribeApp;
const getSubscribedApps = async (id, token) => {
    try {
        const { data } = await apiBase(token).get(`${id}/subscribed_apps`);
        return data;
    }
    catch (error) {
        throw new Error("ERR_GETTING_SUBSCRIBED_APPS");
    }
};
exports.getSubscribedApps = getSubscribedApps;
const getAccessTokenFromPage = async (token) => {
    try {
        if (!token)
            throw new Error("ERR_FETCHING_FB_USER_TOKEN");
        const data = await axios_1.default.get("https://graph.facebook.com/v18.0/oauth/access_token", {
            params: {
                client_id: process.env.FACEBOOK_APP_ID,
                client_secret: process.env.FACEBOOK_APP_SECRET,
                grant_type: "fb_exchange_token",
                fb_exchange_token: token
            }
        });
        return data.data.access_token;
    }
    catch (error) {
        console.log(error);
        throw new Error("ERR_FETCHING_FB_USER_TOKEN");
    }
};
exports.getAccessTokenFromPage = getAccessTokenFromPage;
const removeApplcation = async (id, token) => {
    try {
        await axios_1.default.delete(`https://graph.facebook.com/v18.0/${id}/permissions`, {
            params: {
                access_token: token
            }
        });
    }
    catch (error) {
        logger_1.logger.error("ERR_REMOVING_APP_FROM_PAGE");
    }
};
exports.removeApplcation = removeApplcation;
const subscribeInstagramWebhook = async (instagramId, accessToken, webhookUrl // ✅ TORNAR OPCIONAL
) => {
    try {
        const url = `https://graph.facebook.com/v18.0/${instagramId}/subscribed_apps`;
        const response = await axios_1.default.post(url, {
            subscribed_fields: 'messages,messaging_postbacks,messaging_optins,message_deliveries,message_reads',
            access_token: accessToken
        });
        return response.data;
    }
    catch (error) {
        console.error("❌ Error subscribing Instagram webhook:", error);
        throw error;
    }
};
exports.subscribeInstagramWebhook = subscribeInstagramWebhook;
// ✅ FUNÇÃO PARA CONFIGURAR WEBHOOK NO APP DO INSTAGRAM
const configureInstagramAppWebhook = async (appId, accessToken, webhookUrl, verifyToken) => {
    try {
        const url = `https://graph.facebook.com/v18.0/${appId}/subscriptions`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                object: 'instagram',
                callback_url: webhookUrl,
                fields: 'messages',
                verify_token: verifyToken,
                access_token: accessToken
            })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(`Instagram app webhook configuration failed: ${JSON.stringify(data)}`);
        }
        console.log("✅ Instagram app webhook configured successfully:", data);
        return data;
    }
    catch (error) {
        console.error("❌ Error configuring Instagram app webhook:", error);
        throw error;
    }
};
exports.configureInstagramAppWebhook = configureInstagramAppWebhook;
