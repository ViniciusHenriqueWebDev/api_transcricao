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
  acao?: string;
  motivo?: string;
  meta?: string;
  metas?: Meta[];
}

const UpdateActionPlanService = async (
  id: number,
  companyId: number,
  data: ActionPlanData
) => {
  const actionPlan = await ActionPlan.findOne({ where: { id, companyId } });
  if (!actionPlan) {
    throw new Error("Plano de ação não encontrado");
  }
  await actionPlan.update(data);
  return actionPlan;
};

export default UpdateActionPlanService;