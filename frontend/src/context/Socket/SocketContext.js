// frontend/src/context/Socket/SocketContext.js

import { createContext } from "react";
import openSocket from "socket.io-client";
import { isExpired } from "react-jwt";

// Ajuste o caminho conforme sua pasta assets; você informou que esse é o local.
// Coloque o arquivo new-message.mp3 em frontend/src/assets/sounds/new-message.mp3
import newMessageSound from "../../assets/sounds/new-message.mp3";

class ManagedSocket {
  constructor(socketManager) {
    this.socketManager = socketManager;
    this.rawSocket = socketManager.currentSocket;
    this.callbacks = [];
    this.joins = [];

    // Re-registrar callbacks e joins quando o rawSocket reconectar
    this.rawSocket.on("connect", () => {
      console.warn("ManagedSocket: rawSocket connected");

      for (const c of this.callbacks) {
        try {
          this.rawSocket.off(c.event, c.callback);
          this.rawSocket.on(c.event, c.callback);
        } catch (err) {
          console.error("ManagedSocket: erro re-registrando callback", err);
        }
      }

      for (const j of this.joins) {
        try {
          console.debug("ManagedSocket: rejoining on connect", j);
          this.rawSocket.emit(`join${j.event}`, ...j.params);
        } catch (err) {
          console.error("ManagedSocket: erro rejoining", err);
        }
      }

      const refreshJoinsOnReady = () => {
        for (const j of this.joins) {
          try {
            console.debug("ManagedSocket: refreshing join on ready", j);
            this.rawSocket.emit(`join${j.event}`, ...j.params);
          } catch (err) {
            console.error("ManagedSocket: erro refreshing join", err);
          }
        }
      };

      try {
        this.rawSocket.off("ready", refreshJoinsOnReady);
      } catch (_) {}
      this.rawSocket.on("ready", refreshJoinsOnReady);
    });
  }
  
  on(event, callback) {
    if (event === "ready" || event === "connect") {
      return this.socketManager.onReady(callback);
    }
    if (!this.callbacks.find((c) => c.event === event && c.callback === callback)) {
      this.callbacks.push({event, callback});
    }
    return this.rawSocket.on(event, callback);
  }
  
  off(event, callback) {
    const i = this.callbacks.findIndex((c) => c.event === event && c.callback === callback);
    if (i !== -1) {
      this.callbacks.splice(i, 1);
    }
    return this.rawSocket.off(event, callback);
  }
  
  emit(event, ...params) {
    if (event.startsWith("join")) {
      const ev = event.substring(4);
      const exists = this.joins.find((j) => {
        try {
          return j.event === ev && JSON.stringify(j.params) === JSON.stringify(params);
        } catch(_) { return false; }
      });
      if (!exists) {
        this.joins.push({ event: ev, params });
        console.log("ManagedSocket: Joining", { event: ev, params});
      } else {
        console.debug("ManagedSocket: already joined", { event: ev, params});
      }
    }
    return this.rawSocket.emit(event, ...params);
  }
  
  disconnect() {
    for (const j of this.joins) {
      try {
        this.rawSocket.emit(`leave${j.event}`, ...j.params);
      } catch (_) {}
    }
    this.joins = [];
    for (const c of this.callbacks) {
      try {
        this.rawSocket.off(c.event, c.callback);
      } catch (_) {}
    }
    this.callbacks = [];
  }
}

class DummySocket {
  on(..._) {}
  off(..._) {}
  emit(..._) {}
  disconnect() {}
  removeAllListeners() {}
}

/**
 * Helper: tenta detectar se o payload (ou objetos aninhados) indicam que a
 * mensagem foi enviada pelo próprio atendente logado.
 *
 * Regra: se encontrarmos qualquer id que bata com loggedUserId ou flags claras
 * (fromMe/isFromMe/author.role='agent'), assumimos que foi enviado pelo atendente.
 *
 * Se não conseguirmos identificar com confiança, retornamos false (ou seja,
 * tocar som).
 */
