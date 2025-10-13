import { MercadoPagoConfig, Payment } from "mercadopago";
import AppError from '../../errors/AppError';
import Setting from "../../models/Setting";

interface CreatePaymentDTO {
  invoiceId: string;
  description: string;
  amount: number;
  email: string;
  name: string;
  cpf: string;
  phone: string;
  returnUrl: string;
}

interface MercadoPagoConfigResponse {
  publicKey: string;
  isConfigured: boolean;
}

class MercadoPagoService {
  private client: MercadoPagoConfig;
  private payment: Payment;
  private publicKey: string;

  constructor() {
    // Não inicialize aqui, faremos isso sob demanda
  }

  private async getToken(): Promise<string> {
    // Busca o token no banco de dados
    const setting = await Setting.findOne({
      where: { key: "mercadopagoToken" }
    });
    
    if (!setting || !setting.value) {
      throw new AppError("Token do Mercado Pago não configurado", 500);
    }
    
    return setting.value;
  }

  // Método para recuperar a chave pública
  private async getPublicKey(): Promise<string> {
    const setting = await Setting.findOne({
      where: { key: "mercadopagoPubKey" }
    });
    
    if (!setting || !setting.value) {
      throw new AppError("Chave pública do Mercado Pago não configurada", 500);
    }
    
    return setting.value;
  }

  private async initializeClient(): Promise<void> {
    try {
      const token = await this.getToken();
      this.publicKey = await this.getPublicKey(); // Guarda também a chave pública
      
      const mercadopago = await import('mercadopago');
      
      this.client = new mercadopago.MercadoPagoConfig({ 
        accessToken: token,
        options: { 
          integratorId: process.env.MERCADOPAGO_INTEGRATOR_ID || 'dev_whaticket',
        }
      });
      
      this.payment = new mercadopago.Payment(this.client);
      
      // Verifica se a inicialização foi bem-sucedida
      if (!this.payment) {
        throw new AppError('Falha ao inicializar cliente do Mercado Pago', 500);
      }
    } catch (error) {
      console.error('Erro ao inicializar cliente do Mercado Pago:', error);
      throw new AppError('Erro ao inicializar integração do Mercado Pago', 500);
    }
  }

  /**
   * Obtém as configurações do Mercado Pago para uso no frontend
   * @returns Objeto com informações de configuração
   */
  public async getConfiguration(): Promise<MercadoPagoConfigResponse> {
    try {
      const publicKey = await this.getPublicKey();
      return {
        publicKey,
        isConfigured: true
      };
    } catch (error) {
      return {
        publicKey: '',
        isConfigured: false
      };
    }
  }

  public async createPayment({
    invoiceId,
    description,
    amount,
    email,
    name,
    cpf,
    phone,
    returnUrl
  }: CreatePaymentDTO): Promise<any> {
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
            zip_code: '00000000', // Alguns campos podem ser necessários para a política do MP
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
        throw new AppError('Erro ao gerar QR code PIX', 500);
      }

      return {
        id: response.id,
        qr_code: response.point_of_interaction.transaction_data.qr_code,
        qr_code_base64: response.point_of_interaction.transaction_data.qr_code_base64,
        external_reference: String(invoiceId)
      };
    } catch (error) {
      console.error('Erro ao criar pagamento PIX no Mercado Pago:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Erro ao processar pagamento PIX');
    }
  }

  public async getPaymentStatus(id: string): Promise<any> {
    try {
      await this.initializeClient();
      
      const response = await this.payment.get({ id: id });
      return response;
    } catch (error) {
      console.error("Erro ao verificar status do pagamento:", error);
      throw error;
    }
  }

  public async cancelPayment(id: string): Promise<any> {
  try {
    await this.initializeClient();
    
    const response = await this.payment.cancel({
      id: id
    });
    
    console.log('Resposta do cancelamento de pagamento:', JSON.stringify(response));
    
    return response;
  } catch (error) {
    console.error('Erro ao cancelar pagamento PIX no Mercado Pago:', error);
    throw new AppError('Erro ao cancelar pagamento PIX');
  }
}
}



export default MercadoPagoService;