import React, { useState, useCallback, useContext, useEffect } from "react";
import { toast } from "react-toastify";
import { add, format, parseISO } from "date-fns";
import { useHistory } from "react-router-dom";


import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import {
    Button,
    TableBody,
    TableRow,
    TableCell,
    IconButton,
    Table,
    TableHead,
    Paper,
    Tooltip,
    Typography,
    CircularProgress,
    Box,
    Card,
    CardContent,
} from "@material-ui/core";
import {
    Edit,
    CheckCircle,
    SignalCellularConnectedNoInternet2Bar,
    SignalCellularConnectedNoInternet0Bar,
    SignalCellular4Bar,
    CropFree,
    DeleteOutline,
    Facebook,
    Instagram,
    WhatsApp,
    Add,
    Refresh
} from "@material-ui/icons";

import FacebookLogin from "react-facebook-login/dist/facebook-login-render-props";
import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import TableRowSkeleton from "../../components/TableRowSkeleton";

import api from "../../services/api";
import WhatsAppModal from "../../components/WhatsAppModal";
import FacebookModal from "../../components/FacebookModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import QrcodeModal from "../../components/QrcodeModal";
import { i18n } from "../../translate/i18n";
import { WhatsAppsContext } from "../../context/WhatsApp/WhatsAppsContext";
import toastError from "../../errors/toastError";
import { SocketContext } from "../../context/Socket/SocketContext";
import formatSerializedId from '../../utils/formatSerializedId';

import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../../components/Can";
import ForbiddenPage from "../../components/ForbiddenPage";

const useStyles = makeStyles(theme => ({
    mainPaper: {
        flex: 1,
        padding: theme.spacing(1),
        overflowY: "scroll",
        ...theme.scrollbarStyles,
    },
    customTableCell: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    tooltip: {
        backgroundColor: "#f5f5f9",
        color: "rgba(0, 0, 0, 0.87)",
        fontSize: theme.typography.pxToRem(14),
        border: "1px solid #dadde9",
        maxWidth: 450,
    },
    tooltipPopper: {
        textAlign: "center",
    },
    buttonProgress: {
        color: green[500],
    },
    headerButtons: {
        display: "flex",
        gap: theme.spacing(1),
        alignItems: "center",
    },
    newConnectionButton: {
        backgroundColor: "#25d366",
        color: "white",
        "&:hover": {
            backgroundColor: "#128c7e",
        }
    },
    statusIcon: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: theme.spacing(1),
    },
    channelIcon: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        padding: theme.spacing(1),
        minHeight: 48,
    }
}));

const CustomToolTip = ({ title, content, children }) => {
    const classes = useStyles();

    return (
        <Tooltip
            arrow
            classes={{
                tooltip: classes.tooltip,
                popper: classes.tooltipPopper,
            }}
            title={
                <React.Fragment>
                    <Typography gutterBottom color="inherit">
                        {title}
                    </Typography>
                    {content && <Typography>{content}</Typography>}
                </React.Fragment>
            }
        >
            {children}
        </Tooltip>
    );
};

function CircularProgressWithLabel(props) {
    return (
        <Box position="relative" display="inline-flex">
            <CircularProgress variant="determinate" {...props} />
            <Box
                top={0}
                left={0}
                bottom={0}
                right={0}
                position="absolute"
                display="flex"
                alignItems="center"
                justifyContent="center"
            >
                <Typography
                    variant="caption"
                    component="div"
                    color="textSecondary"
                >{`${Math.round(props.value)}%`}</Typography>
            </Box>
        </Box>
    );
}

const IconChannel = (channel) => {
    switch (channel) {
        case "facebook":
            return <Facebook style={{ color: "#1877f2", fontSize: 20 }} />;
        case "instagram":
            return <Instagram style={{ color: "#E4405F", fontSize: 20 }} />;
        case "whatsapp":
            return <WhatsApp style={{ color: "#25d366", fontSize: 20 }} />;
        default:
            return <WhatsApp style={{ color: "#25d366", fontSize: 20 }} />;
    }
};

