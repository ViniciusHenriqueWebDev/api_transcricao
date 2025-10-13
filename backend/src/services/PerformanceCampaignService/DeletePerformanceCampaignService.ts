import AppError from "../../errors/AppError";
import PerformanceCampaign from "../../models/PerformanceCampaign";
import Goal from "../../models/Goal";

const DeletePerformanceCampaignService = async (id: string | number, companyId: number): Promise<void> => {
  const campaign = await PerformanceCampaign.findOne({
    where: { id, companyId },
    include: [{ model: Goal }]
  });

  if (!campaign) {
    throw new AppError("Campanha não encontrada", 404);
  }

  // Verificar se há metas associadas
  if (campaign.goals && campaign.goals.length > 0) {
    // Opção 1: Impedir a exclusão se houver metas associadas
    // throw new AppError("Não é possível excluir a campanha pois há metas associadas a ela");

    // Opção 2: Remover a associação das metas com a campanha
    await Goal.update(
      { performanceCampaignId: null },
      { where: { performanceCampaignId: id } }
    );
  }

  // Excluir a campanha
  await campaign.destroy();
};

export default DeletePerformanceCampaignService;