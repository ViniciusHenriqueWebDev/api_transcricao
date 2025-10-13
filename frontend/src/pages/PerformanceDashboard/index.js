import React, { useState, useEffect, useRef } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
  Paper,
  Typography,
  Grid,
  Tabs,
  Tab,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  IconButton,
  Tooltip,
  Box,
  CircularProgress
} from "@material-ui/core";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis, 
  LabelList,
  ComposedChart
} from "recharts";
import SaveAltIcon from "@material-ui/icons/SaveAlt";
import FilterListIcon from "@material-ui/icons/FilterList";
import PictureAsPdfIcon from "@material-ui/icons/PictureAsPdf";
import PrintIcon from "@material-ui/icons/Print";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import ExpandLessIcon from "@material-ui/icons/ExpandLess";
import ArrowBackIcon from "@material-ui/icons/ArrowBack";
import { useHistory } from "react-router-dom";
import moment from "moment";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import api from "../../services/api";
import { toast } from "react-toastify";
import html2pdf from "html2pdf.js";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const textColor = "#333333"; // Cor padrão para texto

const useStyles = makeStyles(theme => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(2),
    margin: theme.spacing(1),
    marginTop: 0
  },
  tabPaper: {
    flex: 1,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2)
  },
  chartContainer: {
    height: 400,
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2)
  },
  filterContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    margin: theme.spacing(1, 0, 2)
  },
  tableContainer: {
    marginTop: theme.spacing(2),
    maxHeight: "400px", // Altura máxima para tabelas
    overflowY: "auto",  // Scroll vertical quando necessário
    scrollbarWidth: "thin",
    "&::-webkit-scrollbar": {
      width: "8px",
    },
    "&::-webkit-scrollbar-track": {
      background: "#f1f1f1",
      borderRadius: "4px",
    },
    "&::-webkit-scrollbar-thumb": {
      background: "#888",
      borderRadius: "4px",
    },
    "&::-webkit-scrollbar-thumb:hover": {
      background: "#555",
    }
  },
  filterBox: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    backgroundColor: theme.palette.background.default
  },
  filterItem: {
    minWidth: 200,
    margin: theme.spacing(0, 1)
  },
  headerButton: {
    margin: theme.spacing(0, 1)
  },
  tableTitle: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    margin: theme.spacing(2, 0)
  },
  goalsTable: {
    width: "100%",
    borderCollapse: "collapse",
    "& th, & td": {
      border: "1px solid #ddd",
      padding: theme.spacing(1.5)
    },
    "& th": {
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText,
      textAlign: "left"
    },
    "& tr:nth-child(even)": {
      backgroundColor: "#f2f2f2"
    },
    "& tr:hover": {
      backgroundColor: "#e0e0e0"
    }
  },
  progressBar: {
    height: 8,
    borderRadius: 10
  },
  progressContainer: {
    display: "flex",
    alignItems: "center"
  },
  progressValue: {
    marginLeft: theme.spacing(1)
  },
  dashboardContainer: {
    padding: theme.spacing(2),
    marginBottom: theme.spacing(2),
    maxHeight: "calc(100vh - 200px)", // Altura máxima para o dashboard inteiro
    overflowY: "auto",  // Scroll vertical quando necessário
    scrollbarWidth: "thin",
    "&::-webkit-scrollbar": {
      width: "8px",
    },
    "&::-webkit-scrollbar-track": {
      background: "#f1f1f1",
      borderRadius: "4px",
    },
    "&::-webkit-scrollbar-thumb": {
      background: "#888",
      borderRadius: "4px",
    },
    "&::-webkit-scrollbar-thumb:hover": {
      background: "#555",
    }
  },
  section: {
    marginBottom: theme.spacing(4)
  },
  smallChart: {
    height: 250
  },
  expandableSection: {
    marginBottom: theme.spacing(2)
  },
  expandButton: {
    padding: theme.spacing(0.5),
    marginRight: theme.spacing(1)
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    marginBottom: theme.spacing(2)
  },
  cardMetric: {
    padding: theme.spacing(2),
    textAlign: "center",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center"
  },
  metricValue: {
    fontSize: "2rem",
    fontWeight: "bold",
    marginBottom: theme.spacing(1)
  },
  metricLabel: {
    fontSize: "1rem",
    color: theme.palette.text.secondary
  },
  printArea: {
    width: "100%"
  },
  loadingContainer: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: 400
  }, 
  chartTitle: {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    padding: theme.spacing(1),
    borderTopLeftRadius: theme.shape.borderRadius,
    borderTopRightRadius: theme.shape.borderRadius,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  chartContainer: {
    height: 400,
    padding: theme.spacing(0, 0, 2, 0),
    marginBottom: theme.spacing(2),
    display: 'flex',
    flexDirection: 'column',
    '& .recharts-responsive-container': {
      marginTop: theme.spacing(1),
      marginBottom: theme.spacing(1)
    }
  },
  chartExplanation: {
    backgroundColor: theme.palette.grey[100],
    padding: theme.spacing(1),
    borderRadius: theme.shape.borderRadius,
    marginTop: theme.spacing(1)
  }
}));

// Cores para os gráficos
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658", "#ff7300"];

