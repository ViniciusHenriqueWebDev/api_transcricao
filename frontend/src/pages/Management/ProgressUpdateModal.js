import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  LinearProgress,
  CircularProgress,
  Grid
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { toast } from "react-toastify";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  progressBar: {
    height: 10,
    borderRadius: 5,
    marginTop: theme.spacing(2),
    marginBottom: theme.spacing(1)
  },
  progressLabel: {
    display: "flex",
    justifyContent: "space-between"
  },
  infoSection: {
    marginBottom: theme.spacing(3),
    padding: theme.spacing(2),
    backgroundColor: theme.palette.grey[50],
    borderRadius: theme.shape.borderRadius,
    border: `1px solid ${theme.palette.grey[200]}`
  }
}));

const ProgressUpdateModal = ({ 
  open, 
  onClose, 
  employeeGoal, 
  parentGoal,
  onSave 
}) => {
  const classes = useStyles();
  const [loading, setLoading] = useState(false);
  const [currentValue, setCurrentValue] = useState("");
  const [targetValue, setTargetValue] = useState("");
  
  useEffect(() => {
    if (employeeGoal) {
      setCurrentValue(employeeGoal.individualCurrent || 0);
      setTargetValue(employeeGoal.individualTarget || parentGoal?.target || 0);
    }
  }, [employeeGoal, parentGoal]);
  
  const calculateProgress = () => {
    const current = Number(currentValue) || 0;
    const target = Number(targetValue) || 1;
    return Math.min(Math.round((current / target) * 100), 100);
  };
  
  const handleSave = async () => {
    if (!employeeGoal) return;
    
    try {
      setLoading(true);
      
      if (isNaN(Number(currentValue)) || isNaN(Number(targetValue))) {
        toast.error("Por favor, insira valores numéricos válidos");
        setLoading(false);
        return;
      }
      
      await api.put(`/employee-goals/${employeeGoal.id}`, {
        individualTarget: Number(targetValue),
        individualCurrent: Number(currentValue)
      });
      
      toast.success("Progresso atualizado com sucesso!");
      setLoading(false);
      
      if (onSave) {
        onSave();
      }
      
    } catch (err) {
      console.error(err);
      toast.error("Erro ao atualizar progresso");
      setLoading(false);
    }
  };
  
  if (!employeeGoal || !parentGoal) {
    return null;
  }
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Atualizar Progresso Individual
      </DialogTitle>
      <DialogContent>
        <Box className={classes.infoSection}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="textSecondary">
                Funcionário
              </Typography>
              <Typography variant="h6">
                {employeeGoal.employee?.name || "Funcionário"}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {employeeGoal.employee?.position || ""}
                {employeeGoal.employee?.department ? ` • ${employeeGoal.employee.department}` : ""}
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="textSecondary">
                Meta
              </Typography>
              <Typography variant="h6">
                {parentGoal.name}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {parentGoal.metricType || ""}
              </Typography>
            </Grid>
          </Grid>
          
          <Box mt={3}>
            <Typography variant="subtitle2" gutterBottom>
              Progresso Atual: {calculateProgress()}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={calculateProgress()}
              className={classes.progressBar}
              color={calculateProgress() < 30 ? "secondary" : "primary"}
            />
            <Box className={classes.progressLabel}>
              <Typography variant="caption">
                {`${currentValue} de ${targetValue}`}
              </Typography>
              <Typography variant="caption">
                {calculateProgress() < 30
                  ? "Em risco"
                  : calculateProgress() < 70
                  ? "Em andamento"
                  : "Avançada"}
              </Typography>
            </Box>
          </Box>
        </Box>
        
        <Box mt={3}>
          <Typography variant="h6" gutterBottom>
            Atualizar Valores
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Meta Individual"
                fullWidth
                variant="outlined"
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                helperText={`Meta original: ${parentGoal.target}`}
                InputProps={{
                  inputProps: { min: 0 }
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Valor Atual"
                fullWidth
                variant="outlined"
                type="number"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                InputProps={{
                  inputProps: { min: 0 }
                }}
              />
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="default">
          Cancelar
        </Button>
        <Button 
          onClick={handleSave} 
          color="primary" 
          variant="contained" 
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProgressUpdateModal;