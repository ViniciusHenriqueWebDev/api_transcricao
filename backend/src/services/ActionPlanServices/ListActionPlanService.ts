import ActionPlan from "../../models/ActionPlan";

const ListActionPlanService = async ({ companyId }: { companyId: number }) => {
  const actionPlans = await ActionPlan.findAll({
    where: { companyId },
    order: [["createdAt", "DESC"]]
  });
  return {
    plans: actionPlans,
    count: actionPlans.length,
    hasMore: false // ajuste se tiver paginação
  };
};

export default ListActionPlanService;