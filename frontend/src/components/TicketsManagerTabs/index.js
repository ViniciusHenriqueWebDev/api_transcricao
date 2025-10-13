import React, { useContext, useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useHistory } from "react-router-dom";

import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import SearchIcon from "@material-ui/icons/Search";
import InputBase from "@material-ui/core/InputBase";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import Badge from "@material-ui/core/Badge";
import MoveToInboxIcon from "@material-ui/icons/MoveToInbox";
import CheckBoxIcon from "@material-ui/icons/CheckBox";

import FormControlLabel from "@material-ui/core/FormControlLabel";
import Switch from "@material-ui/core/Switch";

import NewTicketModal from "../NewTicketModal";
import TicketsList from "../TicketsListCustom";
import TabPanel from "../TabPanel";
import IconButton from "@material-ui/core/IconButton";
import { toast } from "react-toastify";
import TextField from "@material-ui/core/TextField";
import InputAdornment from "@material-ui/core/InputAdornment";
import CircularProgress from "@material-ui/core/CircularProgress";

import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../Can";
import TicketsQueueSelect from "../TicketsQueueSelect";
import { Button, Snackbar } from "@material-ui/core";
import { TagsFilter } from "../TagsFilter";
import { UsersFilter } from "../UsersFilter";
import api from "../../services/api";
import { TicketsListGroup } from "../TicketsListGroup";
import GroupIcon from "@material-ui/icons/Group";

const useStyles = makeStyles(theme => ({
  ticketsWrapper: {
    position: "relative",
    display: "flex",
    height: "100%",
    flexDirection: "column",
    overflow: "hidden",
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderRadius: 0,
  },

  tabsHeader: {
    flex: "none",
    backgroundColor: theme.palette.tabHeaderBackground,
  },

  tabsInternal: {
    flex: "none",
    backgroundColor: theme.palette.tabHeaderBackground
  },

  settingsIcon: {
    alignSelf: "center",
    marginLeft: "auto",
    padding: 8,
  },
  snackbar: {
    display: "flex",
    justifyContent: "space-between",
    backgroundColor: theme.palette.primary.main,
    color: "white",
    borderRadius: 30,
    [theme.breakpoints.down("sm")]: {
      fontSize: "0.8em",
    },
    [theme.breakpoints.up("md")]: {
      fontSize: "1em",
    },
  },

  yesButton: {
    backgroundColor: "#FFF",
    color: "rgba(0, 100, 0, 1)",
    padding: "4px 4px",
    fontSize: "1em",
    fontWeight: "bold",
    textTransform: "uppercase",
    marginRight: theme.spacing(1),
    "&:hover": {
      backgroundColor: "darkGreen",
      color: "#FFF",
    },
    borderRadius: 30,
  },
  noButton: {
    backgroundColor: "#FFF",
    color: "rgba(139, 0, 0, 1)",
    padding: "4px 4px",
    fontSize: "1em",
    fontWeight: "bold",
    textTransform: "uppercase",
    "&:hover": {
      backgroundColor: "darkRed",
      color: "#FFF",
    },
    borderRadius: 30,
  },
  tab: {
    minWidth: 120,
    width: 120,
  },

  internalTab: {
    minWidth: 120,
    width: 120,
    padding: 5
  },

  ticketOptionsBox: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: theme.palette.optionsBackground,
    padding: theme.spacing(1),
  },

  ticketSearchLine: {
    padding: theme.spacing(1),
  },

  serachInputWrapper: {
    flex: 1,
    background: theme.palette.total,
    display: "flex",
    borderRadius: 40,
    padding: 4,
    marginRight: theme.spacing(1),
  },

  searchIcon: {
    color: "grey",
    marginLeft: 6,
    marginRight: 6,
    alignSelf: "center",
  },

  searchInput: {
    flex: 1,
    border: "none",
    borderRadius: 30,
  },

  insiderTabPanel: {
    height: '100%',
    marginTop: "-72px",
    paddingTop: "72px"
  },

  insiderDoubleTabPanel: {
    display: "flex",
    flexDirection: "column",
    marginTop: "-72px",
    paddingTop: "72px",
    height: "100%"
  },

  labelContainer: {
    width: "auto",
    padding: 0
  },
  iconLabelWrapper: {
    flexDirection: "row",
    '& > *:first-child': {
      marginBottom: '3px !important',
      marginRight: 16
    }
  },
  insiderTabLabel: {
    [theme.breakpoints.down(1600)]: {
      display: 'none'
    }
  },
  smallFormControl: {
    '& .MuiOutlinedInput-input': {
      padding: "12px 10px",
    },
    '& .MuiInputLabel-outlined': {
      marginTop: "-6px"
    }
  }
}));

