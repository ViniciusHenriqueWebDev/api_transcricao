import React, { useEffect, useState } from "react";

import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import Drawer from "@material-ui/core/Drawer";
import Link from "@material-ui/core/Link";
import InputLabel from "@material-ui/core/InputLabel";
import Avatar from "@material-ui/core/Avatar";
import Button from "@material-ui/core/Button";
import Paper from "@material-ui/core/Paper";
import CreateIcon from '@material-ui/icons/Create';

import { i18n } from "../../translate/i18n";

import ContactDrawerSkeleton from "../ContactDrawerSkeleton";
import MarkdownWrapper from "../MarkdownWrapper";
import { CardHeader } from "@material-ui/core";
import { ContactForm } from "../ContactForm";
import ContactModal from "../ContactModal";
import { ContactNotes } from "../ContactNotes";
import { generateColor } from "../../helpers/colorGenerator";
import { getInitials } from "../../helpers/getInitials";

const drawerWidth = 320;

const useStyles = makeStyles(theme => ({
	drawer: {
		width: drawerWidth,
		flexShrink: 0,
	},
	drawerPaper: {
		width: drawerWidth,
		display: "flex",
		borderTop: "1px solid rgba(0, 0, 0, 0.12)",
		borderRight: "1px solid rgba(0, 0, 0, 0.12)",
		borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
		borderTopRightRadius: 4,
		borderBottomRightRadius: 4,
	},
	header: {
		display: "flex",
		borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
		backgroundColor: theme.palette.contactdrawer, //DARK MODE PLW DESIGN//
		alignItems: "center",
		padding: theme.spacing(0, 1),
		minHeight: "73px",
		justifyContent: "flex-start",
	},
	content: {
		display: "flex",
		backgroundColor: theme.palette.contactdrawer, //DARK MODE PLW DESIGN//
		flexDirection: "column",
		padding: "8px 0px 8px 8px",
		height: "100%",
		overflowY: "scroll",
		...theme.scrollbarStyles,
	},

	contactAvatar: {
		margin: 15,
		width: 100,
		height: 100,
	},

	contactHeader: {
		display: "flex",
		padding: 8,
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		"& > *": {
			margin: 4,
		},
	},

	contactAvatarContainer: {
		display: "flex",
		justifyContent: "center",
		marginBottom: 12,
	},

	contactInfoContainer: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		width: "100%",
		gap: 8,
	},

	contactNameContainer: {
		display: "flex",
		alignItems: "center",
		justifyContent: "center",
		flexWrap: "wrap",
		textAlign: "center",
		width: "100%",
		minHeight: 24,
	},

	contactName: {
		fontSize: 18,
		fontWeight: 600,
		cursor: "pointer",
		display: "flex",
		alignItems: "center",
		flexWrap: "wrap",
		justifyContent: "center",
		wordBreak: "break-word",
		lineHeight: 1.2,
		maxWidth: "100%",
	},

	contactDetailsText: {
		fontSize: 12,
		textAlign: "center",
		wordBreak: "break-all",
		maxWidth: "100%",
	},

	editButton: {
		fontSize: 12,
		marginTop: 8,
		minWidth: 80,
	},

	contactDetails: {
		marginTop: 8,
		padding: 8,
		display: "flex",
		flexDirection: "column",
	},
	contactExtraInfo: {
		marginTop: 4,
		padding: 6,
	},
}));

const ContactDrawer = ({ open, handleDrawerClose, contact, ticket, loading }) => {
	const classes = useStyles();

	const [modalOpen, setModalOpen] = useState(false);
	const [openForm, setOpenForm] = useState(false);

	useEffect(() => {
		setOpenForm(false);
	}, [open, contact]);

	return (
		<>
			<Drawer
				className={classes.drawer}
				variant="persistent"
				anchor="right"
				open={open}
				PaperProps={{ style: { position: "absolute" } }}
				BackdropProps={{ style: { position: "absolute" } }}
				ModalProps={{
					container: document.getElementById("drawer-container"),
					style: { position: "absolute" },
				}}
				classes={{
					paper: classes.drawerPaper,
				}}
			>
				<div className={classes.header}>
					<IconButton onClick={handleDrawerClose}>
						<CloseIcon />
					</IconButton>
					<Typography style={{ justifySelf: "center" }}>
						{i18n.t("contactDrawer.header")}
					</Typography>
				</div>
				{loading ? (
					<ContactDrawerSkeleton classes={classes} />
				) : (
					<div className={classes.content}>
						<Paper square variant="outlined" className={classes.contactHeader}>
							{/* ✅ AVATAR SEPARADO */}
							<div className={classes.contactAvatarContainer}>
								<Avatar
									src={contact.profilePicUrl}
									alt="contact_image"
									style={{
										width: 140,
										height: 140,
										backgroundColor: generateColor(contact?.number),
										color: "white",
										fontWeight: "bold"
									}}
								>
									{getInitials(contact?.name)}
								</Avatar>
							</div>

							{/* ✅ INFORMAÇÕES DO CONTATO CENTRALIZADAS */}
							<div className={classes.contactInfoContainer}>
								{/* ✅ NOME COM QUEBRA DE LINHA RESPONSIVA */}
								<div className={classes.contactNameContainer}>
									<Typography
										className={classes.contactName}
										onClick={() => setOpenForm(true)}
									>
										{contact.name}
										<CreateIcon style={{ fontSize: 16, marginLeft: 5 }} />
									</Typography>
								</div>

								{/* ✅ DETALHES DO CONTATO */}
								<div>
									<Typography className={classes.contactDetailsText}>
										<Link href={`tel:${contact.number}`}>{contact.number}</Link>
									</Typography>
									{contact.email && (
										<Typography className={classes.contactDetailsText}>
											<Link href={`mailto:${contact.email}`}>{contact.email}</Link>
										</Typography>
									)}
								</div>

								{/* ✅ BOTÃO EDITAR */}
								<Button
									variant="outlined"
									color="primary"
									onClick={() => setModalOpen(!openForm)}
									className={classes.editButton}
								>
									{i18n.t("contactDrawer.buttons.edit")}
								</Button>
							</div>

							{/* ✅ FORMULÁRIO DE CONTATO */}
							{(contact.id && openForm) && (
								<div style={{ width: "100%", marginTop: 16 }}>
									<ContactForm
										initialContact={contact}
										onCancel={() => setOpenForm(false)}
									/>
								</div>
							)}
						</Paper>
						<Paper square variant="outlined" className={classes.contactDetails}>
							<Typography variant="subtitle1" style={{ marginBottom: 10 }}>
								{i18n.t("ticketOptionsMenu.appointmentsModal.title")}
							</Typography>
							<ContactNotes ticket={ticket} />
						</Paper>
						<Paper square variant="outlined" className={classes.contactDetails}>
							<ContactModal
								open={modalOpen}
								onClose={() => setModalOpen(false)}
								contactId={contact.id}
							></ContactModal>
							<Typography variant="subtitle1">
								{i18n.t("contactDrawer.extraInfo")}
							</Typography>
							{contact?.extraInfo?.map(info => (
								<Paper
									key={info.id}
									square
									variant="outlined"
									className={classes.contactExtraInfo}
								>
									<InputLabel>{info.name}</InputLabel>
									<Typography component="div" noWrap style={{ paddingTop: 2 }}>
										<MarkdownWrapper>{info.value}</MarkdownWrapper>
									</Typography>
								</Paper>
							))}
						</Paper>
					</div>
				)}
			</Drawer>
		</>
	);
};

export default ContactDrawer;
