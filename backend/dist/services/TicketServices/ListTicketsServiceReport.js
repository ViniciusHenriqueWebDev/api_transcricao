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
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable camelcase */
const sequelize_1 = require("sequelize");
const _ = __importStar(require("lodash"));
const database_1 = __importDefault(require("../../database"));
async function ListTicketsServiceReport(companyId, params, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    const query = `
  select 
      t.id,
      w."name" as "whatsappName",
      c."name" as "contactName",
      c."number" as "contactNumber", 
      u."name" as "userName",
      q."name" as "queueName",
      COALESCE(tt."lastMessage", t."lastMessage") as "lastMessage",
      t.uuid,
      case COALESCE(tt.status, t.status)
        when 'open' then 'ABERTO'
        when 'closed' then 'FECHADO'
        when 'pending' then 'PENDENTE'
        when 'group' then 'GRUPO'
        when 'nps' then 'NPS'
        when 'lgpd' then 'LGPD'
      end as "status",
      TO_CHAR(COALESCE(tt."createdAt", t."createdAt"), 'DD/MM/YYYY HH24:MI') as "createdAt",
      TO_CHAR(tt."finishedAt", 'DD/MM/YYYY HH24:MI') as "closedAt",
      coalesce((
        (date_part('day', age(coalesce(tt."ratingAt", tt."finishedAt") , COALESCE(tt."createdAt", t."createdAt")))) || ' d, ' || 
        (date_part('hour', age(coalesce(tt."ratingAt", tt."finishedAt"), COALESCE(tt."createdAt", t."createdAt")))) || ' hrs e ' ||
        (date_part('minutes', age(coalesce(tt."ratingAt", tt."finishedAt"), COALESCE(tt."createdAt", t."createdAt")))) || ' m'
      ), '0') "supportTime",
      ur.rate "NPS"
    from "Tickets" t
    left JOIN "TicketTraking" tt ON t.id = tt."ticketId"
    left join "UserRatings" ur on tt.id = ur."ticketTrakingId"
    left join "Contacts" c on COALESCE(tt."contactId", t."contactId") = c.id 
    left join "Whatsapps" w on COALESCE(tt."whatsappId", t."whatsappId") = w.id 
    left join "Users" u on COALESCE(tt."userId", t."userId") = u.id 
    left join "Queues" q on COALESCE(tt."queueId", t."queueId") = q.id 
  -- filterPeriod`;
    let where = `where t."companyId" = ${companyId}`;
    if (_.has(params, "dateFrom")) {
        where += ` and COALESCE(tt."createdAt", t."createdAt") >= '${params.dateFrom} 00:00:00'`;
    }
    if (_.has(params, "dateTo")) {
        where += ` and COALESCE(tt."createdAt", t."createdAt") <= '${params.dateTo} 23:59:59'`;
    }
    if (params.whatsappId !== undefined && params.whatsappId.length > 0) {
        where += ` and COALESCE(tt."whatsappId", t."whatsappId") in (${params.whatsappId})`;
    }
    if (params.users.length > 0) {
        where += ` and COALESCE(tt."userId", t."userId") in (${params.users})`;
    }
    if (params.queueIds.length > 0) {
        where += ` and COALESCE(tt."queueId",0) in (${params.queueIds})`;
    }
    if (params.status.length > 0) {
        where += ` and COALESCE(tt."status", t."status") in ('${params.status.join("','")}')`;
    }
    if (params.contactId !== undefined && params.contactId !== "") {
        where += ` and tt."contactId" in (${params.contactId})`;
    }
    if (params.tags && params.tags.length > 0) {
        where += ` and EXISTS (
      SELECT 1 FROM "TicketTags" tt 
      WHERE tt."ticketId" = t.id 
      AND tt."tagId" IN (${params.tags})
    )`;
    }
    const finalQuery = query.replace("-- filterPeriod", where);
    const totalTicketsQuery = `
    SELECT COUNT(*) as total FROM "Tickets" t
    LEFT JOIN "TicketTraking" tt ON 
    t.id = tt."ticketId"
    ${where}`;
    const totalTicketsResult = await database_1.default.query(totalTicketsQuery, {
        type: sequelize_1.QueryTypes.SELECT
    });
    const totalTickets = totalTicketsResult[0];
    const paginatedQuery = `${finalQuery} ORDER BY tt."createdAt" DESC LIMIT ${pageSize} OFFSET ${offset}`;
    const responseData = await database_1.default.query(paginatedQuery, {
        type: sequelize_1.QueryTypes.SELECT
    });
    return { tickets: responseData, totalTickets };
}
exports.default = ListTicketsServiceReport;
