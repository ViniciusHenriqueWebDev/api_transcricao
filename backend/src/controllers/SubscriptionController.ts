import { Request, Response } from "express";
import express from "express";
import * as Yup from "yup";
import Gerencianet from "gn-api-sdk-typescript";
import AppError from "../errors/AppError";

import options from "../config/Gn";
import Company from "../models/Company";
import Invoices from "../models/Invoices";
import MercadoPagoService from "../services/MercadoPagoServices/MercadoPagoService"
import Subscriptions from "../models/Subscriptions";
import { getIO } from "../libs/socket";
import UpdateUserService from "../services/UserServices/UpdateUserService";

const app = express();

export const index = async (req: Request, res: Response): Promise<Response> => {
  const gerencianet = Gerencianet(options);
  return res.json(gerencianet.getSubscriptions());
};

export const createSubscription = async (
  req: Request,
  res: Response
  ): Promise<Response> => {
    const gerencianet = Gerencianet(options);
    const { companyId } = req.user;

  const schema = Yup.object().shape({
    price: Yup.string().required(),
    users: Yup.string().required(),
    connections: Yup.string().required()
  });

  if (!(await schema.isValid(req.body))) {
    throw new AppError("Validation fails", 400);
  }

  const {
    firstName,
    price,
    users,
    connections,
    address2,
    city,
    state,
    zipcode,
    country,
    plan,
    invoiceId
  } = req.body;

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

    const updateCompany = await Company.findOne();

    if (!updateCompany) {
      throw new AppError("Company not found", 404);
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
  } catch (error) {
    throw new AppError("Validation fails", 400);
  }
};

export const createWebhook = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const schema = Yup.object().shape({
    chave: Yup.string().required(),
    url: Yup.string().required()
  });

  if (!(await schema.isValid(req.body))) {
    throw new AppError("Validation fails", 400);
  }

  const { chave, url } = req.body;

  const body = {
    webhookUrl: url
  };

  const params = {
    chave
  };

  try {
    const gerencianet = Gerencianet(options);
    const create = await gerencianet.pixConfigWebhook(params, body);
    return res.json(create);
  } catch (error) {
    console.log(error);
  }
};

