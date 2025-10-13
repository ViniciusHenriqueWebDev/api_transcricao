import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  CircularProgress,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  FormHelperText,
  Chip,
  Box,
  Typography,
  Paper,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { toast } from "react-toastify";
import { format } from "date-fns";
import { Alert, AlertTitle } from "@material-ui/lab";

import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  dialogPaper: {
    maxWidth: 900,
    width: '90%',
    maxHeight: '85vh',
  },
  sectionTitle: {
    fontWeight: 500,
    marginBottom: theme.spacing(2),
    display: 'flex',
    alignItems: 'center',
  },
  sectionIcon: {
    marginRight: theme.spacing(1),
    color: theme.palette.primary.main,
  },
  section: {
    marginBottom: theme.spacing(3),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.divider}`,
  },
  divider: {
    margin: theme.spacing(3, 0),
  },
  chip: {
    margin: theme.spacing(0.5),
  },
  productRow: {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: theme.shape.borderRadius,
    padding: theme.spacing(1),
    marginBottom: theme.spacing(1),
  },
  employeeBox: {
    marginBottom: theme.spacing(2),
    padding: theme.spacing(2),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
  },
  summaryBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing(1, 2),
    backgroundColor: theme.palette.background.paper,
    borderRadius: theme.shape.borderRadius,
    marginBottom: theme.spacing(2),
  },
  totalProgress: {
    display: 'flex',
    alignItems: 'center',
    "& > *": {
      marginRight: theme.spacing(2),
    },
    "& > *:last-child": {
      marginRight: 0,
    },
  },
  successText: {
    color: theme.palette.success.main,
    fontWeight: 500,
  },
  warningText: {
    color: theme.palette.warning.main,
    fontWeight: 500,
  },
  errorText: {
    color: theme.palette.error.main,
    fontWeight: 500,
  },
}));

const GoalModal = ({ open, onClose, goalData, onSave }) => {
  const classes = useStyles();
  const [employees, setEmployees] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [employeeProducts, setEmployeeProducts] = useState({});
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  
  // Form state
  const [formValues, setFormValues] = useState({
    name: "",
    description: "",
    metricType: "quantidade",
    target: "",
    current: 0,
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(new Date(new Date().setMonth(new Date().getMonth() + 1)), "yyyy-MM-dd"),
    employeeIds: [],
    performanceCampaignId: "",
    reward: "",
    rewardValue: "",
    dividedGoal: false,
    rewardStatus: "pendente"
  });

  // Função para carregar funcionários
  const fetchEmployees = async () => {
    try {
      const { data } = await api.get("/employees");
      setEmployees(data.employees.filter(emp => emp.status));
    } catch (error) {
      toast.error("Erro ao carregar funcionários");
    }
  };

  // Função para carregar campanhas
  const fetchCampaigns = async () => {
    try {
      const { data } = await api.get("/performance-campaigns");
      setCampaigns(data.campaigns.filter(camp => camp.status));
    } catch (error) {
      toast.error("Erro ao carregar campanhas");
    }
  };

  // Carregar dados iniciais quando o modal for aberto
  useEffect(() => {
    if (open) {
      fetchEmployees();
      fetchCampaigns();
    }
  }, [open]);

  // Inicializar o formulário com os dados existentes (edição)
// Modificar o useEffect que carrega os dados da meta para edição
useEffect(() => {
  if (goalData) {
    setFormValues({
      name: goalData.name || "",
      description: goalData.description || "",
      metricType: goalData.metricType || "quantidade",
      target: goalData.target || "",
      current: goalData.current || 0,
      startDate: goalData.startDate
        ? format(new Date(goalData.startDate), "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd"),
      endDate: goalData.endDate
        ? format(new Date(goalData.endDate), "yyyy-MM-dd")
        : format(new Date(new Date().setMonth(new Date().getMonth() + 1)), "yyyy-MM-dd"),
      employeeIds: goalData.employeeGoals
        ? [...new Set(goalData.employeeGoals.map(eg => eg.employeeId))]
        : [],
      performanceCampaignId: goalData.performanceCampaignId || "",
      reward: goalData.reward || "",
      rewardValue: goalData.rewardValue || "",
      dividedGoal: goalData.dividedGoal || false,
      rewardStatus: goalData.rewardStatus || "pendente"
    });

    // Processar configuração de produtos se existir
    if (goalData.metricType === "produto") {
      const initialProductConfig = {};
      
      try {
        if (goalData.productConfig) {
          // Se o productConfig estiver como string, tentar fazer o parse
          if (typeof goalData.productConfig === 'string') {
            const parsedConfig = JSON.parse(goalData.productConfig);
            Object.keys(parsedConfig).forEach(employeeId => {
              initialProductConfig[employeeId] = parsedConfig[employeeId];
            });
          } 
          // Se já for um objeto, usar diretamente
          else if (typeof goalData.productConfig === 'object') {
            Object.keys(goalData.productConfig).forEach(employeeId => {
              initialProductConfig[employeeId] = goalData.productConfig[employeeId];
            });
          }
        } 
        // Só usar employeeGoals se não houver productConfig definido
        else if (goalData.employeeGoals && goalData.employeeGoals.length > 0) {
          // Usar um Map para agrupar por funcionário
          const employeeProductsMap = new Map();
          
          goalData.employeeGoals.forEach(eg => {
            if (eg.productName) {
              // Criar chave para o funcionário
              const empId = eg.employeeId.toString();
              
              // Verificar se já temos um registro para este funcionário
              if (!employeeProductsMap.has(empId)) {
                employeeProductsMap.set(empId, { products: [] });
              }
              
              // Verificar se o produto já existe para este funcionário
              const existingProducts = employeeProductsMap.get(empId).products;
              const productExists = existingProducts.some(
                p => p.productName === eg.productName
              );
              
              // Só adicionar se o produto não existir
              if (!productExists) {
                employeeProductsMap.get(empId).products.push({
                  productName: eg.productName,
                  individualTarget: eg.individualTarget,
                  individualCurrent: eg.individualCurrent || 0
                });
              }
            }
          });
          
          // Converter o Map para o formato esperado
          employeeProductsMap.forEach((value, key) => {
            initialProductConfig[key] = value;
          });
        }
        
        setEmployeeProducts(initialProductConfig);
      } catch (error) {
        console.error("Erro ao processar configuração de produtos:", error);
        setEmployeeProducts({});
      }
    }
  }
}, [goalData]);

  // Validação de campos
  const validateField = (name, value) => {
    let error = "";

    switch (name) {
      case "name":
        if (!value || value.trim().length === 0) {
          error = "Nome é obrigatório";
        } else if (value.length < 2) {
          error = "Nome muito curto";
        }
        break;
      
      case "metricType":
        if (!value) {
          error = "Tipo de métrica é obrigatório";
        }
        break;
      
      case "target":
        if (!value) {
          error = "Valor alvo é obrigatório";
        } else if (Number(value) <= 0) {
          error = "O valor da meta deve ser positivo";
        }
        break;
      
      case "startDate":
        if (!value) {
          error = "Data de início é obrigatória";
        }
        break;
      
      case "endDate":
        if (!value) {
          error = "Data de término é obrigatória";
        } else {
          const startDate = new Date(formValues.startDate);
          const endDate = new Date(value);
          
          if (endDate < startDate) {
            error = "Data de término deve ser posterior à data de início";
          }
        }
        break;
      
      case "employeeIds":
        if (!value || value.length === 0) {
          error = "Selecione pelo menos um funcionário";
        }
        break;
      
      default:
        break;
    }

    return error;
  };

  // Validar formulário inteiro
  const validateForm = () => {
    const newErrors = {};
    const newTouched = {};
    
    // Validar cada campo
    Object.keys(formValues).forEach(field => {
      newTouched[field] = true;
      const error = validateField(field, formValues[field]);
      if (error) {
        newErrors[field] = error;
      }
    });
    
    setErrors(newErrors);
    setTouched(newTouched);
    
    return Object.keys(newErrors).length === 0;
  };

  // Handler para alteração de campo
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Para checkboxes, usar o valor de 'checked'
    const fieldValue = type === 'checkbox' ? checked : value;
    
    setFormValues(prev => ({
      ...prev,
      [name]: fieldValue
    }));
    
    // Marcar campo como 'tocado' para validação
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    
    // Validar campo
    const error = validateField(name, fieldValue);
    setErrors(prev => ({
      ...prev,
      [name]: error
    }));
    
    // Se o tipo de métrica mudar para 'produto', inicializar estrutura de produtos
    if (name === 'metricType' && value === 'produto') {
      initializeProductStructure(formValues.employeeIds);
    }
  };

  // Manipulação de select múltiplo (funcionários)
  const handleEmployeeChange = (e) => {
    const selectedEmployeeIds = e.target.value;
    
    setFormValues(prev => ({
      ...prev,
      employeeIds: selectedEmployeeIds
    }));
    
    // Marcar como tocado
    setTouched(prev => ({
      ...prev,
      employeeIds: true
    }));
    
    // Validar
    const error = validateField('employeeIds', selectedEmployeeIds);
    setErrors(prev => ({
      ...prev,
      employeeIds: error
    }));
    
    // Se o tipo de métrica for 'produto', atualizar estrutura de produtos
    if (formValues.metricType === 'produto') {
      initializeProductStructure(selectedEmployeeIds);
    }
  };

  // Inicializar estrutura de produtos para funcionários selecionados
  const initializeProductStructure = (selectedEmployeeIds) => {
    const updatedProducts = { ...employeeProducts };
    
    selectedEmployeeIds.forEach(id => {
      const strId = id.toString();
      if (!updatedProducts[strId]) {
        updatedProducts[strId] = { products: [] };
      }
    });
    
    setEmployeeProducts(updatedProducts);
  };

  // Cálculo do total de metas individuais
  const calculateTotalIndividualTargets = (employeeIds) => {
    let total = 0;
    
    if (!employeeIds) return total;
    
    employeeIds.forEach(id => {
      const strId = id.toString();
      const products = employeeProducts[strId]?.products || [];
      products.forEach(p => {
        total += Number(p.individualTarget) || 0;
      });
    });
    
    return total;
  };

  // Funções para manipular produtos
  const addProduct = (employeeId) => {
    const strId = employeeId.toString();
    const updatedProducts = { ...employeeProducts };
    
    if (!updatedProducts[strId]) {
      updatedProducts[strId] = { products: [] };
    }
    
    updatedProducts[strId].products = [
      ...(updatedProducts[strId].products || []),
      { productName: "", individualTarget: "" }
    ];
    
    setEmployeeProducts(updatedProducts);
  };
  
  const removeProduct = (employeeId, index) => {
    const strId = employeeId.toString();
    const updatedProducts = { ...employeeProducts };
    
    if (updatedProducts[strId] && Array.isArray(updatedProducts[strId].products)) {
      updatedProducts[strId].products.splice(index, 1);
      setEmployeeProducts(updatedProducts);
    }
  };
  
  const updateProduct = (employeeId, index, fieldName, value) => {
    const strId = employeeId.toString();
    const updatedProducts = { ...employeeProducts };
    
    if (
      updatedProducts[strId] && 
      Array.isArray(updatedProducts[strId].products) && 
      index >= 0 && 
      index < updatedProducts[strId].products.length
    ) {
      const newValue = fieldName === 'individualTarget' ? Number(value) : value;
      
      updatedProducts[strId].products[index] = {
        ...updatedProducts[strId].products[index],
        [fieldName]: newValue
      };
      
      setEmployeeProducts(updatedProducts);
    }
  };

  // Validação antes de enviar o formulário
  const validateBeforeSubmit = () => {
    // Validação básica do formulário
    const isFormValid = validateForm();
    
    if (!isFormValid) {
      return false;
    }
    
    // Validar produtos se o tipo de meta for "produto"
    if (formValues.metricType === "produto") {
      // Verificar se todos os funcionários têm pelo menos um produto
      const hasInvalidProducts = formValues.employeeIds.some(id => {
        const strId = id.toString();
        const products = employeeProducts[strId]?.products || [];
        return products.length === 0 || products.some(p => !p.productName || !p.individualTarget);
      });
      
      if (hasInvalidProducts) {
        toast.error("Todos os funcionários devem ter pelo menos um produto com nome e meta definidos");
        return false;
      }
      
      // Verificar se a soma das metas individuais não ultrapassa a meta total
      const totalIndividualTargets = calculateTotalIndividualTargets(formValues.employeeIds);
      
      if (totalIndividualTargets > Number(formValues.target)) {
        toast.error(`A soma das metas individuais (${totalIndividualTargets}) não pode ultrapassar a meta total (${formValues.target})`);
        return false;
      }
    }
    
    return true;
  };

  // Handler para submissão do formulário
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateBeforeSubmit()) {
      return;
    }
    
    setLoading(true);
    setSubmitting(true);
    
    try {
      // Criar payload para enviar ao backend
      const payload = {
        ...formValues,
        target: Number(formValues.target),
        rewardValue: formValues.rewardValue ? Number(formValues.rewardValue) : null,
        performanceCampaignId: formValues.performanceCampaignId || null,
        productConfig: formValues.metricType === "produto" ? employeeProducts : null
      };

      console.log("Enviando payload:", payload);

      if (goalData) {
        // Atualizar meta existente
        await api.put(`/goals/${goalData.id}`, payload);
        toast.success("Meta atualizada com sucesso!");
      } else {
        // Criar nova meta
        const response = await api.post("/goals", payload);
        console.log("Resposta do servidor:", response.data);
        toast.success("Meta criada com sucesso!");
      }

      // Limpar o formulário após salvar com sucesso
      setFormValues({
        name: "",
        description: "",
        metricType: "quantidade",
        target: "",
        current: 0,
        startDate: format(new Date(), "yyyy-MM-dd"),
        endDate: format(new Date(new Date().setMonth(new Date().getMonth() + 1)), "yyyy-MM-dd"),
        employeeIds: [],
        performanceCampaignId: "",
        reward: "",
        rewardValue: "",
        dividedGoal: false,
        rewardStatus: "pendente"
      });
      
      setEmployeeProducts({});
      setErrors({});
      setTouched({});

      if (onSave) onSave();
      onClose();
    } catch (err) {
      console.error("Erro completo:", err);
      toast.error(err.response?.data?.error || "Erro ao salvar meta");
    } finally {
      setSubmitting(false);
      setLoading(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      classes={{ paper: classes.dialogPaper }}
      aria-labelledby="goal-dialog-title"
    >
      <DialogTitle id="goal-dialog-title">
        {goalData ? "Editar Meta" : "Nova Meta"}
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          {/* SEÇÃO 1: INFORMAÇÕES BÁSICAS */}
          <Box className={classes.section}>
            <Typography variant="h6" className={classes.sectionTitle}>
              Informações Básicas
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  name="name"
                  label="Nome da Meta"
                  fullWidth
                  variant="outlined"
                  value={formValues.name}
                  onChange={handleChange}
                  error={touched.name && Boolean(errors.name)}
                  helperText={touched.name && errors.name}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  name="description"
                  label="Descrição"
                  fullWidth
                  multiline
                  rows={2}
                  variant="outlined"
                  value={formValues.description}
                  onChange={handleChange}
                  error={touched.description && Boolean(errors.description)}
                  helperText={touched.description && errors.description}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <FormControl
                  variant="outlined"
                  fullWidth
                  error={touched.metricType && Boolean(errors.metricType)}
                >
                  <InputLabel>Tipo de Métrica</InputLabel>
                  <Select
                    name="metricType"
                    value={formValues.metricType}
                    onChange={handleChange}
                    label="Tipo de Métrica"
                  >
                    <MenuItem value="quantidade">Quantidade</MenuItem>
                    <MenuItem value="valor">Valor (R$)</MenuItem>
                    <MenuItem value="percentual">Percentual (%)</MenuItem>
                    <MenuItem value="produto">Produto</MenuItem>
                  </Select>
                  {touched.metricType && errors.metricType && (
                    <FormHelperText>{errors.metricType}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  name="target"
                  label="Meta a ser atingida"
                  type="number"
                  fullWidth
                  variant="outlined"
                  value={formValues.target}
                  onChange={handleChange}
                  InputProps={{
                    endAdornment: (
                      formValues.metricType === "valor" ? "R$" :
                        (formValues.metricType === "percentual" ? "%" : "")
                    )
                  }}
                  error={touched.target && Boolean(errors.target)}
                  helperText={touched.target && errors.target}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  name="startDate"
                  label="Data de Início"
                  type="date"
                  fullWidth
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                  value={formValues.startDate}
                  onChange={handleChange}
                  error={touched.startDate && Boolean(errors.startDate)}
                  helperText={touched.startDate && errors.startDate}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  name="endDate"
                  label="Data de Término"
                  type="date"
                  fullWidth
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                  value={formValues.endDate}
                  onChange={handleChange}
                  error={touched.endDate && Boolean(errors.endDate)}
                  helperText={touched.endDate && errors.endDate}
                />
              </Grid>

              <Grid item xs={12}>
                <FormControl
                  variant="outlined"
                  fullWidth
                  error={touched.performanceCampaignId && Boolean(errors.performanceCampaignId)}
                >
                  <InputLabel>Campanha de Desempenho (opcional)</InputLabel>
                  <Select
                    name="performanceCampaignId"
                    value={formValues.performanceCampaignId}
                    onChange={handleChange}
                    label="Campanha de Desempenho (opcional)"
                  >
                    <MenuItem value="">
                      <em>Nenhuma</em>
                    </MenuItem>
                    {campaigns.map(campaign => (
                      <MenuItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>

          {/* SEÇÃO 2: FUNCIONÁRIOS */}
          <Box className={classes.section}>
            <Typography variant="h6" className={classes.sectionTitle}>
              Funcionários
            </Typography>

            <FormControl
              variant="outlined"
              fullWidth
              error={touched.employeeIds && Boolean(errors.employeeIds)}
            >
              <InputLabel>Selecione os Funcionários</InputLabel>
              <Select
                multiple
                name="employeeIds"
                value={formValues.employeeIds}
                onChange={handleEmployeeChange}
                label="Selecione os Funcionários"
                renderValue={(selected) => (
                  <Box display="flex" flexWrap="wrap">
                    {selected.map(value => {
                      const employee = employees.find(emp => emp.id === value);
                      return (
                        <Chip
                          key={value}
                          label={employee ? employee.name : "Funcionário"}
                          className={classes.chip}
                        />
                      );
                    })}
                  </Box>
                )}
              >
                {employees.map(employee => (
                  <MenuItem key={employee.id} value={employee.id}>
                    <Checkbox checked={formValues.employeeIds.indexOf(employee.id) > -1} />
                    <ListItemText 
                      primary={employee.name} 
                      secondary={`${employee.position || "Cargo não definido"}`} 
                    />
                  </MenuItem>
                ))}
              </Select>
              {touched.employeeIds && errors.employeeIds && (
                <FormHelperText>{errors.employeeIds}</FormHelperText>
              )}
            </FormControl>

            {formValues.employeeIds.length > 1 && formValues.metricType !== "produto" && (
              <Box mt={2}>
                <Paper variant="outlined" style={{ padding: 16 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formValues.dividedGoal}
                        onChange={handleChange}
                        name="dividedGoal"
                        color="primary"
                      />
                    }
                    label="Dividir meta entre funcionários"
                  />
                  
                  {formValues.dividedGoal && formValues.target && formValues.employeeIds.length > 0 && (
                    <Alert severity="info" style={{ marginTop: 8 }}>
                      Cada funcionário terá uma meta individual de {Math.ceil(Number(formValues.target) / formValues.employeeIds.length)}
                    </Alert>
                  )}
                </Paper>
              </Box>
            )}
          </Box>

          {/* SEÇÃO 3: PRODUTOS (condicional) */}
          {formValues.metricType === "produto" && formValues.employeeIds.length > 0 && (
            <Box className={classes.section}>
              <Typography variant="h6" className={classes.sectionTitle}>
                Produtos por Funcionário
              </Typography>

              {formValues.target && (
                <Box className={classes.summaryBar}>
                  <Typography variant="subtitle2">
                    Meta Total: {formValues.target}
                  </Typography>

                  <Box className={classes.totalProgress}>
                    {(() => {
                      const totalIndividual = calculateTotalIndividualTargets(
                        formValues.employeeIds
                      );
                      const remaining = Number(formValues.target) - totalIndividual;
                      
                      return (
                        <>
                          <Typography 
                            variant="body2" 
                            className={totalIndividual > Number(formValues.target) ? classes.errorText : undefined}
                          >
                            Soma das Metas: {totalIndividual}
                          </Typography>
                          
                          <Typography 
                            variant="body2" 
                            className={
                              remaining < 0 ? classes.errorText : 
                              remaining > 0 ? classes.warningText : 
                              classes.successText
                            }
                          >
                            {remaining < 0 
                              ? `Excedente: ${Math.abs(remaining)}` 
                              : remaining > 0 
                                ? `Restante: ${remaining}` 
                                : 'Meta distribuída'}
                          </Typography>
                        </>
                      );
                    })()}
                  </Box>
                </Box>
              )}
              
              <Alert 
                severity={
                  calculateTotalIndividualTargets(formValues.employeeIds) > Number(formValues.target)
                    ? "warning"
                    : "info"
                } 
                style={{ marginBottom: 16 }}
              >
                <AlertTitle>
                  {calculateTotalIndividualTargets(formValues.employeeIds) > Number(formValues.target)
                    ? "Atenção"
                    : "Informação"
                  }
                </AlertTitle>
                {calculateTotalIndividualTargets(formValues.employeeIds) > Number(formValues.target)
                  ? "A soma das metas individuais está excedendo o valor da meta total!"
                  : "Defina os produtos e metas individuais para cada funcionário. A soma das metas individuais não deve ultrapassar a meta total."
                }
              </Alert>

              <Grid container spacing={2}>
                {formValues.employeeIds.map(employeeId => {
                  const employee = employees.find(emp => emp.id === employeeId);
                  const strId = employeeId.toString();
                  
                  // Inicializar a estrutura para este funcionário se não existir
                  if (!employeeProducts[strId]) {
                    const updatedProducts = { ...employeeProducts };
                    updatedProducts[strId] = { products: [] };
                    setTimeout(() => {
                      setEmployeeProducts(updatedProducts);
                    }, 0);
                  }
                  
                  // Obter os produtos deste funcionário
                  const products = employeeProducts[strId]?.products || [];
                  
                  return (
                    <Grid item xs={12} sm={6} key={employeeId}>
                      <Box className={classes.employeeBox}>
                        <Typography variant="subtitle2" gutterBottom>
                          {employee?.name || "Funcionário"}
                        </Typography>
                        
                        {products.length === 0 ? (
                          <Typography variant="body2" color="textSecondary" style={{ marginBottom: 8 }}>
                            Nenhum produto adicionado.
                          </Typography>
                        ) : (
                          products.map((product, index) => (
                            <Box
                              key={index}
                              className={classes.productRow}
                            >
                              <Box display="flex" justifyContent="space-between" mb={1}>
                                <Typography variant="body2" color="textSecondary">
                                  Produto {index + 1}
                                </Typography>
                                <Button 
                                  size="small" 
                                  color="secondary"
                                  onClick={() => removeProduct(employeeId, index)}
                                >
                                  Remover
                                </Button>
                              </Box>
                              
                              <TextField
                                variant="outlined"
                                label="Nome do Produto"
                                size="small"
                                fullWidth
                                style={{ marginBottom: 8 }}
                                value={product.productName || ""}
                                onChange={(e) => updateProduct(employeeId, index, "productName", e.target.value)}
                              />
                              <TextField
                                variant="outlined"
                                label="Meta Individual"
                                type="number"
                                size="small"
                                fullWidth
                                value={product.individualTarget || ""}
                                onChange={(e) => updateProduct(employeeId, index, "individualTarget", e.target.value)}
                                InputProps={{
                                  endAdornment: (
                                    <Box 
                                      component="span" 
                                      style={{ 
                                        fontSize: '0.75rem', 
                                        color: 'rgba(0, 0, 0, 0.54)' 
                                      }}
                                    >
                                      de {formValues.target}
                                    </Box>
                                  ),
                                }}
                              />
                            </Box>
                          ))
                        )}
                        
                        <Button
                          variant="outlined"
                          color="primary"
                          size="small"
                          onClick={() => addProduct(employeeId)}
                          style={{ marginTop: 8 }}
                        >
                          + Adicionar Produto
                        </Button>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>
          )}

          {/* SEÇÃO 4: RECOMPENSA */}
          <Box className={classes.section}>
            <Typography variant="h6" className={classes.sectionTitle}>
              Recompensa (opcional)
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={8}>
                <TextField
                  name="reward"
                  label="Descrição da Recompensa"
                  placeholder="Ex: Bônus, folga, prêmio, etc."
                  fullWidth
                  variant="outlined"
                  value={formValues.reward}
                  onChange={handleChange}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  name="rewardValue"
                  label="Valor da Recompensa (R$)"
                  type="number"
                  fullWidth
                  variant="outlined"
                  value={formValues.rewardValue}
                  onChange={handleChange}
                  InputProps={{
                    startAdornment: "R$ "
                  }}
                />
              </Grid>

              {goalData && (
                <Grid item xs={12}>
                  <FormControl variant="outlined" fullWidth>
                    <InputLabel>Status da Recompensa</InputLabel>
                    <Select
                      name="rewardStatus"
                      value={formValues.rewardStatus}
                      onChange={handleChange}
                      label="Status da Recompensa"
                    >
                      <MenuItem value="pendente">Pendente</MenuItem>
                      <MenuItem value="aprovada">Aprovada</MenuItem>
                      <MenuItem value="entregue">Entregue</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions style={{ padding: '16px 24px' }}>
          <Button onClick={onClose} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            color="primary"
            variant="contained"
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={20} /> : null}
          >
            {submitting ? "Salvando..." : "Salvar"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default GoalModal;