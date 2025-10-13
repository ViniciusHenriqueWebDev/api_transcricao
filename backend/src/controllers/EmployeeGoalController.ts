import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import AppError from "../errors/AppError";
import ListEmployeeGoalsService from "../services/EmployeeGoalService/ListEmployeeGoalsService";
import ShowEmployeeGoalService from "../services/EmployeeGoalService/ShowEmployeeGoalService";
import UpdateEmployeeGoalService from "../services/EmployeeGoalService/UpdateEmployeeGoalService";
import CreateEmployeeGoalService from "../services/EmployeeGoalService/CreateEmployeeGoalService";
import DeleteEmployeeGoalService from "../services/EmployeeGoalService/DeleteEmployeeGoalService";
import ShowUserService from "../services/UserServices/ShowUserService"; 
import AuditLog from "../models/AuditLog"; 

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { goalId, employeeId } = req.query;
  const { companyId } = req.user;

  const employeeGoals = await ListEmployeeGoalsService({
    goalId: goalId ? Number(goalId) : undefined,
    employeeId: employeeId ? Number(employeeId) : undefined,
    companyId
  });

  return res.status(200).json(employeeGoals);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  const employeeGoal = await ShowEmployeeGoalService({ id: Number(id), companyId });
  return res.status(200).json(employeeGoal);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { employeeId, goalId, individualTarget, individualCurrent } = req.body;
  const { companyId } = req.user;

  const employeeGoal = await CreateEmployeeGoalService({
    employeeId,
    goalId,
    individualTarget,
    individualCurrent: individualCurrent || 0,
    companyId
  });

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit("employeeGoal", {
    action: "create",
    employeeGoal
  });

  return res.status(200).json(employeeGoal);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { individualTarget, individualCurrent, justification } = req.body;
  const { companyId, id: userId } = req.user;

  // Buscar o valor atual antes da atualização
  const currentEmployeeGoal = await ShowEmployeeGoalService({ id: Number(id), companyId });
  const oldValue = currentEmployeeGoal.individualCurrent;

  // Atualizar a meta do funcionário
  const employeeGoal = await UpdateEmployeeGoalService({
    id: Number(id),
    individualTarget,
    individualCurrent,
    companyId
  });

  // Se o valor atual foi alterado, registrar na auditoria
  if (individualCurrent !== undefined && individualCurrent !== oldValue) {
    // Determinar o tipo de alteração
    let changeType = "neutral";
    if (individualCurrent > oldValue) {
      changeType = "increase";
    } else if (individualCurrent < oldValue) {
      changeType = "decrease";
    }

    // Buscar informações completas do employeeGoal para o log
    const employeeGoalDetails = await ShowEmployeeGoalService({
      id:Number(id), 
      companyId, 
    }); 

    // Buscar o usuário para obter o nome
    const user = await ShowUserService(userId);

    // Registrar o log de auditoria
    await AuditLog.create({
      userId,
      userName: user.name,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      goalId: employeeGoalDetails.goalId,
      goalName: employeeGoalDetails.goal.name,
      employeeId: employeeGoalDetails.employeeId,
      employeeName: employeeGoalDetails.employee.name,
      oldValue,
      newValue: individualCurrent,
      changeType,
      justification: justification || "",
      metricType: employeeGoalDetails.goal.metricType,
      individualTarget: employeeGoalDetails.individualTarget,
      companyId
    });
  }

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit("employeeGoal", {
    action: "update",
    employeeGoal
  });

  return res.status(200).json(employeeGoal);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  await DeleteEmployeeGoalService({ id: Number(id), companyId });

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit("employeeGoal", {
    action: "delete",
    id: Number(id)
  });

  return res.status(200).json({ message: "Employee goal deleted" });
};

// Método específico para atualizar progresso individual
export const updateProgress = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { individualCurrent } = req.body;
  const { companyId } = req.user;

  const employeeGoal = await UpdateEmployeeGoalService({
    id: Number(id),
    individualCurrent,
    companyId
  });

  // Atualize o progresso da meta principal
  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit("employeeGoal", {
    action: "update",
    employeeGoal
  });

  return res.status(200).json(employeeGoal);
};