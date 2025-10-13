import React, { useState, useEffect, useContext } from "react";
import { makeStyles } from "@material-ui/core/styles";
import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";
import Board from 'react-trello';
import { toast } from "react-toastify";
import { i18n } from "../../translate/i18n";
import { useHistory } from 'react-router-dom';
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Paper,
  TextField,
  Button,
  Grid
} from "@material-ui/core";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import SearchIcon from "@material-ui/icons/Search";

const useStyles = makeStyles(theme => ({
  root: {
    display: "flex",
    alignItems: "center",
    padding: theme.spacing(1),
    flexDirection: "column",
    width: "100%"
  },
  button: {
    background: "#10a110",
    border: "none",
    padding: "10px",
    color: "white",
    fontWeight: "bold",
    borderRadius: "5px",
  },
  tagBadge: {
    display: "inline-block",
    margin: "3px 3px 10px 0px",
    padding: "6px 10px",
    borderRadius: "5px",
    fontSize: "14px",
    fontWeight: "500",
    color: "white",
    border: "none",
    cursor: "default",
    boxShadow: "none",
    verticalAlign: "middle",
  },
  tagsContainer: {
    display: "flex",
    flexWrap: "wrap",
    marginTop: "5px",
    marginBottom: "10px",
    alignItems: "center",
  },
  accordion: {
    width: "100%",
    marginBottom: theme.spacing(2),
  },
  accordionSummary: {
    backgroundColor: theme.palette.grey[200],
  },
  accordionDetails: {
    padding: 0,
    display: "block",
  },
  sectionTitle: {
    fontWeight: "bold",
  },
  filterContainer: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    width: "100%",
  },
  filterButton: {
    margin: theme.spacing(1),
    height: "100%",
    backgroundColor: theme.palette.primary.main,
    color: "white",
  },
  dateInput: {
    margin: theme.spacing(1),
  }
}));

