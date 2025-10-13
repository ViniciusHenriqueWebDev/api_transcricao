import React, { useContext, useEffect, useReducer, useState } from "react";
import { Link as RouterLink, useHistory } from "react-router-dom";

import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import ListSubheader from "@material-ui/core/ListSubheader";
import Divider from "@material-ui/core/Divider";
import { Badge, Collapse, List, Typography } from "@material-ui/core";
import DashboardOutlinedIcon from "@material-ui/icons/DashboardOutlined";
import WhatsAppIcon from "@material-ui/icons/WhatsApp";
import SyncAltIcon from "@material-ui/icons/SyncAlt";
import SettingsOutlinedIcon from "@material-ui/icons/SettingsOutlined";
import PeopleAltOutlinedIcon from "@material-ui/icons/PeopleAltOutlined";
import ContactPhoneOutlinedIcon from "@material-ui/icons/ContactPhoneOutlined";
import AccountTreeOutlinedIcon from "@material-ui/icons/AccountTreeOutlined";
import FlashOnIcon from "@material-ui/icons/FlashOn";
import HelpOutlineIcon from "@material-ui/icons/HelpOutline";
import CodeRoundedIcon from "@material-ui/icons/CodeRounded";
import EventIcon from "@material-ui/icons/Event";
import LocalOfferIcon from "@material-ui/icons/LocalOffer";
import EventAvailableIcon from "@material-ui/icons/EventAvailable";
import ExpandLessIcon from "@material-ui/icons/ExpandLess";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import PeopleIcon from "@material-ui/icons/People";
import ListIcon from "@material-ui/icons/ListAlt";
import AnnouncementIcon from "@material-ui/icons/Announcement";
import ForumIcon from "@material-ui/icons/Forum";
import LocalAtmIcon from '@material-ui/icons/LocalAtm';
import RotateRight from "@material-ui/icons/RotateRight";
import { i18n } from "../translate/i18n";
import { WhatsAppsContext } from "../context/WhatsApp/WhatsAppsContext";
import { AuthContext } from "../context/Auth/AuthContext";
import LoyaltyRoundedIcon from '@material-ui/icons/LoyaltyRounded';
import { Can } from "../components/Can";
import { SocketContext } from "../context/Socket/SocketContext";
import { isArray } from "lodash";
import api from "../services/api";
import BorderColorIcon from '@material-ui/icons/BorderColor';
import ToDoList from "../pages/ToDoList/";
import toastError from "../errors/toastError";
import { makeStyles } from "@material-ui/core/styles";
import { AllInclusive, AttachFile, BlurCircular, Description, DeviceHubOutlined, Schedule } from '@material-ui/icons';
import usePlans from "../hooks/usePlans";
import useFeatures from '../hooks/useFeatures';
import EmojiEventsIcon from "@material-ui/icons/EmojiEvents";
import BarChartIcon from "@material-ui/icons/BarChart";
import AssessmentIcon from "@material-ui/icons/Assessment";


const useStyles = makeStyles((theme) => ({
  ListSubheader: {
    height: 26,
    marginTop: "-15px",
    marginBottom: "-10px",
  },
  colorIcons: {
    color: theme.palette.drawerIcons,
  },

  colorText: {
    color: theme.palette.drawerText,
  }

}));


function ListItemLink(props) {
  const { icon, primary, to, className } = props;

  const classes = useStyles();

  const renderLink = React.useMemo(
    () =>
      React.forwardRef((itemProps, ref) => (
        <RouterLink to={to} ref={ref} {...itemProps} />
      )),
    [to]
  );

  return (
    <li>
      <ListItem button dense component={renderLink} className={classes.colorText}>
        {icon ? <ListItemIcon className={classes.colorIcons}>{icon}</ListItemIcon> : null}
        <ListItemText primary={primary} />
      </ListItem>
    </li>
  );
}

