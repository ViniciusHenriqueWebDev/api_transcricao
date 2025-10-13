import { getIO } from "../../libs/socket";
import Contact from "../../models/Contact";
import ContactCustomField from "../../models/ContactCustomField";
import { isNil } from "lodash";
import { logger } from "../../utils/logger";
import Whatsapp from "../../models/Whatsapp";
import { Op, Transaction } from "sequelize";
import sequelize from "../../database";

interface ExtraInfo extends ContactCustomField {
  name: string;
  value: string;
}

interface Request {
  name: string;
  number: string;
  isGroup: boolean;
  email?: string;
  profilePicUrl?: string;
  companyId: number;
  extraInfo?: ExtraInfo[];
  whatsappId?: number;
}

const CreateOrUpdateContactService = async ({
  name,
  number: rawNumber,
  profilePicUrl,
  isGroup,
  email = "",
  companyId,
  extraInfo = [],
  whatsappId
}: Request): Promise<Contact> => {
  
  // ✅ NORMALIZAR NÚMERO DE FORMA CONSISTENTE
  const number = isGroup ? rawNumber : rawNumber.replace(/[^0-9]/g, "");
  
  console.log("🔍 CreateOrUpdateContactService iniciado:", {
    name,
    originalNumber: rawNumber,
    normalizedNumber: number,
    companyId,
    whatsappId
  });

  const io = getIO();
  let contact: Contact | null = null;
  let transaction: Transaction | null = null;

  try {
    // ✅ USAR TRANSAÇÃO PARA EVITAR RACE CONDITIONS
    transaction = await sequelize.transaction();

    // ✅ BUSCA MAIS ROBUSTA COM LOCK
    contact = await Contact.findOne({
      where: {
        [Op.or]: [
          { number: number, companyId },
          { number: rawNumber, companyId },
          // ✅ BUSCAR TAMBÉM POR VARIAÇÕES COMUNS
          ...(number.length >= 10 ? [
            { number: number.substring(2), companyId }, // Sem código país
            { number: `55${number}`, companyId }, // Com código país
            { number: `+55${number}`, companyId }, // Com + e código país
          ] : [])
        ]
      },
      order: [["updatedAt", "DESC"]],
      lock: true, // ✅ LOCK PESSIMISTIC PARA EVITAR RACE CONDITION
      transaction
    });

    if (contact) {
      console.log("✅ Contato encontrado, atualizando:", {
        contactId: contact.id,
        currentName: contact.name,
        newName: name
      });

      // ✅ VERIFICAR SE NOME FOI EDITADO MANUALMENTE
      const shouldPreserveName = contact.name && 
        contact.name.trim() !== "" && 
        contact.name !== "Facebook User" && 
        contact.name !== "Instagram User" &&
        contact.name !== "WhatsApp User" &&
        !contact.name.startsWith("User ") &&
        contact.name !== number && // Não preservar se for apenas o número
        contact.name !== rawNumber;

      const updateData: any = {};

      // ✅ ATUALIZAR DADOS APENAS SE NECESSÁRIO
      if (profilePicUrl && profilePicUrl !== contact.profilePicUrl) {
        updateData.profilePicUrl = profilePicUrl;
      }

      if (email && email !== contact.email) {
        updateData.email = email;
      }

      // ✅ NORMALIZAR NÚMERO PARA O FORMATO PADRÃO
      if (contact.number !== number) {
        updateData.number = number;
        console.log("🔢 Normalizando número:", {
          contactId: contact.id,
          oldNumber: contact.number,
          newNumber: number
        });
      }

      // ✅ ATUALIZAR NOME APENAS SE NECESSÁRIO
      if (!shouldPreserveName && name && name !== contact.name) {
        updateData.name = name;
        console.log("📝 Atualizando nome do contato:", {
          contactId: contact.id,
          oldName: contact.name,
          newName: name,
          reason: "Nome não foi editado manualmente"
        });
      } else if (shouldPreserveName) {
        console.log("🔒 Preservando nome editado:", {
          contactId: contact.id,
          preservedName: contact.name,
          skippedName: name
        });
      }

      // ✅ ATUALIZAR whatsappId SE NECESSÁRIO
      if (whatsappId && (!contact.whatsappId || contact.whatsappId !== whatsappId)) {
        const whatsapp = await Whatsapp.findOne({
          where: {
            id: whatsappId,
            companyId
          },
          transaction
        });

        if (whatsapp) {
          updateData.whatsappId = whatsappId;
          console.log("🔗 WhatsappId será atualizado:", {
            contactId: contact.id,
            oldWhatsappId: contact.whatsappId,
            newWhatsappId: whatsappId
          });
        }
      }

      // ✅ SÓ ATUALIZAR SE HOUVER MUDANÇAS
      if (Object.keys(updateData).length > 0) {
        await contact.update(updateData, { transaction });
        console.log("✅ Contato atualizado com sucesso:", updateData);
      } else {
        console.log("ℹ️ Nenhuma atualização necessária para o contato");
      }

      // ✅ COMMIT DA TRANSAÇÃO
      await transaction.commit();
      
      // ✅ RECARREGAR CONTATO APÓS COMMIT
      await contact.reload();

      // ✅ EMITIR EVENTO SOCKET
      io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-contact`, {
        action: "update",
        contact
      });

      console.log("✅ Contato processado com sucesso (atualização)");
      return contact;

    } else {
      // ✅ CRIAR NOVO CONTATO
      console.log("🆕 Criando novo contato:", {
        name: name || number,
        number,
        companyId,
        whatsappId
      });

      contact = await Contact.create({
        name: name || number, // Se não tem nome, usar o número
        number,
        profilePicUrl: profilePicUrl || "",
        email: email || "",
        isGroup,
        extraInfo,
        companyId,
        whatsappId: whatsappId || null
      }, { transaction });

      // ✅ COMMIT DA TRANSAÇÃO
      await transaction.commit();

      console.log("✅ Novo contato criado:", {
        id: contact.id,
        name: contact.name,
        number: contact.number
      });

      // ✅ EMITIR EVENTO SOCKET
      io.to(`company-${companyId}-mainchannel`).emit(`company-${companyId}-contact`, {
        action: "create",
        contact
      });

      console.log("✅ Contato processado com sucesso (criação)");
      return contact;
    }

  } catch (error: any) {
    // ✅ ROLLBACK EM CASO DE ERRO
    if (transaction) {
      await transaction.rollback();
    }

    console.error("❌ Erro em CreateOrUpdateContactService:", {
      error: error.message,
      name: error.name,
      number,
      companyId
    });

    // ✅ TRATAMENTO ESPECÍFICO PARA ERRO DE CHAVE DUPLICADA
    if (error.name === 'SequelizeUniqueConstraintError' || error.code === '23505') {
      console.log("⚠️ Erro de chave duplicada detectado, tentando buscar contato existente");
      
      try {
        // ✅ TENTAR BUSCAR O CONTATO EXISTENTE SEM TRANSAÇÃO
        const existingContact = await Contact.findOne({
          where: {
            [Op.or]: [
              { number: number, companyId },
              { number: rawNumber, companyId }
            ]
          },
          order: [["updatedAt", "DESC"]]
        });

        if (existingContact) {
          console.log("✅ Contato existente encontrado após erro de duplicação:", {
            contactId: existingContact.id,
            name: existingContact.name,
            number: existingContact.number
          });

          try {
            const updateData: any = {};
            
            if (profilePicUrl && profilePicUrl !== existingContact.profilePicUrl) {
              updateData.profilePicUrl = profilePicUrl;
            }

            if (email && email !== existingContact.email) {
              updateData.email = email;
            }

            if (Object.keys(updateData).length > 0) {
              await existingContact.update(updateData);
              console.log("✅ Dados básicos atualizados após erro de duplicação");
            }
          } catch (updateError) {
            console.log("⚠️ Não foi possível atualizar dados após erro de duplicação, mas contato foi encontrado");
          }

          return existingContact;
        }
      } catch (findError) {
        console.error("❌ Erro ao buscar contato existente:", findError);
      }
    }
    throw error;
  }
};

export default CreateOrUpdateContactService;