"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.storeInstagram = exports.updateFacebook = exports.deleteMedia = exports.mediaUpload = exports.showAdmin = exports.removeAdmin = exports.updateAdmin = exports.listAll = exports.restart = exports.closedTickets = exports.remove = exports.update = exports.show = exports.storeFacebook = exports.store = exports.indexFilter = exports.index = void 0;
const socket_1 = require("../libs/socket");
const wbot_1 = require("../libs/wbot");
const StartWhatsAppSession_1 = require("../services/WbotServices/StartWhatsAppSession");
const logger_1 = require("../utils/logger");
const CreateWhatsAppService_1 = __importDefault(require("../services/WhatsappService/CreateWhatsAppService"));
const DeleteWhatsAppService_1 = __importDefault(require("../services/WhatsappService/DeleteWhatsAppService"));
const ListWhatsAppsService_1 = __importDefault(require("../services/WhatsappService/ListWhatsAppsService"));
const ShowWhatsAppService_1 = __importDefault(require("../services/WhatsappService/ShowWhatsAppService"));
const UpdateWhatsAppService_1 = __importDefault(require("../services/WhatsappService/UpdateWhatsAppService"));
const ImportWhatsAppMessageService_1 = require("../services/WhatsappService/ImportWhatsAppMessageService");
const cache_1 = __importDefault(require("../libs/cache"));
const wbot_2 = require("../libs/wbot");
const DeleteBaileysService_1 = __importDefault(require("../services/BaileysServices/DeleteBaileysService"));
const graphAPI_1 = require("../services/FacebookServices/graphAPI");
const ShowWhatsAppServiceAdmin_1 = __importDefault(require("../services/WhatsappService/ShowWhatsAppServiceAdmin"));
const UpdateWhatsAppServiceAdmin_1 = __importDefault(require("../services/WhatsappService/UpdateWhatsAppServiceAdmin"));
const ListAllWhatsAppService_1 = __importDefault(require("../services/WhatsappService/ListAllWhatsAppService"));
const ListFilterWhatsAppsService_1 = __importDefault(require("../services/WhatsappService/ListFilterWhatsAppsService"));
const User_1 = __importDefault(require("../models/User"));
const lodash_1 = require("lodash");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const Whatsapp_1 = __importDefault(require("../models/Whatsapp"));
const AppError_1 = __importDefault(require("../errors/AppError"));
const index = async (req, res) => {
    const { companyId } = req.user;
    const { session } = req.query;
    const whatsapps = await (0, ListWhatsAppsService_1.default)({ companyId, session });
    return res.status(200).json(whatsapps);
};
exports.index = index;
// ✅ NOVA FUNÇÃO ADICIONADA:
const indexFilter = async (req, res) => {
    const { companyId } = req.user;
    const { session, channel } = req.query;
    const whatsapps = await (0, ListFilterWhatsAppsService_1.default)({ companyId, session, channel });
    return res.status(200).json(whatsapps);
};
exports.indexFilter = indexFilter;
const store = async (req, res) => {
    const { name, status, isDefault, greetingMessage, complationMessage, outOfHoursMessage, queueIds, token, timeSendQueue, sendIdQueue, promptId, maxUseBotQueues, timeUseBotQueues, expiresTicket, expiresInactiveMessage, importOldMessages, importRecentMessages, closedTicketsPostImported, importOldMessagesGroups, allowGroup, timeInactiveMessage, inactiveMessage, ratingMessage, maxUseBotQueuesNPS, expiresTicketNPS, whenExpiresTicket, groupAsTicket, timeCreateNewTicket, schedules, collectiveVacationEnd, collectiveVacationMessage, collectiveVacationStart, queueIdImportMessages, flowIdNotPhrase, flowIdWelcome } = req.body;
    const { companyId } = req.user;
    const { whatsapp, oldDefaultWhatsapp } = await (0, CreateWhatsAppService_1.default)({
        name,
        status,
        isDefault,
        greetingMessage,
        complationMessage,
        outOfHoursMessage,
        queueIds,
        companyId,
        token,
        timeSendQueue,
        sendIdQueue,
        promptId,
        maxUseBotQueues,
        timeUseBotQueues,
        expiresTicket,
        expiresInactiveMessage,
        importOldMessages,
        importRecentMessages,
        closedTicketsPostImported,
        importOldMessagesGroups,
        allowGroup,
        timeInactiveMessage,
        inactiveMessage,
        ratingMessage,
        maxUseBotQueuesNPS,
        expiresTicketNPS,
        whenExpiresTicket,
        groupAsTicket,
        timeCreateNewTicket,
        schedules,
        collectiveVacationEnd,
        collectiveVacationMessage,
        collectiveVacationStart,
        queueIdImportMessages,
        flowIdNotPhrase,
        flowIdWelcome
    });
    (0, StartWhatsAppSession_1.StartWhatsAppSession)(whatsapp, companyId);
    const io = (0, socket_1.getIO)();
    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-whatsapp`, {
        action: "update",
        whatsapp
    });
    if (oldDefaultWhatsapp) {
        io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-whatsapp`, {
            action: "update",
            whatsapp: oldDefaultWhatsapp
        });
    }
    return res.status(200).json(whatsapp);
};
exports.store = store;
const storeFacebook = async (req, res) => {
    try {
        const { facebookUserId, facebookUserToken, addInstagram } = req.body;
        const { companyId } = req.user;
        console.log("🚀 storeFacebook called with:", {
            facebookUserId,
            hasToken: !!facebookUserToken,
            addInstagram,
            companyId
        });
        // Validações básicas
        if (!facebookUserId || !facebookUserToken) {
            return res.status(400).json({
                error: "Facebook User ID e Token são obrigatórios"
            });
        }
        // Chamar a API do Facebook
        const pageData = await (0, graphAPI_1.getPageProfile)(facebookUserId, facebookUserToken);
        console.log("📦 Dados recebidos do Facebook:", {
            hasData: !!pageData,
            dataLength: pageData?.data?.length || 0,
            structure: typeof pageData
        });
        // Verificar se temos dados válidos
        if (!pageData || !pageData.data || pageData.data.length === 0) {
            console.log("❌ Nenhuma página encontrada");
            return res.status(400).json({
                error: "Nenhuma página do Facebook foi encontrada para este usuário"
            });
        }
        const io = (0, socket_1.getIO)();
        const createdConnections = [];
        // Processar cada página
        for (const page of pageData.data) {
            console.log("🔄 Processando página:", {
                id: page.id,
                name: page.name,
                hasAccessToken: !!page.access_token,
                hasInstagram: !!page.instagram_business_account
            });
            const { name, access_token, id, instagram_business_account } = page;
            // Verificar se temos access_token
            if (!access_token) {
                console.log("⚠️ Página sem access_token:", name);
                continue;
            }
            // Obter token de longa duração
            let acessTokenPage;
            try {
                acessTokenPage = await (0, graphAPI_1.getAccessTokenFromPage)(access_token);
                console.log("✅ Token de longa duração obtido para:", name);
            }
            catch (error) {
                console.log("❌ Erro ao obter token de longa duração para:", name, error.message);
                continue;
            }
            // ✅ CRIAR CONEXÃO FACEBOOK
            const facebookData = {
                name,
                companyId,
                status: "CONNECTED",
                channel: "facebook",
                isDefault: false,
                greetingMessage: "",
                farewellMessage: "",
                queueIds: [],
                // ✅ Campos específicos do Facebook:
                facebookUserId: facebookUserId,
                facebookUserToken: acessTokenPage,
                facebookPageUserId: id,
                tokenMeta: facebookUserToken,
                // ✅ Campos padrão para evitar nulls:
                number: id,
                token: "",
                maxUseBotQueues: 3,
                timeUseBotQueues: 0,
                expiresTicket: 0,
                timeSendQueue: 0,
                expiresInactiveMessage: "",
                provider: "beta",
                isMultidevice: false
            };
            try {
                // Verificar se já existe
                const existingConnection = await Whatsapp_1.default.findOne({
                    where: {
                        facebookPageUserId: id,
                        companyId
                    }
                });
                let whatsappConnection;
                if (existingConnection) {
                    console.log("🔄 Atualizando conexão existente:", name);
                    await existingConnection.update(facebookData);
                    whatsappConnection = existingConnection;
                }
                else {
                    console.log("✨ Criando nova conexão:", name);
                    const { whatsapp } = await (0, CreateWhatsAppService_1.default)(facebookData);
                    whatsappConnection = whatsapp;
                }
                createdConnections.push(whatsappConnection);
                // Emitir evento
                io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-whatsapp`, {
                    action: "update",
                    whatsapp: whatsappConnection
                });
                // Inscrever nos webhooks
                try {
                    await (0, graphAPI_1.subscribeApp)(id, acessTokenPage);
                    console.log("✅ Página inscrita nos webhooks:", name);
                }
                catch (error) {
                    console.log("❌ Erro ao inscrever página nos webhooks:", name, error.message);
                }
            }
            catch (error) {
                console.log("❌ Erro ao criar/atualizar conexão Facebook:", name, error.message);
            }
            // ✅ SE TEM INSTAGRAM E QUER ADICIONAR
            if (instagram_business_account && addInstagram) {
                const { id: instagramId, username, name: instagramName } = instagram_business_account;
                const instagramData = {
                    name: `@${username || instagramName}`,
                    companyId,
                    status: "CONNECTED",
                    channel: "instagram",
                    isDefault: false,
                    greetingMessage: "",
                    farewellMessage: "",
                    queueIds: [],
                    // ✅ Campos específicos do Instagram:
                    facebookUserId: facebookUserId,
                    facebookUserToken: acessTokenPage,
                    facebookPageUserId: instagramId,
                    tokenMeta: facebookUserToken,
                    // ✅ Campos padrão para evitar nulls:
                    number: instagramId,
                    token: "",
                    maxUseBotQueues: 3,
                    timeUseBotQueues: 0,
                    expiresTicket: 0,
                    timeSendQueue: 0,
                    expiresInactiveMessage: "",
                    provider: "beta",
                    isMultidevice: false
                };
                try {
                    // Verificar se já existe
                    const existingInstagram = await Whatsapp_1.default.findOne({
                        where: {
                            facebookPageUserId: instagramId,
                            companyId
                        }
                    });
                    let instagramConnection;
                    if (existingInstagram) {
                        console.log("🔄 Atualizando Instagram existente:", `Instagram ${username}`);
                        await existingInstagram.update(instagramData);
                        instagramConnection = existingInstagram;
                    }
                    else {
                        console.log("✨ Criando nova conexão Instagram:", `Instagram ${username}`);
                        const { whatsapp } = await (0, CreateWhatsAppService_1.default)(instagramData);
                        instagramConnection = whatsapp;
                    }
                    createdConnections.push(instagramConnection);
                    // Emitir evento
                    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-whatsapp`, {
                        action: "update",
                        whatsapp: instagramConnection
                    });
                }
                catch (error) {
                    console.log("❌ Erro ao criar/atualizar conexão Instagram:", error.message);
                }
            }
        }
        console.log(`✅ ${createdConnections.length} conexão(ões) criada(s)/atualizada(s)`);
        return res.status(200).json({
            success: true,
            message: `${createdConnections.length} conexão(ões) configurada(s) com sucesso`,
            connections: createdConnections.map(conn => ({
                id: conn.id,
                name: conn.name,
                channel: conn.channel,
                status: conn.status,
                facebookPageUserId: conn.facebookPageUserId
            }))
        });
    }
    catch (error) {
        console.log("💥 Erro geral no storeFacebook:", error);
        return res.status(500).json({
            error: "Erro interno do servidor",
            details: error.message
        });
    }
};
exports.storeFacebook = storeFacebook;
const show = async (req, res) => {
    const { whatsappId } = req.params;
    const { companyId } = req.user;
    const { session } = req.query;
    const whatsapp = await (0, ShowWhatsAppService_1.default)(whatsappId, companyId, session);
    return res.status(200).json(whatsapp);
};
exports.show = show;
const update = async (req, res) => {
    const { whatsappId } = req.params;
    const whatsappData = req.body;
    const { companyId } = req.user;
    const { whatsapp, oldDefaultWhatsapp } = await (0, UpdateWhatsAppService_1.default)({
        whatsappData,
        whatsappId,
        companyId
    });
    const io = (0, socket_1.getIO)();
    io.emit(`company-${companyId}-whatsapp`, {
        action: "update",
        whatsapp
    });
    if (oldDefaultWhatsapp) {
        io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-whatsapp`, {
            action: "update",
            whatsapp: oldDefaultWhatsapp
        });
    }
    return res.status(200).json(whatsapp);
};
exports.update = update;
// ✅ FUNÇÃO REMOVE ATUALIZADA:
const remove = async (req, res) => {
    const { whatsappId } = req.params;
    const { companyId } = req.user;
    const whatsapp = await (0, ShowWhatsAppService_1.default)(whatsappId, companyId);
    // ✅ LÓGICA ATUALIZADA PARA DIFERENTES CANAIS:
    if (whatsapp.channel === "whatsapp" || !whatsapp.channel) {
        await (0, DeleteWhatsAppService_1.default)(whatsappId);
        (0, wbot_1.removeWbot)(+whatsappId);
        // ✅ ADICIONADO SUPORTE PARA BAILEYS E CACHE:
        try {
            await (0, DeleteBaileysService_1.default)(whatsappId);
            await cache_1.default.delFromPattern(`sessions:${whatsappId}:*`);
        }
        catch (error) {
            console.log("Error cleaning baileys/cache:", error);
        }
    }
    if (whatsapp.channel === "facebook" || whatsapp.channel === "instagram") {
        const { facebookUserToken } = whatsapp;
        const getAllSameToken = await Whatsapp_1.default.findAll({
            where: {
                facebookUserToken
            }
        });
        await Whatsapp_1.default.destroy({
            where: {
                facebookUserToken
            }
        });
        for await (const whatsappItem of getAllSameToken) {
            const io = (0, socket_1.getIO)();
            io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-whatsapp`, {
                action: "delete",
                whatsappId: whatsappItem.id
            });
        }
    }
    else {
        const io = (0, socket_1.getIO)();
        io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-whatsapp`, {
            action: "delete",
            whatsappId: +whatsappId
        });
    }
    return res.status(200).json({ message: "Session disconnected." });
};
exports.remove = remove;
const closedTickets = async (req, res) => {
    const { whatsappId } = req.params;
    (0, ImportWhatsAppMessageService_1.closeTicketsImported)(whatsappId);
    return res.status(200).json("whatsapp");
};
exports.closedTickets = closedTickets;
const restart = async (req, res) => {
    const { companyId, profile, id } = req.user;
    const user = await User_1.default.findByPk(id);
    // ✅ FIXED: handle case where allowConnections might not exist
    const allowConnections = user.allowConnections;
    if (profile !== "admin" && allowConnections === "disabled") {
        throw new AppError_1.default("ERR_NO_PERMISSION", 403);
    }
    await (0, wbot_2.restartWbot)(companyId);
    return res.status(200).json({ message: "Whatsapp restart." });
};
exports.restart = restart;
// ✅ NOVAS FUNÇÕES ADMIN ADICIONADAS:
const listAll = async (req, res) => {
    const { companyId } = req.user;
    const { session } = req.query;
    const whatsapps = await (0, ListAllWhatsAppService_1.default)({ session });
    return res.status(200).json(whatsapps);
};
exports.listAll = listAll;
const updateAdmin = async (req, res) => {
    const { whatsappId } = req.params;
    const whatsappData = req.body;
    const { companyId } = req.user;
    const { whatsapp, oldDefaultWhatsapp } = await (0, UpdateWhatsAppServiceAdmin_1.default)({
        whatsappData,
        whatsappId,
        companyId
    });
    const io = (0, socket_1.getIO)();
    io.to(`company-${companyId}-mainchannel`).emit(`admin-whatsapp`, {
        action: "update",
        whatsapp
    });
    if (oldDefaultWhatsapp) {
        io.to(`company-${companyId}-mainchannel`).emit(`admin-whatsapp`, {
            action: "update",
            whatsapp: oldDefaultWhatsapp
        });
    }
    return res.status(200).json(whatsapp);
};
exports.updateAdmin = updateAdmin;
const removeAdmin = async (req, res) => {
    const { whatsappId } = req.params;
    const { companyId } = req.user;
    const io = (0, socket_1.getIO)();
    const whatsapp = await (0, ShowWhatsAppService_1.default)(whatsappId, companyId);
    if (whatsapp.channel === "whatsapp") {
        await (0, DeleteBaileysService_1.default)(whatsappId);
        await (0, DeleteWhatsAppService_1.default)(whatsappId);
        await cache_1.default.delFromPattern(`sessions:${whatsappId}:*`);
        (0, wbot_1.removeWbot)(+whatsappId);
        io.to(`company-${companyId}-mainchannel`).emit(`admin-whatsapp`, {
            action: "delete",
            whatsappId: +whatsappId
        });
    }
    if (whatsapp.channel === "facebook" || whatsapp.channel === "instagram") {
        const { facebookUserToken } = whatsapp;
        const getAllSameToken = await Whatsapp_1.default.findAll({
            where: {
                facebookUserToken
            }
        });
        await Whatsapp_1.default.destroy({
            where: {
                facebookUserToken
            }
        });
        for await (const whatsappItem of getAllSameToken) {
            io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-whatsapp`, {
                action: "delete",
                whatsappId: whatsappItem.id
            });
        }
    }
    return res.status(200).json({ message: "Session disconnected." });
};
exports.removeAdmin = removeAdmin;
const showAdmin = async (req, res) => {
    const { whatsappId } = req.params;
    const { companyId } = req.user;
    const whatsapp = await (0, ShowWhatsAppServiceAdmin_1.default)(whatsappId);
    return res.status(200).json(whatsapp);
};
exports.showAdmin = showAdmin;
const mediaUpload = async (req, res) => {
    const { id } = req.params;
    const files = req.files;
    const file = (0, lodash_1.head)(files);
    try {
        const wpp = await Whatsapp_1.default.findByPk(id);
        wpp.mediaPath = file.filename;
        wpp.mediaName = file.originalname;
        await wpp.save();
        return res.send().status(201);
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
};
exports.mediaUpload = mediaUpload;
const deleteMedia = async (req, res) => {
    const { id } = req.params;
    try {
        const wpp = await Whatsapp_1.default.findByPk(id);
        const filePath = path_1.default.resolve("public", wpp.mediaPath);
        const fileExists = fs_1.default.existsSync(filePath);
        if (fileExists) {
            fs_1.default.unlinkSync(filePath);
        }
        wpp.mediaPath = null;
        wpp.mediaName = null;
        await wpp.save();
        return res.send().status(200);
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
};
exports.deleteMedia = deleteMedia;
const updateFacebook = async (req, res) => {
    const { whatsappId } = req.params;
    const whatsappData = req.body;
    const { companyId } = req.user;
    console.log("🔄 updateFacebook called with:", {
        whatsappId,
        companyId,
        whatsappData
    });
    try {
        const { name, greetingMessage, complationMessage, outOfHoursMessage, ratingMessage, farewellMessage, queueIds = [], promptId, integrationId, // Este campo precisa estar na interface WhatsappData
        maxUseBotQueues, timeUseBotQueues, expiresTicket, expiresInactiveMessage, isDefault } = whatsappData;
        // Verificar se a conexão existe
        const whatsapp = await (0, ShowWhatsAppService_1.default)(whatsappId, companyId);
        if (!whatsapp) {
            return res.status(404).json({ error: "Conexão não encontrada" });
        }
        // Verificar se é uma conexão Facebook/Instagram
        if (whatsapp.channel !== 'facebook' && whatsapp.channel !== 'instagram') {
            return res.status(400).json({ error: "Esta conexão não é do Facebook/Instagram" });
        }
        const { whatsapp: updatedWhatsapp, oldDefaultWhatsapp } = await (0, UpdateWhatsAppService_1.default)({
            whatsappData: {
                name,
                greetingMessage,
                complationMessage,
                outOfHoursMessage,
                ratingMessage,
                farewellMessage,
                promptId: promptId || null,
                integrationId: integrationId || null,
                maxUseBotQueues: parseInt(maxUseBotQueues) || 3,
                timeUseBotQueues: parseInt(timeUseBotQueues) || 0,
                expiresTicket: parseInt(expiresTicket) || 0,
                expiresInactiveMessage: expiresInactiveMessage || "",
                isDefault: Boolean(isDefault),
                queueIds: Array.isArray(queueIds) ? queueIds : []
            },
            whatsappId,
            companyId
        });
        console.log("✅ Facebook connection updated successfully:", updatedWhatsapp.name);
        // Emitir evento via socket
        const io = (0, socket_1.getIO)();
        io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-whatsapp`, {
            action: "update",
            whatsapp: updatedWhatsapp
        });
        // Se houve mudança na conexão padrão, emitir evento para a antiga também
        if (oldDefaultWhatsapp) {
            io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-whatsapp`, {
                action: "update",
                whatsapp: oldDefaultWhatsapp
            });
        }
        return res.status(200).json({
            success: true,
            message: "Configurações atualizadas com sucesso",
            whatsapp: updatedWhatsapp
        });
    }
    catch (error) {
        console.log("❌ Error in updateFacebook:", error);
        logger_1.logger.error("Error updating Facebook connection:", error);
        return res.status(500).json({
            error: "Erro interno do servidor",
            message: error.message || "Erro desconhecido"
        });
    }
};
exports.updateFacebook = updateFacebook;
// ✅ ADICIONAR FUNÇÃO storeInstagram (igual ao storeFacebook):
const storeInstagram = async (req, res) => {
    const { facebookUserId, facebookUserToken } = req.body;
    const { companyId } = req.user;
    try {
        console.log("📸 Instagram OAuth iniciado:", {
            hasUserId: !!facebookUserId,
            hasToken: !!facebookUserToken,
            companyId
        });
        // 1. Verificar token de acesso do usuário
        const userResponse = await fetch(`https://graph.facebook.com/me?access_token=${facebookUserToken}&fields=id,name`);
        if (!userResponse.ok) {
            throw new Error("Token de acesso inválido");
        }
        const userData = await userResponse.json();
        console.log("👤 Instagram user data:", userData);
        // 2. Buscar páginas/contas business do Instagram
        const pagesResponse = await fetch(`https://graph.facebook.com/${userData.id}/accounts?access_token=${facebookUserToken}&fields=id,name,access_token,instagram_business_account`);
        if (!pagesResponse.ok) {
            throw new Error("Erro ao buscar páginas do Facebook");
        }
        const pagesData = await pagesResponse.json();
        console.log("📄 Páginas encontradas:", pagesData.data?.length || 0);
        // 3. Encontrar conta Instagram Business
        let instagramAccount = null;
        for (const page of pagesData.data || []) {
            if (page.instagram_business_account) {
                // Buscar detalhes da conta Instagram
                const igResponse = await fetch(`https://graph.facebook.com/${page.instagram_business_account.id}?access_token=${page.access_token}&fields=id,username,name,account_type`);
                if (igResponse.ok) {
                    const igData = await igResponse.json();
                    console.log("📸 Instagram account encontrada:", igData);
                    instagramAccount = {
                        ...igData,
                        pageToken: page.access_token,
                        pageName: page.name,
                        pageId: page.id
                    };
                    break;
                }
            }
        }
        if (!instagramAccount) {
            return res.status(400).json({
                error: "Nenhuma conta Instagram Business encontrada. Certifique-se de que sua página Facebook tem uma conta Instagram Business conectada."
            });
        }
        // 4. Verificar se já existe uma conexão para esta conta
        const existingConnection = await Whatsapp_1.default.findOne({
            where: {
                facebookPageUserId: instagramAccount.id,
                companyId
            }
        });
        let whatsapp;
        if (existingConnection) {
            // Atualizar conexão existente
            whatsapp = await existingConnection.update({
                name: `@${instagramAccount.username}`,
                facebookUserToken: instagramAccount.pageToken,
                status: "CONNECTED",
                channel: "instagram"
            });
            console.log("♻️ Conexão Instagram atualizada:", whatsapp.id);
        }
        else {
            // Criar nova conexão
            whatsapp = await Whatsapp_1.default.create({
                name: `@${instagramAccount.username}`,
                facebookPageUserId: instagramAccount.id,
                facebookUserToken: instagramAccount.pageToken,
                tokenMeta: instagramAccount.pageToken,
                channel: "instagram",
                status: "CONNECTED",
                companyId,
                number: instagramAccount.username
            });
            console.log("✅ Nova conexão Instagram criada:", whatsapp.id);
        }
        // 5. Emitir evento socket
        const io = (0, socket_1.getIO)();
        io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-whatsapp`, {
            action: existingConnection ? "update" : "create",
            whatsapp
        });
        return res.status(200).json({
            success: true,
            message: "Instagram Business conectado com sucesso!",
            connection: {
                id: whatsapp.id,
                name: whatsapp.name,
                channel: whatsapp.channel,
                status: whatsapp.status,
                username: instagramAccount.username
            }
        });
    }
    catch (error) {
        console.error("❌ Erro ao conectar Instagram:", error);
        return res.status(500).json({
            error: "Erro interno do servidor",
            message: error.message
        });
    }
};
exports.storeInstagram = storeInstagram;