function isPayloadFromLoggedUser(payload, loggedUserId) {
  if (!payload) return false;

  // Colete possíveis sub-payloads (mensagens aninhadas)
  const candidates = [payload];
  if (payload.message) candidates.push(payload.message);
  if (payload.data) candidates.push(payload.data);
  if (payload.msg) candidates.push(payload.msg);
  if (payload.ticket) {
    candidates.push(payload.ticket);
    if (payload.ticket.lastMessage) candidates.push(payload.ticket.lastMessage);
  }
  if (payload.body) candidates.push(payload.body);

  const ids = new Set();
  for (const p of candidates) {
    if (!p || typeof p !== "object") continue;
    // Campos comuns que podem conter id do remetente
    const maybeIds = [
      p.userId, p.userid, p.user_id,
      p.senderId, p.sender_id, p.sender,
      p.author, p.authorId, p.author_id,
      p.from, p.fromNumber, p.from_number,
      p.contactId, p.contact_id, p.clientId,
      p.ownerId, p.adminId, p.to
    ];
    for (const v of maybeIds) {
      if (v !== undefined && v !== null) {
        // Se for objeto, tente extrair id/_id
        if (typeof v === "object") {
          if (v._id) ids.add(String(v._id));
          if (v.id) ids.add(String(v.id));
          if (v.userId) ids.add(String(v.userId));
        } else {
          ids.add(String(v));
        }
      }
    }

    // Flags que indicam envio pelo agente/admin
    if (p.fromMe === true || p.isFromMe === true || p.isAgent === true || p.isOperator === true) {
      return true;
    }
    if (p.author && typeof p.author === "object" && p.author.role) {
      const role = String(p.author.role).toLowerCase();
      if (role === "agent" || role === "admin" || role === "operator") {
        return true;
      }
    }
    if (p.sentBy && (String(p.sentBy).toLowerCase().includes("agent") || String(p.sentBy).toLowerCase().includes("operator"))) {
      return true;
    }
  }

  if (loggedUserId && ids.has(String(loggedUserId))) return true;

  // Se não detectamos evidência de que foi o atendente, retornamos false
  return false;
}

