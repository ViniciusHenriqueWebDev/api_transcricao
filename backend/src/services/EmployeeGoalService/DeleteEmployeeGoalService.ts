import AppError from "../../errors/AppError";
import EmployeeGoal from "../../models/EmployeeGoal";
import Goal from "../../models/Goal";

interface DeleteParams {
  id: number;
  companyId: number;
}

const DeleteEmployeeGoalService = async ({
  id,
  companyId
}: DeleteParams): Promise<void> => {
  // Encontrar o employeeGoal com o goal associado
  const employeeGoal = await EmployeeGoal.findByPk(id, {
    include: [
      {
        model: Goal,
        as: "goal",
        attributes: ["companyId"]
      }
    ]
  });

  if (!employeeGoal) {
    throw new AppError("Employee goal not found", 404);
  }

  // Verificar se o registro pertence à empresa do usuário
  if (employeeGoal.goal.companyId !== companyId) {
    throw new AppError("Access denied: this employee goal belongs to another company", 403);
  }

  // Excluir o employee goal
  await employeeGoal.destroy();
};

export default DeleteEmployeeGoalService;