"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Yup = __importStar(require("yup"));
const sequelize_1 = require("sequelize");
const AppError_1 = __importDefault(require("../../errors/AppError"));
const PerformanceCampaign_1 = __importDefault(require("../../models/PerformanceCampaign"));
const Goal_1 = __importDefault(require("../../models/Goal"));
const UpdatePerformanceCampaignService = async ({ campaignData, campaignId, companyId }) => {
    const schema = Yup.object().shape({
        name: Yup.string().min(2),
        description: Yup.string(),
        startDate: Yup.date(),
        endDate: Yup.date().min(Yup.ref('startDate'), "Data de término deve ser posterior à data de início"),
        status: Yup.boolean()
    });
    try {
        await schema.validate(campaignData);
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    // Buscar a campanha
    const campaign = await PerformanceCampaign_1.default.findOne({
        where: { id: campaignId, companyId }
    });
    if (!campaign) {
        throw new AppError_1.default("Campanha não encontrada", 404);
    }
    // Se estiver atualizando o nome, verificar se já existe outra campanha com este nome
    if (campaignData.name && campaignData.name !== campaign.name) {
        const nameExists = await PerformanceCampaign_1.default.findOne({
            where: {
                name: campaignData.name,
                companyId,
                id: { [sequelize_1.Op.ne]: campaignId }
            }
        });
        if (nameExists) {
            throw new AppError_1.default("Já existe outra campanha com este nome");
        }
    }
    // Atualizar a campanha
    await campaign.update(campaignData);
    // Buscar a campanha atualizada
    const updatedCampaign = await PerformanceCampaign_1.default.findByPk(campaignId, {
        include: [{ model: Goal_1.default }]
    });
    return updatedCampaign;
};
exports.default = UpdatePerformanceCampaignService;
