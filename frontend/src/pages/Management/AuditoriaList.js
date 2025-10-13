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
  TextField,
  InputAdornment,
  Typography,
  IconButton,
  Chip,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Button
} from "@material-ui/core";
import Dialog from "@material-ui/core/Dialog";
import ErrorOutlineIcon from "@material-ui/icons/ErrorOutline";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogActions from "@material-ui/core/DialogActions";
import DeleteSweepIcon from "@material-ui/icons/DeleteSweep";
import SearchIcon from "@material-ui/icons/Search";
import VisibilityIcon from "@material-ui/icons/Visibility";
import DateRangeIcon from "@material-ui/icons/DateRange";
import FilterListIcon from "@material-ui/icons/FilterList";
import moment from "moment";
import "moment/locale/pt-br";
import api from "../../services/api";
import { toast } from "react-toastify";
import ProgressDetailsModal from "./ProgressDetailsModal";

const useStyles = makeStyles(theme => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(2),
    margin: theme.spacing(1),
    overflowY: "hidden",
    ...theme.scrollbarStyles
  },
  toolbarContainer: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: theme.spacing(2),
    gap: theme.spacing(1),
    flexWrap: "wrap"
  },
  searchBox: {
    flex: 1,
    maxWidth: "50%"
  },
  tableContainer: {
    flex: 1,
    overflowY: "auto",
    ...theme.scrollbarStyles,
    "& th, & td": {
      padding: theme.spacing(1)
    }
  },
  filterContainer: {
    display: "flex",
    gap: theme.spacing(1),
    alignItems: "center",
    flexWrap: "wrap"
  },
  formControl: {
    minWidth: 150
  },
  userChip: {
    backgroundColor: theme.palette.primary.main,
    color: "white",
    fontWeight: "bold"
  },
  dateRangeContainer: {
    display: "flex",
    gap: theme.spacing(1),
    alignItems: "center"
  },
  diffChip: {
    fontWeight: "bold"
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
  dateRangeField: {
    width: 150
  },
  filterButton: {
    marginLeft: theme.spacing(1)
  },
  deleteButton: {
    backgroundColor: theme.palette.error.main,
    color: "#fff",
    fontWeight: "bold",
    '&:hover': {
      backgroundColor: theme.palette.error.dark,
    },
    minWidth: 160,
    boxShadow: "none"
  },
  dialogTitle: {
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    color: theme.palette.error.main,
    fontWeight: "bold"
  },
  dialogDeleteBtn: {
    backgroundColor: theme.palette.error.main,
    color: "#fff",
    '&:hover': {
      backgroundColor: theme.palette.error.dark,
    }
  }
}));

