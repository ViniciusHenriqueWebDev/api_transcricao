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
exports.seachUserFromNumber = exports.sendCodeVerifycation = exports.getVerificationData = exports.sendEmail = exports.verificationCodes = exports.transporter = exports.getAllUsers = exports.updatePassword = void 0;
const nodemailer = __importStar(require("nodemailer"));
const randomstring = __importStar(require("randomstring"));
const User_1 = __importDefault(require("../models/User"));
const GetDefaultWhatsApp_1 = __importDefault(require("../helpers/GetDefaultWhatsApp"));
const GetWhatsappWbot_1 = __importDefault(require("../helpers/GetWhatsappWbot"));
const updatePassword = async (req, res) => {
    const { userId, newPassword } = req.body;
    console.log('Dados recebidos para atualização de senha:', userId, newPassword);
    try {
        const userToUpdate = await User_1.default.findByPk(userId);
        if (userToUpdate) {
            userToUpdate.password = newPassword;
            await userToUpdate.save();
            res.status(200).json({ message: 'Senha atualizada com sucesso.' });
        }
        else {
            res.status(404).json({ error: 'Usuário não encontrado.' });
        }
    }
    catch (error) {
        console.error('Erro ao atualizar senha:', error);
        res.status(500).json({ error: 'Erro ao atualizar senha.' });
    }
};
exports.updatePassword = updatePassword;
const getAllUsers = async (req, res) => {
    try {
        const users = await User_1.default.findAll();
        res.status(200).json(users);
    }
    catch (error) {
        console.error('Erro ao buscar usuários:', error);
        res.status(500).json({ error: 'Erro ao buscar usuários.' });
    }
};
exports.getAllUsers = getAllUsers;
exports.transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    secure: false,
    port: 587,
    auth: {
        user: process.env.MAIL_USERNAME,
        pass: process.env.MAIL_PASSWORD,
    },
    debug: true,
    connectionTimeout: 80000,
});
exports.verificationCodes = {};
const generateRandomCode = () => {
    return randomstring.generate({
        length: 6,
        charset: 'numeric',
    });
};
const sendEmail = async (req, res) => {
    const { email } = req.body;
    console.log('Email recebido para envio:', email);
    const verificationCode = generateRandomCode();
    // Armazenar código e timestamp no objeto
    exports.verificationCodes[email] = {
        code: verificationCode,
        timestamp: Date.now(),
    };
    // Agendar a remoção do código após 5 minutos
    setTimeout(() => {
        delete exports.verificationCodes[email];
        console.log(`Código para ${email} removido após 5 minutos.`);
    }, 5 * 60 * 1000); // 5 minutos em milissegundos
    const mailOptions = {
        from: process.env.MAIL_FROM,
        to: `${email}`,
        subject: 'Código de Verificação',
        text: `Seu código de verificação é: ${verificationCode}`,
    };
    try {
        const info = await exports.transporter.sendMail(mailOptions);
        console.log('E-mail enviado:', info.response);
        res.status(200).json({ message: 'E-mail enviado com sucesso!' });
    }
    catch (error) {
        console.error('Erro ao enviar e-mail:', error);
        res.status(500).json({ error: 'Erro ao enviar e-mail.' });
    }
};
exports.sendEmail = sendEmail;
const getVerificationData = (req, res) => {
    const { email } = req.params;
    // Verificar se há dados de verificação para o e-mail fornecido
    if (exports.verificationCodes[email]) {
        res.status(200).json(exports.verificationCodes[email]);
    }
    else {
        res.status(404).json({ error: 'Nenhum código de verificação encontrado para o e-mail fornecido.' });
    }
};
exports.getVerificationData = getVerificationData;
const sendCodeVerifycation = async (req, res) => {
    try {
        const { wpp } = req.body;
        const user = await (0, exports.seachUserFromNumber)(wpp);
        const verificationCode = generateRandomCode();
        // Armazenar código e timestamp no objeto
        exports.verificationCodes[wpp] = {
            code: verificationCode,
            timestamp: Date.now(),
        };
        // Agendar a remoção do código após 5 minutos
        setTimeout(() => {
            delete exports.verificationCodes[wpp];
            console.log(`Código para ${wpp} removido após 5 minutos.`);
        }, 5 * 60 * 1000); // 5 minutos em milissegundos
        const message = `\u200e Seu código de verificação é: ${verificationCode}`;
        if (!user) {
            res.status(500).json({ error: 'Nenhum usuário encontrado com esse Whatsapp cadastrado.' });
        }
        const whatsapp = await (0, GetDefaultWhatsApp_1.default)(user?.companyId);
        const wbot = await (0, GetWhatsappWbot_1.default)(whatsapp);
        await wbot.sendMessage(`${wpp}@s.whatsapp.net`, { text: message });
        res.status(200).json({ message: 'Código enviado com sucesso!', userId: user?.id });
    }
    catch (error) {
        console.error('Erro ao enviar código de verificação:', error);
        res.status(500).json({ error: 'Erro ao enviar código de verificação. ' + error });
    }
};
exports.sendCodeVerifycation = sendCodeVerifycation;
const seachUserFromNumber = async (number) => {
    try {
        const user = await User_1.default.findOne({
            where: {
                wpp: number
            }
        });
        return user;
    }
    catch (error) {
        return null;
    }
};
exports.seachUserFromNumber = seachUserFromNumber;
