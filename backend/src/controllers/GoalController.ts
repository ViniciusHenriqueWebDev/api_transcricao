import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import CreateGoalService from "../services/GoalService/CreateGoalService";
import ListGoalService from "../services/GoalService/ListGoalService";
import ShowGoalService from "../services/GoalService/ShowGoalService";
import UpdateGoalService from "../services/GoalService/UpdateGoalService";
import DeleteGoalService from "../services/GoalService/DeleteGoalService";
import UpdateGoalProgressService from "../services/GoalService/UpdateGoalProgressService";
import UpdateGoalRewardStatusService from "../services/GoalService/UpdateGoalRewardStatusService";
import UpdateEmployeeGoalProgressService from "../services/GoalService/UpdateEmployeeGoalProgressService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { 
      searchParam, 
      pageNumber, 
      employeeId, 
      performanceCampaignId, 
      startDate, 
      endDate, 
      status 
    } = req.query as {
      searchParam?: string;
      pageNumber?: string;
      employeeId?: string;
      performanceCampaignId?: string;
      startDate?: string;
      endDate?: string;
      status?: string;
    };
    
    const { companyId } = req.user;

    const { goals, count, hasMore } = await ListGoalService({
      searchParam,
      pageNumber,
      companyId,
      employeeId: employeeId ? parseInt(employeeId) : undefined,
      performanceCampaignId: performanceCampaignId ? parseInt(performanceCampaignId) : undefined,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      status
    });

    return res.status(200).json({ goals, count, hasMore });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  try {
    const goalData = req.body;
    
    // Certifique-se de que o companyId está definido a partir do usuário logado
    if (!req.user || !req.user.companyId) {
      return res.status(401).json({ error: "Usuário não autorizado ou companyId não encontrado" });
    }
    
    const { companyId } = req.user;
    console.log("CompanyId do usuário:", companyId); // Log para debug

    // Pré-processamento dos dados para garantir que os campos numéricos sejam convertidos corretamente
    if (goalData.productConfig) {
      // Converter individualTarget para número em todos os produtos
      Object.keys(goalData.productConfig).forEach(employeeId => {
        const employeeConfig = goalData.productConfig[employeeId];
        if (employeeConfig && employeeConfig.products) {
          employeeConfig.products.forEach(product => {
            if (product.individualTarget) {
              product.individualTarget = Number(product.individualTarget);
            }
          });
        }
      });
    }

    const goal = await CreateGoalService({
      ...goalData,
      companyId: companyId
    });

    const io = getIO();
    io.emit("goal", {
      action: "create",
      goal
    });

    return res.status(201).json(goal);
  } catch (err) {
    console.error("Erro ao criar meta:", err);
    return res.status(err.statusCode || 400).json({ error: err.message });
  }
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;

    const goal = await ShowGoalService({ id, companyId });

    return res.status(200).json(goal);
  } catch (err) {
    console.error(err);
    return res.status(err.statusCode || 400).json({ error: err.message });
  }
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  try {
    const goalData = req.body;
    const { id } = req.params;
    const { companyId } = req.user;

    // Pré-processamento dos dados para garantir que os campos numéricos sejam convertidos corretamente
    if (goalData.productConfig) {
      // Converter individualTarget para número em todos os produtos
      Object.keys(goalData.productConfig).forEach(employeeId => {
        const employeeConfig = goalData.productConfig[employeeId];
        if (employeeConfig && employeeConfig.products) {
          employeeConfig.products.forEach(product => {
            if (product.individualTarget) {
              product.individualTarget = Number(product.individualTarget);
            }
          });
        }
      });
    }

    const goal = await UpdateGoalService({
      goalData,
      goalId: id,
      companyId
    });

    const io = getIO();
    io.emit("goal", {
      action: "update",
      goal
    });

    return res.status(200).json(goal);
  } catch (err) {
    console.error(err);
    return res.status(err.statusCode || 400).json({ error: err.message });
  }
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;

    await DeleteGoalService(id, companyId);

    const io = getIO();
    io.emit("goal", {
      action: "delete",
      goalId: id
    });

    return res.status(200).json({ message: "Meta excluída com sucesso" });
  } catch (err) {
    console.error(err);
    return res.status(err.statusCode || 400).json({ error: err.message });
  }
};

export const updateProgress = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { goalId, currentValue } = req.body; // Adicionando currentValue aqui
    const { companyId } = req.user;

    if (currentValue === undefined) {
      return res.status(400).json({ error: "O valor atual da meta é obrigatório" });
    }

    // Atualizar para usar o service correto
    const goal = await UpdateGoalProgressService({
      goalId,
      currentValue,
      companyId
    });

    const io = getIO();
    io.emit("goal", {
      action: "update",
      goal
    });

    return res.status(200).json(goal);
  } catch (err) {
    console.error(err);
    return res.status(err.statusCode || 400).json({ error: err.message });
  }
};

export const updateRewardStatus = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { rewardStatus } = req.body;
    const { companyId } = req.user;

    if (!rewardStatus || !["pendente", "aprovada", "entregue"].includes(rewardStatus)) {
      return res.status(400).json({ error: "Status de recompensa inválido" });
    }

    const goal = await UpdateGoalRewardStatusService({
      goalId: id,
      rewardStatus,
      companyId
    });

    const io = getIO();
    io.emit("goal", {
      action: "update",
      goal
    });

    return res.status(200).json(goal);
  } catch (err) {
    console.error(err);
    return res.status(err.statusCode || 400).json({ error: err.message });
  }
};

export const updateEmployeeProgress = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { employeeId, progress } = req.body;
    const { companyId } = req.user;

    if (employeeId === undefined || progress === undefined) {
      return res.status(400).json({ 
        error: "ID do funcionário e progresso são obrigatórios" 
      });
    }

    const goal = await UpdateEmployeeGoalProgressService({
      goalId: id,
      employeeId,
      progress,
      companyId
    });

    const io = getIO();
    io.emit("goal", {
      action: "update",
      goal
    });

    return res.status(200).json(goal);
  } catch (err) {
    console.error(err);
    return res.status(err.statusCode || 400).json({ error: err.message });
  }
};