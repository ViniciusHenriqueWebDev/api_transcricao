import React, { useContext, useEffect, useRef, useState } from "react";

import { useParams, useHistory } from "react-router-dom";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  makeStyles,
  Paper,
  Tab,
  Tabs,
  TextField,
} from "@material-ui/core";
import ChatList from "./ChatList";
import ChatMessages from "./ChatMessages";
import { UsersFilter } from "../../components/UsersFilter";
import api from "../../services/api";
import { SocketContext } from "../../context/Socket/SocketContext";

import { has, isObject } from "lodash";

import { AuthContext } from "../../context/Auth/AuthContext";
import withWidth, { isWidthUp } from "@material-ui/core/withWidth";

const useStyles = makeStyles((theme) => ({
  mainContainer: {
    display: "flex",
    flexDirection: "column",
    position: "relative",
    flex: 1,
    padding: theme.spacing(2),
    height: `calc(100% - 48px)`,
    overflowY: "hidden",
    border: "1px solid rgba(0, 0, 0, 0.12)",
  },
  gridContainer: {
    flex: 1,
    height: "100%",
    border: "1px solid rgba(0, 0, 0, 0.12)",
    backgroundColor: theme.palette.dark,
  },
  gridItem: {
    height: "100%",
  },
  gridItemTab: {
    height: "92%",
    width: "100%",
  },
  btnContainer: {
    textAlign: "right",
    padding: 10,
  },
}));