const AuditoriaList = () => {
  const classes = useStyles();
  const [loading, setLoading] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [searchParam, setSearchParam] = useState("");
  const [startDate, setStartDate] = useState("");  // Removido o valor padrão
  const [endDate, setEndDate] = useState("");      // Removido o valor padrão
  const [selectedProgressLog, setSelectedProgressLog] = useState(null);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDeleteAll = async () => {
    setConfirmOpen(true);
  }

  const handleConfirmDelete = async () => {
    setConfirmOpen(false);
    setLoading(true);
    try {
      await api.delete("/audit-logs/progress/all");
      toast.success("Todos os registros de auditoria foram apagados.");
      setAuditLogs([]);
    } catch (err) {
      toast.error("Erro ao apagar registros de auditoria.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const { data } = await api.get("/employees");
      setEmployees(data.employees);
    } catch (err) {
      toast.error("Erro ao carregar funcionários");
      console.log(err);
    }
  };
  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      // Montar query params para filtros
      const params = new URLSearchParams();

      // Adicionar datas apenas se estiverem preenchidas
      if (startDate && startDate.trim() !== "") {
        params.append('startDate', startDate);
      }

      if (endDate && endDate.trim() !== "") {
        params.append('endDate', endDate);
      }

      // Adicionar filtro de tipo apenas se não for "all"
      if (filterType && filterType !== "all") {
        params.append('changeType', filterType);
      }

      // Adicionar filtro de funcionário apenas se não for "all"
      if (selectedEmployee && selectedEmployee !== "all") {
        params.append('employeeId', selectedEmployee);
      }

      // Adicionar termo de busca se existir
      if (searchParam && searchParam.trim() !== "") {
        params.append('searchParam', searchParam.trim());
      }

      const { data } = await api.get(`/audit-logs/progress?${params.toString()}`);

      if (data && data.logs) {
        setAuditLogs(data.logs);
      } else {
        setAuditLogs([]);
        toast.info("Nenhum log de auditoria encontrado");
      }
    } catch (err) {
      toast.error("Erro ao carregar logs de auditoria");
      console.error(err);
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadAuditLogs();
  };

  const handleViewDetails = (log) => {
    setSelectedProgressLog(log);
    setProgressModalOpen(true);
  };

  const getChangeTypeColor = (type) => {
    switch (type) {
      case "increase":
        return classes.diffIncrease;
      case "decrease":
        return classes.diffDecrease;
      default:
        return classes.diffNeutral;
    }
  };

  const formatChangeType = (type, oldValue, newValue) => {
    const diff = newValue - oldValue;
    const sign = diff > 0 ? "+" : "";

    return (
      <Chip
        className={`${classes.diffChip} ${getChangeTypeColor(type)}`}
        label={`${sign}${diff}`}
        size="small"
      />
    );
  };

  return (
    <Paper className={classes.mainPaper} elevation={0}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <Button
          variant="contained"
          startIcon={<DeleteSweepIcon />}
          onClick={handleDeleteAll}
          className={classes.deleteButton}
          disabled={loading || auditLogs.length === 0}
          size="large"
        >
          APAGAR TODOS
        </Button>
      </div>
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title" className={classes.dialogTitle}>
          <ErrorOutlineIcon color="error" />
          Apagar todos os registros?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Tem certeza que deseja apagar <b>TODOS</b> os registros de auditoria?<br />
            <span style={{ color: "#f44336", fontWeight: 500 }}>
              Essa ação não pode ser desfeita.
            </span>
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} color="primary" variant="outlined">
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmDelete}
            className={classes.dialogDeleteBtn}
            variant="contained"
            autoFocus
          >
            Apagar Todos
          </Button>
        </DialogActions>
      </Dialog>
      <div className={classes.toolbarContainer}>
        <TextField
          className={classes.searchBox}
          placeholder="Buscar por meta, funcionário ou usuário..."
          value={searchParam}
          onChange={(e) => setSearchParam(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
          variant="outlined"
          size="small"
        />

        <div className={classes.filterContainer}>
          <div className={classes.dateRangeContainer}>
            <DateRangeIcon color="action" />
            <TextField
              label="Data inicial"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              variant="outlined"
              size="small"
              className={classes.dateRangeField}
              InputLabelProps={{
                shrink: true,
              }}
            />
            <TextField
              label="Data final"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              variant="outlined"
              size="small"
              className={classes.dateRangeField}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </div>

          <FormControl variant="outlined" size="small" className={classes.formControl}>
            <InputLabel>Tipo de Alteração</InputLabel>
            <Select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              label="Tipo de Alteração"
            >
              <MenuItem value="all">Todos</MenuItem>
              <MenuItem value="increase">Aumento</MenuItem>
              <MenuItem value="decrease">Redução</MenuItem>
              <MenuItem value="neutral">Sem alteração</MenuItem>
            </Select>
          </FormControl>

          <FormControl variant="outlined" size="small" className={classes.formControl}>
            <InputLabel>Funcionário</InputLabel>
            <Select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              label="Funcionário"
            >
              <MenuItem value="all">Todos</MenuItem>
              {employees.map(emp => (
                <MenuItem key={emp.id} value={emp.id}>{emp.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Adicionando botão de filtro */}
          <Button
            variant="contained"
            color="primary"
            startIcon={<FilterListIcon />}
            onClick={handleSearch}
            className={classes.filterButton}
          >
            Filtrar
          </Button>
        </div>
      </div>

      <Typography variant="h6" gutterBottom>
        Registros de Auditoria de Progresso de Metas
      </Typography>

      <TableContainer component={Paper} className={classes.tableContainer}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Data / Hora</TableCell>
              <TableCell>Usuário</TableCell>
              <TableCell>Meta</TableCell>
              <TableCell>Funcionário</TableCell>
              <TableCell>Valor Anterior</TableCell>
              <TableCell>Novo Valor</TableCell>
              <TableCell>Alteração</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : auditLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  Nenhum registro de auditoria encontrado
                </TableCell>
              </TableRow>
            ) : (
              auditLogs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell>
                    {moment(log.createdAt).format('DD/MM/YYYY HH:mm')}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={log.userName}
                      size="small"
                      className={classes.userChip}
                    />
                  </TableCell>
                  <TableCell>{log.goalName}</TableCell>
                  <TableCell>{log.employeeName}</TableCell>
                  <TableCell>{log.oldValue}</TableCell>
                  <TableCell>{log.newValue}</TableCell>
                  <TableCell>
                    {formatChangeType(log.changeType, log.oldValue, log.newValue)}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Ver detalhes">
                      <IconButton
                        size="small"
                        onClick={() => handleViewDetails(log)}
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {selectedProgressLog && (
        <ProgressDetailsModal
          open={progressModalOpen}
          onClose={() => setProgressModalOpen(false)}
          log={selectedProgressLog}
        />
      )}
    </Paper>
  );
};

export default AuditoriaList;