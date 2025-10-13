import React, { useState, useEffect, useRef, useContext } from "react"; // Adicionando useContext
import { makeStyles } from "@material-ui/core/styles";
import {
  Paper,
  Grid,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Divider,
  TextField,
  Button,
  IconButton,
  Box,
  Tooltip,
  CircularProgress,
  Tab,
  Tabs,
  Avatar,
  Fade,
  useMediaQuery
} from "@material-ui/core";
import { format, subDays, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import RefreshIcon from "@material-ui/icons/Refresh";
import GetAppIcon from "@material-ui/icons/GetApp";
import DateRangeIcon from "@material-ui/icons/DateRange";
import PeopleIcon from "@material-ui/icons/People";
import QueueIcon from "@material-ui/icons/Queue";
import AccessTimeIcon from "@material-ui/icons/AccessTime";
import LocalOfferIcon from "@material-ui/icons/LocalOffer";
import WhatsAppIcon from "@material-ui/icons/WhatsApp";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import TrendingUpIcon from "@material-ui/icons/TrendingUp";
import SpeedIcon from "@material-ui/icons/Speed";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import api from "../../services/api";
import { toast } from "react-toastify";
import { useTheme } from "@material-ui/core/styles";
import useFeatures from "../../hooks/useFeatures";
import { useHistory } from "react-router-dom";
import { AuthContext } from "../../context/Auth/AuthContext"; // Importe o contexto de autenticação



import UsersChart from "./components/UsersChart";
import StatusChart from "./components/StatusChart";
import QueueChart from "./components/QueueChart";
import WhatsappChart from "./components/WhatsappChart";
import TimeChart from "./components/TimeChart";
import TagsChart from "./components/TagsChart";
import EvolutionChart from "./components/EvolutionChart";
import QueueEfficiencyChart from "./components/QueueEfficiencyChart";
import PeriodFilter from "./components/PeriodFilter";

// Paleta de cores personalizada para os gráficos
const chartColors = [
  "#3f51b5", "#f44336", "#4caf50", "#ff9800", "#9c27b0",
  "#2196f3", "#00bcd4", "#ffeb3b", "#ff5722", "#795548"
];

const useStyles = makeStyles(theme => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1), // Reduzido o padding
    margin: theme.spacing(0.5), // Margem menor
    marginTop: 0,
    overflow: "auto",
    borderRadius: 10,
    maxHeight: "calc(100vh - 160px)" // Altura máxima adaptativa
  },
  cardContainer: {
    marginTop: theme.spacing(1.5) // Espaçamento menor entre cards
  },
  card: {
    height: "100%",
    display: "flex",
    flexDirection: "column",
    borderRadius: 10,
    boxShadow: "0 2px 10px 0 rgba(0,0,0,0.12)",
    transition: "all 0.3s ease",
    overflow: "hidden",
    "&:hover": {
      boxShadow: "0 4px 15px 0 rgba(0,0,0,0.15)",
      transform: "translateY(-3px)"
    }
  },
  cardHeader: {
    padding: theme.spacing(1.5), // Padding menor
    display: "flex",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.04)"
  },
  cardIcon: {
    marginRight: theme.spacing(1.5),
    backgroundColor: theme.palette.primary.main,
    color: "#FFF",
    width: theme.spacing(4), // Tamanho menor
    height: theme.spacing(4) // Tamanho menor
  },
  cardHeaderTitle: {
    fontWeight: 600,
    fontSize: "0.95rem" // Fonte menor
  },
  cardContent: {
    padding: theme.spacing(1), // Padding menor
    flex: 1,
    display: "flex",
    flexDirection: "column"
  },
  chartContainer: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    minHeight: 250, // Altura mínima reduzida
    padding: theme.spacing(1) // Padding menor
  },
  tabsContainer: {
    marginBottom: theme.spacing(2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    "& .MuiTabs-indicator": {
      height: 3
    }
  },
  tab: {
    fontWeight: 600,
    fontSize: "0.85rem", // Fonte menor
    minWidth: 100, // Largura mínima menor
    textTransform: "none"
  },
  dateRangeContainer: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    flexWrap: "wrap"
  },
  dateFilterPaper: {
    padding: theme.spacing(1), // Padding menor
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    borderRadius: 10,
    flexWrap: "wrap",
    backgroundColor: "#f9f9f9",
    marginBottom: theme.spacing(2)
  },
  refreshButton: {
    marginLeft: theme.spacing(0.5)
  },
  exportButton: {
    marginLeft: theme.spacing(0.5)
  },
  noDataContainer: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    height: 200, // Altura menor
    color: theme.palette.text.secondary
  },
  loading: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: 200 // Altura menor
  },
  mainContainer: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    overflow: "hidden",
    maxWidth: "100%",
    margin: 0,
    padding: 0
  },
  contentArea: {
    flex: 1,
    overflow: "auto"
  },
  summaryCards: {
    marginBottom: theme.spacing(2)
  },
  summaryCard: {
    borderRadius: 10,
    boxShadow: "0 4px 12px 0 rgba(0,0,0,0.1)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    padding: theme.spacing(1.5), // Padding menor
    transition: "all 0.3s ease",
    height: "100%",
    position: "relative",
    "&:hover": {
      boxShadow: "0 8px 18px 0 rgba(0,0,0,0.15)",
      transform: "translateY(-2px)"
    }
  },
  summaryCardHeader: {
    display: "flex",
    alignItems: "center",
    marginBottom: theme.spacing(1) // Espaçamento menor
  },
  summaryCardIcon: {
    marginRight: theme.spacing(1),
    backgroundColor: theme.palette.primary.main,
    color: "#FFF",
    width: theme.spacing(3.5),
    height: theme.spacing(3.5),
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  summaryCardTitle: {
    fontWeight: 600,
    fontSize: "0.85rem",
    color: theme.palette.text.secondary
  },
  summaryCardValue: {
    fontWeight: 700,
    fontSize: "1.5rem", // Fonte menor
    color: theme.palette.text.primary,
    marginTop: theme.spacing(0.5)
  },
  summaryCardTrend: {
    display: "flex",
    alignItems: "center",
    fontSize: "0.75rem", // Fonte menor
    marginTop: theme.spacing(0.5),
    color: theme.palette.success.main,
    fontWeight: 500
  },
  tabPanel: {
    padding: theme.spacing(0)
  },
  fadeIn: {
    animation: `$fadeIn 0.5s ${theme.transitions.easing.easeInOut}`
  },
  "@keyframes fadeIn": {
    "0%": {
      opacity: 0,
      transform: "translateY(10px)"
    },
    "100%": {
      opacity: 1,
      transform: "translateY(0)"
    }
  },
  // Estilo específico para telas pequenas
  smallScreenDateField: {
    width: "100%",
    maxWidth: 130 // Limita a largura dos campos de data
  },
  compactButton: {
    padding: theme.spacing(0.5, 1) // Botão menor
  },
  smallScreenTooltip: {
    fontSize: "0.75rem" // Tooltip menor
  },
  compactTab: {
    padding: theme.spacing(0.5, 1.5) // Tab menor
  },
  compactCardGrid: {
    "& .MuiGrid-item": {
      paddingTop: theme.spacing(1),
      paddingBottom: theme.spacing(1)
    }
  }
}));

