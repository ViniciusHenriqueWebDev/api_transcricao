import AppError from "../../errors/AppError";
import EmployeeGoal from "../../models/EmployeeGoal";
import Employee from "../../models/Employee";
import Goal from "../../models/Goal";

interface ShowEmployeeGoalParams {
  id: number;
  companyId: number;
}

const ShowEmployeeGoalService = async ({
  id,
  companyId
}: ShowEmployeeGoalParams): Promise<EmployeeGoal> => {
  const employeeGoal = await EmployeeGoal.findByPk(id, {
    include: [
      {
        model: Employee,
        as: "employee",
        attributes: ["id", "name", "email", "department", "position"]
      },
      {
        model: Goal,
        as: "goal",
        attributes: ["id", "name", "target", "current", "companyId"]
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

  // Calcular o progresso
  const goal = employeeGoal.goal;
  const target = employeeGoal.individualTarget || goal.target;
  const current = employeeGoal.individualCurrent || 0;
  (employeeGoal as any).progress = target > 0 ? Math.round((current / target) * 100) : 0;
  return employeeGoal;
};

export default ShowEmployeeGoalService;