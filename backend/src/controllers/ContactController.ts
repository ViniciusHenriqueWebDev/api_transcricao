import * as Yup from "yup";
import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import ListContactsService from "../services/ContactServices/ListContactsService";
import CreateContactService from "../services/ContactServices/CreateContactService";
import ShowContactService from "../services/ContactServices/ShowContactService";
import UpdateContactService from "../services/ContactServices/UpdateContactService";
import DeleteContactService from "../services/ContactServices/DeleteContactService";
import GetContactService from "../services/ContactServices/GetContactService";

import CheckContactNumber from "../services/WbotServices/CheckNumber";
import CheckIsValidContact from "../services/WbotServices/CheckIsValidContact";
import GetProfilePicUrl from "../services/WbotServices/GetProfilePicUrl";
import AppError from "../errors/AppError";
import SimpleListService, {
  SearchContactParams
} from "../services/ContactServices/SimpleListService";
import ContactCustomField from "../models/ContactCustomField";
import NumberSimpleListService from "../services/ContactServices/NumberSimpleListService";
import ToggleDisableBotContactService from "../services/ContactServices/ToggleDisableBotContactService";
import CreateOrUpdateContactServiceForImport from "../services/ContactServices/CreateOrUpdateContactServiceForImport";
import Contact from "../models/Contact";
import { restartWbot } from "../libs/wbot";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
};

type IndexGetContactQuery = {
  name: string;
  number: string;
};

interface ExtraInfo extends ContactCustomField {
  name: string;
  value: string;
}
interface ContactData {
  name: string;
  number: string;
  email?: string;
  extraInfo?: ExtraInfo[];
  disableBot?: boolean;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber } = req.query as IndexQuery;
  const { companyId } = req.user;

  const { contacts, count, hasMore } = await ListContactsService({
    searchParam,
    pageNumber,
    companyId
  });

  return res.json({ contacts, count, hasMore });
};

