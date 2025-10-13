// Modificar para usar a propriedade correta:

import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Typography, Box } from "@material-ui/core";
import { useTheme } from "@material-ui/core/styles";

const QueueChart = ({ data }) => {
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

  // Padroniza os dados para usar "total" ao invés de "count"
  const formattedData = data.map(item => ({
    name: item.name,
    total: item.total || item.count || 0,
  }));

  // Ordenar filas por total de atendimentos (decrescente)
  const sortedData = [...formattedData].sort((a, b) => b.total - a.total);

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={sortedData}
        margin={{
          top: 20,
          right: 30,
          left: 20,
          bottom: 70
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="name" 
          angle={-45} 
          textAnchor="end" 
          height={70} 
          tick={{ fontSize: 12 }}
        />
        <YAxis />
        <Tooltip
          formatter={(value, name) => {
            if (name === "total") return [`${value} atendimentos`, "Total"];
            return [value, name];
          }}
          labelFormatter={(label) => `Fila: ${label}`}
        />
        <Legend 
          verticalAlign="top" 
          wrapperStyle={{ paddingBottom: 10 }}
          formatter={(value) => {
            if (value === "total") return "Total de atendimentos";
            return value;
          }}
        />
        <Bar dataKey="total" fill={theme.palette.primary.main} name="total" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default QueueChart;