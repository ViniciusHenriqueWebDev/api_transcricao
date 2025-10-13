import React, { useState, useEffect, useRef, useContext } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  Paper,
  CircularProgress,
  LinearProgress,
  IconButton,
  Chip,
  TextField
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import {
  Close as CloseIcon,
  FileCopy as FileCopyIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as AccessTimeIcon,
  Warning as WarningIcon,
  Block as BlockIcon,
  ContactPhone as ContactPhoneIcon
} from '@material-ui/icons';
import { makeStyles } from '@material-ui/core/styles';
import QRCode from 'qrcode.react';
import moment from 'moment';
import { toast } from 'react-toastify';

import api from '../../services/api';
import { AuthContext } from '../../context/Auth/AuthContext';
import { useDate } from '../../hooks/useDate';

const useStyles = makeStyles((theme) => ({
  dialogPaper: { maxWidth: 500, width: '100%' },
  warningHeader: {
    backgroundColor: '#fff3e0',
    borderBottom: `1px solid ${theme.palette.divider}`,
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(2),
    gap: theme.spacing(1),
  },
  blockHeader: {
    backgroundColor: '#ffebee',
    borderBottom: `1px solid ${theme.palette.divider}`,
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(2),
    gap: theme.spacing(1),
  },
  warningIcon: { color: '#f57c00', fontSize: 28 },
  blockIcon: { color: '#d32f2f', fontSize: 28 },
  title: { fontWeight: 600, color: '#e65100' },
  blockTitle: { fontWeight: 600, color: '#d32f2f' },
  subtitle: { color: '#bf360c', fontSize: '0.875rem', marginTop: 4 },
  blockSubtitle: { color: '#c62828', fontSize: '0.875rem', marginTop: 4 },
  content: { padding: theme.spacing(3), textAlign: 'center' },
  userWarningContainer: { textAlign: 'center', padding: theme.spacing(2) },
  userAlert: { marginBottom: theme.spacing(2), textAlign: 'left' },
  contactButton: {
    backgroundColor: '#1976d2',
    color: 'white',
    '&:hover': { backgroundColor: '#1565c0' },
    borderRadius: 25,
    padding: theme.spacing(1.5, 3),
    fontWeight: 'bold',
    marginTop: theme.spacing(2),
  },
  qrContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: theme.spacing(2),
    marginTop: theme.spacing(2),
  },
  qrCodeWrapper: {
    padding: theme.spacing(2),
    backgroundColor: '#fff',
    borderRadius: theme.spacing(1),
    border: '1px solid #e0e0e0',
  },
  qrCodeImage: { width: 180, height: 180, objectFit: 'contain' },
  copyButton: {
    backgroundColor: '#0039a6',
    color: 'white',
    '&:hover': { backgroundColor: '#002884' },
    borderRadius: 30,
    padding: theme.spacing(1.5, 3),
    fontWeight: 'bold',
  },
  timer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing(1),
    marginTop: theme.spacing(1),
    padding: theme.spacing(1),
    backgroundColor: '#f5f5f5',
    borderRadius: theme.spacing(0.5),
  },
  timeIcon: { fontSize: 18, color: theme.palette.primary.main },
  timeText: { fontSize: '0.875rem', fontWeight: 500 },
  progressBar: { marginTop: theme.spacing(1), borderRadius: 4, height: 6 },
  verifyButton: { marginTop: theme.spacing(1), borderRadius: 25 },
  loading: { display: 'flex', flexDirection: 'column', alignItems: 'center', padding: theme.spacing(4) },
  verificationStatus: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing(1),
    borderRadius: theme.spacing(0.5),
    marginTop: theme.spacing(1),
    backgroundColor: '#e3f2fd',
  },
  verificationStatusSuccess: { backgroundColor: '#e8f5e8', color: '#2e7d32' },
  actions: { padding: theme.spacing(2, 3), borderTop: `1px solid ${theme.palette.divider}` },
  remindButton: { color: theme.palette.text.secondary },
  documentField: { marginBottom: theme.spacing(2), '& .MuiTextField-root': { width: '100%' } },
}));

