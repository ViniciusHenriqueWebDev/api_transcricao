import AppError from "../../errors/AppError";
import Goal from "../../models/Goal";
import EmployeeGoal from "../../models/EmployeeGoal";

const DeleteGoalService = async (id: string | number, companyId: number): Promise<void> => {
  const goal = await Goal.findOne({
    where: { id, companyId }
  });

  if (!goal) {
    throw new AppError("Meta não encontrada", 404);
  }

  // Remover todas as associações com funcionários
  await EmployeeGoal.destroy({
    where: { goalId: id }
  });

  // Remover a meta
  await goal.destroy();
};

export default DeleteGoalService;