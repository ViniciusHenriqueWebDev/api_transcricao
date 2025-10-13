import React, { useState, useEffect } from "react";
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, MenuItem, Select, InputLabel, FormControl, Box, IconButton, Typography, Grid
} from "@material-ui/core";
import { AddCircleOutline, RemoveCircleOutline } from "@material-ui/icons";

const statusOptions = [
    { value: "afazer", label: "A Fazer" },
    { value: "fazendo", label: "Fazendo" },
    { value: "feito", label: "Feito" },
    { value: "atrasado", label: "Atrasado" }
];

const emptyMeta = (employees) => ({
    id: Date.now() + Math.random(),
    oque: "",
    porque: "",
    onde: "",
    quem: employees[0] ? [employees[0].name] : [],
    employeeId: employees[0] ? [employees[0].id] : [],
    quando: "",
    como: "",
    quanto: "",
    status: "fazendo",
    observacoes: ""
});

const ActionPlanModal = ({ open, onClose, onSave, initialData, employees }) => {
    const [form, setForm] = useState({
        acao: "",
        motivo: "",
        meta: "",
        metas: [emptyMeta(employees)]
    });

    // Atualiza o form ao abrir para edição
    useEffect(() => {
        if (initialData) {
            setForm({
                acao: initialData.acao || "",
                motivo: initialData.motivo || "",
                meta: initialData.meta || "",
                metas: (initialData.metas && initialData.metas.length > 0)
                    ? initialData.metas.map(meta => ({
                        ...emptyMeta(employees),
                        ...meta
                    }))
                    : [emptyMeta(employees)]
            });
        } else {
            setForm({
                acao: "",
                motivo: "",
                meta: "",
                metas: [emptyMeta(employees)]
            });
        }
        // eslint-disable-next-line
    }, [initialData, employees]);

    const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

    const handleMetaChange = (idx, e) => {
        const metas = [...form.metas];
        if (e.target.name === "employeeId") {
            const selectedIds = Array.isArray(e.target.value) ? e.target.value : [e.target.value];
            metas[idx].employeeId = selectedIds;
            metas[idx].quem = employees.filter(emp => selectedIds.includes(emp.id)).map(emp => emp.name);
        } else {
            metas[idx][e.target.name] = e.target.value;
        }
        setForm({ ...form, metas });
    };

    const handleAddMeta = () => setForm({ ...form, metas: [...form.metas, emptyMeta(employees)] });
    const handleRemoveMeta = idx => {
        const metas = [...form.metas];
        metas.splice(idx, 1);
        setForm({ ...form, metas });
    };

    const handleSubmit = () => {
        // Remove campos extras dos metas antes de enviar
        const metas = form.metas.map(meta => ({
            id: meta.id,
            oque: meta.oque,
            porque: meta.porque,
            onde: meta.onde,
            quem: meta.quem,
            employeeId: meta.employeeId,
            quando: meta.quando,
            como: meta.como,
            quanto: meta.quanto,
            status: meta.status,
            observacoes: meta.observacoes || ""
        }));
        onSave({ ...form, metas });
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            <DialogTitle>{initialData ? "Editar Plano de Ação" : "Novo Plano de Ação"}</DialogTitle>
            <DialogContent>
                <Box mb={3}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={4}>
                            <TextField
                                name="acao"
                                label="Assunto/O que?"
                                value={form.acao}
                                onChange={handleChange}
                                fullWidth
                                required
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                name="motivo"
                                label="Por que?"
                                value={form.motivo}
                                onChange={handleChange}
                                fullWidth
                                required
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                name="meta"
                                label="Meta/Objetivo"
                                value={form.meta}
                                onChange={handleChange}
                                fullWidth
                            />
                        </Grid>
                    </Grid>
                </Box>
                <Typography variant="subtitle1" style={{ marginTop: 16, marginBottom: 8 }}>
                    Itens do Plano (5W2H)
                </Typography>
                {form.metas.map((meta, idx) => (
                    <Box key={meta.id} mb={2} p={2} border={1} borderColor="#e0e0e0" borderRadius={8} bgcolor="#f9f9fb">
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} md={2}>
                                <TextField
                                    name="oque"
                                    label="O que?"
                                    value={meta.oque}
                                    onChange={e => handleMetaChange(idx, e)}
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={12} md={2}>
                                <TextField
                                    name="porque"
                                    label="Por que?"
                                    value={meta.porque}
                                    onChange={e => handleMetaChange(idx, e)}
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={12} md={2}>
                                <TextField
                                    name="onde"
                                    label="Onde?"
                                    value={meta.onde}
                                    onChange={e => handleMetaChange(idx, e)}
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={12} md={2}>
                                <FormControl fullWidth>
                                    <InputLabel>Quem?</InputLabel>
                                    <Select
                                        name="employeeId"
                                        multiple
                                        value={meta.employeeId}
                                        onChange={e => handleMetaChange(idx, e)}
                                        renderValue={selected => employees.filter(emp => selected.includes(emp.id)).map(emp => emp.name).join(", ")}
                                    >
                                        {employees.map(emp => (
                                            <MenuItem key={emp.id} value={emp.id}>{emp.name}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={2}>
                                <TextField
                                    name="quando"
                                    label="Quando?"
                                    type="datetime-local"
                                    value={meta.quando}
                                    onChange={e => handleMetaChange(idx, e)}
                                    InputLabelProps={{ shrink: true }}
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={12} md={2}>
                                <TextField
                                    name="como"
                                    label="Como?"
                                    value={meta.como}
                                    onChange={e => handleMetaChange(idx, e)}
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={12} md={2}>
                                <TextField
                                    name="quanto"
                                    label="Quanto Custa?"
                                    value={meta.quanto}
                                    onChange={e => handleMetaChange(idx, e)}
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={12} md={2}>
                                <FormControl fullWidth>
                                    <InputLabel>Status</InputLabel>
                                    <Select
                                        name="status"
                                        value={meta.status}
                                        onChange={e => handleMetaChange(idx, e)}
                                    >
                                        {statusOptions.map(opt => (
                                            <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={2}>
                                <TextField
                                    name="observacoes"
                                    label="Observações"
                                    value={meta.observacoes || ""}
                                    onChange={e => handleMetaChange(idx, e)}
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={12} md={1}>
                                <Box display="flex" alignItems="center">
                                    <IconButton onClick={() => handleRemoveMeta(idx)} disabled={form.metas.length === 1}>
                                        <RemoveCircleOutline color={form.metas.length === 1 ? "disabled" : "secondary"} />
                                    </IconButton>
                                    {idx === form.metas.length - 1 && (
                                        <IconButton onClick={handleAddMeta}>
                                            <AddCircleOutline color="primary" />
                                        </IconButton>
                                    )}
                                </Box>
                            </Grid>
                        </Grid>
                    </Box>
                ))}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button onClick={handleSubmit} color="primary" variant="contained">Salvar</Button>
            </DialogActions>
        </Dialog>
    );
};

export default ActionPlanModal;