const AnalyticsDashboard = () => {
  const classes = useStyles();
  const history = useHistory();
  const { isEnabled } = useFeatures();
  const { user } = useContext(AuthContext);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isSmallScreen = useMediaQuery("(max-width:1366px)");
  const contentRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState(0);
  const today = new Date();
  const [startDate, setStartDate] = useState(startOfMonth(today));
  const [endDate, setEndDate] = useState(endOfMonth(today));
  const [dashboardData, setDashboardData] = useState(null);

  // Modifique o useEffect para verificar o acesso de forma mais direta
  useEffect(() => {
    const checkAccess = async () => {
      try {
        // Verifica se é super admin (acesso imediato)
        if (user?.super) {
          console.log("Acesso ao Analytics Dashboard como super admin");
          fetchDashboardData();
          return;
        }

        // Verifica apenas a feature específica do analytics_dashboard
        const { data } = await api.get(`/companies/${user.companyId}/features`);

        // Procura pela feature analytics_dashboard nas features existentes
        const hasAnalyticsDashboard = data.existingFeatures?.some(
          feature => feature.name === "analytics_dashboard" && feature.status === true
        );

        if (hasAnalyticsDashboard) {
          console.log("Acesso permitido ao Analytics Dashboard por feature");
          fetchDashboardData();
        } else {
          console.log("Acesso negado ao Analytics Dashboard - feature não habilitada");
          toast.error("Recurso não disponível para sua empresa");
          history.push('/tickets');
        }
      } catch (err) {
        console.error("Erro ao verificar acesso ao Analytics Dashboard:", err);
        toast.error("Erro ao verificar permissões");
        history.push('/tickets');
      }
    };

    checkAccess();
  }, [user, history]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/analytics/dashboard", {
        params: {
          startDate: format(new Date(startDate), 'yyyy-MM-dd'),
          endDate: format(new Date(endDate), 'yyyy-MM-dd')
        }
      });
      setDashboardData(data);
    } catch (err) {
      toast.error("Erro ao carregar dados do dashboard");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuickFilterData = async (period) => {
    try {
      setLoading(true);

      const { data } = await api.get(`/dashboard/period/${period}`);

      // Atualizar as datas no estado para refletir o período selecionado
      if (data.period) {
        setStartDate(parseISO(data.period.startDate));
        setEndDate(parseISO(data.period.endDate));
      }

      setDashboardData(data.data);
    } catch (err) {
      toast.error("Erro ao carregar dados do dashboard");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTab(newValue);
  };

  const handleDateChange = ({ startDate: newStartDate, endDate: newEndDate }) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    fetchDashboardData();
  };

  const handleQuickFilter = (period) => {
    fetchQuickFilterData(period);
  };

  const handleExportPDF = async () => {
    toast.info("Gerando PDF, aguarde...");

    try {
      const pdf = new jsPDF("landscape", "mm", "a4");
      const elements = document.querySelectorAll("[data-chart-container]");

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(16);
      pdf.text("Dashboard de Atendimentos", 14, 22);

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Período: ${format(new Date(startDate), "dd/MM/yyyy", { locale: ptBR })} até ${format(new Date(endDate), "dd/MM/yyyy", { locale: ptBR })}`, 14, 30);

      let verticalOffset = 40;

      for (let i = 0; i < elements.length; i++) {
        const canvas = await html2canvas(elements[i], {
          scale: 2,
          logging: false,
          useCORS: true,
          allowTaint: true
        });

        const imgData = canvas.toDataURL("image/png");
        const imgWidth = 270;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Verificar se precisa de nova página
        if (verticalOffset + imgHeight > 190) {
          pdf.addPage();
          verticalOffset = 20;
        }

        // Adicionar título do gráfico
        const title = elements[i].getAttribute("data-title") || `Gráfico ${i + 1}`;
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        pdf.text(title, 14, verticalOffset);

        // Adicionar imagem do gráfico
        pdf.addImage(imgData, "PNG", 14, verticalOffset + 5, imgWidth, imgHeight);
        verticalOffset += imgHeight + 20;
      }

      pdf.save(`dashboard-atendimentos-${format(new Date(), "dd-MM-yyyy")}.pdf`);
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      toast.error("Erro ao gerar PDF");
    }
  };

  const getSummaryCards = () => {
    if (!dashboardData) return null;

    const totalTickets = dashboardData.ticketsByStatus.reduce(
      (acc, item) => acc + item.count, 0
    );

    const totalClosed = dashboardData.ticketsByStatus.find(
      item => item.status === "closed"
    )?.count || 0;

    const totalPending = dashboardData.ticketsByStatus.find(
      item => item.status === "pending"
    )?.count || 0;

    const totalOpen = dashboardData.ticketsByStatus.find(
      item => item.status === "open"
    )?.count || 0;

    const summaryData = [
      {
        title: "Total",
        value: totalTickets,
        icon: <QueueIcon fontSize={isSmallScreen ? "small" : "default"} />,
        color: theme.palette.primary.main,
      },
      {
        title: "Em Aberto",
        value: totalOpen,
        icon: <WhatsAppIcon fontSize={isSmallScreen ? "small" : "default"} />,
        color: theme.palette.warning.main,
      },
      {
        title: "Pendentes",
        value: totalPending,
        icon: <AccessTimeIcon fontSize={isSmallScreen ? "small" : "default"} />,
        color: theme.palette.info.main,
      },
      {
        title: "Finalizados",
        value: totalClosed,
        icon: <CheckCircleIcon fontSize={isSmallScreen ? "small" : "default"} />,
        color: theme.palette.success.main,
        trend: totalTickets > 0 ? Math.round((totalClosed / totalTickets) * 100) : 0,
      },
    ];

    return (
      <Grid container spacing={isSmallScreen ? 1 : 2} className={classes.summaryCards}>
        {summaryData.map((card, index) => (
          <Grid item xs={6} sm={3} key={index}>
            <Card className={classes.summaryCard} style={{ borderTop: `3px solid ${card.color}` }}>
              <div className={classes.summaryCardHeader}>
                <Box className={classes.summaryCardIcon} style={{ backgroundColor: card.color }}>
                  {card.icon}
                </Box>
                <Typography className={classes.summaryCardTitle}>{card.title}</Typography>
              </div>
              <Typography className={classes.summaryCardValue}>{card.value}</Typography>
              {card.trend !== undefined && (
                <Typography
                  className={classes.summaryCardTrend}
                  style={{ color: "#ff9800" }} // Mudando de vermelho para laranja
                >
                  Taxa: {card.trend}%
                </Typography>
              )}
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  const renderTabContent = () => {
    if (loading) {
      return (
        <div className={classes.loading}>
          <CircularProgress />
        </div>
      );
    }

    if (!dashboardData) {
      return (
        <div className={classes.noDataContainer}>
          <Typography variant="body1">Nenhum dado disponível</Typography>
        </div>
      );
    }

    const spacing = isSmallScreen ? 1 : 3;

    switch (tab) {
      case 0: // Visão Geral
        return (
          <div className={`${classes.fadeIn} ${classes.tabPanel}`}>
            {getSummaryCards()}

            <Grid container spacing={spacing} className={`${classes.cardContainer} ${isSmallScreen ? classes.compactCardGrid : ''}`}>
              <Grid item xs={12} md={6}>
                <Card className={classes.card}>
                  <div className={classes.cardHeader}>
                    <Avatar className={classes.cardIcon}>
                      <CheckCircleIcon fontSize={isSmallScreen ? "small" : "default"} />
                    </Avatar>
                    <Typography className={classes.cardHeaderTitle}>
                      Atendimentos por Status
                    </Typography>
                  </div>
                  <CardContent className={classes.cardContent}>
                    <div
                      className={classes.chartContainer}
                      data-chart-container
                      data-title="Atendimentos por Status"
                    >
                      <StatusChart data={dashboardData.ticketsByStatus} colors={chartColors} />
                    </div>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card className={classes.card}>
                  <div className={classes.cardHeader}>
                    <Avatar className={classes.cardIcon}>
                      <QueueIcon fontSize={isSmallScreen ? "small" : "default"} />
                    </Avatar>
                    <Typography className={classes.cardHeaderTitle}>
                      Atendimentos por Fila
                    </Typography>
                  </div>
                  <CardContent className={classes.cardContent}>
                    <div
                      className={classes.chartContainer}
                      data-chart-container
                      data-title="Atendimentos por Fila"
                    >
                      <QueueChart data={dashboardData.ticketsByQueue} colors={chartColors} />
                    </div>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card className={classes.card}>
                  <div className={classes.cardHeader}>
                    <Avatar className={classes.cardIcon}>
                      <TrendingUpIcon fontSize={isSmallScreen ? "small" : "default"} />
                    </Avatar>
                    <Typography className={classes.cardHeaderTitle}>
                      Evolução de Atendimentos
                    </Typography>
                  </div>
                  <CardContent className={classes.cardContent}>
                    <div
                      className={classes.chartContainer}
                      data-chart-container
                      data-title="Evolução de Atendimentos"
                    >
                      <EvolutionChart data={dashboardData.ticketsEvolution} />
                    </div>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card className={classes.card}>
                  <div className={classes.cardHeader}>
                    <Avatar className={classes.cardIcon}>
                      <LocalOfferIcon fontSize={isSmallScreen ? "small" : "default"} />
                    </Avatar>
                    <Typography className={classes.cardHeaderTitle}>
                      Tags Mais Usadas
                    </Typography>
                  </div>
                  <CardContent className={classes.cardContent}>
                    <div
                      className={classes.chartContainer}
                      data-chart-container
                      data-title="Tags Mais Usadas"
                    >
                      <TagsChart data={dashboardData.topTags} />
                    </div>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </div>
        );

      case 1: // Atendentes
        return (
          <div className={`${classes.fadeIn} ${classes.tabPanel}`}>
            <Grid container spacing={spacing} className={`${classes.cardContainer} ${isSmallScreen ? classes.compactCardGrid : ''}`}>
              <Grid item xs={12}>
                <Card className={classes.card}>
                  <div className={classes.cardHeader}>
                    <Avatar className={classes.cardIcon}>
                      <PeopleIcon fontSize={isSmallScreen ? "small" : "default"} />
                    </Avatar>
                    <Typography className={classes.cardHeaderTitle}>
                      Atendimentos por Atendente
                    </Typography>
                  </div>
                  <CardContent className={classes.cardContent}>
                    <div
                      className={classes.chartContainer}
                      data-chart-container
                      data-title="Atendimentos por Atendente"
                    >
                      <UsersChart data={dashboardData.ticketsByUser} colors={chartColors} />
                    </div>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </div>
        );

      case 2: // Filas e Conexões
        return (
          <div className={`${classes.fadeIn} ${classes.tabPanel}`}>
            <Grid container spacing={spacing} className={`${classes.cardContainer} ${isSmallScreen ? classes.compactCardGrid : ''}`}>
              <Grid item xs={12} md={6}>
                <Card className={classes.card}>
                  <div className={classes.cardHeader}>
                    <Avatar className={classes.cardIcon}>
                      <QueueIcon fontSize={isSmallScreen ? "small" : "default"} />
                    </Avatar>
                    <Typography className={classes.cardHeaderTitle}>
                      Atendimentos por Fila
                    </Typography>
                  </div>
                  <CardContent className={classes.cardContent}>
                    <div
                      className={classes.chartContainer}
                      data-chart-container
                      data-title="Atendimentos por Fila"
                    >
                      <QueueChart data={dashboardData.ticketsByQueue} colors={chartColors} />
                    </div>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card className={classes.card}>
                  <div className={classes.cardHeader}>
                    <Avatar className={classes.cardIcon}>
                      <SpeedIcon fontSize={isSmallScreen ? "small" : "default"} />
                    </Avatar>
                    <Typography className={classes.cardHeaderTitle}>
                      Eficiência por Fila
                    </Typography>
                  </div>
                  <CardContent className={classes.cardContent}>
                    <div
                      className={classes.chartContainer}
                      data-chart-container
                      data-title="Eficiência por Fila"
                    >
                      <QueueEfficiencyChart data={dashboardData.queueEfficiency} colors={chartColors} />
                    </div>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card className={classes.card}>
                  <div className={classes.cardHeader}>
                    <Avatar className={classes.cardIcon}>
                      <WhatsAppIcon fontSize={isSmallScreen ? "small" : "default"} />
                    </Avatar>
                    <Typography className={classes.cardHeaderTitle}>
                      Atendimentos por Conexão
                    </Typography>
                  </div>
                  <CardContent className={classes.cardContent}>
                    <div
                      className={classes.chartContainer}
                      data-chart-container
                      data-title="Atendimentos por Conexão"
                    >
                      <WhatsappChart data={dashboardData.ticketsByWhatsapp} colors={chartColors} />
                    </div>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </div>
        );

      case 3: // Tempo
        return (
          <div className={`${classes.fadeIn} ${classes.tabPanel}`}>
            <Grid container spacing={spacing} className={`${classes.cardContainer} ${isSmallScreen ? classes.compactCardGrid : ''}`}>
              <Grid item xs={12} md={6}>
                <Card className={classes.card}>
                  <div className={classes.cardHeader}>
                    <Avatar className={classes.cardIcon}>
                      <AccessTimeIcon fontSize={isSmallScreen ? "small" : "default"} />
                    </Avatar>
                    <Typography className={classes.cardHeaderTitle}>
                      Atendimentos por Dia da Semana
                    </Typography>
                  </div>
                  <CardContent className={classes.cardContent}>
                    <div
                      className={classes.chartContainer}
                      data-chart-container
                      data-title="Atendimentos por Dia da Semana"
                    >
                      <TimeChart data={dashboardData.ticketsByTime?.byDay} type="day" colors={chartColors} />
                    </div>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card className={classes.card}>
                  <div className={classes.cardHeader}>
                    <Avatar className={classes.cardIcon}>
                      <AccessTimeIcon fontSize={isSmallScreen ? "small" : "default"} />
                    </Avatar>
                    <Typography className={classes.cardHeaderTitle}>
                      Atendimentos por Hora
                    </Typography>
                  </div>
                  <CardContent className={classes.cardContent}>
                    <div
                      className={classes.chartContainer}
                      data-chart-container
                      data-title="Atendimentos por Hora"
                    >
                      <TimeChart data={dashboardData.ticketsByTime?.byHour} type="hour" colors={chartColors} />                    </div>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <MainContainer className={classes.mainContainer}>
      <MainHeader>
        <Title>{isSmallScreen ? "Dashboard" : "Dashboard de Análise"}</Title>
        <MainHeaderButtonsWrapper>
          <Tooltip title="Exportar para PDF" classes={{ tooltip: isSmallScreen ? classes.smallScreenTooltip : "" }}>
            <IconButton
              color="primary"
              className={classes.exportButton}
              onClick={handleExportPDF}
              size={isSmallScreen ? "small" : "medium"}
            >
              <GetAppIcon fontSize={isSmallScreen ? "small" : "default"} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Atualizar dados" classes={{ tooltip: isSmallScreen ? classes.smallScreenTooltip : "" }}>
            <IconButton
              color="primary"
              className={classes.refreshButton}
              onClick={fetchDashboardData}
              size={isSmallScreen ? "small" : "medium"}
            >
              <RefreshIcon fontSize={isSmallScreen ? "small" : "default"} />
            </IconButton>
          </Tooltip>
        </MainHeaderButtonsWrapper>
      </MainHeader>

      <Paper className={classes.mainPaper} ref={contentRef}>
        <PeriodFilter
          startDate={startDate}
          endDate={endDate}
          onDateChange={handleDateChange}
          onQuickFilter={handleQuickFilter}
        />

        <Tabs
          value={tab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant={isMobile || isSmallScreen ? "scrollable" : "fullWidth"}
          scrollButtons="auto"
          className={classes.tabsContainer}
        >
          <Tab className={`${classes.tab} ${isSmallScreen ? classes.compactTab : ""}`} label="Visão Geral" />
          <Tab className={`${classes.tab} ${isSmallScreen ? classes.compactTab : ""}`} label="Atendentes" />
          <Tab className={`${classes.tab} ${isSmallScreen ? classes.compactTab : ""}`} label="Filas" />
          <Tab className={`${classes.tab} ${isSmallScreen ? classes.compactTab : ""}`} label="Tempo" />
        </Tabs>

        <div className={classes.contentArea}>
          {renderTabContent()}
        </div>
      </Paper>
    </MainContainer>
  );
};

export default AnalyticsDashboard;