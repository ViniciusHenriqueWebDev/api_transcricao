import { io } from "socket.io-client";

// Endereço do backend definido no .env
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8080";

const socket = io(BACKEND_URL, {
  transports: ["websocket"], // Força uso de websocket para mais estabilidade
  reconnection: true, // Habilita reconexão automática
  reconnectionAttempts: Infinity, // Tentativas infinitas
  reconnectionDelay: 3000, // Aguarda 3s entre cada tentativa
  timeout: 60000, // Tempo máximo para considerar a conexão como perdida (60s)
  autoConnect: true, // Conecta automaticamente
  forceNew: true, // Evita conexões antigas ficarem presas
  pingInterval: 25000, // Intervalo para manter conexão viva (25s)
  pingTimeout: 60000 // Tempo de espera do ping antes de desconectar
});

// Mantém controle se a aba está visível
let isTabActive = true;
document.addEventListener("visibilitychange", () => {
  isTabActive = !document.hidden;
});

// Evento para depuração — mostra quando reconectar
socket.on("connect", () => {
  console.log("[SOCKET] Conectado ao servidor:", BACKEND_URL);
});

socket.on("disconnect", (reason) => {
  console.warn("[SOCKET] Desconectado:", reason);
});

socket.on("connect_error", (error) => {
  console.error("[SOCKET] Erro de conexão:", error.message);
});

export default socket;