import { Op } from "sequelize";
import EmployeeGoal from "../../models/EmployeeGoal";
import Employee from "../../models/Employee";
import Goal from "../../models/Goal";

interface ListParams {
  goalId?: number;
  employeeId?: number;
  companyId: number;
}

const ListEmployeeGoalsService = async ({
  goalId,
  employeeId,
  companyId
}: ListParams): Promise<EmployeeGoal[]> => {
  const whereCondition: any = { 
    "$goal.companyId$": companyId 
  };

  if (goalId) {
    whereCondition.goalId = goalId;
  }

  if (employeeId) {
    whereCondition.employeeId = employeeId;
  }

  const employeeGoals = await EmployeeGoal.findAll({
    where: whereCondition,
    include: [
      {
        model: Employee,
        as: "employee",
        attributes: ["id", "name", "email", "department", "position"]
      },
      {
        model: Goal,
        as: "goal",
        attributes: ["id", "name", "target", "current", "metricType", "companyId"]
      }
    ],
    order: [["updatedAt", "DESC"]]
  });

  // Calcular o progresso para cada employee goal
  employeeGoals.forEach(employeeGoal => {
    const goal = employeeGoal.goal;
    const target = employeeGoal.individualTarget || goal.target;
    const current = employeeGoal.individualCurrent || 0;
    
    // Adicionar campo virtual progress
    (employeeGoal as any).progress = target > 0 ? Math.round((current / target) * 100) : 0;  });

  return employeeGoals;
};

export default ListEmployeeGoalsService;