import { Request, Response } from "express";
import * as FeatureService from "../services/FeatureServices";

export const index = async (req: Request, res: Response): Promise<Response> => {
  // Retorna todas as features disponíveis para serem ativadas
  const features = FeatureService.getAllAvailableFeatures();
  return res.status(200).json(features);
};

export const listCompanyFeatures = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.params;
  
  // Retorna features existentes e as que estão faltando
  const result = await FeatureService.getCompanyFeaturesWithMissing(Number(companyId));
  
  return res.status(200).json(result);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.params;
  const { name, status } = req.body;

  console.log(`Atualizando feature ${name} para empresa ${companyId} com status: ${status}`);
  
  const feature = await FeatureService.createOrUpdateFeature({
    name,
    status,
    companyId: Number(companyId)
  });

  return res.status(200).json(feature);
};

export const check = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.params;
  const { name } = req.query;
  
  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "Nome da feature não fornecido" });
  }

  const isEnabled = await FeatureService.checkFeatureEnabled(Number(companyId), name);
  return res.status(200).json({ enabled: isEnabled });
};