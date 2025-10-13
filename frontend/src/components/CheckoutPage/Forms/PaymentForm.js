import React, { useState, useEffect, useRef } from "react";
import { Typography, Box, CircularProgress, Paper, Button, TextField, LinearProgress } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import QRCode from "qrcode.react";
import { toast } from "react-toastify";
import api from "../../../services/api";
import FileCopyIcon from "@material-ui/icons/FileCopy";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import AccessTimeIcon from "@material-ui/icons/AccessTime";

const useStyles = makeStyles((theme) => ({
  root: {
    padding: theme.spacing(2.5),
    backgroundColor: "#fff",
    borderRadius: 12,
    boxShadow: "0px 3px 15px rgba(0, 0, 0, 0.05)",
    maxWidth: 500,
    margin: "0 auto"
  },
  title: {
    fontWeight: 600,
    marginBottom: theme.spacing(2),
    textAlign: "center",
    color: "#333",
    fontSize: "1.2rem"
  },
  subtitle: {
    marginBottom: theme.spacing(1.5),
    textAlign: "center",
    color: "#555",
    fontSize: "1rem"
  },
  qrContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    marginBottom: theme.spacing(2),
  },
  qrCodeWrapper: {
    padding: theme.spacing(2),
    backgroundColor: '#fff',
    border: '2px dashed #ddd',
    borderRadius: 12,
    display: 'inline-block',
    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.05)",
    marginBottom: theme.spacing(2),
  },
  qrCodeImage: {
    width: 180,
    height: 180,
  },
  copyButton: {
    padding: theme.spacing(1),
    backgroundColor: "#0039a6",
    color: "#fff",
    borderRadius: 30,
    fontWeight: 500,
    textTransform: "none",
    "&:hover": {
      backgroundColor: "#002d80",
    },
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 240,
  },
  copyIcon: {
    marginRight: theme.spacing(1),
    fontSize: 18,
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(3),
  },
  verificationStatus: {
    margin: theme.spacing(1.5, 0),
    padding: theme.spacing(1),
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 500,
    fontSize: 14,
  },
  verificationStatusSuccess: {
    backgroundColor: '#e6f7ee',
    color: '#2e7d32',
  },
  verificationStatusCancelled: {
    backgroundColor: '#ffebee',
    color: '#c62828',
  },
  documentField: {
    marginBottom: theme.spacing(2),
    '& .MuiOutlinedInput-root': {
      borderRadius: 8,
      backgroundColor: "#fff",
    },
    '& .MuiOutlinedInput-input': {
      padding: '12px 14px',
    }
  },
  timer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: theme.spacing(1, 0),
  },
  timeText: {
    fontWeight: 'bold',
    fontSize: 16,
    color: "#0039a6",
    marginLeft: theme.spacing(1),
  },
  timeIcon: {
    color: "#0039a6",
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    margin: theme.spacing(1, 0),
    width: '100%',
    maxWidth: 240,
    backgroundColor: "#e6e6e6",
    '& .MuiLinearProgress-barColorPrimary': {
      backgroundColor: "#0039a6"
    },
    '& .MuiLinearProgress-barColorSecondary': {
      backgroundColor: "#d32f2f"
    }
  },
  verifyButton: {
    marginTop: theme.spacing(1),
    padding: theme.spacing(0.8),
    borderRadius: 30,
    fontWeight: 500,
    textTransform: 'none',
    fontSize: 14,
    maxWidth: 240,
    backgroundColor: "#f5f5f5",
    borderColor: "#0039a6",
    color: "#0039a6",
    '&:hover': {
      backgroundColor: "#e0e0e0"
    }
  },
  generateButton: {
    marginTop: theme.spacing(1),
    padding: theme.spacing(1),
    borderRadius: 4,
    backgroundColor: "#0039a6",
    color: "#fff",
    '&:hover': {
      backgroundColor: "#002d80"
    },
    '&.Mui-disabled': {
      backgroundColor: "#cccccc",
      color: "#666666"
    }
  }
}));

