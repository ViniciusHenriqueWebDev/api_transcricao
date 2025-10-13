import axios from "axios";
import FormData from "form-data";
import { createReadStream } from "fs";
import { logger } from "../../utils/logger";

const formData: FormData = new FormData();

const apiBase = (token: string) =>
  axios.create({
    baseURL: "https://graph.facebook.com/v18.0/",
    params: {
      access_token: token
    }
  });

export const getAccessToken = async (): Promise<string> => {
  const { data } = await axios.get(
    "https://graph.facebook.com/v18.0/oauth/access_token",
    {
      params: {
        client_id: process.env.FACEBOOK_APP_ID,
        client_secret: process.env.FACEBOOK_APP_SECRET,
        grant_type: "client_credentials"
      }
    }
  );

  return data.access_token;
};

export const markSeen = async (id: string, token: string): Promise<void> => {
  await apiBase(token).post(`${id}/messages`, {
    recipient: {
      id
    },
    sender_action: "mark_seen"
  });
};

export const showTypingIndicator = async (
  id: string,
  token: string,
  action: string
): Promise<void> => {

  try {
    const { data } = await apiBase(token).post("me/messages", {
      recipient: {
        id: id
      },
      sender_action: action
    })

    return data;
  } catch (error) {
    console.log(error);
  }

}

