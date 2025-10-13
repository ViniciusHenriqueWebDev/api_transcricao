import { Op, Sequelize } from "sequelize";
import Goal from "../../models/Goal";
import EmployeeGoal from "../../models/EmployeeGoal";
import Employee from "../../models/Employee";
import PerformanceCampaign from "../../models/PerformanceCampaign";

interface ListParams {
  searchParam?: string;
  pageNumber?: string;
  companyId: number;
  employeeId?: number;
  performanceCampaignId?: number;
  startDate?: Date;
  endDate?: Date;
  status?: string;  // "active", "completed", "expired"
}

interface GoalListReturn {
  goals: Goal[];
  count: number;
  hasMore: boolean;
}

const ListGoalService = async ({
  searchParam = "",
  pageNumber = "1",
  companyId,
  employeeId,
  performanceCampaignId,
  startDate,
  endDate,
  status
}: ListParams): Promise<GoalListReturn> => {
  const limit = 50;
  const offset = (parseInt(pageNumber, 10) - 1) * limit;
  const currentDate = new Date();

  // Construir as condições de pesquisa
  let where: any = { companyId };

  if (searchParam) {
    where = {
      ...where,
      [Op.or]: [
        { name: { [Op.iLike]: `%${searchParam}%` } },
        { description: { [Op.iLike]: `%${searchParam}%` } }
      ]
    };
  }

  if (performanceCampaignId) {
    where.performanceCampaignId = performanceCampaignId;
  }

  if (startDate) {
    where.startDate = {
      [Op.gte]: startDate
    };
  }

  if (endDate) {
    where.endDate = {
      [Op.lte]: endDate
    };
  }

  // Filtro por status
  if (status === "active") {
    where.endDate = {
      [Op.gte]: currentDate
    };
  } else if (status === "completed") {
    where[Op.and] = [
      Sequelize.literal(`"current" >= "target"`)
    ];
  } else if (status === "expired") {
    where.endDate = {
      [Op.lt]: currentDate
    };
    where[Op.and] = [
      Sequelize.literal(`"current" < "target"`)
    ];
  }

  // Opções de include
  const includeOptions = [
    {
      model: PerformanceCampaign,
      attributes: ["id", "name", "startDate", "endDate"]
    },
    {
      model: EmployeeGoal,
      include: [{
        model: Employee,
        attributes: ["id", "name", "position", "department"]
      }]
    }
  ];

  // Se há um employeeId específico, filtrar as metas pelo funcionário
  if (employeeId) {
    includeOptions.push(
      {
        model: EmployeeGoal,
        as: "employeeGoals",
        where: { employeeId },
        required: false
      } as any
    );
  }

  // Buscar as metas
  const { count, rows: goals } = await Goal.findAndCountAll({
    where,
    limit,
    offset,
    order: [["createdAt", "DESC"]],
    include: includeOptions,
  });

  const hasMore = count > offset + goals.length;

  return {
    goals,
    count,
    hasMore
  };
};

export default ListGoalService;