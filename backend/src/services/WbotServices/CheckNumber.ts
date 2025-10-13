import AppError from "../../errors/AppError";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import { getWbot } from "../../libs/wbot";

const CheckContactNumber = async (
  number: string, 
  companyId: number,
  channel: string = "whatsapp"
): Promise<string> => {
  if(channel != "whatsapp"){
    return number; 
  }
  const isFacebookInstagram = 
    number.length > 15 || 
    !/^\d+$/.test(number) || 
    number.startsWith("100") || 
    number.startsWith("535") ||
    number.startsWith("101") ||
    number.length === 15;

  if (isFacebookInstagram) {
    return number;
  }

  try {
    const wahtsappList = await GetDefaultWhatsApp(companyId);
    const wbot = getWbot(wahtsappList.id);
    
    const isGroup = number.endsWith("@g.us");
    let numberArray;
    
    if (isGroup) {
      const grupoMeta = await wbot.groupMetadata(number);
      numberArray = [
        {
          jid: grupoMeta.id,
          exists: true
        }
      ];
    } else {
      numberArray = await wbot.onWhatsApp(`${number}@s.whatsapp.net`);
    }

    const isNumberExit = numberArray;

    if (!isNumberExit[0]?.exists) {
      throw new AppError("Este número não está cadastrado no whatsapp");
    }

    return isGroup ? number.split("@")[0] : isNumberExit[0].jid.split("@")[0];
  } catch (err: any) {
    console.error("❌ Erro na verificação de número WhatsApp:", err.message);
    
    if (err.message === "ERR_WAPP_NOT_INITIALIZED") {
      throw new AppError("ERR_WAPP_NOT_INITIALIZED");
    }
    throw err;
  }
};

export default CheckContactNumber;