import React, { useState, useEffect, useContext, useRef } from "react";

import * as Yup from "yup";
import { Formik, Form, Field } from "formik";
import { toast } from "react-toastify";
import { useHistory } from "react-router-dom";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import Button from "@material-ui/core/Button";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import CircularProgress from "@material-ui/core/CircularProgress";
import MenuItem from '@material-ui/core/MenuItem';
import {
	FormControlLabel,
	Checkbox,
	Tooltip
} from "@material-ui/core";
import HelpOutline from "@material-ui/icons/HelpOutline";

import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import { Divider, FormControl, Grid, IconButton } from "@material-ui/core";
import Autocomplete from "@material-ui/lab/Autocomplete";
import moment from "moment"
import { AuthContext } from "../../context/Auth/AuthContext";
import { isArray, capitalize } from "lodash";
import DeleteOutline from "@material-ui/icons/DeleteOutline";
import AttachFile from "@material-ui/icons/AttachFile";
import { head } from "lodash";
import ConfirmationModal from "../ConfirmationModal";
import MessageVariablesPicker from "../MessageVariablesPicker";

const useStyles = makeStyles(theme => ({
	root: {
		display: "flex",
		flexWrap: "wrap",
	},
	multFieldLine: {
		display: "flex",
		"& > *:not(:last-child)": {
			marginRight: theme.spacing(1),
		},
	},

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
	formControl: {
		margin: theme.spacing(1),
		minWidth: 120,
	},
}));

const ScheduleSchema = Yup.object().shape({
	body: Yup.string()
		.min(5, "Mensagem muito curta")
		.required("Obrigatório"),
	contactId: Yup.number().required("Obrigatório"),
	sendAt: Yup.string().required("Obrigatório"),
	whatsappId: Yup.string().required("Obrigatório"),
	queueId: Yup.string().required("Obrigatório"),
	ticketStatus: Yup.string().required("Obrigatório")
});