const TicketsManagerTabs = () => {
  const classes = useStyles();
  const history = useHistory();

  const [tab, setTab] = useState("open");
  const [tabOpen, setTabOpen] = useState("open");
  const [tabGroup, setTabGroup] = useState("open"); // Estado separado para grupo
  const [newTicketModalOpen, setNewTicketModalOpen] = useState(false);
  const [showAllTickets, setShowAllTickets] = useState(false);
  const searchInputRef = useRef(null);
  const { user } = useContext(AuthContext);
  const { profile } = user;
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const [openCount, setOpenCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [groupOpenCount, setGroupOpenCount] = useState(0);
  const [groupPendingCount, setGroupPendingCount] = useState(0);

  // Memoizar userQueueIds para evitar recriação desnecessária
  const userQueueIds = useMemo(() => user.queues.map((q) => q.id), [user.queues]);
  const [selectedQueueIds, setSelectedQueueIds] = useState(userQueueIds || []);
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showGroupTab, setShowTabGroup] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchParam, setSearchParam] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  // Função para focar no input de pesquisa com segurança
  const focusSearchInput = useCallback(() => {
    setTimeout(() => {
      try {
        if (searchInputRef.current && typeof searchInputRef.current.focus === 'function') {
          searchInputRef.current.focus();
        }
      } catch (error) {
        console.warn('Erro ao focar no input de pesquisa:', error);
      }
    }, 100);
  }, []);

  // Função para limpar pesquisa
  const handleClearSearch = useCallback(() => {
    setSearchInput("");
    setSearchParam("");
    setSelectedTags([]);
    setSelectedUsers([]);
    setIsSearching(false);

    // Disparar evento para resetar filtros
    const resetEvent = new CustomEvent('resetFilters');
    document.dispatchEvent(resetEvent);
  }, []);

  // Handlers memoizados para evitar re-renderizações
  const handleSelectedTags = useCallback((selecteds) => {
    const tagIds = selecteds.map((t) => t.id);
    setSelectedTags(tagIds);

    // Disparar evento de aplicação de filtros
    const filterEvent = new CustomEvent('applyFilters', {
      detail: { tags: tagIds }
    });
    document.dispatchEvent(filterEvent);
  }, []);

  const handleSelectedUsers = useCallback((selecteds) => {
    const userIds = selecteds.map((u) => u.id);
    setSelectedUsers(userIds);

    // Disparar evento de aplicação de filtros
    const filterEvent = new CustomEvent('applyFilters', {
      detail: { users: userIds }
    });
    document.dispatchEvent(filterEvent);
  }, []);

  const handleSearchInputChange = useCallback((e) => {
    setSearchInput(e.target.value);
  }, []);

  const handleSearchButtonClick = useCallback(() => {
    if (searchInput === "") {
      handleClearSearch();
      setTimeout(() => {
        setIsSearching(false);
      }, 300);
      return;
    }

    if (searchInput.length < 3 && searchInput.length > 0) {
      toast.info("Digite pelo menos 3 caracteres para pesquisar");
      return;
    }

    setIsSearching(true);
    setSearchParam(searchInput.toLowerCase());
  }, [searchInput, handleClearSearch]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      handleSearchButtonClick();
    }
  }, [handleSearchButtonClick]);

  const handleChangeTab = useCallback((e, newValue) => {
    setTab(newValue);

    if (newValue === "search") {
      if (searchParam) {
        handleClearSearch();
      }
      focusSearchInput();
    } else {
      // Limpar filtros quando sair da aba de pesquisa
      setSearchInput("");
      setSearchParam("");
      setSelectedTags([]);
      setSelectedUsers([]);
      setIsSearching(false);

      // Disparar evento para resetar filtros em todos os componentes
      const resetEvent = new CustomEvent('resetFilters');
      document.dispatchEvent(resetEvent);
    }
  }, [searchParam, handleClearSearch, focusSearchInput]);

  const handleChangeTabOpen = useCallback((e, newValue) => {
  console.log("Mudando aba interna:", { de: tabOpen, para: newValue });
  setTabOpen(newValue);
  
  // NÃO limpar filtros aqui - deixar o hook useTickets gerenciar
  // Apenas para aba de pesquisa devemos limpar filtros
  }, [tabOpen]);

  const handleChangeTabGroup = useCallback((e, newValue) => {
    setTabGroup(newValue);
  }, []);

  // Função para aplicar estilo das abas (normal tickets)
  const applyPanelStyle = useCallback((status) => {
    if (tabOpen !== status) {
      return { width: 0, height: 0, overflow: 'hidden' };
    }
    return {};
  }, [tabOpen]);

  // Função para aplicar estilo das abas (group tickets)
  const applyPanelStyleGroup = useCallback((status) => {
    if (tabGroup !== status) {
      return { width: 0, height: 0, overflow: 'hidden' };
    }
    return {};
  }, [tabGroup]);

  const handleCloseOrOpenTicket = useCallback((ticket) => {
    setNewTicketModalOpen(false);
    if (ticket !== undefined && ticket.uuid !== undefined) {
      history.push(`/tickets/${ticket.uuid}`);
    }
  }, [history]);

  const handleSnackbarOpen = useCallback(() => {
    setSnackbarOpen(true);
  }, []);

  const handleSnackbarClose = useCallback(() => {
    setSnackbarOpen(false);
  }, []);

  const handleRedirectToTab = useCallback((newTab, ticketUuid) => {
    setTab(newTab);

    if (ticketUuid) {
      setTimeout(() => {
        history.push(`/tickets/${ticketUuid}`);
      }, 300);
    }
  }, [history]);

  const CloseAllTicket = useCallback(async () => {
    try {
      setSnackbarOpen(false);

      console.log("🔄 Iniciando fechamento de todos os tickets:", {
        status: tabOpen,
        userId: user.id,
        selectedQueueIds,
        userProfile: user.profile
      });

      const toastId = toast.info("Fechando todos os tickets...", {
        autoClose: false,
        position: "bottom-center"
      });

      // ✅ DADOS CORRETOS PARA ENVIAR
      const requestData = {
        status: tabOpen, // "open" ou "pending"
        userId: user.id,
        companyId: user.companyId, // ✅ ADICIONAR companyId
        queueIds: selectedQueueIds && selectedQueueIds.length > 0 ? selectedQueueIds : null
      };

      console.log("📤 Dados da requisição:", requestData);

      const { data } = await api.put("/tickets/close-all", requestData);

      console.log("✅ Resposta da API:", data);

      // Atualizar contadores locais
      if (tabOpen === "open") {
        setOpenCount(0);
      } else if (tabOpen === "pending") {
        setPendingCount(0);
      }

      toast.update(toastId, {
        type: "success",
        render: `${data.count || 0} tickets fechados com sucesso!`,
        autoClose: 3000,
        hideProgressBar: false
      });

      // Disparar evento para atualizar as listas
      const event = new CustomEvent('ticketsClosed', {
        detail: { 
          status: tabOpen,
          count: data.count 
        }
      });
      document.dispatchEvent(event);

      // Forçar reload das listas após 1 segundo
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (err) {
      console.error("❌ Erro ao fechar tickets:", err);
      
      // Fechar loading toast se existir
      toast.dismiss();
      
      // Mostrar erro detalhado
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          err.message || 
                          "Erro desconhecido";
      
      toast.error(`Erro ao fechar tickets: ${errorMessage}`);
    }
  }, [tabOpen, user.id, user.companyId, selectedQueueIds]);

  const fetchSettings = useCallback(async () => {
    try {
      const { data } = await api.get("/settings");
      const showGroups = data.find((s) => s.key === "CheckMsgIsGroup");
      setShowTabGroup(showGroups?.value === "disabled");
    } catch (err) {
      console.error("Erro ao carregar configurações:", err);
    }
  }, []);

  // Effect para carregar configurações iniciais
  useEffect(() => {
    fetchSettings();

    if (user.profile.toUpperCase() === "ADMIN" || user.profile.toUpperCase() === "SUPERVISOR") {
      setShowAllTickets(true);
    }
  }, [fetchSettings, user.profile]);

  // Effect para lidar com ticket aceito
  useEffect(() => {
    const handleTicketAccepted = (event) => {
      const { status } = event.detail;
      setTab(status);

      setTimeout(() => {
        const acceptedTicketUuid = localStorage.getItem('accepted-ticket-uuid');
        if (acceptedTicketUuid) {
          localStorage.removeItem('accepted-ticket-uuid');
          history.push(`/tickets/${acceptedTicketUuid}`);
        }
      }, 300);
    };

    document.addEventListener('ticketAccepted', handleTicketAccepted);

    return () => {
      document.removeEventListener('ticketAccepted', handleTicketAccepted);
    };
  }, [history]);

  // Adicionar nos useEffect:

  useEffect(() => {
    const handleBulkClosed = (data) => {
      console.log("✅ Tickets fechados em massa:", data);
      // Forçar reload da página após fechar tickets
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    };

    const handleForceReload = (data) => {
      console.log("🔄 Forçando reload das listas:", data);
      window.location.reload();
    };

    // Adicionar listeners de socket
    if (window.socket) {
      window.socket.on('tickets-bulk-closed', handleBulkClosed);
      window.socket.on('force-tickets-reload', handleForceReload);
    }

    return () => {
      if (window.socket) {
        window.socket.off('tickets-bulk-closed', handleBulkClosed);
        window.socket.off('force-tickets-reload', handleForceReload);
      }
    };
  }, []);

  // Effect para focar no input quando a aba search é selecionada
  useEffect(() => {
    if (tab === "search") {
      focusSearchInput();
    }
  }, [tab, focusSearchInput]);

  // Sincronizar selectedQueueIds com userQueueIds quando as filas do usuário mudarem
  useEffect(() => {
    if (userQueueIds.length > 0 && selectedQueueIds.length === 0) {
      setSelectedQueueIds(userQueueIds);
    }
  }, [userQueueIds, selectedQueueIds.length]);

  return (
    <Paper elevation={0} variant="outlined" className={classes.ticketsWrapper}>
      <NewTicketModal
        modalOpen={newTicketModalOpen}
        onClose={handleCloseOrOpenTicket}
      />
      <Paper elevation={0} square className={classes.tabsHeader}>
        <Tabs
          value={tab}
          onChange={handleChangeTab}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab
            value={"open"}
            icon={<MoveToInboxIcon />}
            label={i18n.t("tickets.tabs.open.title")}
            classes={{ root: classes.tab }}
          />

          {showGroupTab && (
            <Tab
              value={"group"}
              icon={<GroupIcon />}
              label={i18n.t("tickets.tabs.group.title")}
              classes={{ root: classes.tab }}
            />
          )}

          <Tab
            value={"closed"}
            icon={<CheckBoxIcon />}
            label={i18n.t("tickets.tabs.closed.title")}
            classes={{ root: classes.tab }}
          />
          <Tab
            value={"search"}
            icon={<SearchIcon />}
            label={i18n.t("tickets.tabs.search.title")}
            classes={{ root: classes.tab }}
          />
        </Tabs>
      </Paper>
      <Paper square elevation={0} className={classes.ticketOptionsBox}>
        {tab === "search" ? (
          <div className={classes.serachInputWrapper}>
            <TextField
              placeholder={i18n.t("tickets.search.placeholder")}
              type="search"
              value={searchInput}
              onChange={handleSearchInputChange}
              onKeyPress={handleKeyPress}
              inputRef={searchInputRef}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    {searchInput && (
                      <IconButton onClick={handleClearSearch} size="small">
                        <span style={{ fontSize: '18px', fontWeight: 'bold' }}>✕</span>
                      </IconButton>
                    )}
                    <IconButton onClick={handleSearchButtonClick} disabled={isSearching}>
                      {isSearching ? (
                        <CircularProgress size={24} />
                      ) : (
                        <SearchIcon />
                      )}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              fullWidth
            />
          </div>
        ) : (
          <>
          {user.profile === "admin" && (
              <Snackbar
                open={snackbarOpen}
                onClose={handleSnackbarClose}
                message={i18n.t("tickets.inbox.closedAllTickets")}
                ContentProps={{
                  className: classes.snackbar,
                }}
                action={
                  <>
                    <Button
                      className={classes.yesButton}
                      size="small"
                      onClick={CloseAllTicket}
                    >
                      {i18n.t("tickets.inbox.yes")}
                    </Button>
                    <Button
                      className={classes.noButton}
                      size="small"
                      onClick={handleSnackbarClose}
                    >
                      {i18n.t("tickets.inbox.no")}
                    </Button>
                  </>
                }
              />
            )}
            <Button
              variant="outlined"
              color="primary"
              onClick={() => setNewTicketModalOpen(true)}
              style={{ minWidth: "30px", fontSize: "0.7rem" }}
            >
              {i18n.t("ticketsManager.buttons.newTicket")}
            </Button>
            {user.profile === "admin" && (
              <Button
                variant="outlined"
                color="primary"
                onClick={handleSnackbarOpen}
                style={{ minWidth: "90px", fontSize: "0.7rem" }}
              >
                {i18n.t("ticketsManager.buttons.closeallTicket")}
              </Button>
            )}
            <Can
              role={user.profile}
              perform="tickets-manager:showall"
              yes={() => (
                <FormControlLabel
                  label={i18n.t("tickets.buttons.showAll")}
                  labelPlacement="start"
                  control={
                    <Switch
                      size="small"
                      checked={showAllTickets}
                      onChange={() => setShowAllTickets((prevState) => !prevState)}
                      name="showAllTickets"
                      color="primary"
                    />
                  }
                />
              )}
            />
          </>
        )}
        <TicketsQueueSelect
          style={{ marginLeft: 6 }}
          selectedQueueIds={selectedQueueIds}
          userQueues={user?.queues}
          onChange={(values) => setSelectedQueueIds(values)}
        />
      </Paper>

      <TabPanel value={tab} name="open" className={classes.ticketsWrapper}>
        <Tabs
          value={tabOpen}
          onChange={handleChangeTabOpen}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab
            label={
              <Badge
                className={classes.badge}
                badgeContent={openCount}
                color="primary"
              >
                {i18n.t("ticketsList.assignedHeader")}
              </Badge>
            }
            value={"open"}
          />
          <Tab
            label={
              <Badge
                className={classes.badge}
                badgeContent={pendingCount}
                color="secondary"
              >
                {i18n.t("ticketsList.pendingHeader")}
              </Badge>
            }
            value={"pending"}
          />
        </Tabs>
        <Paper className={classes.ticketsWrapper}>
          <TicketsList
            status="open"
            showAll={showAllTickets}
            selectedQueueIds={selectedQueueIds}
            updateCount={(val) => setOpenCount(val)}
            style={applyPanelStyle("open")}
            onRedirectToTab={handleRedirectToTab}
          />
          <TicketsList
            status="pending"
            selectedQueueIds={selectedQueueIds}
            updateCount={(val) => setPendingCount(val)}
            style={applyPanelStyle("pending")}
            onRedirectToTab={handleRedirectToTab}
          />
        </Paper>
      </TabPanel>

      {showGroupTab && (
        <TabPanel value={tab} name="group" className={classes.ticketsWrapper}>
          <Tabs
            value={tabGroup}
            onChange={handleChangeTabGroup}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab
              label={
                <Badge
                  className={classes.badge}
                  badgeContent={groupOpenCount}
                  color="primary"
                >
                  {i18n.t("ticketsList.assignedHeader")}
                </Badge>
              }
              value={"open"}
            />
            <Tab
              label={
                <Badge
                  className={classes.badge}
                  badgeContent={groupPendingCount}
                  color="secondary"
                >
                  {i18n.t("ticketsList.pendingHeader")}
                </Badge>
              }
              value={"pending"}
            />
          </Tabs>
          <Paper className={classes.ticketsWrapper}>
            <TicketsListGroup
              status="open"
              showAll={showAllTickets}
              selectedQueueIds={selectedQueueIds}
              updateCount={(val) => setGroupOpenCount(val)}
              style={applyPanelStyleGroup("open")}
            />
            <TicketsListGroup
              status="pending"
              selectedQueueIds={selectedQueueIds}
              updateCount={(val) => setGroupPendingCount(val)}
              style={applyPanelStyleGroup("pending")}
            />
          </Paper>
        </TabPanel>
      )}

      <TabPanel value={tab} name="closed" className={classes.ticketsWrapper}>
        <TicketsList
          status="closed"
          showAll={true}
          selectedQueueIds={selectedQueueIds}
          onRedirectToTab={handleRedirectToTab}
        />
      </TabPanel>

      <TabPanel value={tab} name="search" className={classes.ticketsWrapper}>
        <div style={{ margin: '10px' }}>
          <TagsFilter onFiltered={handleSelectedTags} />
          {profile === "admin" && (
            <div style={{ marginTop: '5px' }}>
              <UsersFilter onFiltered={handleSelectedUsers} />
            </div>
          )}
        </div>
        <TicketsList
          searchParam={searchParam}
          showAll={true}
          tags={selectedTags}
          users={selectedUsers}
          selectedQueueIds={selectedQueueIds}
          onRedirectToTab={handleRedirectToTab}
          isSearching={isSearching}
          onSearchComplete={() => {
            setIsSearching(false);
          }}
          tab={tab}
        />
      </TabPanel>
    </Paper>
  );
};

export default TicketsManagerTabs;