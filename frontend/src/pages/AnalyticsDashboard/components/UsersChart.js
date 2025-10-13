import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { Typography, Box } from "@material-ui/core";
import { useTheme } from "@material-ui/core/styles";

const UsersChart = ({ data, colors }) => {
  const theme = useTheme();
  
  // Definir cores padrão sem depender da prop externa colors
  const defaultColors = ["#3f51b5", "#ff9800"]; // Azul para total, LARANJA para finalizados
  
  // Garantir que as cores sejam aplicadas, mesmo que colors seja passado como prop
  const chartColors = colors && colors.length >= 2 ? 
    [colors[0], "#ff9800"] : // Se colors for fornecido, manter a primeira cor, mas forçar a segunda para laranja
    defaultColors;
  
  console.log("UsersChart cores:", { chartColors, propColors: colors });
  
  if (!data || data.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={300}>
        <Typography variant="body2" color="textSecondary">
          Nenhum dado disponível
        </Typography>
      </Box>
    );
  }

  // Padronizar os dados para usar os campos corretos
  const formattedData = data.map(item => ({
    name: item.name || "Sem nome",
    total: item.total || 0,
    finished: item.finished || 0, // API retorna "finished", não "closed"
    percentageResolved: item.percentageResolved || 0
  }));

  // Ordenar usuários por total de atendimentos (decrescente)
  const sortedData = [...formattedData].sort((a, b) => b.total - a.total);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={sortedData}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5
        }}
        layout="vertical"
        barSize={20}
        barGap={10}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
        <XAxis 
          type="number" 
          axisLine={false}
          tickLine={false}
          domain={[0, 'dataMax + 1']}
        />
        <YAxis 
          type="category" 
          dataKey="name" 
          width={120}
          tick={{ fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value, name) => {
            if (name === "total") return [`${value} atendimentos`, "Total"];
            if (name === "finished") return [`${value} atendimentos`, "Finalizados"];
            return [value, name];
          }}
          labelFormatter={(label) => `Atendente: ${label}`}
          contentStyle={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
            border: 'none' 
          }}
        />
        <Legend 
          verticalAlign="top"
          wrapperStyle={{ 
            paddingBottom: 10,
            fontSize: "12px"
          }}
        />
        {/* Forçando as cores diretamente nos componentes Bar */}
        <Bar 
          dataKey="total" 
          fill={chartColors[0]} 
          name="Total de atendimentos" 
          radius={[0, 4, 4, 0]}
        />
        <Bar 
          dataKey="finished" 
          fill="#ff9800" // Forçando a cor laranja diretamente 
          name="Atendimentos finalizados" 
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default UsersChart;