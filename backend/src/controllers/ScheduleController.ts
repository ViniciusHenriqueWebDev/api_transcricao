import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import AppError from "../errors/AppError";

import CreateService from "../services/ScheduleServices/CreateService";
import ListService from "../services/ScheduleServices/ListService";
import UpdateService from "../services/ScheduleServices/UpdateService";
import ShowService from "../services/ScheduleServices/ShowService";
import DeleteService from "../services/ScheduleServices/DeleteService";
import Schedule from "../models/Schedule";
import path from "path";
import fs from "fs";
import { head } from "lodash";

type IndexQuery = {
  searchParam?: string;
  contactId?: number | string;
  userId?: number | string;
  pageNumber?: string | number;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { contactId, userId, pageNumber, searchParam } = req.query as IndexQuery;
  const { companyId } = req.user;

  const { schedules, count, hasMore } = await ListService({
    searchParam,
    contactId,
    userId,
    pageNumber,
    companyId
  });

  return res.json({ schedules, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const {
    body,
    sendAt,
    contactId,
    userId,
    whatsappId,
    queueId,
    status,
    atendenteId,
    ticketStatus,
    recurrenceType,
    recurrenceValue,
    recurrenceTimes,
    recurrencePattern,
    openTicket,
    sendSignature
  } = req.body;
  const { companyId } = req.user;

   const schedule = await CreateService({
    body,
    sendAt,
    contactId,
    companyId,
    userId: atendenteId || userId, // Usa o atendenteId se informado, senão usa o userId
    whatsappId,
    queueId,
    status,
    ticketStatus,
    recurrence: recurrenceType !== "none", // Converte para boolean
    recurrenceInterval: recurrenceType, // Armazena o tipo (dias, semanas, meses)
    recurrenceValue, // Valor do intervalo
    recurrenceCount: recurrenceTimes, // Quantidade de vezes
    recurrenceDayOptions: recurrencePattern, // Padrão (normal, business, skip)
    openTicket: openTicket !== undefined ? openTicket : true,
    sendSignature: sendSignature !== undefined ? sendSignature : false
  });

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit("schedule", {
    action: "create",
    schedule
  });

  return res.status(200).json(schedule);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { scheduleId } = req.params;
  const { companyId } = req.user;

  const schedule = await ShowService(scheduleId, companyId);

  return res.status(200).json(schedule);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  if (req.user.profile !== "admin") {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }

  const { scheduleId } = req.params;
  const scheduleData = req.body;
  const { companyId } = req.user;

  // Mapeando campos do frontend para backend
  if (scheduleData.recurrenceType !== undefined) {
    scheduleData.recurrence = scheduleData.recurrenceType !== "none";
    scheduleData.recurrenceInterval = scheduleData.recurrenceType;
  }
  
  if (scheduleData.recurrenceTimes !== undefined) {
    scheduleData.recurrenceCount = scheduleData.recurrenceTimes;
  }
  
  if (scheduleData.recurrencePattern !== undefined) {
    scheduleData.recurrenceDayOptions = scheduleData.recurrencePattern;
  }

  if (scheduleData.atendenteId !== undefined) {
    scheduleData.userId = scheduleData.atendenteId;
  }

  const schedule = await UpdateService({ scheduleData, id: scheduleId, companyId });

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit("schedule", {
    action: "update",
    schedule
  });

  return res.status(200).json(schedule);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { scheduleId } = req.params;
  const { companyId } = req.user;

  await DeleteService(scheduleId, companyId);

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit("schedule", {
    action: "delete",
    scheduleId
  });

  return res.status(200).json({ message: "Schedule deleted" });
};

export const mediaUpload = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const files = req.files as Express.Multer.File[];
  const file = head(files);

  try {
    const schedule = await Schedule.findByPk(id);
    schedule.mediaPath = file.filename;
    schedule.mediaName = file.originalname;

    await schedule.save();
    return res.send({ mensagem: "Arquivo Anexado" });
  } catch (err: any) {
    throw new AppError(err.message);
  }
};

export const deleteMedia = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;

  try {
    const schedule = await Schedule.findByPk(id);
    const filePath = path.resolve("public", schedule.mediaPath);
    const fileExists = fs.existsSync(filePath);
    if (fileExists) {
      fs.unlinkSync(filePath);
    }
    schedule.mediaPath = null;
    schedule.mediaName = null;
    await schedule.save();
    return res.send({ mensagem: "Arquivo Excluído" });
  } catch (err: any) {
    throw new AppError(err.message);
  }
};