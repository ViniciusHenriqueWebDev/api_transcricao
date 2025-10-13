import * as Yup from "yup";

import AppError from "../../errors/AppError";
import Schedule from "../../models/Schedule";
import ShowService from "./ShowService";

interface ScheduleData {
  id?: number;
  body?: string;
  sendAt?: string;
  sentAt?: string;
  contactId?: number;
  companyId?: number;
  ticketId?: number;
  userId?: number;
  whatsappId?: number;
  queueId?: number;
  ticketStatus?: string;
  recurrence?: boolean;
  recurrenceInterval?: string;
  recurrenceValue?: number;
  recurrenceCount?: number;
  recurrenceDayOptions?: string;
  openTicket?: boolean;
  sendSignature?: boolean;
}

interface Request {
  scheduleData: ScheduleData;
  id: string | number;
  companyId: number;
}

const UpdateUserService = async ({
  scheduleData,
  id,
  companyId
}: Request): Promise<Schedule | undefined> => {
  const schedule = await ShowService(id, companyId);

  if (schedule?.companyId !== companyId) {
    throw new AppError("Não é possível alterar registros de outra empresa");
  }

  const schema = Yup.object().shape({
    body: Yup.string().min(5)
  });

  const {
    body,
    sendAt,
    sentAt,
    contactId,
    ticketId,
    userId,
    whatsappId,
    queueId,
    ticketStatus,
    recurrence,
    recurrenceInterval,
    recurrenceValue,
    recurrenceCount,
    recurrenceDayOptions,
    openTicket,
    sendSignature
  } = scheduleData;

  try {
    await schema.validate({ body });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  // Atualizar somente os campos que foram fornecidos
  const updateData: any = {};
  
  if (body !== undefined) updateData.body = body;
  if (sendAt !== undefined) updateData.sendAt = sendAt;
  if (sentAt !== undefined) updateData.sentAt = sentAt;
  if (contactId !== undefined) updateData.contactId = contactId;
  if (ticketId !== undefined) updateData.ticketId = ticketId;
  if (userId !== undefined) updateData.userId = userId;
  if (whatsappId !== undefined) updateData.whatsappId = whatsappId;
  if (queueId !== undefined) updateData.queueId = queueId;
  if (ticketStatus !== undefined) updateData.ticketStatus = ticketStatus;
  if (recurrence !== undefined) updateData.recurrence = recurrence;
  if (recurrenceInterval !== undefined) updateData.recurrenceInterval = recurrenceInterval;
  if (recurrenceValue !== undefined) updateData.recurrenceValue = recurrenceValue;
  if (recurrenceCount !== undefined) updateData.recurrenceCount = recurrenceCount;
  if (recurrenceDayOptions !== undefined) updateData.recurrenceDayOptions = recurrenceDayOptions;
  if (openTicket !== undefined) updateData.openTicket = openTicket;
  if (sendSignature !== undefined) updateData.sendSignature = sendSignature;

  await schedule.update(updateData);
  await schedule.reload();
  return schedule;
};

export default UpdateUserService;