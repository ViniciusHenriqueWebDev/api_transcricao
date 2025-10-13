"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllAvailableFeatures = exports.checkFeatureEnabled = exports.getCompanyFeaturesWithMissing = exports.getCompanyFeatures = exports.createOrUpdateFeature = void 0;
const Feature_1 = __importDefault(require("../../models/Feature"));
const Company_1 = __importDefault(require("../../models/Company"));
const AppError_1 = __importDefault(require("../../errors/AppError"));
const createOrUpdateFeature = async (featureData) => {
    const { name, status, description, companyId } = featureData;
    // Verificar se a empresa existe
    const company = await Company_1.default.findByPk(companyId);
    if (!company) {
        throw new AppError_1.default("Empresa não encontrada", 404);
    }
    // Buscar a feature existente ou criar uma nova
    const [feature, created] = await Feature_1.default.findOrCreate({
        where: { name, companyId },
        defaults: {
            status,
            description: description || `Feature ${name}`,
            companyId
        }
    });
    // Se a feature já existia, atualizar seu status
    if (!created) {
        await feature.update({ status });
        await feature.reload();
    }
    return feature;
};
exports.createOrUpdateFeature = createOrUpdateFeature;
const getCompanyFeatures = async (companyId) => {
    const features = await Feature_1.default.findAll({
        where: { companyId },
        order: [["name", "ASC"]]
    });
    return features;
};
exports.getCompanyFeatures = getCompanyFeatures;
const getCompanyFeaturesWithMissing = async (companyId) => {
    // Obter features existentes para a empresa
    const existingFeatures = await Feature_1.default.findAll({
        where: { companyId },
        order: [["name", "ASC"]]
    });
    // Obter todas as features disponíveis
    const allAvailableFeatures = (0, exports.getAllAvailableFeatures)();
    // Encontrar features que a empresa não tem cadastradas ainda
    const existingFeatureNames = existingFeatures.map(f => f.name);
    const missingFeatures = allAvailableFeatures
        .filter(f => !existingFeatureNames.includes(f.name))
        .map(f => ({
        name: f.name,
        description: f.description,
        status: false,
        companyId
    }));
    return { existingFeatures, missingFeatures };
};
exports.getCompanyFeaturesWithMissing = getCompanyFeaturesWithMissing;
const checkFeatureEnabled = async (companyId, featureName) => {
    const feature = await Feature_1.default.findOne({
        where: { companyId, name: featureName }
    });
    return feature?.status === true;
};
exports.checkFeatureEnabled = checkFeatureEnabled;
const getAllAvailableFeatures = () => {
    // Lista de todas as features disponíveis no sistema
    return [
        {
            name: "goals-management",
            description: "Gerenciamento de Metas e Progresso"
        },
        {
            name: "analytics_dashboard",
            description: "Dashboard Tickets e Atendimento",
        },
        {
            name: "facebook_connection",
            description: "Conexão de Facebook",
        },
        {
            name: "instagram_connection",
            description: "Conexão de Instagram",
        }
    ];
};
exports.getAllAvailableFeatures = getAllAvailableFeatures;
