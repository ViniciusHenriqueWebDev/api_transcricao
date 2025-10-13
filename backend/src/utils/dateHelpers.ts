import { Op } from "sequelize";

export const getTodayPeriod = (): { startDate: string, endDate: string } => {
  const today = new Date();
  
  // Início do dia (00:00:00)
  const startDate = new Date(today);
  startDate.setHours(0, 0, 0, 0);
  
  // Fim do dia (23:59:59)
  const endDate = new Date(today);
  endDate.setHours(23, 59, 59, 999);
  
  // Formato ISO para API
  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  };
};

/**
 * Retorna o período da semana atual (início e fim da semana)
 */
export const getCurrentWeekPeriod = (): { startDate: string, endDate: string } => {
  const today = new Date();
  
  // Encontrar o domingo desta semana
  const startDate = new Date(today);
  const day = today.getDay(); // 0 = Domingo, 1 = Segunda, etc.
  startDate.setDate(today.getDate() - day);
  startDate.setHours(0, 0, 0, 0);
  
  // Encontrar o sábado desta semana
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);
  
  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  };
};

/**
 * Retorna o período do mês atual (início e fim do mês)
 */
export const getCurrentMonthPeriod = (): { startDate: string, endDate: string } => {
  const today = new Date();
  
  // Início do mês
  const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  startDate.setHours(0, 0, 0, 0);
  
  // Fim do mês
  const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  endDate.setHours(23, 59, 59, 999);
  
  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  };
};

/**
 * Verifica se uma data é o dia atual
 */
export const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
};

/**
 * Cria condição de filtro para datas, considerando updatedAt para hoje
 */
export const getDateCondition = (startDate: string, endDate: string): any => {
  const startDateObj = new Date(startDate);
  const endDateObj = new Date(endDate);
  endDateObj.setHours(23, 59, 59, 999);
  
  const checkToday = isToday(startDateObj);
  
  if (checkToday) {
    return {
      [Op.or]: [
        { createdAt: { [Op.between]: [startDateObj, endDateObj] } },
        { updatedAt: { [Op.between]: [startDateObj, endDateObj] } }
      ]
    };
  }
  
  return { createdAt: { [Op.between]: [startDateObj, endDateObj] } };
};