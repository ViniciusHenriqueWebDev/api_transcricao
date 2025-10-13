import { Request, Response } from "express";
import Whatsapp from "../models/Whatsapp";
import { handleMessage } from "../services/FacebookServices/facebookMessageListener";
import { getIO } from "../libs/socket";
import CreateWhatsAppService from "../services/WhatsappService/CreateWhatsAppService";
import axios from "axios";

// ✅ INTERFACE CORRIGIDA PARA REQUEST COM USUÁRIO
interface AuthenticatedRequest extends Omit<Request, 'user'> {
  user?: {
    id: string;
    companyId: number;
    profile: string;
  };
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { "hub.mode": mode, "hub.challenge": challenge, "hub.verify_token": token } = req.query;

    console.log("🔍 Webhook verification request:", {
      mode,
      token,
      route: req.originalUrl,
      expectedToken: req.originalUrl.includes('/instagram')
        ? process.env.INSTAGRAM_VERIFY_TOKEN || "meta_zap_pro_instagram_webhook_token"
        : process.env.FACEBOOK_VERIFY_TOKEN || "meta_zap_pro_webhook_token"
    });

    // ✅ VERIFICAR QUAL TOKEN USAR BASEADO NA ROTA
    const isInstagramRoute = req.originalUrl.includes('/instagram');
    const VERIFY_TOKEN = isInstagramRoute
      ? (process.env.INSTAGRAM_VERIFY_TOKEN || "meta_zap_pro_instagram_webhook_token")
      : (process.env.FACEBOOK_VERIFY_TOKEN || "meta_zap_pro_webhook_token");

    if (mode && token) {
      if (mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log(`✅ ${isInstagramRoute ? 'Instagram' : 'Facebook'} webhook verified successfully!`);
        return res.status(200).send(challenge);
      } else {
        console.log(`❌ ${isInstagramRoute ? 'Instagram' : 'Facebook'} webhook verification failed:`, {
          receivedToken: token,
          expectedToken: VERIFY_TOKEN
        });
        return res.status(403).send("Forbidden");
      }
    }

    return res.status(400).send("Bad Request");
  } catch (error) {
    console.error("❌ Webhook verification error:", error);
    return res.status(500).send("Internal Server Error");
  }
};

