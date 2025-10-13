import React, { useState, useRef, useEffect, useContext, useCallback } from "react";
import { useHistory } from "react-router-dom";
import { format } from "date-fns";
import { debounce } from 'lodash';

import useSound from "use-sound";

import Popover from "@material-ui/core/Popover";
import IconButton from "@material-ui/core/IconButton";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import { makeStyles } from "@material-ui/core/styles";
import Badge from "@material-ui/core/Badge";
import ChatIcon from "@material-ui/icons/Chat";

import TicketListItem from "../TicketListItemCustom";
import useTickets from "../../hooks/useTickets";
import alertSound from "../../assets/sound.mp3";
import { AuthContext } from "../../context/Auth/AuthContext";
import { SocketContext } from "../../context/Socket/SocketContext";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import useSettings from "../../hooks/useSettings";

const useStyles = makeStyles(theme => ({
    tabContainer: {
        overflowY: "auto",
        maxHeight: 350,
        ...theme.scrollbarStyles,
    },
    popoverPaper: {
        width: "100%",
        maxWidth: 350,
        marginLeft: theme.spacing(2),
        marginRight: theme.spacing(1),
        [theme.breakpoints.down("sm")]: {
            maxWidth: 270,
        },
    },
    noShadow: {
        boxShadow: "none !important",
    },
}));

