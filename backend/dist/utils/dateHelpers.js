"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDateCondition = exports.isToday = exports.getCurrentMonthPeriod = exports.getCurrentWeekPeriod = exports.getTodayPeriod = void 0;
const sequelize_1 = require("sequelize");
const getTodayPeriod = () => {
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
exports.getTodayPeriod = getTodayPeriod;
/**
 * Retorna o período da semana atual (início e fim da semana)
 */
const getCurrentWeekPeriod = () => {
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
exports.getCurrentWeekPeriod = getCurrentWeekPeriod;
/**
 * Retorna o período do mês atual (início e fim do mês)
 */
const getCurrentMonthPeriod = () => {
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
exports.getCurrentMonthPeriod = getCurrentMonthPeriod;
/**
 * Verifica se uma data é o dia atual
 */
const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
};
exports.isToday = isToday;
/**
 * Cria condição de filtro para datas, considerando updatedAt para hoje
 */
const getDateCondition = (startDate, endDate) => {
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    endDateObj.setHours(23, 59, 59, 999);
    const checkToday = (0, exports.isToday)(startDateObj);
    if (checkToday) {
        return {
            [sequelize_1.Op.or]: [
                { createdAt: { [sequelize_1.Op.between]: [startDateObj, endDateObj] } },
                { updatedAt: { [sequelize_1.Op.between]: [startDateObj, endDateObj] } }
            ]
        };
    }
    return { createdAt: { [sequelize_1.Op.between]: [startDateObj, endDateObj] } };
};
exports.getDateCondition = getDateCondition;