export const webHook = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    console.log("🚨 MAIN WEBHOOK CALLED! 🚨");
    console.log("📥 Request info:", {
      method: req.method,
      url: req.originalUrl,
      headers: {
        contentType: req.headers['content-type'],
        userAgent: req.headers['user-agent'],
        xHubSignature: req.headers['x-hub-signature-256']
      }
    });

    const { body } = req;
    console.log("📥 Webhook received:", JSON.stringify(body, null, 2));

    // ✅ RESPONDER SEMPRE COM 200 PRIMEIRO (Meta exige resposta rápida)
    res.status(200).json({
      message: "Event received",
      timestamp: new Date().toISOString()
    });

    // ✅ VALIDAÇÃO BÁSICA
    if (!body || !body.object || !body.entry || !Array.isArray(body.entry)) {
      console.log("⚠️ Invalid webhook payload");
      return;
    }

    // ✅ PROCESSAR FACEBOOK E INSTAGRAM COM ISOLAMENTO TOTAL POR EMPRESA
    if (body.object === "page" || body.object === "instagram") {
      console.log(`🔄 Processing ${body.entry.length} entries`);

      for (const entry of body.entry) {
        try {
          const pageId = entry.id;
          console.log("🔄 Processing entry for page/instagram:", pageId);

          // ✅ BUSCAR TODAS AS CONEXÕES POR PÁGINA (CADA EMPRESA PODE TER A MESMA PÁGINA)
          const whatsappConnections = await Whatsapp.findAll({
            where: {
              facebookPageUserId: pageId,
              status: "CONNECTED"
            },
            // ✅ INCLUIR EMPRESA PARA VALIDAÇÃO E ISOLAMENTO
            include: [
              {
                model: require("../models/Company").default,
                as: "company",
                attributes: ["id", "name", "status"],
                where: {
                  status: true // ✅ APENAS EMPRESAS ATIVAS
                },
                required: true // ✅ OBRIGATÓRIO TER EMPRESA ATIVA
              }
            ]
          });

          console.log(`🔍 Found ${whatsappConnections.length} active connections for page ${pageId}`);

          if (!whatsappConnections || whatsappConnections.length === 0) {
            console.log("❌ No active connection found for page:", pageId);
            continue;
          }

          // ✅ PROCESSAR CADA CONEXÃO COM ISOLAMENTO TOTAL POR EMPRESA
          for (const whatsapp of whatsappConnections) {
            try {
              const companyId = whatsapp.companyId;

              console.log("✅ Processing connection with strict company isolation:", {
                connectionId: whatsapp.id,
                connectionName: whatsapp.name,
                channel: whatsapp.channel,
                companyId: companyId,
                companyName: whatsapp.company?.name,
                companyStatus: whatsapp.company?.status
              });

              // ✅ DUPLA VERIFICAÇÃO DE SEGURANÇA - EMPRESA ATIVA
              if (!whatsapp.company || !whatsapp.company.status) {
                console.error("❌ SECURITY: Skipping inactive company:", {
                  companyId,
                  companyStatus: whatsapp.company?.status
                });
                continue;
              }

              // ✅ VALIDAÇÃO ADICIONAL - CONEXÃO PERTENCE À EMPRESA
              if (whatsapp.companyId !== companyId) {
                console.error("❌ SECURITY BREACH: Connection company mismatch!", {
                  whatsappCompanyId: whatsapp.companyId,
                  expectedCompanyId: companyId,
                  connectionId: whatsapp.id
                });
                continue;
              }

              // ✅ PROCESSAR MENSAGENS DO FACEBOOK MESSENGER
              if (entry.messaging && Array.isArray(entry.messaging) && whatsapp.channel === "facebook") {
                console.log(`💬 Processing ${entry.messaging.length} Facebook messaging events for company ${companyId}`);

                for (const messagingEvent of entry.messaging) {
                  try {
                    await processMessagingEventWithCompany(messagingEvent, whatsapp, "facebook", companyId);
                  } catch (messageError) {
                    console.error("❌ Error processing Facebook message:", {
                      companyId,
                      connectionId: whatsapp.id,
                      error: messageError.message
                    });
                  }
                }
              }

              // ✅ PROCESSAR CHANGES DO INSTAGRAM
              if (entry.changes && Array.isArray(entry.changes) && whatsapp.channel === "instagram") {
                console.log(`📸 Processing ${entry.changes.length} Instagram changes for company ${companyId}`);

                for (const change of entry.changes) {
                  try {
                    await processInstagramChangeWithCompany(change, whatsapp, pageId, companyId);
                  } catch (changeError) {
                    console.error("❌ Error processing Instagram change:", {
                      companyId,
                      connectionId: whatsapp.id,
                      error: changeError.message
                    });
                  }
                }
              }

              // ✅ PROCESSAR MESSAGING DO INSTAGRAM (formato alternativo)
              if (entry.messaging && Array.isArray(entry.messaging) && whatsapp.channel === "instagram") {
                console.log(`📸 Processing ${entry.messaging.length} Instagram messaging events for company ${companyId}`);

                for (const messagingEvent of entry.messaging) {
                  try {
                    await processMessagingEventWithCompany(messagingEvent, whatsapp, "instagram", companyId);
                  } catch (messageError) {
                    console.error("❌ Error processing Instagram messaging:", {
                      companyId,
                      connectionId: whatsapp.id,
                      error: messageError.message
                    });
                  }
                }
              }

            } catch (connectionError) {
              console.error("❌ Error processing connection:", {
                connectionId: whatsapp?.id,
                companyId: whatsapp?.companyId,
                error: connectionError.message,
                stack: connectionError.stack
              });
            }
          }

        } catch (entryError) {
          console.error("❌ Error processing entry:", {
            entryId: entry?.id,
            error: entryError.message,
            stack: entryError.stack
          });
        }
      }
    } else {
      console.log("⚠️ Unknown webhook object type:", body.object);
    }

    return;

  } catch (error) {
    console.error("💥 Webhook processing error:", {
      error: error.message,
      stack: error.stack
    });
    return;
  }
};

