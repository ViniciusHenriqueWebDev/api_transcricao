"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const AppError_1 = __importDefault(require("../../errors/AppError"));
const PerformanceCampaign_1 = __importDefault(require("../../models/PerformanceCampaign"));
const Goal_1 = __importDefault(require("../../models/Goal"));
const DeletePerformanceCampaignService = async (id, companyId) => {
    const campaign = await PerformanceCampaign_1.default.findOne({
        where: { id, companyId },
        include: [{ model: Goal_1.default }]
    });
    if (!campaign) {
        throw new AppError_1.default("Campanha não encontrada", 404);
    }
    // Verificar se há metas associadas
    if (campaign.goals && campaign.goals.length > 0) {
        // Opção 1: Impedir a exclusão se houver metas associadas
        // throw new AppError("Não é possível excluir a campanha pois há metas associadas a ela");
        // Opção 2: Remover a associação das metas com a campanha
        await Goal_1.default.update({ performanceCampaignId: null }, { where: { performanceCampaignId: id } });
    }
    // Excluir a campanha
    await campaign.destroy();
};
exports.default = DeletePerformanceCampaignService;