const Connections = () => {
    const classes = useStyles();
    const history = useHistory();

    const [anchorEl, setAnchorEl] = useState(null);
    const isMenuOpen = Boolean(anchorEl);

    const handleOpenMenu = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
    };

    const { user } = useContext(AuthContext);
    const { whatsApps, loading } = useContext(WhatsAppsContext);
    const [statusImport, setStatusImport] = useState([]);
    const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [selectedWhatsApp, setSelectedWhatsApp] = useState(null);
    const [confirmModalOpen, setConfirmModalOpen] = useState(false);
    const [facebookModalOpen, setFacebookModalOpen] = useState(false);
    const [selectedFacebookConnection, setSelectedFacebookConnection] = useState(null);
    const confirmationModalInitialState = {
        action: "",
        title: "",
        message: "",
        whatsAppId: "",
        open: false,
    };
    const [confirmModalInfo, setConfirmModalInfo] = useState(
        confirmationModalInitialState
    );
    const [enabledFeatures, setEnabledFeatures] = useState({
        facebook_connection: false,
        instagram_connection: false
    });

    const socketManager = useContext(SocketContext);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // Buscar recursos ativados para a empresa atual
                const companyId = localStorage.getItem("companyId");
                const { data: companyFeatures } = await api.get(`/companies/${companyId}/features`);

                const existingFeatures = companyFeatures.existingFeatures || [];
                const featureStatus = {
                    meta_connections: existingFeatures.some(f => f.name === 'meta_connections' && f.status === true),
                    facebook_connection: existingFeatures.some(f => f.name === 'facebook_connection' && f.status === true),
                    instagram_connection: existingFeatures.some(f => f.name === 'instagram_connection' && f.status === true)
                };

                setEnabledFeatures(featureStatus);

            } catch (error) {
                console.error("Erro ao carregar recursos habilitados:", error);
            }
        };

        fetchInitialData();
    }, []);

    useEffect(() => {
        const companyId = localStorage.getItem("companyId");
        if (!companyId || !socketManager) return;

        const socket = socketManager.getSocket(companyId);

        const handleImportMessages = (data) => {
            if (data.action === "refresh") {
                setStatusImport([]);
                history.go(0);
            }
            if (data.action === "update") {
                setStatusImport(data.status);
            }
        };

        socket.on(`importMessages-${user.companyId}`, handleImportMessages);

        return () => {
            socket.off(`importMessages-${user.companyId}`, handleImportMessages);
        };
    }, [socketManager, history, user.companyId]);


    const handleInstagramLogin = () => {
        const appId = process.env.REACT_APP_FACEBOOK_APP_ID;

        if (!appId) {
            toast.error("App ID do Facebook não configurado.");
            return;
        }

        // ✅ FORÇAR HTTPS NO BACKEND URL
        const backendUrl = process.env.REACT_APP_BACKEND_URL?.replace('http://', 'https://') || 'https://back.metanivelpro.com';
        const redirectUri = `${backendUrl}/webhooks/instagram/callback`;

        const state = encodeURIComponent(JSON.stringify({
            companyId: user.companyId,
            timestamp: Date.now()
        }));

        // ✅ USAR FACEBOOK OAUTH COM SCOPES CORRETOS
        const facebookAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=pages_show_list,pages_read_engagement,pages_manage_metadata,pages_messaging,business_management,instagram_basic,instagram_manage_messages&response_type=code&state=${state}`;

        console.log("🔄 Instagram OAuth URL:", facebookAuthUrl);

        // ✅ USAR POPUP EM VEZ DE REDIRECT DIRETO
        const popup = window.open(
            facebookAuthUrl,
            'instagram-auth-popup',
            'width=600,height=700,scrollbars=yes,resizable=yes'
        );

        // ✅ LISTENER PARA MENSAGENS DO POPUP
        const handlePopupMessage = (event) => {
            // Verificar origem por segurança
            if (event.origin !== window.location.origin &&
                !event.origin.includes('back.metanivelpro.com') &&
                !event.origin.includes('facebook.com')) {
                return;
            }

            console.log("📨 Mensagem recebida do popup:", event.data);

            if (event.data.type === 'INSTAGRAM_SUCCESS') {
                console.log("✅ Instagram conectado com sucesso:", event.data.data);
                toast.success(`Instagram Business conectado com sucesso!`);

                // ✅ FECHAR POPUP E REMOVER LISTENER
                if (popup && !popup.closed) {
                    popup.close();
                }
                window.removeEventListener('message', handlePopupMessage);

                // ✅ FORÇAR ATUALIZAÇÃO DA LISTA DE CONEXÕES
                setTimeout(() => {
                    window.location.reload();
                }, 1000);

            } else if (event.data.type === 'INSTAGRAM_ERROR') {
                console.error("❌ Erro na conexão Instagram:", event.data.error);
                toast.error(`Erro ao conectar Instagram: ${event.data.error}`);

                // ✅ FECHAR POPUP E REMOVER LISTENER
                if (popup && !popup.closed) {
                    popup.close();
                }
                window.removeEventListener('message', handlePopupMessage);
            }
        };

        // ✅ ADICIONAR LISTENER PARA MENSAGENS
        window.addEventListener('message', handlePopupMessage);

        // ✅ VERIFICAR SE POPUP FOI FECHADO MANUALMENTE
        const checkClosed = setInterval(() => {
            if (popup.closed) {
                console.log("📴 Popup fechado pelo usuário");
                clearInterval(checkClosed);
                window.removeEventListener('message', handlePopupMessage);
            }
        }, 1000);

        // ✅ CLEANUP APÓS 5 MINUTOS (TIMEOUT)
        setTimeout(() => {
            if (popup && !popup.closed) {
                console.log("⏰ Timeout - fechando popup");
                popup.close();
            }
            clearInterval(checkClosed);
            window.removeEventListener('message', handlePopupMessage);
        }, 5 * 60 * 1000); // 5 minutos
    };

    // Facebook Login Response
    const responseFacebook = (response) => {
        if (response.status !== "unknown") {
            const { accessToken, id } = response;

            api
                .post("/facebook", {
                    facebookUserId: id,
                    facebookUserToken: accessToken,
                })
                .then((response) => {
                    toast.success("Facebook conectado com sucesso!");
                })
                .catch((error) => {
                    toastError(error);
                });
        }
    };

    const responseInstagram = (response) => {
        console.log("📸 Instagram OAuth Response:", response);

        if (response.access_token) {
            const { access_token, user_id } = response;

            api
                .post("/instagram", {
                    facebookUserId: user_id,
                    facebookUserToken: access_token,
                })
                .then((response) => {
                    toast.success("Instagram Business conectado com sucesso!");
                })
                .catch((error) => {
                    console.error("❌ Erro ao conectar Instagram:", error);
                    toastError(error);
                });
        } else {
            console.log("❌ Instagram OAuth cancelado ou erro");
            if (response.error) {
                toast.error(`Erro no Instagram: ${response.error_description || response.error}`);
            }
        }
    };


    const handleStartWhatsAppSession = async whatsAppId => {
        try {
            await api.post(`/whatsappsession/${whatsAppId}`);
        } catch (err) {
            toastError(err);
        }
    };

    const handleRequestNewQrCode = async whatsAppId => {
        try {
            await api.put(`/whatsappsession/${whatsAppId}`);
        } catch (err) {
            toastError(err);
        }
    };

    const openInNewTab = url => {
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const handleOpenWhatsAppModal = () => {
        setSelectedWhatsApp(null);
        setWhatsAppModalOpen(true);
    };

    const handleCloseWhatsAppModal = useCallback(() => {
        setWhatsAppModalOpen(false);
        setSelectedWhatsApp(null);
    }, []);

    const handleOpenQrModal = whatsApp => {
        setSelectedWhatsApp(whatsApp);
        setQrModalOpen(true);
    };

    const handleCloseQrModal = useCallback(() => {
        setSelectedWhatsApp(null);
        setQrModalOpen(false);
    }, []);

    const handleEditWhatsApp = whatsApp => {
        // ✅ VERIFICAR O CANAL PARA ABRIR O MODAL CORRETO
        if (whatsApp.channel === 'facebook' || whatsApp.channel === 'instagram') {
            handleEditFacebook(whatsApp);
        } else {
            setSelectedWhatsApp(whatsApp);
            setWhatsAppModalOpen(true);
        }
    };

    const handleEditFacebook = (whatsApp) => {
        setSelectedFacebookConnection(whatsApp);
        setFacebookModalOpen(true);
    };

    const handleCloseFacebookModal = useCallback(() => {
        setFacebookModalOpen(false);
        setSelectedFacebookConnection(null);
    }, []);

    const handleOpenConfirmationModal = (action, whatsAppId) => {
        const whatsApp = whatsApps.find(w => w.id === whatsAppId);
        const channelName = whatsApp?.channel === 'instagram' ? 'Instagram' :
            whatsApp?.channel === 'facebook' ? 'Facebook' : 'WhatsApp';

        if (action === "disconnect") {
            setConfirmModalInfo({
                action: action,
                title: `Desconectar ${channelName}`,
                message: `Tem certeza que deseja desconectar esta sessão do ${channelName}?`,
                whatsAppId: whatsAppId,
            });
        }

        if (action === "delete") {
            setConfirmModalInfo({
                action: action,
                title: `Deletar Conexão ${channelName}`,
                message: `Tem certeza que deseja deletar esta conexão do ${channelName}? Esta ação não pode ser desfeita.`,
                whatsAppId: whatsAppId,
            });
        }
        if (action === "closedImported") {
            setConfirmModalInfo({
                action: action,
                title: "Fechar Tickets Importados",
                message: "Deseja fechar todos os tickets importados?",
                whatsAppId: whatsAppId,
            });
        }
        setConfirmModalOpen(true);
    };

    const handleSubmitConfirmationModal = async () => {
        const whatsApp = whatsApps.find(w => w.id === confirmModalInfo.whatsAppId);
        const channelName = whatsApp?.channel === 'instagram' ? 'Instagram' :
            whatsApp?.channel === 'facebook' ? 'Facebook' : 'WhatsApp';

        if (confirmModalInfo.action === "disconnect") {
            try {
                if (whatsApp?.channel === 'whatsapp') {
                    await api.delete(`/whatsappsession/${confirmModalInfo.whatsAppId}`);
                } else {
                    // Para Facebook/Instagram, pode ser necessário um endpoint diferente
                    await api.delete(`/whatsapp/${confirmModalInfo.whatsAppId}`);
                }
                toast.success(`Sessão do ${channelName} desconectada com sucesso!`);
            } catch (err) {
                toastError(err);
            }
        }

        if (confirmModalInfo.action === "delete") {
            try {
                if (whatsApp?.channel === 'whatsapp') {
                    await api.delete(`/whatsapp/${confirmModalInfo.whatsAppId}`);
                } else {
                    await api.delete(`/whatsapp/${confirmModalInfo.whatsAppId}`);
                }
                toast.success(`Conexão do ${channelName} deletada com sucesso!`);
            } catch (err) {
                toastError(err);
            }
        }

        if (confirmModalInfo.action === "closedImported") {
            try {
                await api.post(`/closedimported/${confirmModalInfo.whatsAppId}`);
                toast.success("Tickets fechados com sucesso!");
            } catch (err) {
                toastError(err);
            }
        }

        setConfirmModalInfo(confirmationModalInitialState);
        setConfirmModalOpen(false);
    };

    const renderImportButton = (whatsApp) => {
        if (whatsApp?.statusImportMessages === "renderButtonCloseTickets") {
            return (
                <Button
                    style={{ marginLeft: 8 }}
                    size="small"
                    variant="outlined"
                    color="primary"
                    onClick={() => {
                        handleOpenConfirmationModal("closedImported", whatsApp.id);
                    }}
                >
                    Fechar Importados
                </Button>
            );
        }

        if (whatsApp?.importOldMessages) {
            let isTimeStamp = !isNaN(
                new Date(Math.floor(whatsApp?.statusImportMessages)).getTime()
            );

            if (isTimeStamp) {
                const ultimoStatus = new Date(
                    Math.floor(whatsApp?.statusImportMessages)
                ).getTime();
                const dataLimite = +add(ultimoStatus, { seconds: +35 }).getTime();
                if (dataLimite > new Date().getTime()) {
                    return (
                        <Button
                            disabled
                            style={{ marginLeft: 8 }}
                            size="small"
                            endIcon={
                                <CircularProgress
                                    size={12}
                                    className={classes.buttonProgress}
                                />
                            }
                            variant="outlined"
                            color="primary"
                        >
                            Preparando...
                        </Button>
                    );
                }
            }
        }
    };

    const renderActionButtons = whatsApp => {
        return (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                {/* WhatsApp specific actions */}
                {whatsApp.channel === 'whatsapp' && (
                    <>
                        {whatsApp.status === "qrcode" && (
                            <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                onClick={() => handleOpenQrModal(whatsApp)}
                            >
                                QR Code
                            </Button>
                        )}
                        {whatsApp.status === "DISCONNECTED" && (
                            <>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    onClick={() => handleStartWhatsAppSession(whatsApp.id)}
                                >
                                    Reconectar
                                </Button>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="secondary"
                                    onClick={() => handleRequestNewQrCode(whatsApp.id)}
                                >
                                    Novo QR
                                </Button>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    onClick={handleInstagramLogin} // ✅ USA A MESMA FUNÇÃO COM POPUP
                                    startIcon={<Instagram />}
                                >
                                    Reconectar Instagram
                                </Button>
                            </>
                        )}
                        {(whatsApp.status === "CONNECTED" ||
                            whatsApp.status === "PAIRING" ||
                            whatsApp.status === "TIMEOUT") && (
                                <>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="secondary"
                                        onClick={() => {
                                            handleOpenConfirmationModal("disconnect", whatsApp.id);
                                        }}
                                    >
                                        Desconectar
                                    </Button>
                                    {renderImportButton(whatsApp)}
                                </>
                            )}
                        {whatsApp.status === "OPENING" && (
                            <Button size="small" variant="outlined" disabled color="default">
                                Conectando...
                            </Button>
                        )}
                    </>
                )}
                {whatsApp.channel === 'instagram' && (
                    <>
                        {whatsApp.status === "DISCONNECTED" && (
                            <Button
                                size="small"
                                variant="outlined"
                                color="primary"
                                onClick={handleInstagramLogin} // ✅ USA A MESMA FUNÇÃO COM POPUP
                                startIcon={<Instagram />}
                            >
                                Reconectar Instagram
                            </Button>
                        )}
                        {whatsApp.status === "CONNECTED" && (
                            <Button
                                size="small"
                                variant="outlined"
                                color="secondary"
                                onClick={() => {
                                    handleOpenConfirmationModal("disconnect", whatsApp.id);
                                }}
                            >
                                Desconectar
                            </Button>
                        )}
                        {whatsApp.status === "OPENING" && (
                            <Button size="small" variant="outlined" disabled color="default">
                                Conectando...
                            </Button>
                        )}
                    </>
                )}

                {/* Facebook specific actions */}
                {whatsApp.channel === 'facebook' && (user.super === true || enabledFeatures.meta_connections || enabledFeatures.facebook_connection) &&
                    (
                        <>
                            {whatsApp.status === "DISCONNECTED" && (
                                <FacebookLogin
                                    appId={process.env.REACT_APP_FACEBOOK_APP_ID}
                                    autoLoad={false}
                                    fields="name,email,picture"
                                    version="9.0"
                                    scope="public_profile,pages_messaging,pages_show_list,pages_manage_metadata,pages_read_engagement,business_management"  // ← SEMPRE INCLUIR business_management
                                    callback={responseFacebook}
                                    render={(renderProps) => (
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color="primary"
                                            onClick={renderProps.onClick}
                                            startIcon={<Facebook />}
                                        >
                                            Reconectar Facebook
                                        </Button>
                                    )}
                                />
                            )}
                            {whatsApp.status === "CONNECTED" && (
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="secondary"
                                    onClick={() => {
                                        handleOpenConfirmationModal("disconnect", whatsApp.id);
                                    }}
                                >
                                    Desconectar
                                </Button>
                            )}
                            {whatsApp.status === "OPENING" && (
                                <Button size="small" variant="outlined" disabled color="default">
                                    Conectando...
                                </Button>
                            )}
                        </>
                    )}
            </div>
        );
    };

    const renderStatusToolTips = whatsApp => {
        const getStatusText = (status, channel) => {
            if (channel === 'facebook' || channel === 'instagram') {
                switch (status) {
                    case "CONNECTED":
                        return "Conectado";
                    case "DISCONNECTED":
                        return "Desconectado";
                    case "OPENING":
                        return "Conectando";
                    default:
                        return status;
                }
            }

            // WhatsApp status
            switch (status) {
                case "CONNECTED":
                    return "Conectado";
                case "DISCONNECTED":
                    return "Desconectado";
                case "OPENING":
                    return "Conectando";
                case "qrcode":
                    return "Aguardando QR";
                case "TIMEOUT":
                    return "Timeout";
                case "PAIRING":
                    return "Pareando";
                default:
                    return status;
            }
        };

        return (
            <div className={classes.statusIcon}>
                {whatsApp.status === "DISCONNECTED" && (
                    <CustomToolTip
                        title="Desconectado"
                        content={`A conexão ${whatsApp.channel} está desconectada`}
                    >
                        <SignalCellularConnectedNoInternet0Bar color="error" />
                    </CustomToolTip>
                )}
                {whatsApp.status === "OPENING" && (
                    <CircularProgress size={20} className={classes.buttonProgress} />
                )}
                {whatsApp.status === "qrcode" && whatsApp.channel === 'whatsapp' && (
                    <CustomToolTip
                        title="QR Code"
                        content="Escaneie o QR Code para conectar"
                    >
                        <CropFree color="action" />
                    </CustomToolTip>
                )}
                {whatsApp.status === "CONNECTED" && (
                    <CustomToolTip title="Conectado">
                        <SignalCellular4Bar style={{ color: green[500] }} />
                    </CustomToolTip>
                )}
                {(whatsApp.status === "TIMEOUT" || whatsApp.status === "PAIRING") && whatsApp.channel === 'whatsapp' && (
                    <CustomToolTip
                        title="Instável"
                        content="Conexão instável ou em processo de pareamento"
                    >
                        <SignalCellularConnectedNoInternet2Bar color="secondary" />
                    </CustomToolTip>
                )}
                <Typography variant="caption" style={{ marginLeft: 4 }}>
                    {getStatusText(whatsApp.status, whatsApp.channel)}
                </Typography>
            </div>
        );
    };

    const restartWhatsapps = async () => {
        try {
            await api.post(`/whatsapp-restart/`);
            toast.success("Reiniciando conexões...");
        } catch (err) {
            toastError(err);
        }
    }

    // // ✅ SE ESTAMOS PROCESSANDO CALLBACK DO INSTAGRAM, MOSTRAR LOADING
    // if (window.location.pathname === '/instagram/callback') {
    //     return (
    //         <MainContainer>
    //             <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="100vh" gap={2}>
    //                 <CircularProgress size={60} />
    //                 <Typography variant="h6">Processando conexão com Instagram Business...</Typography>
    //                 <Typography variant="body2" color="textSecondary">Aguarde enquanto configuramos sua conta</Typography>
    //             </Box>
    //         </MainContainer>
    //     );
    // }

    return (
        <MainContainer>
            <FacebookModal
                open={facebookModalOpen}
                onClose={handleCloseFacebookModal}
                facebookConnection={selectedFacebookConnection}
            />
            <ConfirmationModal
                title={confirmModalInfo.title}
                open={confirmModalOpen}
                onClose={() => setConfirmModalOpen(false)}
                onConfirm={handleSubmitConfirmationModal}
            >
                {confirmModalInfo.message}
            </ConfirmationModal>
            {qrModalOpen && (
                <QrcodeModal
                    open={qrModalOpen}
                    onClose={handleCloseQrModal}
                    whatsAppId={!whatsAppModalOpen && selectedWhatsApp?.id}
                />
            )}
            <WhatsAppModal
                open={whatsAppModalOpen}
                onClose={handleCloseWhatsAppModal}
                whatsAppId={!qrModalOpen && selectedWhatsApp?.id}
            />

            {user.profile === "user" && user.allowConnections === "disabled" ?
                <ForbiddenPage />
                :
                <>
                    <MainHeader>
                        <Title>Conexões ({whatsApps.length})</Title>
                        <MainHeaderButtonsWrapper>
                            <div className={classes.headerButtons}>
                                <Button
                                    variant="contained"
                                    color="secondary"
                                    onClick={restartWhatsapps}
                                    size="small"
                                >
                                    Reiniciar Conexões
                                </Button>

                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={() => openInNewTab(`https://wa.me/${process.env.REACT_APP_NUMBER_SUPPORT}`)}
                                    startIcon={<WhatsApp />}
                                    size="small"
                                >
                                    Suporte
                                </Button>
                                <Can
                                    role={user.profile}
                                    perform="connections-page:addConnection"
                                    yes={() => (
                                        <>
                                            <Button
                                                variant="contained"
                                                className={classes.newConnectionButton}
                                                onClick={handleOpenMenu}
                                                size="small"
                                            >
                                                Nova Conexão
                                            </Button>
                                            <Menu
                                                anchorEl={anchorEl}
                                                open={isMenuOpen}
                                                onClose={handleCloseMenu}
                                            >
                                                {/* WHATSAPP */}
                                                <MenuItem
                                                    onClick={() => {
                                                        handleOpenWhatsAppModal();
                                                        handleCloseMenu();
                                                    }}
                                                >
                                                    <WhatsApp
                                                        fontSize="small"
                                                        style={{
                                                            marginRight: "10px",
                                                            color: "#25D366",
                                                        }}
                                                    />
                                                    WhatsApp
                                                </MenuItem>

                                                {/* FACEBOOK */}
                                                {(user.super === true || enabledFeatures.meta_connections || enabledFeatures.facebook_connection) && (
                                                    <FacebookLogin
                                                        appId={process.env.REACT_APP_FACEBOOK_APP_ID}
                                                        autoLoad={false}
                                                        fields="name,email,picture"
                                                        version="9.0"
                                                        scope="public_profile,pages_messaging,pages_show_list,pages_manage_metadata,pages_read_engagement,business_management"
                                                        callback={responseFacebook}
                                                        render={(renderProps) => (
                                                            <MenuItem
                                                                onClick={() => {
                                                                    renderProps.onClick();
                                                                    handleCloseMenu();
                                                                }}
                                                            >
                                                                <Facebook
                                                                    fontSize="small"
                                                                    style={{
                                                                        marginRight: "10px",
                                                                        color: "#1877f2",
                                                                    }}
                                                                />
                                                                Facebook
                                                            </MenuItem>
                                                        )}
                                                    />
                                                )}

                                                {/* INSTAGRAM */}
                                                {(user.super === true || enabledFeatures.meta_connections || enabledFeatures.instagram_connection) && (
                                                    <MenuItem
                                                        onClick={() => {
                                                            handleInstagramLogin();
                                                            handleCloseMenu();
                                                        }}
                                                    >
                                                        <Instagram
                                                            fontSize="small"
                                                            style={{
                                                                marginRight: "10px",
                                                                color: "#E4405F",
                                                            }}
                                                        />
                                                        Instagram
                                                    </MenuItem>
                                                )}
                                            </Menu>
                                        </>
                                    )}
                                />
                            </div>
                        </MainHeaderButtonsWrapper>
                    </MainHeader>

                    {statusImport?.all && (
                        <div style={{ margin: "16px 0" }}>
                            <Card>
                                <CardContent>
                                    <Typography component="h6" variant="h6" gutterBottom>
                                        {statusImport?.this === -1 ? "Preparando importação..." : "Importando mensagens..."}
                                    </Typography>
                                    {statusImport?.this === -1 ? (
                                        <Box display="flex" justifyContent="center">
                                            <CircularProgress size={24} />
                                        </Box>
                                    ) : (
                                        <>
                                            <Typography variant="body2" align="center" gutterBottom>
                                                {`Processadas ${statusImport?.this} de ${statusImport?.all} - Data: ${statusImport?.date}`}
                                            </Typography>
                                            <Box display="flex" justifyContent="center">
                                                <CircularProgressWithLabel
                                                    value={(statusImport?.this / statusImport?.all) * 100}
                                                />
                                            </Box>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    <Paper className={classes.mainPaper} variant="outlined">
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell align="center"><strong>Canal</strong></TableCell>
                                    <TableCell align="center"><strong>Nome</strong></TableCell>
                                    <TableCell align="center"><strong>Número</strong></TableCell>
                                    <TableCell align="center"><strong>Status</strong></TableCell>
                                    <Can
                                        role={user.profile}
                                        perform="connections-page:actionButtons"
                                        yes={() => (
                                            <TableCell align="center"><strong>Ações</strong></TableCell>
                                        )}
                                    />
                                    <TableCell align="center"><strong>Última Atualização</strong></TableCell>
                                    <TableCell align="center"><strong>Padrão</strong></TableCell>
                                    <Can
                                        role={user.profile}
                                        perform="connections-page:editOrDeleteConnection"
                                        yes={() => (
                                            <TableCell align="center"><strong>Editar</strong></TableCell>
                                        )}
                                    />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRowSkeleton />
                                ) : (
                                    <>
                                        {whatsApps?.length > 0 ? (
                                            whatsApps.map(whatsApp => (
                                                <TableRow key={whatsApp.id} hover>
                                                    <TableCell align="center" className={classes.channelIcon}>
                                                        {IconChannel(whatsApp.channel)}
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Typography variant="body2">
                                                            {whatsApp.name}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        <Typography variant="body2">
                                                            {whatsApp.number && whatsApp.channel === 'whatsapp'
                                                                ? formatSerializedId(whatsApp.number)
                                                                : whatsApp.number || "-"
                                                            }
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        {renderStatusToolTips(whatsApp)}
                                                    </TableCell>
                                                    <Can
                                                        role={user.profile}
                                                        perform="connections-page:actionButtons"
                                                        yes={() => (
                                                            <TableCell align="center">
                                                                {renderActionButtons(whatsApp)}
                                                            </TableCell>
                                                        )}
                                                    />
                                                    <TableCell align="center">
                                                        <Typography variant="body2">
                                                            {format(parseISO(whatsApp.updatedAt), "dd/MM/yy HH:mm")}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell align="center">
                                                        {whatsApp.isDefault && (
                                                            <CheckCircle style={{ color: green[500] }} />
                                                        )}
                                                    </TableCell>
                                                    <Can
                                                        role={user.profile}
                                                        perform="connections-page:editOrDeleteConnection"
                                                        yes={() => (
                                                            <TableCell align="center">
                                                                <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => handleEditWhatsApp(whatsApp)}
                                                                        title="Editar"
                                                                    >
                                                                        <Edit />
                                                                    </IconButton>
                                                                    <IconButton
                                                                        size="small"
                                                                        onClick={() => handleOpenConfirmationModal("delete", whatsApp.id)}
                                                                        title="Deletar"
                                                                        color="secondary"
                                                                    >
                                                                        <DeleteOutline />
                                                                    </IconButton>
                                                                </div>
                                                            </TableCell>
                                                        )}
                                                    />
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={8} align="center">
                                                    <Typography variant="body2" color="textSecondary">
                                                        Nenhuma conexão encontrada
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </>
                                )}
                            </TableBody>
                        </Table>
                    </Paper>
                </>
            }
        </MainContainer>
    );
};

export default Connections;