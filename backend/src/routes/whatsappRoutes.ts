import express from "express";
import isAuth from "../middleware/isAuth";

import multer from "multer";
import uploadConfig from "../config/upload";

const upload = multer(uploadConfig);

import * as WhatsAppController from "../controllers/WhatsAppController";

const whatsappRoutes = express.Router();

// ✅ ROTAS EXISTENTES
whatsappRoutes.get("/whatsapp/", isAuth, WhatsAppController.index);
whatsappRoutes.post("/whatsapp/", isAuth, WhatsAppController.store);
whatsappRoutes.get("/whatsapp/:whatsappId", isAuth, WhatsAppController.show);
whatsappRoutes.put("/whatsapp/:whatsappId", isAuth, WhatsAppController.update);
whatsappRoutes.post("/closedimported/:whatsappId", isAuth, WhatsAppController.closedTickets);
whatsappRoutes.post("/whatsapp/:id/media-upload", isAuth, upload.array("file"), WhatsAppController.mediaUpload);
whatsappRoutes.delete("/whatsapp/:id/media-upload", isAuth, WhatsAppController.deleteMedia);
whatsappRoutes.delete("/whatsapp/:whatsappId", isAuth, WhatsAppController.remove);

// ✅ NOVAS ROTAS QUE PRECISAM SER ADICIONADAS:

// Rota para filtrar WhatsApps por canal
whatsappRoutes.get("/whatsapp/filter", isAuth, WhatsAppController.indexFilter);

// Rota para listar todos os WhatsApps
whatsappRoutes.get("/whatsapp/all", isAuth, WhatsAppController.listAll);

// ✅ ROTA PRINCIPAL DO FACEBOOK (A MAIS IMPORTANTE)
whatsappRoutes.post("/facebook/", isAuth, WhatsAppController.storeFacebook);
whatsappRoutes.put("/facebook/:whatsappId", isAuth, WhatsAppController.updateFacebook);

//ROTA PRINCIPAL DO INSTAGRAM
whatsappRoutes.post("/instagram/", isAuth, WhatsAppController.storeInstagram);

// Rota para reiniciar conexões
whatsappRoutes.post("/whatsapp-restart/", isAuth, WhatsAppController.restart);

// ✅ ROTAS ADMIN
whatsappRoutes.get("/whatsapp-admin/:whatsappId", isAuth, WhatsAppController.showAdmin);
whatsappRoutes.put("/whatsapp-admin/:whatsappId", isAuth, WhatsAppController.updateAdmin);
whatsappRoutes.delete("/whatsapp-admin/:whatsappId", isAuth, WhatsAppController.removeAdmin);

export default whatsappRoutes;