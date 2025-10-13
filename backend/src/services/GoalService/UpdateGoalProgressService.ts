import AppError from "../../errors/AppError";
import Goal from "../../models/Goal";
import EmployeeGoal from "../../models/EmployeeGoal";
import Employee from "../../models/Employee";

interface Request {
  goalId: string | number;
  currentValue: number;
  companyId: number;
}

const UpdateGoalProgressService = async ({
  goalId,
  currentValue,
  companyId
}: Request): Promise<Goal> => {
  if (currentValue < 0) {
    throw new AppError("O valor atual não pode ser negativo");
  }

  const goal = await Goal.findOne({
    where: { id: goalId, companyId },
    include: [
      {
        model: EmployeeGoal,
        include: [{ model: Employee }]
      }
    ]
  });

  if (!goal) {
    throw new AppError("Meta não encontrada", 404);
  }

  // Atualizar o progresso geral da meta
  await goal.update({ current: currentValue });

  // Se não for uma meta dividida, atualizar o progresso para todos os funcionários
  if (!goal.dividedGoal && goal.employeeGoals?.length > 0) {
    const progressPercentage = Math.min(Math.floor((currentValue / goal.target) * 100), 100);

    for (const employeeGoal of goal.employeeGoals) {
      await employeeGoal.update({
        individualCurrent: currentValue,
        progress: progressPercentage
      });
    }
  }

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

export default UpdateGoalProgressService;