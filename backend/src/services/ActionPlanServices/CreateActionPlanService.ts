import ActionPlan from "../../models/ActionPlan";

interface Meta {
  id: number;
  oque: string;
  porque: string;
  onde: string;
  quem: string;
  employeeId: number | string;
  quando: string;
  como: string;
  quanto: string;
  status: string;
}

interface ActionPlanData {
  acao: string;
  motivo: string;
  meta?: string;
  companyId: number;
  metas: Meta[];
}

const CreateActionPlanService = async (data: ActionPlanData) => {
  const metas = Array.isArray(data.metas) ? data.metas : [];
  const actionPlan = await ActionPlan.create({ ...data, metas });
  return actionPlan;
};

export default CreateActionPlanService;