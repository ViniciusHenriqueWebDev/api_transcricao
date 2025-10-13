// Modificar o componente para mapear os dados corretamente:

import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { Typography, Box } from "@material-ui/core";
import { useTheme } from "@material-ui/core/styles";

const QueueEfficiencyChart = ({ data }) => {
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

  // Mapear percentageResolved para efficiency se necessário
  const formattedData = data.map(item => ({
    name: item.name,
    efficiency: item.percentageResolved || item.efficiency || 0,
    avgResolutionTime: item.avgResolutionTime
  }));

  // Ordenar filas por eficiência (decrescente)
  const sortedData = [...formattedData].sort((a, b) => b.efficiency - a.efficiency);

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
        <YAxis
          tickFormatter={(value) => `${value}%`}
          domain={[0, 100]}
        />
        <Tooltip
          formatter={(value, name) => {
            if (name === "efficiency") return [`${value}%`, "Eficiência"];
            return [value, name];
          }}
          labelFormatter={(label) => `Fila: ${label}`}
        />
        <Legend 
          verticalAlign="top" 
          wrapperStyle={{ paddingBottom: 10 }}
          formatter={(value) => {
            if (value === "efficiency") return "Taxa de Resolução";
            return value;
          }}
        />
        <ReferenceLine y={70} stroke="green" strokeDasharray="3 3" />
        <ReferenceLine y={40} stroke="red" strokeDasharray="3 3" />
        <Bar dataKey="efficiency" fill={theme.palette.primary.main} name="efficiency" />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default QueueEfficiencyChart;