export const webhook = async (
  req: Request,
  res: Response
  ): Promise<Response> => {
  const { type } = req.params;
  const { evento } = req.body;
  if (evento === "teste_webhook") {
    return res.json({ ok: true });
  }
  if (req.body.pix) {
    const gerencianet = Gerencianet(options);
    req.body.pix.forEach(async (pix: any) => {
      const detahe = await gerencianet.pixDetailCharge({
        txid: pix.txid
      });

      if (detahe.status === "CONCLUIDA") {
        const { solicitacaoPagador } = detahe;
        const invoiceID = solicitacaoPagador.replace("#Fatura:", "");
        const invoices = await Invoices.findByPk(invoiceID);
        const companyId =invoices.companyId;
        const company = await Company.findByPk(companyId);

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
          const io = getIO();
          const companyUpdate = await Company.findOne({
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

export const createMercadoPagoPayment = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const schema = Yup.object().shape({
    invoiceId: Yup.number().required(),
    paymentMethod: Yup.string().required(),
    document: Yup.string().required().min(11).max(14)
  });

  if (!(await schema.isValid(req.body))) {
    throw new AppError("Validation fails", 400);
  }

  const { invoiceId, paymentMethod, document } = req.body;

  const invoice = await Invoices.findByPk(invoiceId);
  
  if (!invoice) {
    throw new AppError("Invoice not found", 404);
  }

  const company = await Company.findByPk(invoice.companyId);
  
  if (!company) {
    throw new AppError("Company not found", 404);
  }

  if (document) {
    await company.update({ document });
  }

  if (paymentMethod === "MERCADOPAGO") {
    try {
      const mpService = new MercadoPagoService();

      const paymentData = {
        invoiceId: String(invoiceId), // Convertido para string conforme esperado
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

    } catch (error) {
      console.error(error);
      throw new AppError("Error creating Mercado Pago payment", 500);
    }
  } else {
    throw new AppError("Invalid payment method", 400);
  }
};

export const mercadoPagoWebhook = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { data_id, type } = req.query; // Mercado Pago envia data_id e type

  if (!data_id || type !== "payment") {
    return res.status(200).end();
  }

  try {
    const mpService = new MercadoPagoService();
    const paymentInfo = await mpService.getPaymentStatus(data_id as string);

    if (paymentInfo.status === "approved") {
      const invoiceId = parseInt(paymentInfo.external_reference);
      const invoice = await Invoices.findByPk(invoiceId);

      if (invoice) {
        const company = await Company.findByPk(invoice.companyId);

        if (company) {
          // Atualizar data de vencimento e status da fatura
          const expiresAt = new Date(company.dueDate);
          expiresAt.setDate(expiresAt.getDate() + 30);
          const date = expiresAt.toISOString().split("T")[0];

          await company.update({ dueDate: date });
          await invoice.update({ status: "paid" });
          
          // Notificar o frontend sobre a mudança de status
          const io = getIO();
          const companyUpdate = await Company.findOne({
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
  } catch (error) {
    console.error("Erro ao processar webhook do Mercado Pago:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const checkMercadoPagoPaymentStatus = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const schema = Yup.object().shape({
    invoiceId: Yup.number().required()
  });

  if (!(await schema.isValid(req.body))) {
    throw new AppError("Validation fails", 400);
  }

  const { invoiceId } = req.body;

  try {
    const invoice = await Invoices.findByPk(invoiceId);
    
    if (!invoice) {
      throw new AppError("Invoice not found", 404);
    }

    if (invoice.status === 'paid') {
      return res.status(200).json({ message: "Invoice already paid", invoice });
    }

    if (!invoice.paymentId) {
      throw new AppError("This invoice has no payment ID", 400);
    }

    const mpService = new MercadoPagoService();
    const paymentInfo = await mpService.getPaymentStatus(invoice.paymentId);

    console.log("Payment info retrieved:", paymentInfo);

    if (paymentInfo.status === "approved") {
      const company = await Company.findByPk(invoice.companyId);

      if (!company) {
        throw new AppError("Company not found", 404);
      }

      // Atualizar data de vencimento e status da fatura
      const expiresAt = new Date(company.dueDate);
      expiresAt.setDate(expiresAt.getDate() + 31);
      const date = expiresAt.toISOString().split("T")[0];

      await company.update({ dueDate: date });
      await invoice.update({ status: "paid" });
      
      // Notificar o frontend sobre a mudança de status
      const io = getIO();
      const companyUpdate = await Company.findOne({
        where: { id: company.id }
      });

      io.to(`company-${company.id}-mainchannel`).emit(`company-${company.id}-payment`, {
        action: "approved",
        company: companyUpdate
      });

      return res.status(200).json({ 
        message: "Payment confirmed and invoice updated",
        status: paymentInfo.status,
        invoice: await Invoices.findByPk(invoiceId)
      });
    } else {
      return res.status(200).json({ 
        message: "Payment not yet approved", 
        status: paymentInfo.status 
      });
    }
  } catch (error) {
    console.error("Error checking payment status:", error);
    throw new AppError("Error verifying payment status", 500);
  }
};

// Adicionar após o método checkMercadoPagoPaymentStatus

export const cancelMercadoPagoPayment = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const schema = Yup.object().shape({
    invoiceId: Yup.number().required()
  });

  if (!(await schema.isValid(req.body))) {
    throw new AppError("Validation fails", 400);
  }

  const { invoiceId } = req.body;

  try {
    const invoice = await Invoices.findByPk(invoiceId);
    
    if (!invoice) {
      throw new AppError("Invoice not found", 404);
    }

    if (invoice.status === 'paid') {
      return res.status(200).json({ message: "Cannot cancel a paid invoice", invoice });
    }

    if (!invoice.paymentId) {
      throw new AppError("This invoice has no payment ID", 400);
    }

    // Adicione este método à classe MercadoPagoService
    const mpService = new MercadoPagoService();
    const cancelResult = await mpService.cancelPayment(invoice.paymentId);

    // Atualizar o status da fatura para 'cancelled'
    await invoice.update({ 
      status: "cancelled",
      updatedAt: new Date()
    });

    // Notificar o frontend sobre o cancelamento
    const io = getIO();
    io.to(`company-${invoice.companyId}-mainchannel`).emit(`company-${invoice.companyId}-invoice`, {
      action: "update",
      invoice
    });

    return res.status(200).json({ 
      message: "Payment cancelled successfully",
      invoice: await Invoices.findByPk(invoiceId)
    });
  } catch (error) {
    console.error("Error cancelling payment:", error);
    throw new AppError("Error cancelling payment", 500);
  }
};