const reducer = (state, action) => {
  if (action.type === "LOAD_CHATS") {
    const chats = action.payload;
    const newChats = [];

    if (isArray(chats)) {
      chats.forEach((chat) => {
        const chatIndex = state.findIndex((u) => u.id === chat.id);
        if (chatIndex !== -1) {
          state[chatIndex] = chat;
        } else {
          newChats.push(chat);
        }
      });
    }

    return [...state, ...newChats];
  }

  if (action.type === "UPDATE_CHATS") {
    const chat = action.payload;
    const chatIndex = state.findIndex((u) => u.id === chat.id);

    if (chatIndex !== -1) {
      state[chatIndex] = chat;
      return [...state];
    } else {
      return [chat, ...state];
    }
  }

  if (action.type === "DELETE_CHAT") {
    const chatId = action.payload;

    const chatIndex = state.findIndex((u) => u.id === chatId);
    if (chatIndex !== -1) {
      state.splice(chatIndex, 1);
    }
    return [...state];
  }

  if (action.type === "RESET") {
    return [];
  }

  if (action.type === "CHANGE_CHAT") {
    const changedChats = state.map((chat) => {
      if (chat.id === action.payload.chat.id) {
        return action.payload.chat;
      }
      return chat;
    });
    return changedChats;
  }
};

// Componente para o menu Analytics Dashboard
const AnalyticsDashboardMenu = () => {
  const { user } = useContext(AuthContext);
  const { isEnabled } = useFeatures();

  if (!user) return null;

  // Verificação explícita apenas para analytics_dashboard
  const hasAccess = user.super === true || isEnabled('analytics_dashboard') === true || user.profile === "supervisor";
  console.log("Analytics Dashboard Menu:", {
    hasAccess,
    isSuper: user.super,
    featureEnabled: isEnabled('analytics_dashboard')
  });

  if (!hasAccess) return null;

  return (
    <ListItemLink
      small
      to="/dashboard-atendimento"
      primary="Métricas de Atendimento"
      icon={<AssessmentIcon style={{ color: "#2b7ed5" }} />}
    />
  );
};

// Componente para o menu de Gestão de Metas
const GoalsManagementMenu = () => {
  const { user } = useContext(AuthContext);
  const { isEnabled } = useFeatures();

  if (!user) return null;

  // Verificação explícita apenas para goals-management
  const hasAccess = user.super === true || isEnabled('goals-management') === true || user.profile === "supervisor";
  console.log("Goals Management Menu:", {
    hasAccess,
    isSuper: user.super,
    featureEnabled: isEnabled('goals-management')
  });

  if (!hasAccess) return null;

  return (
    <ListItemLink
      to="/gestao-desempenho"
      primary="Gestão de Metas"
      icon={<EmojiEventsIcon style={{ color: "#2b7ed5" }} />}
    />
  );
};

