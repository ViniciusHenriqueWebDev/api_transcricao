import ActionPlan from "../../models/ActionPlan";

const DeleteActionPlanService = async (id: number, companyId: number): Promise<void> => {
  const actionPlan = await ActionPlan.findOne({ where: { id, companyId } });
  if (!actionPlan) {
    throw new Error("Plano de ação não encontrado");
  }
  await actionPlan.destroy();
};

export default DeleteActionPlanService;