export const instagramWebhook = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    console.log("📸 INSTAGRAM WEBHOOK CALLED! 📸");
    console.log("📥 Request info:", {
      method: req.method,
      url: req.originalUrl,
      headers: {
        contentType: req.headers['content-type'],
        userAgent: req.headers['user-agent'],
        xHubSignature: req.headers['x-hub-signature-256']
      }
    });

    const { body } = req;
    console.log("📸 Instagram webhook received:", JSON.stringify(body, null, 2));

    // ✅ RESPONDER SEMPRE COM 200 PRIMEIRO
    res.status(200).json({
      message: "Instagram Event received",
      timestamp: new Date().toISOString()
    });

    // ✅ VALIDAÇÃO BÁSICA
    if (!body || !body.object || !body.entry || !Array.isArray(body.entry)) {
      console.log("⚠️ Invalid Instagram webhook payload");
      return;
    }

    // ✅ PROCESSAR INSTAGRAM (object pode ser "page" ou "instagram")
    if (body.object === "page" || body.object === "instagram") {
      console.log(`📸 Processing ${body.entry.length} Instagram entries`);

      for (const entry of body.entry) {
        try {
          const pageId = entry.id;
          console.log("📸 Processing Instagram entry for page:", pageId);

          // ✅ BUSCAR CONEXÕES INSTAGRAM ESPECÍFICAS
          const whatsappConnections = await Whatsapp.findAll({
            where: {
              facebookPageUserId: pageId,
              channel: "instagram", // ✅ FILTRAR APENAS INSTAGRAM
              status: "CONNECTED"
            },
            include: [
              {
                model: require("../models/Company").default,
                as: "company",
                attributes: ["id", "name", "status"],
                where: {
                  status: true
                },
                required: true
              }
            ]
          });

          console.log(`🔍 Found ${whatsappConnections.length} Instagram connections for pageId ${pageId}:`,
            whatsappConnections.map(w => ({
              id: w.id,
              name: w.name,
              channel: w.channel,
              companyId: w.companyId
            }))
          );

          if (!whatsappConnections || whatsappConnections.length === 0) {
            console.log("❌ No active Instagram connection found for page:", pageId);

            // ✅ DEBUG: BUSCAR TODAS AS CONEXÕES INSTAGRAM
            const allInstagramConnections = await Whatsapp.findAll({
              where: {
                channel: "instagram",
                status: "CONNECTED"
              },
              attributes: ['id', 'name', 'channel', 'facebookPageUserId', 'status', 'companyId']
            });

            console.log("🔍 All Instagram connections:", allInstagramConnections);
            continue;
          }

          // ✅ PROCESSAR CADA CONEXÃO INSTAGRAM
          for (const whatsapp of whatsappConnections) {
            try {
              console.log("✅ Processing Instagram connection with strict company isolation:", {
                connectionId: whatsapp.id,
                connectionName: whatsapp.name,
                channel: whatsapp.channel,
                companyId: whatsapp.companyId,
                companyName: whatsapp.company?.name,
                companyStatus: whatsapp.company?.status
              });

              // ✅ PROCESSAR MENSAGENS INSTAGRAM
              if (entry.messaging && Array.isArray(entry.messaging)) {
                console.log(`📸 Processing ${entry.messaging.length} Instagram messaging events for company ${whatsapp.companyId}`);

                for (const messagingEvent of entry.messaging) {
                  await processInstagramMessagingEventWithCompany(messagingEvent, whatsapp);
                }
              }

              // ✅ PROCESSAR CHANGES (INSTAGRAM DIRECT API)
              if (entry.changes && Array.isArray(entry.changes)) {
                console.log(`📸 Processing ${entry.changes.length} Instagram changes for company ${whatsapp.companyId}`);

                for (const change of entry.changes) {
                  if (change.field === "messages" && change.value) {
                    await processInstagramMessageChange(change.value, whatsapp);
                  }
                }
              }

            } catch (connectionError) {
              console.error("❌ Error processing Instagram connection:", {
                connectionId: whatsapp.id,
                companyId: whatsapp.companyId,
                error: connectionError.message,
                stack: connectionError.stack
              });
            }
          }

        } catch (entryError) {
          console.error("❌ Error processing Instagram entry:", {
            entryId: entry?.id,
            error: entryError.message,
            stack: entryError.stack
          });
        }
      }
    } else {
      console.log("⚠️ Unknown Instagram webhook object type:", body.object);
    }

    return;

  } catch (error) {
    console.error("💥 Instagram webhook processing error:", {
      error: error.message,
      stack: error.stack
    });
    return;
  }
};