const MainListItems = (props) => {
  const classes = useStyles();
  const { drawerClose, collapsed } = props;
  const { whatsApps } = useContext(WhatsAppsContext);
  const { user, handleLogout } = useContext(AuthContext);
  const [connectionWarning, setConnectionWarning] = useState(false);
  const [openCampaignSubmenu, setOpenCampaignSubmenu] = useState(false);
  const [showCampaigns, setShowCampaigns] = useState(false);
  const [showKanban, setShowKanban] = useState(false);
  const [showOpenAi, setShowOpenAi] = useState(false);
  const [showIntegrations, setShowIntegrations] = useState(false); const history = useHistory();
  const [showSchedules, setShowSchedules] = useState(false);
  const [showInternalChat, setShowInternalChat] = useState(false);
  const [showExternalApi, setShowExternalApi] = useState(false);

  const actualTheme = localStorage.getItem("preferredTheme");

  const [invisible, setInvisible] = useState(true);
  const [pageNumber, setPageNumber] = useState(1);
  const [searchParam] = useState("");
  const [chats, dispatch] = useReducer(reducer, []);
  const { getPlanCompany } = usePlans();

  const socketManager = useContext(SocketContext);
  const { isEnabled } = useFeatures();

  useEffect(() => {
    dispatch({ type: "RESET" });
    setPageNumber(1);
  }, [searchParam]);

  useEffect(() => {
    async function fetchData() {
      const companyId = user.companyId;
      const planConfigs = await getPlanCompany(undefined, companyId);

      setShowCampaigns(planConfigs.plan.useCampaigns);
      setShowKanban(planConfigs.plan.useKanban);
      setShowOpenAi(planConfigs.plan.useOpenAi);
      setShowIntegrations(planConfigs.plan.useIntegrations);
      setShowSchedules(planConfigs.plan.useSchedules);
      setShowInternalChat(planConfigs.plan.useInternalChat);
      setShowExternalApi(planConfigs.plan.useExternalApi);
    }
    fetchData();
  }, []);


  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchChats();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchParam, pageNumber]);

  useEffect(() => {
    const companyId = localStorage.getItem("companyId");
    const socket = socketManager.getSocket(companyId);

    socket.on(`company-${companyId}-chat`, (data) => {
      if (data.action === "new-message") {
        dispatch({ type: "CHANGE_CHAT", payload: data });
      }
      if (data.action === "update") {
        dispatch({ type: "CHANGE_CHAT", payload: data });
      }
    });
    return () => {
      socket.disconnect();
    };
  }, [socketManager]);

  useEffect(() => {
    let unreadsCount = 0;
    if (chats.length > 0) {
      for (let chat of chats) {
        for (let chatUser of chat.users) {
          if (chatUser.userId === user.id) {
            unreadsCount += chatUser.unreads;
          }
        }
      }
    }
    if (unreadsCount > 0) {
      setInvisible(false);
    } else {
      setInvisible(true);
    }
  }, [chats, user.id]);

  useEffect(() => {
    if (localStorage.getItem("cshow")) {
      setShowCampaigns(true);
    }
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (whatsApps.length > 0) {
        const offlineWhats = whatsApps.filter((whats) => {
          return (
            whats.status === "qrcode" ||
            whats.status === "PAIRING" ||
            whats.status === "DISCONNECTED" ||
            whats.status === "TIMEOUT" ||
            whats.status === "OPENING"
          );
        });
        if (offlineWhats.length > 0) {
          setConnectionWarning(true);
        } else {
          setConnectionWarning(false);
        }
      }
    }, 2000);
    return () => clearTimeout(delayDebounceFn);
  }, [whatsApps]);

  const fetchChats = async () => {
    try {
      const { data } = await api.get("/chats/", {
        params: { searchParam, pageNumber },
      });
      dispatch({ type: "LOAD_CHATS", payload: data.records });
    } catch (err) {
      toastError(err);
    }
  };

  const handleClickLogout = () => {
    //handleCloseMenu();
    handleLogout();
  };



  return (
    <div onClick={drawerClose}>
      <Can
        role={user.profile}
        perform={"drawer-service-items:view"}
        style={{
          overflowY: "scroll",
        }}
        no={() => (
          <>
            <ListSubheader
              hidden={collapsed}
              style={{
                position: "relative",
                fontSize: "17px",
                textAlign: "left",
                paddingLeft: 20
              }}
              inset
              color="inherit">
              <Typography variant="overline" style={{ fontWeight: 'normal' }}>  {i18n.t("Atendimento")} </Typography>
            </ListSubheader>
            <>

              <ListItemLink
                to="/tickets"
                primary={i18n.t("mainDrawer.listItems.tickets")}
                icon={<img src={`${process.env.PUBLIC_URL}/icones/atendimentos.png`} alt="Atendimentos" style={{ width: '24px', height: '24px' }} />}
              />
              {(user.profile === "supervisor" || user.profile === "admin") && (
                <ListItemLink
                  to="/quick-messages"
                  primary={i18n.t("mainDrawer.listItems.quickMessages")}
                  icon={<img src={`${process.env.PUBLIC_URL}/icones/respostasrapidas.png`} alt="Respostas Rapidas" style={{ width: '24px', height: '24px' }} />}
                />
              )}
              {showKanban && (
                <ListItemLink
                  to="/kanban"
                  primary="Kanban"
                  icon={<img src={`${process.env.PUBLIC_URL}/icones/kanban.png`} alt="Kanban" style={{ width: '24px', height: '24px' }} />}
                />
              )}
              <ListItemLink
                to="/todolist"
                primary={i18n.t("Tarefas")}
                icon={<img src={`${process.env.PUBLIC_URL}/icones/tarefas.png`} alt="Tarefas" style={{ width: '24px', height: '24px' }} />}
              />
              <ListItemLink
                to="/contacts"
                primary={i18n.t("mainDrawer.listItems.contacts")}
                icon={<img src={`${process.env.PUBLIC_URL}/icones/contatos.png`} alt="Contatos" style={{ width: '24px', height: '24px' }} />}
              />
              {showSchedules && (
                <>
                  <ListItemLink
                    to="/schedules"
                    primary={i18n.t("mainDrawer.listItems.schedules")}
                    icon={<img src={`${process.env.PUBLIC_URL}/icones/agendamentos.png`} alt="Agendamentos" style={{ width: '24px', height: '24px' }} />}
                  />
                </>
              )}
              {(user.profile === "supervisor" || user.profile === "admin") && (
                <ListItemLink
                  to="/tags"
                  primary={i18n.t("mainDrawer.listItems.tags")}
                  icon={<img src={`${process.env.PUBLIC_URL}/icones/tags.png`} alt="Tags" style={{ width: '24px', height: '24px' }} />}
                />
              )}
              {showInternalChat && (
                <>
                  <ListItemLink
                    to="/chats"
                    primary={i18n.t("mainDrawer.listItems.chats")}
                    icon={<img src={`${process.env.PUBLIC_URL}/icones/chatinterno.png`} alt="Chat Interno" style={{ width: '24px', height: '24px' }} />}
                  />
                </>
              )}
              <ListItemLink
                to="/helps"
                primary={i18n.t("mainDrawer.listItems.helps")}
                icon={<img src={`${process.env.PUBLIC_URL}/icones/ajuda.png`} alt="Ajuda" style={{ width: '24px', height: '24px' }} />}
              />
            </>
          </>
        )}
      />

      <Can
        role={user.profile}
        perform={"drawer-gerencia:view"}
        yes={() => (
          <>
            <ListSubheader
              hidden={collapsed}
              style={{
                position: "relative",
                fontSize: "17px",
                textAlign: "left",
                paddingLeft: 20
              }}
              inset
              color="inherit">

              <Typography variant="overline" style={{ fontWeight: 'normal' }}>  {i18n.t("Gerência")} </Typography>
            </ListSubheader>

            <ListItemLink
              small
              to="/"
              primary="Dashboard"
              icon={<img src={`${process.env.PUBLIC_URL}/icones/dashboard.png`} alt="Dashboard" style={{ width: '24px', height: '24px' }} />}
            />
            <ListItemLink
              small
              to="/reports"
              primary={i18n.t("mainDrawer.listItems.reports")}
              icon={<img src={`${process.env.PUBLIC_URL}/icones/relatorios.png`} alt="Relatorios" style={{ width: '24px', height: '24px' }} />}
            />
            <GoalsManagementMenu />
            <AnalyticsDashboardMenu />
            <ListItemLink
              to="/connections"
              primary={i18n.t("mainDrawer.listItems.connections")}
              icon={<img src={`${process.env.PUBLIC_URL}/icones/conexoes.png`} alt="Conexões" style={{ width: '24px', height: '24px' }} />}
            />
          </>
        )}
      />
      <Can
        role={user.profile}
        perform="drawer-administracao:view"
        yes={() => (
          <>

            {showCampaigns && (
              <>
                <ListSubheader
                  hidden={collapsed}
                  style={{
                    position: "relative",
                    fontSize: "17px",
                    textAlign: "left",
                    paddingLeft: 20
                  }}
                  inset
                  color="inherit">
                  <Typography variant="overline" style={{ fontWeight: 'normal' }}>  {i18n.t("Campanhas")} </Typography>
                </ListSubheader>

                <ListItemLink
                  small
                  to="/campaigns"
                  primary={i18n.t("Listagem")}
                  icon={<img src={`${process.env.PUBLIC_URL}/icones/campanhalista.png`} alt="Campanha Lista" style={{ width: '24px', height: '24px' }} />}
                />

                <ListItemLink
                  small
                  to="/contact-lists"
                  primary={i18n.t("Listas de Contatos")}
                  icon={<img src={`${process.env.PUBLIC_URL}/icones/campanhacontatos.png`} alt="Campanha Contatos" style={{ width: '24px', height: '24px' }} />}
                />


                <ListItemLink
                  small
                  to="/campaigns-config"
                  primary={i18n.t("Configurações")}
                  icon={<img src={`${process.env.PUBLIC_URL}/icones/campanhaconfiguracoes.png`} alt="Campanha Configuracões" style={{ width: '24px', height: '24px' }} />}
                />


                {/** 
                <ListItem
                  button
                  onClick={() => setOpenCampaignSubmenu((prev) => !prev)}
                >
                  <ListItemIcon>
                    <EventAvailableIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={i18n.t("mainDrawer.listItems.campaigns")}
                  />
                  {openCampaignSubmenu ? (
                    <ExpandLessIcon />
                  ) : (
                    <ExpandMoreIcon />
                  )}
                </ListItem>
                <Collapse
                  style={{ paddingLeft: 15 }}
                  in={openCampaignSubmenu}
                  timeout="auto"
                  unmountOnExit
                >
                  <List component="div" disablePadding>
                    
                    <ListItem onClick={() => history.push("/campaigns")} button>
                      <ListItemIcon>
                        <ListIcon />
                      </ListItemIcon>
                      <ListItemText primary="Listagem" />
                    </ListItem>

                    <ListItem
                      onClick={() => history.push("/contact-lists")}
                      button
                    >
                      <ListItemIcon>
                        <PeopleIcon />
                      </ListItemIcon>
                      <ListItemText primary="Listas de Contatos" />
                    </ListItem>

                    <ListItem
                      onClick={() => history.push("/campaigns-config")}
                      button
                    >
                      <ListItemIcon>
                        <SettingsOutlinedIcon />
                      </ListItemIcon>
                      <ListItemText primary="Configurações" />
                    </ListItem>

                  </List>
                </Collapse>
                */}
              </>
            )}

            <ListSubheader
              hidden={collapsed}
              style={{
                position: "relative",
                fontSize: "17px",
                textAlign: "left",
                paddingLeft: 20
              }}
              inset
              color="inherit">
              <Typography variant="overline" style={{ fontWeight: 'normal' }}>  {i18n.t("Administração")} </Typography>
            </ListSubheader>

            {user.super && (
              <ListItemLink
                to="/announcements"
                primary={i18n.t("mainDrawer.listItems.annoucements")}
                icon={<img src={`${process.env.PUBLIC_URL}/icones/informativos.png`} alt="Informativos" style={{ width: '24px', height: '24px' }} />}
              />
            )}
            {showOpenAi && (
              <ListItemLink
                to="/prompts"
                primary={i18n.t("mainDrawer.listItems.prompts")}
                icon={<img src={`${process.env.PUBLIC_URL}/icones/open.ai.png`} alt="Open.Ai" style={{ width: '24px', height: '24px' }} />}
              />
            )}

            {showIntegrations && (
              <ListItemLink
                to="/queue-integration"
                primary={i18n.t("mainDrawer.listItems.queueIntegration")}
                icon={<img src={`${process.env.PUBLIC_URL}/icones/integracoes.png`} alt="Integracoes" style={{ width: '24px', height: '24px' }} />}
              />
            )}
            <ListItemLink
              to="/files"
              primary={i18n.t("mainDrawer.listItems.files")}
              icon={<img src={`${process.env.PUBLIC_URL}/icones/listadearquivos.png`} alt="Lista de Arquivos" style={{ width: '24px', height: '24px' }} />}
            />
            <ListItemLink
              to="/queues"
              primary={i18n.t("mainDrawer.listItems.queues")}
              icon={<img src={`${process.env.PUBLIC_URL}/icones/filas.png`} alt="Filas" style={{ width: '24px', height: '24px' }} />}
            />
            <ListItemLink
              to="/users"
              primary={i18n.t("mainDrawer.listItems.users")}
              icon={<img src={`${process.env.PUBLIC_URL}/icones/usuarios.png`} alt="Usuarios" style={{ width: '24px', height: '24px' }} />}
            />
            {showExternalApi && (
              <>
                <ListItemLink
                  to="/messages-api"
                  primary={i18n.t("mainDrawer.listItems.messagesAPI")}
                  icon={<CodeRoundedIcon />}
                />
              </>
            )}
            <ListItemLink
              to="/financeiro"
              primary={i18n.t("mainDrawer.listItems.financeiro")}
              icon={<img src={`${process.env.PUBLIC_URL}/icones/financeiro.png`} alt="Financeiro" style={{ width: '24px', height: '24px' }} />}
            />

            <ListItemLink
              to="/settings"
              primary={i18n.t("mainDrawer.listItems.settings")}
              icon={<img src={`${process.env.PUBLIC_URL}/icones/configuracoes.png`} alt="Configuracoes" style={{ width: '24px', height: '24px' }} />}
            />

          </>
        )}
      />
      <li>
        <ListItem
          button
          dense
          onClick={handleClickLogout}>
          {<img src={`${process.env.PUBLIC_URL}/icones/sair.png`} alt="Sair" style={{ width: '24px', height: '24px' }} />}
        </ListItem>
      </li>
      <Divider />
      {/**versão do software */}
      <Typography variant="caption" align="center" style={{ marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}> V.10</Typography>
    </div>
  );
};

export default MainListItems;