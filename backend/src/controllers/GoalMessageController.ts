import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import Whatsapp from "../models/Whatsapp";
import AppError from "../errors/AppError";
import GetWbot from "../helpers/GetWbot";

interface GoalMessageData {
  whatsappId: number;
  number: string;
  body: string;
  goalId: number;
  employeeId: number;
}

export const sendGoalMessage = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId, number, body, goalId, employeeId }: GoalMessageData = req.body;
  const { companyId } = req.user;

  try {
    // Encontrar a conexão do WhatsApp
    const whatsapp = await Whatsapp.findOne({
      where: { id: whatsappId, companyId }
    });

    if (!whatsapp) {
      throw new AppError("Conexão de WhatsApp não encontrada", 404);
    }
    if (whatsapp.status !== "CONNECTED") {
      throw new AppError("WhatsApp não está conectado", 400);
    }
    let formattedNumber = number.replace(/\D/g, "");
    if (!formattedNumber || formattedNumber.length < 10) {
      throw new AppError("Número de telefone inválido", 400);
    }
    if (!formattedNumber.includes("@")) {
      formattedNumber = `${formattedNumber}@s.whatsapp.net`;
    }
    const wbot = await GetWbot(whatsapp);
    const sentMessage = await wbot.sendMessage(
      formattedNumber,
      { text: body }
    );
    const io = getIO();
    io.to(`company-${companyId}-goal`).emit("goal-message", {
      message: body,
      goalId,
      employeeId,
      whatsappId
    });

    return res.status(200).json({
      status: "success",
      message: "Mensagem enviada com sucesso",
      data: {
        messageId: sentMessage.key.id,
        timestamp: sentMessage.messageTimestamp
      }
    });
  } catch (err) {
    console.error("Erro ao enviar mensagem:", err);
    
    if (err instanceof AppError) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    
    const errorMsg = err.message || "Erro ao enviar mensagem";
    return res.status(500).json({ 
      error: `${errorMsg}. Verifique se o número está correto e se a conexão está ativa.` 
    });
  }
};