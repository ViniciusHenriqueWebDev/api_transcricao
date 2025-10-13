import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import { removeWbot } from "../libs/wbot";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";
import { logger } from "../utils/logger";
import CreateWhatsAppService from "../services/WhatsappService/CreateWhatsAppService";
import DeleteWhatsAppService from "../services/WhatsappService/DeleteWhatsAppService";
import ListWhatsAppsService from "../services/WhatsappService/ListWhatsAppsService";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import UpdateWhatsAppService from "../services/WhatsappService/UpdateWhatsAppService";
import { closeTicketsImported } from "../services/WhatsappService/ImportWhatsAppMessageService";
import cacheLayer from "../libs/cache";
import { restartWbot } from "../libs/wbot";
import DeleteBaileysService from "../services/BaileysServices/DeleteBaileysService";
import {
  getPageProfile,
  subscribeApp,
  getAccessTokenFromPage,
  subscribeInstagramWebhook
} from "../services/FacebookServices/graphAPI";
import ShowWhatsAppServiceAdmin from "../services/WhatsappService/ShowWhatsAppServiceAdmin";
import UpdateWhatsAppServiceAdmin from "../services/WhatsappService/UpdateWhatsAppServiceAdmin";
import ListAllWhatsAppService from "../services/WhatsappService/ListAllWhatsAppService";
import ListFilterWhatsAppsService from "../services/WhatsappService/ListFilterWhatsAppsService";
import User from "../models/User";

import { isNil, head } from "lodash";
import fs from "fs";
import path from "path";
import Whatsapp from "../models/Whatsapp";
import AppError from "../errors/AppError";

interface WhatsappData {
  name: string;
  queueIds: number[];
  companyId: number;
  greetingMessage?: string;
  complationMessage?: string;
  outOfHoursMessage?: string;
  ratingMessage?: string;
  status?: string;
  isDefault?: boolean;
  token?: string;
  sendIdQueue?: number;
  timeSendQueue?: number;
  promptId?: number;
  maxUseBotQueues?: number;
  timeUseBotQueues?: number;
  expiresTicket?: number;
  expiresInactiveMessage?: string;
  importOldMessages?: string;
  importRecentMessages?: string;
  importOldMessagesGroups?: boolean;
  closedTicketsPostImported?: boolean;
  allowGroup?: boolean;
  timeInactiveMessage?: string;
  inactiveMessage?: string;
  maxUseBotQueuesNPS?: number;
  expiresTicketNPS?: number;
  whenExpiresTicket?: string;
  groupAsTicket?: string;
  timeCreateNewTicket?: number;
  schedules?: any[];
  collectiveVacationMessage?: string;
  collectiveVacationStart?: string;
  collectiveVacationEnd?: string;
  queueIdImportMessages?: number;
  flowIdNotPhrase?: number;
  flowIdWelcome?: number;
  integrationId?: number;
}

interface ExtendedRequest extends Request {
  allowGroup?: boolean;
}

// ✅ INTERFACE ATUALIZADA:
interface QueryParams {
  session?: number | string;
  channel?: string;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { session } = req.query as QueryParams;
  const whatsapps = await ListWhatsAppsService({ companyId, session });

  return res.status(200).json(whatsapps);
};

