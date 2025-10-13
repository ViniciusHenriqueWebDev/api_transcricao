import React, { useState, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Typography,
  Collapse,
  Box,
  LinearProgress,
  Tooltip,
  Grid,
  Chip,
  useMediaQuery,
  Card,
  CardContent,
  Divider
} from "@material-ui/core";
import SearchIcon from "@material-ui/icons/Search";
import AddIcon from "@material-ui/icons/Add";
import EditIcon from "@material-ui/icons/Edit";
import DeleteIcon from "@material-ui/icons/Delete";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import ExpandLessIcon from "@material-ui/icons/ExpandLess";
import WhatsAppIcon from "@material-ui/icons/WhatsApp";
import EmojiEventsIcon from '@material-ui/icons/EmojiEvents';
import CardGiftcardIcon from '@material-ui/icons/CardGiftcard';
import MonetizationOnIcon from '@material-ui/icons/MonetizationOn';
import FlagIcon from '@material-ui/icons/Flag';
import { toast } from "react-toastify";
import { format } from "date-fns";
import ptBR from "date-fns/locale/pt-BR";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import GoalModal from "./GoalModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import ProgressUpdateModal from "./ProgressUpdateModal";
import SendWhatsappModal from "./SendWhatsappModal";


const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1),
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    maxHeight: '100%',
    boxSizing: 'border-box',
    [theme.breakpoints.down('sm')]: {
      padding: theme.spacing(1, 0),
    },
  },
  contentContainer: {
    flex: 1,
    overflowY: 'auto',
    ...theme.scrollbarStyles,
    padding: theme.spacing(0, 1),
  },
  toolbarContainer: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: theme.spacing(1),
    marginBottom: theme.spacing(2),
    padding: theme.spacing(0, 1),
    [theme.breakpoints.down('xs')]: {
      flexDirection: "column",
    },
  },
  searchBox: {
    width: "50%",
    [theme.breakpoints.down('sm')]: {
      width: "100%",
    },
  },
  tableContainer: {
    overflowX: "auto",
    [theme.breakpoints.down('sm')]: {
      maxWidth: "100vw",
    },
  },
  progressBar: {
    height: 8,
    borderRadius: 20,
  },
  expandedRow: {
    backgroundColor: "rgba(0, 0, 0, 0.03)",
  },
  expandedContent: {
    maxHeight: '70vh',
    overflow: 'auto',
    ...theme.scrollbarStyles,
  },
  employeeCard: {
    margin: theme.spacing(1),
    padding: theme.spacing(2),
    border: "1px solid #ddd",
    borderRadius: 4,
    height: '100%',
  },

  progressLabel: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 4,
  },
  chipSuccess: {
    backgroundColor: "#4caf50",
    color: "white",
  },
  chipDanger: {
    backgroundColor: "#f44336",
    color: "white",
  },
  chipWarning: {
    backgroundColor: "#ff9800",
    color: "white",
  },
  rewardCard: {
    padding: theme.spacing(2),
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(2),
    border: '1px solid rgba(0, 0, 0, 0.12)',
    borderRadius: theme.shape.borderRadius,
  },
  rewardTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  rewardIcon: {
    color: theme.palette.primary.main,
  },
  mobileCard: {
    marginBottom: theme.spacing(2),
  },
  mobileCardActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: theme.spacing(1),
  },
  chipContainer: {
    display: 'flex',
    gap: theme.spacing(0.5),
    marginTop: theme.spacing(1),
    flexWrap: 'wrap',
  },
  employeeCardsContainer: {
    maxHeight: '400px',
    overflowY: 'auto',
    ...theme.scrollbarStyles,
    padding: theme.spacing(1),
  },
  rewardSection: {
    background: 'linear-gradient(to right, #f7f9fc, #edf1f7)',
    borderRadius: theme.shape.borderRadius * 2,
    border: '1px solid rgba(0,0,0,0.07)',
    boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
  },
  rewardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    marginBottom: theme.spacing(2),
    borderBottom: '1px solid rgba(0,0,0,0.08)',
    paddingBottom: theme.spacing(1.5),
  },
  rewardTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: theme.palette.primary.dark,
  },
  rewardIcon: {
    color: '#f9a825',
    fontSize: '1.8rem',
    background: 'rgba(249, 168, 37, 0.1)',
    padding: theme.spacing(0.7),
    borderRadius: '50%',
  },
  descriptionBox: {
    background: 'rgba(255,255,255,0.7)',
    borderRadius: theme.shape.borderRadius,
    border: '1px solid rgba(0,0,0,0.05)',
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2.5),
    position: 'relative',
  },
  descriptionLabel: {
    position: 'absolute',
    top: -12,
    left: 12,
    background: '#fff',
    padding: '0 8px',
    fontSize: '0.8rem',
    color: theme.palette.text.secondary,
    fontWeight: 500,
  },
  rewardInfoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: theme.spacing(2.5),
    marginTop: theme.spacing(2),
  },
  rewardInfoItem: {
    background: 'white',
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(1.5),
    border: '1px solid rgba(0,0,0,0.07)',
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(1),
  },
  rewardInfoLabel: {
    fontSize: '0.9rem',
    color: theme.palette.text.secondary,
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  rewardInfoValue: {
    fontSize: '1.1rem',
    fontWeight: 500,
  },
  rewardValueHighlight: {
    fontSize: '1.2rem',
    fontWeight: 600,
    color: '#0d47a1',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  statusChipPendente: {
    backgroundColor: '#ffecb3',
    color: '#ff6f00',
    fontWeight: 500,
  },
  statusChipAprovada: {
    backgroundColor: '#e3f2fd',
    color: '#1976d2',
    fontWeight: 500,
  },
  statusChipEntregue: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    fontWeight: 500,
  },
  rewardDescriptionIcon: {
    fontSize: '1.1rem',
    color: theme.palette.text.secondary,
    marginRight: theme.spacing(0.5),
  },
  productItem: {
    backgroundColor: 'rgba(63, 81, 181, 0.08)',
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(1),
    marginTop: theme.spacing(1),
    border: '1px solid rgba(63, 81, 181, 0.15)',
  },
  productHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(0.5),
  },
  productName: {
    fontWeight: 500,
    fontSize: '0.9rem',
    color: theme.palette.primary.dark,
  },
  productProgress: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: theme.spacing(0.5),
    fontSize: '0.8rem',
  },
  metricTypeChip: {
    margin: theme.spacing(0, 0.5),
    backgroundColor: theme.palette.primary.light,
    color: 'white',
    fontWeight: 500,
    fontSize: '0.7rem',
  },
  metricBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '3px 8px',
    borderRadius: 12,
    fontSize: '0.75rem',
    fontWeight: 500,
    marginLeft: theme.spacing(1),
    backgroundColor: theme.palette.info.light,
    color: theme.palette.info.contrastText,
  },
  productGoalBadge: {
    backgroundColor: theme.palette.secondary.main,
    color: 'white',
    fontWeight: 500,
    marginLeft: theme.spacing(2),
    padding: theme.spacing(0.5, 1.5),
    borderRadius: theme.shape.borderRadius,
    display: 'inline-flex',
    alignItems: 'center',
    fontSize: '0.8rem',
  },
  productSummary: {
    background: 'rgba(63, 81, 181, 0.05)',
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(3),
    border: '1px solid rgba(63, 81, 181, 0.15)',
  },
  productSummaryTitle: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: theme.spacing(1),
    color: theme.palette.primary.dark,
    fontWeight: 500,
  },
  productSummaryIcon: {
    marginRight: theme.spacing(1),
    color: theme.palette.primary.main,
  },
  productList: {
    marginTop: theme.spacing(1),
  },
  productEmployeeGroup: {
    border: '1px solid rgba(0, 0, 0, 0.08)',
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(2),
    overflow: 'hidden',
  },
  productEmployeeHeader: {
    background: 'rgba(0, 0, 0, 0.03)',
    padding: theme.spacing(1, 2),
    borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productEmployeeContent: {
    padding: theme.spacing(2),
  },
  productTable: {
    width: '100%',
    borderCollapse: 'collapse',
    '& th': {
      textAlign: 'left',
      padding: theme.spacing(1),
      borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
      color: theme.palette.text.secondary,
      fontWeight: 500,
    },
    '& td': {
      padding: theme.spacing(1),
      borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
    },
  },
  progressColumn: {
    width: '30%',
  },
}));

