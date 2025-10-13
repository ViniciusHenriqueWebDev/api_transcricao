import { WASocket } from "@whiskeysockets/baileys";
import AppError from "../errors/AppError";
import Whatsapp from "../models/Whatsapp";
import { getWbot } from "../libs/wbot";

const GetWbot = async (whatsapp: Whatsapp): Promise<WASocket> => {
  const wbot = getWbot(whatsapp.id);

  if (!wbot) {
    throw new AppError("ERR_WAPP_NOT_INITIALIZED");
  }

  return wbot;
};

export default GetWbot;