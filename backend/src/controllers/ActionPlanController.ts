import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import ListActionPlanService from "../services/ActionPlanServices/ListActionPlanService";
import CreateActionPlanService from "../services/ActionPlanServices/CreateActionPlanService";
import ShowActionPlanService from "../services/ActionPlanServices/ShowActionPlanService";
import UpdateActionPlanService from "../services/ActionPlanServices/UpdateActionPlanService";
import DeleteActionPlanService from "../services/ActionPlanServices/DeleteActionPlanService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user.companyId;
  if (companyId == null) return res.status(400).json({ error: "Empresa não encontrada" });
  const { plans, count, hasMore } = await ListActionPlanService({ companyId });
  return res.json({ plans, count, hasMore });
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const companyId = req.user.companyId;
  if (companyId == null) return res.status(400).json({ error: "Empresa não encontrada" });
  const plan = await ShowActionPlanService(Number(id), companyId);
  if (!plan) return res.status(404).json({ error: "Plano de ação não encontrado" });
  return res.json(plan);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const companyId = req.user.companyId;
  if (companyId == null) return res.status(400).json({ error: "Empresa não encontrada" });
  const data = req.body;
  const plan = await CreateActionPlanService({ ...data, companyId });
  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit("actionPlan", { action: "create", plan });
  return res.status(201).json(plan);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const companyId = req.user.companyId;
  if (companyId == null) return res.status(400).json({ error: "Empresa não encontrada" });
  const data = req.body;
  const plan = await UpdateActionPlanService(Number(id), companyId, data);
  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit("actionPlan", { action: "update", plan });
  return res.json(plan);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const companyId = req.user.companyId;
  if (companyId == null) return res.status(400).json({ error: "Empresa não encontrada" });
  await DeleteActionPlanService(Number(id), companyId);
  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit("actionPlan", { action: "delete", id });
  return res.status(200).json({ message: "Plano de ação excluído com sucesso" });
};