const GoalsList = () => {
  const classes = useStyles();
  const [loading, setLoading] = useState(false);
  const [goals, setGoals] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);
  const [searchParam, setSearchParam] = useState("");
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deleteGoal, setDeleteGoal] = useState(null);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [selectedEmployeeGoal, setSelectedEmployeeGoal] = useState(null);
  const [selectedParentGoal, setSelectedParentGoal] = useState(null);
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [selectedEmployeeForMessage, setSelectedEmployeeForMessage] = useState(null);
  const [selectedGoalForMessage, setSelectedGoalForMessage] = useState(null);

  // Detectar tamanho de tela
  const isMobile = useMediaQuery(theme => theme.breakpoints.down('sm'));

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/goals", {
        params: { searchParam },
      });
      setGoals(data.goals);
    } catch (err) {
      toast.error("Erro ao buscar as metas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [searchParam]);

  const handleExpandRow = (goalId) => {
    setExpandedRow(expandedRow === goalId ? null : goalId);
  };

  const handleOpenGoalModal = (goal = null) => {
    setSelectedGoal(goal);
    setGoalModalOpen(true);
  };

  const handleCloseGoalModal = () => {
    setSelectedGoal(null);
    setGoalModalOpen(false);
  };

  const handleSaveGoal = async () => {
    await fetchGoals();
    setGoalModalOpen(false);
  };

  const handleDeleteClick = (goal) => {
    setDeleteGoal(goal);
    setConfirmModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await api.delete(`/goals/${deleteGoal.id}`);
      toast.success("Meta excluída com sucesso!");
      fetchGoals();
    } catch (err) {
      toast.error("Erro ao excluir a meta");
    }
    setConfirmModalOpen(false);
    setDeleteGoal(null);
  };

  const handleCancelDelete = () => {
    setConfirmModalOpen(false);
    setDeleteGoal(null);
  };

  const getStatusChip = (goal) => {
    const progress = Math.round((goal.current / goal.target) * 100);
    const now = new Date();
    const endDate = new Date(goal.endDate);
    const isExpired = now > endDate;

    if (progress >= 100) {
      return <Chip label="Concluída" className={classes.chipSuccess} />;
    } else if (isExpired) {
      return <Chip label="Expirada" className={classes.chipDanger} />;
    } else if (progress < 30) {
      return <Chip label="Em risco" className={classes.chipDanger} />;
    } else if (progress < 70) {
      return <Chip label="Em andamento" className={classes.chipWarning} />;
    } else {
      return <Chip label="Avançada" className={classes.chipWarning} />;
    }
  };

  const handleOpenProgressModal = (employeeGoal, parentGoal) => {
    setSelectedEmployeeGoal(employeeGoal);
    setSelectedParentGoal(parentGoal);
    setProgressModalOpen(true);
  };

  const handleCloseProgressModal = () => {
    setSelectedEmployeeGoal(null);
    setSelectedParentGoal(null);
    setProgressModalOpen(false);
  };

  const handleUpdateProgress = async () => {
    await fetchGoals();
    setProgressModalOpen(false);
  };

  const handleOpenWhatsappModal = async (employeeGoal, goal) => {
    try {
      // Buscar dados completos do funcionário para garantir que temos o phone
      const { data } = await api.get(`/employees/${employeeGoal.employee.id}`);

      if (!data) {
        toast.error("Não foi possível obter dados do funcionário");
        return;
      }

      // Usar o funcionário retornado pela API, que deve conter todos os dados incluindo o phone
      const employeeWithFullData = data.employee || data;

      setSelectedEmployeeForMessage(employeeWithFullData);
      setSelectedGoalForMessage(goal);
      setWhatsappModalOpen(true);
    } catch (error) {
      console.error("Erro ao buscar dados completos do funcionário:", error);
      toast.error("Não foi possível preparar a mensagem. Tente novamente.");
    }
  };

  const handleCloseWhatsappModal = () => {
    setSelectedEmployeeForMessage(null);
    setSelectedGoalForMessage(null);
    setWhatsappModalOpen(false);
  };

  // Renderização móvel ou desktop baseada na largura da tela
  const renderGoalsList = () => {
    if (loading) {
      return (
        <Box p={2} textAlign="center">
          <Typography>Carregando...</Typography>
        </Box>
      );
    }

    if (goals.length === 0) {
      return (
        <Box p={2} textAlign="center">
          <Typography>Nenhuma meta encontrada</Typography>
        </Box>
      );
    }

    if (isMobile) {
      return goals.map((goal) => renderMobileGoalCard(goal));
    } else {
      return renderDesktopTable();
    }
  };

  const renderMobileGoalCard = (goal) => {
    const isExpanded = expandedRow === goal.id;
    const progress = Math.round((goal.current / goal.target) * 100) || 0;
    const isProductType = goal.metricType === 'produto';

    return (
      <Card className={classes.mobileCard} key={goal.id}>
        <CardContent>
          <Typography variant="h6" gutterBottom>{goal.name}</Typography>

          <Box mb={1}>
            <Typography variant="body2" color="textSecondary">Campanha</Typography>
            <Typography>{goal.performanceCampaign ? goal.performanceCampaign.name : "-"}</Typography>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="textSecondary">Tipo de Métrica</Typography>
              <Box display="flex" alignItems="center">
                <Typography>
                  {goal.metricType === 'quantidade' ? 'Quantidade' :
                    goal.metricType === 'valor' ? 'Valor (R$)' :
                      goal.metricType === 'percentual' ? 'Percentual (%)' : 'Produto'}
                </Typography>
                {isProductType && (
                  <Chip
                    size="small"
                    label="Produto"
                    className={classes.metricTypeChip}
                  />
                )}
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="body2" color="textSecondary">Meta</Typography>
              <Typography>{goal.target}</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="body2" color="textSecondary">Atual</Typography>
              <Typography>{goal.current}</Typography>
            </Grid>
          </Grid>

          <Box mt={2}>
            <Typography variant="body2" color="textSecondary">Progresso</Typography>
            <Box display="flex" alignItems="center" mt={0.5}>
              <Box width="100%" mr={1}>
                <LinearProgress
                  className={classes.progressBar}
                  variant="determinate"
                  value={progress > 100 ? 100 : progress}
                  color={progress < 30 ? "secondary" : "primary"}
                />
              </Box>
              <Box minWidth={35}>
                <Typography variant="body2">{`${progress}%`}</Typography>
              </Box>
            </Box>
            <Box mt={1}>
              {getStatusChip(goal)}
            </Box>
          </Box>

          <Box mt={2} display="flex" justifyContent="space-between">
            <Button
              variant="outlined"
              size="small"
              onClick={() => handleExpandRow(goal.id)}
              startIcon={isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            >
              {isExpanded ? "Fechar" : "Detalhes"}
            </Button>
            <Box>
              <IconButton
                size="small"
                onClick={() => handleOpenGoalModal(goal)}
              >
                <EditIcon />
              </IconButton>
              <IconButton
                size="small"
                onClick={() => handleDeleteClick(goal)}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          </Box>

          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <Box mt={2}>
              <Divider />
              <Box className={classes.rewardCard}>
                <Box className={classes.rewardTitle}>
                  <EmojiEventsIcon className={classes.rewardIcon} />
                  <Typography variant="h6">Premiação</Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="textSecondary">Descrição:</Typography>
                    <Typography variant="body1">{goal.reward || "Não definida"}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="body2" color="textSecondary">Status:</Typography>
                    <Chip
                      label={goal.rewardStatus === "pendente" ? "Pendente" :
                        goal.rewardStatus === "aprovada" ? "Aprovada" : "Entregue"}
                      color={
                        goal.rewardStatus === "pendente" ? "default" :
                          goal.rewardStatus === "aprovada" ? "primary" : "secondary"
                      }
                      size="small"
                    />
                  </Grid>
                </Grid>
              </Box>
              <Typography variant="h6" gutterBottom mt={2}>
                Progresso Individual dos Funcionários
              </Typography>

              <div className={classes.chipContainer}>
                <Chip
                  label={`${goal.employeeGoals?.length || 0} funcionário(s) associado(s)`}
                  variant="outlined"
                  size="small"
                />
                <Chip
                  label={`Média dos progressos`}
                  variant="outlined"
                  size="small"
                />
              </div>
              <div className={classes.employeeCardsContainer}>
                <Grid container spacing={1}>
                  {goal.employeeGoals?.map((employeeGoal) => renderEmployeeGoalCard(employeeGoal, goal))}
                </Grid>
              </div>
            </Box>
          </Collapse>
        </CardContent>
      </Card>
    );
  };

  const renderEmployeeGoalCard = (employeeGoal, goal) => {
    // Verificar se é uma meta do tipo produto
    const isProductType = goal.metricType === 'produto';

    // Para metas normais, manter o comportamento atual
    if (!isProductType) {
      const current = employeeGoal.individualCurrent || 0;
      const target = employeeGoal.individualTarget || goal.target || 1;
      const empProgress = target > 0 ? Math.round((current / target) * 100) : 0;

      return (
        <Grid item xs={12} sm={6} md={4} key={employeeGoal.id}>
          <div className={classes.employeeCard}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle1" noWrap>
                {employeeGoal.employee?.name || "Funcionário"}
              </Typography>
              <Box>
                <Tooltip title="Atualizar progresso">
                  <IconButton
                    size="small"
                    onClick={() => handleOpenProgressModal(employeeGoal, goal)}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Enviar mensagem pelo WhatsApp">
                  <IconButton
                    size="small"
                    color="primary"
                    onClick={() => handleOpenWhatsappModal(employeeGoal, goal)}
                  >
                    <WhatsAppIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            <Box mt={1} mb={2}>
              <LinearProgress
                className={classes.progressBar}
                variant="determinate"
                value={empProgress > 100 ? 100 : empProgress}
                color={empProgress < 30 ? "secondary" : "primary"}
              />
              <div className={classes.progressLabel}>
                <Typography variant="caption">
                  {`${empProgress}%`}
                </Typography>
                <Typography variant="caption">
                  {`${current}/${target}`}
                </Typography>
              </div>
            </Box>
            <Typography variant="caption" color="textSecondary">
              {empProgress < 30 ? "Em risco" : (empProgress < 70 ? "Em andamento" : "Avançada")}
            </Typography>
          </div>
        </Grid>
      );
    }

    // Para metas do tipo produto, agrupar por funcionário
    // Obter todos os produtos associados ao funcionário atual
    const employeeProducts = goal.employeeGoals.filter(
      eg => eg.employeeId === employeeGoal.employeeId
    );

    // Calcular o progresso total para todos os produtos deste funcionário
    const totalTarget = employeeProducts.reduce((sum, p) => sum + (p.individualTarget || 0), 0);
    const totalCurrent = employeeProducts.reduce((sum, p) => sum + (p.individualCurrent || 0), 0);
    const totalProgress = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;

    // Só renderizar um card por funcionário (evitar duplicatas)
    // Verificar se este é o primeiro produto do funcionário
    const isFirstProductForEmployee = employeeProducts[0]?.id === employeeGoal.id;
    if (!isFirstProductForEmployee) return null;

    return (
      <Grid item xs={12} sm={6} md={4} key={`employee-${employeeGoal.employeeId}`}>
        <div className={classes.employeeCard}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="subtitle1" noWrap>
              {employeeGoal.employee?.name || "Funcionário"}
            </Typography>
            <Box>
              <Tooltip title="Enviar mensagem pelo WhatsApp">
                <IconButton
                  size="small"
                  color="primary"
                  onClick={() => handleOpenWhatsappModal(employeeGoal, goal)}
                >
                  <WhatsAppIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Box mt={1} mb={1}>
            <Typography variant="body2" color="textSecondary">Progresso Geral</Typography>
            <LinearProgress
              className={classes.progressBar}
              variant="determinate"
              value={totalProgress > 100 ? 100 : totalProgress}
              color={totalProgress < 30 ? "secondary" : "primary"}
            />
            <div className={classes.progressLabel}>
              <Typography variant="caption">
                {`${totalProgress}%`}
              </Typography>
              <Typography variant="caption">
                {`${totalCurrent}/${totalTarget}`}
              </Typography>
            </div>
          </Box>

          <Typography variant="body2" color="primary" gutterBottom>
            Produtos ({employeeProducts.length})
          </Typography>

          {employeeProducts.map(product => {
            const productProgress = product.individualTarget > 0
              ? Math.round((product.individualCurrent / product.individualTarget) * 100)
              : 0;

            return (
              <div key={product.id} className={classes.productItem}>
                <div className={classes.productHeader}>
                  <Typography className={classes.productName}>
                    {product.productName || "Produto"}
                  </Typography>
                  <Tooltip title="Atualizar progresso">
                    <IconButton
                      size="small"
                      onClick={() => handleOpenProgressModal(product, goal)}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </div>

                <LinearProgress
                  className={classes.progressBar}
                  variant="determinate"
                  value={productProgress > 100 ? 100 : productProgress}
                  color={productProgress < 30 ? "secondary" : "primary"}
                />

                <div className={classes.productProgress}>
                  <Typography variant="caption">
                    {`${productProgress}%`}
                  </Typography>
                  <Typography variant="caption">
                    {`${product.individualCurrent || 0}/${product.individualTarget || 0}`}
                  </Typography>
                </div>
              </div>
            );
          })}
        </div>
      </Grid>
    );
  };

  const renderDesktopTable = () => (
    <TableContainer component={Paper} className={classes.tableContainer}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell style={{ width: 50 }}></TableCell>
            <TableCell>Nome</TableCell>
            <TableCell>Campanha</TableCell>
            <TableCell>Tipo de Métrica</TableCell>
            <TableCell>Meta</TableCell>
            <TableCell>Atual</TableCell>
            <TableCell>Progresso</TableCell>
            <TableCell align="center">Ações</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {goals.map((goal) => {
            const isExpanded = expandedRow === goal.id;
            const progress = Math.round((goal.current / goal.target) * 100) || 0;
            const isProductType = goal.metricType === 'produto';

            return (
              <React.Fragment key={goal.id}>
                <TableRow
                  hover
                  onClick={() => handleExpandRow(goal.id)}
                  className={isExpanded ? classes.expandedRow : ""}
                >
                  <TableCell>
                    <IconButton size="small">
                      {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                  </TableCell>
                  <TableCell>{goal.name}</TableCell>
                  <TableCell>
                    {goal.performanceCampaign ? goal.performanceCampaign.name : "-"}
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      {goal.metricType === 'quantidade' ? 'Quantidade' :
                        goal.metricType === 'valor' ? 'Valor (R$)' :
                          goal.metricType === 'percentual' ? 'Percentual (%)' :
                            <span className={classes.metricBadge}>Produto</span>}
                    </Box>
                  </TableCell>
                  <TableCell>{goal.target}</TableCell>
                  <TableCell>{goal.current}</TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      <Box width="100%" mr={1}>
                        <LinearProgress
                          className={classes.progressBar}
                          variant="determinate"
                          value={progress > 100 ? 100 : progress}
                          color={progress < 30 ? "secondary" : "primary"}
                        />
                      </Box>
                      <Box minWidth={35}>
                        <Typography variant="body2">{`${progress}%`}</Typography>
                      </Box>
                      {getStatusChip(goal)}
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Editar">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenGoalModal(goal);
                        }}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(goal);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell style={{ padding: 0 }} colSpan={8}>
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                      <Box margin={3}>
                        <div className={classes.rewardSection}>
                          <div className={classes.rewardHeader}>
                            <EmojiEventsIcon className={classes.rewardIcon} />
                            <Typography className={classes.rewardTitle}>Premiação</Typography>
                          </div>

                          <div className={classes.descriptionBox}>
                            <span className={classes.descriptionLabel}>Descrição da Meta</span>
                            <Typography variant="body1">
                              {goal.description || "Nenhuma descrição fornecida"}
                            </Typography>
                          </div>

                          <div className={classes.rewardInfoGrid}>
                            <div className={classes.rewardInfoItem}>
                              <Typography className={classes.rewardInfoLabel}>
                                <CardGiftcardIcon fontSize="small" className={classes.rewardDescriptionIcon} />
                                Descrição da premiação
                              </Typography>
                              <Typography className={classes.rewardInfoValue}>
                                {goal.reward || "Não definida"}
                              </Typography>
                            </div>

                            <div className={classes.rewardInfoItem}>
                              <Typography className={classes.rewardInfoLabel}>
                                <FlagIcon fontSize="small" className={classes.rewardDescriptionIcon} />
                                Status da premiação
                              </Typography>
                              <Chip
                                label={goal.rewardStatus === "pendente" ? "Pendente" :
                                  goal.rewardStatus === "aprovada" ? "Aprovada" : "Entregue"}
                                className={
                                  goal.rewardStatus === "pendente" ? classes.statusChipPendente :
                                    goal.rewardStatus === "aprovada" ? classes.statusChipAprovada : classes.statusChipEntregue
                                }
                                size="small"
                              />
                            </div>

                            {goal.rewardValue && (
                              <div className={classes.rewardInfoItem}>
                                <Typography className={classes.rewardInfoLabel}>
                                  <MonetizationOnIcon fontSize="small" className={classes.rewardDescriptionIcon} />
                                  Valor da premiação
                                </Typography>
                                <Typography className={classes.rewardValueHighlight}>
                                  {typeof goal.rewardValue === 'number'
                                    ? goal.rewardValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                                    : goal.rewardValue
                                  }
                                </Typography>
                              </div>
                            )}
                          </div>
                        </div>

                        <Typography variant="h6" gutterBottom>
                          Progresso Individual dos Funcionários
                          {isProductType && (
                            <span className={classes.productGoalBadge}>
                              Meta por Produto
                            </span>
                          )}
                        </Typography>
                        {isProductType && (
                          <div className={classes.productSummary}>
                            <Typography className={classes.productSummaryTitle}>
                              <CardGiftcardIcon className={classes.productSummaryIcon} />
                              Resumo dos Produtos
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              Esta meta é baseada em produtos individuais para cada funcionário.
                              O progresso geral é calculado a partir do progresso de todos os produtos associados.
                            </Typography>
                          </div>
                        )}
                        <Box marginTop={2} marginBottom={2}>
                          {isProductType ? (
                            <Chip
                              label={`${Array.from(new Set(goal.employeeGoals.map(eg => eg.employeeId))).length} funcionário(s) com ${goal.employeeGoals.length} produto(s) associado(s)`}
                              variant="outlined"
                            />
                          ) : (
                            <Chip
                              label={`${goal.employeeGoals?.length || 0} funcionário(s) associado(s) a esta meta`}
                              variant="outlined"
                            />
                          )}
                        </Box>
                        {isProductType ? (
                          <div className={classes.productList}>
                            {/* Agrupar por funcionário */}
                            {Array.from(new Set(goal.employeeGoals.map(eg => eg.employeeId))).map(empId => {
                              const employeeProducts = goal.employeeGoals.filter(eg => eg.employeeId === empId);
                              const employee = employeeProducts[0]?.employee;
                              if (!employee) return null;

                              // Calcular progresso total para este funcionário
                              const totalTarget = employeeProducts.reduce((sum, p) => sum + (p.individualTarget || 0), 0);
                              const totalCurrent = employeeProducts.reduce((sum, p) => sum + (p.individualCurrent || 0), 0);
                              const totalProgress = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;

                              return (
                                <div key={empId} className={classes.productEmployeeGroup}>
                                  <div className={classes.productEmployeeHeader}>
                                    <Typography variant="subtitle1">
                                      {employee.name}
                                    </Typography>
                                    <Box display="flex" alignItems="center">
                                      <Typography variant="body2" style={{ marginRight: 16 }}>
                                        Progresso total: {totalProgress}% ({totalCurrent}/{totalTarget})
                                      </Typography>
                                      <Tooltip title="Enviar mensagem pelo WhatsApp">
                                        <IconButton
                                          size="small"
                                          color="primary"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenWhatsappModal(employeeProducts[0], goal);
                                          }}
                                        >
                                          <WhatsAppIcon fontSize="small" />
                                        </IconButton>
                                      </Tooltip>
                                    </Box>
                                  </div>
                                  <div className={classes.productEmployeeContent}>
                                    <table className={classes.productTable}>
                                      <thead>
                                        <tr>
                                          <th>Produto</th>
                                          <th>Meta</th>
                                          <th>Atual</th>
                                          <th className={classes.progressColumn}>Progresso</th>
                                          <th>Ações</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {employeeProducts.map(product => {
                                          const productProgress = product.individualTarget > 0
                                            ? Math.round((product.individualCurrent / product.individualTarget) * 100)
                                            : 0;

                                          return (
                                            <tr key={product.id}>
                                              <td>{product.productName || "Produto"}</td>
                                              <td>{product.individualTarget}</td>
                                              <td>{product.individualCurrent}</td>
                                              <td>
                                                <Box display="flex" alignItems="center">
                                                  <Box width="100%" mr={1}>
                                                    <LinearProgress
                                                      className={classes.progressBar}
                                                      variant="determinate"
                                                      value={productProgress > 100 ? 100 : productProgress}
                                                      color={productProgress < 30 ? "secondary" : "primary"}
                                                    />
                                                  </Box>
                                                  <Box minWidth={35}>
                                                    <Typography variant="caption">{`${productProgress}%`}</Typography>
                                                  </Box>
                                                </Box>
                                              </td>
                                              <td>
                                                <Tooltip title="Atualizar progresso">
                                                  <IconButton
                                                    size="small"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleOpenProgressModal(product, goal);
                                                    }}
                                                  >
                                                    <EditIcon fontSize="small" />
                                                  </IconButton>
                                                </Tooltip>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className={classes.employeeCardsContainer}>
                            <Grid container spacing={2}>
                              {goal.employeeGoals?.map((employeeGoal) => renderEmployeeGoalCard(employeeGoal, goal))}
                            </Grid>
                          </div>
                        )}
                      </Box>
                    </Collapse>
                  </TableCell>
                </TableRow>
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Paper className={classes.mainPaper} elevation={0}>
      <div className={classes.toolbarContainer}>
        <TextField
          className={classes.searchBox}
          placeholder="Buscar meta..."
          value={searchParam}
          onChange={(e) => setSearchParam(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
          variant="outlined"
          size="small"
          fullWidth={isMobile}
        />

        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenGoalModal()}
          fullWidth={isMobile}
        >
          NOVA META
        </Button>
      </div>

      <div className={classes.contentContainer}>
        {renderGoalsList()}
      </div>

      <GoalModal
        open={goalModalOpen}
        onClose={handleCloseGoalModal}
        goalData={selectedGoal}
        onSave={handleSaveGoal}
      />

      <ConfirmationModal
        title="Excluir Meta"
        open={confirmModalOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      >
        Tem certeza que deseja excluir esta meta?
      </ConfirmationModal>
      <ProgressUpdateModal
        open={progressModalOpen}
        onClose={handleCloseProgressModal}
        employeeGoal={selectedEmployeeGoal}
        parentGoal={selectedParentGoal}
        onSave={handleUpdateProgress}
      />
      <SendWhatsappModal
        open={whatsappModalOpen}
        onClose={handleCloseWhatsappModal}
        employee={selectedEmployeeForMessage}
        goal={selectedGoalForMessage}
      />
    </Paper>
  );
};

export default GoalsList;