export const formatNumber = (jid: string): string | null => {
  try {
    // Remover todos os caracteres não numéricos
    let number = jid.replace(/\D/g, "");
    
    // Se começar com 0, remover
    if (number.startsWith("0")) {
      number = number.substring(1);
    }
    
    // Se começar com o código do país +55, remover
    if (number.startsWith("55") && number.length > 10) {
      number = number.substring(2);
    }
    
    // Validação básica - números de telefone brasileiros têm 10 ou 11 dígitos
    if (number.length < 10 || number.length > 11) {
      console.error("Número de telefone inválido:", number);
      return null;
    }
    
    return number;
  } catch (error) {
    console.error("Erro ao formatar número:", error);
    return null;
  }
};