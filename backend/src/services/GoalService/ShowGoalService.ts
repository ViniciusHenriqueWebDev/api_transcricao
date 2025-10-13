import AppError from "../../errors/AppError";
import Goal from "../../models/Goal";
import Employee from "../../models/Employee";
import EmployeeGoal from "../../models/EmployeeGoal";
import PerformanceCampaign from "../../models/PerformanceCampaign";

interface Request {
  id: string | number;
  companyId: number;
}

const ShowGoalService = async ({ id, companyId }: Request): Promise<Goal> => {
  const goal = await Goal.findOne({
    where: { id, companyId },
    include: [
      {
        model: EmployeeGoal,
        include: [
          {
            model: Employee,
            attributes: ["id", "name", "email", "position", "department"]
          }
        ]
      },
      {
        model: PerformanceCampaign,
        attributes: ["id", "name", "startDate", "endDate", "status"]
      }
    ]
  });

  if (!goal) {
    throw new AppError("Meta não encontrada", 404);
  }

  return goal;
};

export default ShowGoalService;