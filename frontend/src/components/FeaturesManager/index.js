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
  Typography,
  CircularProgress,
  Switch,
  Button,
  TextField,
  Grid,
} from "@material-ui/core";
import { Refresh } from "@material-ui/icons";
import { toast } from "react-toastify";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
    padding: theme.spacing(2),
  },
  paper: {
    width: '100%',
    marginBottom: theme.spacing(2),
    padding: theme.spacing(2)
  },
  tableContainer: {
    maxHeight: "calc(100vh - 250px)",
    ...theme.scrollbarStyles,
  },
  table: {
    minWidth: 650,
  },
  searchField: {
    marginBottom: theme.spacing(2),
  },
  header: {
    fontWeight: "bold",
    backgroundColor: theme.palette.background.default,
  }
}));

const FeaturesManager = () => {
  const classes = useStyles();
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [features, setFeatures] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);

        // Buscar usuário atual
        const userResponse = await api.get("/auth/me");
        const user = userResponse.data;
        setCurrentUser(user);

        // Buscar features disponíveis
        const featuresResponse = await api.get("/features");
        const availableFeatures = featuresResponse.data;
        setFeatures(availableFeatures);

        // Buscar empresas
        const companiesResponse = await api.get("/companies");
        let allCompanies = companiesResponse.data.companies || companiesResponse.data;

        // Filtrar a própria empresa se for super admin
        if (user?.super) {
          allCompanies = allCompanies.filter(company => company.id !== user.companyId);
        }

        // Array temporário para armazenar as empresas com features completas
        const companiesWithFeatures = [];

        // Buscar features para cada empresa em sequência para garantir consistência
        for (const company of allCompanies) {
          try {
            const response = await api.get(`/companies/${company.id}/features`);

            // Combinar features existentes e ausentes
            const existingFeatures = response.data.existingFeatures || [];
            const missingFeatures = response.data.missingFeatures || [];

            // Garantir que todas as features tenham valores boolean explícitos para status
            const allFeatures = [...existingFeatures, ...missingFeatures].map(feature => ({
              ...feature,
              status: feature.status === true
            }));

            companiesWithFeatures.push({
              ...company,
              features: allFeatures
            });
          } catch (error) {
            console.error(`Erro ao buscar features da empresa ${company.id}:`, error);
            companiesWithFeatures.push({
              ...company,
              features: []
            });
          }
        }

        setCompanies(companiesWithFeatures);
        setFilteredCompanies(companiesWithFeatures);
      } catch (error) {
        console.error("Erro ao carregar dados iniciais:", error);
        toast.error("Erro ao carregar dados. Tente novamente.");
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Filtrar empresas quando o termo de pesquisa mudar
  useEffect(() => {
    if (searchTerm) {
      const filtered = companies.filter(company =>
        company.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCompanies(filtered);
    } else {
      setFilteredCompanies(companies);
    }
  }, [searchTerm, companies]);

  // Função para atualizar status de uma feature
  const handleToggleFeature = async (companyId, featureName, enabled) => {
    try {
      // Atualizar no backend - envie explicitamente um booleano
      await api.put(`/companies/${companyId}/features`, {
        name: featureName,
        status: enabled === true
      });

      // Atualizar estado local
      const updatedCompanies = companies.map(company => {
        if (company.id === companyId) {
          const updatedFeatures = company.features.map(feature =>
            feature.name === featureName
              ? { ...feature, status: enabled }
              : feature
          );
          return { ...company, features: updatedFeatures };
        }
        return company;
      });

      setCompanies(updatedCompanies);

      // Se houver filtro aplicado, atualizar também a lista filtrada
      if (searchTerm) {
        setFilteredCompanies(prevFiltered =>
          prevFiltered.map(company => {
            if (company.id === companyId) {
              const updatedFeatures = company.features.map(feature =>
                feature.name === featureName
                  ? { ...feature, status: enabled }
                  : feature
              );
              return { ...company, features: updatedFeatures };
            }
            return company;
          })
        );
      }

      // Notificação de sucesso
      const companyName = companies.find(c => c.id === companyId)?.name || 'Empresa';
      const featureDesc = features.find(f => f.name === featureName)?.description || featureName;
      toast.success(`Recurso "${featureDesc}" ${enabled ? "ativado" : "desativado"} para ${companyName}`);
    } catch (error) {
      console.error("Erro ao atualizar feature:", error);
      toast.error("Erro ao atualizar recurso. Tente novamente.");
    }
  };

  // Verificar status da feature
  const getFeatureStatus = (company, featureName) => {
    if (!company || !Array.isArray(company.features)) {
      return false;
    }
    
    const feature = company.features.find(f => f.name === featureName);
    // Comparação explícita com true para garantir valor booleano
    return feature?.status === true;
  };

  // Função para atualizar dados
  const handleRefresh = async () => {
    try {
      setLoading(true);

      // Recarregar features disponíveis
      const featuresResponse = await api.get("/features");
      setFeatures(featuresResponse.data);

      // Recarregar empresas
      const companiesResponse = await api.get("/companies");
      let allCompanies = companiesResponse.data.companies || companiesResponse.data;

      // Filtrar a própria empresa se for super admin
      if (currentUser?.super) {
        allCompanies = allCompanies.filter(company => company.id !== currentUser.companyId);
      }

      // Buscar features para cada empresa
      const companiesWithFeatures = await Promise.all(
        allCompanies.map(async (company) => {
          try {
            const response = await api.get(`/companies/${company.id}/features`);

            // Combinar features existentes e ausentes
            const existingFeatures = response.data.existingFeatures || [];
            const missingFeatures = response.data.missingFeatures || [];
            const allFeatures = [...existingFeatures, ...missingFeatures];

            return {
              ...company,
              features: allFeatures
            };
          } catch (error) {
            console.error(`Erro ao buscar features da empresa ${company.id}:`, error);
            return {
              ...company,
              features: []
            };
          }
        })
      );

      setCompanies(companiesWithFeatures);
      setFilteredCompanies(
        searchTerm
          ? companiesWithFeatures.filter(company =>
            company.name?.toLowerCase().includes(searchTerm.toLowerCase())
          )
          : companiesWithFeatures
      );

      toast.success("Dados atualizados com sucesso");
    } catch (error) {
      console.error("Erro ao atualizar dados:", error);
      toast.error("Erro ao atualizar dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={classes.root}>
      <Paper className={classes.paper}>
        <Typography variant="h6" gutterBottom>
          Gerenciar Recursos por Empresa
        </Typography>

        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              className={classes.searchField}
              label="Buscar empresa"
              variant="outlined"
              fullWidth
              size="small"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              color="primary"
              startIcon={<Refresh />}
              onClick={handleRefresh}
              disabled={loading}
            >
              Atualizar
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper className={classes.paper}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 16 }}>
            <CircularProgress />
          </div>
        ) : filteredCompanies.length === 0 ? (
          <Typography>Nenhuma empresa encontrada.</Typography>
        ) : (
          <TableContainer className={classes.tableContainer}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell className={classes.header}>Empresa</TableCell>
                  {features.map((feature) => (
                    <TableCell key={feature.name} align="center" className={classes.header}>
                      {feature.description || feature.name}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCompanies.map((company) => (
                  <TableRow key={company.id} hover>
                    <TableCell>
                      <Typography variant="body2">{company.name}</Typography>
                      <Typography variant="caption" color="textSecondary">
                        {company.email || "-"}
                      </Typography>
                    </TableCell>
                    {features.map((feature) => (
                      <TableCell key={`${company.id}-${feature.name}`} align="center">
                        <Switch
                          size="small"
                          color="primary"
                          checked={getFeatureStatus(company, feature.name)}
                          onChange={(e) => handleToggleFeature(
                            company.id,
                            feature.name,
                            e.target.checked
                          )}
                        />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </div>
  );
};

export default FeaturesManager;