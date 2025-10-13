import { Op } from "sequelize";
import PerformanceCampaign from "../../models/PerformanceCampaign";
import Goal from "../../models/Goal";
import EmployeeGoal from "../../models/EmployeeGoal";
import Employee from "../../models/Employee";

interface Request {
  campaignId: string | number;
  companyId: number;
}

interface CampaignSummary {
  campaign: PerformanceCampaign;
  totalGoals: number;
  completedGoals: number;
  progressPercentage: number;
  topPerformers: {
    employeeId: number;
    name: string;
    position: string;
    completedGoals: number;
    totalGoals: number;
    averageProgress: number;
  }[];
}

const GetCampaignSummaryService = async ({ 
  campaignId, 
  companyId 
}: Request): Promise<CampaignSummary> => {
  // Buscar a campanha com todas as metas associadas
  const campaign = await PerformanceCampaign.findOne({
    where: { id: campaignId, companyId },
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
    throw new Error("Campanha não encontrada");
  }

  // Calcular estatísticas da campanha
  const goals = campaign.goals || [];
  const totalGoals = goals.length;
  const completedGoals = goals.filter(goal => goal.current >= goal.target).length;
  const progressPercentage = totalGoals > 0 
    ? Math.round((completedGoals / totalGoals) * 100) 
    : 0;

  // Calcular desempenho por funcionário
  const employeePerformance = new Map();

  // Processar todas as metas e associações com funcionários
  goals.forEach(goal => {
    (goal.employeeGoals || []).forEach(employeeGoal => {
      const employee = employeeGoal.employee;
      const employeeId = employee.id;
      
      if (!employeePerformance.has(employeeId)) {
        employeePerformance.set(employeeId, {
          employeeId,
          name: employee.name,
          position: employee.position,
          totalGoals: 0,
          completedGoals: 0,
          totalProgress: 0
        });
      }
      
      const performance = employeePerformance.get(employeeId);
      performance.totalGoals += 1;
      
      // Considerar uma meta completa se o progresso for >= 100%
      if ((employeeGoal as any).progress >= 100) {
        performance.completedGoals += 1;
      }
      
      performance.totalProgress += (employeeGoal as any).progress || 0;
    });
  });

  // Calcular a média de progresso e ordenar por desempenho
  const topPerformers = Array.from(employeePerformance.values())
    .map(perf => ({
      ...perf,
      averageProgress: perf.totalGoals > 0 
        ? Math.round(perf.totalProgress / perf.totalGoals) 
        : 0
    }))
    .sort((a, b) => b.averageProgress - a.averageProgress)
    .slice(0, 5); // Top 5 performers

  return {
    campaign,
    totalGoals,
    completedGoals,
    progressPercentage,
    topPerformers
  };
};

export default GetCampaignSummaryService;