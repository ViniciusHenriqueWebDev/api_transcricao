import * as Yup from "yup";
import AppError from "../../errors/AppError";
import Schedule from "../../models/Schedule";

interface Request {
  body: string;
  sendAt: string;
  contactId: number | string;
  companyId: number | string;
  userId?: number | string;
  whatsappId?: number | string;
  queueId?: number | string;
  status?: string;
  atendenteId?: number | string;
  ticketStatus?: string;
  recurrence?: boolean;
  recurrenceInterval?: string;
  recurrenceValue?: number;
  recurrenceCount?: number;
  recurrenceDayOptions?: string;
  openTicket?: boolean;
  sendSignature?: boolean;
}

const CreateService = async ({
  body,
  sendAt,
  contactId,
  companyId,
  userId,
  whatsappId,
  status,
  atendenteId,
  queueId,
  ticketStatus = "open",
  recurrence = false,
  recurrenceInterval = "none",
  recurrenceValue = 0,
  recurrenceCount = 1,
  recurrenceDayOptions = "normal",
  openTicket = true,
  sendSignature = false
}: Request): Promise<Schedule> => {
  const schema = Yup.object().shape({
    body: Yup.string().required().min(5),
    sendAt: Yup.string().required()
  });

  try {
    await schema.validate({ body, sendAt });
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const schedule = await Schedule.create(
    {
      body,
      sendAt,
      contactId,
      companyId,
      userId,
      whatsappId,
      queueId,
      status,
      atendenteId,
      ticketStatus,
      recurrence,
      recurrenceInterval,
      recurrenceValue,
      recurrenceCount,
      recurrenceDayOptions,
      openTicket,
      sendSignature,
      whatsappData: null,
      queueData: null,
      userData: null
    }
  );

  await schedule.reload();

  return schedule;
};

export default CreateService;