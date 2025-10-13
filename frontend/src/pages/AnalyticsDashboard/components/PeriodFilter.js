import React, { useState, useEffect } from 'react';
import { 
  Button, 
  ButtonGroup, 
  Typography, 
  Paper, 
  TextField, 
  Grid,
  Divider,
  Box,
  Chip
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { format, parse, isAfter, isBefore, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import FilterListIcon from '@material-ui/icons/FilterList';
import DateRangeIcon from '@material-ui/icons/DateRange';
import TodayIcon from '@material-ui/icons/Today';
import ViewWeekIcon from '@material-ui/icons/ViewWeek';
import ViewModuleIcon from '@material-ui/icons/ViewModule';
import { toast } from 'react-toastify';

const useStyles = makeStyles(theme => ({
  filterContainer: {
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
    backgroundColor: "#ffffff",
    borderRadius: 12,
    boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
    border: '1px solid #eaeaea'
  },
  title: {
    fontWeight: 600,
    fontSize: '1.1rem',
    marginBottom: theme.spacing(3),
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1)
  },
  periodInfo: {
    fontSize: '0.9rem',
    color: theme.palette.text.secondary,
    marginTop: theme.spacing(1)
  },
  quickFiltersSection: {
    marginBottom: theme.spacing(3),
  },
  quickFilters: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: theme.spacing(1.5),
    marginTop: theme.spacing(1.5)
  },
  filterChip: {
    borderRadius: 20,
    padding: theme.spacing(0.5, 1),
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '1px solid #e0e0e0',
    '&:hover': {
      backgroundColor: '#f5f5f5',
    },
  },
  activeChip: {
    backgroundColor: theme.palette.primary.main,
    color: 'white',
    '&:hover': {
      backgroundColor: theme.palette.primary.dark,
    },
  },
  datePickerContainer: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing(2),
    [theme.breakpoints.down('xs')]: {
      flexDirection: 'column',
      alignItems: 'flex-start'
    }
  },
  dateField: {
    width: 170,
    '& .MuiOutlinedInput-root': {
      borderRadius: 8,
      '& fieldset': {
        borderColor: '#e0e0e0',
      },
      '&:hover fieldset': {
        borderColor: theme.palette.primary.light,
      },
    }
  },
  divider: {
    color: theme.palette.text.secondary,
    fontWeight: 500,
    [theme.breakpoints.down('xs')]: {
      margin: theme.spacing(1, 0),
    }
  },
  filterButton: {
    marginTop: theme.spacing(2),
    borderRadius: 8,
    padding: theme.spacing(1, 3),
    fontWeight: 600,
    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
    backgroundColor: theme.palette.primary.main,
    color: 'white',
    '&:hover': {
      backgroundColor: theme.palette.primary.dark,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    }
  },
  sectionTitle: {
    fontWeight: 600,
    fontSize: '0.95rem',
    marginBottom: theme.spacing(1.5),
    color: theme.palette.text.primary
  },
  flexContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    marginBottom: theme.spacing(0.5)
  },
  dividerHorizontal: {
    margin: theme.spacing(3, 0),
  },
  dataBadge: {
    backgroundColor: '#f0f7ff',
    color: theme.palette.primary.main,
    padding: theme.spacing(0.5, 1),
    borderRadius: 4,
    fontSize: '0.75rem',
    fontWeight: 600,
    marginLeft: theme.spacing(1)
  }
}));

