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
const AppError_1 = __importDefault(require("../../errors/AppError"));
const PerformanceCampaign_1 = __importDefault(require("../../models/PerformanceCampaign"));
const CreatePerformanceCampaignService = async (campaignData) => {
    const schema = Yup.object().shape({
        name: Yup.string().required().min(2),
        description: Yup.string(),
        startDate: Yup.date().required(),
        endDate: Yup.date().required().min(Yup.ref('startDate'), "Data de término deve ser posterior à data de início"),
        status: Yup.boolean().default(true),
        companyId: Yup.number().required()
    });
    try {
        await schema.validate(campaignData);
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    // Verificar se já existe uma campanha com o mesmo nome na empresa
    const existingCampaign = await PerformanceCampaign_1.default.findOne({
        where: {
            name: campaignData.name,
            companyId: campaignData.companyId
        }
    });
    if (existingCampaign) {
        throw new AppError_1.default("Já existe uma campanha com este nome");
    }
    // Criar a campanha
    const campaign = await PerformanceCampaign_1.default.create({
        name: campaignData.name,
        description: campaignData.description || "",
        startDate: campaignData.startDate,
        endDate: campaignData.endDate,
        status: campaignData.status !== undefined ? campaignData.status : true,
        companyId: campaignData.companyId
    });
    return campaign;
};
exports.default = CreatePerformanceCampaignService;
