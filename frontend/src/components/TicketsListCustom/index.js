import React, { useState, useEffect, useReducer, useContext, useRef, useCallback, useMemo } from "react";

import { makeStyles } from "@material-ui/core/styles";
import List from "@material-ui/core/List";
import Paper from "@material-ui/core/Paper";
import CircularProgress from "@material-ui/core/CircularProgress";

import TicketListItem from "../TicketListItemCustom";
import TicketsListSkeleton from "../TicketsListSkeleton";

import useTickets from "../../hooks/useTickets";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import { SocketContext } from "../../context/Socket/SocketContext";
import useSettings from '../../hooks/useSettings';

const useStyles = makeStyles((theme) => ({
  ticketsListWrapper: {
    position: "relative",
    display: "flex",
    height: "100%",
    flexDirection: "column",
    overflow: "hidden",
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },

  ticketsList: {
    flex: 1,
    maxHeight: "100%",
    overflowY: "scroll",
    ...theme.scrollbarStyles,
    borderTop: "2px solid rgba(0, 0, 0, 0.12)",
  },

  noTicketsText: {
    textAlign: "center",
    color: "rgb(104, 121, 146)",
    fontSize: "14px",
    lineHeight: "1.4",
  },

  noTicketsTitle: {
    textAlign: "center",
    fontSize: "16px",
    fontWeight: "600",
    margin: "0px",
  },

  noTicketsDiv: {
    display: "flex",
    height: "100px",
    margin: 40,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
}));

const reducer = (state, action) => {
  if (action.type === "LOAD_TICKETS") {
    const newTickets = action.payload;

    if (action.isNewSearch || action.pageNumber === 1) {
      return [...newTickets];
    }

    // Para paginação, criar um Map para evitar duplicatas de forma eficiente
    const stateMap = new Map(state.map(ticket => [ticket.id, ticket]));
    newTickets.forEach(ticket => {
      if (!stateMap.has(ticket.id)) {
        stateMap.set(ticket.id, ticket);
      }
    });

    return Array.from(stateMap.values());
  }

  if (action.type === "RESET_UNREAD") {
    const ticketId = action.payload;
    return state.map(ticket =>
      ticket.id === ticketId
        ? { ...ticket, unreadMessages: 0 }
        : ticket
    );
  }

  if (action.type === "UPDATE_TICKET") {
    const ticket = action.payload;
    const ticketIndex = state.findIndex((t) => t.id === ticket.id);

    // Se o ticket mudou de status e não pertence mais à aba, remova
    if (ticket.status !== action.currentStatus) {
      return state.filter(t => t.id !== ticket.id);
    }

    if (ticketIndex !== -1) {
      const oldTicket = state[ticketIndex];
      const newTags = ticket.tags && ticket.tags.length > 0 ? ticket.tags : oldTicket.tags;
      const newState = [...state];
      newState[ticketIndex] = { ...ticket, tags: newTags };
      return newState;
    } else {
      return [ticket, ...state];
    }
  }

  if (action.type === "UPDATE_TICKET_UNREAD_MESSAGES") {
    const ticket = action.payload;
    const ticketIndex = state.findIndex((t) => t.id === ticket.id);

    if (ticketIndex !== -1) {
      // Remove o ticket antigo e coloca o atualizado no topo
      state.splice(ticketIndex, 1);
    }
    return [ticket, ...state];
  }

  if (action.type === "UPDATE_TICKET_CONTACT") {
    const contact = action.payload;
    return state.map(ticket =>
      ticket.contactId === contact.id
        ? { ...ticket, contact }
        : ticket
    );
  }

  if (action.type === "UPDATE_TICKET_PRESENCE") {
    const data = action.payload;
    return state.map(ticket =>
      ticket.id === data.ticketId
        ? { ...ticket, presence: data.presence }
        : ticket
    );
  }

  if (action.type === "DELETE_TICKET") {
    const ticketId = action.payload;
    return state.filter(ticket => ticket.id !== ticketId);
  }

  if (action.type === "RESET") {
    return [];
  }

  return state;
};

const TicketsListCustom = (props) => {
  const {
    status,
    searchParam,
    tags,
    users,
    showAll,
    selectedQueueIds,
    updateCount,
    style,
    onRedirectToTab,
    isSearching,
    onSearchComplete,
    tab
  } = props;

  const classes = useStyles();
  const [pageNumber, setPageNumber] = useState(1);
  const [ticketsList, dispatch] = useReducer(reducer, []);
  const [visibleTicket, setVisibleTicket] = useState(false);
  const [refreshFlag, setRefreshFlag] = useState(0);

  const { user } = useContext(AuthContext);
  const { profile, queues } = user;
  const { getAll } = useSettings();
  const socketManager = useContext(SocketContext);

  const queueIds = useMemo(() => queues.map((q) => q.id), [queues]);

  const hasActiveFilters = useMemo(() => {
    return (searchParam && searchParam.trim().length > 0) ||
      (Array.isArray(tags) && tags.length > 0) ||
      (Array.isArray(users) && users.length > 0);
  }, [searchParam, tags, users]);

  const serializedTags = useMemo(() =>
    Array.isArray(tags) && tags.length > 0
      ? JSON.stringify(tags.map(tag => typeof tag === "object" ? tag.id : tag))
      : "[]"
    , [tags]);

  const serializedUsers = useMemo(() => {
    if (profile === "user" && status !== "pending") {
      return JSON.stringify([user.id]);
    }
    return Array.isArray(users) && users.length > 0 ? JSON.stringify(users) : "[]";
  }, [users, profile, user.id, status]);

  const serializedQueueIds = useMemo(() =>
    Array.isArray(selectedQueueIds) && selectedQueueIds.length > 0
      ? JSON.stringify(selectedQueueIds)
      : "[]"
    , [selectedQueueIds]);

  // Carregar configurações do usuário
  useEffect(() => {
    let isMounted = true;

    getAll()
      .then((response) => {
        if (!isMounted) return;

        const userVisibleTicket = response.some((setting) => {
          return (setting?.key === "userViewTicketsWithoutQueue" &&
            setting?.value === "enabled")
        });
        setVisibleTicket(userVisibleTicket);
      })
      .catch(err => {
        if (isMounted) {
          console.error("Erro ao carregar configurações:", err);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [getAll]);

  const { tickets, hasMore, loading: fetchLoading } = useTickets({
    pageNumber,
    searchParam,
    status,
    showAll,
    tags: serializedTags,
    users: serializedUsers,
    queueIds: serializedQueueIds,
    onSearchComplete,
    refreshFlag
  });

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [status, searchParam, showAll, selectedQueueIds, serializedTags, serializedUsers]);

  useEffect(() => {
    if (!tickets) return;

    let ticketsToProcess = tickets;
    if (tab !== "group" && status !== "group") {
      ticketsToProcess = tickets.filter(t => {
        const isGroup = t.isGroup === true || t.isGroup === "true";
        return !isGroup;
      });
    }

    let filteredTickets = ticketsToProcess;
    if (profile === "user") {
      filteredTickets = ticketsToProcess.filter(
        (t) => {
          return (
            queueIds.indexOf(t.queueId) > -1 ||
            t.userId === user.id
          );
        }
      );
    }

    dispatch({
      type: "LOAD_TICKETS",
      payload: profile === "user" ? filteredTickets : ticketsToProcess,
      isNewSearch: hasActiveFilters || pageNumber === 1,
      pageNumber: pageNumber
    });

    if (onSearchComplete) {
      onSearchComplete();
    }
  }, [tickets, hasActiveFilters, pageNumber, onSearchComplete, tab, status, profile, queueIds, user.id, visibleTicket]);
  const presenceTimeouts = useRef({});

  useEffect(() => {
    const companyId = localStorage.getItem("companyId");
    if (!companyId || !socketManager) return;

    const socket = socketManager.getSocket(companyId);
    if (!socket) return;

    const shouldUpdateTicket = (ticket) =>
      (!ticket.userId || ticket.userId === user?.id || showAll) &&
      (!ticket.queueId || selectedQueueIds.includes(ticket.queueId));

    const notBelongsToUserQueues = (ticket) =>
      ticket.queueId && !selectedQueueIds.includes(ticket.queueId);

    const handleConnect = () => {
      if (status) {
        socket.emit("joinTickets", status);
      } else {
        socket.emit("joinNotification");
      }
    };

    const handleTicketUpdate = (data) => {
      if (data.action === "updateUnread") {
        dispatch({
          type: "RESET_UNREAD",
          payload: data.ticketId,
        });
      }

      if (data.action === "update" && shouldUpdateTicket(data.ticket) && data.ticket.status === status) {
        dispatch({
          type: "UPDATE_TICKET",
          payload: data.ticket,
          currentStatus: status
        });
      }

      if (data.action === "update" && notBelongsToUserQueues(data.ticket)) {
        dispatch({ type: "DELETE_TICKET", payload: data.ticket.id });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_TICKET", payload: data.ticketId });
      }
    };

    const handleAppMessage = (data) => {
      if (
        profile === "user" &&
        (queues.every(q => q.id !== data.ticket.queue?.id) ||
          data.ticket.queue === null)
      ) {
        return;
      }

      if (data.action === "create" && shouldUpdateTicket(data.ticket) &&
        (status === undefined || data.ticket.status === status)) {
        dispatch({
          type: "UPDATE_TICKET_UNREAD_MESSAGES",
          payload: data.ticket,
        });
      }
    };

    const handleContactUpdate = (data) => {
      if (data.action === "update") {
        dispatch({
          type: "UPDATE_TICKET_CONTACT",
          payload: data.contact,
        });
      }
    };

    const handlePresenceUpdate = (data) => {
      dispatch({
        type: "UPDATE_TICKET_PRESENCE",
        payload: data,
      });

      if (data.presence && data.ticketId) {
        clearTimeout(presenceTimeouts.current[data.ticketId]);
        presenceTimeouts.current[data.ticketId] = setTimeout(() => {
          dispatch({
            type: "UPDATE_TICKET_PRESENCE",
            payload: { ticketId: data.ticketId, presence: null },
          });
        }, 10000);
      }
    };

    socket.on("connect", handleConnect);
    socket.on(`company-${companyId}-ticket`, handleTicketUpdate);
    socket.on(`company-${companyId}-appMessage`, handleAppMessage);
    socket.on(`company-${companyId}-contact`, handleContactUpdate);
    socket.on(`company-${companyId}-presence`, handlePresenceUpdate);

    return () => {
      socket.off("connect", handleConnect);
      socket.off(`company-${companyId}-ticket`, handleTicketUpdate);
      socket.off(`company-${companyId}-appMessage`, handleAppMessage);
      socket.off(`company-${companyId}-contact`, handleContactUpdate);
      socket.off(`company-${companyId}-presence`, handlePresenceUpdate);
    };
  }, [status, showAll, user, selectedQueueIds, profile, queues, socketManager]);

  // Atualizar contagem de tickets
  useEffect(() => {
    const count = ticketsList.filter(ticket =>
      ticket && (ticket.isGroup === undefined || ticket.isGroup === false || ticket.isGroup === "false")
    ).length;

    if (typeof updateCount === "function") {
      updateCount(count);
    }
  }, [ticketsList, updateCount]);

  const loadMore = useCallback(() => {
    if (fetchLoading || !hasMore) return;
    setPageNumber(prev => prev + 1);
  }, [fetchLoading, hasMore]);

  const handleScroll = useCallback((e) => {
    if (!hasMore || fetchLoading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 300) {
      loadMore();
    }
  }, [hasMore, fetchLoading, loadMore]);

  // Função para validar tickets
  const isTicketValid = useCallback((ticket) => {
    return ticket && (ticket.isGroup === undefined || ticket.isGroup === false || ticket.isGroup === "false");
  }, []);

  // Filtrar tickets válidos de forma memoizada
  const validTickets = useMemo(() =>
    ticketsList.filter(isTicketValid)
    , [ticketsList, isTicketValid]);

  return (
    <Paper className={classes.ticketsListWrapper} style={style}>
      {(isSearching || fetchLoading) && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255,255,255,0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10
        }}>
          <CircularProgress />
        </div>
      )}
      <Paper
        square
        name="closed"
        elevation={0}
        className={classes.ticketsList}
        onScroll={handleScroll}
      >
        <List style={{ paddingTop: 0 }}>
          {validTickets.length === 0 && !fetchLoading ? (
            <div className={classes.noTicketsDiv}>
              <span className={classes.noTicketsTitle}>
                {i18n.t("ticketsList.noTicketsTitle")}
              </span>
              <p className={classes.noTicketsText}>
                {profile === "user" && searchParam ?
                  "Nenhum ticket encontrado associado a você." :
                  i18n.t("ticketsList.noTicketsMessage")
                }
              </p>
            </div>
          ) : (
            <>
              {validTickets.map((ticket) => (
                <TicketListItem
                  ticket={ticket}
                  key={ticket.id}
                  onRedirectToTab={onRedirectToTab}
                  updateTicketList={() => setRefreshFlag(flag => flag + 1)}
                  removeTicketFromList={id => dispatch({ type: "DELETE_TICKET", payload: id })}
                />
              ))}
            </>
          )}
          {fetchLoading && <TicketsListSkeleton />}
        </List>
      </Paper>
    </Paper>
  );
};

export default TicketsListCustom;