import React, { useState, useEffect } from "react";
import {
    Paper, Box, Button, Typography, Collapse, IconButton, Chip, Tooltip
} from "@material-ui/core";
import { ExpandMore, ExpandLess, Edit, FileCopy, Delete, PictureAsPdf } from "@material-ui/icons";
import { makeStyles } from "@material-ui/core/styles";
import ActionPlanModal from "./ActionPlanModal";
import api from "../../services/api";
import { toast } from "react-toastify";
import jsPDF from "jspdf";

const useStyles = makeStyles({
    actionPlanRoot: {
        background: "#f5f9fd",
        padding: 24,
        minHeight: 400
    },
    actionPlanGrid: {
        display: "flex",
        flexDirection: "column",
        gap: 24
    },
    actionPlanCard: {
        background: "#fff",
        borderRadius: 12,
        boxShadow: "0 2px 8px #0001",
        padding: 16,
        transition: "box-shadow 0.2s",
        "&:hover": {
            boxShadow: "0 4px 16px #0002"
        }
    },
    actionPlanSubgrid: {
        marginTop: 16,
        background: "#eaf3fa",
        borderRadius: 8,
        padding: 12,
        width: "100%",
        boxSizing: "border-box",
        overflowX: "auto" // Adicione para evitar quebra em telas pequenas
    },
    subgridHeader: {
        display: "grid",
        gridTemplateColumns: "repeat(8, 1fr)", // 8 colunas!
        gap: 0,
        fontSize: "0.95em",
        fontWeight: "bold",
        color: "#1976d2",
        borderBottom: "2px solid #b3c6e0",
        background: "#eaf3fa",
        width: "100%"
    },
    subgridRow: {
        display: "grid",
        gridTemplateColumns: "repeat(8, 1fr)", // 8 colunas!
        gap: 0,
        fontSize: "0.95em",
        borderBottom: "1px solid #b3c6e0",
        alignItems: "center",
        width: "100%" // Adicione isso
    },
    subgridCell: {
        borderRight: "1px solid #b3c6e0",
        padding: "12px 8px",
        textAlign: "center",
        minHeight: 48,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexWrap: "wrap",
        boxSizing: "border-box"
    },
    lastCell: {
        borderRight: "none"
    }
});

const statusColors = {
    feito: "primary",
    fazendo: "default",
    atrasado: "secondary"
};