const PerformanceDashboard = () => {
  const classes = useStyles();
  const history = useHistory();
  const reportRef = useRef(null);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    goalProgress: true,
    employeeRanking: true,
    teamPerformance: true,
    campaignPerformance: true
  });
  
  // Estados para os dados dos dashboards
  const [employees, setEmployees] = useState([]);
  const [goals, setGoals] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [employeeGoals, setEmployeeGoals] = useState([]);
  
  // Estados para filtros
  const [dateFrom, setDateFrom] = useState(moment().subtract(30, 'days').format('YYYY-MM-DD'));
  const [dateTo, setDateTo] = useState(moment().format('YYYY-MM-DD'));
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [selectedGoalType, setSelectedGoalType] = useState("all");
  const [selectedCampaign, setSelectedCampaign] = useState("all");

  // Carregar dados iniciais
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Função para buscar todos os dados necessários
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Carregar funcionários
      const { data: employeesData } = await api.get("/employees");
      setEmployees(employeesData.employees);
      
      // Carregar metas
      const { data: goalsData } = await api.get("/goals");
      setGoals(goalsData.goals);

      // Carregar campanhas
      const { data: campaignsData } = await api.get("/performance-campaigns");
      setCampaigns(campaignsData.campaigns);
      
      // Carregar relações entre funcionários e metas
      const { data: employeeGoalsData } = await api.get("/employee-goals");
      setEmployeeGoals(employeeGoalsData);

    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar dados do dashboard");
    } finally {
      setLoading(false);
    }
  };

  // Função para aplicar filtros
  const handleApplyFilter = () => {
    fetchDashboardData();
    setFilterOpen(false);
  };

  // Funções para alternar a expansão das seções
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const exportToPdf = async () => {
    toast.info("Gerando PDF, por favor aguarde...");
    
    try {
      const pdf = new jsPDF('portrait', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      let currentY = margin;
      
      // Cores para o PDF - paleta mais moderna
      const primaryColor = "#2979ff";
      const secondaryColor = "#f5f5f5";
      const borderColor = "#cccccc";
      const textColor = "#333333";
      const accentColor = "#0d47a1";
      const sectionBgColor = "#f9f9f9";
      
      // Função para adicionar cabeçalho do relatório
      const addReportHeader = () => {
        // Cor de fundo do cabeçalho
        pdf.setFillColor(primaryColor);
        pdf.rect(0, 0, pdfWidth, 25, 'F');
        
        // Logo ou título principal
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(18);
        pdf.text("Relatório de Desempenho", pdfWidth/2, 15, { align: "center" });
        
        // Barra de informações do relatório
        pdf.setFillColor(sectionBgColor);
        pdf.setDrawColor(borderColor);
        pdf.rect(0, 25, pdfWidth, 20, 'FD');
        
        // Linha divisória
        pdf.setDrawColor(borderColor);
        pdf.setLineWidth(0.5);
        pdf.line(pdfWidth/2, 25, pdfWidth/2, 45);
        
        // Informações do relatório - lado esquerdo
        pdf.setTextColor(textColor);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.text("Data de Geração:", margin + 2, 31);
        pdf.text("Período:", margin + 2, 38);
        
        // Valores das informações - lado esquerdo
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.text(moment().format('DD/MM/YYYY HH:mm'), margin + 30, 31);
        pdf.text(`${moment(dateFrom).format('DD/MM/YYYY')} até ${moment(dateTo).format('DD/MM/YYYY')}`, margin + 30, 38);
        
        // Informações do relatório - lado direito
        pdf.setFont("helvetica", "bold");
        const halfWidth = pdfWidth/2 + 2;
        pdf.text("Aba:", halfWidth, 31);
        pdf.text("Filtros Ativos:", halfWidth, 38);
        
        // Valores das informações - lado direito
        pdf.setFont("helvetica", "normal");
        let tabName = "";
        switch(tab) {
          case 0: tabName = "Visão Geral"; break;
          case 1: tabName = "Metas"; break;
          case 2: tabName = "Funcionários"; break;
          case 3: tabName = "Campanhas"; break;
        }
        
        pdf.text(tabName, halfWidth + 25, 31);
        const filterText = selectedEmployee !== "all" || selectedGoalType !== "all" || selectedCampaign !== "all" ? "Sim" : "Não";
        pdf.text(filterText, halfWidth + 25, 38);
        
        currentY = 50; // Ajustado para dar mais espaço
      };
      
      // Função para adicionar borda decorativa em toda a página
      const addPageBorder = () => {
        // Desenhar borda em toda a página com linha tracejada
        pdf.setDrawColor(borderColor);
        pdf.setLineWidth(0.5);
        pdf.rect(3, 3, pdfWidth - 6, pdfHeight - 6);
      };
      
      // Função para adicionar título de seção
      const addSectionTitle = (text) => {
        // Verificar espaço na página
        if (currentY > pdfHeight - 40) {
          pdf.addPage();
          addPageBorder();
          currentY = margin;
        }
        
        // Fundo colorido com degradê para o título
        pdf.setFillColor(primaryColor);
        pdf.setDrawColor(primaryColor);
        
        // Retângulo de título com borda arredondada
        pdf.roundedRect(margin, currentY, pdfWidth - 2*margin, 12, 2, 2, 'F');
        
        // Texto do título
        pdf.setTextColor(255, 255, 255);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(12);
        pdf.text(text, pdfWidth/2, currentY + 8, { align: "center" });
        
        currentY += 15;
        pdf.setTextColor(textColor);
        pdf.setFont("helvetica", "normal");
      };
      
      const startSection = () => {
        const startY = currentY;
        
        return (skipSpace = true) => {
          pdf.setFillColor(sectionBgColor);
          pdf.setDrawColor(borderColor);
          pdf.rect(margin, startY, pdfWidth - 2*margin, currentY - startY, 'FD');
          
          if (skipSpace) currentY += 5;
        };
      };
      
      // Função para adicionar um card com valor e label
      const addMetricCard = (label, value, x, y, width, height) => {
        // Fundo branco para o card
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(borderColor);
        pdf.roundedRect(x, y, width, height, 3, 3, 'FD');
        
        // Valor com destaque
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.setTextColor(primaryColor);
        pdf.text(value.toString(), x + width/2, y + height/2 - 2, { align: "center" });
        
        // Label abaixo do valor
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(textColor);
        pdf.text(label, x + width/2, y + height/2 + 6, { align: "center" });
      };
      
      // Função para adicionar um painel com múltiplos cards de métricas
      const addMetricsPanel = (metrics, columns) => {
        if (metrics.length === 0) return;
        
        // Verificar espaço na página
        if (currentY > pdfHeight - 40) {
          pdf.addPage();
          addPageBorder();
          currentY = margin;
        }
        
        const startSectionY = currentY;
        
        // Calcular dimensões dos cards
        const panelWidth = pdfWidth - 2*margin;
        const cardWidth = (panelWidth - (columns - 1) * 5) / columns;
        const cardHeight = 30;
        const rows = Math.ceil(metrics.length / columns);
        
        // Desenhar fundo para o painel de métricas
        pdf.setFillColor(sectionBgColor);
        pdf.setDrawColor(borderColor);
        pdf.rect(margin, currentY, panelWidth, rows * (cardHeight + 5) - 5, 'FD');
        
        // Adicionar cada métrica
        metrics.forEach((metric, index) => {
          const row = Math.floor(index / columns);
          const col = index % columns;
          const x = margin + col * (cardWidth + 5);
          const y = currentY + row * (cardHeight + 5);
          
          addMetricCard(metric.label, metric.value, x, y, cardWidth, cardHeight);
        });
        
        // Atualizar posição Y
        currentY += rows * (cardHeight + 5);
      };
      
      // Função para adicionar um gráfico com contêiner
      const addChartWithContainer = async (title, element, maxHeight = 100) => {
        if (!element) return;
        
        // Verificar espaço na página atual
        if (currentY > pdfHeight - 50) {
          pdf.addPage();
          addPageBorder();
          currentY = margin;
        }
        
        // Criar um contêiner com borda
        const startSectionY = currentY;
        
        try {
          // Capturar o gráfico
          const canvas = await html2canvas(element, {
            scale: 2.5, // Aumentar a escala para melhor qualidade
            useCORS: true,
            allowTaint: true,
            scrollY: -window.scrollY,
            backgroundColor: null // Permitir transparência
          });
          
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = pdfWidth - 2*margin - 10;  // 5px padding de cada lado
          let imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          // Limitar a altura do gráfico se for muito grande
          if (imgHeight > maxHeight) {
            imgHeight = maxHeight;
          }
          
          // Verificar se há espaço para o gráfico inteiro
          if (currentY + imgHeight + 20 > pdfHeight - 20) {
            pdf.addPage();
            addPageBorder();
            currentY = margin;
          }
          
          // Desenhar contêiner com borda
          pdf.setFillColor(sectionBgColor);
          pdf.setDrawColor(borderColor);
          pdf.roundedRect(margin, currentY, pdfWidth - 2*margin, imgHeight + 20, 2, 2, 'FD');
          
          // Título do gráfico
          pdf.setFillColor(primaryColor);
          pdf.roundedRect(margin + 5, currentY + 5, pdfWidth - 2*margin - 10, 10, 1, 1, 'F');
          
          pdf.setTextColor(255, 255, 255);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(9);
          pdf.text(title, margin + 10, currentY + 11);
          
          // Adicionar o gráfico
          pdf.addImage(imgData, 'PNG', margin + 5, currentY + 18, imgWidth, imgHeight);
          
          // Atualizar posição Y
          currentY += imgHeight + 25;
        } catch (error) {
          console.error("Erro ao capturar gráfico:", error);
          pdf.setTextColor(textColor);
          pdf.text("Erro ao gerar gráfico: " + title, margin + 5, currentY + 20);
          currentY += 25;
        }
      };
      
      // Função para adicionar tabela com dados
      const addTable = async (title, element) => {
        if (!element) return;
        
        // Verificar espaço para o título na página atual
        if (currentY > pdfHeight - 40) {
          pdf.addPage();
          addPageBorder();
          currentY = margin;
        }
        
        const startSectionY = currentY;
        
        try {
          // Capturar a tabela
          const canvas = await html2canvas(element, {
            scale: 2.5, // Aumentar a escala para melhor qualidade
            useCORS: true,
            allowTaint: true,
            scrollY: -window.scrollY,
            backgroundColor: null
          });
          
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = pdfWidth - 2*margin - 10;
          let imgHeight = (canvas.height * imgWidth) / canvas.width;
          
          // Se a tabela for muito grande, verificar se precisamos de nova página
          if (currentY + imgHeight + 20 > pdfHeight - 20) {
            pdf.addPage();
            addPageBorder();
            currentY = margin;
          }
          
          // Desenhar contêiner com borda
          pdf.setFillColor(sectionBgColor);
          pdf.setDrawColor(borderColor);
          pdf.roundedRect(margin, currentY, pdfWidth - 2*margin, imgHeight + 20, 2, 2, 'FD');
          
          // Título da tabela
          pdf.setFillColor(primaryColor);
          pdf.roundedRect(margin + 5, currentY + 5, pdfWidth - 2*margin - 10, 10, 1, 1, 'F');
          
          pdf.setTextColor(255, 255, 255);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(9);
          pdf.text(title, margin + 10, currentY + 11);
          
          // Adicionar a tabela
          pdf.addImage(imgData, 'PNG', margin + 5, currentY + 18, imgWidth, imgHeight);
          
          // Atualizar posição Y
          currentY += imgHeight + 25;
        } catch (error) {
          console.error("Erro ao capturar tabela:", error);
          pdf.setTextColor(textColor);
          pdf.text("Erro ao gerar tabela: " + title, margin + 5, currentY + 20);
          currentY += 25;
        }
      };
      
      // Função para adicionar rodapé em todas as páginas
      const addFooter = () => {
        const totalPages = pdf.internal.getNumberOfPages();
        
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          
          // Fundo do rodapé
          pdf.setFillColor(sectionBgColor);
          pdf.setDrawColor(borderColor);
          pdf.rect(0, pdfHeight - 15, pdfWidth, 15, 'FD');
          
          // Linha divisória
          pdf.setDrawColor(borderColor);
          pdf.line(margin, pdfHeight - 15, pdfWidth - margin, pdfHeight - 15);
          
          // Texto de rodapé
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8);
          pdf.setTextColor(textColor);
          pdf.text("© Sistema de Gestão de Desempenho - Meta Zap Pro", margin, pdfHeight - 5);
          pdf.text(`Página ${i} de ${totalPages}`, pdfWidth - margin, pdfHeight - 5, { align: "right" });
        }
      };
      
      // Adicionar numeração de página
      const addPageNumbers = () => {
        const totalPages = pdf.internal.getNumberOfPages();
        
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8);
          pdf.setTextColor(textColor);
          pdf.text(`${i} / ${totalPages}`, pdfWidth - 10, 10, { align: "right" });
        }
      };
      
      // Iniciar a geração do PDF com borda em todas as páginas
      addReportHeader();
      addPageBorder();
      
      // Selecionar conteúdo com base na aba atual
      switch (tab) {
        case 0: // Visão Geral
          // Título da seção
          addSectionTitle("Visão Geral de Desempenho");
          
          // Métricas principais em cards
          const generalMetrics = [
            { label: "Total de Metas", value: goals.length },
            { label: "Funcionários", value: employees.length },
            { 
              label: "Metas Concluídas", 
              value: goals.filter(g => {
                const progress = g.target > 0 ? Math.round((g.current / g.target) * 100) : 0;
                return progress >= 100;
              }).length 
            },
            { 
              label: "Progresso Médio", 
              value: goals.length > 0 
                ? Math.round(goals.reduce((sum, goal) => {
                    const progress = goal.target > 0 ? 
                      Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
                    return sum + progress;
                  }, 0) / goals.length) + "%"
                : "0%" 
            }
          ];
          
          addMetricsPanel(generalMetrics, 4);
          
          // Gráficos agrupados por tipo
          if (expandedSections.goalProgress) {
            const goalProgressSection = document.querySelector(`[data-section="goalProgress"]`);
            if (goalProgressSection) {
              await addChartWithContainer(
                "Como estão distribuídas as metas por faixas de progresso", 
                goalProgressSection, 
                150
              );
            }
          }
          
          if (expandedSections.employeeRanking) {
            const employeeRankingSection = document.querySelector(`[data-section="employeeRanking"]`);
            if (employeeRankingSection) {
              await addChartWithContainer("Ranking de Funcionários", employeeRankingSection, 120);
            }
          }
          
          if (expandedSections.teamPerformance) {
            const teamPerformanceSection = document.querySelector(`[data-section="teamPerformance"]`);
            if (teamPerformanceSection) {
              await addChartWithContainer("Tendência de Desempenho da Equipe", teamPerformanceSection, 120);
            }
          }
          break;
          
        case 1: // Metas
          addSectionTitle("Dashboard de Metas");
          
          // Métricas de metas em cards
          const activeGoals = goals.filter(g => {
            const now = new Date();
            const endDate = new Date(g.endDate);
            return now <= endDate;
          }).length;
          
          const nearCompletionGoals = goals.filter(g => {
            const progress = g.target > 0 ? Math.round((g.current / g.target) * 100) : 0;
            return progress >= 90 && progress < 100;
          }).length;
          
          const overdueGoals = goals.filter(g => {
            const now = new Date();
            const endDate = new Date(g.endDate);
            const progress = g.target > 0 ? Math.round((g.current / g.target) * 100) : 0;
            return now > endDate && progress < 100;
          }).length;
          
          const goalsMetrics = [
            { label: "Metas Ativas", value: activeGoals },
            { label: "Próximas de Conclusão", value: nearCompletionGoals },
            { label: "Metas Vencidas", value: overdueGoals }
          ];
          
          addMetricsPanel(goalsMetrics, 3);
          
          // Gráficos de metas
          const typesChart = document.querySelector('.MuiGrid-container .MuiGrid-item:nth-child(1) .recharts-responsive-container');
          if (typesChart) {
            await addChartWithContainer("Distribuição por Tipos de Meta", typesChart.parentElement.parentElement, 100);
          }
          
          const deptChart = document.querySelector('.MuiGrid-container .MuiGrid-item:nth-child(2) .recharts-responsive-container');
          if (deptChart) {
            await addChartWithContainer("Desempenho por Departamento", deptChart.parentElement.parentElement, 100);
          }
          
          // Tabela de metas
          const goalsTable = document.querySelector(`.${classes.goalsTable}`);
          if (goalsTable) {
            await addTable("Tabela de Metas", goalsTable);
          }
          break;
          
        case 2: // Funcionários
          addSectionTitle("Dashboard de Funcionários");
          
          // Métricas de funcionários
          const employeeRanking = getEmployeeRankingData();
          
          const highPerformers = employeeRanking.filter(e => e.averageProgress >= 90).length;
          const avgEmpProgress = employeeRanking.length > 0 
            ? Math.round(employeeRanking.reduce((sum, emp) => sum + emp.averageProgress, 0) / employeeRanking.length) + "%"
            : "0%";
          const empWithCompletedGoals = employeeRanking.filter(e => e.completedGoals > 0).length;
          
          const employeeMetrics = [
            { label: "Funcionários Alta Performance", value: highPerformers },
            { label: "Progresso Médio", value: avgEmpProgress },
            { label: "Com Metas Concluídas", value: empWithCompletedGoals }
          ];
          
          addMetricsPanel(employeeMetrics, 3);
          
          // Gráfico radar
          const radarChart = document.querySelector('.recharts-responsive-container');
          if (radarChart) {
            await addChartWithContainer("Desempenho por Tipo de Meta (Top 5 Funcionários)", radarChart.parentElement, 120);
          }
          
          // Tabela de ranking
          const empTable = document.querySelector(`.${classes.goalsTable}`);
          if (empTable) {
            await addTable("Ranking de Desempenho dos Funcionários", empTable);
          }
          break;
          
        case 3: // Campanhas
          addSectionTitle("Dashboard de Campanhas");
          
          // Métricas de campanhas
          const activeCampaigns = campaigns.filter(c => {
            const now = new Date();
            const startDate = new Date(c.startDate);
            const endDate = new Date(c.endDate);
            return now >= startDate && now <= endDate;
          }).length;
          
          const campaignData = getCampaignPerformanceData();
          const avgCampaignProgress = campaignData.length > 0 
            ? Math.round(campaignData.reduce((sum, c) => sum + c.avgProgress, 0) / campaignData.length) + "%"
            : "0%";
          
          const campaignMetrics = [
            { label: "Total de Campanhas", value: campaigns.length },
            { label: "Campanhas Ativas", value: activeCampaigns },
            { label: "Progresso Médio", value: avgCampaignProgress }
          ];
          
          addMetricsPanel(campaignMetrics, 3);
          
          // Gráfico de desempenho
          if (expandedSections.campaignPerformance) {
            const campaignPerformanceSection = document.querySelector(`[data-section="campaignPerformance"]`);
            if (campaignPerformanceSection) {
              await addChartWithContainer("Desempenho das Campanhas", campaignPerformanceSection, 120);
            }
          }
          
          // Tabela de campanhas
          const campTable = document.querySelector(`.${classes.goalsTable}`);
          if (campTable) {
            await addTable("Tabela de Campanhas", campTable);
          }
          break;
      }
      
      // Adicionar rodapé em todas as páginas
      addFooter();
      addPageNumbers();
      
      // Salvar o PDF com nome personalizado incluindo a data
      const reportType = tab === 0 ? "geral" : 
                        tab === 1 ? "metas" : 
                        tab === 2 ? "funcionarios" : "campanhas";
      
      pdf.save(`relatorio-desempenho-${reportType}-${moment().format('YYYY-MM-DD')}.pdf`);
      toast.success("PDF gerado com sucesso!");
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF. Tente novamente.");
    }
  };

  // Organizar dados para o ranking de funcionários
  const getEmployeeRankingData = () => {
    // Criar um mapa para combinar os dados dos funcionários com suas metas
    const employeeMap = {};
    
    employees.forEach(employee => {
      employeeMap[employee.id] = {
        id: employee.id,
        name: employee.name,
        department: employee.department,
        totalGoals: 0,
        completedGoals: 0,
        averageProgress: 0,
        totalPoints: 0
      };
    });
    
    // Processar as metas de cada funcionário
    employeeGoals.forEach(eg => {
      if (employeeMap[eg.employeeId]) {
        const progress = eg.individualTarget > 0 ? 
          Math.min(100, Math.round((eg.individualCurrent / eg.individualTarget) * 100)) : 0;
        
        employeeMap[eg.employeeId].totalGoals += 1;
        if (progress >= 100) employeeMap[eg.employeeId].completedGoals += 1;
        employeeMap[eg.employeeId].totalPoints += progress;
      }
    });
    
    // Calcular a média de progresso para cada funcionário
    Object.values(employeeMap).forEach(employee => {
      employee.averageProgress = employee.totalGoals > 0 ? 
        Math.round(employee.totalPoints / employee.totalGoals) : 0;
    });
    
    // Converter o mapa em array e ordenar pelo progresso médio
    return Object.values(employeeMap)
      .sort((a, b) => b.averageProgress - a.averageProgress);
  };

  // Dados para o gráfico de progresso de metas
  const getGoalProgressData = () => {
    // Contar o número de metas em cada faixa de progresso
    const progressRanges = {
      "0-25%": 0,
      "26-50%": 0,
      "51-75%": 0,
      "76-99%": 0,
      "100%": 0
    };
    
    goals.forEach(goal => {
      const progress = goal.target > 0 ? 
        Math.round((goal.current / goal.target) * 100) : 0;
      
      if (progress >= 100) progressRanges["100%"] += 1;
      else if (progress >= 76) progressRanges["76-99%"] += 1;
      else if (progress >= 51) progressRanges["51-75%"] += 1;
      else if (progress >= 26) progressRanges["26-50%"] += 1;
      else progressRanges["0-25%"] += 1;
    });
    
    // Converter para o formato esperado pelos componentes Recharts
    return Object.entries(progressRanges).map(([name, value]) => ({
      name,
      value
    }));
  };

  // Dados para o gráfico de tipos de metas
  const getGoalTypesData = () => {
    const typesCount = {};
    
    goals.forEach(goal => {
      const type = goal.metricType || "Outros";
      typesCount[type] = (typesCount[type] || 0) + 1;
    });
    
    return Object.entries(typesCount).map(([name, value]) => ({
      name,
      value
    }));
  };

  // Dados para o gráfico de desempenho da equipe ao longo do tempo
  const getTeamPerformanceData = () => {
    // Agrupar por mês para mostrar tendência
    const monthData = {};
    const months = [];
    
    // Criar os últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const monthKey = moment().subtract(i, 'months').format('YYYY-MM');
      const monthName = moment().subtract(i, 'months').format('MMM/YY');
      months.push(monthKey);
      monthData[monthKey] = { 
        name: monthName, 
        avgProgress: 0, 
        totalGoals: 0, 
        completedGoals: 0 
      };
    }
    
    // Contar todas as metas concluídas por mês
    goals.forEach(goal => {
      // Verificar se a data de fim está dentro do período de algum dos meses
      const goalEndDate = moment(goal.endDate).format('YYYY-MM');
      
      if (monthData[goalEndDate]) {
        const progress = goal.target > 0 ? 
          Math.round((goal.current / goal.target) * 100) : 0;
        
        monthData[goalEndDate].totalGoals += 1;
        monthData[goalEndDate].avgProgress += progress;
        if (progress >= 100) {
          monthData[goalEndDate].completedGoals += 1;
        }
      }
    });
    
    // Calcular as médias
    months.forEach(month => {
      if (monthData[month].totalGoals > 0) {
        monthData[month].avgProgress = Math.round(
          monthData[month].avgProgress / monthData[month].totalGoals
        );
      }
    });
    
    // Converter para array na ordem correta
    return months.map(month => monthData[month]);
  };

  // Dados para o gráfico de desempenho por departamento
  const getDepartmentPerformanceData = () => {
    const deptData = {};
    
    // Inicializar dados dos departamentos
    employees.forEach(emp => {
      if (emp.department) {
        if (!deptData[emp.department]) {
          deptData[emp.department] = { 
            name: emp.department, 
            totalGoals: 0, 
            completedGoals: 0, 
            avgProgress: 0,
            totalProgress: 0
          };
        }
      }
    });
    
    // Processar metas por funcionário e agrupar por departamento
    employeeGoals.forEach(eg => {
      const employee = employees.find(e => e.id === eg.employeeId);
      if (employee && employee.department && deptData[employee.department]) {
        const progress = eg.individualTarget > 0 ? 
          Math.round((eg.individualCurrent / eg.individualTarget) * 100) : 0;
        
        deptData[employee.department].totalGoals += 1;
        deptData[employee.department].totalProgress += progress;
        if (progress >= 100) {
          deptData[employee.department].completedGoals += 1;
        }
      }
    });
    
    // Calcular médias
    Object.values(deptData).forEach(dept => {
      if (dept.totalGoals > 0) {
        dept.avgProgress = Math.round(dept.totalProgress / dept.totalGoals);
      }
    });
    
    return Object.values(deptData);
  };

  // Obter dados do dashboard de campanhas
  const getCampaignPerformanceData = () => {
    return campaigns.map(campaign => {
      // Filtrar metas associadas a esta campanha
      const campaignGoals = goals.filter(g => g.performanceCampaignId === campaign.id);
      
      // Calcular progresso médio das metas desta campanha
      let totalProgress = 0;
      let completedGoals = 0;
      
      campaignGoals.forEach(goal => {
        const progress = goal.target > 0 ? 
          Math.round((goal.current / goal.target) * 100) : 0;
        totalProgress += progress;
        if (progress >= 100) completedGoals += 1;
      });
      
      const avgProgress = campaignGoals.length > 0 ? 
        Math.round(totalProgress / campaignGoals.length) : 0;
      
      return {
        name: campaign.name,
        totalGoals: campaignGoals.length,
        completedGoals,
        avgProgress
      };
    });
  };

  const getMetricTypes = () => {
    const types = new Set();
    goals.forEach(goal => {
      if (goal.metricType) types.add(goal.metricType);
    });
    return Array.from(types);
  };

  // Renderizar o conteúdo com base na aba selecionada
  const renderContent = () => {
    if (loading) {
      return (
        <div className={classes.loadingContainer}>
          <CircularProgress size={60} thickness={6} />
        </div>
      );
    }

    switch (tab) {
      case 0: // Dashboard Geral
        return renderGeneralDashboard();
      case 1: // Dashboard de Metas
        return renderGoalsDashboard();
      case 2: // Dashboard de Funcionários
        return renderEmployeesDashboard();
      case 3: // Dashboard de Campanhas
        return renderCampaignsDashboard();
      default:
        return renderGeneralDashboard();
    }
  };

  // Renderizar o dashboard geral
  const renderGeneralDashboard = () => {
    const employeeRanking = getEmployeeRankingData();
    const goalProgressData = getGoalProgressData();
    const teamPerformanceData = getTeamPerformanceData();

    return (
      <div className={classes.dashboardContainer}>
        {/* Métricas Principais */}
        <Grid container spacing={3} className={classes.section}>
          <Grid item xs={12} md={3}>
            <Paper className={classes.cardMetric}>
              <div className={classes.metricValue}>
                {goals.length}
              </div>
              <div className={classes.metricLabel}>
                Total de Metas
              </div>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper className={classes.cardMetric}>
              <div className={classes.metricValue}>
                {employees.length}
              </div>
              <div className={classes.metricLabel}>
                Funcionários
              </div>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper className={classes.cardMetric}>
              <div className={classes.metricValue}>
                {goals.filter(g => {
                  const progress = g.target > 0 ? 
                    Math.round((g.current / g.target) * 100) : 0;
                  return progress >= 100;
                }).length}
              </div>
              <div className={classes.metricLabel}>
                Metas Concluídas
              </div>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper className={classes.cardMetric}>
              <div className={classes.metricValue}>
                {goals.length > 0 ? 
                  Math.round(
                    goals.reduce((sum, goal) => {
                      const progress = goal.target > 0 ? 
                        Math.min(100, Math.round((goal.current / goal.target) * 100)) : 0;
                      return sum + progress;
                    }, 0) / goals.length
                  ) + "%" : 
                  "0%"}
              </div>
              <div className={classes.metricLabel}>
                Progresso Médio
              </div>
            </Paper>
          </Grid>
        </Grid>

        {/* Progresso de Metas */}
        <div className={classes.expandableSection}>
          <div className={classes.sectionHeader}>
            <IconButton 
              size="small" 
              className={classes.expandButton}
              onClick={() => toggleSection("goalProgress")}
            >
              {expandedSections.goalProgress ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
            <Typography variant="h6">Distribuição do Progresso de Metas</Typography>
          </div>
          
          {expandedSections.goalProgress && (
            <Paper className={classes.chartContainer} data-section="goalProgress">
            <Typography variant="subtitle1" className={classes.chartTitle}>
              Como estão distribuídas as metas por faixas de progresso
            </Typography>

            <ResponsiveContainer width="100%" height="80%">
              <BarChart
                layout="vertical"
                data={goalProgressData}
                margin={{ top: 20, right: 50, left: 80, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 'dataMax']} />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  tick={{ fontSize: 12 }}
                />
                <RechartsTooltip 
                  formatter={(value, name) => [`${value} metas (${(value/goals.length*100).toFixed(0)}%)`, 'Quantidade']}
                />
                <Bar dataKey="value" name="Quantidade de metas">
                  {goalProgressData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={
                        entry.name === "100%" ? "#4caf50" : 
                        entry.name === "76-99%" ? "#8bc34a" : 
                        entry.name === "51-75%" ? "#ffeb3b" : 
                        entry.name === "26-50%" ? "#ff9800" : 
                        "#f44336"
                      } 
                    />
                  ))}
                </Bar>
                <Legend formatter={(value) => 'Quantidade de metas'} />
                
                {/* Adicionar rótulos com valor e porcentagem em cada barra */}
                <LabelList 
                  dataKey="value" 
                  position="right" 
                  formatter={(value) => `${value} (${(value/goals.length*100).toFixed(0)}%)`} 
                  style={{ fill: textColor, fontWeight: 'bold' }}
                />
              </BarChart>
            </ResponsiveContainer>
            
            <Typography variant="body2" align="center" style={{ marginTop: 10 }}>
              Interpretação: O gráfico mostra quantas metas estão em cada faixa de progresso.
              Quanto mais metas em faixas superiores (76-100%), melhor o desempenho geral.
            </Typography>
          </Paper>
          )}
        </div>

        {/* Ranking de Funcionários */}
        <div className={classes.expandableSection}>
          <div className={classes.sectionHeader}>
            <IconButton 
              size="small" 
              className={classes.expandButton}
              onClick={() => toggleSection("employeeRanking")}
            >
              {expandedSections.employeeRanking ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
            <Typography variant="h6">Ranking de Funcionários</Typography>
          </div>
          
          {expandedSections.employeeRanking && (
            <Paper className={classes.chartContainer} data-section="employeeRanking">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={employeeRanking.slice(0, 10)} // Pegar apenas os 10 primeiros
                  margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end"
                    height={70} 
                    interval={0}
                  />
                  <YAxis label={{ value: 'Progresso Médio (%)', angle: -90, position: 'insideLeft' }} />
                  <RechartsTooltip
                    formatter={(value, name, props) => {
                      return [`${value}%`, 'Progresso Médio'];
                    }}
                    labelFormatter={(label) => `Funcionário: ${label}`}
                  />
                  <Bar 
                    dataKey="averageProgress" 
                    fill="#8884d8" 
                    name="Progresso Médio"
                    barSize={30}
                  >
                    {employeeRanking.slice(0, 10).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          )}
        </div>

        {/* Tendência de Desempenho da Equipe */}
        <div className={classes.expandableSection}>
          <div className={classes.sectionHeader}>
            <IconButton 
              size="small" 
              className={classes.expandButton}
              onClick={() => toggleSection("teamPerformance")}
            >
              {expandedSections.teamPerformance ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
            <Typography variant="h6">Tendência de Desempenho da Equipe</Typography>
          </div>
          
          {expandedSections.teamPerformance && (
            <Paper className={classes.chartContainer} data-section="teamPerformance">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={teamPerformanceData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" label={{ value: 'Progresso (%)', angle: -90, position: 'insideLeft' }} />
                  <YAxis yAxisId="right" orientation="right" label={{ value: 'Nº de Metas', angle: 90, position: 'insideRight' }} />
                  <RechartsTooltip />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="avgProgress"
                    stroke="#8884d8"
                    name="Progresso Médio (%)"
                    activeDot={{ r: 8 }}
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="totalGoals"
                    stroke="#82ca9d"
                    name="Total de Metas"
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="completedGoals"
                    stroke="#ff7300"
                    name="Metas Concluídas"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Paper>
          )}
        </div>
      </div>
    );
  };

  // Renderizar o dashboard de metas
  const renderGoalsDashboard = () => {
    const goalTypesData = getGoalTypesData();
    const departmentPerformanceData = getDepartmentPerformanceData();
    
    return (
      <div className={classes.dashboardContainer}>
        {/* KPIs de Metas */}
        <Grid container spacing={3} className={classes.section}>
          <Grid item xs={12} md={4}>
            <Paper className={classes.cardMetric}>
              <div className={classes.metricValue}>
                {goals.filter(g => {
                  const now = new Date();
                  const endDate = new Date(g.endDate);
                  return now <= endDate;
                }).length}
              </div>
              <div className={classes.metricLabel}>
                Metas Ativas
              </div>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper className={classes.cardMetric}>
              <div className={classes.metricValue}>
                {goals.filter(g => {
                  const progress = g.target > 0 ? 
                    Math.round((g.current / g.target) * 100) : 0;
                  return progress >= 90 && progress < 100;
                }).length}
              </div>
              <div className={classes.metricLabel}>
                Metas Próximas de Conclusão
              </div>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper className={classes.cardMetric}>
              <div className={classes.metricValue}>
                {goals.filter(g => {
                  const now = new Date();
                  const endDate = new Date(g.endDate);
                  const progress = g.target > 0 ? 
                    Math.round((g.current / g.target) * 100) : 0;
                  return now > endDate && progress < 100;
                }).length}
              </div>
              <div className={classes.metricLabel}>
                Metas Vencidas
              </div>
            </Paper>
          </Grid>
        </Grid>

        {/* Distribuição por Tipos de Meta */}
        <Grid container spacing={3} className={classes.section}>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>Distribuição por Tipos de Meta</Typography>
            <Paper className={classes.smallChart}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={goalTypesData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {goalTypesData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => [`${value} meta(s)`, ``]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>Desempenho por Departamento</Typography>
            <Paper className={classes.smallChart}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={departmentPerformanceData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="avgProgress" name="Progresso Médio (%)" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>

        {/* Tabela de Metas */}
        <div className={classes.section}>
          <div className={classes.tableTitle}>
            <Typography variant="h6">Tabela de Metas</Typography>
          </div>
          <Paper className={classes.tabPaper}>
            <div className={classes.tableContainer}>
              <table className={classes.goalsTable}>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Tipo de Métrica</th>
                    <th>Meta</th>
                    <th>Atual</th>
                    <th>Progresso</th>
                    <th>Data Término</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {goals.map(goal => {
                    const progress = goal.target > 0 ? 
                      Math.round((goal.current / goal.target) * 100) : 0;
                    const now = new Date();
                    const endDate = new Date(goal.endDate);
                    
                    let status;
                    if (progress >= 100) status = "Concluída";
                    else if (now > endDate) status = "Vencida";
                    else if (progress < 30) status = "Em risco";
                    else if (progress < 70) status = "Em andamento";
                    else status = "Avançada";
                    
                    return (
                      <tr key={goal.id}>
                        <td>{goal.name}</td>
                        <td>{goal.metricType}</td>
                        <td>{goal.target}</td>
                        <td>{goal.current}</td>
                        <td>
                          <div className={classes.progressContainer}>
                            <div style={{ flex: 1 }}>
                              <div style={{ 
                                height: 8, 
                                width: `${Math.min(100, progress)}%`,
                                backgroundColor: 
                                  progress >= 100 ? '#4caf50' : 
                                  progress >= 70 ? '#ff9800' : 
                                  '#f44336',
                                borderRadius: 4
                              }} />
                            </div>
                            <span className={classes.progressValue}>{progress}%</span>
                          </div>
                        </td>
                        <td>{moment(goal.endDate).format('DD/MM/YYYY')}</td>
                        <td>{status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Paper>
        </div>
      </div>
    );
  };

  // Renderizar o dashboard de funcionários
  const renderEmployeesDashboard = () => {
    const employeeRanking = getEmployeeRankingData();
    const departmentPerformanceData = getDepartmentPerformanceData();
    
    // Calcular dados de radar para desempenho de habilidades
    const getSkillsData = () => {
      const topEmployees = employeeRanking.slice(0, 5);
      
      // Calcular diferentes métricas para cada funcionário
      return topEmployees.map(employee => {
        const empGoals = employeeGoals.filter(eg => eg.employeeId === employee.id);
        const metricTypes = {};
        
        // Agrupar metas por tipo e calcular progresso médio por tipo
        empGoals.forEach(eg => {
          const goal = goals.find(g => g.id === eg.goalId);
          if (goal && goal.metricType) {
            if (!metricTypes[goal.metricType]) {
              metricTypes[goal.metricType] = {
                total: 0,
                count: 0
              };
            }
            
            const progress = eg.individualTarget > 0 ? 
              Math.round((eg.individualCurrent / eg.individualTarget) * 100) : 0;
            
            metricTypes[goal.metricType].total += progress;
            metricTypes[goal.metricType].count += 1;
          }
        });
        
        // Calcular médias
        const skillsData = {};
        Object.entries(metricTypes).forEach(([type, data]) => {
          skillsData[type] = data.count > 0 ? Math.round(data.total / data.count) : 0;
        });
        
        return {
          name: employee.name,
          ...skillsData
        };
      });
    };
    
    const skillsData = getSkillsData();
    
    // Obter todos os tipos de métricas usados para o gráfico radar
    const getMetricTypes = () => {
      const types = new Set();
      goals.forEach(goal => {
        if (goal.metricType) types.add(goal.metricType);
      });
      return Array.from(types);
    };
    
    const metricTypes = getMetricTypes();

    const barData = []; 

    metricTypes.forEach(metricType => {
  const metricData = {
    name: metricType, 
  }; 

  skillsData.forEach(employee => {
    metricData[employee.name] = employee[metricType] || 0; 
  }); 

  barData.push(metricData)
})

    const employeeNames = skillsData.map(emp => emp.name); 
    
    return (
      <div className={classes.dashboardContainer}>
        {/* KPIs de Funcionários */}
        <Grid container spacing={3} className={classes.section}>
          <Grid item xs={12} md={4}>
            <Paper className={classes.cardMetric}>
              <div className={classes.metricValue}>
                {employeeRanking.filter(e => e.averageProgress >= 90).length}
              </div>
              <div className={classes.metricLabel}>
                Funcionários com Alta Performance
              </div>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper className={classes.cardMetric}>
              <div className={classes.metricValue}>
                {employeeRanking.length > 0 ? 
                  Math.round(
                    employeeRanking.reduce((sum, emp) => sum + emp.averageProgress, 0) 
                    / employeeRanking.length
                  ) + "%" : 
                  "0%"}
              </div>
              <div className={classes.metricLabel}>
                Progresso Médio dos Funcionários
              </div>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper className={classes.cardMetric}>
              <div className={classes.metricValue}>
                {employeeRanking.filter(e => e.completedGoals > 0).length}
              </div>
              <div className={classes.metricLabel}>
                Funcionários com Metas Concluídas
              </div>
            </Paper>
          </Grid>
        </Grid>

        {/* Radar de Desempenho por Habilidade */}
        <div className={classes.section}>
          <Typography variant="h6" gutterBottom>Desempenho por Tipo de Meta (Top 5 Funcionários)</Typography>
          <Paper className={classes.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={barData}
                margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45} 
                  textAnchor="end" 
                  height={80} 
                  interval={0}
                  label={{ value: 'Tipos de Meta', position: 'insideBottom', offset: -10 }}
                />
                <YAxis 
                  label={{ value: 'Progresso (%)', angle: -90, position: 'insideLeft' }}
                  domain={[0, 100]} // Fixar escala de 0 a 100%
                />
                <RechartsTooltip formatter={(value) => [`${value}%`, 'Progresso']} />
                <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: 20 }} />
                
                {/* Criar uma barra para cada funcionário */}
                {employeeNames.map((name, index) => (
                  <Bar 
                    key={name} 
                    dataKey={name} 
                    name={name} 
                    fill={COLORS[index % COLORS.length]} 
                    barSize={30}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </div>

        {/* Tabela de Ranking de Funcionários */}
        <div className={classes.section}>
          <div className={classes.tableTitle}>
            <Typography variant="h6">Ranking de Desempenho dos Funcionários</Typography>
          </div>
          <Paper className={classes.tabPaper}>
            <div className={classes.tableContainer}>
              <table className={classes.goalsTable}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Nome</th>
                    <th>Departamento</th>
                    <th>Total de Metas</th>
                    <th>Metas Concluídas</th>
                    <th>Taxa de Conclusão</th>
                    <th>Progresso Médio</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeRanking.map((employee, index) => (
                    <tr key={employee.id}>
                      <td>{index + 1}</td>
                      <td>{employee.name}</td>
                      <td>{employee.department || "-"}</td>
                      <td>{employee.totalGoals}</td>
                      <td>{employee.completedGoals}</td>
                      <td>
                        {employee.totalGoals > 0 ? 
                          Math.round((employee.completedGoals / employee.totalGoals) * 100) + "%" : 
                          "0%"}
                      </td>
                      <td>
                        <div className={classes.progressContainer}>
                          <div style={{ flex: 1 }}>
                            <div style={{ 
                              height: 8, 
                              width: `${Math.min(100, employee.averageProgress)}%`,
                              backgroundColor: 
                                employee.averageProgress >= 90 ? '#4caf50' : 
                                employee.averageProgress >= 70 ? '#ff9800' : 
                                '#f44336',
                              borderRadius: 4
                            }} />
                          </div>
                          <span className={classes.progressValue}>{employee.averageProgress}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Paper>
        </div>
      </div>
    );
  };

  // Renderizar o dashboard de campanhas
  const renderCampaignsDashboard = () => {
    const campaignData = getCampaignPerformanceData();
    
    return (
      <div className={classes.dashboardContainer}>
        {/* KPIs de Campanhas */}
        <Grid container spacing={3} className={classes.section}>
          <Grid item xs={12} md={4}>
            <Paper className={classes.cardMetric}>
              <div className={classes.metricValue}>
                {campaigns.length}
              </div>
              <div className={classes.metricLabel}>
                Total de Campanhas
              </div>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper className={classes.cardMetric}>
              <div className={classes.metricValue}>
                {campaigns.filter(c => {
                  const now = new Date();
                  const startDate = new Date(c.startDate);
                  const endDate = new Date(c.endDate);
                  return now >= startDate && now <= endDate;
                }).length}
              </div>
              <div className={classes.metricLabel}>
                Campanhas Ativas
              </div>
            </Paper>
          </Grid>
          <Grid item xs={12} md={4}>
            <Paper className={classes.cardMetric}>
              <div className={classes.metricValue}>
                {campaignData.length > 0 ? 
                  Math.round(
                    campaignData.reduce((sum, c) => sum + c.avgProgress, 0) 
                    / campaignData.length
                  ) + "%" : 
                  "0%"}
              </div>
              <div className={classes.metricLabel}>
                Progresso Médio
              </div>
            </Paper>
          </Grid>
        </Grid>

        {/* Desempenho das Campanhas */}
        <div className={classes.expandableSection}>
          <div className={classes.sectionHeader}>
            <IconButton 
              size="small" 
              className={classes.expandButton}
              onClick={() => toggleSection("campaignPerformance")}
            >
              {expandedSections.campaignPerformance ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
            <Typography variant="h6">Desempenho das Campanhas</Typography>
          </div>          
          {expandedSections.campaignPerformance && (
            <Paper className={classes.chartContainer} data-section="campaignPerformance">
              {/* Adicionando um título para o gráfico */}
              <Typography variant="subtitle1" className={classes.chartTitle}>
                Desempenho das Campanhas
              </Typography>
              
              {/* Aumentando a altura do gráfico para 300px (80% de 400px é muito pequeno) */}
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart
                  data={campaignData}
                  margin={{ top: 20, right: 50, left: 20, bottom: 100 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end"
                    height={100}
                    interval={0}
                    tick={{ dy: 10, fontSize: 12 }}
                  />
                  <YAxis 
                    yAxisId="left" 
                    domain={[0, 100]}
                    label={{ value: 'Progresso (%)', angle: -90, position: 'insideLeft' }} 
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right" 
                    domain={[0, 'dataMax + 2']}
                    allowDecimals={false}
                    label={{ value: 'Nº de Metas', angle: 90, position: 'insideRight' }} 
                  />
                  <RechartsTooltip 
                    formatter={(value, name) => {
                      if (name === "Progresso Médio") return [`${value}%`, name];
                      return [value, name];
                    }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    wrapperStyle={{ paddingBottom: 15 }} 
                    iconType="circle"
                  />
                  
                  {/* Progresso como linha */}
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="avgProgress"
                    name="Progresso Médio"
                    stroke="#8884d8"
                    strokeWidth={3}
                    dot={{ r: 6 }}
                  />
                  
                  {/* Total de metas como barras */}
                  <Bar
                    yAxisId="right"
                    dataKey="totalGoals"
                    name="Total de Metas"
                    fill="#82ca9d"
                    barSize={25}
                  />
                  
                  {/* Metas concluídas como barras */}
                  <Bar
                    yAxisId="right"
                    dataKey="completedGoals"
                    name="Metas Concluídas"
                    fill="#ff7300"
                    barSize={25}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </Paper>
          )}
        </div>

        {/* Tabela de Campanhas */}
        <div className={classes.section}>
          <div className={classes.tableTitle}>
            <Typography variant="h6">Tabela de Campanhas</Typography>
          </div>
          <Paper className={classes.tabPaper}>
            <div className={classes.tableContainer}>
              <table className={classes.goalsTable}>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Descrição</th>
                    <th>Data Início</th>
                    <th>Data Término</th>
                    <th>Metas Associadas</th>
                    <th>Progresso Médio</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map(campaign => {
                    const campaignStats = campaignData.find(c => c.name === campaign.name) || {
                      totalGoals: 0,
                      completedGoals: 0,
                      avgProgress: 0
                    };
                    
                    const now = new Date();
                    const startDate = new Date(campaign.startDate);
                    const endDate = new Date(campaign.endDate);
                    
                    let status;
                    if (now < startDate) status = "Não iniciada";
                    else if (now > endDate) status = "Finalizada";
                    else status = "Em andamento";
                    
                    return (
                      <tr key={campaign.id}>
                        <td>{campaign.name}</td>
                        <td>{campaign.description || "-"}</td>
                        <td>{moment(campaign.startDate).format('DD/MM/YYYY')}</td>
                        <td>{moment(campaign.endDate).format('DD/MM/YYYY')}</td>
                        <td>{campaignStats.totalGoals}</td>
                        <td>
                          <div className={classes.progressContainer}>
                            <div style={{ flex: 1 }}>
                              <div style={{ 
                                height: 8, 
                                width: `${Math.min(100, campaignStats.avgProgress)}%`,
                                backgroundColor: 
                                  campaignStats.avgProgress >= 90 ? '#4caf50' : 
                                  campaignStats.avgProgress >= 70 ? '#ff9800' : 
                                  '#f44336',
                                borderRadius: 4
                              }} />
                            </div>
                            <span className={classes.progressValue}>{campaignStats.avgProgress}%</span>
                          </div>
                        </td>
                        <td>{status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Paper>
        </div>
      </div>
    );
  };

  return (
    <MainContainer>
      <MainHeader>
        <div className={classes.headerContainer}>
          <IconButton onClick={() => history.push('/gestao-desempenho')} className={classes.headerButton}>
            <ArrowBackIcon />
          </IconButton>
          <Title>Relatórios e Dashboards de Desempenho</Title>
        </div>
        <MainHeaderButtonsWrapper>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<FilterListIcon />}
            onClick={() => setFilterOpen(!filterOpen)}
            className={classes.headerButton}
          >
            Filtros
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<PictureAsPdfIcon />}
            onClick={exportToPdf}
            className={classes.headerButton}
          >
            Exportar PDF
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<PrintIcon />}
            onClick={() => window.print()}
            className={classes.headerButton}
          >
            Imprimir
          </Button>
        </MainHeaderButtonsWrapper>
      </MainHeader>

      {filterOpen && (
        <Paper className={classes.filterBox}>
          <Grid container spacing={2} alignItems="center">
            <Grid item className={classes.filterItem}>
              <TextField
                label="Data Inicial"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Grid>
            <Grid item className={classes.filterItem}>
              <TextField
                label="Data Final"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Grid>
            <Grid item className={classes.filterItem}>
              <FormControl fullWidth>
                <InputLabel>Funcionário</InputLabel>
                <Select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  {employees.map((emp) => (
                    <MenuItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item className={classes.filterItem}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Meta</InputLabel>
                <Select
                  value={selectedGoalType}
                  onChange={(e) => setSelectedGoalType(e.target.value)}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  {getMetricTypes().map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item className={classes.filterItem}>
              <FormControl fullWidth>
                <InputLabel>Campanha</InputLabel>
                <Select
                  value={selectedCampaign}
                  onChange={(e) => setSelectedCampaign(e.target.value)}
                >
                  <MenuItem value="all">Todas</MenuItem>
                  {campaigns.map((campaign) => (
                    <MenuItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item>
              <Button 
                variant="contained" 
                color="primary" 
                onClick={handleApplyFilter}
              >
                Aplicar Filtros
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}

      <Paper className={classes.mainPaper}>
        {/* Abas para navegação entre os diferentes dashboards */}
        <Tabs
          value={tab}
          onChange={(e, newValue) => setTab(newValue)}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="Visão Geral" />
          <Tab label="Metas" />
          <Tab label="Funcionários" />
          <Tab label="Campanhas" />
        </Tabs>

        {/* Área de impressão */}
        <div ref={reportRef} className={classes.printArea}>
          {renderContent()}
        </div>
      </Paper>
    </MainContainer>
  );
};

export default PerformanceDashboard;