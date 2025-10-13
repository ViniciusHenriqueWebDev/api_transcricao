import AppError from "../../errors/AppError";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { getWbot } from "../../libs/wbot";

const CheckIsValidContact = async (
  number: string,
  companyId: number,
  channel: string = "whatsapp"
): Promise<void> => {
  if(channel != "whatsapp"){
    return; 
  }

  try {
    const defaultWhatsapp = await GetDefaultWhatsApp(companyId);
    const wbot = getWbot(defaultWhatsapp.id);

    const isValidNumber = await wbot.onWhatsApp(`${number}`);
    if (!isValidNumber) {
      throw new AppError("invalidNumber");
    }
  } catch (err: any) {
    console.error("❌ Erro na validação WhatsApp:", err.message);
    
    if (err.message === "invalidNumber") {
      throw new AppError("ERR_WAPP_INVALID_CONTACT");
    }
    if (err.message === "ERR_WAPP_NOT_INITIALIZED") {
      throw new AppError("ERR_WAPP_NOT_INITIALIZED");
    }
    throw new AppError("ERR_WAPP_CHECK_CONTACT");
  }
};

export default CheckIsValidContact;