const ActionPlan = () => {
    const classes = useStyles();
    const [plans, setPlans] = useState([]);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState(null);
    const [expanded, setExpanded] = useState({});

    // Carregar funcionários e planos de ação
    useEffect(() => {
        fetchEmployees();
        fetchPlans();
    }, []);

    const fetchEmployees = async () => {
        try {
            const { data } = await api.get("/employees");
            setEmployees(data.employees || []);
        } catch {
            toast.error("Erro ao carregar funcionários");
        }
    };

    const fetchPlans = async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/action-plans");
            setPlans(data.plans || []);
        } catch {
            toast.error("Erro ao carregar planos de ação");
        }
        setLoading(false);
    };

    const handleExpand = id => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleSave = async (plan) => {
        try {
            if (editingPlan) {
                await api.put(`/action-plans/${editingPlan.id}`, plan);
                toast.success("Plano atualizado!");
            } else {
                await api.post("/action-plans", plan);
                toast.success("Plano criado!");
            }
            fetchPlans();
        } catch {
            toast.error("Erro ao salvar plano");
        }
        setEditingPlan(null);
        setModalOpen(false);
    };

    const handleEdit = (plan) => {
        setEditingPlan(plan);
        setModalOpen(true);
    };

    const handleDuplicate = async (plan) => {
        try {
            const newPlan = {
                ...plan,
                id: undefined,
                acao: plan.acao + " (Cópia)"
            };
            await api.post("/action-plans", newPlan);
            toast.success("Plano duplicado!");
            fetchPlans();
        } catch {
            toast.error("Erro ao duplicar plano");
        }
    };

    const handleDelete = async (planId) => {
        try {
            await api.delete(`/action-plans/${planId}`);
            toast.success("Plano excluído!");
            fetchPlans();
        } catch {
            toast.error("Erro ao excluir plano");
        }
    };

    const handleExportarPdf = (plan) => {
        const doc = new jsPDF("l", "mm", "a4");
        const startX = 10;
        const pageWidth = 297;
        const headerY = 18;
        const headerLineY = 22;
        const titleY = 34;
        const infoStartY = 44;
        const tableStartY = 65;
        const footerY = 205;

        // Função para desenhar o header
        const drawHeader = () => {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(26);
            doc.setTextColor(25, 118, 210);
            doc.text("Meta Zap Pro", pageWidth / 2, headerY, { align: "center" });

            doc.setDrawColor(25, 118, 210);
            doc.setLineWidth(1.5);
            doc.line(startX, headerLineY, 275, headerLineY);

            doc.setFont("helvetica", "bold");
            doc.setFontSize(18);
            doc.setTextColor(0, 0, 0);
            doc.text(`Plano de Ação 5W2H`, pageWidth / 2, titleY, { align: "center" });

            // Dados principais
            doc.setFontSize(13);
            doc.setFont("helvetica", "normal");
            doc.text("Plano:", startX, infoStartY);
            doc.setFont("helvetica", "bold");
            doc.text(`${plan.acao}`, startX + 30, infoStartY);

            doc.setFont("helvetica", "normal");
            doc.text("Motivo:", startX, infoStartY + 6);
            doc.setFont("helvetica", "bold");
            doc.text(`${plan.motivo || ""}`, startX + 30, infoStartY + 6);

            doc.setFont("helvetica", "normal");
            doc.text("Meta:", startX, infoStartY + 12);
            doc.setFont("helvetica", "bold");
            doc.text(`${plan.meta || ""}`, startX + 30, infoStartY + 12);
        };

        // Função para desenhar o footer
        const drawFooter = (dataHora, pageCount) => {
            const currentYear = new Date().getFullYear();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(10);
                doc.setTextColor(150);
                doc.text(
                    `Todos os Direitos Reservados Meta Zap Pro ${currentYear} | Gerado em: ${dataHora} | Página ${i} de ${pageCount}`,
                    pageWidth / 2,
                    footerY,
                    { align: "center" }
                );
            }
        };

        // Cabeçalho da tabela
        const drawTableHeader = (y) => {
            const columns = [
                { label: "O que?", color: [255, 235, 156], key: "oque" },
                { label: "Por quê?", color: [255, 199, 206], key: "porque" },
                { label: "Onde?", color: [189, 215, 238], key: "onde" },
                { label: "Quem?", color: [221, 217, 243], key: "quem" },
                { label: "Quando?", color: [218, 238, 243], key: "quando" },
                { label: "Como?", color: [234, 209, 220], key: "como" },
                { label: "Custo?", color: [197, 224, 180], key: "quanto" },
                { label: "Status", color: [242, 242, 242], key: "status" },
                { label: "Observações", color: [230, 240, 255], key: "observacoes" }
            ];
            const colWidths = [32, 32, 32, 32, 32, 32, 28, 24, 40];
            let x = startX;
            doc.setFontSize(12);
            doc.setFont("helvetica", "bold");
            columns.forEach((col, i) => {
                doc.setFillColor(...col.color);
                doc.rect(x, y, colWidths[i], 11, "F");
                doc.setDrawColor(200, 200, 200);
                doc.setLineWidth(0.4);
                doc.rect(x, y, colWidths[i], 11);
                doc.setTextColor(60, 60, 60);
                doc.text(col.label, x + 2, y + 8);
                x += colWidths[i];
            });
            return y + 11;
        };

        // --- INÍCIO DA GERAÇÃO DO PDF ---
        drawHeader();

        const columns = [
            { label: "O que?", color: [255, 235, 156], key: "oque" },
            { label: "Por quê?", color: [255, 199, 206], key: "porque" },
            { label: "Onde?", color: [189, 215, 238], key: "onde" },
            { label: "Quem?", color: [221, 217, 243], key: "quem" },
            { label: "Quando?", color: [218, 238, 243], key: "quando" },
            { label: "Como?", color: [234, 209, 220], key: "como" },
            { label: "Custo?", color: [197, 224, 180], key: "quanto" },
            { label: "Status", color: [242, 242, 242], key: "status" },
            { label: "Observações", color: [230, 240, 255], key: "observacoes" }
        ];
        const colWidths = [32, 32, 32, 32, 32, 32, 28, 24, 40];
        const lineSpacing = 5;
        let y = tableStartY;
        y = drawTableHeader(y);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        const marginBottom = 205;
        const tableBottomMargin = 10;

        (plan.metas || []).forEach((meta, idx) => {
            let cellContents = [];
            let maxLines = 1;

            const statusOptions = [
                { value: "afazer", label: "A Fazer" },
                { value: "fazendo", label: "Fazendo" },
                { value: "feito", label: "Feito" },
                { value: "atrasado", label: "Atrasado" }
            ];
            const statusMap = Object.fromEntries(statusOptions.map(opt => [opt.value.toLowerCase(), opt.label]));
            
            columns.forEach((col, i) => {
                let value = meta[col.key] || "";
                if (col.key === "quando" && value) {
                    value = new Date(value).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                    });
                }
                if (col.key === "quem" && Array.isArray(meta.quem)) {
                    value = meta.quem.join(", ");
                }
                if (col.key === "status" && value) {
                    const normalized = String(value).toLowerCase().replace(/\s/g, "");
                    value = statusMap[normalized] || (String(value).charAt(0).toUpperCase() + String(value).slice(1));
                }
                const lines = doc.splitTextToSize(String(value), colWidths[i] - 4);
                cellContents.push(lines.length ? lines : [" "]);
                if (lines.length > maxLines) maxLines = lines.length;
            });

            const rowHeight = lineSpacing * maxLines + 6;

            // CHECA SE A PRÓXIMA LINHA ULTRAPASSA O RODAPÉ
            if (y + rowHeight + tableBottomMargin > marginBottom) {
                doc.addPage("l", "a4");
                drawHeader();
                y = tableStartY;
                y = drawTableHeader(y);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(12);
            }

            if (idx % 2 === 1) {
                doc.setFillColor(245, 245, 245);
                doc.rect(startX, y, colWidths.reduce((a, b) => a + b, 0), rowHeight, "F");
            }

            let cellX = startX;
            columns.forEach((col, i) => {
                cellContents[i].forEach((line, lidx) => {
                    doc.text(line, cellX + 2, y + 7 + lidx * lineSpacing);
                });
                doc.setDrawColor(200, 200, 200);
                doc.setLineWidth(0.4);
                doc.rect(cellX, y, colWidths[i], rowHeight);
                cellX += colWidths[i];
            });

            y += rowHeight;
        });

        // Espaço extra no final da tabela
        y += 8;

        // Footer com data/hora e número da página
        const now = new Date();
        const dataHora = now.toLocaleString("pt-BR");
        const pageCount = doc.internal.getNumberOfPages();
        drawFooter(dataHora, pageCount);

        doc.save(`Plano_${plan.acao.replace(/\s+/g, "_")}.pdf`);
    };

    return (
        <Paper className={classes.actionPlanRoot}>
            <Box p={2} display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h5">Planos de Ação 5W2H</Typography>
                <Button variant="contained" color="primary" onClick={() => { setEditingPlan(null); setModalOpen(true); }}>
                    Novo Plano de Ação
                </Button>
            </Box>
            <div className={classes.actionPlanGrid}>
                {loading ? (
                    <Typography align="center">Carregando...</Typography>
                ) : plans.length === 0 ? (
                    <Typography align="center">Nenhum plano cadastrado</Typography>
                ) : (
                    plans.map(plan => (
                        <Box key={plan.id} className={classes.actionPlanCard}>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                                <Box>
                                    <Typography variant="h6">{plan.acao}</Typography>
                                    <Typography variant="body2" color="textSecondary">{plan.motivo}</Typography>
                                    <Typography variant="body2"><b>Meta:</b> {plan.meta}</Typography>
                                </Box>
                                <Box>
                                    <IconButton onClick={() => handleExpand(plan.id)}>
                                        {expanded[plan.id] ? <ExpandLess /> : <ExpandMore />}
                                    </IconButton>
                                    <Tooltip title="Editar"><IconButton onClick={() => handleEdit(plan)}><Edit /></IconButton></Tooltip>
                                    <Tooltip title="Duplicar"><IconButton onClick={() => handleDuplicate(plan)}><FileCopy /></IconButton></Tooltip>
                                    <Tooltip title="Excluir"><IconButton onClick={() => handleDelete(plan.id)}><Delete /></IconButton></Tooltip>
                                    <Tooltip title="Exportar PDF"><IconButton onClick={() => handleExportarPdf(plan)}><PictureAsPdf /></IconButton></Tooltip>
                                </Box>
                            </Box>
                            <Collapse in={expanded[plan.id]}>
                                <Box className={classes.actionPlanSubgrid}>
                                    <Box className={classes.subgridHeader}>
                                        <span className={classes.subgridCell}>O que?</span>
                                        <span className={classes.subgridCell}>Por quê?</span>
                                        <span className={classes.subgridCell}>Onde?</span>
                                        <span className={classes.subgridCell}>Quem?</span>
                                        <span className={classes.subgridCell}>Quando?</span>
                                        <span className={classes.subgridCell}>Como?</span>
                                        <span className={classes.subgridCell}>Quanto Custa?</span>
                                        <span className={classes.subgridCell}>Status</span>
                                    </Box>
                                    {(plan.metas || []).map(meta => (
                                        <Box key={meta.id} className={classes.subgridRow}>
                                            <span className={classes.subgridCell}>{meta.oque}</span>
                                            <span className={classes.subgridCell}>{meta.porque}</span>
                                            <span className={classes.subgridCell}>{meta.onde}</span>
                                            <span className={classes.subgridCell}>
                                                {Array.isArray(meta.quem)
                                                    ? meta.quem.map((nome, idx) => (
                                                        <Chip
                                                            key={idx}
                                                            label={nome}
                                                            size="small"
                                                            style={{ marginRight: 4, marginBottom: 2 }}
                                                            color="primary"
                                                            variant="outlined"
                                                        />
                                                    ))
                                                    : (
                                                        <Chip
                                                            label={meta.quem}
                                                            size="small"
                                                            color="primary"
                                                            variant="outlined"
                                                        />
                                                    )
                                                }
                                            </span>
                                            <span className={classes.subgridCell}>
                                                {meta.quando
                                                    ? new Date(meta.quando).toLocaleString("pt-BR", {
                                                        day: "2-digit",
                                                        month: "2-digit",
                                                        year: "numeric",
                                                        hour: "2-digit",
                                                        minute: "2-digit"
                                                    })
                                                    : ""}
                                            </span>
                                            <span className={classes.subgridCell}>{meta.como}</span>
                                            <span className={classes.subgridCell}>{meta.quanto}</span>
                                            <span className={classes.subgridCell}>
                                                <Chip label={
                                                    meta.status === "afazer" || meta.status === "a fazer" || meta.status === "A Fazer"
                                                        ? "A Fazer"
                                                        : meta.status
                                                } color={statusColors[meta.status]} size="small" />
                                            </span>
                                        </Box>
                                    ))}
                                </Box>
                            </Collapse>
                        </Box>
                    ))
                )}
            </div>
            <ActionPlanModal
                open={modalOpen}
                onClose={() => { setModalOpen(false); setEditingPlan(null); }}
                onSave={handleSave}
                initialData={editingPlan}
                employees={employees}
            />
        </Paper>
    );
};

export default ActionPlan;