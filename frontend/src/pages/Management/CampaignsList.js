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
  Tooltip,
  Box
} from "@material-ui/core";
import SearchIcon from "@material-ui/icons/Search";
import AddIcon from "@material-ui/icons/Add";
import EditIcon from "@material-ui/icons/Edit";
import DeleteIcon from "@material-ui/icons/Delete";
import AssessmentIcon from "@material-ui/icons/Assessment";
import { toast } from "react-toastify";
import { format, isBefore, isAfter } from "date-fns";
import ptBR from "date-fns/locale/pt-BR";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import CampaignModal from "./CampaignModal";
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
  chipActive: {
    backgroundColor: "#4caf50",
    color: "white",
  },
  chipInactive: {
    backgroundColor: "#f44336",
    color: "white",
  },
  chipUpcoming: {
    backgroundColor: "#ff9800",
    color: "white",
  },
  chipFinished: {
    backgroundColor: "#9e9e9e",
    color: "white",
  }
}));

const CampaignsList = () => {
  const classes = useStyles();
  const [loading, setLoading] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [searchParam, setSearchParam] = useState("");
  const [campaignModalOpen, setCampaignModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deleteCampaign, setDeleteCampaign] = useState(null);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/performance-campaigns", {
        params: { searchParam },
      });
      setCampaigns(data.campaigns);
    } catch (err) {
      toast.error("Erro ao buscar as campanhas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [searchParam]);

  const handleOpenCampaignModal = (campaign = null) => {
    setSelectedCampaign(campaign);
    setCampaignModalOpen(true);
  };

  const handleCloseCampaignModal = () => {
    setSelectedCampaign(null);
    setCampaignModalOpen(false);
  };

  const handleSaveCampaign = async () => {
    await fetchCampaigns();
    setCampaignModalOpen(false);
  };

  const handleDeleteClick = (campaign) => {
    setDeleteCampaign(campaign);
    setConfirmModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await api.delete(`/performance-campaigns/${deleteCampaign.id}`);
      toast.success("Campanha excluída com sucesso!");
      fetchCampaigns();
    } catch (err) {
      toast.error("Erro ao excluir a campanha");
    }
    setConfirmModalOpen(false);
    setDeleteCampaign(null);
  };

  const handleCancelDelete = () => {
    setConfirmModalOpen(false);
    setDeleteCampaign(null);
  };

  const getCampaignStatus = (campaign) => {
    const now = new Date();
    const startDate = new Date(campaign.startDate);
    const endDate = new Date(campaign.endDate);

    if (isAfter(now, endDate)) {
      return "finished";
    } else if (isBefore(now, startDate)) {
      return "upcoming";
    } else {
      return "active";
    }
  };

  const getCampaignStatusChip = (status) => {
    switch (status) {
      case "active":
        return <Chip label="Em Andamento" className={classes.chipActive} size="small" />;
      case "upcoming":
        return <Chip label="Programada" className={classes.chipUpcoming} size="small" />;
      case "finished":
        return <Chip label="Finalizada" className={classes.chipFinished} size="small" />;
      default:
        return <Chip label="Inativa" className={classes.chipInactive} size="small" />;
    }
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  };

  return (
    <Paper className={classes.mainPaper} elevation={0}>
      <div className={classes.toolbarContainer}>
        <TextField
          className={classes.searchBox}
          placeholder="Buscar campanha..."
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

        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenCampaignModal()}
        >
          NOVA CAMPANHA
        </Button>
      </div>

      <TableContainer component={Paper} className={classes.tableContainer}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Nome</TableCell>
              <TableCell>Descrição</TableCell>
              <TableCell>Data Início</TableCell>
              <TableCell>Data Fim</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Metas Associadas</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : campaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  Nenhuma campanha encontrada
                </TableCell>
              </TableRow>
            ) : (
              campaigns.map((campaign) => {
                const status = getCampaignStatus(campaign);
                return (
                  <TableRow key={campaign.id} hover>
                    <TableCell>{campaign.name}</TableCell>
                    <TableCell>
                      <Typography noWrap style={{ maxWidth: 200 }}>
                        {campaign.description || "-"}
                      </Typography>
                    </TableCell>
                    <TableCell>{formatDate(campaign.startDate)}</TableCell>
                    <TableCell>{formatDate(campaign.endDate)}</TableCell>
                    <TableCell>{getCampaignStatusChip(status)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={`${campaign.goals?.length || 0} metas`} 
                        variant="outlined"
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Editar">
                        <IconButton 
                          size="small"
                          onClick={() => handleOpenCampaignModal(campaign)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Excluir">
                        <IconButton 
                          size="small"
                          onClick={() => handleDeleteClick(campaign)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <CampaignModal
        open={campaignModalOpen}
        onClose={handleCloseCampaignModal}
        campaignData={selectedCampaign}
        onSave={handleSaveCampaign}
      />

      <ConfirmationModal
        title="Excluir Campanha"
        open={confirmModalOpen}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      >
        Tem certeza que deseja excluir esta campanha? Todas as metas associadas serão desvinculadas.
      </ConfirmationModal>
    </Paper>
  );
};

export default CampaignsList;