const Kanban = () => {
  const classes = useStyles();
  const history = useHistory();

  const [tags, setTags] = useState([]);
  const [reloadData, setReloadData] = useState(false);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const [kanbanTagIds, setKanbanTagIds] = useState([]);
  const [sections, setSections] = useState([]);
  const [expandedSections, setExpandedSections] = useState([0]);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [closedTickets, setClosedTickets] = useState([]);
  const [filterApplied, setFilterApplied] = useState(false);


  const fetchTags = async () => {
    try {
      const response = await api.get("/tags/kanban");
      const fetchedTags = response.data.lista || [];

      const sortedTags = [...fetchedTags].sort((a, b) =>
        a.name.localeCompare(b.name)
      );

      setTags(sortedTags);
      await fetchTickets(jsonString);
    } catch (error) {
      console.log(error);
    }
  };

  const fetchAllTags = async () => {
    try {
      const response = await api.get("/tags");
      const allTags = response.data.tags || [];

      const kanbanIds = allTags
        .filter(tag => tag.kanban === 1)
        .map(tag => tag.id);

      setKanbanTagIds(kanbanIds);
    } catch (error) {
      console.error("Erro ao buscar tags:", error);
    }
  };

  useEffect(() => {
    fetchTags();
    fetchAllTags();
  }, []);

  const [file, setFile] = useState({
    lanes: []
  });


  const [tickets, setTickets] = useState([]);
  const { user } = useContext(AuthContext);
  const { profile, queues } = user;
  const jsonString = user.queues.map(queue => queue.UserQueue.queueId);

  const fetchTickets = async (jsonString) => {
    try {
      const { data } = await api.get("/ticket/kanban", {
        params: {
          queueIds: JSON.stringify(jsonString),
          teste: true,
          startDate: startDate || null,
          endDate: endDate || null,
          includeClosedTickets: filterApplied
        }
      });

      setTickets(data.tickets);

      if (data.closedTickets && filterApplied) {
        setClosedTickets(data.closedTickets);
      } else {
        setClosedTickets([]);
      }
    } catch (err) {
      console.log(err);
      setTickets([]);
      setClosedTickets([]);
    }
  };

  const handleApplyFilters = async () => {
    setFilterApplied(true);

    try {
      const { data } = await api.get("/ticket/kanban", {
        params: {
          queueIds: JSON.stringify(jsonString),
          teste: true,
          startDate: startDate || null,
          endDate: endDate || null,
          includeClosedTickets: true // Sempre true ao aplicar filtros
        }
      });

      // Depois, atualize os tickets
      setTickets(data.tickets || []);
      setClosedTickets(data.closedTickets || []);

      toast.success('Filtros aplicados com sucesso');
    } catch (err) {
      console.log(err);
      toast.error('Erro ao aplicar filtros');
      setTickets([]);
      setClosedTickets([]);
    }
  };

  const handleSectionToggle = (sectionIndex) => {
    setExpandedSections(prev => {
      if (prev.includes(sectionIndex)) {
        return prev.filter(index => index !== sectionIndex);
      } else {
        return [...prev, sectionIndex];
      }
    });
  };

  // Função para obter o nome da primeira tag de um ticket em ordem alfabética
  const getFirstTagName = (ticket) => {
    if (!ticket.tags || ticket.tags.length === 0) return '';

    const sortedTags = [...ticket.tags]
      .filter(tag => !kanbanTagIds.includes(tag.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    return sortedTags.length > 0 ? sortedTags[0].name : '';
  };

  // Função auxiliar para ordenar os tickets por tag alfabeticamente
  const sortTicketsByTag = (tickets) => {
    return [...tickets].sort((a, b) => {
      const tagA = getFirstTagName(a).toUpperCase();
      const tagB = getFirstTagName(b).toUpperCase();

      if (tagA === '' && tagB !== '') return 1;
      if (tagA !== '' && tagB === '') return -1;
      return tagA.localeCompare(tagB);
    });
  };

  const popularCards = (jsonString) => {
    const filteredTickets = tickets.filter(ticket => ticket.tags.length === 0);

    // Ordenar tickets sem tag
    const sortedFilteredTickets = [...filteredTickets];

    const lanes = [
      {
        id: "lane0",
        title: i18n.t("Em aberto"),
        label: "0",
        cards: sortedFilteredTickets.map(ticket => ({
          id: ticket.id.toString(),
          label: "Ticket nº " + ticket.id.toString(),
          description: (
            <div>
              <p>
                {ticket.contact.number}
                <br />
                {ticket.lastMessage}
                {ticket.user && (
                  <>
                    <br />
                    <span style={{
                      fontWeight: "bold",
                      color: "#0066CC",
                      display: "block",
                      marginTop: "5px"
                    }}>
                      Atendente: {ticket.user.name}
                    </span>
                  </>
                )}
              </p>
              <div className={classes.tagsContainer}>
                {ticket.tags && ticket.tags.length > 0 &&
                  [...ticket.tags]
                    .filter(ticketTag => !kanbanTagIds.includes(ticketTag.id))
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((ticketTag) => (
                      <span
                        key={ticketTag.id}
                        className={classes.tagBadge}
                        style={{ backgroundColor: ticketTag.color || "#888888" }}
                      >
                        {ticketTag.name}
                      </span>
                    ))}
              </div>
              <button
                className={classes.button}
                onClick={() => {
                  handleCardClick(ticket.uuid)
                }}>
                Ver Ticket
              </button>
            </div>
          ),
          title: ticket.contact.name,
          draggable: true,
          href: "/tickets/" + ticket.uuid,
        })),
      },
      ...tags.map(tag => {
        // Filtrar tickets com esta tag
        const filteredTickets = tickets.filter(ticket => {
          const tagIds = ticket.tags.map(tag => tag.id);
          return tagIds.includes(tag.id);
        });

        // Ordenar os tickets por suas tags (em ordem alfabética)
        const sortedTagTickets = sortTicketsByTag(filteredTickets);

        return {
          id: tag.id.toString(),
          title: tag.name,
          label: tag.id.toString(),
          cards: sortedTagTickets.map(ticket => ({
            id: ticket.id.toString(),
            label: "Ticket nº " + ticket.id.toString(),
            description: (
              <div>
                <p>
                  {ticket.contact.number}
                  <br />
                  {ticket.lastMessage}
                  {ticket.user && (
                    <>
                      <br />
                      <span style={{
                        fontWeight: "bold",
                        color: "#0066CC",
                        display: "block",
                        marginTop: "5px"
                      }}>
                        Atendente: {ticket.user.name}
                      </span>
                    </>
                  )}
                </p>
                <div className={classes.tagsContainer}>
                  {ticket.tags && ticket.tags.length > 0 && ticket.tags
                    .filter(ticketTag => !kanbanTagIds.includes(ticketTag.id))
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((ticketTag) => (
                      <span
                        key={ticketTag.id}
                        className={classes.tagBadge}
                        style={{ backgroundColor: ticketTag.color || "#888888" }}
                      >
                        {ticketTag.name}
                      </span>
                    ))}
                </div>
                <button
                  className={classes.button}
                  onClick={() => {
                    handleCardClick(ticket.uuid)
                  }}>
                  Ver Ticket
                </button>
              </div>
            ),
            title: ticket.contact.name,
            draggable: true,
            href: "/tickets/" + ticket.uuid,
          })),
          style: { backgroundColor: tag.color, color: "white" }
        };
      }),
    ];

    if (filterApplied && closedTickets.length > 0) {
      const closedLane = {
        id: "closed",
        title: "Tickets Finalizados",
        label: closedTickets.length.toString(),
        style: { backgroundColor: "#f44336", color: "white" },
        cards: closedTickets.map(ticket => ({
          id: ticket.id.toString(),
          label: "Ticket n° " + ticket.id.toString(),
          description: (
            <div>
              <p>
                {ticket.contact.number}
                <br />
                {ticket.lastMessage}
                {ticket.user && (
                  <>
                    <br />
                    <span style={{
                      fontWeight: "bold",
                      color: "#0066CC",
                      display: "block",
                      marginTop: "5px"
                    }}>
                      Atendente: {ticket.user.name}
                    </span>
                  </>
                )}
                <br />
                <span style={{
                  fontWeight: "bold",
                  color: "#FF0000",
                  display: "block",
                  marginTop: "5px"
                }}>
                  Encerrado em: {new Date(ticket.updatedAt).toLocaleDateString()}
                </span>
              </p>
              <div className={classes.tagsContainer}>
                {ticket.tags && ticket.tags.length > 0 && ticket.tags
                  .filter(ticketTag => !kanbanTagIds.includes(ticketTag.id))
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((ticketTag) => (
                    <span
                      key={ticketTag.id}
                      className={classes.tagBadge}
                      style={{ backgroundColor: ticketTag.color || "#888888" }}
                    >
                      {ticketTag.name}
                    </span>
                  ))}
              </div>
              <button
                className={classes.button}
                onClick={() => {
                  handleCardClick(ticket.uuid)
                }}>
                Ver Ticket
              </button>
            </div>
          ),
          title: ticket.contact.name,
          draggable: false,
          href: "/tickets/" + ticket.uuid,
        }))
      };

      lanes.push(closedLane);
    }

    // Dividir as lanes em seções de 4
    const sectionsArray = [];
    for (let i = 0; i < lanes.length; i += 5) {
      const sectionLanes = lanes.slice(i, i + 5);
      const sectionTitle = `Seção ${sectionsArray.length + 1}`;
      sectionsArray.push({ title: sectionTitle, lanes: sectionLanes });
    }

    setSections(sectionsArray);
  };

  const handleCardClick = (uuid) => {
    history.push('/tickets/' + uuid);
  };

  useEffect(() => {
    popularCards(jsonString);
  }, [tags, tickets, reloadData, closedTickets, filterApplied]);

  const handleCardMove = async (cardId, sourceLaneId, targetLaneId) => {
    try {
      await api.delete(`/ticket-tags/${targetLaneId}`);
      toast.success('Ticket Tag Removido!');
      await api.put(`/ticket-tags/${targetLaneId}/${sourceLaneId}`);
      toast.success('Ticket Tag Adicionado com Sucesso!');
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div className={classes.root}>
      <Paper className={classes.filterContainer} elevation={2}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField
              id="startDate"
              label="Data de Início"
              type="date"
              fullWidth
              variant="outlined"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={classes.dateInput}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              id="endDate"
              label="Data de Término"
              type="date"
              fullWidth
              variant="outlined"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={classes.dateInput}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button
              variant="contained"
              color="primary"
              className={classes.filterButton}
              startIcon={<SearchIcon />}
              onClick={handleApplyFilters}
              fullWidth
            >
              Aplicar Filtros
            </Button>
          </Grid>
        </Grid>
      </Paper>
      {sections.map((section, index) => (
        <Accordion
          key={index}
          className={classes.accordion}
          expanded={expandedSections.includes(index)}
          onChange={() => handleSectionToggle(index)}
        >
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            className={classes.accordionSummary}
            IconButtonProps={{
              edge: 'start', // Coloca o botão à esquerda
              disableRipple: true,
            }}
          >
            <Typography className={classes.sectionTitle}>
              Seção {index + 1}
            </Typography>
          </AccordionSummary>
          <AccordionDetails className={classes.accordionDetails}>
            <Board
              data={{ lanes: section.lanes }}
              onCardMoveAcrossLanes={handleCardMove}
              style={{ backgroundColor: 'rgba(252, 252, 252, 0.03)', width: '100%' }}
            />
          </AccordionDetails>
        </Accordion>
      ))}
    </div>
  );
};

export default Kanban;