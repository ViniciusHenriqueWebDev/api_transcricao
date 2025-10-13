import React, { useState } from "react";
import { Typography, Paper } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import PaymentForm from "./Forms/PaymentForm";
import moment from "moment";

const useStyles = makeStyles((theme) => ({
  root: {
    width: '100%',
    maxWidth: 600,
    margin: '0 auto',
  },
  invoiceDetails: {
    padding: theme.spacing(3),
    marginBottom: theme.spacing(3),
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
  },
  invoiceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(1),
  },
  title: {
    marginBottom: theme.spacing(3),
  },
  bold: {
    fontWeight: 'bold',
  },
  overdue: {
    color: theme.palette.error.main,
  }
}));

export default function CheckoutPage({ Invoice }) {
  const classes = useStyles();
  
  const isOverdue = moment(Invoice?.dueDate).isBefore(moment());

  return (
    <div className={classes.root}>
      <Typography variant="h5" align="center" className={classes.title}>
        Pagamento de Fatura
      </Typography>
      
      <Paper className={classes.invoiceDetails} elevation={2}>
        <Typography variant="h6" gutterBottom>
          Detalhes da Fatura
        </Typography>
        
        <div className={classes.invoiceRow}>
          <Typography variant="body1">Número:</Typography>
          <Typography variant="body1" className={classes.bold}>#{Invoice?.id}</Typography>
        </div>
        
        <div className={classes.invoiceRow}>
          <Typography variant="body1">Descrição:</Typography>
          <Typography variant="body1">{Invoice?.detail}</Typography>
        </div>
        
        <div className={classes.invoiceRow}>
          <Typography variant="body1">Valor:</Typography>
          <Typography variant="body1" className={classes.bold}>
            {Invoice?.value.toLocaleString('pt-br', { style: 'currency', currency: 'BRL' })}
          </Typography>
        </div>
        
        <div className={classes.invoiceRow}>
          <Typography variant="body1">Vencimento:</Typography>
          <Typography variant="body1" className={isOverdue ? classes.overdue : ''}>
            {moment(Invoice?.dueDate).format('DD/MM/YYYY')}
            {isOverdue && ' (Vencido)'}
          </Typography>
        </div>
      </Paper>
      
      <PaymentForm invoiceId={Invoice?.id} values={Invoice} />
    </div>
  );
}