const PaymentNotify = () => {
  const classes = useStyles();
  const { user } = useContext(AuthContext);
  const { dateToClient } = useDate();
  
  const [open, setOpen] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(300);
  const [progress, setProgress] = useState(100);
  const [copiedText, setCopiedText] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [currentInvoice, setCurrentInvoice] = useState(null);
  const [document, setDocument] = useState('');
  const [documentError, setDocumentError] = useState('');
  const [showDocumentField, setShowDocumentField] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [companyDocument, setCompanyDocument] = useState('');
  
  const timerRef = useRef(null);
  const verificationTimerRef = useRef(null);

  const isUserAdmin = () => user?.profile === 'admin';

  const getProfileMessage = (daysUntilDue, isOverdue) => {
    if (isUserAdmin()) {
      return {
        isAdmin: true,
        title: isOverdue ? 'Assinatura Vencida!' : 'Assinatura Vence em Breve!',
        subtitle: isOverdue 
          ? `Venceu em ${dateToClient(user.company.dueDate)}`
          : `${daysUntilDue === 0 ? 'Vence hoje' : `Vence em ${daysUntilDue} dia${daysUntilDue > 1 ? 's' : ''}`} - ${dateToClient(user.company.dueDate)}`,
        message: 'Renove sua assinatura agora para continuar usando o sistema sem interrupções.'
      };
    } else {
      return {
        isAdmin: false,
        title: 'Sistema será Bloqueado!',
        subtitle: isOverdue 
          ? 'Assinatura vencida - Entre em contato com o administrador'
          : `Sistema será bloqueado em ${daysUntilDue === 0 ? 'hoje' : `${daysUntilDue} dia${daysUntilDue > 1 ? 's' : ''}`}`,
        message: `Olá ${user?.name || 'usuário'}, a assinatura da empresa ${isOverdue ? 'venceu' : 'vencerá em breve'}. Entre em contato com o administrador do sistema para renovar a assinatura e evitar o bloqueio.`,
        alertMessage: isOverdue 
          ? 'A assinatura da empresa venceu. O sistema pode ser bloqueado a qualquer momento.'
          : `A assinatura vence ${daysUntilDue === 0 ? 'hoje' : `em ${daysUntilDue} dia${daysUntilDue > 1 ? 's' : ''}`}. Após o vencimento, o sistema será bloqueado.`
      };
    }
  };

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

  const checkLastShownDateAdmin = async () => {
    try {
      const { data } = await api.get('/settings');
      const todayString = moment().format('YYYY-MM-DD');
      const settingKey = 'paymentNotifyLastShown';

      const paymentNotifySetting = data.find(setting => setting.key === settingKey);

      if (!paymentNotifySetting) {
        await createPaymentNotifyLastShownAdmin(todayString);
        fetchOpenInvoice();
        return;
      }

      const lastShown = paymentNotifySetting.value;

      if (lastShown !== todayString) {
        fetchOpenInvoice();
      }
    } catch (err) {
      fetchOpenInvoice();
    }
  };

  const checkLastShownDateUser = async () => {
    try {
      const { data } = await api.get('/settings');
      const todayString = moment().format('YYYY-MM-DD');
      const settingKey = `paymentNotifyLastShown_user_${user.id}`;

      const paymentNotifySetting = data.find(setting => setting.key === settingKey);

      if (!paymentNotifySetting) {
        await createPaymentNotifyLastShownUser(todayString);
        fetchOpenInvoice();
        return;
      }

      const lastShown = paymentNotifySetting.value;

      if (lastShown !== todayString) {
        fetchOpenInvoice();
      }
    } catch (err) {
      fetchOpenInvoice();
    }
  };

  const createPaymentNotifyLastShownAdmin = async (dateValue) => {
    try {
      await api.post('/settings', {
        key: 'paymentNotifyLastShown',
        value: dateValue
      });
    } catch (err) {
      try {
        await api.put('/settings/paymentNotifyLastShown', {
          value: dateValue
        });
      } catch (putErr) {
        // Error fallback
      }
    }
  };

  const createPaymentNotifyLastShownUser = async (dateValue) => {
    try {
      const userKey = `paymentNotifyLastShown_user_${user.id}`;
      await api.post('/settings', {
        key: userKey,
        value: dateValue
      });
    } catch (err) {
      try {
        const userKey = `paymentNotifyLastShown_user_${user.id}`;
        await api.put(`/settings/${userKey}`, {
          value: dateValue
        });
      } catch (putErr) {
        // Error fallback
      }
    }
  };

  const updateLastShownDateAdmin = async () => {
    try {
      const todayString = moment().format('YYYY-MM-DD');
      await api.put('/settings/paymentNotifyLastShown', { value: todayString });
    } catch (err) {
      // Error fallback
    }
  };

  const updateLastShownDateUser = async () => {
    try {
      const todayString = moment().format('YYYY-MM-DD');
      const userKey = `paymentNotifyLastShown_user_${user.id}`;
      await api.put(`/settings/${userKey}`, { value: todayString });
    } catch (err) {
      // Error fallback
    }
  };

  const updateLastShownDate = async () => {
    if (isUserAdmin()) {
      await updateLastShownDateAdmin();
    } else {
      await updateLastShownDateUser();
    }
  };

  const checkLastShownDateWithFallback = async () => {
    if (isUserAdmin()) {
      await checkLastShownDateAdmin();
    } else {
      await checkLastShownDateUser();
    }
  };

  const fetchOpenInvoice = async () => {
    try {
      const { data } = await api.get('/invoices/all');
      const openInvoices = data.filter(invoice => invoice.status === 'open');
      
      if (openInvoices && openInvoices.length > 0) {
        const invoice = openInvoices.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
        setCurrentInvoice(invoice);
        setOpen(true);
        
        if (isUserAdmin()) {
          await fetchCompanyDocument();
        }
        
        await updateLastShownDate();
      }
    } catch (err) {
      return err;
    }
  };

  const fetchCompanyDocument = async () => {
    try {
      const { data: companyData } = await api.get(`/companies/${user.companyId}`);
      
      if (companyData.document) {
        setCompanyDocument(companyData.document);
        setDocument(companyData.document);
        setShowDocumentField(false);
        setAutoGenerating(true);
        
        setTimeout(async () => {
          await handleGeneratePayment();
          setAutoGenerating(false);
        }, 500);
      } else {
        setShowDocumentField(true);
      }
    } catch (err) {
      checkCompanyDocument();
    }
  };

  const checkCompanyDocument = async () => {
    try {
      if (user?.company?.document) {
        setDocument(user.company.document);
        setCompanyDocument(user.company.document);
        setShowDocumentField(false);
        setAutoGenerating(true);
        
        setTimeout(async () => {
          await handleGeneratePayment();
          setAutoGenerating(false);
        }, 500);
      } else {
        setShowDocumentField(true);
      }
    } catch (err) {
      setShowDocumentField(true);
      setAutoGenerating(false);
    }
  };

  const handleGeneratePayment = async () => {
    if (!currentInvoice) return;

    if (showDocumentField && !validateDocument()) {
      setAutoGenerating(false);
      return;
    }

    setLoading(true);
    try {
      const documentToUse = companyDocument || document || user?.company?.document;
      
      if (!documentToUse) {
        toast.error('Documento da empresa não encontrado. Entre em contato com o suporte.');
        setLoading(false);
        setAutoGenerating(false);
        return;
      }

      const { data } = await api.post('/subscription/mercadopago', {
        invoiceId: currentInvoice.id,
        paymentMethod: 'MERCADOPAGO',
        document: documentToUse.replace(/[^\d]/g, '')
      });

      const qrcodeData = {
        qrcode: data.qr_code_base64 
          ? `data:image/jpeg;base64,${data.qr_code_base64}` 
          : data.qr_code,
        copiaecola: data.qr_code
      };

      setPaymentData(qrcodeData);
      setShowDocumentField(false);
      startExpirationTimer();
      startVerificationChecks();
    } catch (err) {
      toast.error('Erro ao gerar pagamento: ' + (err.response?.data?.error || 'Erro desconhecido'));
    } finally {
      setLoading(false);
      setAutoGenerating(false);
    }
  };

  const handleDocumentChange = (e) => {
    setDocument(e.target.value);
    if (documentError) setDocumentError('');
  };

  const startExpirationTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeRemaining(300);
    setProgress(100);

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setVerificationStatus('cancelled');
          return 0;
        }
        const newTime = prev - 1;
        setProgress((newTime / 300) * 100);
        return newTime;
      });
    }, 1000);
  };

  const startVerificationChecks = () => {
    if (verificationTimerRef.current) clearInterval(verificationTimerRef.current);

    verificationTimerRef.current = setInterval(async () => {
      try {
        const result = await checkPaymentStatus();
        if (result && result.status === 'approved') {
          clearInterval(verificationTimerRef.current);
          clearInterval(timerRef.current);
        }
      } catch (err) {
        // Erro silencioso
      }
    }, 10000);
  };

  const checkPaymentStatus = async () => {
    try {
      setVerificationStatus('checking');
      const { data } = await api.post('/subscription/check-payment', { 
        invoiceId: currentInvoice.id 
      });

      if (data.status === 'approved') {
        setVerificationStatus('approved');
        toast.success('Pagamento aprovado com sucesso!');
        setTimeout(() => {
          handleClose();
          window.location.reload();
        }, 3000);
        return data;
      } else {
        setVerificationStatus('pending');
        return data;
      }
    } catch (err) {
      setVerificationStatus('error');
      return null;
    }
  };

  const handleCopyPix = () => {
    if (paymentData && paymentData.copiaecola) {
      navigator.clipboard.writeText(paymentData.copiaecola);
      setCopiedText(true);
      toast.success('Código PIX copiado para a área de transferência!');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' + secs : secs}`;
  };

  const handleClose = () => {
    setOpen(false);
    setPaymentData(null);
    setVerificationStatus(null);
    setCopiedText(false);
    setDocument('');
    setDocumentError('');
    setShowDocumentField(false);
    setCompanyDocument('');
    setAutoGenerating(false);
    
    if (timerRef.current) clearInterval(timerRef.current);
    if (verificationTimerRef.current) clearInterval(verificationTimerRef.current);
  };

  const handleRemindLater = async () => {
    try {
      const todayString = moment().format('YYYY-MM-DD');
      
      if (isUserAdmin()) {
        await api.put('/settings/paymentNotifyLastShown', { value: todayString });
      } else {
        const userKey = `paymentNotifyLastShown_user_${user.id}`;
        await api.put(`/settings/${userKey}`, { value: todayString });
      }
      
      handleClose();
    } catch (err) {
      handleClose();
    }
  };

  const handleContactAdmin = () => {
    toast.info('Entre em contato com o administrador do sistema para renovar a assinatura.');
    handleClose();
  };

  useEffect(() => {
    const checkDueDate = () => {
      if (!user?.company?.dueDate) return;

      const dueDate = moment(user.company.dueDate).startOf('day');
      const today = moment().startOf('day');
      const daysUntilDue = dueDate.diff(today, 'days');

      if (daysUntilDue <= 3) {
        checkLastShownDateWithFallback();
      }
    };

    checkDueDate();
  }, [user]);

  useEffect(() => {
    if (copiedText) {
      const timer = setTimeout(() => setCopiedText(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [copiedText]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (verificationTimerRef.current) clearInterval(verificationTimerRef.current);
    };
  }, []);

  if (!open || !currentInvoice) return null;

  const dueDate = moment(user?.company?.dueDate).startOf('day');
  const today = moment().startOf('day');
  const daysUntilDue = dueDate.diff(today, 'days');
  const isOverdue = daysUntilDue < 0;
  const profileMessage = getProfileMessage(daysUntilDue, isOverdue);

  return (
    <Dialog
      open={open}
      onClose={handleRemindLater}
      classes={{ paper: classes.dialogPaper }}
      disableBackdropClick
      disableEscapeKeyDown
    >
      <Box className={profileMessage.isAdmin ? classes.warningHeader : classes.blockHeader}>
        {profileMessage.isAdmin ? (
          <WarningIcon className={classes.warningIcon} />
        ) : (
          <BlockIcon className={classes.blockIcon} />
        )}
        <Box flex={1}>
          <Typography className={profileMessage.isAdmin ? classes.title : classes.blockTitle}>
            {profileMessage.title}
          </Typography>
          <Typography className={profileMessage.isAdmin ? classes.subtitle : classes.blockSubtitle}>
            {profileMessage.subtitle}
          </Typography>
        </Box>
        <IconButton size="small" onClick={handleRemindLater}>
          <CloseIcon />
        </IconButton>
      </Box>

      <DialogContent className={classes.content}>
        {profileMessage.isAdmin ? (
          <>
            <Typography variant="h6" gutterBottom>
              Renovar Assinatura
            </Typography>
            
            <Box mb={2}>
              <Chip 
                label={`Fatura #${currentInvoice.id}`}
                color="primary" 
                variant="outlined"
              />
              <Typography variant="h5" style={{ marginTop: 8, fontWeight: 'bold' }}>
                R$ {currentInvoice.value?.toLocaleString('pt-br', { minimumFractionDigits: 2 })}
              </Typography>
            </Box>

            {showDocumentField && !paymentData && !loading && !autoGenerating && (
              <Box className={classes.documentField}>
                <TextField
                  label="CPF/CNPJ da Empresa"
                  variant="outlined"
                  value={document}
                  onChange={handleDocumentChange}
                  error={!!documentError}
                  helperText={documentError || 'Digite o CPF (11 dígitos) ou CNPJ (14 dígitos)'}
                  placeholder="00000000000 ou 00000000000000"
                  inputProps={{ maxLength: 18 }}
                />
              </Box>
            )}

            {(loading || autoGenerating) && (
              <Box className={classes.loading}>
                <CircularProgress size={40} />
                <Typography variant="body2" style={{ marginTop: 16 }}>
                  {autoGenerating ? 'Carregando dados do pagamento...' : 'Gerando QR Code de pagamento...'}
                </Typography>
              </Box>
            )}

            {!paymentData && !loading && !autoGenerating && (
              <Box>
                <Typography variant="body2" color="textSecondary" paragraph>
                  {profileMessage.message}
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  fullWidth
                  size="large"
                  onClick={handleGeneratePayment}
                  className={classes.copyButton}
                  disabled={showDocumentField && (!document || !!documentError)}
                >
                  Gerar QR Code PIX
                </Button>
              </Box>
            )}

            {paymentData && (
              <Box className={classes.qrContainer}>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Escaneie o QR Code ou copie o código PIX
                </Typography>
                
                <Paper className={classes.qrCodeWrapper} elevation={1}>
                  {paymentData.qrcode && paymentData.qrcode.startsWith('data:image') ? (
                    <img
                      src={paymentData.qrcode}
                      alt="QR Code PIX"
                      className={classes.qrCodeImage}
                    />
                  ) : (
                    <QRCode
                      value={paymentData.copiaecola || paymentData.qrcode}
                      size={180}
                      level="H"
                      includeMargin={true}
                      renderAs="svg"
                    />
                  )}
                </Paper>

                <Button
                  variant="contained"
                  color={copiedText ? "default" : "primary"}
                  className={classes.copyButton}
                  onClick={handleCopyPix}
                  startIcon={copiedText ? <CheckCircleIcon /> : <FileCopyIcon />}
                  fullWidth
                >
                  {copiedText ? "Código Copiado!" : "Copiar código PIX"}
                </Button>

                {verificationStatus === 'approved' && (
                  <Box className={`${classes.verificationStatus} ${classes.verificationStatusSuccess}`}>
                    <CheckCircleIcon style={{ marginRight: 8 }} />
                    <Typography variant="body2">
                      Pagamento aprovado! Redirecionando...
                    </Typography>
                  </Box>
                )}

                {verificationStatus === 'checking' && (
                  <Box className={classes.verificationStatus}>
                    <CircularProgress size={16} style={{ marginRight: 8 }} />
                    <Typography variant="body2">
                      Verificando pagamento...
                    </Typography>
                  </Box>
                )}

                {verificationStatus === 'cancelled' && (
                  <Box className={classes.verificationStatus}>
                    <Typography variant="body2" color="error">
                      QR Code expirado. Gere um novo código.
                    </Typography>
                  </Box>
                )}

                {verificationStatus !== 'approved' && verificationStatus !== 'cancelled' && (
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
                )}
              </Box>
            )}
          </>
        ) : (
          <Box className={classes.userWarningContainer}>
            <Typography variant="h6" gutterBottom>
              Atenção Necessária
            </Typography>

            <Alert severity="warning" className={classes.userAlert}>
              {profileMessage.alertMessage}
            </Alert>

            <Typography variant="body1" paragraph>
              {profileMessage.message}
            </Typography>

            <Box mt={2}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                <strong>Data de vencimento:</strong> {dateToClient(user.company.dueDate)}
              </Typography>
            </Box>
          </Box>
        )}
      </DialogContent>

      {profileMessage.isAdmin && !paymentData && !loading && !autoGenerating && (
        <DialogActions className={classes.actions}>
          <Button onClick={handleRemindLater} className={classes.remindButton}>
            Lembrar mais tarde
          </Button>
        </DialogActions>
      )}

      {!profileMessage.isAdmin && (
        <DialogActions className={classes.actions}>
          <Button onClick={handleRemindLater} className={classes.remindButton}>
            Lembrar mais tarde
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default PaymentNotify;