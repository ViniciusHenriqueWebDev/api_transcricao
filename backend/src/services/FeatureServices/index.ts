import Feature from "../../models/Feature";
import Company from "../../models/Company";
import AppError from "../../errors/AppError";

interface FeatureData {
  name: string;
  status: boolean;
  description?: string;
  companyId: number;
}

export const createOrUpdateFeature = async (
  featureData: FeatureData
): Promise<Feature> => {
  const { name, status, description, companyId } = featureData;

  // Verificar se a empresa existe
  const company = await Company.findByPk(companyId);
  if (!company) {
    throw new AppError("Empresa não encontrada", 404);
  }

  // Buscar a feature existente ou criar uma nova
  const [feature, created] = await Feature.findOrCreate({
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

export const getCompanyFeatures = async (
  companyId: number
): Promise<Feature[]> => {
  const features = await Feature.findAll({
    where: { companyId },
    order: [["name", "ASC"]]
  });

  return features;
};

export const getCompanyFeaturesWithMissing = async (
  companyId: number
): Promise<{ existingFeatures: Feature[]; missingFeatures: any[] }> => {
  // Obter features existentes para a empresa
  const existingFeatures = await Feature.findAll({
    where: { companyId },
    order: [["name", "ASC"]]
  });

  // Obter todas as features disponíveis
  const allAvailableFeatures = getAllAvailableFeatures();
  
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

export const checkFeatureEnabled = async (
  companyId: number,
  featureName: string
): Promise<boolean> => {
  const feature = await Feature.findOne({
    where: { companyId, name: featureName }
  });

  return feature?.status === true;
};

export const getAllAvailableFeatures = (): { name: string; description: string }[] => {
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