const NotificationsPopOver = (volume) => {
    const classes = useStyles();

    const history = useHistory();
    const { user } = useContext(AuthContext);
    const ticketIdUrl = +history.location.pathname.split("/")[2];
    const ticketIdRef = useRef(ticketIdUrl);
    const anchorEl = useRef();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);

    const [showPendingTickets, setShowPendingTickets] = useState(false);
    const [, setDesktopNotifications] = useState([]);

    const { tickets: initialTickets } = useTickets({
        withUnreadMessages: "true",
        showAll: "true",
        pageNumber: 1
    });

    const [play] = useSound(alertSound, volume);
    const soundAlertRef = useRef();
    const historyRef = useRef(history);
    const socketManager = useContext(SocketContext);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                if (user.allTicket === "enable") {
                    setShowPendingTickets(true);
                }
            } catch (err) {
                toastError(err);
            }
        }
        fetchSettings();
    }, [user.allTicket]);

    useEffect(() => {
        soundAlertRef.current = play;

        if (!("Notification" in window)) {
            console.log("This browser doesn't support notifications");
        } else {
            Notification.requestPermission();
        }
    }, [play]);

    const shouldShowNotification = useCallback((ticket) => {
        if (!ticket || !ticket.unreadMessages || ticket.unreadMessages === 0) {
            return false;
        }

        if (ticket.isGroup) {
            return false;
        }

        const isValidStatus = ["pending", "open"].includes(ticket.status);
        if (!isValidStatus) {
            return false;
        }

        if(user?.profile === "user"){
            return ticket.userId === user?.id; 
        }

        // ✅ VERIFICAR FILA DO USUÁRIO
        const belongsToUserQueue = !ticket.queueId ||
            user?.queues?.some(queue => queue.id === ticket.queueId);
        if (!belongsToUserQueue) {
            return false;
        }

        // ✅ VERIFICAR ATRIBUIÇÃO
        if (showPendingTickets || user?.profile === "admin") {
            return true;
        }

        const isAssignedToUser = ticket.userId === user?.id || !ticket.userId;
        return isAssignedToUser;
    }, [showPendingTickets, user?.id, user?.queues, user?.profile]);

    // ✅ PROCESSAR TICKETS INICIAIS
    useEffect(() => {
        if (!initialTickets || initialTickets.length === 0) {
            setNotifications([]);
            return;
        }

        const filteredTickets = initialTickets.filter(shouldShowNotification);
        setNotifications(filteredTickets);
    }, [initialTickets, shouldShowNotification]);

    useEffect(() => {
        ticketIdRef.current = ticketIdUrl;
    }, [ticketIdUrl]);

    // ✅ DEBOUNCE PARA EVITAR MÚLTIPLAS ATUALIZAÇÕES
    const debouncedUpdateNotifications = useCallback(
        debounce((updateFunction) => {
            setNotifications(updateFunction);
        }, 100),
        []
    );

    // ✅ SOCKET - OUVIR EVENTOS E ATUALIZAR NOTIFICAÇÕES EM TEMPO REAL
    useEffect(() => {
        const companyId = user?.companyId;
        if (!companyId) return;

        const socket = socketManager.getSocket(companyId);

        const handleConnect = () => {
            socket.emit("joinNotification");
            console.log("🔔 NotificationsPopOver conectado");
        };

        // ✅ HANDLER PARA TICKETS COM DEBOUNCE
        const handleTicketUpdate = (data) => {
            console.log("🎫 Evento de ticket em NotificationsPopOver:", {
                action: data.action,
                ticketId: data.ticket?.id,
                unreadMessages: data.ticket?.unreadMessages,
                status: data.ticket?.status
            });

            if (data.action === "updateUnread" || data.action === "delete") {
                debouncedUpdateNotifications(prevState => {
                    const ticketIndex = prevState.findIndex(t => t.id === data.ticketId);
                    if (ticketIndex !== -1) {
                        const newState = [...prevState];
                        newState.splice(ticketIndex, 1);
                        console.log("🗑️ Ticket removido das notificações:", data.ticketId);
                        return newState;
                    }
                    return prevState;
                });

                setDesktopNotifications(prevState => {
                    const notificationIndex = prevState.findIndex(
                        n => n.tag === String(data.ticketId)
                    );
                    if (notificationIndex !== -1) {
                        prevState[notificationIndex].close();
                        const newState = [...prevState];
                        newState.splice(notificationIndex, 1);
                        return newState;
                    }
                    return prevState;
                });
                return;
            }

            if (data.action === "update") {
                debouncedUpdateNotifications(prevState => {
                    const ticketIndex = prevState.findIndex(t => t.id === data.ticket.id);
                    const shouldShow = shouldShowNotification(data.ticket);

                    if (ticketIndex !== -1) {
                        if (shouldShow) {
                            // ✅ ATUALIZAR TICKET EXISTENTE
                            const newState = [...prevState];
                            newState[ticketIndex] = { ...newState[ticketIndex], ...data.ticket };
                            console.log("🔄 Ticket atualizado em notificações:", data.ticket.id);
                            return newState;
                        } else {
                            // ✅ REMOVER TICKET QUE NÃO DEVE MAIS APARECER
                            console.log("🗑️ Removendo ticket das notificações:", data.ticket.id);
                            const newState = [...prevState];
                            newState.splice(ticketIndex, 1);
                            return newState;
                        }
                    } else if (shouldShow) {
                        // ✅ ADICIONAR NOVO TICKET
                        console.log("✨ Adicionando novo ticket às notificações:", data.ticket.id);
                        return [data.ticket, ...prevState];
                    }

                    return prevState;
                });
            }
        };

        // ✅ HANDLER PARA MENSAGENS COM DEBOUNCE
        const handleAppMessage = (data) => {
            console.log("💬 Mensagem em NotificationsPopOver:", {
                action: data.action,
                fromMe: data.message?.fromMe,
                ticketId: data.ticket?.id,
                unreadMessages: data.ticket?.unreadMessages
            });

            if (
                data.action === "create" && !data.message.fromMe &&
                (data.ticket.status !== "pending") &&
                (!data.message.read || data.ticket.status === "pending") &&
                (data.ticket.userId === user?.id || !data.ticket.userId) &&
                (user?.queues?.some(queue => (queue.id === data.ticket.queueId)) || !data.ticket.queueId)
            ) {
                debouncedUpdateNotifications(prevState => {
                    const ticketIndex = prevState.findIndex(t => t.id === data.ticket.id);
                    const shouldShow = shouldShowNotification(data.ticket);

                    if (shouldShow) {
                        if (ticketIndex !== -1) {
                            // ✅ ATUALIZAR E MOVER PARA O TOPO
                            const newState = [...prevState];
                            newState.splice(ticketIndex, 1);
                            newState.unshift(data.ticket);
                            console.log("📬 Ticket movido para topo das notificações:", data.ticket.id);
                            return newState;
                        } else {
                            // ✅ ADICIONAR NOVO TICKET
                            console.log("✨ Novo ticket adicionado às notificações:", data.ticket.id);
                            return [data.ticket, ...prevState];
                        }
                    } else if (ticketIndex !== -1) {
                        // ✅ REMOVER TICKET QUE NÃO DEVE MAIS APARECER
                        console.log("🗑️ Removendo ticket das notificações (não deve aparecer):", data.ticket.id);
                        const newState = [...prevState];
                        newState.splice(ticketIndex, 1);
                        return newState;
                    }

                    return prevState;
                });

                // ✅ NOTIFICAÇÃO DESKTOP E SOM APENAS PARA MENSAGENS RECEBIDAS
                const shouldNotNotificate =
                    (data.message.ticketId === ticketIdRef.current &&
                        document.visibilityState === "visible") ||
                    (data.ticket.userId && data.ticket.userId !== user?.id) ||
                    data.ticket.isGroup;

                if (!shouldNotNotificate) {
                    handleNotifications(data);
                }
            }
        };

        // ✅ EVENTOS DE SOCKET
        socket.on("connect", handleConnect);
        socket.on(`company-${companyId}-ticket`, handleTicketUpdate);
        socket.on(`company-${companyId}-appMessage`, handleAppMessage);

        if (socket.connected) {
            handleConnect();
        }

        return () => {
            // ✅ LIMPAR DEBOUNCE
            debouncedUpdateNotifications.cancel();

            socket.off("connect", handleConnect);
            socket.off(`company-${companyId}-ticket`, handleTicketUpdate);
            socket.off(`company-${companyId}-appMessage`, handleAppMessage);
        };
    }, [user, shouldShowNotification, debouncedUpdateNotifications, socketManager]);

    const handleNotifications = data => {
        const { message, contact, ticket } = data;

        const options = {
            body: `${message.body} - ${format(new Date(), "HH:mm")}`,
            icon: contact.urlPicture,
            tag: ticket.id,
            renotify: true,
        };

        const notification = new Notification(
            `${i18n.t("tickets.notification.message")} ${contact.name}`,
            options
        );

        notification.onclick = e => {
            e.preventDefault();
            window.focus();
            historyRef.current.push(`/tickets/${ticket.uuid}`);
        };

        setDesktopNotifications(prevState => {
            const notificationIndex = prevState.findIndex(
                n => n.tag === notification.tag
            );
            if (notificationIndex !== -1) {
                const newState = [...prevState];
                newState[notificationIndex] = notification;
                return newState;
            }
            return [notification, ...prevState];
        });

        soundAlertRef.current();
    };

    const handleClick = () => {
        setIsOpen(prevState => !prevState);
    };

    const handleClickAway = () => {
        setIsOpen(false);
    };

    const NotificationTicket = ({ children }) => {
        return <div onClick={handleClickAway}>{children}</div>;
    };

    console.log("🔔 NotificationsPopOver renderizando:", {
        notificationsCount: notifications.length,
        tickets: notifications.map(t => ({
            id: t.id,
            contact: t.contact?.name,
            unreadMessages: t.unreadMessages
        }))
    });

    return (
        <>
            <IconButton
                onClick={handleClick}
                ref={anchorEl}
                aria-label="Open Notifications"
                color="inherit"
                style={{ color: "white" }}
            >
                <Badge overlap="rectangular" badgeContent={notifications.length} color="secondary">
                    <ChatIcon />
                </Badge>
            </IconButton>
            <Popover
                disableScrollLock
                open={isOpen}
                anchorEl={anchorEl.current}
                anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "right",
                }}
                transformOrigin={{
                    vertical: "top",
                    horizontal: "right",
                }}
                classes={{ paper: classes.popoverPaper }}
                onClose={handleClickAway}
            >
                <List dense className={classes.tabContainer}>
                    {notifications.length === 0 ? (
                        <ListItem>
                            <ListItemText>{i18n.t("notifications.noTickets")}</ListItemText>
                        </ListItem>
                    ) : (
                        notifications.map(ticket => (
                            <NotificationTicket key={ticket.id}>
                                <TicketListItem ticket={ticket} />
                            </NotificationTicket>
                        ))
                    )}
                </List>
            </Popover>
        </>
    );
};

export default NotificationsPopOver;