import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  FormControlLabel,
  Switch,
  Typography,
  Box,
  CircularProgress,
  Paper,
  InputAdornment,
  Tooltip,
  IconButton
} from "@material-ui/core";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import ErrorIcon from "@material-ui/icons/Error";
import InfoIcon from "@material-ui/icons/Info";
import { toast } from "react-toastify";
import api from "../../services/api";

const SendWhatsappModal = ({ open, onClose, employee, goal }) => {
  const [loading, setLoading] = useState(false);
  const [whatsappConnections, setWhatsappConnections] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState("");
  const [previewMessage, setPreviewMessage] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [useCustomMessage, setUseCustomMessage] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isValidPhone, setIsValidPhone] = useState(false);

  useEffect(() => {
    if (open && employee) {
      loadWhatsappConnections();
      generatePreviewMessage();

      const phoneStr = employee.phone ? String(employee.phone).replace(/\D/g, "") : "";
      setPhoneNumber(phoneStr);
      validatePhone(phoneStr);
    }
  }, [open, employee, goal]);

  const validatePhone = (number) => {
    const isValid = number && number.length >= 10;
    setIsValidPhone(isValid);
    return isValid;
  };


  const loadWhatsappConnections = async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/whatsapp");

      const connections = Array.isArray(data) ? data : [];

      const connectedWhatsapps = connections.filter(c => c.status === "CONNECTED");
      setWhatsappConnections(connectedWhatsapps);

      if (connectedWhatsapps.length > 0) {
        setSelectedConnection(connectedWhatsapps[0].id);
      }
    } catch (err) {
      toast.error("Erro ao carregar conexões do WhatsApp");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const generatePreviewMessage = () => {
    if (!employee || !goal) return;

    // Verificar se é uma meta do tipo produto
    const isProductType = goal.metricType === 'produto';

    if (isProductType) {
      // Para metas do tipo produto - listar todos os produtos do funcionário
      const employeeProducts = goal.employeeGoals?.filter(eg => eg.employeeId === employee.id) || [];

      // Calcular progresso total para todos os produtos
      const totalTarget = employeeProducts.reduce((sum, p) => sum + (p.individualTarget || 0), 0);
      const totalCurrent = employeeProducts.reduce((sum, p) => sum + (p.individualCurrent || 0), 0);
      const totalProgress = totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0;

      // Determinar status baseado no progresso total
      let statusText = "em andamento";
      if (totalProgress < 30) {
        statusText = "em risco";
      } else if (totalProgress >= 70 && totalProgress < 100) {
        statusText = "avançada";
      } else if (totalProgress >= 100) {
        statusText = "concluída";
      }

      // Criar a mensagem para meta do tipo produto
      let productsList = '';
      employeeProducts.forEach(product => {
        const productProgress = product.individualTarget > 0
          ? Math.round((product.individualCurrent / product.individualTarget) * 100)
          : 0;

        productsList += `\n• *${product.productName || "Produto"}*: ${productProgress}% (${product.individualCurrent || 0}/${product.individualTarget || 0})`;
      });

      const message = `Olá ${employee.name},

    Aqui está uma atualização sobre sua meta: *${goal.name}*

    Seu progresso geral é de *${totalProgress}%* (${totalCurrent}/${totalTarget}), o que significa que sua meta está *${statusText}*.

    Detalhamento por produto:${productsList}

    ${totalProgress >= 100 ? "🎉 Parabéns por atingir sua meta geral!" : "Continue empenhado para atingir seus objetivos em todos os produtos!"}

    Atenciosamente,
    Equipe de Gestão de Metas`;

      setPreviewMessage(message);
      setCustomMessage(message);

    } else {
      // Para metas padrão - código original
      const employeeGoal = goal.employeeGoals?.find(eg => eg.employeeId === employee.id);

      // Obter valores com garantia de fallback
      const current = employeeGoal?.individualCurrent || 0;
      const target = employeeGoal?.individualTarget || goal.target || 1; // Evitar divisão por zero

      // Calcular progresso com limite de 100%
      const rawProgress = target > 0 ? (current / target) * 100 : 0;
      const progress = Math.round(rawProgress);

      // Determinar status baseado no progresso real (não limitado)
      let statusText = "em andamento";
      if (rawProgress < 30) {
        statusText = "em risco";
      } else if (rawProgress >= 70 && rawProgress < 100) {
        statusText = "avançada";
      } else if (rawProgress >= 100) {
        statusText = "concluída";
      }

      const message = `Olá ${employee.name},

    Aqui está uma atualização sobre sua meta: *${goal.name}*

    Seu progresso atual é de *${progress}%* (${current}/${target}), o que significa que sua meta está *${statusText}*.

    ${rawProgress >= 100 ? "🎉 Parabéns por atingir sua meta!" : "Continue empenhado para atingir seus objetivos!"}

    Atenciosamente,
    Equipe de Gestão de Metas`;

      setPreviewMessage(message);
      setCustomMessage(message);
    }
  };

  const handlePhoneChange = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    // Adiciona 55 se não começar com 55 e tiver pelo menos 10 dígitos (DDD + número)
    if (value.length >= 10 && !value.startsWith("55")) {
      value = "55" + value;
    }
    setPhoneNumber(value);
    validatePhone(value);
  };

  const formatPhoneForDisplay = (phone) => {
    if (!phone) return "";

    // Formatar para exibição legível: +55 (85) 98526-2587
    const cleaned = phone.replace(/\D/g, "");

    if (cleaned.length === 0) return "";

    // Extrair partes do número
    let formatted = "";

    // Código do país (assumindo Brasil se começar com 55)
    if (cleaned.startsWith("55")) {
      formatted = "+55 ";
      const remaining = cleaned.substring(2);

      // DDD e número
      if (remaining.length >= 2) {
        formatted += `(${remaining.substring(0, 2)}) `;

        // Número com 9 à frente
        if (remaining.length > 2) {
          const number = remaining.substring(2);
          if (number.length > 4) {
            formatted += `${number.substring(0, 5)}-${number.substring(5)}`;
          } else {
            formatted += number;
          }
        }
      } else {
        formatted += remaining;
      }
    } else {
      // Se não começar com 55, tentar formatar como número nacional
      if (cleaned.length >= 2) {
        formatted += `(${cleaned.substring(0, 2)}) `;
        if (cleaned.length > 2) {
          const number = cleaned.substring(2);
          if (number.length > 4) {
            formatted += `${number.substring(0, 5)}-${number.substring(5)}`;
          } else {
            formatted += number;
          }
        }
      } else {
        formatted = cleaned;
      }
    }

    return formatted;
  };


  const handleSendMessage = async () => {
    if (!selectedConnection) {
      toast.error("Selecione uma conexão para enviar a mensagem");
      return;
    }

    if (!employee || !goal) {
      toast.error("Dados do funcionário ou meta não encontrados");
      return;
    }

    if (!validatePhone(phoneNumber)) {
      toast.error("O número de telefone é inválido para WhatsApp");
      return;
    }

    try {
      setLoading(true);

      const messageToSend = useCustomMessage ? customMessage : previewMessage;
      let numberToSend = phoneNumber;
      if (!numberToSend.startsWith("55") && numberToSend.length >= 10) {
        numberToSend = "55" + numberToSend;
      }
      await api.post("/goals/send-message", {
        whatsappId: selectedConnection,
        number: numberToSend,
        body: messageToSend,
        goalId: goal.id,
        employeeId: employee.id
      });

      toast.success(`Mensagem enviada para ${employee.name}`);
      onClose();
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err);

      const errorMessage = err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        "Erro ao enviar mensagem";

      toast.error(`${errorMessage}. Verifique se o número está no formato correto.`);
    } finally {
      setLoading(false);
    }
  };

  if (!employee || !goal) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Enviar Mensagem de Progresso - {employee.name}
      </DialogTitle>
      <DialogContent>
        <Box mb={2}>
          <Typography variant="subtitle1">
            Meta: {goal.name}
          </Typography>
        </Box>

        <Paper
          variant="outlined"
          style={{
            padding: 16,
            marginBottom: 16,
            backgroundColor: isValidPhone ? 'rgba(76, 175, 80, 0.08)' : 'rgba(244, 67, 54, 0.08)',
            borderColor: isValidPhone ? 'rgba(76, 175, 80, 0.5)' : 'rgba(244, 67, 54, 0.5)'
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            Verificação do Número WhatsApp
          </Typography>

          <TextField
            fullWidth
            label="Número de telefone"
            variant="outlined"
            value={phoneNumber}
            onChange={handlePhoneChange}
            placeholder="Ex: 5585912345678"
            helperText={
              isValidPhone
                ? "Número válido para WhatsApp"
                : "Insira um número válido com pelo menos 10 dígitos (DDD + número)"
            }
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {isValidPhone ? <CheckCircleIcon style={{ color: 'green' }} /> : <ErrorIcon color="error" />}
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Tooltip title="O número deve estar no formato internacional: código do país (55 para Brasil) + DDD + número. Ex: 5585912345678">
                    <IconButton size="small">
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </InputAdornment>
              )
            }}
          />

          <Box mt={1}>
            <Typography variant="caption">
              <strong>Formato exibido:</strong> {formatPhoneForDisplay(phoneNumber)}
            </Typography>
            <Typography variant="caption" display="block" color="textSecondary" style={{ marginTop: 4 }}>
              ⚠️ Verifique se o número está correto antes de enviar a mensagem. O número deve ser igual a conta do whats app.
            </Typography>
          </Box>
        </Paper>

        <FormControl fullWidth variant="outlined" style={{ marginBottom: 16 }}>
          <InputLabel>Conexão do WhatsApp</InputLabel>
          <Select
            value={selectedConnection}
            onChange={(e) => setSelectedConnection(e.target.value)}
            label="Conexão do WhatsApp"
            disabled={whatsappConnections.length === 0}
          >
            {whatsappConnections.length === 0 ? (
              <MenuItem value="" disabled>
                Nenhuma conexão disponível
              </MenuItem>
            ) : (
              whatsappConnections.map((conn) => (
                <MenuItem key={conn.id} value={conn.id}>
                  {conn.name || `Conexão ${conn.number}`}
                </MenuItem>
              ))
            )}
          </Select>
          {whatsappConnections.length === 0 && (
            <Typography color="error" variant="caption" style={{ marginTop: 8 }}>
              Não há conexões do WhatsApp disponíveis. Por favor, configure pelo menos uma conexão.
            </Typography>
          )}
        </FormControl>

        <Box mt={2} mb={2}>
          <FormControlLabel
            control={
              <Switch
                checked={useCustomMessage}
                onChange={(e) => setUseCustomMessage(e.target.checked)}
                color="primary"
              />
            }
            label="Personalizar mensagem"
          />
        </Box>

        {useCustomMessage ? (
          <TextField
            fullWidth
            multiline
            rows={8}
            variant="outlined"
            label="Mensagem personalizada"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
          />
        ) : (
          <>
            <Typography variant="subtitle2" gutterBottom>
              Prévia da mensagem:
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={8}
              variant="outlined"
              value={previewMessage}
              InputProps={{
                readOnly: true,
              }}
            />
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          color="primary"
          variant="contained"
          onClick={handleSendMessage}
          disabled={loading || !selectedConnection || !isValidPhone}
          startIcon={loading ? <CircularProgress size={20} /> : null}
        >
          {loading ? "Enviando..." : "Enviar Mensagem"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SendWhatsappModal;