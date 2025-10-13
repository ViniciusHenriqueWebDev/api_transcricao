import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { Typography, Box, Paper } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles(theme => ({
  tagLegend: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: theme.spacing(1),
    marginTop: theme.spacing(2)
  },
  tagItem: {
    display: "flex",
    alignItems: "center",
    padding: theme.spacing(0.5, 1),
    borderRadius: 4,
    fontSize: 12
  },
  tagColor: {
    width: 12,
    height: 12,
    borderRadius: "50%",
    marginRight: theme.spacing(1)
  },
  tagName: {
    whiteSpace: "nowrap"
  }
}));

const TagsChart = ({ data }) => {
  const classes = useStyles();

  if (!data || data.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={300}>
        <Typography variant="body2" color="textSecondary">
          Nenhum dado disponível
        </Typography>
      </Box>
    );
  }

  // Ordenar tags por contagem (decrescente)
  const sortedData = [...data].sort((a, b) => b.count - a.count);

  return (
    <Box height="100%" display="flex" flexDirection="column">
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={sortedData}
          margin={{
            top: 30,
            right: 30,
            left: 20,
            bottom: 30
          }}
          barSize={40}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="name" 
            angle={-45} 
            textAnchor="end" 
            height={70} 
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            interval={0}
            hide={true}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value, name, props) => {
              return [`${value} atendimentos (${props.payload.percentage}%)`, props.payload.name];
            }}
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '8px',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
              border: 'none' 
            }}
          />
          <Bar dataKey="count" name="Quantidade de uso" radius={[4, 4, 0, 0]}>
            {sortedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      <div className={classes.tagLegend}>
        {sortedData.map((tag, index) => (
          <Paper key={index} className={classes.tagItem} elevation={1}>
            <div className={classes.tagColor} style={{ backgroundColor: tag.color }}></div>
            <div className={classes.tagName}>{tag.name} ({tag.count})</div>
          </Paper>
        ))}
      </div>
    </Box>
  );
};

export default TagsChart;