export default function PaymentForm({ invoiceId, invoiceData }) {
  const classes = useStyles();

  // Estado do componente
  const [loading, setLoading] = useState(false);
  const [loadingCompany, setLoadingCompany] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [document, setDocument] = useState('');
  const [documentError, setDocumentError] = useState('');
  const [showDocumentField, setShowDocumentField] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(300);
  const [progress, setProgress] = useState(100);
  const [hasCompanyDocument, setHasCompanyDocument] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Refs para gerenciar timers
  const timerRef = useRef(null);
  const verificationTimerRef = useRef(null);
  const initialCheckCompleted = useRef(false);

  // Verificar documento da empresa ao carregar o componente
  useEffect(() => {
    const checkCompanyDocument = async () => {
      if (invoiceId && !initialCheckCompleted.current) {
        try {
          setLoadingCompany(true);
          const { data } = await api.get(`/invoices/${invoiceId}`);
          if (data && data.companyId) {
            const companyResponse = await api.get(`/companies/${data.companyId}`);
            if (companyResponse.data && companyResponse.data.document) {
              setDocument(companyResponse.data.document);
              setHasCompanyDocument(true);
              initialCheckCompleted.current = true;
            } else {
              setShowDocumentField(true);
              initialCheckCompleted.current = true;
            }
          } else {
            setShowDocumentField(true);
            initialCheckCompleted.current = true;
          }
        } catch (err) {
          console.error("Erro ao verificar documento da empresa:", err);
          setShowDocumentField(true);
          initialCheckCompleted.current = true;
        } finally {
          setLoadingCompany(false);
        }
      }
    };

    checkCompanyDocument();
  }, [invoiceId]);

  // Gerar pagamento automaticamente se tiver o documento da empresa
  useEffect(() => {
    if (hasCompanyDocument && invoiceId && !paymentData && !loading) {
      handleGeneratePayment();
    }
  }, [hasCompanyDocument, invoiceId]);

  // Limpar timers ao desmontar o componente
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (verificationTimerRef.current) clearInterval(verificationTimerRef.current);
    };
  }, []);

  // Iniciar timers quando o pagamento é gerado
  useEffect(() => {
    if (paymentData) {
      startExpirationTimer();
      startVerificationChecks();
    }
  }, [paymentData]);

  // Resetar o estado "copiedText" após alguns segundos
  useEffect(() => {
    if (copiedText) {
      const timer = setTimeout(() => setCopiedText(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [copiedText]);

  // Validação de documento
  const validateDocument = () => {
    if (!document) {
      setDocumentError('CPF/CNPJ é obrigatório');
      return false;
    }

    const cleanDocument = document.replace(/[^\d]/g, '');

    if (cleanDocument.length !== 11 && cleanDocument.length !== 14) {
      setDocumentError('CPF deve ter 11 dígitos ou CNPJ 14 dígitos');
      return false;
    }

    setDocumentError('');
    return true;
  };

  // Iniciar timer de expiração
  const startExpirationTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    setTimeRemaining(300);
    setProgress(100);

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          cancelPayment(invoiceId);
          return 0;
        }

        const newTime = prev - 1;
        setProgress((newTime / 300) * 100);

        return newTime;
      });
    }, 1000);
  };

  // Iniciar verificações periódicas de pagamento
  const startVerificationChecks = () => {
    if (verificationTimerRef.current) clearInterval(verificationTimerRef.current);

    verificationTimerRef.current = setInterval(async () => {
      try {
        const result = await checkPaymentStatus();

        if (result && result.status === "approved") {
          clearInterval(verificationTimerRef.current);
          clearInterval(timerRef.current);
        }
      } catch (err) {
        console.error("Erro ao verificar pagamento:", err);
      }
    }, 10000);
  };

  // Cancelar pagamento
  const cancelPayment = async (invoiceId) => {
    try {
      await api.post("/subscription/cancel-payment", { invoiceId });
      toast.info("O pagamento foi cancelado por exceder o tempo limite.");
      setVerificationStatus("cancelled");
      clearInterval(timerRef.current);
      clearInterval(verificationTimerRef.current);
      setTimeout(() => window.location.reload(), 3000);
    } catch (error) {
      toast.error("Erro ao cancelar o pagamento: " + (error.response?.data?.error || "Erro desconhecido"));
    }
  };

  // Formatar tempo restante
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' + secs : secs}`;
  };

  // Manipular alteração de documento
  const handleDocumentChange = (e) => {
    setDocument(e.target.value);
    if (documentError) validateDocument();
  };

  // Verificar status do pagamento
  const checkPaymentStatus = async () => {
    try {
      setVerificationStatus("checking");
      const { data } = await api.post("/subscription/check-payment", { invoiceId });

      if (data.status === "approved") {
        setVerificationStatus("approved");
        toast.success("Pagamento aprovado com sucesso!");
        setTimeout(() => window.location.reload(), 3000);
        return data;
      } else {
        setVerificationStatus("pending");
        return data;
      }
    } catch (err) {
      console.error("Erro ao verificar status do pagamento:", err);
      setVerificationStatus("error");
      return null;
    }
  };

  // Componente para indicar o status da verificação
  const VerificationStatusIndicator = () => {
    if (!paymentData) return null;

    // Status de sucesso
    if (verificationStatus === "approved") {
      return (
        <Box className={`${classes.verificationStatus} ${classes.verificationStatusSuccess}`}>
          <CheckCircleIcon className={classes.statusIcon} style={{ marginRight: 8 }} />
          <Typography variant="body2">Pagamento aprovado! Redirecionando...</Typography>
        </Box>
      );
    }

    // Status de cancelado
    if (verificationStatus === "cancelled") {
      return (
        <Box className={`${classes.verificationStatus} ${classes.verificationStatusCancelled}`}>
          <Typography variant="body2">Pagamento cancelado por tempo excedido.</Typography>
        </Box>
      );
    }

    // Status de verificação em andamento
    if (verificationStatus === "checking") {
      return (
        <Box className={classes.verificationStatus}>
          <CircularProgress size={16} style={{ marginRight: 8 }} />
          <Typography variant="body2" display="inline">Verificando pagamento...</Typography>
        </Box>
      );
    }

    return (
      <>
        <Box className={classes.timer}>
          <AccessTimeIcon className={classes.timeIcon} />
          <Typography className={classes.timeText}>
            {formatTime(timeRemaining)}
          </Typography>
        </Box>

        <LinearProgress
          variant="determinate"
          value={progress}
          className={classes.progressBar}
          color={progress < 30 ? "secondary" : "primary"}
        />

        <Button
          variant="outlined"
          color="primary"
          fullWidth
          className={classes.verifyButton}
          onClick={checkPaymentStatus}
          startIcon={<CheckCircleIcon />}
        >
          Já Paguei
        </Button>
      </>
    );
  };

  const handleGeneratePayment = async () => {
    setLoading(true);
    setShowDocumentField(false);

    try {
      if (!hasCompanyDocument && !validateDocument()) {
        setLoading(false);
        setShowDocumentField(true);
        return;
      }

      const { data } = await api.post("/subscription/mercadopago", {
        invoiceId,
        paymentMethod: "MERCADOPAGO",
        document: document.replace(/[^\d]/g, '')
      });
      const qrcodeData = {
        qrcode: data.qr_code_base64 ?
          `data:image/jpeg;base64,${data.qr_code_base64}` :
          data.qr_code,
        copiaecola: data.qr_code
      };

      setPaymentData(qrcodeData);
      setTimeout(() => {
        setLoading(false);
      }, 100);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar pagamento: " + (err.response?.data?.error || "Erro desconhecido"));
      setLoading(false);
      setShowDocumentField(true);
    }
  };

  // Copiar código PIX
  const handleCopyPix = () => {
    if (paymentData && paymentData.copiaecola) {
      navigator.clipboard.writeText(paymentData.copiaecola);
      setCopiedText(true);
      toast.success("Código PIX copiado para a área de transferência!");
    }
  };

  // Tela de carregamento inicial
  if (loadingCompany) {
    return (
      <Paper className={classes.root} elevation={0}>
        <div className={classes.loading}>
          <CircularProgress size={40} thickness={4} color="primary" />
          <Typography variant="body2" style={{ marginTop: 16, color: '#666' }}>
            Carregando dados da empresa...
          </Typography>
        </div>
      </Paper>
    );
  }

  // Tela de carregamento do QR Code
  if (loading) {
    return (
      <Paper className={classes.root} elevation={0}>
        <div className={classes.loading}>
          <CircularProgress size={40} thickness={4} color="primary" />
          <Typography variant="body2" style={{ marginTop: 16, color: '#666' }}>
            Gerando QR Code de pagamento...
          </Typography>
        </div>
      </Paper>
    );
  }

  // Se temos os dados de pagamento, mostra o QRCode independentemente de outros estados
  if (paymentData) {
    return (
      <Paper className={classes.root} elevation={0}>
        <Typography variant="h6" className={classes.title}>
          PIX Mercado Pago
        </Typography>

        <div className={classes.qrContainer}>
          <div className={classes.qrCodeWrapper}>
            {paymentData.qrcode.startsWith('data:image') ? (
              <img
                src={paymentData.qrcode}
                alt="QR Code PIX"
                className={classes.qrCodeImage}
              />
            ) : (
              <QRCode
                value={paymentData.copiaecola}
                size={180}
                level="H"
                includeMargin={true}
                renderAs="svg"
              />
            )}
          </div>

          <Button
            variant="contained"
            color={copiedText ? "default" : "primary"}
            className={classes.copyButton}
            onClick={handleCopyPix}
            startIcon={copiedText ? <CheckCircleIcon /> : <FileCopyIcon className={classes.copyIcon} />}
            fullWidth
            size="medium"
          >
            {copiedText ? "Código Copiado!" : "Copiar código PIX"}
          </Button>

          <VerificationStatusIndicator />
        </div>
      </Paper>
    );
  }

  // Tela de entrada de CPF/CNPJ (só exibir se não tiver dados de pagamento)
  return (
    <Paper className={classes.root} elevation={0}>
      <Typography variant="h6" className={classes.title}>
        Pagamento via PIX
      </Typography>

      {invoiceData && (
        <Box mb={3}>
          <Typography variant="subtitle2" gutterBottom>
            Detalhes da Fatura
          </Typography>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2">Número:</Typography>
            <Typography variant="body2" fontWeight="bold">#{invoiceId}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2">Valor:</Typography>
            <Typography variant="body2" fontWeight="bold">
              R$ {invoiceData?.value?.toLocaleString('pt-br', { minimumFractionDigits: 2 }) || '0,00'}
            </Typography>
          </Box>
        </Box>
      )}

      <Box mt={1}>
        <Typography variant="subtitle2" gutterBottom>
          Por favor, informe seu CPF/CNPJ para continuar
        </Typography>
        <TextField
          className={classes.documentField}
          label="CPF/CNPJ (apenas números)"
          variant="outlined"
          value={document}
          onChange={handleDocumentChange}
          error={!!documentError}
          helperText={documentError}
          placeholder="Digite apenas números"
          fullWidth
          size="small"
          required
          InputProps={{
            autoFocus: true
          }}
        />
        <Button
          variant="contained"
          color="primary"
          fullWidth
          disabled={!document || !!documentError || loading}
          onClick={() => {
            // Define um estado imediato para mostrar que algo está acontecendo
            setShowDocumentField(false);
            setTimeout(() => {
              if (validateDocument()) {
                setLoading(true);
                setTimeout(() => {
                  handleGeneratePayment();
                }, 50);
              } else {
                setShowDocumentField(true);
              }
            }, 0);
          }}
          className={classes.generateButton}
          style={{
            borderRadius: 30,
            height: 48,
            fontWeight: 'bold',
            backgroundColor: '#0039a6'
          }}
        >
          {loading ? "GERANDO..." : "GERAR QR CODE PARA PAGAMENTO"}
        </Button>
      </Box>
    </Paper>
  );
}