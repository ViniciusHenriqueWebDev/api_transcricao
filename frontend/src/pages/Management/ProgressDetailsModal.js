import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Grid,
  Paper,
  Divider,
  Box,
  Chip
} from "@material-ui/core";
import moment from "moment";
import "moment/locale/pt-br";
import ArrowUpwardIcon from "@material-ui/icons/ArrowUpward";
import ArrowDownwardIcon from "@material-ui/icons/ArrowDownward";
import RemoveIcon from "@material-ui/icons/Remove";

const useStyles = makeStyles((theme) => ({
  detailsPaper: {
    padding: theme.spacing(3),
    marginBottom: theme.spacing(2),
    background: "#f8f8f8"
  },
  infoLabel: {
    fontWeight: "bold",
    color: theme.palette.text.secondary,
    marginBottom: theme.spacing(0.5)
  },
  infoValue: {
    fontSize: "1rem",
    marginBottom: theme.spacing(2)
  },
  divider: {
    margin: theme.spacing(2, 0)
  },
  progressContainer: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    marginTop: theme.spacing(1)
  },
  diffChip: {
    fontWeight: "bold",
    padding: theme.spacing(0.5, 1)
  },
  diffIncrease: {
    backgroundColor: "#4caf50",
    color: "white"
  },
  diffDecrease: {
    backgroundColor: "#f44336",
    color: "white"
  },
  diffNeutral: {
    backgroundColor: "#9e9e9e",
    color: "white"
  },
  section: {
    marginBottom: theme.spacing(2)
  },
  metaInfo: {
    border: `1px solid ${theme.palette.divider}`,
    padding: theme.spacing(2),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: "white"
  },
  userChip: {
    backgroundColor: theme.palette.primary.main,
    color: "white",
    fontWeight: "bold"
  }
}));

const ProgressDetailsModal = ({ open, onClose, log }) => {
  const classes = useStyles();

  if (!log) return null;

  // Cálculo da diferença e definição do tipo de alteração
  const calculateChange = (oldValue, newValue) => {
    const diff = newValue - oldValue;
    
    if (diff > 0) {
      return {
        type: "increase",
        value: `+${diff}`,
        icon: <ArrowUpwardIcon />,
        className: classes.diffIncrease
      };
    } else if (diff < 0) {
      return {
        type: "decrease",
        value: `${diff}`,
        icon: <ArrowDownwardIcon />,
        className: classes.diffDecrease
      };
    } else {
      return {
        type: "neutral",
        value: "0",
        icon: <RemoveIcon />,
        className: classes.diffNeutral
      };
    }
  };

  const change = calculateChange(log.oldValue, log.newValue);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Detalhes da Alteração de Progresso
      </DialogTitle>
      <DialogContent>
        <Paper className={classes.detailsPaper} elevation={0}>
          <Grid container spacing={3}>
            {/* Informações básicas da alteração */}
            <Grid item xs={12} md={6}>
              <div className={classes.section}>
                <Typography className={classes.infoLabel} variant="subtitle2">
                  Data e Hora da Alteração
                </Typography>
                <Typography className={classes.infoValue}>
                  {moment(log.createdAt).format('DD/MM/YYYY HH:mm:ss')}
                </Typography>
              </div>

              <div className={classes.section}>
                <Typography className={classes.infoLabel} variant="subtitle2">
                  Usuário Responsável
                </Typography>
                <Chip
                  label={log.userName}
                  className={classes.userChip}
                />
              </div>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <div className={classes.section}>
                <Typography className={classes.infoLabel} variant="subtitle2">
                  Terminal / Navegador
                </Typography>
                <Typography className={classes.infoValue}>
                  {log.userAgent || "Não registrado"}
                </Typography>
              </div>
            </Grid>
          </Grid>
          
          <Divider className={classes.divider} />
          
          <Typography variant="h6" gutterBottom>
            Informações da Meta
          </Typography>
          
          <Grid container spacing={3} className={classes.metaInfo}>
            <Grid item xs={12} md={6}>
              <div className={classes.section}>
                <Typography className={classes.infoLabel} variant="subtitle2">
                  Nome da Meta
                </Typography>
                <Typography className={classes.infoValue}>
                  {log.goalName}
                </Typography>
              </div>
              
              <div className={classes.section}>
                <Typography className={classes.infoLabel} variant="subtitle2">
                  Funcionário
                </Typography>
                <Typography className={classes.infoValue}>
                  {log.employeeName}
                </Typography>
              </div>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <div className={classes.section}>
                <Typography className={classes.infoLabel} variant="subtitle2">
                  Meta Individual
                </Typography>
                <Typography className={classes.infoValue}>
                  {log.individualTarget || "Não especificado"}
                </Typography>
              </div>
            </Grid>
          </Grid>
          
          <Divider className={classes.divider} />
          
          {/* Alteração de Valor */}
          <Typography variant="h6" gutterBottom>
            Alteração de Valor
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={4}>
              <Box p={2} bgcolor="rgba(0, 0, 0, 0.04)" borderRadius={4} textAlign="center">
                <Typography className={classes.infoLabel} variant="subtitle2">
                  Valor Anterior
                </Typography>
                <Typography variant="h4">
                  {log.oldValue}
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={4}>
              <Box p={2} borderRadius={4} display="flex" justifyContent="center" alignItems="center">
                <Chip 
                  label={change.value}
                  icon={change.icon}
                  className={`${classes.diffChip} ${change.className}`}
                />
              </Box>
            </Grid>
            
            <Grid item xs={4}>
              <Box p={2} bgcolor="rgba(0, 0, 0, 0.04)" borderRadius={4} textAlign="center">
                <Typography className={classes.infoLabel} variant="subtitle2">
                  Novo Valor
                </Typography>
                <Typography variant="h4">
                  {log.newValue}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary">
          Fechar
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProgressDetailsModal;