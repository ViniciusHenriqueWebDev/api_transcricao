import { Request, Response } from "express";
import { Op, Sequelize, WhereOptions } from "sequelize";

import AppError from "../errors/AppError";
import AuditLog from "../models/AuditLog";
import User from "../models/User";
import Goal from "../models/Goal";
import Employee from "../models/Employee";

interface IndexQuery {
  searchParam?: string;
  pageNumber?: string;
  employeeId?: string;
  changeType?: string;
  startDate?: string;
  endDate?: string;
}

export const listProgressLogs = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { companyId } = req.user;
  const {
    searchParam = "",
    pageNumber = "1",
    employeeId,
    changeType,
    startDate,
    endDate
  } = req.query as IndexQuery;

  const whereCondition: WhereOptions = {
    companyId
  };

  // Filtrar por funcionário específico
  if (employeeId) {
    whereCondition.employeeId = employeeId;
  }

  // Filtrar por tipo de alteração
  if (changeType) {
    whereCondition.changeType = changeType;
  }

  // Filtrar por período
  if (startDate && endDate) {
    whereCondition.createdAt = {
    [Op.between]: [new Date(startDate), new Date(endDate)]
    } as any;
  }

  // Filtrar por termo de busca
  if (searchParam) {
    whereCondition[Op.or as any] = [
      { goalName: { [Op.like]: `%${searchParam}%` } },
      { employeeName: { [Op.like]: `%${searchParam}%` } },
      { justification: { [Op.like]: `%${searchParam}%` } },
      { userName: { [Op.like]: `%${searchParam}%` } }
    ];
  }

  const limit = 50;
  const offset = (parseInt(pageNumber, 10) - 1) * limit;

  const { count, rows: logs } = await AuditLog.findAndCountAll({
    where: whereCondition,
    limit,
    offset,
    order: [["createdAt", "DESC"]],
    include: [
      {
        model: User,
        attributes: ["id", "name"],
        required: false
      },
      {
        model: Goal,
        attributes: ["id", "name"],
        required: false
      },
      {
        model: Employee,
        attributes: ["id", "name"],
        required: false
      }
    ]
  });

  const hasMore = count > offset + logs.length;

  return res.json({
    logs,
    count,
    hasMore
  });
};

export const deleteAllProgressLogs = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { companyId } = req.user;

  try {
    await AuditLog.destroy({
      where: {
        companyId
      }
    });
    return res.status(204).send();
  } catch (err) {
    throw new AppError("ERR_DELETE_AUDIT_LOGS", 500);
  }
};