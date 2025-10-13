import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import { makeStyles } from "@material-ui/core/styles";

import TicketsManager from "../../components/TicketsManager/";
import Ticket from "../../components/Ticket/";

import logo from "../../assets/logo.png";

import { i18n } from "../../translate/i18n";

// IMPORTA o socket
import openSocket from "../../services/socket-io";

const useStyles = makeStyles(theme => ({
	chatContainer: {
		flex: 1,
		padding: theme.spacing(4),
		height: `calc(100% - 48px)`,
		overflowY: "hidden",
	},
	chatPapper: {
		display: "flex",
		height: "100%",
	},
	contactsWrapper: {
		display: "flex",
		height: "100%",
		flexDirection: "column",
		overflowY: "hidden",
	},
	messagessWrapper: {
		display: "flex",
		height: "100%",
		flexDirection: "column",
	},
	welcomeMsg: {
		backgroundColor: theme.palette.boxticket, 
		display: "flex",
		justifyContent: "space-evenly",
		alignItems: "center",
		height: "100%",
		textAlign: "center",
	},
}));

const Chat = () => {
	const classes = useStyles();
	const { ticketId } = useParams();

	useEffect(() => {
		const socket = openSocket();

		const handleTicketEvent = (data) => {
			// alguns forks mandam { action, ticket }
			const action = data?.action || data?.type || "";
			const ticket = data?.ticket || data?.payload || data;
			if (!ticket) return;

			const status = (ticket.status || "").toLowerCase();

			// 🔊 toca som se o ticket estiver aguardando/pendente
			const isNewOrBackToPending =
				action === "create" || (action === "update" && status === "pending");

			if (status === "pending" && isNewOrBackToPending) {
				playNewTicketSound();
			}
		};

		// Eventos comuns do Whaticket
		socket.on("ticket:create", handleTicketEvent);
		socket.on("ticket:update", handleTicketEvent);
		// alguns forks usam company-${id}-ticket
		if (window?.companyId) {
			socket.on(`company-${window.companyId}-ticket`, handleTicketEvent);
		}

		return () => {
			socket.off("ticket:create", handleTicketEvent);
			socket.off("ticket:update", handleTicketEvent);
			if (window?.companyId) {
				socket.off(`company-${window.companyId}-ticket`, handleTicketEvent);
			}
		};
	}, []);

	return (
		<div className={classes.chatContainer}>
			<div className={classes.chatPapper}>
				<Grid container spacing={0}>
					<Grid item xs={4} className={classes.contactsWrapper}>
						<TicketsManager />
					</Grid>
					<Grid item xs={8} className={classes.messagessWrapper}>
						{ticketId ? (
							<>
								<Ticket />
							</>
						) : (
							<Paper square variant="outlined" className={classes.welcomeMsg}>
								<div>
									<center>
										<img style={{ margin: "0 auto", width: "70%" }} src={logo} alt="logologin" />
									</center>
								</div>
								{/*<span>{i18n.t("chat.noTicketMessage")}</span>*/}
							</Paper>
						)}
					</Grid>
				</Grid>
			</div>
		</div>
	);
};

export default Chat;