import AppError from "../../errors/AppError";
import Goal from "../../models/Goal";
import EmployeeGoal from "../../models/EmployeeGoal";
import Employee from "../../models/Employee";

interface Request {
  goalId: string | number;
  rewardStatus: "pendente" | "aprovada" | "entregue";
  companyId: number;
}

const UpdateGoalRewardStatusService = async ({
  goalId,
  rewardStatus,
  companyId
}: Request): Promise<Goal> => {
  const goal = await Goal.findOne({
    where: { id: goalId, companyId }
  });

  if (!goal) {
    throw new AppError("Meta não encontrada", 404);
  }

  if (!goal.reward && !goal.rewardValue) {
    throw new AppError("Esta meta não possui uma recompensa definida");
  }

  // Atualizar o status da recompensa
  await goal.update({ rewardStatus });

  // Buscar a meta atualizada com todos os relacionamentos
  const updatedGoal = await Goal.findByPk(goalId, {
    include: [
      {
        model: EmployeeGoal,
        include: [
          {
            model: Employee,
            attributes: ["id", "name", "position", "department"]
          }
        ]
      }
    ]
  });

  return updatedGoal;
};

export default UpdateGoalRewardStatusService;