// Adicione uma função para verificar permissões do token
export const verifyTokenPermissions = async (accessToken: string) => {
  try {
    const response = await axios.get('https://graph.facebook.com/v18.0/me/permissions', {
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

    const missingPermissions = requiredPermissions.filter(
      perm => !grantedPermissions.includes(perm)
    );

    if (missingPermissions.length > 0) {
      console.error("❌ Permissões em falta:", missingPermissions);
      return false;
    }

    return true;
  } catch (error) {
    console.error("❌ Erro ao verificar permissões:", error);
    return false;
  }
};

export const sendText = async (recipientId: string, message: string, accessToken: string) => {
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

    const response = await axios.post(
      'https://graph.facebook.com/v18.0/me/messages',
      messageData,
      {
        params: {
          access_token: accessToken
        },
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log("✅ Mensagem Facebook enviada:", response.data);
    return response.data;

  } catch (error) {
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

export const verifyTokenValidity = async (accessToken: string) => {
  try {
    const response = await axios.get('https://graph.facebook.com/v18.0/me', {
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
  } catch (error) {
    console.error("❌ Token inválido:", error.response?.data || error.message);
    return false;
  }
};

export const sendAttachmentFromUrl = async (
  id: string,
  url: string,
  type: string,
  token: string
): Promise<void> => {
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
  } catch (error) {
    console.log(error);
  }
};

export const sendAttachment = async (
  id: string,
  file: Express.Multer.File,
  type: string,
  token: string
): Promise<void> => {
  formData.append(
    "recipient",
    JSON.stringify({
      id
    })
  );

  formData.append(
    "message",
    JSON.stringify({
      attachment: {
        type,
        payload: {
          is_reusable: true
        }
      }
    })
  );

  const fileReaderStream = createReadStream(file.path);

  formData.append("filedata", fileReaderStream);

  try {
    await apiBase(token).post("me/messages", formData, {
      headers: {
        ...formData.getHeaders()
      }
    });
  } catch (error) {
    throw new Error(error);
  }
};

export const genText = (text: string): any => {
  const response = {
    text
  };

  return response;
};

export const getProfile = async (id: string, token: string): Promise<any> => {
  try {
    const { data } = await apiBase(token).get(id);

    return data;
  } catch (error) {
    console.log(error);
    throw new Error("ERR_FETCHING_FB_USER_PROFILE_2");
  }
};

export const getPageProfile = async (
  id: string,
  token: string
): Promise<any> => {
  try {
    console.log("🔍 getPageProfile called with:");
    console.log("ID:", id);
    console.log("Token:", token ? `${token.substring(0, 20)}...` : "NO TOKEN");

    // ✅ TESTE 1: Verificar informações básicas do usuário
    try {
      const userInfo = await apiBase(token).get('me?fields=id,name,email');
      console.log("👤 User info:", userInfo.data);
    } catch (error) {
      console.log("❌ Erro ao buscar info do usuário:", error.response?.data);
    }

    // ✅ TESTE 2: Verificar permissões
    try {
      const permissions = await apiBase(token).get('me/permissions');
      console.log("🔑 Permissões:", permissions.data);
      const granted = permissions.data.data.filter(p => p.status === 'granted');
      console.log("✅ Permissões concedidas:", granted.map(p => p.permission));
    } catch (error) {
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
      } catch (error) {
        console.log("❌ Erro no método alternativo 1:", error.response?.data);
      }

      // Método alternativo 2: Buscar através do business manager
      try {
        const businesses = await apiBase(token).get('me/businesses?fields=name,id');
        console.log("🏢 Businesses:", businesses.data);
      } catch (error) {
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
  } catch (error) {
    console.log("❌ Facebook API Error:", error.response?.data || error.message);
    console.log("Status:", error.response?.status);
    console.log("Headers:", error.response?.headers);
    throw new Error("ERR_FETCHING_FB_PAGES");
  }
};

export const profilePsid = async (id: string, token: string): Promise<any> => {
  try {
    console.log(`🔍 profilePsid: buscando perfil de ${id}`);

    const { data } = await axios.get(
      `https://graph.facebook.com/v18.0/${id}?fields=id,name,first_name,last_name,profile_pic&access_token=${token}`
    );

    console.log(`✅ Perfil encontrado:`, {
      id: data.id,
      name: data.name,
      hasProfilePic: !!data.profile_pic
    });

    return data;
  } catch (error) {
    console.log(`❌ Erro em profilePsid:`, error.response?.data?.error?.message || error.message);

    // ✅ TENTAR MÉTODO ALTERNATIVO
    try {
      console.log(`🔄 Tentando método alternativo via getProfile`);
      return await getProfile(id, token);
    } catch (fallbackError) {
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

export const subscribeApp = async (id: string, token: string): Promise<any> => {
  try {
    const { data } = await axios.post(
      `https://graph.facebook.com/v18.0/${id}/subscribed_apps?access_token=${token}`,
      {
        subscribed_fields: [
          "messages",
          "messaging_postbacks",
          "message_deliveries",
          "message_reads",
          "message_echoes"
        ]
      }
    );
    return data;
  } catch (error) {
    console.log(error)
    throw new Error("ERR_SUBSCRIBING_PAGE_TO_MESSAGE_WEBHOOKS");
  }
};

export const unsubscribeApp = async (
  id: string,
  token: string
): Promise<any> => {
  try {
    const { data } = await axios.delete(
      `https://graph.facebook.com/v18.0/${id}/subscribed_apps?access_token=${token}`
    );
    return data;
  } catch (error) {
    throw new Error("ERR_UNSUBSCRIBING_PAGE_TO_MESSAGE_WEBHOOKS");
  }
};


export const getSubscribedApps = async (
  id: string,
  token: string
): Promise<any> => {
  try {
    const { data } = await apiBase(token).get(`${id}/subscribed_apps`);
    return data;
  } catch (error) {
    throw new Error("ERR_GETTING_SUBSCRIBED_APPS");
  }
};

export const getAccessTokenFromPage = async (
  token: string
): Promise<string> => {
  try {

    if (!token) throw new Error("ERR_FETCHING_FB_USER_TOKEN");

    const data = await axios.get(
      "https://graph.facebook.com/v18.0/oauth/access_token",
      {
        params: {
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          grant_type: "fb_exchange_token",
          fb_exchange_token: token
        }
      }
    );

    return data.data.access_token;
  } catch (error) {
    console.log(error);
    throw new Error("ERR_FETCHING_FB_USER_TOKEN");
  }
};

export const removeApplcation = async (
  id: string,
  token: string
): Promise<void> => {
  try {
    await axios.delete(`https://graph.facebook.com/v18.0/${id}/permissions`, {
      params: {
        access_token: token
      }
    });
  } catch (error) {
    logger.error("ERR_REMOVING_APP_FROM_PAGE");
  }
};

export const subscribeInstagramWebhook = async (
  instagramId: string,
  accessToken: string,
  webhookUrl?: string // ✅ TORNAR OPCIONAL
): Promise<any> => {
  try {
    const url = `https://graph.facebook.com/v18.0/${instagramId}/subscribed_apps`;

    const response = await axios.post(url, {
      subscribed_fields: 'messages,messaging_postbacks,messaging_optins,message_deliveries,message_reads',
      access_token: accessToken
    });

    return response.data;

  } catch (error) {
    console.error("❌ Error subscribing Instagram webhook:", error);
    throw error;
  }
};

// ✅ FUNÇÃO PARA CONFIGURAR WEBHOOK NO APP DO INSTAGRAM
export const configureInstagramAppWebhook = async (
  appId: string,
  accessToken: string,
  webhookUrl: string,
  verifyToken: string
): Promise<any> => {
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

  } catch (error) {
    console.error("❌ Error configuring Instagram app webhook:", error);
    throw error;
  }
};