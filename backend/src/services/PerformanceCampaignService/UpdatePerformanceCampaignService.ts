import * as Yup from "yup";
import { Op } from "sequelize";
import AppError from "../../errors/AppError";
import PerformanceCampaign from "../../models/PerformanceCampaign";
import Goal from '../../models/Goal';

interface CampaignData {
  name?: string;
  description?: string;
  startDate?: Date;
  endDate?: Date;
  status?: boolean;
}

interface Request {
  campaignData: CampaignData;
  campaignId: string | number;
  companyId: number;
}

const UpdatePerformanceCampaignService = async ({
  campaignData,
  campaignId,
  companyId
}: Request): Promise<PerformanceCampaign> => {
  const schema = Yup.object().shape({
    name: Yup.string().min(2),
    description: Yup.string(),
    startDate: Yup.date(),
    endDate: Yup.date().min(
      Yup.ref('startDate'),
      "Data de término deve ser posterior à data de início"
    ),
    status: Yup.boolean()
  });

  try {
    await schema.validate(campaignData);
  } catch (err) {
    throw new AppError(err.message);
  }

  // Buscar a campanha
  const campaign = await PerformanceCampaign.findOne({
    where: { id: campaignId, companyId }
  });

  if (!campaign) {
    throw new AppError("Campanha não encontrada", 404);
  }

  // Se estiver atualizando o nome, verificar se já existe outra campanha com este nome
  if (campaignData.name && campaignData.name !== campaign.name) {
    const nameExists = await PerformanceCampaign.findOne({
      where: {
        name: campaignData.name,
        companyId,
        id: { [Op.ne]: campaignId }
      }
    });

    if (nameExists) {
      throw new AppError("Já existe outra campanha com este nome");
    }
  }

  // Atualizar a campanha
  await campaign.update(campaignData);

  // Buscar a campanha atualizada
  const updatedCampaign = await PerformanceCampaign.findByPk(campaignId, {
    include: [{ model: Goal }]
  });

  return updatedCampaign;
};

export default UpdatePerformanceCampaignService;