const socketManager = {
  currentCompanyId: -1,
  currentUserId: -1,
  currentSocket: null,
  socketReady: false,

  // Instância de áudio usando o asset importado
  notificationAudio: (() => {
    try {
      const a = new Audio(newMessageSound);
      a.preload = "auto";
      try { a.load(); } catch (_) {}
      return a;
    } catch (_) {
      return null;
    }
  })(),

  getSocket: function(companyId) {
    let userId = null;
    if (localStorage.getItem("userId")) {
      userId = localStorage.getItem("userId");
    }

    if (!companyId && !this.currentSocket) {
      return new DummySocket();
    }

    if (companyId && typeof companyId !== "string") {
      companyId = `${companyId}`;
    }

    if (companyId !== this.currentCompanyId || userId !== this.currentUserId) {
      if (this.currentSocket) {
        console.warn("closing old socket - company or user changed");
        try {
          this.currentSocket.removeAllListeners();
          this.currentSocket.disconnect();
        } catch (_) {}
        this.currentSocket = null;
        this.currentCompanyId = null;
        this.currentUserId = null;
        this.socketReady = false;
      }

      let token = JSON.parse(localStorage.getItem("token"));
      if (!token) {
        return new DummySocket();
      }
      
      if ( isExpired(token) ) {
        console.warn("Expired token, waiting for refresh");
        setTimeout(() => {
          const currentToken = JSON.parse(localStorage.getItem("token"));
          if (isExpired(currentToken)) {
            localStorage.removeItem("token");
            localStorage.removeItem("companyId");
          }
          window.location.reload();
        },1000);
        return new DummySocket();
      }

      this.currentCompanyId = companyId;
      this.currentUserId = userId;
      
      // Criar socket com opções de reconexão e enviar token tanto em query quanto em auth
      this.currentSocket = openSocket(process.env.REACT_APP_BACKEND_URL, {
        transports: ["websocket"],
        pingTimeout: 18000,
        pingInterval: 18000,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        query: { token },
        auth: { token },
      });

      // Atualiza token durante tentativas de reconexão
      this.currentSocket.io.on("reconnect_attempt", () => {
        this.currentSocket.io.opts.query = this.currentSocket.io.opts.query || {};
        this.currentSocket.io.opts.query.r = 1;
        token = JSON.parse(localStorage.getItem("token"));
        if ( isExpired(token) ) {
          console.warn("Refreshing during reconnect_attempt");
          window.location.reload();
        } else {
          console.warn("Using new token on reconnect_attempt");
          this.currentSocket.io.opts.query.token = token;
          this.currentSocket.io.opts.auth = this.currentSocket.io.opts.auth || {};
          this.currentSocket.io.opts.auth.token = token;
        }
      });

      this.currentSocket.on("disconnect", (reason) => {
        console.warn(`socket disconnected because: ${reason}`);
        this.socketReady = false;
        if (reason && typeof reason === "string" && reason.startsWith("io server disconnect")) {
          token = JSON.parse(localStorage.getItem("token"));
          
          if ( isExpired(token) ) {
            console.warn("Expired token - refreshing");
            window.location.reload();
            return;
          }
          console.warn("Reconnecting using refreshed token");
          this.currentSocket.io.opts.query = this.currentSocket.io.opts.query || {};
          this.currentSocket.io.opts.query.token = token;
          this.currentSocket.io.opts.query.r = 1;
          this.currentSocket.io.opts.auth = this.currentSocket.io.opts.auth || {};
          this.currentSocket.io.opts.auth.token = token;
          try {
            this.currentSocket.connect();
          } catch (err) {
            console.error("Error while trying to reconnect", err);
          }
        }
      });
      
      this.currentSocket.on("connect", (...params) => {
        console.warn("socket connected", params);
        this.socketReady = true;
      });

      this.currentSocket.on("connect_error", (err) => {
        console.warn("socket connect_error", err);
        const tNow = JSON.parse(localStorage.getItem("token"));
        if ( isExpired(tNow) ) {
          console.warn("connect_error: token expired -> reloading");
          window.location.reload();
        }
      });

      // ===== Aqui registramos apenas UMA vez o onAny para esse socket =====
      this.currentSocket.onAny((event, ...args) => {
        // DEBUG: mostra o evento e o primeiro payload
        console.debug("[socket.onAny] event:", event, "args:", args);

        const evName = String(event || "").toLowerCase();

        // Filtrar eventos que provavelmente interessam (mensagem / ticket)
        if (!(evName.includes("ticket") || evName.includes("message") || evName.includes("appmessage"))) {
          // não é evento de mensagem/ticket -> ignorar
          return;
        }

        try {
          const loggedUserId = localStorage.getItem("userId");
          const payload = args && args.length > 0 ? args[0] : null;

          const fromLoggedUser = isPayloadFromLoggedUser(payload, loggedUserId);

          console.debug("[notification-check] event:", event, "fromLoggedUser:", fromLoggedUser, "payload:", payload);

          if (!fromLoggedUser) {
            // toca som (se instância de audio disponível)
            if (this.notificationAudio) {
              try {
                this.notificationAudio.currentTime = 0;
                this.notificationAudio.play().catch((err) => {
                  // autoplay pode bloquear — OK, não é erro crítico
                  console.log("notificationAudio.play() blocked by autoplay policy or error:", err);
                });
              } catch (err) {
                console.error("Erro ao tentar reproduzir som de notificação:", err);
              }
            } else {
              console.warn("notificationAudio não disponível para tocar som");
            }
          } else {
            // Debug: mensagem do próprio atendente -> não tocar
            console.debug("[notification-skip] mensagem do atendente logado -> sem som");
          }
        } catch (err) {
          console.error("Erro no handler de notificação:", err);
        }
      });
      // ==================================================================

      try {
        this.currentSocket.io.on("reconnect", (attempt) => {
          console.warn("socket.io reconnected after attempts:", attempt);
          this.socketReady = true;
        });
      } catch (_) {}

      this.onReady(() => {
        this.socketReady = true;
      });

    }
    
    return new ManagedSocket(this);
  },
  
  onReady: function( callbackReady ) {
    if (this.socketReady) {
      callbackReady();
      return;
    }

    if (this.currentSocket && this.currentSocket.connected) {
      this.socketReady = true;
      callbackReady();
      return;
    }
    
    if (!this.currentSocket) {
      return;
    }
    
    this.currentSocket.once("ready", () => {
      this.socketReady = true;
      callbackReady();
    });
  },
  
  onConnect: function( callbackReady ) { this.onReady( callbackReady ) },

};

const SocketContext = createContext()

export { SocketContext, socketManager };
