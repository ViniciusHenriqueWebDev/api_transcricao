import { Request, Response } from "express";
import { getIO } from "../libs/socket";

import CreatePerformanceCampaignService from "../services/PerformanceCampaignService/CreatePerformanceCampaignService";
import ListPerformanceCampaignsService from "../services/PerformanceCampaignService/ListPerformanceCampaignsService";
import ShowPerformanceCampaignService from "../services/PerformanceCampaignService/ShowPerformanceCampaignService";
import UpdatePerformanceCampaignService from "../services/PerformanceCampaignService/UpdatePerformanceCampaignService";
import DeletePerformanceCampaignService from "../services/PerformanceCampaignService/DeletePerformanceCampaignService";
import GetCampaignSummaryService from "../services/PerformanceCampaignService/GetCampaignSummaryService";

export const index = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { 
      searchParam, 
      pageNumber, 
      status, 
      startDate, 
      endDate 
    } = req.query as {
      searchParam?: string;
      pageNumber?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
    };
    
    const { companyId } = req.user;

    const { campaigns, count, hasMore } = await ListPerformanceCampaignsService({
      searchParam,
      pageNumber,
      companyId,
      status,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined
    });

    return res.status(200).json({ campaigns, count, hasMore });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  try {
    const campaignData = req.body;
    const { companyId } = req.user;

    const campaign = await CreatePerformanceCampaignService({
      ...campaignData,
      companyId
    });

    const io = getIO();
    io.emit("performanceCampaign", {
      action: "create",
      campaign
    });

    return res.status(201).json(campaign);
  } catch (err) {
    console.error(err);
    return res.status(err.statusCode || 400).json({ error: err.message });
  }
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;

    const campaign = await ShowPerformanceCampaignService({ id, companyId });

    return res.status(200).json(campaign);
  } catch (err) {
    console.error(err);
    return res.status(err.statusCode || 400).json({ error: err.message });
  }
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  try {
    const campaignData = req.body;
    const { id } = req.params;
    const { companyId } = req.user;

    const campaign = await UpdatePerformanceCampaignService({
      campaignData,
      campaignId: id,
      companyId
    });

    const io = getIO();
    io.emit("performanceCampaign", {
      action: "update",
      campaign
    });

    return res.status(200).json(campaign);
  } catch (err) {
    console.error(err);
    return res.status(err.statusCode || 400).json({ error: err.message });
  }
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;

    await DeletePerformanceCampaignService(id, companyId);

    const io = getIO();
    io.emit("performanceCampaign", {
      action: "delete",
      campaignId: id
    });

    return res.status(200).json({ message: "Campanha excluída com sucesso" });
  } catch (err) {
    console.error(err);
    return res.status(err.statusCode || 400).json({ error: err.message });
  }
};

export const getSummary = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { id } = req.params;
    const { companyId } = req.user;

    const summary = await GetCampaignSummaryService({ 
      campaignId: id, 
      companyId 
    });

    return res.status(200).json(summary);
  } catch (err) {
    console.error(err);
    return res.status(err.statusCode || 400).json({ error: err.message });
  }
};