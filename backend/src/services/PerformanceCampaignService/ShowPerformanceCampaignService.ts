import AppError from "../../errors/AppError";
import PerformanceCampaign from "../../models/PerformanceCampaign";
import Goal from "../../models/Goal";
import EmployeeGoal from "../../models/EmployeeGoal";
import Employee from "../../models/Employee";

interface Request {
  id: string | number;
  companyId: number;
}

const ShowPerformanceCampaignService = async ({ id, companyId }: Request): Promise<PerformanceCampaign> => {
  const campaign = await PerformanceCampaign.findOne({
    where: { id, companyId },
    include: [
      {
        model: Goal,
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
      }
    ]
  });

  if (!campaign) {
    throw new AppError("Campanha não encontrada", 404);
  }

  return campaign;
};

export default ShowPerformanceCampaignService;