const PeriodFilter = ({ startDate, endDate, onDateChange, onQuickFilter, activePeriod = null }) => {
  const classes = useStyles();
  
  // Estados locais para armazenar valores temporários
  const [localStartDate, setLocalStartDate] = useState(startDate);
  const [localEndDate, setLocalEndDate] = useState(endDate);
  
  // Atualiza estados locais quando as props mudam
  useEffect(() => {
    setLocalStartDate(startDate);
    setLocalEndDate(endDate);
  }, [startDate, endDate]);
  
  // Garantindo que as datas são objetos Date válidos
  const safeStartDate = localStartDate instanceof Date && !isNaN(localStartDate.getTime()) 
    ? localStartDate 
    : new Date();
    
  const safeEndDate = localEndDate instanceof Date && !isNaN(localEndDate.getTime()) 
    ? localEndDate 
    : new Date();
  
  const handleStartDateChange = (e) => {
    const dateValue = e.target.value; // Formato yyyy-MM-dd
    if (dateValue) {
      try {
        // Usando parse do date-fns para garantir que a data seja corretamente interpretada
        const newDate = parse(dateValue, 'yyyy-MM-dd', new Date());
        
        // Ajustando a hora para meio-dia para evitar problemas com fusos horários
        newDate.setHours(12, 0, 0, 0);
        
        if (!isNaN(newDate.getTime())) {
          setLocalStartDate(newDate);
        }
      } catch (err) {
        console.error("Data inválida:", err);
      }
    }
  };
  
  const handleEndDateChange = (e) => {
    const dateValue = e.target.value; // Formato yyyy-MM-dd
    if (dateValue) {
      try {
        // Usando parse do date-fns para garantir que a data seja corretamente interpretada
        const newDate = parse(dateValue, 'yyyy-MM-dd', new Date());
        
        // Ajustando a hora para 23:59:59 para representar o fim do dia
        newDate.setHours(23, 59, 59, 999);
        
        if (!isNaN(newDate.getTime())) {
          setLocalEndDate(newDate);
        }
      } catch (err) {
        console.error("Data inválida:", err);
      }
    }
  };
  
  const handleFilter = () => {
    // Validação para garantir que a data final não é menor que a inicial
    if (isBefore(safeEndDate, safeStartDate)) {
      toast.error("A data final não pode ser menor que a data inicial");
      return;
    }
    
    onDateChange({
      startDate: safeStartDate,
      endDate: safeEndDate
    });
  };

  // Calcula diferença em dias entre as datas
  const daysBetween = differenceInDays(safeEndDate, safeStartDate) + 1;
  
  return (
    <Paper className={classes.filterContainer} elevation={0}>
      <Typography variant="h6" className={classes.title}>
        <DateRangeIcon color="primary" />
        Período de análise
        <span className={classes.dataBadge}>{daysBetween} {daysBetween > 1 ? 'dias' : 'dia'}</span>
      </Typography>
      
      <div className={classes.quickFiltersSection}>
        <Typography variant="subtitle2" className={classes.sectionTitle}>
          <div className={classes.flexContainer}>
            <FilterListIcon fontSize="small" color="primary" />
            Filtros rápidos
          </div>
        </Typography>
        
        <div className={classes.quickFilters}>
          <Chip
            icon={<TodayIcon />}
            label="Hoje"
            onClick={() => onQuickFilter('today')}
            className={`${classes.filterChip} ${activePeriod === 'today' ? classes.activeChip : ''}`}
            variant={activePeriod === 'today' ? 'default' : 'outlined'}
          />
          <Chip
            icon={<ViewWeekIcon />}
            label="Esta semana"
            onClick={() => onQuickFilter('week')}
            className={`${classes.filterChip} ${activePeriod === 'week' ? classes.activeChip : ''}`}
            variant={activePeriod === 'week' ? 'default' : 'outlined'}
          />
          <Chip
            icon={<ViewModuleIcon />}
            label="Este mês"
            onClick={() => onQuickFilter('month')}
            className={`${classes.filterChip} ${activePeriod === 'month' ? classes.activeChip : ''}`}
            variant={activePeriod === 'month' ? 'default' : 'outlined'}
          />
        </div>
      </div>
      
      <Divider className={classes.dividerHorizontal} />
      
      <Typography variant="subtitle2" className={classes.sectionTitle}>
        Período personalizado
      </Typography>
      
      <div className={classes.datePickerContainer}>
        <TextField
          label="Data Inicial"
          type="date"
          value={format(safeStartDate, 'yyyy-MM-dd')}
          onChange={handleStartDateChange}
          className={classes.dateField}
          InputLabelProps={{
            shrink: true,
          }}
          variant="outlined"
          size="small"
        />
        
        <Typography variant="body1" className={classes.divider}>
          até
        </Typography>
        
        <TextField
          label="Data Final"
          type="date"
          value={format(safeEndDate, 'yyyy-MM-dd')}
          onChange={handleEndDateChange}
          className={classes.dateField}
          InputLabelProps={{
            shrink: true,
          }}
          variant="outlined"
          size="small"
        />
      </div>
      
      <Box sx={{ textAlign: 'right' }}>
        <Button
          variant="contained"
          startIcon={<FilterListIcon />}
          className={classes.filterButton}
          onClick={handleFilter}
        >
          Filtrar
        </Button>
      </Box>
      
      <Typography variant="caption" className={classes.periodInfo}>
        Exibindo dados de {format(safeStartDate, 'dd/MM/yyyy')} até {format(safeEndDate, 'dd/MM/yyyy')}
      </Typography>
    </Paper>
  );
};

export default PeriodFilter;