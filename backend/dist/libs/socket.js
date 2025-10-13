"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIO = exports.initIO = void 0;
const socket_io_1 = require("socket.io");
const AppError_1 = __importDefault(require("../errors/AppError"));
const logger_1 = require("../utils/logger");
const User_1 = __importDefault(require("../models/User"));
const Queue_1 = __importDefault(require("../models/Queue"));
const Ticket_1 = __importDefault(require("../models/Ticket"));
const jsonwebtoken_1 = require("jsonwebtoken");
const auth_1 = __importDefault(require("../config/auth"));
const counter_1 = require("./counter");
let io;
const initIO = (httpServer) => {
    io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_URL,
            credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000
    });
    io.on("connection", async (socket) => {
        logger_1.logger.info("Client Connected");
        const token = socket.handshake.auth?.token ||
            socket.handshake.query?.token;
        let tokenData = null;
        try {
            if (!token) {
                throw new Error("Token ausente na conexão");
            }
            tokenData = (0, jsonwebtoken_1.verify)(token, auth_1.default.secret);
            logger_1.logger.debug(tokenData, "io-onConnection: tokenData");
        }
        catch (error) {
            logger_1.logger.error(error, "Error decoding token");
            socket.emit("auth_error", { error: "Invalid or missing token" });
            socket.disconnect(true);
            return io;
        }
        const counters = new counter_1.CounterManager();
        let user = null;
        let userId = tokenData.id;
        if (userId && userId !== "undefined" && userId !== "null") {
            user = await User_1.default.findByPk(userId, { include: [Queue_1.default] });
            if (user) {
                user.online = true;
                await user.save();
            }
            else {
                logger_1.logger.info(`onConnect: User ${userId} not found`);
                socket.disconnect(true);
                return io;
            }
        }
        else {
            logger_1.logger.info("onConnect: Missing userId");
            socket.disconnect(true);
            return io;
        }
        socket.join(`company-${user.companyId}-mainchannel`);
        socket.join(`user-${user.id}`);
        socket.on("joinChatBox", async (ticketId) => {
            if (!ticketId || ticketId === "undefined") {
                return;
            }
            Ticket_1.default.findByPk(ticketId).then((ticket) => {
                if (ticket &&
                    ticket.companyId === user.companyId &&
                    (ticket.userId === user.id || user.profile === "admin")) {
                    let c;
                    if ((c = counters.incrementCounter(`ticket-${ticketId}`)) === 1) {
                        socket.join(ticketId);
                    }
                    logger_1.logger.debug(`joinChatbox[${c}]: Channel: ${ticketId} by user ${user.id}`);
                }
                else {
                    logger_1.logger.info(`Invalid attempt to join channel of ticket ${ticketId} by user ${user.id}`);
                }
            }, (error) => {
                logger_1.logger.error(error, `Error fetching ticket ${ticketId}`);
            });
        });
        socket.on("leaveChatBox", async (ticketId) => {
            if (!ticketId || ticketId === "undefined") {
                return;
            }
            let c;
            if ((c = counters.decrementCounter(`ticket-${ticketId}`)) === 0) {
                socket.leave(ticketId);
            }
            logger_1.logger.debug(`leaveChatbox[${c}]: Channel: ${ticketId} by user ${user.id}`);
        });
        socket.on("joinNotification", async () => {
            let c;
            if ((c = counters.incrementCounter("notification")) === 1) {
                if (user.profile === "admin") {
                    socket.join(`company-${user.companyId}-notification`);
                }
                else {
                    user.queues.forEach((queue) => {
                        logger_1.logger.debug(`User ${user.id} of company ${user.companyId} joined queue ${queue.id} channel.`);
                        socket.join(`queue-${queue.id}-notification`);
                    });
                }
            }
            logger_1.logger.debug(`joinNotification[${c}]: User: ${user.id}`);
        });
        socket.on("leaveNotification", async () => {
            let c;
            if ((c = counters.decrementCounter("notification")) === 0) {
                if (user.profile === "admin") {
                    socket.leave(`company-${user.companyId}-notification`);
                }
                else {
                    user.queues.forEach((queue) => {
                        logger_1.logger.debug(`User ${user.id} of company ${user.companyId} leaved queue ${queue.id} channel.`);
                        socket.leave(`queue-${queue.id}-notification`);
                    });
                }
            }
            logger_1.logger.debug(`leaveNotification[${c}]: User: ${user.id}`);
        });
        socket.on("joinTickets", (status) => {
            if (counters.incrementCounter(`status-${status}`) === 1) {
                if (user.profile === "admin") {
                    logger_1.logger.debug(`Admin ${user.id} of company ${user.companyId} joined ${status} tickets channel.`);
                    socket.join(`company-${user.companyId}-${status}`);
                }
                else if (status === "pending") {
                    user.queues.forEach((queue) => {
                        logger_1.logger.debug(`User ${user.id} of company ${user.companyId} joined queue ${queue.id} pending tickets channel.`);
                        socket.join(`queue-${queue.id}-pending`);
                    });
                }
                else {
                    logger_1.logger.debug(`User ${user.id} cannot subscribe to ${status}`);
                }
            }
        });
        socket.on("joinConnectionTickets", async (whatsappId, status) => {
            logger_1.logger.info(`User ${user.id} joining connection ${whatsappId} tickets channel with status ${status}`);
            if (user.profile === "admin" || user.profile === "supervisor") {
                if (whatsappId === "all") {
                    socket.join(`company-${user.companyId}-allwhatsapps-${status}`);
                }
                else {
                    socket.join(`company-${user.companyId}-whatsapp-${whatsappId}-${status}`);
                }
                logger_1.logger.info(`Admin/Supervisor ${user.id} joined whatsapp ${whatsappId} ${status} channel`);
            }
            else {
                socket.join(`company-${user.companyId}-whatsapp-${whatsappId}-${status}`);
                logger_1.logger.info(`User ${user.id} joined whatsapp ${whatsappId} ${status} channel`);
            }
        });
        socket.on("leaveTickets", (status) => {
            if (counters.decrementCounter(`status-${status}`) === 0) {
                if (user.profile === "admin") {
                    logger_1.logger.debug(`Admin ${user.id} of company ${user.companyId} leaved ${status} tickets channel.`);
                    socket.leave(`company-${user.companyId}-${status}`);
                }
                else if (status === "pending") {
                    user.queues.forEach((queue) => {
                        logger_1.logger.debug(`User ${user.id} of company ${user.companyId} leaved queue ${queue.id} pending tickets channel.`);
                        socket.leave(`queue-${queue.id}-pending`);
                    });
                }
            }
        });
        socket.on("disconnect", async (reason) => {
            logger_1.logger.info(`User ${user.id} disconnected: ${reason}`);
            if (user) {
                user.online = false;
                await user.save();
            }
        });
        socket.emit("ready");
    });
    return io;
};
exports.initIO = initIO;
const getIO = () => {
    if (!io) {
        throw new AppError_1.default("Socket IO not initialized");
    }
    return io;
};
exports.getIO = getIO;
