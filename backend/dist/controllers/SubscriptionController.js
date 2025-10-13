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
exports.cancelMercadoPagoPayment = exports.checkMercadoPagoPaymentStatus = exports.mercadoPagoWebhook = exports.createMercadoPagoPayment = exports.webhook = exports.createWebhook = exports.createSubscription = exports.index = void 0;
const express_1 = __importDefault(require("express"));
const Yup = __importStar(require("yup"));
const gn_api_sdk_typescript_1 = __importDefault(require("gn-api-sdk-typescript"));
const AppError_1 = __importDefault(require("../errors/AppError"));
const Gn_1 = __importDefault(require("../config/Gn"));
const Company_1 = __importDefault(require("../models/Company"));
const Invoices_1 = __importDefault(require("../models/Invoices"));
const MercadoPagoService_1 = __importDefault(require("../services/MercadoPagoServices/MercadoPagoService"));
const socket_1 = require("../libs/socket");
const app = (0, express_1.default)();
const index = async (req, res) => {
    const gerencianet = (0, gn_api_sdk_typescript_1.default)(Gn_1.default);
    return res.json(gerencianet.getSubscriptions());
};
exports.index = index;
const createSubscription = async (req, res) => {
    const gerencianet = (0, gn_api_sdk_typescript_1.default)(Gn_1.default);
    const { companyId } = req.user;
    const schema = Yup.object().shape({
        price: Yup.string().required(),
        users: Yup.string().required(),
        connections: Yup.string().required()
    });
    if (!(await schema.isValid(req.body))) {
        throw new AppError_1.default("Validation fails", 400);
    }
    const { firstName, price, users, connections, address2, city, state, zipcode, country, plan, invoiceId } = req.body;
    const body = {
        calendario: {
            expiracao: 3600
        },
        valor: {
            original: price.toLocaleString("pt-br", { minimumFractionDigits: 2 }).replace(",", ".")
        },
        chave: process.env.GERENCIANET_PIX_KEY,
        solicitacaoPagador: `#Fatura:${invoiceId}`
    };
    try {
        const pix = await gerencianet.pixCreateImmediateCharge(null, body);
        const qrcode = await gerencianet.pixGenerateQRCode({
            id: pix.loc.id
        });
        const updateCompany = await Company_1.default.findOne();
        if (!updateCompany) {
            throw new AppError_1.default("Company not found", 404);
        }
        /*     await Subscriptions.create({
              companyId,
              isActive: false,
              userPriceCents: users,
              whatsPriceCents: connections,
              lastInvoiceUrl: pix.location,
              lastPlanChange: new Date(),
              providerSubscriptionId: pix.loc.id,
              expiresAt: new Date()
            }); */
        /*     const { id } = req.user;
            const userData = {};
            const userId = id;
            const requestUserId = parseInt(id);
            const user = await UpdateUserService({ userData, userId, companyId, requestUserId }); */
        /*     const io = getIO();
            io.emit("user", {
              action: "update",
              user
            }); */
        return res.json({
            ...pix,
            qrcode,
        });
    }
    catch (error) {
        throw new AppError_1.default("Validation fails", 400);
    }
};
exports.createSubscription = createSubscription;
const createWebhook = async (req, res) => {
    const schema = Yup.object().shape({
        chave: Yup.string().required(),
        url: Yup.string().required()
    });
    if (!(await schema.isValid(req.body))) {
        throw new AppError_1.default("Validation fails", 400);
    }
    const { chave, url } = req.body;
    const body = {
        webhookUrl: url
    };
    const params = {
        chave
    };
    try {
        const gerencianet = (0, gn_api_sdk_typescript_1.default)(Gn_1.default);
        const create = await gerencianet.pixConfigWebhook(params, body);
        return res.json(create);
    }
    catch (error) {
        console.log(error);
    }
};
exports.createWebhook = createWebhook;
const webhook = async (req, res) => {
    const { type } = req.params;
    const { evento } = req.body;
    if (evento === "teste_webhook") {
        return res.json({ ok: true });
    }
    if (req.body.pix) {
        const gerencianet = (0, gn_api_sdk_typescript_1.default)(Gn_1.default);
        req.body.pix.forEach(async (pix) => {
            const detahe = await gerencianet.pixDetailCharge({
                txid: pix.txid
            });
            if (detahe.status === "CONCLUIDA") {
                const { solicitacaoPagador } = detahe;
                const invoiceID = solicitacaoPagador.replace("#Fatura:", "");
                const invoices = await Invoices_1.default.findByPk(invoiceID);
                const companyId = invoices.companyId;
                const company = await Company_1.default.findByPk(companyId);
                const expiresAt = new Date(company.dueDate);
                expiresAt.setDate(expiresAt.getDate() + 30);
                const date = expiresAt.toISOString().split("T")[0];
                if (company) {
                    await company.update({
                        dueDate: date
                    });
                    const invoi = await invoices.update({
                        id: invoiceID,
                        status: 'paid'
                    });
                    await company.reload();
                    const io = (0, socket_1.getIO)();
                    const companyUpdate = await Company_1.default.findOne({
                        where: {
                            id: companyId
                        }
                    });
                    io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-payment`, {
                        action: detahe.status,
                        company: companyUpdate
                    });
                }
            }
        });
    }
    return res.json({ ok: true });
};
exports.webhook = webhook;
const createMercadoPagoPayment = async (req, res) => {
    const schema = Yup.object().shape({
        invoiceId: Yup.number().required(),
        paymentMethod: Yup.string().required(),
        document: Yup.string().required().min(11).max(14)
    });
    if (!(await schema.isValid(req.body))) {
        throw new AppError_1.default("Validation fails", 400);
    }
    const { invoiceId, paymentMethod, document } = req.body;
    const invoice = await Invoices_1.default.findByPk(invoiceId);
    if (!invoice) {
        throw new AppError_1.default("Invoice not found", 404);
    }
    const company = await Company_1.default.findByPk(invoice.companyId);
    if (!company) {
        throw new AppError_1.default("Company not found", 404);
    }
    if (document) {
        await company.update({ document });
    }
    if (paymentMethod === "MERCADOPAGO") {
        try {
            const mpService = new MercadoPagoService_1.default();
            const paymentData = {
                invoiceId: String(invoiceId),
                description: `Fatura ${invoice.id} - ${invoice.detail}`,
                amount: invoice.value,
                email: company.email,
                name: company.name,
                cpf: document,
                phone: company.phone,
                returnUrl: process.env.FRONTEND_URL
            };
            const pixData = await mpService.createPayment(paymentData);
            await invoice.update({
                paymentMethod: "MERCADOPAGO",
                paymentId: pixData.id
            });
            return res.status(200).json({
                id: pixData.id,
                qr_code: pixData.qr_code,
                qr_code_base64: pixData.qr_code_base64,
                external_reference: pixData.external_reference
            });
        }
        catch (error) {
            console.error(error);
            throw new AppError_1.default("Error creating Mercado Pago payment", 500);
        }
    }
    else {
        throw new AppError_1.default("Invalid payment method", 400);
    }
};
exports.createMercadoPagoPayment = createMercadoPagoPayment;
const mercadoPagoWebhook = async (req, res) => {
    const { data_id, type } = req.query; // Mercado Pago envia data_id e type
    if (!data_id || type !== "payment") {
        return res.status(200).end();
    }
    try {
        const mpService = new MercadoPagoService_1.default();
        const paymentInfo = await mpService.getPaymentStatus(data_id);
        if (paymentInfo.status === "approved") {
            const invoiceId = parseInt(paymentInfo.external_reference);
            const invoice = await Invoices_1.default.findByPk(invoiceId);
            if (invoice) {
                const company = await Company_1.default.findByPk(invoice.companyId);
                if (company) {
                    // Atualizar data de vencimento e status da fatura
                    const expiresAt = new Date(company.dueDate);
                    expiresAt.setDate(expiresAt.getDate() + 30);
                    const date = expiresAt.toISOString().split("T")[0];
                    await company.update({ dueDate: date });
                    await invoice.update({ status: "paid" });
                    // Notificar o frontend sobre a mudança de status
                    const io = (0, socket_1.getIO)();
                    const companyUpdate = await Company_1.default.findOne({
                        where: { id: company.id }
                    });
                    io.to(`company-${company.id}-mainchannel`).emit(`company-${company.id}-payment`, {
                        action: "approved",
                        company: companyUpdate
                    });
                }
            }
        }
        return res.status(200).json({ success: true });
    }
    catch (error) {
        console.error("Erro ao processar webhook do Mercado Pago:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
};
exports.mercadoPagoWebhook = mercadoPagoWebhook;
const checkMercadoPagoPaymentStatus = async (req, res) => {
    const schema = Yup.object().shape({
        invoiceId: Yup.number().required()
    });
    if (!(await schema.isValid(req.body))) {
        throw new AppError_1.default("Validation fails", 400);
    }
    const { invoiceId } = req.body;
    try {
        const invoice = await Invoices_1.default.findByPk(invoiceId);
        if (!invoice) {
            throw new AppError_1.default("Invoice not found", 404);
        }
        if (invoice.status === 'paid') {
            return res.status(200).json({ message: "Invoice already paid", invoice });
        }
        if (!invoice.paymentId) {
            throw new AppError_1.default("This invoice has no payment ID", 400);
        }
        const mpService = new MercadoPagoService_1.default();
        const paymentInfo = await mpService.getPaymentStatus(invoice.paymentId);
        console.log("Payment info retrieved:", paymentInfo);
        if (paymentInfo.status === "approved") {
            const company = await Company_1.default.findByPk(invoice.companyId);
            if (!company) {
                throw new AppError_1.default("Company not found", 404);
            }
            // Atualizar data de vencimento e status da fatura
            const expiresAt = new Date(company.dueDate);
            expiresAt.setDate(expiresAt.getDate() + 31);
            const date = expiresAt.toISOString().split("T")[0];
            await company.update({ dueDate: date });
            await invoice.update({ status: "paid" });
            // Notificar o frontend sobre a mudança de status
            const io = (0, socket_1.getIO)();
            const companyUpdate = await Company_1.default.findOne({
                where: { id: company.id }
            });
            io.to(`company-${company.id}-mainchannel`).emit(`company-${company.id}-payment`, {
                action: "approved",
                company: companyUpdate
            });
            return res.status(200).json({
                message: "Payment confirmed and invoice updated",
                status: paymentInfo.status,
                invoice: await Invoices_1.default.findByPk(invoiceId)
            });
        }
        else {
            return res.status(200).json({
                message: "Payment not yet approved",
                status: paymentInfo.status
            });
        }
    }
    catch (error) {
        console.error("Error checking payment status:", error);
        throw new AppError_1.default("Error verifying payment status", 500);
    }
};
exports.checkMercadoPagoPaymentStatus = checkMercadoPagoPaymentStatus;
// Adicionar após o método checkMercadoPagoPaymentStatus
const cancelMercadoPagoPayment = async (req, res) => {
    const schema = Yup.object().shape({
        invoiceId: Yup.number().required()
    });
    if (!(await schema.isValid(req.body))) {
        throw new AppError_1.default("Validation fails", 400);
    }
    const { invoiceId } = req.body;
    try {
        const invoice = await Invoices_1.default.findByPk(invoiceId);
        if (!invoice) {
            throw new AppError_1.default("Invoice not found", 404);
        }
        if (invoice.status === 'paid') {
            return res.status(200).json({ message: "Cannot cancel a paid invoice", invoice });
        }
        if (!invoice.paymentId) {
            throw new AppError_1.default("This invoice has no payment ID", 400);
        }
        // Adicione este método à classe MercadoPagoService
        const mpService = new MercadoPagoService_1.default();
        const cancelResult = await mpService.cancelPayment(invoice.paymentId);
        // Atualizar o status da fatura para 'cancelled'
        await invoice.update({
            status: "cancelled",
            updatedAt: new Date()
        });
        // Notificar o frontend sobre o cancelamento
        const io = (0, socket_1.getIO)();
        io.to(`company-${invoice.companyId}-mainchannel`).emit(`company-${invoice.companyId}-invoice`, {
            action: "update",
            invoice
        });
        return res.status(200).json({
            message: "Payment cancelled successfully",
            invoice: await Invoices_1.default.findByPk(invoiceId)
        });
    }
    catch (error) {
        console.error("Error cancelling payment:", error);
        throw new AppError_1.default("Error cancelling payment", 500);
    }
};
exports.cancelMercadoPagoPayment = cancelMercadoPagoPayment;
