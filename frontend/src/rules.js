const rules = {
	user: {
		static: [],
	},

	 admin: {
        static: [
            "dashboard:view",
            "drawer-gerencia:view",          // Permissão para o menu de Gerência
            "drawer-campanhas:view",         // Permissão para o menu de Campanhas
            "drawer-administracao:view",     // Permissão para o menu de Administração
            "tickets-manager:showall",
            "user-modal:editProfile",
            "user-modal:editQueues",
            "ticket-options:deleteTicket",
            "contacts-page:deleteContact",
            "connections-page:actionButtons",
            "connections-page:addConnection",
            "connections-page:editOrDeleteConnection"
        ],
    },
    
    supervisor: {
        static: [
            "drawer-gerencia:view",          // Apenas permissão para o menu de Gerência
            "connections-page:actionButtons",
            "connections-page:addConnection", 
            "connections-page:editOrDeleteConnection",
            "tickets-manager:showall",
            "dashboard:view"                  // Permissão para ver o dashboard
        ],
    }
};

export default rules;