export const getContact = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { name, number } = req.body as IndexGetContactQuery;
  const { companyId } = req.user;

  const contact = await GetContactService({
    name,
    number,
    companyId
  });

  return res.status(200).json(contact);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const newContact: ContactData = req.body;
  newContact.number = newContact.number.replace("-", "").replace(" ", "");

  const schema = Yup.object().shape({
    name: Yup.string().required(),
    number: Yup.string().required()
  });

  try {
    await schema.validate(newContact);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  let validNumber = newContact.number;
  let profilePicUrl = "";

  const isFacebookInstagram = (number: string): boolean => {
    return number.length > 15 ||
      !/^\d+$/.test(number) ||
      number.startsWith("100") ||
      number.startsWith("535") ||
      number.startsWith("101") ||
      number.length === 15;
  };

  if (!isFacebookInstagram(newContact.number)) {
    try {
      await CheckIsValidContact(newContact.number, companyId);
      validNumber = await CheckContactNumber(newContact.number, companyId);
    } catch (whatsappError: any) {
      // Captura statusCode do erro (caso seja Boom)
      const statusCode = whatsappError?.output?.statusCode || whatsappError?.statusCode;

      // Lista de mensagens/erros que indicam sessão inválida ou conexão perdida
      const sessionErrors = [
        "ERR_WAPP_NOT_INITIALIZED",
        "ERR_WAPP_CHECK_CONTACT",
        "Connection Closed",
        "Connection Terminated",
        "ERR_WAPP_INVALID_CONTACT"
      ];

      if (
        sessionErrors.includes(whatsappError?.message) ||
        statusCode === 428 ||
        statusCode === 401 ||
        statusCode === 440 ||
        statusCode === 503
      ) {
        await restartWbot(companyId);
        // Tenta validar novamente após o restart
        try {
          await CheckIsValidContact(newContact.number, companyId);
          validNumber = await CheckContactNumber(newContact.number, companyId);
        } catch (err) {
          return res.status(400).json({
            error: "Não foi possível validar o número do WhatsApp. Tente novamente em instantes."
          });
        }
      } else {
        return res.status(400).json({
          error: "Este contato não é do WhatsApp ou WhatsApp não está conectado"
        });
      }
    }
  } else {
    console.log("📘 Criando contato Facebook/Instagram sem validação WhatsApp");
  }

  try {
    const contact = await CreateContactService({
      ...newContact,
      number: validNumber,
      profilePicUrl,
      companyId
    });

    const io = getIO();
    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-contact`, {
      action: "create",
      contact
    });

    return res.status(200).json(contact);
  } catch (error: any) {
    console.error("❌ Erro ao criar contato:", error);

    return res.status(400).json({
      error: "Erro ao criar contato"
    });
  }
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { contactId } = req.params;
  const { companyId } = req.user;

  const contact = await ShowContactService(contactId, companyId);

  return res.status(200).json(contact);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const contactData: ContactData = req.body;
  const { companyId } = req.user;

  const schema = Yup.object().shape({
    name: Yup.string(),
    number: Yup.string()
  });

  try {
    await schema.validate(contactData);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const { contactId } = req.params;

  let validNumber = contactData.number;

  const isFacebookInstagram =
    contactData.number.length > 15 ||
    !/^\d+$/.test(contactData.number) ||
    contactData.number.startsWith("100") ||
    contactData.number.startsWith("535") ||
    contactData.number.startsWith("101") ||
    contactData.number.length === 15;

  if (!isFacebookInstagram) {
    try {
      await CheckIsValidContact(contactData.number, companyId);
      validNumber = await CheckContactNumber(contactData.number, companyId);
    } catch (whatsappError: any) {
      console.log("⚠️ Erro WhatsApp na atualização:", whatsappError?.message, whatsappError?.output?.statusCode);

      // Captura statusCode do erro (caso seja Boom)
      const statusCode = whatsappError?.output?.statusCode || whatsappError?.statusCode;

      // Lista de mensagens/erros que indicam sessão inválida ou conexão perdida
      const sessionErrors = [
        "ERR_WAPP_NOT_INITIALIZED",
        "ERR_WAPP_CHECK_CONTACT",
        "Connection Closed",
        "Connection Terminated",
        "ERR_WAPP_INVALID_CONTACT"
      ];

      // Se for erro conhecido de sessão/conexão, ou statusCode 428 (Connection Terminated), tenta restart
      if (
        sessionErrors.includes(whatsappError?.message) ||
        statusCode === 428 ||
        statusCode === 401 || // Não autorizado (sessão expirada)
        statusCode === 440 || // Sessão expirada (custom)
        statusCode === 503    // Serviço indisponível
      ) {
        await restartWbot(companyId);
        // Tenta validar novamente após o restart
        try {
          await CheckIsValidContact(contactData.number, companyId);
          validNumber = await CheckContactNumber(contactData.number, companyId);
        } catch (err) {
          return res.status(400).json({
            error: "Não foi possível validar o número do WhatsApp. Tente novamente em instantes."
          });
        }
      } else {
        return res.status(400).json({
          error: "Este contato não é do WhatsApp ou WhatsApp não está conectado"
        });
      }
    }
  }

  contactData.number = validNumber;

  const contact = await UpdateContactService({
    contactData,
    contactId,
    companyId
  });

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-contact`, {
    action: "update",
    contact
  });

  return res.status(200).json(contact);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { contactId } = req.params;
  const { companyId } = req.user;

  await ShowContactService(contactId, companyId);

  await DeleteContactService(contactId);

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-contact`, {
    action: "delete",
    contactId
  });

  return res.status(200).json({ message: "Contact deleted" });
};

export const list = async (req: Request, res: Response): Promise<Response> => {
  const { name } = req.query as unknown as SearchContactParams;
  const { companyId } = req.user;

  const contacts = await SimpleListService({ name, companyId });

  return res.json(contacts);
};

export const getContactProfileURL = async (req: Request, res: Response) => {
  const { number } = req.params
  const { companyId } = req.user;

  if (number) {
    const validNumber = await CheckContactNumber(number, companyId);

    const profilePicUrl = await GetProfilePicUrl(validNumber, companyId);

    const contact = await NumberSimpleListService({ number: validNumber, companyId: companyId })

    let obj: any;
    if (contact.length > 0) {
      obj = {
        contactId: contact[0].id,
        profilePicUrl: profilePicUrl
      }
    } else {
      obj = {
        contactId: 0,
        profilePicUrl: profilePicUrl
      }
    }
    return res.status(200).json(obj);
  }
};

export const toggleDisableBot = async (req: Request, res: Response): Promise<Response> => {
  var { contactId } = req.params;
  const { companyId } = req.user;
  const contact = await ToggleDisableBotContactService({ contactId });

  const io = getIO();

  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-contact`, {
    action: "update",
    contact
  });

  return res.status(200).json(contact);
};

export const importXls = async (req: Request, res: Response): Promise<Response> => {

  const { companyId } = req.user;
  const { number, name, email } = req.body;
  const simpleNumber = number.replace(/[^\d.-]+/g, '');
  console.log("simpleNumber> ", simpleNumber)
  console.log("name> ", name)
  const validNumber = await CheckContactNumber(simpleNumber, companyId);
  console.log("60", validNumber)
  /**
   * Código desabilitado por demora no retorno
   */
  //
  const profilePicUrl = await GetProfilePicUrl(validNumber, companyId);

  const contactData = {
    name: `${name}`,
    number: validNumber,
    profilePicUrl,
    isGroup: false,
    email,
    companyId
  };

  const contact = await CreateOrUpdateContactServiceForImport(contactData);

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-contact`, {
    action: "create",
    contact
  });

  return res.status(200).json(contact);
};

export const deleteAllContactsFromCompanie = async (req: Request, res: Response): Promise<Response> => {

  const { companyId } = req.user;

  const contacts = await Contact.findAll({
    where: { companyId }
  });

  contacts.forEach(async (contact) => {
    await DeleteContactService(contact.id.toString());
  });

  const io = getIO();
  io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-contact`, {
    action: "delete",
    contactId: 0
  });

  return res.status(200).json({ message: "Contacts deleted" });
}