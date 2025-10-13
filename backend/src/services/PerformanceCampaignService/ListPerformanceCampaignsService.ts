import { Op, Sequelize } from "sequelize";
import PerformanceCampaign from "../../models/PerformanceCampaign";
import Goal from "../../models/Goal";

interface ListParams {
  searchParam?: string;
  pageNumber?: string;
  companyId: number;
  status?: string; // "active", "upcoming", "finished", "all"
  startDate?: Date;
  endDate?: Date;
}

interface CampaignListReturn {
  campaigns: PerformanceCampaign[];
  count: number;
  hasMore: boolean;
}

const ListPerformanceCampaignsService = async ({
  searchParam = "",
  pageNumber = "1",
  companyId,
  status,
  startDate,
  endDate
}: ListParams): Promise<CampaignListReturn> => {
  const limit = 20;
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

  // Filtrar por status
  if (status === "active") {
    where[Op.and] = [
      { startDate: { [Op.lte]: currentDate } },
      { endDate: { [Op.gte]: currentDate } }
    ];
  } else if (status === "upcoming") {
    where.startDate = { [Op.gt]: currentDate };
  } else if (status === "finished") {
    where.endDate = { [Op.lt]: currentDate };
  }

  // Filtrar por data
  if (startDate) {
    where.startDate = {
      ...where.startDate,
      [Op.gte]: startDate
    };
  }

  if (endDate) {
    where.endDate = {
      ...where.endDate,
      [Op.lte]: endDate
    };
  }

  // Buscar as campanhas
  const { count, rows: campaigns } = await PerformanceCampaign.findAndCountAll({
    where,
    limit,
    offset,
    order: [["startDate", "DESC"]],
    include: [
      {
        model: Goal,
        attributes: ["id", "name", "target", "current"]
      }
    ]
  });

  const hasMore = count > offset + campaigns.length;

  return {
    campaigns,
    count,
    hasMore
  };
};

export default ListPerformanceCampaignsService;