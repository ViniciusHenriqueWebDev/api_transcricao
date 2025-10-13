import React, { useState, useContext } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";
import Button from "@material-ui/core/Button";
import BarChartIcon from "@material-ui/icons/BarChart";
import { useHistory } from "react-router-dom";
import MainHeader from "../../components/MainHeader";
import MainContainer from "../../components/MainContainer";
import TabPanel from "../../components/TabPanel";
import EmployeesList from "./EmployeesList";
import CampaignsList from "./CampaignsList";
import GoalsList from "./GoalsList";
import AuditoriaList from "./AuditoriaList"; 
import ActionPlan from "./ActionPlan";
import { AuthContext } from "../../context/Auth/AuthContext"; 

const useStyles = makeStyles(theme => ({
  root: {
    flexGrow: 1,
    backgroundColor: theme.palette.background.paper,
    borderRadius: 6,
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100% - 70px)', // Ajuste para o cabeçalho
  },
  tabsContainer: {
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  tabPanel: {
    padding: theme.spacing(3),
    flexGrow: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  tabContent: {
    height: '100%',
    overflowY: 'auto',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: theme.spacing(3),
    ...theme.scrollbarStyles,
  },
  headerContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%"
  },
  dashboardButton: {
    marginLeft: theme.spacing(2)
  }
}));

const Management = () => {
  const classes = useStyles();
  const history = useHistory();
  const [activeTab, setActiveTab] = useState(0); 
  const { user } = useContext(AuthContext); 
  const isAdmin = user.profile === "admin"; 

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleDashboardClick = () => {
    history.push('/performance-dashboard');
  };

  // Componente de conteúdo da tab com scroll
  const TabContentWithScroll = ({ children }) => (
    <div className={classes.tabContent}>
      {children}
    </div>
  );

  return (
    <MainContainer>
      <MainHeader>
        <div className={classes.headerContainer}>
          <h2 style={{ flexGrow: 1 }}>Gestão de Metas</h2>
          <Button
            variant="contained"
            color="primary"
            startIcon={<BarChartIcon />}
            onClick={handleDashboardClick}
            className={classes.dashboardButton}
          >
            Relatórios e Dashboards
          </Button>
        </div>
      </MainHeader>

      <Paper className={classes.root}>
        <div className={classes.tabsContainer}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            centered
          >
            <Tab label="FUNCIONÁRIOS" />
            <Tab label="CAMPANHAS" />
            <Tab label="PLANO DE AÇÃO" /> 
            <Tab label="METAS" />
            {isAdmin && <Tab label="AUDITORIA" />}
          </Tabs>
        </div>
        
        <div className={classes.tabPanel}>
          {activeTab === 0 && (
            <TabContentWithScroll>
              <EmployeesList />
            </TabContentWithScroll>
          )}
          {activeTab === 1 && (
            <TabContentWithScroll>
              <CampaignsList />
            </TabContentWithScroll>
          )}
          {activeTab === 2 && (
            <TabContentWithScroll>
              <ActionPlan />
            </TabContentWithScroll>
          )}
          {activeTab === 3 && (
            <TabContentWithScroll>
              <GoalsList />
            </TabContentWithScroll>
          )}
          {isAdmin && activeTab === 4 && (
            <TabContentWithScroll>
              <AuditoriaList />
            </TabContentWithScroll>
          )}
        </div>
      </Paper>
    </MainContainer>
  );
};

export default Management;