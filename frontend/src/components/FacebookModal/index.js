import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogActions,
    Button,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    Typography,
    Box,
    Chip,
    FormControlLabel,
    Switch,
    Divider,
    CircularProgress,
} from "@material-ui/core";
import { Facebook, Instagram } from "@material-ui/icons";
import { toast } from "react-toastify";
import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";

import api from "../../services/api";
import toastError from "../../errors/toastError";

const useStyles = makeStyles((theme) => ({
    btnWrapper: {
        position: "relative",
    },
    buttonProgress: {
        color: green[500],
        position: "absolute",
        top: "50%",
        left: "50%",
        marginTop: -12,
        marginLeft: -12,
    },
}));

const FacebookModal = ({ open, onClose, facebookConnection }) => {
    const classes = useStyles();

    const initialState = {
        name: "",
        greetingMessage: "",
        complationMessage: "",
        outOfHoursMessage: "",
        ratingMessage: "",
        farewellMessage: "",
        queueIds: [],
        promptId: "",
        integrationId: "",
        maxUseBotQueues: 3,
        timeUseBotQueues: 0,
        expiresTicket: 0,
        expiresInactiveMessage: "",
        isDefault: false,
    };

    const [formData, setFormData] = useState(initialState);
    const [queues, setQueues] = useState([]);
    const [prompts, setPrompts] = useState([]);
    const [integrations, setIntegrations] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(false);

    // ✅ FUNÇÕES PARA ÍCONES E NOMES COM PROTEÇÃO
    const getChannelIcon = () => {
        if (!facebookConnection) return <Facebook style={{ color: "#1877f2" }} />;

        return facebookConnection.channel === 'instagram' ?
            <Instagram style={{ color: "#E4405F" }} /> :
            <Facebook style={{ color: "#1877f2" }} />;
    };

    const getChannelName = () => {
        if (!facebookConnection) return 'Facebook';

        return facebookConnection.channel === 'instagram' ? 'Instagram' : 'Facebook';
    };

    // ✅ CARREGAR DADOS QUANDO MODAL ABRE
    useEffect(() => {
        if (open) {
            setLoading(true);
            fetchQueues();
            fetchPrompts();
            fetchIntegrations();

            // Carregar dados da conexão
            if (facebookConnection) {
                try {
                    setFormData({
                        name: facebookConnection.name || "",
                        greetingMessage: facebookConnection.greetingMessage || "",
                        complationMessage: facebookConnection.complationMessage || "",
                        outOfHoursMessage: facebookConnection.outOfHoursMessage || "",
                        ratingMessage: facebookConnection.ratingMessage || "",
                        farewellMessage: facebookConnection.farewellMessage || "",
                        queueIds: Array.isArray(facebookConnection.queues) ? facebookConnection.queues.map(q => q.id) : [],
                        promptId: facebookConnection.promptId || "",
                        integrationId: facebookConnection.integrationId || "",
                        maxUseBotQueues: facebookConnection.maxUseBotQueues || 3,
                        timeUseBotQueues: facebookConnection.timeUseBotQueues || 0,
                        expiresTicket: facebookConnection.expiresTicket || 0,
                        expiresInactiveMessage: facebookConnection.expiresInactiveMessage || "",
                        isDefault: facebookConnection.isDefault || false,
                    });
                } catch (error) {
                    console.error("Erro ao carregar dados da conexão:", error);
                    setFormData(initialState);
                }
            } else {
                setFormData(initialState);
            }
            setLoading(false);
        }
    }, [open, facebookConnection]);

    const fetchQueues = async () => {
        try {
            const { data } = await api.get("/queue");
            setQueues(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Erro ao buscar filas:", err);
            setQueues([]);
            toastError(err);
        }
    };

    const fetchPrompts = async () => {
        try {
            const { data } = await api.get("/prompt");
            setPrompts(Array.isArray(data.prompts || data) ? (data.prompts || data) : []);
        } catch (err) {
            console.error("Erro ao buscar prompts:", err);
            setPrompts([]);
            toastError(err);
        }
    };

    const fetchIntegrations = async () => {
        try {
            const { data } = await api.get("/queueIntegration");
            setIntegrations(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Erro ao buscar integrações:", err);
            setIntegrations([]);
            toastError(err);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };
    

    const handleSave = async () => {
        if (!facebookConnection?.id) {
            toast.error("Erro: ID da conexão não encontrado");
            return;
        }

        setIsSubmitting(true);

        try {
            const payload = {
                name: formData.name,
                greetingMessage: formData.greetingMessage,
                complationMessage: formData.complationMessage,
                outOfHoursMessage: formData.outOfHoursMessage,
                ratingMessage: formData.ratingMessage,
                farewellMessage: formData.farewellMessage,
                queueIds: formData.queueIds,
                promptId: formData.promptId || null,
                integrationId: formData.integrationId || null,
                maxUseBotQueues: parseInt(formData.maxUseBotQueues) || 3,
                timeUseBotQueues: parseInt(formData.timeUseBotQueues) || 0,
                expiresTicket: parseInt(formData.expiresTicket) || 0,
                expiresInactiveMessage: formData.expiresInactiveMessage,
                isDefault: formData.isDefault,
            };

            console.log("🔄 Salvando configurações:", {
                connectionId: facebookConnection.id,
                channel: facebookConnection.channel,
                payload
            });

            await api.put(`/facebook/${facebookConnection.id}`, payload);
            toast.success(`Configurações do ${getChannelName()} atualizadas com sucesso!`);
            handleClose();
        } catch (error) {
            console.error("Erro ao salvar:", error);
            toastError(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setFormData(initialState);
        setQueues([]);
        setPrompts([]);
        setIntegrations([]);
        onClose();
    };

    // ✅ NÃO RENDERIZAR SE NÃO TIVER DADOS
    if (!open) return null;

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                    {getChannelIcon()}
                    <Typography variant="h6">
                        Configurações do {getChannelName()}
                    </Typography>
                </Box>
                <Typography variant="body2" color="textSecondary">
                    {facebookConnection?.name || "Carregando..."}
                </Typography>
            </DialogTitle>

            <DialogContent dividers>
                {loading ? (
                    <Box display="flex" justifyContent="center" p={4}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <Grid container spacing={2}>
                        {/* Nome da Conexão */}
                        <Grid item xs={12}>
                            <TextField
                                label="Nome da Conexão"
                                fullWidth
                                variant="outlined"
                                margin="dense"
                                value={formData.name}
                                onChange={(e) => handleInputChange('name', e.target.value)}
                            />
                        </Grid>

                        {/* Filas */}
                        <Grid item xs={12}>
                            <FormControl fullWidth margin="dense" variant="outlined">
                                <InputLabel>Filas</InputLabel>
                                <Select
                                    multiple
                                    value={formData.queueIds}
                                    onChange={(e) => handleInputChange('queueIds', e.target.value)}
                                    renderValue={(selected) => (
                                        <Box style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                            {selected.map((value) => {
                                                const queue = queues.find(q => q.id === value);
                                                return (
                                                    <Chip
                                                        key={value}
                                                        label={queue?.name || `ID: ${value}`}
                                                        size="small"
                                                    />
                                                );
                                            })}
                                        </Box>
                                    )}
                                >
                                    {queues.map((queue) => (
                                        <MenuItem key={queue.id} value={queue.id}>
                                            {queue.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* OpenAI/Prompt */}
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth margin="dense" variant="outlined">
                                <InputLabel>Prompt OpenAI</InputLabel>
                                <Select
                                    value={formData.promptId}
                                    onChange={(e) => handleInputChange('promptId', e.target.value)}
                                >
                                    <MenuItem value="">Nenhum</MenuItem>
                                    {prompts.map((prompt) => (
                                        <MenuItem key={prompt.id} value={prompt.id}>
                                            {prompt.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        {/* Integração */}
                        <Grid item xs={12} md={6}>
                            <FormControl fullWidth margin="dense" variant="outlined">
                                <InputLabel>Integração</InputLabel>
                                <Select
                                    value={formData.integrationId}
                                    onChange={(e) => handleInputChange('integrationId', e.target.value)}
                                >
                                    <MenuItem value="">Nenhuma</MenuItem>
                                    {integrations.map((integration) => (
                                        <MenuItem key={integration.id} value={integration.id}>
                                            {integration.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>

                        <Grid item xs={12}>
                            <Divider />
                            <Typography variant="subtitle2" style={{ marginTop: 16, marginBottom: 8 }}>
                                Configurações do Chatbot
                            </Typography>
                        </Grid>

                        {/* Configurações do Bot */}
                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Máximo de tentativas do bot"
                                type="number"
                                fullWidth
                                variant="outlined"
                                margin="dense"
                                value={formData.maxUseBotQueues}
                                onChange={(e) => handleInputChange('maxUseBotQueues', e.target.value)}
                                inputProps={{ min: 0 }}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Tempo entre tentativas (minutos)"
                                type="number"
                                fullWidth
                                variant="outlined"
                                margin="dense"
                                value={formData.timeUseBotQueues}
                                onChange={(e) => handleInputChange('timeUseBotQueues', e.target.value)}
                                inputProps={{ min: 0 }}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                label="Expirar ticket (horas)"
                                type="number"
                                fullWidth
                                variant="outlined"
                                margin="dense"
                                value={formData.expiresTicket}
                                onChange={(e) => handleInputChange('expiresTicket', e.target.value)}
                                inputProps={{ min: 0 }}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <Divider />
                            <Typography variant="subtitle2" style={{ marginTop: 16, marginBottom: 8 }}>
                                Mensagens
                            </Typography>
                        </Grid>

                        {/* Mensagem de Saudação */}
                        <Grid item xs={12}>
                            <TextField
                                label="Mensagem de Saudação"
                                multiline
                                rows={3}
                                fullWidth
                                variant="outlined"
                                margin="dense"
                                value={formData.greetingMessage}
                                onChange={(e) => handleInputChange('greetingMessage', e.target.value)}
                            />
                        </Grid>

                        {/* Mensagem de Conclusão */}
                        <Grid item xs={12}>
                            <TextField
                                label="Mensagem de Conclusão"
                                multiline
                                rows={3}
                                fullWidth
                                variant="outlined"
                                margin="dense"
                                value={formData.complationMessage}
                                onChange={(e) => handleInputChange('complationMessage', e.target.value)}
                            />
                        </Grid>

                        {/* Mensagem Fora de Horário */}
                        <Grid item xs={12}>
                            <TextField
                                label="Mensagem Fora de Horário"
                                multiline
                                rows={3}
                                fullWidth
                                variant="outlined"
                                margin="dense"
                                value={formData.outOfHoursMessage}
                                onChange={(e) => handleInputChange('outOfHoursMessage', e.target.value)}
                            />
                        </Grid>

                        {/* Mensagem de Avaliação */}
                        <Grid item xs={12}>
                            <TextField
                                label="Mensagem de Avaliação"
                                multiline
                                rows={3}
                                fullWidth
                                variant="outlined"
                                margin="dense"
                                value={formData.ratingMessage}
                                onChange={(e) => handleInputChange('ratingMessage', e.target.value)}
                            />
                        </Grid>

                        {/* Mensagem de Despedida */}
                        <Grid item xs={12}>
                            <TextField
                                label="Mensagem de Despedida"
                                multiline
                                rows={3}
                                fullWidth
                                variant="outlined"
                                margin="dense"
                                value={formData.farewellMessage}
                                onChange={(e) => handleInputChange('farewellMessage', e.target.value)}
                            />
                        </Grid>

                        {/* Mensagem de Inatividade */}
                        <Grid item xs={12}>
                            <TextField
                                label="Mensagem de Inatividade"
                                multiline
                                rows={3}
                                fullWidth
                                variant="outlined"
                                margin="dense"
                                value={formData.expiresInactiveMessage}
                                onChange={(e) => handleInputChange('expiresInactiveMessage', e.target.value)}
                            />
                        </Grid>

                        {/* Conexão Padrão */}
                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={formData.isDefault}
                                        onChange={(e) => handleInputChange('isDefault', e.target.checked)}
                                        color="primary"
                                    />
                                }
                                label="Definir como conexão padrão"
                            />
                        </Grid>
                    </Grid>
                )}
            </DialogContent>

            <DialogActions>
                <Button onClick={handleClose} color="secondary" disabled={isSubmitting}>
                    Cancelar
                </Button>
                <Button
                    onClick={handleSave}
                    color="primary"
                    variant="contained"
                    startIcon={getChannelIcon()}
                    disabled={isSubmitting || loading}
                    className={classes.btnWrapper}
                >
                    Salvar Configurações
                    {isSubmitting && (
                        <CircularProgress
                            size={24}
                            className={classes.buttonProgress}
                        />
                    )}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default FacebookModal;