export const instagramOAuth = async (req: AuthenticatedRequest, res: Response): Promise<Response> => {
  try {
    const { code, state } = req.query;
    
    console.log("📸 Instagram Business OAuth callback recebido:", {
      hasCode: !!code,
      state,
      fullUrl: req.originalUrl,
      userAgent: req.headers['user-agent']
    });

    // ✅ OBTER COMPANY_ID DE FORMA SEGURA
    let companyId: number;

    if (req.user && req.user.companyId) {
      companyId = req.user.companyId;
      console.log("✅ Using companyId from authenticated session:", companyId);
    } else if (state) {
      try {
        const stateString = typeof state === 'string' ? state : String(state);
        const stateData = JSON.parse(decodeURIComponent(stateString));

        if (!stateData.companyId) {
          throw new Error("CompanyId not found in state");
        }

        companyId = parseInt(stateData.companyId);
        console.log("✅ Using companyId from state:", companyId);

        // ✅ VALIDAR SE A EMPRESA EXISTE E ESTÁ ATIVA
        const Company = require("../models/Company").default;
        const company = await Company.findOne({
          where: {
            id: companyId,
            status: true
          }
        });

        if (!company) {
          throw new Error(`Company ${companyId} not found or inactive`);
        }

      } catch (error) {
        console.error("❌ Invalid state or company:", error.message);
        return res.status(400).send(`
          <html>
            <body>
              <script>
                console.error('Estado inválido ou empresa não encontrada');
                if (window.opener) {
                  window.opener.postMessage({type: 'INSTAGRAM_ERROR', error: 'Invalid company'}, '*');
                }
                window.close();
              </script>
            </body>
          </html>
        `);
      }
    } else {
      console.error("❌ SECURITY: No companyId available - rejecting connection");
      return res.status(400).send(`
        <html>
          <body>
            <script>
              console.error('Empresa não identificada - faça login novamente');
              if (window.opener) {
                window.opener.postMessage({type: 'INSTAGRAM_ERROR', error: 'Company not identified'}, '*');
              }
              window.close();
            </script>
          </body>
        </html>
      `);
    }

    if (!code) {
      return res.status(400).send(`
        <html>
          <body>
            <script>
              console.error('Código de autorização não encontrado');
              if (window.opener) {
                window.opener.postMessage({type: 'INSTAGRAM_ERROR', error: 'No authorization code'}, '*');
              }
              window.close();
            </script>
          </body>
        </html>
      `);
    }

    const codeString = typeof code === 'string' ? code : String(code);
    const clientId = process.env.FACEBOOK_APP_ID;
    const clientSecret = process.env.FACEBOOK_APP_SECRET;
    const redirectUri = `https://${req.get('host')}/webhooks/instagram/callback`;

    console.log("🔄 Trocando código por token do Instagram Business:", {
      clientId,
      redirectUri,
      companyId,
      hasSecret: !!clientSecret,
      codeLength: codeString.length
    });

    // ✅ 1. TROCAR CÓDIGO POR TOKEN - FORMATO CORRETO PARA FACEBOOK
    try {
      const tokenResponse = await axios.post('https://graph.facebook.com/v18.0/oauth/access_token', 
        // ✅ USAR URLSearchParams EM VEZ DE OBJETO JSON
        new URLSearchParams({
          client_id: clientId!,
          client_secret: clientSecret!,
          redirect_uri: redirectUri,
          code: codeString,
          grant_type: 'authorization_code'
        }).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const tokenData = tokenResponse.data;
      
      console.log("🔑 Token response:", { 
        hasToken: !!tokenData.access_token,
        tokenType: tokenData.token_type,
        error: tokenData.error
      });

      if (!tokenData.access_token) {
        console.error("❌ Falha ao obter token:", tokenData);
        return res.status(400).send(`
          <html>
            <body>
              <script>
                console.error('Falha ao obter token do Instagram Business: ${tokenData.error?.message || 'Unknown error'}');
                if (window.opener) {
                  window.opener.postMessage({type: 'INSTAGRAM_ERROR', error: 'Token failed'}, '*');
                }
                window.close();
              </script>
            </body>
          </html>
        `);
      }

      // ✅ 2. BUSCAR PÁGINAS DO FACEBOOK USANDO O TOKEN OBTIDO
      const pagesResponse = await axios.get('https://graph.facebook.com/v18.0/me/accounts', {
        params: {
          access_token: tokenData.access_token,
          fields: 'id,name,access_token,instagram_business_account{id,username,name,profile_picture_url}'
        }
      });
      
      const pagesData = pagesResponse.data;

      console.log("📄 Pages response:", { 
        hasData: !!pagesData.data,
        pagesCount: pagesData.data?.length,
        error: pagesData.error
      });

      if (!pagesData.data || pagesData.data.length === 0) {
        console.error("❌ Nenhuma página encontrada");
        return res.status(400).send(`
          <html>
            <body>
              <script>
                console.error('Nenhuma página do Facebook encontrada. Conecte uma página primeiro.');
                if (window.opener) {
                  window.opener.postMessage({type: 'INSTAGRAM_ERROR', error: 'No Facebook pages found'}, '*');
                }
                window.close();
              </script>
            </body>
          </html>
        `);
      }

      // ✅ 3. PROCURAR CONTA INSTAGRAM BUSINESS
      let instagramAccount = null;
      let pageAccessToken = null;

      for (const page of pagesData.data) {
        try {
          console.log(`🔍 Verificando página: ${page.name} (${page.id})`);
          
          if (page.instagram_business_account) {
            instagramAccount = page.instagram_business_account;
            pageAccessToken = page.access_token;
            
            console.log("✅ Conta Instagram Business encontrada:", {
              instagramId: instagramAccount.id,
              username: instagramAccount.username,
              pageId: page.id,
              pageName: page.name
            });
            break;
          }
        } catch (error) {
          console.log(`⚠️ Erro ao verificar página ${page.id}:`, error.message);
        }
      }

      if (!instagramAccount) {
        console.error("❌ Nenhuma conta Instagram Business encontrada");
        return res.status(400).send(`
          <html>
            <body>
              <script>
                console.error('Nenhuma conta Instagram Business encontrada. Conecte sua conta Instagram à uma página do Facebook.');
                if (window.opener) {
                  window.opener.postMessage({type: 'INSTAGRAM_ERROR', error: 'No Instagram Business account found'}, '*');
                }
                window.close();
              </script>
            </body>
          </html>
        `);
      }

      // ✅ 4. OBTER DADOS BÁSICOS DA CONTA INSTAGRAM
      const igUserResponse = await axios.get(`https://graph.facebook.com/v18.0/${instagramAccount.id}`, {
        params: {
          fields: 'id,username,name,profile_picture_url',
          access_token: pageAccessToken
        }
      });
      
      const igUserData = igUserResponse.data;

      console.log("👤 Instagram Business user data:", igUserData);

      if (igUserData.error) {
        console.error("❌ Erro ao obter dados do Instagram:", igUserData);
        return res.status(400).send(`
          <html>
            <body>
              <script>
                console.error('Erro ao obter dados do Instagram Business');
                if (window.opener) {
                  window.opener.postMessage({type: 'INSTAGRAM_ERROR', error: 'Instagram data failed'}, '*');
                }
                window.close();
              </script>
            </body>
          </html>
        `);
      }

      // ✅ 5. CRIAR/ATUALIZAR CONEXÃO INSTAGRAM BUSINESS
      const existingConnection = await Whatsapp.findOne({
        where: {
          facebookPageUserId: instagramAccount.id,
          channel: "instagram",
          companyId: companyId
        }
      });

      let whatsapp;

      if (existingConnection) {
        // ✅ VALIDAÇÃO DE SEGURANÇA
        if (existingConnection.companyId !== companyId) {
          console.error("❌ SECURITY BREACH: Existing connection belongs to different company!", {
            existingCompanyId: existingConnection.companyId,
            requestCompanyId: companyId,
            connectionId: existingConnection.id
          });
          return res.status(403).send(`
            <html>
              <body>
                <script>
                  console.error('Violação de segurança: conexão pertence a outra empresa');
                  if (window.opener) {
                    window.opener.postMessage({type: 'INSTAGRAM_ERROR', error: 'Security violation'}, '*');
                  }
                  window.close();
                </script>
              </body>
            </html>
          `);
        }

        await existingConnection.update({
          status: "CONNECTED",
          facebookUserToken: pageAccessToken,
          tokenMeta: pageAccessToken,
          name: `@${igUserData.username || igUserData.name || 'unknown'}` // ✅ APENAS @ + USERNAME
        });
        whatsapp = existingConnection;
        console.log(`✅ Instagram Business atualizado para empresa ${companyId}:`, whatsapp.id);
      } else {
        // ✅ CRIAR NOVA CONEXÃO
        const instagramData = {
          name: `@${igUserData.username || igUserData.name || 'unknown'}`, // ✅ APENAS @ + USERNAME
          companyId: companyId,
          status: "CONNECTED",
          channel: "instagram",
          isDefault: false,
          greetingMessage: "",
          queueIds: [],
          facebookUserId: instagramAccount.id,
          facebookUserToken: pageAccessToken,
          facebookPageUserId: instagramAccount.id,
          tokenMeta: pageAccessToken,
          number: instagramAccount.id,
          token: "",
          maxUseBotQueues: 3,
          timeUseBotQueues: 0,
          expiresTicket: 0,
          timeSendQueue: 0,
          expiresInactiveMessage: "",
          provider: "beta",
          isMultidevice: false
        };

        const result = await CreateWhatsAppService(instagramData);
        whatsapp = result.whatsapp;

        // ✅ VALIDAÇÃO FINAL DE SEGURANÇA
        if (whatsapp.companyId !== companyId) {
          console.error("❌ SECURITY BREACH: Created connection has wrong companyId!", {
            createdCompanyId: whatsapp.companyId,
            expectedCompanyId: companyId,
            connectionId: whatsapp.id
          });
          throw new Error("Security violation in connection creation");
        }

        console.log(`✅ Instagram Business criado para empresa ${companyId}:`, whatsapp.id);
      }

      // ✅ 6. EMITIR EVENTO SOCKET APENAS PARA A EMPRESA ESPECÍFICA
      const io = getIO();
      io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-whatsapp`, {
        action: "update",
        whatsapp
      });

      console.log(`✅ Evento socket emitido APENAS para empresa ${companyId}`);

      // ✅ 7. RETORNAR SUCESSO
      return res.send(`
        <html>
          <body>
            <script>
              console.log('✅ Instagram Business conectado para empresa ${companyId}');
              if (window.opener) {
                window.opener.postMessage({
                  type: 'INSTAGRAM_SUCCESS', 
                  data: {
                    id: ${whatsapp.id},
                    name: '${whatsapp.name}',
                    status: '${whatsapp.status}',
                    companyId: ${companyId}
                  }
                }, '*');
              }
              window.close();
            </script>
          </body>
        </html>
      `);

    } catch (tokenError) {
      console.error("❌ Erro ao trocar código por token:", {
        error: tokenError.message,
        status: tokenError.response?.status,
        data: tokenError.response?.data,
        config: {
          url: tokenError.config?.url,
          method: tokenError.config?.method,
          data: tokenError.config?.data
        }
      });

      return res.status(400).send(`
        <html>
          <body>
            <script>
              console.error('Erro ao obter token de acesso: ${tokenError.response?.data?.error?.message || tokenError.message}');
              if (window.opener) {
                window.opener.postMessage({type: 'INSTAGRAM_ERROR', error: 'Token exchange failed'}, '*');
              }
              window.close();
            </script>
          </body>
        </html>
      `);
    }
    
  } catch (error) {
    console.error("❌ Erro no Instagram Business OAuth:", {
      error: error.message,
      stack: error.stack
    });
    return res.status(500).send(`
      <html>
        <body>
          <script>
            console.error('Erro interno:', '${error.message}');
            if (window.opener) {
              window.opener.postMessage({type: 'INSTAGRAM_ERROR', error: 'Internal error'}, '*');
            }
            window.close();
          </script>
        </body>
        </html>
    `);
  }
};

const processInstagramMessagingEventWithCompany = async (
  messagingEvent: any,
  whatsapp: any
): Promise<void> => {
  try {
    console.log("📸 Processing Instagram message for company", whatsapp.companyId, ":", {
      sender: messagingEvent.sender?.id,
      hasMessage: !!messagingEvent.message,
      isEcho: messagingEvent.message?.is_echo,
      connectionId: whatsapp.id,
      connectionCompanyId: whatsapp.companyId
    });

    // ✅ IMPORTAR E USAR O LISTENER EXISTENTE
    const { handleMessage } = require("../services/FacebookServices/facebookMessageListener");

    await handleMessage(whatsapp, messagingEvent, "instagram", whatsapp.companyId);

    console.log("✅ Instagram message processed successfully for company", whatsapp.companyId);
  } catch (error) {
    console.error("❌ Error in Instagram handleMessage for company", whatsapp.companyId, ":", {
      error: `Error: ${error.message}`,
      stack: error.stack,
      connectionId: whatsapp.id,
      channel: "instagram"
    });

    console.error("❌ Error processing Instagram message:", {
      companyId: whatsapp.companyId,
      connectionId: whatsapp.id,
      error: `Error: ${error.message}`
    });
  }
};

const processInstagramMessageChange = async (
  changeValue: any,
  whatsapp: any
): Promise<void> => {
  try {
    console.log("📸 Processing Instagram change for company", whatsapp.companyId, ":", {
      hasFrom: !!changeValue.from,
      hasText: !!changeValue.text,
      connectionId: whatsapp.id
    });

    // ✅ CONVERTER CHANGE PARA FORMATO MESSAGING
    const messagingEvent = {
      sender: { id: changeValue.from?.id },
      recipient: { id: changeValue.to?.id },
      timestamp: new Date(changeValue.created_time).getTime(),
      message: {
        mid: changeValue.id,
        text: changeValue.text,
        attachments: changeValue.attachments
      }
    };

    const { handleMessage } = require("../services/FacebookServices/facebookMessageListener");

    await handleMessage(whatsapp, messagingEvent, "instagram", whatsapp.companyId);

    console.log("✅ Instagram change processed successfully for company", whatsapp.companyId);
  } catch (error) {
    console.error("❌ Error processing Instagram change:", {
      companyId: whatsapp.companyId,
      connectionId: whatsapp.id,
      error: error.message
    });
  }
};

export const subscribeInstagramApp = async (
  instagramId: string,
  accessToken: string
) => {
  try {
    console.log("📸 Subscribing Instagram Business app to webhooks:", instagramId);

    const url = `https://graph.facebook.com/v18.0/${instagramId}/subscribed_apps`;

    // ✅ CAMPOS VÁLIDOS APENAS PARA INSTAGRAM BUSINESS
    const validFields = [
      'comments',
      'live_comments',
      'mentions',
      'message_reactions',
      'messages',
      'messaging_optins',
      'messaging_postbacks',
      'messaging_referral',
      'messaging_seen',
      'story_insights'
    ];

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscribed_fields: validFields.join(','), // ✅ USAR CAMPOS VÁLIDOS
        access_token: accessToken
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Instagram Business webhook subscription failed: ${JSON.stringify(data)}`);
    }

    console.log("✅ Instagram Business webhook subscribed successfully:", data);
    return data;

  } catch (error) {
    console.error("❌ Error subscribing Instagram Business webhook:", error);
    throw error;
  }
};

// ✅ FUNÇÕES AUXILIARES COM ISOLAMENTO TOTAL POR EMPRESA

async function processMessagingEventWithCompany(messagingEvent: any, whatsapp: any, channel: string, companyId: number) {
  console.log(`💬 Processing ${channel} message for company ${companyId}:`, {
    sender: messagingEvent.sender?.id,
    hasMessage: !!messagingEvent.message,
    isEcho: messagingEvent.message?.is_echo,
    connectionId: whatsapp.id,
    connectionCompanyId: whatsapp.companyId
  });

  // ✅ VALIDAÇÕES DE SEGURANÇA CRÍTICAS
  if (messagingEvent.message && messagingEvent.message.is_echo) {
    console.log("⏭️ Skipping echo message");
    return;
  }

  if (!messagingEvent.message || !messagingEvent.sender || !messagingEvent.sender.id) {
    console.log("⏭️ Skipping invalid message");
    return;
  }

  // ✅ VALIDAÇÃO CRÍTICA - CONEXÃO PERTENCE À EMPRESA CORRETA
  if (whatsapp.companyId !== companyId) {
    console.error("❌ CRITICAL SECURITY VIOLATION: Connection company mismatch!", {
      whatsappCompanyId: whatsapp.companyId,
      expectedCompanyId: companyId,
      connectionId: whatsapp.id,
      channel: channel,
      messageFrom: messagingEvent.sender.id
    });
    throw new Error(`Security violation: Connection ${whatsapp.id} belongs to company ${whatsapp.companyId}, not ${companyId}`);
  }

  // ✅ VALIDAÇÃO ADICIONAL - EMPRESA ESTÁ ATIVA
  if (!whatsapp.company || !whatsapp.company.status) {
    console.error("❌ SECURITY: Company is inactive!", {
      companyId: whatsapp.companyId,
      companyStatus: whatsapp.company?.status,
      connectionId: whatsapp.id
    });
    return;
  }

  try {
    await handleMessage(
      whatsapp,
      messagingEvent,
      channel,
      companyId // ✅ PASSAR COMPANY_ID EXPLICITAMENTE
    );

    console.log(`✅ ${channel} message processed successfully for company ${companyId}`);
  } catch (error) {
    console.error(`❌ Error in handleMessage for company ${companyId}:`, {
      error: error.message,
      stack: error.stack,
      connectionId: whatsapp.id,
      channel: channel
    });
    throw error;
  }
}

async function processInstagramChangeWithCompany(change: any, whatsapp: any, pageId: string, companyId: number) {
  console.log(`📸 Processing Instagram change for company ${companyId}:`, {
    field: change.field,
    hasValue: !!change.value,
    connectionId: whatsapp.id,
    connectionCompanyId: whatsapp.companyId,
    pageId: pageId
  });

  if (change.field === "messages" && change.value) {
    if (!change.value.from || !change.value.from.id) {
      console.log("⏭️ Skipping Instagram message without sender");
      return;
    }

    // ✅ VALIDAÇÃO CRÍTICA - CONEXÃO PERTENCE À EMPRESA CORRETA
    if (whatsapp.companyId !== companyId) {
      console.error("❌ CRITICAL SECURITY VIOLATION: Instagram connection company mismatch!", {
        whatsappCompanyId: whatsapp.companyId,
        expectedCompanyId: companyId,
        connectionId: whatsapp.id,
        pageId: pageId,
        messageFrom: change.value.from.id
      });
      throw new Error(`Security violation: Instagram connection ${whatsapp.id} belongs to company ${whatsapp.companyId}, not ${companyId}`);
    }

    // ✅ VALIDAÇÃO ADICIONAL - EMPRESA ESTÁ ATIVA
    if (!whatsapp.company || !whatsapp.company.status) {
      console.error("❌ SECURITY: Instagram company is inactive!", {
        companyId: whatsapp.companyId,
        companyStatus: whatsapp.company?.status,
        connectionId: whatsapp.id
      });
      return;
    }

    const instagramEvent = {
      sender: { id: change.value.from.id },
      recipient: { id: pageId },
      timestamp: change.value.created_time || Date.now(),
      message: {
        mid: change.value.id || `ig_${Date.now()}`,
        text: change.value.text || change.value.message || "",
        is_echo: false,
        attachments: change.value.attachments || null
      }
    };

    try {
      await handleMessage(
        whatsapp,
        instagramEvent,
        "instagram",
        companyId // ✅ PASSAR COMPANY_ID EXPLICITAMENTE
      );

      console.log(`✅ Instagram change processed successfully for company ${companyId}`);
    } catch (error) {
      console.error(`❌ Error in Instagram handleMessage for company ${companyId}:`, {
        error: error.message,
        stack: error.stack,
        connectionId: whatsapp.id,
        pageId: pageId
      });
      throw error;
    }
  }
}