const ScheduleModal = ({ open, onClose, scheduleId, contactId, cleanContact, reload }) => {
	const classes = useStyles();
	const history = useHistory();
	const { user } = useContext(AuthContext);

	const initialState = {
		body: "",
		contactId: "",
		sendAt: moment().add(1, 'hour').format('YYYY-MM-DDTHH:mm'),
		whatsappId: "",
		sentAt: "",
		queueId: "",
		status: "PENDENTE",
		atendenteId: "",
		ticketStatus: "open",
		recurrenceType: "none",
		recurrenceValue: 0,
		recurrenceTimes: 1,
		recurrencePattern: "normal",
		sendSignature: false,
	};

	const initialContact = {
		id: "",
		name: ""
	}

	const initialConnection = {
		id: "",
		name: ""
	};

	const initialQueue = {
		id: "",
		name: ""
	}

	const initialAtendente = {
		id: "",
		name: ""
	}

	const ticketStatus = [
		{ id: "open", name: "Aberto" },
		{ id: "closed", name: "Fechado" },
		{ id: "pending", name: "Pendente" }
	]

	const [schedule, setSchedule] = useState(initialState);
	const [currentContact, setCurrentContact] = useState(initialContact);
	const [contacts, setContacts] = useState([initialContact]);
	const [attachment, setAttachment] = useState(null);
	const [currentConnection, setCurrentConnection] = useState(initialConnection);
	const [connections, setConnections] = useState([initialConnection]);
	const [currentQueue, setCurrentQueue] = useState(initialQueue);
	const [atendentes, setAtendentes] = useState([initialAtendente]);
	const [currentAtendente, setCurrentAtendente] = useState(initialAtendente);
	const [currentStatus, setCurrentStatus] = useState(ticketStatus[0]);
	const [queues, setQueues] = useState([initialQueue]);
	const attachmentFile = useRef(null);
	const [confirmationOpen, setConfirmationOpen] = useState(false);
	const messageInputRef = useRef();

	useEffect(() => {
		if (contactId && contacts.length) {
			const contact = contacts.find(c => c.id === contactId);
			if (contact) {
				setCurrentContact(contact);
			}
		}
	}, [contactId, contacts]);

	useEffect(() => {
		const { companyId } = user;
		if (open) {
			try {
				(async () => {
					// Carrega dados iniciais
					const { data: contactList } = await api.get('/contacts/list', { params: { companyId } });
					let customList = contactList.map((c) => ({ id: c.id, name: c.name }));
					if (isArray(customList)) {
						setContacts([{ id: "", name: "" }, ...customList]);
					}
					if (contactId) {
						setSchedule(prevState => {
							return { ...prevState, contactId }
						});
					}

					const { data: connectionsList } = await api.get('/whatsapp', { params: { companyId } });
					let connectionsListFormatted = connectionsList.map((c) => ({
						id: c.id,
						name: c.name
					}));
					if (isArray(connectionsListFormatted)) {
						setConnections([{ id: "", name: "" }, ...connectionsListFormatted]);
					}

					const { data: queuesList } = await api.get('/queue', { params: { companyId } });
					let queuesListFormatted = queuesList.map((c) => ({
						id: c.id,
						name: c.name
					}));
					if (isArray(queuesListFormatted)) {
						setQueues([{ id: "", name: "" }, ...queuesListFormatted]);
					}

					// Corrigindo a declaração da variável
					let atendentesListFormatted = [];

					const { data: atendentesList } = await api.get('/users', { params: { companyId } });
					if (atendentesList && atendentesList.users && Array.isArray(atendentesList.users)) {
						// Aqui usamos atribuição, não redeclaração
						atendentesListFormatted = atendentesList.users.map((c) => ({
							id: c.id,
							name: c.name
						}));
						setAtendentes([{ id: "", name: "" }, ...atendentesListFormatted]);
					}

					// Se não for edição, sai da função
					if (!scheduleId) return;

					// Carrega os dados do agendamento existente
					const { data } = await api.get(`/schedules/${scheduleId}`);
					console.log("Agendamento carregado:", data);

					// Evita re-renderizações desnecessárias fazendo uma única atualização
					const updatedSchedule = {
						...initialState,
						...data,
						sendAt: moment(data.sendAt).format('YYYY-MM-DDTHH:mm'),
						body: data.body || "",
						contactId: data.contactId || "",
						whatsappId: data.whatsappId || "",
						queueId: data.queueId || "",
						userId: data.userId || data.atendenteId || "",
						atendenteId: data.userId || data.atendenteId || "",
						ticketStatus: data.ticketStatus || "open",
						// Campos de recorrência
						recurrence: data.recurrence,
						recurrenceType: data.recurrenceInterval || "none",
						recurrenceValue: data.recurrenceValue || 0,
						recurrenceTimes: data.recurrenceCount || 1,
						recurrencePattern: data.recurrenceDayOptions || "normal",
						sendSignature: data.sendSignature,
						status: data.status
					};

					// Define o estado em uma única operação
					setSchedule(updatedSchedule);

					// Encontra e define os objetos de seleção
					if (data.ticketStatus) {
						const status = ticketStatus.find(s => s.id === data.ticketStatus);
						if (status) setCurrentStatus(status);
					}

					if (data.whatsappId) {
						const connection = connectionsListFormatted.find(c => c.id === data.whatsappId);
						if (connection) setCurrentConnection(connection);
					}

					if (data.queueId) {
						const queue = queuesListFormatted.find(q => q.id === data.queueId);
						if (queue) setCurrentQueue(queue);
					}

					if (data.userId || data.atendenteId) {
						const atendenteId = data.userId || data.atendenteId;
						// Agora a variável tem os atendentes carregados
						const atendente = atendentesListFormatted.find(a => a.id === atendenteId);
						if (atendente) setCurrentAtendente(atendente);
					}

					if (data.contact) {
						setCurrentContact(data.contact);
					}
				})();
			} catch (err) {
				toastError(err);
			}
		}
	}, [scheduleId, contactId, open, user]);

	const handleClose = () => {
		onClose();
		setAttachment(null);
		setSchedule(initialState);
	};

	const handleAttachmentFile = (e) => {
		const file = head(e.target.files);
		if (file) {
			setAttachment(file);
		}
	};

	const handleSaveSchedule = async values => {
		// Log dos valores originais para depuração
		console.log("Valores originais:", values);

		// Garantir explicitamente que o status seja PENDENTE
		const scheduleData = {
			...values,
			userId: user.id,
			status: "PENDENTE", // Definindo explicitamente
			whatsappId: currentConnection?.id || "",
			queueId: currentQueue?.id || "",
			atendenteId: currentAtendente?.id || "",
			ticketStatus: currentStatus?.id || "open",
			sendSignature: values.sendSignature || false,
			// Campos de recorrência
			recurrenceInterval: values.recurrenceType || "none",
			recurrenceValue: parseInt(values.recurrenceValue || "0", 10),
			recurrenceCount: parseInt(values.recurrenceTimes || "1", 10),
			recurrenceDayOptions: values.recurrencePattern || "normal"
		};

		// Log do objeto final para verificar se o status está correto
		console.log("Dados a serem enviados para API:", scheduleData);
		console.log("Status a ser enviado:", scheduleData.status);

		try {
			if (scheduleId) {
				const statusData = { ...scheduleData, status: "PENDENTE" };
				console.log("Dados de atualização:", statusData);

				const response = await api.put(`/schedules/${scheduleId}`, statusData);
				console.log("Resposta da API (edição):", response.data);

				if (attachment != null) {
					const formData = new FormData();
					formData.append("file", attachment);
					await api.post(
						`/schedules/${scheduleId}/media-upload`,
						formData
					);
				}
			} else {
				// Para criação, forçamos novamente o status
				const statusData = { ...scheduleData, status: "PENDENTE" };
				console.log("Dados de criação:", statusData);

				const { data } = await api.post("/schedules", statusData);
				console.log("Resposta da API (criação):", data);

				if (attachment != null) {
					const formData = new FormData();
					formData.append("file", attachment);
					await api.post(`/schedules/${data.id}/media-upload`, formData);
				}
			}
			toast.success(i18n.t("scheduleModal.success"));
			if (typeof reload == 'function') {
				reload();
			}
			if (contactId) {
				if (typeof cleanContact === 'function') {
					cleanContact();
					history.push('/schedules');
				}
			}
		} catch (err) {
			console.error("Erro ao salvar agendamento:", err);
			toastError(err);
		}
		setCurrentContact(initialContact);
		setSchedule(initialState);
		handleClose();
	};
	const handleClickMsgVar = async (msgVar, setValueFunc) => {
		const el = messageInputRef.current;
		const firstHalfText = el.value.substring(0, el.selectionStart);
		const secondHalfText = el.value.substring(el.selectionEnd);
		const newCursorPos = el.selectionStart + msgVar.length;

		setValueFunc("body", `${firstHalfText}${msgVar}${secondHalfText}`);

		await new Promise(r => setTimeout(r, 100));
		messageInputRef.current.setSelectionRange(newCursorPos, newCursorPos);
	};

	const deleteMedia = async () => {
		if (attachment) {
			setAttachment(null);
			attachmentFile.current.value = null;
		}

		if (schedule.mediaPath) {
			await api.delete(`/schedules/${schedule.id}/media-upload`);
			setSchedule((prev) => ({
				...prev,
				mediaPath: null,
			}));
			toast.success(i18n.t("scheduleModal.toasts.deleted"));
			if (typeof reload == "function") {
				reload();
			}
		}
	};

	return (
		<div className={classes.root}>
			<ConfirmationModal
				title={i18n.t("scheduleModal.confirmationModal.deleteTitle")}
				open={confirmationOpen}
				onClose={() => setConfirmationOpen(false)}
				onConfirm={deleteMedia}
			>
				{i18n.t("scheduleModal.confirmationModal.deleteMessage")}
			</ConfirmationModal>
			<Dialog
				open={open}
				onClose={handleClose}
				maxWidth="md"
				fullWidth
				scroll="paper"
			>
				<DialogTitle id="form-dialog-title">
					{schedule.status === 'ERRO' ? 'Erro de Envio' : (scheduleId ? 'Editar agendamento' : 'Adicionar agendamento')}
				</DialogTitle>
				<div style={{ display: "none" }}>
					<input
						type="file"
						accept=".png,.jpg,.jpeg"
						ref={attachmentFile}
						onChange={(e) => handleAttachmentFile(e)}
					/>
				</div>
				<Formik
					initialValues={schedule}
					enableReinitialize={true}
					validationSchema={ScheduleSchema}
					onSubmit={(values, actions) => {
						setTimeout(() => {
							handleSaveSchedule(values);
							actions.setSubmitting(false);
						}, 400);
					}}
				>
					{({ touched, errors, isSubmitting, values, setFieldValue }) => (
						<Form>
							<DialogContent dividers>
								<div className={classes.multFieldLine}>
									<FormControl
										variant="outlined"
										fullWidth
									>
										<Autocomplete
											fullWidth
											value={currentContact}
											options={contacts}
											onChange={(e, contact) => {
												const contactId = contact ? contact.id : '';
												setFieldValue("contactId", contactId); // ✅ CORRETO
												setCurrentContact(contact ? contact : initialContact);
											}}
											getOptionLabel={(option) => option.name}
											getOptionSelected={(option, value) => {
												return value.id === option.id
											}}
											renderInput={(params) => <TextField {...params} variant="outlined" placeholder="Contato" />}
										/>
									</FormControl>
								</div>
								<br />
								<div className={classes.multFieldLine}>
									<Field
										as={TextField}
										rows={9}
										multiline={true}
										label={i18n.t("scheduleModal.form.body")}
										name="body"
										inputRef={messageInputRef}
										error={touched.body && Boolean(errors.body)}
										helperText={touched.body && errors.body}
										variant="outlined"
										margin="dense"
										fullWidth
									/>
								</div>
								<Grid item>
									<MessageVariablesPicker
										disabled={isSubmitting}
										onClick={value => handleClickMsgVar(value, setFieldValue)}
									/>
								</Grid>
								<Grid item container alignItems="center" style={{ marginTop: 8 }}>
									<FormControlLabel
										control={
											<Field
												as={Checkbox}
												color="primary"
												name="sendSignature"
												checked={values.sendSignature}
											/>
										}
										label="Incluir assinatura do atendente"
									/>
									<Tooltip
										title="Adiciona sua assinatura no final da mensagem. Ex: *vhdzn:* Vinicius Henrique"
										placement="right"
									>
										<IconButton size="small">
											<HelpOutline fontSize="small" />
										</IconButton>
									</Tooltip>
								</Grid>
								<br />
								<div className={classes.multFieldLine}>
									<Grid item xs={12} sm={6}>
										<FormControl variant="outlined" fullWidth>
											<Autocomplete
												fullWidth
												value={currentConnection}
												options={connections}
												onChange={(e, connection) => {
													const whatsappId = connection ? connection.id : '';
													setFieldValue("whatsappId", whatsappId); // ✅ CORRETO
													setCurrentConnection(connection ? connection : initialConnection);
												}}
												getOptionLabel={(option) => option.name}
												getOptionSelected={(option, value) => value.id === option.id}
												renderInput={(params) =>
													<TextField
														{...params}
														variant="outlined"
														label="Conexão"
														error={touched.whatsappId && Boolean(errors.whatsappId)}
														helperText={touched.whatsappId && errors.whatsappId}
													/>
												}
											/>
										</FormControl>
									</Grid>
									<Grid item xs={12} sm={6}>
										<FormControl variant="outlined" fullWidth>
											<Autocomplete
												fullWidth
												value={currentQueue}
												options={queues}
												onChange={(e, queue) => {
													const queueId = queue ? queue.id : '';
													setFieldValue("queueId", queueId); // ✅ CORRETO
													setCurrentQueue(queue ? queue : initialQueue);
												}}
												getOptionLabel={(option) => option.name}
												getOptionSelected={(option, value) => value.id === option.id}
												renderInput={(params) =>
													<TextField
														{...params}
														variant="outlined"
														label="Transferir para fila"
														error={touched.queueId && Boolean(errors.queueId)}
														helperText={touched.queueId && errors.queueId}
													/>
												}
											/>
										</FormControl>
									</Grid>
								</div>
								<br />
								<div className={classes.multFieldLine}>
									<Grid item xs={12} sm={6}>
										<FormControl variant="outlined" fullWidth>
											<Autocomplete
												fullWidth
												value={currentAtendente}
												options={atendentes}
												onChange={(e, atendente) => {
													const atendenteId = atendente ? atendente.id : '';
													setFieldValue("atendenteId", atendenteId); // ✅ CORRETO
													setCurrentAtendente(atendente ? atendente : initialAtendente);
												}}
												getOptionLabel={(option) => option.name}
												getOptionSelected={(option, value) => value.id === option.id}
												renderInput={(params) =>
													<TextField
														{...params}
														variant="outlined"
														label="Atendente"
														error={touched.atendenteId && Boolean(errors.atendenteId)}
														helperText={touched.atendenteId && errors.atendenteId}
													/>
												}
											/>
										</FormControl>
									</Grid>
									<Grid item xs={12} sm={6}>
										{/* Definir o status do ticket após a mensagem ter sido enviada */}
										<FormControl variant="outlined" fullWidth>
											<Autocomplete
												fullWidth
												value={currentStatus}
												options={ticketStatus}
												onChange={(e, status) => {
													const statusValue = status ? status.id : 'open';
													setFieldValue("ticketStatus", statusValue); // ✅ CORRETO
													setCurrentStatus(status ? status : ticketStatus[0]);
												}}
												getOptionLabel={(option) => option.name}
												getOptionSelected={(option, value) => value.id === option.id}
												renderInput={(params) =>
													<TextField
														{...params}
														variant="outlined"
														label="Status do ticket"
														error={touched.status && Boolean(errors.status)}
														helperText={touched.status && errors.status}
													/>
												}
											/>
										</FormControl>
									</Grid>
								</div>
								<br />
								<div className={classes.multFieldLine}>
									<Field
										as={TextField}
										label={i18n.t("scheduleModal.form.sendAt")}
										type="datetime-local"
										name="sendAt"
										InputLabelProps={{
											shrink: true,
										}}
										error={touched.sendAt && Boolean(errors.sendAt)}
										helperText={touched.sendAt && errors.sendAt}
										variant="outlined"
										fullWidth
									/>
								</div>
								<br />
								<div className={classes.multFieldLine} style={{ display: 'none' }}>
									<TextField
										label="Status do Agendamento"
										value="PENDENTE"
										InputProps={{
											readOnly: true,
										}}
										variant="outlined"
										fullWidth
										helperText="Este agendamento será processado com o status PENDENTE"
									/>
									{/* Campo oculto para garantir que o status seja enviado */}
									<Field
										type="hidden"
										name="status"
										value="PENDENTE"
									/>
								</div>
								<div className={classes.multFieldLine}>
									<Grid container spacing={2}>
										<Grid item xs={12}>
											<DialogTitle style={{ padding: '0px 0px 16px 0px' }}>
												Recorrência
											</DialogTitle>
											<p style={{ marginTop: 0 }}>
												Você pode escolher enviar a mensagem de forma recorrente e escolher o intervalo. Caso seja uma mensagem a ser enviada uma única vez, não altere nada nesta seção.
											</p>
										</Grid>
										<Grid item xs={12} md={4}>
											<FormControl variant="outlined" fullWidth>
												<TextField
													select
													label="Intervalo"
													value={values.recurrenceType || "none"}
													onChange={(e) => {
														setFieldValue("recurrenceType", e.target.value); // ✅ CORRETO
													}}
													variant="outlined"
												>
													<MenuItem value="none">
														<span style={{ fontWeight: 500 }}>Sem recorrência</span>
													</MenuItem>
													<MenuItem value="dias">
														<span style={{ fontWeight: 500 }}>Dias</span>
													</MenuItem>
													<MenuItem value="semanas">
														<span style={{ fontWeight: 500 }}>Semanas</span>
													</MenuItem>
													<MenuItem value="meses">
														<span style={{ fontWeight: 500 }}>Meses</span>
													</MenuItem>
												</TextField>
											</FormControl>
										</Grid>
										<Grid item xs={12} md={4}>
											<TextField
												label="Valor do Intervalo"
												type="number"
												value={values.recurrenceValue || 0}
												onChange={(e) => {
													setFieldValue("recurrenceValue", e.target.value); // ✅ CORRETO
												}}
												InputProps={{ inputProps: { min: 0 } }}
												disabled={!values.recurrenceType || values.recurrenceType === 'none'}
												variant="outlined"
												fullWidth
											/>
										</Grid>
										<Grid item xs={12} md={4}>
											<TextField
												label="Enviar quantas vezes"
												type="number"
												value={values.recurrenceTimes || 1}
												onChange={(e) => {
													setFieldValue("recurrenceTimes", e.target.value); // ✅ CORRETO
												}}
												InputProps={{ inputProps: { min: 1 } }}
												disabled={!values.recurrenceType || values.recurrenceType === 'none'}
												variant="outlined"
												fullWidth
											/>
										</Grid>
										<Grid item xs={12}>
											<FormControl variant="outlined" fullWidth>
												<TextField
													select
													label="Enviar em"
													value={values.recurrencePattern || "normal"}
													onChange={(e) => {
														setFieldValue("recurrencePattern", e.target.value); // ✅ CORRETO
													}}
													disabled={!values.recurrenceType || values.recurrenceType === 'none'}
													variant="outlined"
												>
													<MenuItem value="normal">
														<span style={{ fontWeight: 500 }}>Enviar normalmente em dias não úteis</span>
													</MenuItem>
													<MenuItem value="business">
														<span style={{ fontWeight: 500 }}>Apenas em dias úteis</span>
													</MenuItem>
													<MenuItem value="skip">
														<span style={{ fontWeight: 500 }}>Pular dias não úteis</span>
													</MenuItem>
												</TextField>
											</FormControl>
										</Grid>
									</Grid>
								</div>
								{(schedule.mediaPath || attachment) && (
									<Grid xs={12} item>
										<Button startIcon={<AttachFile />}>
											{attachment ? attachment.name : schedule.mediaName}
										</Button>
										<IconButton
											onClick={() => setConfirmationOpen(true)}
											color="secondary"
										>
											<DeleteOutline color="secondary" />
										</IconButton>
									</Grid>
								)}
							</DialogContent>
							<DialogActions>
								{!attachment && !schedule.mediaPath && (
									<Button
										color="primary"
										onClick={() => attachmentFile.current.click()}
										disabled={isSubmitting}
										variant="outlined"
									>
										{i18n.t("quickMessages.buttons.attach")}
									</Button>
								)}
								<Button
									onClick={handleClose}
									color="secondary"
									disabled={isSubmitting}
									variant="outlined"
								>
									{i18n.t("scheduleModal.buttons.cancel")}
								</Button>
								{(schedule.sentAt === null || schedule.sentAt === "") && (
									<Button
										type="submit"
										color="primary"
										disabled={isSubmitting}
										variant="contained"
										className={classes.btnWrapper}
									>
										{scheduleId
											? `${i18n.t("scheduleModal.buttons.okEdit")}`
											: `${i18n.t("scheduleModal.buttons.okAdd")}`}
										{isSubmitting && (
											<CircularProgress
												size={24}
												className={classes.buttonProgress}
											/>
										)}
									</Button>
								)}
							</DialogActions>
						</Form>
					)}
				</Formik>
			</Dialog>
		</div>
	);
};

export default ScheduleModal;