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
const AppError_1 = __importDefault(require("../../errors/AppError"));
const Setting_1 = __importDefault(require("../../models/Setting"));
class MercadoPagoService {
    constructor() {
        // Não inicialize aqui, faremos isso sob demanda
    }
    async getToken() {
        // Busca o token no banco de dados
        const setting = await Setting_1.default.findOne({
            where: { key: "mercadopagoToken" }
        });
        if (!setting || !setting.value) {
            throw new AppError_1.default("Token do Mercado Pago não configurado", 500);
        }
        return setting.value;
    }
    // Método para recuperar a chave pública
    async getPublicKey() {
        const setting = await Setting_1.default.findOne({
            where: { key: "mercadopagoPubKey" }
        });
        if (!setting || !setting.value) {
            throw new AppError_1.default("Chave pública do Mercado Pago não configurada", 500);
        }
        return setting.value;
    }
    async initializeClient() {
        try {
            const token = await this.getToken();
            this.publicKey = await this.getPublicKey(); // Guarda também a chave pública
            const mercadopago = await Promise.resolve().then(() => __importStar(require('mercadopago')));
            this.client = new mercadopago.MercadoPagoConfig({
                accessToken: token,
                options: {
                    integratorId: process.env.MERCADOPAGO_INTEGRATOR_ID || 'dev_whaticket',
                }
            });
            this.payment = new mercadopago.Payment(this.client);
            // Verifica se a inicialização foi bem-sucedida
            if (!this.payment) {
                throw new AppError_1.default('Falha ao inicializar cliente do Mercado Pago', 500);
            }
        }
        catch (error) {
            console.error('Erro ao inicializar cliente do Mercado Pago:', error);
            throw new AppError_1.default('Erro ao inicializar integração do Mercado Pago', 500);
        }
    }
    /**
     * Obtém as configurações do Mercado Pago para uso no frontend
     * @returns Objeto com informações de configuração
     */
    async getConfiguration() {
        try {
            const publicKey = await this.getPublicKey();
            return {
                publicKey,
                isConfigured: true
            };
        }
        catch (error) {
            return {
                publicKey: '',
                isConfigured: false
            };
        }
    }
    async createPayment({ invoiceId, description, amount, email, name, cpf, phone, returnUrl }) {
        try {
            await this.initializeClient();
            // Cria pagamento PIX via Mercado Pago com todas as informações necessárias
            const paymentBody = {
                transaction_amount: amount,
                description: description,
                payment_method_id: 'pix',
                payer: {
                    email: email,
                    first_name: name,
                    identification: {
                        type: cpf.length > 11 ? 'CNPJ' : 'CPF',
                        number: cpf.replace(/[^\d]/g, '') // Garantir que só há dígitos
                    },
                    address: {
                        zip_code: '00000000',
                        street_name: 'Endereço não informado',
                        street_number: '0'
                    }
                },
                notification_url: `${process.env.BACKEND_URL}/subscription/mp-webhook`,
                callback_url: `${returnUrl}/payment/success`,
                external_reference: String(invoiceId),
                metadata: {
                    invoiceId: invoiceId,
                    system: 'whaticket'
                }
            };
            console.log('Enviando requisição de criação de pagamento:', JSON.stringify(paymentBody));
            const response = await this.payment.create({ body: paymentBody });
            console.log('Resposta da criação de pagamento:', JSON.stringify(response));
            // Verificar se o pagamento foi criado com sucesso e tem os dados do PIX
            if (!response.id || !response.point_of_interaction?.transaction_data?.qr_code) {
                throw new AppError_1.default('Erro ao gerar QR code PIX', 500);
            }
            return {
                id: response.id,
                qr_code: response.point_of_interaction.transaction_data.qr_code,
                qr_code_base64: response.point_of_interaction.transaction_data.qr_code_base64,
                external_reference: String(invoiceId)
            };
        }
        catch (error) {
            console.error('Erro ao criar pagamento PIX no Mercado Pago:', error);
            if (error instanceof AppError_1.default) {
                throw error;
            }
            throw new AppError_1.default('Erro ao processar pagamento PIX');
        }
    }
    async getPaymentStatus(id) {
        try {
            await this.initializeClient();
            const response = await this.payment.get({ id: id });
            return response;
        }
        catch (error) {
            console.error("Erro ao verificar status do pagamento:", error);
            throw error;
        }
    }
    async cancelPayment(id) {
        try {
            await this.initializeClient();
            const response = await this.payment.cancel({
                id: id
            });
            console.log('Resposta do cancelamento de pagamento:', JSON.stringify(response));
            return response;
        }
        catch (error) {
            console.error('Erro ao cancelar pagamento PIX no Mercado Pago:', error);
            throw new AppError_1.default('Erro ao cancelar pagamento PIX');
        }
    }
}
exports.default = MercadoPagoService;
