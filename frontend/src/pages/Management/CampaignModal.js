import React from "react";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  CircularProgress,
  Grid
} from "@material-ui/core";
import { toast } from "react-toastify";
import { format } from "date-fns";

import api from "../../services/api";

const CampaignSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, "Nome muito curto")
    .required("Nome é obrigatório"),
  description: Yup.string(),
  startDate: Yup.date().required("Data de início é obrigatória"),
  endDate: Yup.date()
    .min(Yup.ref('startDate'), "Data de término deve ser posterior à data de início")
    .required("Data de término é obrigatória"),
  status: Yup.boolean()
});

const CampaignModal = ({ open, onClose, campaignData, onSave }) => {
  const initialValues = {
    name: campaignData?.name || "",
    description: campaignData?.description || "",
    startDate: campaignData?.startDate 
      ? format(new Date(campaignData.startDate), "yyyy-MM-dd") 
      : format(new Date(), "yyyy-MM-dd"),
    endDate: campaignData?.endDate 
      ? format(new Date(campaignData.endDate), "yyyy-MM-dd") 
      : format(new Date(new Date().setMonth(new Date().getMonth() + 1)), "yyyy-MM-dd"),
    status: campaignData?.status !== undefined ? campaignData.status : true
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      if (campaignData) {
        // Atualizar campanha existente
        await api.put(`/performance-campaigns/${campaignData.id}`, values);
        toast.success("Campanha atualizada com sucesso!");
      } else {
        // Criar nova campanha
        await api.post("/performance-campaigns", values);
        toast.success("Campanha criada com sucesso!");
      }
      
      if (onSave) onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || "Erro ao salvar campanha");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {campaignData ? "Editar Campanha" : "Nova Campanha"}
      </DialogTitle>
      <Formik
        initialValues={initialValues}
        validationSchema={CampaignSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting, values, errors, touched, handleChange }) => (
          <Form>
            <DialogContent>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Field
                    as={TextField}
                    name="name"
                    label="Nome da Campanha"
                    fullWidth
                    variant="outlined"
                    error={touched.name && Boolean(errors.name)}
                    helperText={touched.name && errors.name}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Field
                    as={TextField}
                    name="description"
                    label="Descrição"
                    fullWidth
                    multiline
                    rows={3}
                    variant="outlined"
                    error={touched.description && Boolean(errors.description)}
                    helperText={touched.description && errors.description}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Field
                    as={TextField}
                    name="startDate"
                    label="Data de Início"
                    type="date"
                    fullWidth
                    variant="outlined"
                    InputLabelProps={{
                      shrink: true,
                    }}
                    error={touched.startDate && Boolean(errors.startDate)}
                    helperText={touched.startDate && errors.startDate}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Field
                    as={TextField}
                    name="endDate"
                    label="Data de Término"
                    type="date"
                    fullWidth
                    variant="outlined"
                    InputLabelProps={{
                      shrink: true,
                    }}
                    error={touched.endDate && Boolean(errors.endDate)}
                    helperText={touched.endDate && errors.endDate}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={values.status}
                        onChange={handleChange}
                        name="status"
                        color="primary"
                      />
                    }
                    label="Ativo"
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={onClose} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button
                type="submit"
                color="primary"
                variant="contained"
                disabled={isSubmitting}
                startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
              >
                {isSubmitting ? "Salvando..." : "Salvar"}
              </Button>
            </DialogActions>
          </Form>
        )}
      </Formik>
    </Dialog>
  );
};

export default CampaignModal;