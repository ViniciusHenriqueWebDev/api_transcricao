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
  Chip,
  Tooltip
} from "@material-ui/core";
import SearchIcon from "@material-ui/icons/Search";
import AddIcon from "@material-ui/icons/Add";
import EditIcon from "@material-ui/icons/Edit";
import DeleteIcon from "@material-ui/icons/Delete";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import CancelIcon from "@material-ui/icons/Cancel";
import { toast } from "react-toastify";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import EmployeeModal from "./EmployeeModal";
import ConfirmationModal from "../../components/ConfirmationModal";

const useStyles = makeStyles((theme) => ({
  mainPaper: {
    flex: 1,
    padding: theme.spacing(1),
    overflowY: "scroll",
    ...theme.scrollbarStyles,
  },
  toolbarContainer: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: theme.spacing(2),
  },
  searchBox: {
    width: "50%",
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
  actionsCell: {
    width: 100,
  },
  chipActive: {
    backgroundColor: "#4caf50",
    color: "white",
  },
  chipInactive: {
    backgroundColor: "#f44336",
    color: "white",
  },
  buttonContainer: {
    display: "flex", 
    gap: theme.spacing(2),
  },
}));

const EmployeesList = () => {
  const classes = useStyles();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [searchParam, setSearchParam] = useState("");
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deleteEmployee, setDeleteEmployee] = useState(null);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/employees", {
        params: { searchParam },
      });
      setEmployees(data.employees);
    } catch (err) {
      toast.error("Erro ao buscar os funcionários");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [searchParam]);

  const handleOpenEmployeeModal = (employee = null) => {
    setSelectedEmployee(employee);
    setEmployeeModalOpen(true);
  };

  const handleCloseEmployeeModal = () => {
    setSelectedEmployee(null);
    setEmployeeModalOpen(false);
  };

  const handleSaveEmployee = async () => {
    await fetchEmployees();
    setEmployeeModalOpen(false);
  };

  const handleDeleteClick = (employee) => {
    setDeleteEmployee(employee);
    setConfirmModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await api.delete(`/employees/${deleteEmployee.id}`);
      toast.success("Funcionário excluído com sucesso!");
      fetchEmployees();
    } catch (err) {
      toast.error("Erro ao excluir o funcionário");
    }
    setConfirmModalOpen(false);
    setDeleteEmployee(null);
  };

  const handleCancelDelete = () => {
    setConfirmModalOpen(false);
    setDeleteEmployee(null);
  };

  return (
    <Paper className={classes.mainPaper} elevation={0}>
      <div className={classes.toolbarContainer}>
        <TextField
          className={classes.searchBox}
          placeholder="Buscar funcionário..."
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
        />
        
        <div className={classes.buttonContainer}>
            <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => handleOpenEmployeeModal()}
                disabled={true}
            >
            IMPORTAR DADOS
            </Button>
            <Button
                variant="contained"
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => handleOpenEmployeeModal()}
            >
                NOVO FUNCIONÁRIO
            </Button>
        </div>
      </div>

      <TableContainer component={Paper} className={classes.tableContainer}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Cargo</TableCell>
              <TableCell>Departamento</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : employees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  Nenhum funcionário encontrado
                </TableCell>
              </TableRow>
            ) : (
              employees.map((employee) => (
                <TableRow key={employee.id} hover>
                  <TableCell>{employee.name}</TableCell>
                  <TableCell>{employee.email}</TableCell>
                  <TableCell>{employee.position || "-"}</TableCell>
                  <TableCell>{employee.department || "-"}</TableCell>
                  <TableCell>
                    {employee.status ? (
                      <Chip 
                        icon={<CheckCircleIcon />} 
                        label="Ativo" 
                        className={classes.chipActive}
                        size="small"
                      />
                    ) : (
                      <Chip 
                        icon={<CancelIcon />} 
                        label="Inativo" 
                        className={classes.chipInactive}
                        size="small"
                      />
                    )}
                  </TableCell>
                  <TableCell align="center" className={classes.actionsCell}>
                    <Tooltip title="Editar">
                      <IconButton 
                        size="small"
                        onClick={() => handleOpenEmployeeModal(employee)}
                      >
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir">
                      <IconButton 
                        size="small"
                        onClick={() => handleDeleteClick(employee)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <EmployeeModal
        open={employeeModalOpen}
        onClose={handleCloseEmployeeModal}
        employeeData={selectedEmployee}
        onSave={handleSaveEmployee}
      />

      <ConfirmationModal
        title="Excluir Funcionário"
        open={confirmModalOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      >
        Tem certeza que deseja excluir este funcionário?
      </ConfirmationModal>
    </Paper>
  );
};

export default EmployeesList;