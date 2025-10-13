// Modificar o componente para lidar com os dados corretamente

import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Typography, Box } from "@material-ui/core";
import { useTheme } from "@material-ui/core/styles";

const TimeChart = ({ data, type, colors }) => {
  const theme = useTheme();

  // Verificações de segurança para os dados
  if (!data || data.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={300}>
        <Typography variant="body2" color="textSecondary">
          Nenhum dado disponível para {type === "day" ? "dias" : "horas"}
        </Typography>
      </Box>
    );
  }
  
  // Se for tipo 'day', verificar se os dados têm a propriedade 'date'
  if (type === 'day' && data[0] && !data[0].dayName && data[0].date) {
    // Converter o formato da data para nome do dia da semana
    const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
    data = data.map(item => ({
      ...item,
      dayName: dayNames[new Date(item.date).getDay()]
    }));
  }

  // Para horas, garantir que todos os horários (0-23) estejam presentes
  let processedData = [...data];
  if (type === 'hour') {
    const allHours = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: 0
    }));
    
    // Preencher com os dados reais
    data.forEach(item => {
      const hourValue = typeof item.hour === 'number' ? item.hour : parseInt(item.hour, 10);
      const index = allHours.findIndex(h => h.hour === hourValue);
      if (index !== -1) {
        allHours[index].count = item.count;
      }
    });
    
    processedData = allHours;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={processedData}
        margin={{ top: 30, right: 30, left: 20, bottom: 30 }}
        barSize={40}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis 
          dataKey={type === "day" ? "dayName" : "hour"} 
          tick={{ fontSize: 12 }}
          tickFormatter={type === "hour" ? (value) => `${value}h` : undefined}
          axisLine={false}
          tickLine={false}
        />
        <YAxis axisLine={false} tickLine={false} />
        <Tooltip
          formatter={(value) => [`${value} atendimentos`, "Quantidade"]}
          labelFormatter={(label) => {
            if (type === "day") return `Dia: ${label}`;
            return `Hora: ${label}h`;
          }}
        />
        <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: 10 }} />
        <Bar 
          dataKey="count" 
          fill={colors ? colors[0] : theme.palette.primary.main} 
          name="Atendimentos"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default TimeChart;