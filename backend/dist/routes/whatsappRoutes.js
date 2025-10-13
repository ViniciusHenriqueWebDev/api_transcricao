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
const express_1 = __importDefault(require("express"));
const isAuth_1 = __importDefault(require("../middleware/isAuth"));
const multer_1 = __importDefault(require("multer"));
const upload_1 = __importDefault(require("../config/upload"));
const upload = (0, multer_1.default)(upload_1.default);
const WhatsAppController = __importStar(require("../controllers/WhatsAppController"));
const whatsappRoutes = express_1.default.Router();
// ✅ ROTAS EXISTENTES
whatsappRoutes.get("/whatsapp/", isAuth_1.default, WhatsAppController.index);
whatsappRoutes.post("/whatsapp/", isAuth_1.default, WhatsAppController.store);
whatsappRoutes.get("/whatsapp/:whatsappId", isAuth_1.default, WhatsAppController.show);
whatsappRoutes.put("/whatsapp/:whatsappId", isAuth_1.default, WhatsAppController.update);
whatsappRoutes.post("/closedimported/:whatsappId", isAuth_1.default, WhatsAppController.closedTickets);
whatsappRoutes.post("/whatsapp/:id/media-upload", isAuth_1.default, upload.array("file"), WhatsAppController.mediaUpload);
whatsappRoutes.delete("/whatsapp/:id/media-upload", isAuth_1.default, WhatsAppController.deleteMedia);
whatsappRoutes.delete("/whatsapp/:whatsappId", isAuth_1.default, WhatsAppController.remove);
// ✅ NOVAS ROTAS QUE PRECISAM SER ADICIONADAS:
// Rota para filtrar WhatsApps por canal
whatsappRoutes.get("/whatsapp/filter", isAuth_1.default, WhatsAppController.indexFilter);
// Rota para listar todos os WhatsApps
whatsappRoutes.get("/whatsapp/all", isAuth_1.default, WhatsAppController.listAll);
// ✅ ROTA PRINCIPAL DO FACEBOOK (A MAIS IMPORTANTE)
whatsappRoutes.post("/facebook/", isAuth_1.default, WhatsAppController.storeFacebook);
whatsappRoutes.put("/facebook/:whatsappId", isAuth_1.default, WhatsAppController.updateFacebook);
//ROTA PRINCIPAL DO INSTAGRAM
whatsappRoutes.post("/instagram/", isAuth_1.default, WhatsAppController.storeInstagram);
// Rota para reiniciar conexões
whatsappRoutes.post("/whatsapp-restart/", isAuth_1.default, WhatsAppController.restart);
// ✅ ROTAS ADMIN
whatsappRoutes.get("/whatsapp-admin/:whatsappId", isAuth_1.default, WhatsAppController.showAdmin);
whatsappRoutes.put("/whatsapp-admin/:whatsappId", isAuth_1.default, WhatsAppController.updateAdmin);
whatsappRoutes.delete("/whatsapp-admin/:whatsappId", isAuth_1.default, WhatsAppController.removeAdmin);
exports.default = whatsappRoutes;
