import ActionPlan from "../../models/ActionPlan";

const ShowActionPlanService = async (id: number, companyId: number) => {
  const actionPlan = await ActionPlan.findOne({
    where: { id, companyId }
  });
  if (!actionPlan) {
    throw new Error("Plano de ação não encontrado");
  }
  return actionPlan;
};

export default ShowActionPlanService;