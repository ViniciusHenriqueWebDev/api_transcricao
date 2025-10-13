import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Typography, Box } from "@material-ui/core";
import { useTheme } from "@material-ui/core/styles";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

const EvolutionChart = ({ data }) => {
  const theme = useTheme();

  if (!data || data.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={300}>
        <Typography variant="body2" color="textSecondary">
          Nenhum dado disponível
        </Typography>
      </Box>
    );
  }

  // Formatar as datas para exibição
  const formattedData = data.map(item => {
    let displayDate = item.date;
    try {
      if (isValid(new Date(item.date))) {
        displayDate = format(new Date(item.date), "dd/MM", { locale: ptBR });
      }
    } catch (err) {
      console.log("Erro ao formatar data:", err);
    }
    
    return {
      ...item,
      displayDate
    };
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={formattedData}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 20
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="displayDate" 
          tick={{ fontSize: 12 }}
          interval={0}
        />
        <YAxis />
        <Tooltip 
          formatter={(value) => [value, ""]}
          labelFormatter={(value) => `Data: ${value}`}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="total" 
          name="Total" 
          stroke={theme.palette.primary.main} 
          activeDot={{ r: 8 }}
          strokeWidth={2}
        />
        <Line 
          type="monotone" 
          dataKey="open" 
          name="Em aberto" 
          stroke={theme.palette.warning.main} 
          strokeWidth={2}
        />
        <Line 
          type="monotone" 
          dataKey="pending" 
          name="Pendentes" 
          stroke={theme.palette.info.main}
          strokeWidth={2}
        />
        <Line 
          type="monotone" 
          dataKey="closed" 
          name="Finalizados" 
          stroke={theme.palette.success.main}
          strokeWidth={2}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default EvolutionChart;