// ✅ NOVA FUNÇÃO ADICIONADA:
export const indexFilter = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { session, channel } = req.query as QueryParams;

  const whatsapps = await ListFilterWhatsAppsService({ companyId, session, channel });

  return res.status(200).json(whatsapps);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const {
    name,
    status,
    isDefault,
    greetingMessage,
    complationMessage,
    outOfHoursMessage,
    queueIds,
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
  }: WhatsappData = req.body;
  const { companyId } = req.user;

  const { whatsapp, oldDefaultWhatsapp } = await CreateWhatsAppService({
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

  StartWhatsAppSession(whatsapp, companyId);

  const io = getIO();
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

export const storeFacebook = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    const {
      facebookUserId,
      facebookUserToken,
      addInstagram
    }: {
      facebookUserId: string;
      facebookUserToken: string;
      addInstagram: boolean;
    } = req.body;
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
    const pageData = await getPageProfile(facebookUserId, facebookUserToken);

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

    const io = getIO();
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
        acessTokenPage = await getAccessTokenFromPage(access_token);
        console.log("✅ Token de longa duração obtido para:", name);
      } catch (error) {
        console.log("❌ Erro ao obter token de longa duração para:", name, error.message);
        continue;
      }

      // ✅ CRIAR CONEXÃO FACEBOOK
      const facebookData = {
        name,
        companyId,
        status: "CONNECTED",
        channel: "facebook", // ✅ Campo essencial
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
        const existingConnection = await Whatsapp.findOne({
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
        } else {
          console.log("✨ Criando nova conexão:", name);
          const { whatsapp } = await CreateWhatsAppService(facebookData);
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
          await subscribeApp(id, acessTokenPage);
          console.log("✅ Página inscrita nos webhooks:", name);
        } catch (error) {
          console.log("❌ Erro ao inscrever página nos webhooks:", name, error.message);
        }

      } catch (error) {
        console.log("❌ Erro ao criar/atualizar conexão Facebook:", name, error.message);
      }

      // ✅ SE TEM INSTAGRAM E QUER ADICIONAR
      if (instagram_business_account && addInstagram) {
        const { id: instagramId, username, name: instagramName } = instagram_business_account;

        const instagramData = {
          name: `@${username || instagramName}`, // ✅ APENAS @ + USERNAME
          companyId,
          status: "CONNECTED",
          channel: "instagram", // ✅ Campo essencial
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
          const existingInstagram = await Whatsapp.findOne({
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
          } else {
            console.log("✨ Criando nova conexão Instagram:", `Instagram ${username}`);
            const { whatsapp } = await CreateWhatsAppService(instagramData);
            instagramConnection = whatsapp;
          }

          createdConnections.push(instagramConnection);

          // Emitir evento
          io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-whatsapp`, {
            action: "update",
            whatsapp: instagramConnection
          });

        } catch (error) {
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

  } catch (error) {
    console.log("💥 Erro geral no storeFacebook:", error);
    return res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message
    });
  }
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;
  const { session } = req.query;

  const whatsapp = await ShowWhatsAppService(whatsappId, companyId, session);

  return res.status(200).json(whatsapp);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const whatsappData = req.body;
  const { companyId } = req.user;

  const { whatsapp, oldDefaultWhatsapp } = await UpdateWhatsAppService({
    whatsappData,
    whatsappId,
    companyId
  });

  const io = getIO();
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

// ✅ FUNÇÃO REMOVE ATUALIZADA:
export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;

  const whatsapp = await ShowWhatsAppService(whatsappId, companyId);

  // ✅ LÓGICA ATUALIZADA PARA DIFERENTES CANAIS:
  if (whatsapp.channel === "whatsapp" || !whatsapp.channel) {
    await DeleteWhatsAppService(whatsappId);
    removeWbot(+whatsappId);

    // ✅ ADICIONADO SUPORTE PARA BAILEYS E CACHE:
    try {
      await DeleteBaileysService(whatsappId);
      await cacheLayer.delFromPattern(`sessions:${whatsappId}:*`);
    } catch (error) {
      console.log("Error cleaning baileys/cache:", error);
    }
  }

  if (whatsapp.channel === "facebook" || whatsapp.channel === "instagram") {
    const { facebookUserToken } = whatsapp;

    const getAllSameToken = await Whatsapp.findAll({
      where: {
        facebookUserToken
      }
    });

    await Whatsapp.destroy({
      where: {
        facebookUserToken
      }
    });

    for await (const whatsappItem of getAllSameToken) {
      const io = getIO();
      io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-whatsapp`, {
        action: "delete",
        whatsappId: whatsappItem.id
      });
    }
  } else {
    const io = getIO();
    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-whatsapp`, {
      action: "delete",
      whatsappId: +whatsappId
    });
  }

  return res.status(200).json({ message: "Session disconnected." });
};

export const closedTickets = async (req: Request, res: Response) => {
  const { whatsappId } = req.params

  closeTicketsImported(whatsappId)

  return res.status(200).json("whatsapp");
}

export const restart = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId, profile, id } = req.user;

  const user = await User.findByPk(id);
  // ✅ FIXED: handle case where allowConnections might not exist
  const allowConnections = (user as any).allowConnections;

  if (profile !== "admin" && allowConnections === "disabled") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  await restartWbot(companyId);

  return res.status(200).json({ message: "Whatsapp restart." });
};

// ✅ NOVAS FUNÇÕES ADMIN ADICIONADAS:
export const listAll = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { session } = req.query as QueryParams;
  const whatsapps = await ListAllWhatsAppService({ session });
  return res.status(200).json(whatsapps);
};

export const updateAdmin = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const whatsappData = req.body;
  const { companyId } = req.user;

  const { whatsapp, oldDefaultWhatsapp } = await UpdateWhatsAppServiceAdmin({
    whatsappData,
    whatsappId,
    companyId
  });

  const io = getIO();
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

export const removeAdmin = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;
  const io = getIO();

  const whatsapp = await ShowWhatsAppService(whatsappId, companyId);

  if (whatsapp.channel === "whatsapp") {
    await DeleteBaileysService(whatsappId);
    await DeleteWhatsAppService(whatsappId);
    await cacheLayer.delFromPattern(`sessions:${whatsappId}:*`);
    removeWbot(+whatsappId);

    io.to(`company-${companyId}-mainchannel`).emit(`admin-whatsapp`, {
      action: "delete",
      whatsappId: +whatsappId
    });
  }

  if (whatsapp.channel === "facebook" || whatsapp.channel === "instagram") {
    const { facebookUserToken } = whatsapp;

    const getAllSameToken = await Whatsapp.findAll({
      where: {
        facebookUserToken
      }
    });

    await Whatsapp.destroy({
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

export const showAdmin = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;
  const { companyId } = req.user;
  const whatsapp = await ShowWhatsAppServiceAdmin(whatsappId);

  return res.status(200).json(whatsapp);
};

export const mediaUpload = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const files = req.files as Express.Multer.File[];
  const file = head(files);

  try {
    const wpp = await Whatsapp.findByPk(id);
    wpp.mediaPath = file.filename;
    wpp.mediaName = file.originalname;

    await wpp.save();
    return res.send().status(201);
  } catch (err: any) {
    throw new AppError(err.message);
  }
};

export const deleteMedia = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;

  try {
    const wpp = await Whatsapp.findByPk(id);
    const filePath = path.resolve("public", wpp.mediaPath);
    const fileExists = fs.existsSync(filePath);

    if (fileExists) {
      fs.unlinkSync(filePath);
    }

    wpp.mediaPath = null;
    wpp.mediaName = null;
    await wpp.save();
    return res.send().status(200);
  } catch (err: any) {
    throw new AppError(err.message);
  }
};

export const updateFacebook = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const whatsappData = req.body;
  const { companyId } = req.user;

  console.log("🔄 updateFacebook called with:", {
    whatsappId,
    companyId,
    whatsappData
  });

  try {
    const {
      name,
      greetingMessage,
      complationMessage,
      outOfHoursMessage,
      ratingMessage,
      farewellMessage,
      queueIds = [],
      promptId,
      integrationId,  // Este campo precisa estar na interface WhatsappData
      maxUseBotQueues,
      timeUseBotQueues,
      expiresTicket,
      expiresInactiveMessage,
      isDefault
    } = whatsappData;

    // Verificar se a conexão existe
    const whatsapp = await ShowWhatsAppService(whatsappId, companyId);

    if (!whatsapp) {
      return res.status(404).json({ error: "Conexão não encontrada" });
    }

    // Verificar se é uma conexão Facebook/Instagram
    if (whatsapp.channel !== 'facebook' && whatsapp.channel !== 'instagram') {
      return res.status(400).json({ error: "Esta conexão não é do Facebook/Instagram" });
    }

    const { whatsapp: updatedWhatsapp, oldDefaultWhatsapp } = await UpdateWhatsAppService({
      whatsappData: {
        name,
        greetingMessage,
        complationMessage,
        outOfHoursMessage,
        ratingMessage,
        farewellMessage,
        promptId: promptId || null,
        integrationId: integrationId || null, // ✅ NOW PROPERLY TYPED
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
    const io = getIO();
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

  } catch (error) {
    console.log("❌ Error in updateFacebook:", error);
    logger.error("Error updating Facebook connection:", error);

    return res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message || "Erro desconhecido"
    });
  }
};

// ✅ ADICIONAR FUNÇÃO storeInstagram (igual ao storeFacebook):
export const storeInstagram = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { facebookUserId, facebookUserToken } = req.body;
  const { companyId } = req.user;

  try {
    console.log("📸 Instagram OAuth iniciado:", {
      hasUserId: !!facebookUserId,
      hasToken: !!facebookUserToken,
      companyId
    });

    // 1. Verificar token de acesso do usuário
    const userResponse = await fetch(
      `https://graph.facebook.com/me?access_token=${facebookUserToken}&fields=id,name`
    );

    if (!userResponse.ok) {
      throw new Error("Token de acesso inválido");
    }

    const userData = await userResponse.json();
    console.log("👤 Instagram user data:", userData);

    // 2. Buscar páginas/contas business do Instagram
    const pagesResponse = await fetch(
      `https://graph.facebook.com/${userData.id}/accounts?access_token=${facebookUserToken}&fields=id,name,access_token,instagram_business_account`
    );

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
        const igResponse = await fetch(
          `https://graph.facebook.com/${page.instagram_business_account.id}?access_token=${page.access_token}&fields=id,username,name,account_type`
        );

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
    const existingConnection = await Whatsapp.findOne({
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
    } else {
      // Criar nova conexão
      whatsapp = await Whatsapp.create({
        name: `@${instagramAccount.username}`, // ✅ APENAS @ + USERNAME
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
    const io = getIO();
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

  } catch (error) {
    console.error("❌ Erro ao conectar Instagram:", error);
    return res.status(500).json({
      error: "Erro interno do servidor",
      message: error.message
    });
  }
};
