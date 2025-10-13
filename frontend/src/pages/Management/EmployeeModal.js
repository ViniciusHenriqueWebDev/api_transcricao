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
import api from "../../services/api";

const EmployeeSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, "Nome muito curto")
    .required("Nome é obrigatório"),
  email: Yup.string()
    .email("Email inválido")
    .required("Email é obrigatório"),
  phone: Yup.string(),
  position: Yup.string(),
  department: Yup.string(),
  status: Yup.boolean()
});

const EmployeeModal = ({ open, onClose, employeeData, onSave }) => {
  const initialValues = {
    name: employeeData?.name || "",
    email: employeeData?.email || "",
    phone: employeeData?.phone || "",
    position: employeeData?.position || "",
    department: employeeData?.department || "",
    status: employeeData?.status !== undefined ? employeeData.status : true
  };

  const handleSubmit = async (values, { setSubmitting }) => {
    try {
      if (employeeData) {
        // Atualizar funcionário existente
        await api.put(`/employees/${employeeData.id}`, values);
        toast.success("Funcionário atualizado com sucesso!");
      } else {
        // Criar novo funcionário
        await api.post("/employees", values);
        toast.success("Funcionário criado com sucesso!");
      }
      
      if (onSave) onSave();
    } catch (err) {
      toast.error(err.response?.data?.error || "Erro ao salvar funcionário");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {employeeData ? "Editar Funcionário" : "Novo Funcionário"}
      </DialogTitle>
      <Formik
        initialValues={initialValues}
        validationSchema={EmployeeSchema}
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
                    label="Nome"
                    fullWidth
                    variant="outlined"
                    error={touched.name && Boolean(errors.name)}
                    helperText={touched.name && errors.name}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Field
                    as={TextField}
                    name="email"
                    label="E-mail"
                    fullWidth
                    variant="outlined"
                    error={touched.email && Boolean(errors.email)}
                    helperText={touched.email && errors.email}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Field
                    as={TextField}
                    name="phone"
                    label="Telefone"
                    fullWidth
                    variant="outlined"
                    error={touched.phone && Boolean(errors.phone)}
                    helperText={touched.phone && errors.phone}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Field
                    as={TextField}
                    name="position"
                    label="Cargo"
                    fullWidth
                    variant="outlined"
                    error={touched.position && Boolean(errors.position)}
                    helperText={touched.position && errors.position}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Field
                    as={TextField}
                    name="department"
                    label="Departamento"
                    fullWidth
                    variant="outlined"
                    error={touched.department && Boolean(errors.department)}
                    helperText={touched.department && errors.department}
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

export default EmployeeModal;