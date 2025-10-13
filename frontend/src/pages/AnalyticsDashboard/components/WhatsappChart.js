import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { Typography, Box } from "@material-ui/core";
import { useTheme } from "@material-ui/core/styles";

const WhatsappChart = ({ data }) => {
  const theme = useTheme();
  const COLORS = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.error.main,
    theme.palette.warning.main,
    theme.palette.info.main,
  ];

  if (!data || data.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={300}>
        <Typography variant="body2" color="textSecondary">
          Nenhum dado disponível
        </Typography>
      </Box>
    );
  }

  // Padronizar os dados para usar "total" em vez de "count"
  const formattedData = data.map(item => ({
    name: item.name,
    total: item.total || item.count || 0,
    percentage: item.percentage || 0
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={formattedData}
          cx="50%"
          cy="50%"
          labelLine={true}
          outerRadius={100}
          fill="#8884d8"
          dataKey="total"
          nameKey="name"
          label={({ name, percent }) => {
            // Usar percentage dos dados ou calcular do percent se não estiver disponível
            const percentValue = percent ? (percent * 100).toFixed(0) : 0;
            return `${name} ${percentValue}%`;
          }}
        >
          {formattedData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name, props) => [
            `${value} atendimentos (${props.payload.percentage}%)`, 
            props.payload.name
          ]}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

export default WhatsappChart;