"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAllContactsFromCompanie = exports.importXls = exports.toggleDisableBot = exports.getContactProfileURL = exports.list = exports.remove = exports.update = exports.show = exports.store = exports.getContact = exports.index = void 0;
const Yup = __importStar(require("yup"));
const socket_1 = require("../libs/socket");
const ListContactsService_1 = __importDefault(require("../services/ContactServices/ListContactsService"));
const CreateContactService_1 = __importDefault(require("../services/ContactServices/CreateContactService"));
const ShowContactService_1 = __importDefault(require("../services/ContactServices/ShowContactService"));
const UpdateContactService_1 = __importDefault(require("../services/ContactServices/UpdateContactService"));
const DeleteContactService_1 = __importDefault(require("../services/ContactServices/DeleteContactService"));
const GetContactService_1 = __importDefault(require("../services/ContactServices/GetContactService"));
const CheckNumber_1 = __importDefault(require("../services/WbotServices/CheckNumber"));
const CheckIsValidContact_1 = __importDefault(require("../services/WbotServices/CheckIsValidContact"));
const GetProfilePicUrl_1 = __importDefault(require("../services/WbotServices/GetProfilePicUrl"));
const AppError_1 = __importDefault(require("../errors/AppError"));
const SimpleListService_1 = __importDefault(require("../services/ContactServices/SimpleListService"));
const NumberSimpleListService_1 = __importDefault(require("../services/ContactServices/NumberSimpleListService"));
const ToggleDisableBotContactService_1 = __importDefault(require("../services/ContactServices/ToggleDisableBotContactService"));
const CreateOrUpdateContactServiceForImport_1 = __importDefault(require("../services/ContactServices/CreateOrUpdateContactServiceForImport"));
const Contact_1 = __importDefault(require("../models/Contact"));
const wbot_1 = require("../libs/wbot");
const index = async (req, res) => {
    const { searchParam, pageNumber } = req.query;
    const { companyId } = req.user;
    const { contacts, count, hasMore } = await (0, ListContactsService_1.default)({
        searchParam,
        pageNumber,
        companyId
    });
    return res.json({ contacts, count, hasMore });
};
exports.index = index;
const getContact = async (req, res) => {
    const { name, number } = req.body;
    const { companyId } = req.user;
    const contact = await (0, GetContactService_1.default)({
        name,
        number,
        companyId
    });
    return res.status(200).json(contact);
};
exports.getContact = getContact;
const store = async (req, res) => {
    const { companyId } = req.user;
    const newContact = req.body;
    newContact.number = newContact.number.replace("-", "").replace(" ", "");
    const schema = Yup.object().shape({
        name: Yup.string().required(),
        number: Yup.string().required()
    });
    try {
        await schema.validate(newContact);
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    let validNumber = newContact.number;
    let profilePicUrl = "";
    const isFacebookInstagram = (number) => {
        return number.length > 15 ||
            !/^\d+$/.test(number) ||
            number.startsWith("100") ||
            number.startsWith("535") ||
            number.startsWith("101") ||
            number.length === 15;
    };
    if (!isFacebookInstagram(newContact.number)) {
        try {
            await (0, CheckIsValidContact_1.default)(newContact.number, companyId);
            validNumber = await (0, CheckNumber_1.default)(newContact.number, companyId);
        }
        catch (whatsappError) {
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
            if (sessionErrors.includes(whatsappError?.message) ||
                statusCode === 428 ||
                statusCode === 401 ||
                statusCode === 440 ||
                statusCode === 503) {
                await (0, wbot_1.restartWbot)(companyId);
                // Tenta validar novamente após o restart
                try {
                    await (0, CheckIsValidContact_1.default)(newContact.number, companyId);
                    validNumber = await (0, CheckNumber_1.default)(newContact.number, companyId);
                }
                catch (err) {
                    return res.status(400).json({
                        error: "Não foi possível validar o número do WhatsApp. Tente novamente em instantes."
                    });
                }
            }
            else {
                return res.status(400).json({
                    error: "Este contato não é do WhatsApp ou WhatsApp não está conectado"
                });
            }
        }
    }
    else {
        console.log("📘 Criando contato Facebook/Instagram sem validação WhatsApp");
    }
    try {
        const contact = await (0, CreateContactService_1.default)({
            ...newContact,
            number: validNumber,
            profilePicUrl,
            companyId
        });
        const io = (0, socket_1.getIO)();
        io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-contact`, {
            action: "create",
            contact
        });
        return res.status(200).json(contact);
    }
    catch (error) {
        console.error("❌ Erro ao criar contato:", error);
        return res.status(400).json({
            error: "Erro ao criar contato"
        });
    }
};
exports.store = store;
const show = async (req, res) => {
    const { contactId } = req.params;
    const { companyId } = req.user;
    const contact = await (0, ShowContactService_1.default)(contactId, companyId);
    return res.status(200).json(contact);
};
exports.show = show;
const update = async (req, res) => {
    const contactData = req.body;
    const { companyId } = req.user;
    const schema = Yup.object().shape({
        name: Yup.string(),
        number: Yup.string()
    });
    try {
        await schema.validate(contactData);
    }
    catch (err) {
        throw new AppError_1.default(err.message);
    }
    const { contactId } = req.params;
    let validNumber = contactData.number;
    const isFacebookInstagram = contactData.number.length > 15 ||
        !/^\d+$/.test(contactData.number) ||
        contactData.number.startsWith("100") ||
        contactData.number.startsWith("535") ||
        contactData.number.startsWith("101") ||
        contactData.number.length === 15;
    if (!isFacebookInstagram) {
        try {
            await (0, CheckIsValidContact_1.default)(contactData.number, companyId);
            validNumber = await (0, CheckNumber_1.default)(contactData.number, companyId);
        }
        catch (whatsappError) {
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
            if (sessionErrors.includes(whatsappError?.message) ||
                statusCode === 428 ||
                statusCode === 401 || // Não autorizado (sessão expirada)
                statusCode === 440 || // Sessão expirada (custom)
                statusCode === 503 // Serviço indisponível
            ) {
                await (0, wbot_1.restartWbot)(companyId);
                // Tenta validar novamente após o restart
                try {
                    await (0, CheckIsValidContact_1.default)(contactData.number, companyId);
                    validNumber = await (0, CheckNumber_1.default)(contactData.number, companyId);
                }
                catch (err) {
                    return res.status(400).json({
                        error: "Não foi possível validar o número do WhatsApp. Tente novamente em instantes."
                    });
                }
            }
            else {
                return res.status(400).json({
                    error: "Este contato não é do WhatsApp ou WhatsApp não está conectado"
                });
            }
        }
    }
    contactData.number = validNumber;
    const contact = await (0, UpdateContactService_1.default)({
        contactData,
        contactId,
        companyId
    });
    const io = (0, socket_1.getIO)();
    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-contact`, {
        action: "update",
        contact
    });
    return res.status(200).json(contact);
};
exports.update = update;
const remove = async (req, res) => {
    const { contactId } = req.params;
    const { companyId } = req.user;
    await (0, ShowContactService_1.default)(contactId, companyId);
    await (0, DeleteContactService_1.default)(contactId);
    const io = (0, socket_1.getIO)();
    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-contact`, {
        action: "delete",
        contactId
    });
    return res.status(200).json({ message: "Contact deleted" });
};
exports.remove = remove;
const list = async (req, res) => {
    const { name } = req.query;
    const { companyId } = req.user;
    const contacts = await (0, SimpleListService_1.default)({ name, companyId });
    return res.json(contacts);
};
exports.list = list;
const getContactProfileURL = async (req, res) => {
    const { number } = req.params;
    const { companyId } = req.user;
    if (number) {
        const validNumber = await (0, CheckNumber_1.default)(number, companyId);
        const profilePicUrl = await (0, GetProfilePicUrl_1.default)(validNumber, companyId);
        const contact = await (0, NumberSimpleListService_1.default)({ number: validNumber, companyId: companyId });
        let obj;
        if (contact.length > 0) {
            obj = {
                contactId: contact[0].id,
                profilePicUrl: profilePicUrl
            };
        }
        else {
            obj = {
                contactId: 0,
                profilePicUrl: profilePicUrl
            };
        }
        return res.status(200).json(obj);
    }
};
exports.getContactProfileURL = getContactProfileURL;
const toggleDisableBot = async (req, res) => {
    var { contactId } = req.params;
    const { companyId } = req.user;
    const contact = await (0, ToggleDisableBotContactService_1.default)({ contactId });
    const io = (0, socket_1.getIO)();
    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-contact`, {
        action: "update",
        contact
    });
    return res.status(200).json(contact);
};
exports.toggleDisableBot = toggleDisableBot;
const importXls = async (req, res) => {
    const { companyId } = req.user;
    const { number, name, email } = req.body;
    const simpleNumber = number.replace(/[^\d.-]+/g, '');
    console.log("simpleNumber> ", simpleNumber);
    console.log("name> ", name);
    const validNumber = await (0, CheckNumber_1.default)(simpleNumber, companyId);
    console.log("60", validNumber);
    /**
     * Código desabilitado por demora no retorno
     */
    //
    const profilePicUrl = await (0, GetProfilePicUrl_1.default)(validNumber, companyId);
    const contactData = {
        name: `${name}`,
        number: validNumber,
        profilePicUrl,
        isGroup: false,
        email,
        companyId
    };
    const contact = await (0, CreateOrUpdateContactServiceForImport_1.default)(contactData);
    const io = (0, socket_1.getIO)();
    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-contact`, {
        action: "create",
        contact
    });
    return res.status(200).json(contact);
};
exports.importXls = importXls;
const deleteAllContactsFromCompanie = async (req, res) => {
    const { companyId } = req.user;
    const contacts = await Contact_1.default.findAll({
        where: { companyId }
    });
    contacts.forEach(async (contact) => {
        await (0, DeleteContactService_1.default)(contact.id.toString());
    });
    const io = (0, socket_1.getIO)();
    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-contact`, {
        action: "delete",
        contactId: 0
    });
    return res.status(200).json({ message: "Contacts deleted" });
};
exports.deleteAllContactsFromCompanie = deleteAllContactsFromCompanie;
