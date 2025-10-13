import * as Yup from "yup";
import AppError from "../../errors/AppError";
import PerformanceCampaign from "../../models/PerformanceCampaign";

interface CampaignData {
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  status?: boolean;
  companyId: number;
}

const CreatePerformanceCampaignService = async (campaignData: CampaignData): Promise<PerformanceCampaign> => {
  const schema = Yup.object().shape({
    name: Yup.string().required().min(2),
    description: Yup.string(),
    startDate: Yup.date().required(),
    endDate: Yup.date().required().min(
      Yup.ref('startDate'),
      "Data de término deve ser posterior à data de início"
    ),
    status: Yup.boolean().default(true),
    companyId: Yup.number().required()
  });

  try {
    await schema.validate(campaignData);
  } catch (err) {
    throw new AppError(err.message);
  }

  // Verificar se já existe uma campanha com o mesmo nome na empresa
  const existingCampaign = await PerformanceCampaign.findOne({
    where: { 
      name: campaignData.name,
      companyId: campaignData.companyId
    }
  });

  if (existingCampaign) {
    throw new AppError("Já existe uma campanha com este nome");
  }

  // Criar a campanha
  const campaign = await PerformanceCampaign.create({
    name: campaignData.name,
    description: campaignData.description || "",
    startDate: campaignData.startDate,
    endDate: campaignData.endDate,
    status: campaignData.status !== undefined ? campaignData.status : true,
    companyId: campaignData.companyId
  });

  return campaign;
};

export default CreatePerformanceCampaignService;