export function ChatModal({
  open,
  chat,
  type,
  handleClose,
  handleLoadNewChat,
}) {
  const [users, setUsers] = useState([]);
  const [title, setTitle] = useState("");

  useEffect(() => {
    setTitle("");
    setUsers([]);
    if (type === "edit") {
      const userList = chat.users.map((u) => ({
        id: u.user.id,
        name: u.user.name,
      }));
      setUsers(userList);
      setTitle(chat.title);
    }
  }, [chat, open, type]);

  const handleSave = async () => {
    try {
      if (!title) {
        alert("Por favor, preencha o título da conversa.");
        return;
      }

      if (!users || users.length === 0) {
        alert("Por favor, selecione pelo menos um usuário.");
        return;
      }

      if (type === "edit") {
        await api.put(`/chats/${chat.id}`, {
          users,
          title,
        });
      } else {
        const { data } = await api.post("/chats", {
          users,
          title,
        });
        handleLoadNewChat(data);
      }
      handleClose();
    } catch (err) { }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">Conversa</DialogTitle>
      <DialogContent>
        <Grid spacing={2} container>
          <Grid xs={12} style={{ padding: 18 }} item>
            <TextField
              label="Título"
              placeholder="Título"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              variant="outlined"
              size="small"
              fullWidth
            />
          </Grid>
          <Grid xs={12} item>
            <UsersFilter
              onFiltered={(users) => setUsers(users)}
              initialUsers={users}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="primary">
          Fechar
        </Button>
        <Button onClick={handleSave} color="primary" variant="contained">
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function Chat(props) {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const history = useHistory();

  const [showDialog, setShowDialog] = useState(false);
  const [dialogType, setDialogType] = useState("new");
  const [currentChat, setCurrentChat] = useState({});
  const [chats, setChats] = useState([]);
  const [chatsPageInfo, setChatsPageInfo] = useState({ hasMore: false });
  const [messages, setMessages] = useState([]);
  const [messagesPageInfo, setMessagesPageInfo] = useState({ hasMore: false });
  const [messagesPage, setMessagesPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(0);
  const isMounted = useRef(true);
  const scrollToBottomRef = useRef();
  const { id } = useParams();

  const socketManager = useContext(SocketContext);

  // Refs to hold latest value for handlers (avoid stale closures)
  const chatsRef = useRef(chats);
  const currentChatRef = useRef(currentChat);

  useEffect(() => {
    chatsRef.current = chats;
  }, [chats]);

  useEffect(() => {
    currentChatRef.current = currentChat;
  }, [currentChat]);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (isMounted.current) {
      findChats().then((data) => {
        const { records } = data;
        if (records.length > 0) {
          setChats(records);
          setChatsPageInfo(data);

          if (id && records.length) {
            const chat = records.find((r) => r.uuid === id);
            selectChat(chat);
          }
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isObject(currentChat) && has(currentChat, "id")) {
      findMessages(currentChat.id).then(() => {
        if (typeof scrollToBottomRef.current === "function") {
          setTimeout(() => {
            scrollToBottomRef.current();
          }, 300);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChat]);

  // MAIN socket effect: registra listeners e cuida de re-joins / visibility
  useEffect(() => {
    const companyId = localStorage.getItem("companyId");
    const socket = socketManager.getSocket(companyId);

    // Handler: novas conversas / updates específicas do usuário
    const handleCompanyUser = (data) => {
      if (!data) return;
      if (data.action === "create") {
        setChats((prev) => [data.record, ...prev]);
      }
      if (data.action === "update") {
        setChats((prev) =>
          prev.map((chat) => {
            if (chat.id === data.record.id) {
              // se o chat atualizado for o current, atualiza também
              if (currentChatRef.current && currentChatRef.current.id === data.record.id) {
                setCurrentChat(data.record);
              }
              return { ...data.record };
            }
            return chat;
          })
        );
      }
    };

    // Handler: deleção de chats em empresa
    const handleCompany = (data) => {
      if (!data) return;
      if (data.action === "delete") {
        setChats((prev) => prev.filter((c) => c.id !== +data.id));
        setMessages([]);
        setMessagesPage(1);
        setMessagesPageInfo({ hasMore: false });
        setCurrentChat({});
        history.push("/chats");
      }
    };

    // Handler específico do chat aberto (new-message / update)
    const handleCurrentChatEvent = (data) => {
      if (!data) return;
      // Se for nova mensagem, append e atualiza lista de chats
      if (data.action === "new-message") {
        setMessages((prev) => [...prev, data.newMessage]);
        setChats((prev) =>
          prev.map((chat) => {
            if (chat.id === data.newMessage.chatId) {
              return { ...data.chat };
            }
            return chat;
          })
        );
        if (scrollToBottomRef.current) {
          try {
            scrollToBottomRef.current();
          } catch (_) {}
        }
      }

      if (data.action === "update") {
        setChats((prev) =>
          prev.map((chat) => {
            if (chat.id === data.chat.id) {
              return { ...data.chat };
            }
            return chat;
          })
        );
        if (scrollToBottomRef.current) {
          try {
            scrollToBottomRef.current();
          } catch (_) {}
        }
      }
    };

    // Registra listeners (usar nomes exatos)
    try {
      socket.on(`company-${companyId}-chat-user-${user.id}`, handleCompanyUser);
      socket.on(`company-${companyId}-chat`, handleCompany);
      // Se já tivermos um chat selecionado, registra listener específico e faz join
      if (isObject(currentChatRef.current) && has(currentChatRef.current, "id")) {
        socket.on(`company-${companyId}-chat-${currentChatRef.current.id}`, handleCurrentChatEvent);
        // Emit join para sala do chat. Tentamos alguns nomes comuns para compatibilidade.
        try {
          socket.emit("joinChat", currentChatRef.current.id);
        } catch (e) {}
        try {
          socket.emit("joinChatBox", currentChatRef.current.id);
        } catch (e) {}
        try {
          socket.emit("join", currentChatRef.current.id);
        } catch (e) {}
      }
    } catch (err) {
      console.error("Erro ao registrar listeners do socket:", err);
    }

    // Quando a aba voltar da invisibilidade, re-join na sala atual (se houver)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        if (isObject(currentChatRef.current) && has(currentChatRef.current, "id")) {
          try {
            socket.emit("joinChat", currentChatRef.current.id);
          } catch (_) {}
          try {
            socket.emit("joinChatBox", currentChatRef.current.id);
          } catch (_) {}
          try {
            socket.emit("join", currentChatRef.current.id);
          } catch (_) {}
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Cleanup: remover listeners específicos e listener de visibility
    return () => {
      try {
        socket.off(`company-${companyId}-chat-user-${user.id}`, handleCompanyUser);
        socket.off(`company-${companyId}-chat`, handleCompany);
        if (isObject(currentChatRef.current) && has(currentChatRef.current, "id")) {
          socket.off(`company-${companyId}-chat-${currentChatRef.current.id}`, handleCurrentChatEvent);
          // tentar leave (não crítico)
          try {
            socket.emit("leaveChat", currentChatRef.current.id);
          } catch (_) {}
          try {
            socket.emit("leaveChatBox", currentChatRef.current.id);
          } catch (_) {}
          try {
            socket.emit("leave", currentChatRef.current.id);
          } catch (_) {}
        }
      } catch (err) {
        // não bloquear se exception ao off
        console.warn("Erro no cleanup dos listeners do socket:", err);
      }
      document.removeEventListener("visibilitychange", handleVisibility);
      // NÃO desconectar o socket global aqui (deixe o socketManager controlar lifecycle)
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentChat, socketManager]); // re-executa quando currentChat muda para registrar listener do chat correto

  const selectChat = (chat) => {
    try {
      setMessages([]);
      setMessagesPage(1);
      setCurrentChat(chat);
      localStorage.setItem("currentChat", JSON.stringify(chat));
      setTab(1);

      // Ao selecionar chat, emitir join imediatamente para garantir que o servidor
      // passe a enviar mensagens desta sala mesmo após reconexões/idle.
      const companyId = localStorage.getItem("companyId");
      try {
        const socket = socketManager.getSocket(companyId);
        if (chat && chat.id) {
          try {
            socket.emit("joinChat", chat.id);
          } catch (e) {}
          try {
            socket.emit("joinChatBox", chat.id);
          } catch (e) {}
          try {
            socket.emit("join", chat.id);
          } catch (e) {}
        }
      } catch (err) {
        // não bloquear se falhar
        console.warn("Erro emitindo join no selectChat:", err);
      }
    } catch (err) { }
  };

  const sendMessage = async (contentMessage) => {
    setLoading(true);
    try {
      await api.post(`/chats/${currentChat.id}/messages`, {
        message: contentMessage,
      });
    } catch (err) { }
    setLoading(false);
  };

  const deleteChat = async (chat) => {
    try {
      await api.delete(`/chats/${chat.id}`);
    } catch (err) { }
  };

  const findMessages = async (chatId) => {
    setLoading(true);
    try {
      const { data } = await api.get(
        `/chats/${chatId}/messages?pageNumber=${messagesPage}`
      );
      setMessagesPage((prev) => prev + 1);
      setMessagesPageInfo(data);
      setMessages((prev) => [...data.records, ...prev]);
    } catch (err) { }
    setLoading(false);
  };

  const loadMoreMessages = async () => {
    if (!loading) {
      findMessages(currentChat.id);
    }
  };

  const findChats = async () => {
    try {
      const { data } = await api.get("/chats");
      return data;
    } catch (err) {
      console.log(err);
    }
  };

  const renderGrid = () => {
    return (
      <Grid className={classes.gridContainer} container>
        <Grid className={classes.gridItem} md={3} item>

          <div className={classes.btnContainer}>
            <Button
              onClick={() => {
                setDialogType("new");
                setShowDialog(true);
              }}
              color="primary"
              variant="contained"
            >
              Nova
            </Button>
          </div>

          <ChatList
            chats={chats}
            pageInfo={chatsPageInfo}
            loading={loading}
            setLoading={setLoading}
            handleSelectChat={(chat) => selectChat(chat)}
            handleDeleteChat={(chat) => deleteChat(chat)}
            handleEditChat={() => {
              setDialogType("edit");
              setShowDialog(true);
            }}
          />
        </Grid>
        <Grid className={classes.gridItem} md={9} item>
          {isObject(currentChat) && has(currentChat, "id") && (
            <ChatMessages
              chat={currentChat}
              scrollToBottomRef={scrollToBottomRef}
              pageInfo={messagesPageInfo}
              messages={messages}
              loading={loading}
              handleSendMessage={sendMessage}
              handleLoadMore={loadMoreMessages}
            />
          )}
        </Grid>
      </Grid>
    );
  };

  const renderTab = () => {
    return (
      <Grid className={classes.gridContainer} container>
        <Grid md={12} item>
          <Tabs
            value={tab}
            indicatorColor="primary"
            textColor="primary"
            onChange={(e, v) => setTab(v)}
            aria-label="disabled tabs example"
          >
            <Tab label="Chats" />
            <Tab label="Mensagens" />
          </Tabs>
        </Grid>
        {tab === 0 && (
          <Grid className={classes.gridItemTab} md={12} item>
            <div className={classes.btnContainer}>
              <Button
                onClick={() => setShowDialog(true)}
                color="primary"
                variant="contained"
              >
                Novo
              </Button>
            </div>
            <ChatList
              chats={chats}
              pageInfo={chatsPageInfo}
              loading={loading}
              handleSelectChat={(chat) => selectChat(chat)}
              handleDeleteChat={(chat) => deleteChat(chat)}
            />
          </Grid>
        )}
        {tab === 1 && (
          <Grid className={classes.gridItemTab} md={12} item>
            {isObject(currentChat) && has(currentChat, "id") && (
              <ChatMessages
                scrollToBottomRef={scrollToBottomRef}
                pageInfo={messagesPageInfo}
                messages={messages}
                loading={loading}
                handleSendMessage={sendMessage}
                handleLoadMore={loadMoreMessages}
              />
            )}
          </Grid>
        )}
      </Grid>
    );
  };

  return (
    <>
      <ChatModal
        type={dialogType}
        open={showDialog}
        chat={currentChat}
        handleLoadNewChat={(data) => {
          setMessages([]);
          setMessagesPage(1);
          setCurrentChat(data);
          setTab(1);
          history.push(`/chats/${data.uuid}`);
        }}
        handleClose={() => setShowDialog(false)}
      />
      <Paper className={classes.mainContainer}>
        {isWidthUp("md", props.width) ? renderGrid() : renderTab()}
      </Paper>
    </>
  );
}

export default withWidth()(Chat);
